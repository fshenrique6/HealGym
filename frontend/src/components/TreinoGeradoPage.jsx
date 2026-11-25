import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import styled from 'styled-components';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { destinoVolta, estadoOrigem, lerConsulta, rotuloDeOrigem } from '../utils/navegacaoTreino';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  FiArrowLeft,
  FiTrash2,
  FiCheck,
  FiPlay,
  FiRepeat,
  FiChevronDown,
  FiChevronUp,
  FiAlertCircle,
} from 'react-icons/fi';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import CoberturaTreino from './CoberturaTreino';
import {
  agruparEmBlocos,
  contarConcluidas,
  descreverSeries,
  formatarCarga,
  formatarData,
  lerCarga,
  lerRepeticoes,
  montarPayload,
  registrosDaExecucao,
  resumoSessao,
  seriesDoRegistro,
  uidDoExercicio,
} from '../utils/treinoExecucao';
import { orientacaoDeCarga, textoAquecimento } from '../utils/orientacaoFicha';
import { simplificarTexto, textoReserva } from '../utils/rotina';
import { observacaoVisivel } from '../utils/observacaoFicha';
import { seriesPorGrupo } from '../utils/analiseFicha';
import DetalhesExercicio from './treino/DetalhesExercicio';
import RotuloDestaque from './treino/RotuloDestaque';
import { CURVA } from './treino/movimento';
import {
  Acoes,
  Aviso,
  BotaoPrimario,
  BotaoRetorno,
  BotaoTexto,
  Conteudo,
  Marca,
  Nota,
  Pagina,
  Surge,
  TituloPagina,
  Topo,
} from './treino/ui';
import DialogoAcao from './DialogoAcao';
import {
  SalvamentoStatus,
  AlternativasLista,
  AlternativaItem,
} from './treinoFichaEstilos';

const passo = (reduzir) => ({ duration: reduzir ? 0 : 0.22, ease: CURVA });

function textoDescanso(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return '';
  if (/descanso/i.test(texto)) return texto;
  const segundos = texto.match(/^(\d+)\s*s$/i);
  if (segundos) return `${segundos[1]} s de descanso`;
  const minutos = texto.match(/^(\d+)\s*min$/i);
  if (minutos) return `${minutos[1]} min de descanso`;
  return texto;
}

function linhaDaPrescricao(exercicio) {
  const partes = [];
  const series = Number(exercicio.series);
  if (series > 0) partes.push(`${series} ${series === 1 ? 'série' : 'séries'}`);
  if (exercicio.repeticoes) partes.push(`${exercicio.repeticoes} repetições`);
  const descanso = textoDescanso(exercicio.descanso);
  if (descanso) partes.push(descanso);
  return partes.join(' · ');
}

function resumoDaFicha(treino, totalSeries) {
  const partes = [
    `${treino.exercicios.length} ${treino.exercicios.length === 1 ? 'exercício' : 'exercícios'}`,
    `${totalSeries} ${totalSeries === 1 ? 'série' : 'séries'}`,
  ];
  const reais = Number(treino.duracaoRealSegundos);
  if (treino.realizado && reais > 0) {
    partes.push(`${Math.max(1, Math.round(reais / 60))} min`);
  } else if (treino.duracaoEstimadaMinutos) {
    partes.push(`~${treino.duracaoEstimadaMinutos} min`);
  }
  return partes.join(' · ');
}

const ID_TREINO = /^[a-fA-F0-9]{24}$/;

function idRetornado(resposta) {
  const bruto = resposta?.data?.treinoId ?? resposta?.data?._id;
  if (typeof bruto === 'string' && ID_TREINO.test(bruto)) return bruto;
  if (bruto && typeof bruto.$oid === 'string' && ID_TREINO.test(bruto.$oid)) return bruto.$oid;
  return '';
}

function treinoDaConsulta(consulta) {
  return {
    titulo: consulta.titulo,
    exercicios: consulta.exercicios,
    duracaoEstimadaMinutos: consulta.duracaoEstimadaMinutos || undefined,
    observacoes: consulta.avisos,
    realizado: false,
    execucaoPermitida: false,
    exclusaoPermitida: false,
    bloqueioMensagem: consulta.bloqueio,
  };
}
const ID_EXERCICIO = /^[a-z0-9-]{1,90}$/;

const TEXTO_SALVAMENTO = {
  salvando: 'Salvando registros…',
  salvo: 'Registros salvos.',
  erro: 'Não foi possível salvar agora. Seus dados continuam na tela; tente novamente.',
  invalido: 'Corrija os campos destacados para salvar (use números, como 22,5).',
};

const TreinoGeradoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [treino, setTreino] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [registros, setRegistros] = useState({});
  const [execucaoPronta, setExecucaoPronta] = useState(false);
  const [erroExecucao, setErroExecucao] = useState(false);
  const [salvamento, setSalvamento] = useState('');
  const [progresso, setProgresso] = useState({});
  const [tecnicaAberta, setTecnicaAberta] = useState({});
  const [analiseAberta, setAnaliseAberta] = useState(false);
  const [notasAbertas, setNotasAbertas] = useState(false);
  const reduzir = useReducedMotion();
  const [troca, setTroca] = useState(null);
  const [sessaoAndamento, setSessaoAndamento] = useState(false);
  const [indoExecucao, setIndoExecucao] = useState(false);
  const [ehConsulta, setEhConsulta] = useState(false);
  const [podeIniciarConsulta, setPodeIniciarConsulta] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    tipo: 'confirm',
    titulo: '',
    mensagem: '',
    onConfirm: null,
    onCancel: null,
  });

  const registrosRef = useRef({});
  const filaSalvamentoRef = useRef(Promise.resolve());
  const treinoRef = useRef(null);
  const codigoConsultaRef = useRef('');

  useEffect(() => {
    treinoRef.current = treino;
  }, [treino]);

  const carregarProgresso = useCallback(async (exercicios, treinoId) => {
    const ids = [
      ...new Set(
        exercicios.map((e) => e.exercicioId).filter((valor) => ID_EXERCICIO.test(valor || '')),
      ),
    ].slice(0, 20);
    if (!ids.length) return;
    try {
      const resposta = await api.getWorkoutProgress(ids, treinoId);
      if (resposta?.success && resposta.data) {
        setProgresso(resposta.data);
      }
    } catch {
      setProgresso({});
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    setTreino(null);
    setErro('');
    setRegistros({});
    registrosRef.current = {};
    setExecucaoPronta(false);
    setErroExecucao(false);
    setSalvamento('');
    setProgresso({});
    setTecnicaAberta({});
    setNotasAbertas(false);
    setTroca(null);
    setSessaoAndamento(false);
    setIndoExecucao(false);
    setEhConsulta(false);
    setPodeIniciarConsulta(false);
    codigoConsultaRef.current = '';
    setCarregando(true);

    if (!ID_TREINO.test(id || '')) {
      const consulta = lerConsulta(location.state);
      if (consulta) {
        setTreino(treinoDaConsulta(consulta));
        setEhConsulta(true);
        setPodeIniciarConsulta(consulta.liberada);
        codigoConsultaRef.current = consulta.codigo;
        carregarProgresso(consulta.exercicios, null);
      } else {
        setErro('Esta ficha não está disponível neste endereço.');
      }
      setCarregando(false);
      return undefined;
    }

    api
      .getWorkout(id)
      .then((response) => {
        if (!ativo) return;
        if (response?.success && response.data && Array.isArray(response.data.exercicios)) {
          const dados = response.data;
          setTreino(dados);
          carregarProgresso(dados.exercicios, dados._id);
          api
            .getWorkoutExecution(id)
            .then((resposta) => {
              if (!ativo) return;
              const execucao = resposta?.data || null;
              const iniciais = registrosDaExecucao(dados.exercicios, execucao);
              registrosRef.current = iniciais;
              setRegistros(iniciais);
              setSessaoAndamento(Boolean(execucao?.iniciadoEm) && execucao.status !== 'concluida');
              setExecucaoPronta(true);
            })
            .catch(() => {
              if (!ativo) return;
              const vazios = registrosDaExecucao(dados.exercicios, null);
              registrosRef.current = vazios;
              setRegistros(vazios);
              setErroExecucao(true);
            });
          return;
        }
        setErro('Não foi possível carregar este treino.');
      })
      .catch((error) => {
        if (!ativo) return;
        const status = error?.response?.status;
        if (status === 404) {
          setErro('Treino não encontrado.');
        } else if (status === 401 || status === 403) {
          setErro('Você não tem permissão para ver este treino.');
        } else if (!error?.response) {
          setErro('Não foi possível carregar o treino. Verifique sua conexão e tente novamente.');
        } else {
          setErro('Não foi possível carregar este treino.');
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [id, location.state, carregarProgresso]);

  const mostrarConfirm = useCallback((titulo, mensagem, onConfirm, tipo = 'confirmar', rotuloConfirmar = 'Confirmar', linhaUnica = false) => {
    setModalConfig({
      tipo,
      titulo,
      mensagem,
      rotuloConfirmar,
      linhaUnica,
      onConfirm,
      onCancel: () => setModalAberto(false),
    });
    setModalAberto(true);
  }, []);

  const mostrarAlerta = useCallback((titulo, mensagem) => {
    setModalConfig({
      tipo: 'alert',
      titulo,
      mensagem,
      onConfirm: () => setModalAberto(false),
      onCancel: null,
    });
    setModalAberto(true);
  }, []);

  const bloqueado = treino?.execucaoPermitida === false;
  const podeExcluir = treino?.exclusaoPermitida !== false;
  const podeSalvar = Boolean(treino && !treino.realizado && !bloqueado && execucaoPronta && !erroExecucao);

  const salvarAgora = useCallback(() => {
    const atual = treinoRef.current;
    if (!atual || atual.realizado || atual.execucaoPermitida === false) return Promise.resolve(true);
    const { exercicios, invalido } = montarPayload(registrosRef.current);
    if (invalido) {
      setSalvamento('invalido');
      return Promise.resolve(false);
    }
    if (!exercicios.length) return Promise.resolve(true);
    const envio = filaSalvamentoRef.current.then(async () => {
      setSalvamento('salvando');
      try {
        await api.saveWorkoutExecution(atual._id, { exercicios });
        setSalvamento('salvo');
        return true;
      } catch {
        setSalvamento('erro');
        return false;
      }
    });
    filaSalvamentoRef.current = envio.catch(() => false);
    return envio;
  }, []);

  const voltarAosTreinos = () => {
    navigate(destinoVolta(location.state), { replace: true });
  };

  const abrirExecucao = useCallback(() => {
    if (!treino || indoExecucao || treino.realizado || treino.execucaoPermitida === false) return;
    setIndoExecucao(true);
    navigate(`/treino/${treino._id}/executar`, { state: estadoOrigem(location.state?.origem) });
  }, [treino, indoExecucao, location.state, navigate]);

  const iniciarConsulta = async () => {
    const codigo = codigoConsultaRef.current;
    if (!podeIniciarConsulta || !/^[A-F]$/.test(codigo) || indoExecucao) return;
    setIndoExecucao(true);
    try {
      const resposta = await api.iniciarSessaoRotina(codigo);
      const novoId = idRetornado(resposta);
      if (!novoId) {
        setIndoExecucao(false);
        mostrarAlerta('Treino indisponível', 'Não foi possível abrir a ficha agora.');
        return;
      }
      navigate(`/treino/${novoId}`, { replace: true, state: estadoOrigem(location.state?.origem) });
    } catch (error) {
      setIndoExecucao(false);
      mostrarAlerta(
        'Treino bloqueado',
        error?.message || 'Não foi possível iniciar este treino.',
      );
    }
  };

  const totalConcluidas = useMemo(
    () => Object.values(registros).reduce((soma, linhas) => soma + contarConcluidas(linhas), 0),
    [registros],
  );

  const handleMarcarRealizado = async () => {
    const concluir = async () => {
      const salvou = await salvarAgora();
      if (!salvou) {
        mostrarAlerta(
          'Registros pendentes',
          'Não foi possível salvar os registros de séries. Corrija os campos destacados ou tente novamente antes de concluir.',
        );
        return;
      }
      try {
        const response = await api.completeWorkout(treino._id, {});
        if (response.success) {
          setTreino(response.data);
          mostrarAlerta(
            'Parabéns! 🎉',
            'Treino marcado como realizado! Você pode ver seu progresso no Dashboard.',
          );
        }
      } catch (error) {
        mostrarAlerta(
          'Treino bloqueado',
          error?.message || 'Erro ao marcar treino como realizado. Tente novamente.',
        );
      }
    };

    if (totalConcluidas === 0) {
      mostrarConfirm(
        'Marcar como realizado',
        'Nenhuma série foi marcada como concluída. Deseja marcar o treino como realizado mesmo assim?',
        async () => {
          setModalAberto(false);
          await concluir();
        },
        'confirmar',
        'Confirmar',
        true,
      );
      return;
    }
    await concluir();
  };

  const handleDeletarTreino = async () => {
    mostrarConfirm(
      'Excluir treino',
      'Deseja realmente deletar este treino? Esta ação não pode ser desfeita.',
      async () => {
        try {
          const response = await api.deleteWorkout(treino._id);
          if (response.success) {
            setModalConfig({
              tipo: 'alert',
              titulo: 'Sucesso',
              mensagem: 'Treino deletado com sucesso!',
              onConfirm: () => navigate(destinoVolta(location.state), { replace: true }),
              onCancel: null,
            });
            setModalAberto(true);
          }
        } catch (error) {
          setModalAberto(false);
          mostrarAlerta(
            'Treino preservado',
            error?.message || 'Erro ao deletar treino. Tente novamente.',
          );
        }
      },
      'destrutivo',
      'Excluir treino',
    );
  };

  const abrirTroca = async (exercicio, index) => {
    const uid = uidDoExercicio(exercicio, index);
    setTroca({ uid, nome: exercicio.nome, carregando: true, opcoes: [], erro: '' });
    try {
      const resposta = await api.getExerciseAlternatives(treino._id, uid);
      setTroca((atual) =>
        atual && atual.uid === uid
          ? {
              ...atual,
              carregando: false,
              opcoes: Array.isArray(resposta?.data) ? resposta.data : [],
              temSeriesConcluidas:
                Boolean(resposta?.temSeriesConcluidas) ||
                contarConcluidas(registrosRef.current[uid]) > 0,
            }
          : atual,
      );
    } catch {
      setTroca((atual) =>
        atual && atual.uid === uid
          ? { ...atual, carregando: false, erro: 'Não foi possível buscar alternativas agora.' }
          : atual,
      );
    }
  };

  const executarTroca = async (opcao, confirmar) => {
    if (!troca) return;
    if (troca.temSeriesConcluidas && !confirmar) {
      setTroca({ ...troca, confirmar: opcao });
      return;
    }
    setTroca({ ...troca, enviando: true });
    await salvarAgora();
    try {
      const resposta = await api.swapExercise(treino._id, troca.uid, opcao.exercicioId, confirmar);
      if (resposta?.success && resposta.data) {
        const atualizado = resposta.data;
        const novos = {};
        atualizado.exercicios.forEach((exercicio, index) => {
          const uid = uidDoExercicio(exercicio, index);
          novos[uid] = registrosRef.current[uid] || seriesDoRegistro(exercicio, null);
        });
        registrosRef.current = novos;
        setRegistros(novos);
        setTreino(atualizado);
        setTroca(null);
        carregarProgresso(atualizado.exercicios, atualizado._id);
      }
    } catch (error) {
      if (error?.response?.status === 409 && error.response.data?.requerConfirmacao) {
        setTroca((atual) => (atual ? { ...atual, enviando: false, temSeriesConcluidas: true, confirmar: opcao } : atual));
        return;
      }
      setTroca((atual) =>
        atual
          ? {
              ...atual,
              enviando: false,
              erro: error?.response?.data?.message || 'Não foi possível trocar o exercício.',
            }
          : atual,
      );
    }
  };

  const treinoCorresponde = Boolean(treino) && (ehConsulta || String(treino._id) === id);

  if (carregando || (!erro && !treinoCorresponde)) {
    return <LoadingSpinner />;
  }

  const totalSeries = treino
    ? treino.exercicios.reduce((soma, e) => soma + (Number(e.series) || 0), 0)
    : 0;
  const gruposAnalise = seriesPorGrupo(treino);
  const editavel = podeSalvar;
  const blocos = treino ? agruparEmBlocos(treino.exercicios) : [];
  const observacoes = Array.isArray(treino?.observacoes)
    ? treino.observacoes.map((texto) => observacaoVisivel(texto)).filter(Boolean)
    : [];
  const rotuloPrincipal = sessaoAndamento ? 'Retomar treino' : 'Iniciar treino';

  return (
    <Pagina className="custom-scroll">
      <DialogoAcao
        aberto={modalAberto}
        titulo={modalConfig.titulo}
        mensagem={modalConfig.mensagem}
        icone={modalConfig.tipo === 'destrutivo' ? <FiTrash2 /> : <FiAlertCircle />}
        tipo={modalConfig.tipo === 'alert' ? 'alerta' : modalConfig.tipo || 'confirmar'}
        rotuloConfirmar={
          modalConfig.tipo === 'alert' ? 'OK' : modalConfig.rotuloConfirmar || 'Confirmar'
        }
        linhaUnica={Boolean(modalConfig.linhaUnica)}
        onConfirmar={modalConfig.onConfirm}
        onCancelar={modalConfig.onCancel || modalConfig.onConfirm}
      />

      <DialogoAcao
        aberto={Boolean(troca) && !modalAberto}
        titulo="Trocar exercício"
        subtitulo={troca?.nome}
        icone={<FiRepeat />}
        tipo={troca?.confirmar ? 'confirmar' : 'painel'}
        mensagem={
          troca?.confirmar
            ? `${troca.nome} já tem séries concluídas. Ao trocar por ${troca.confirmar.nome}, os registros feitos continuam no histórico, e as séries do novo exercício começam em branco.`
            : troca?.carregando
              ? 'Buscando alternativas equivalentes…'
              : troca?.erro
                ? troca.erro
                : troca && troca.opcoes.length === 0
                  ? `Não há alternativa equivalente para ${troca.nome} que caiba na duração escolhida.`
                  : troca
                    ? `Alternativas equivalentes para ${troca.nome}:`
                    : ''
        }
        rotuloCancelar={troca?.confirmar ? 'Voltar' : 'Cancelar'}
        rotuloConfirmar={troca?.enviando ? 'Trocando…' : 'Confirmar troca'}
        confirmarDesabilitado={Boolean(troca?.enviando)}
        onCancelar={() => {
          if (troca?.enviando) return;
          if (troca?.confirmar) {
            setTroca({ ...troca, confirmar: null });
            return;
          }
          setTroca(null);
        }}
        onConfirmar={() => troca?.confirmar && executarTroca(troca.confirmar, true)}
      >
        {troca && !troca.confirmar && !troca.carregando && !troca.erro && troca.opcoes.length > 0 && (
          <AlternativasLista>
            {troca.opcoes.map((opcao) => (
              <AlternativaItem
                key={opcao.exercicioId}
                type="button"
                disabled={troca.enviando}
                onClick={() => executarTroca(opcao, false)}
              >
                {opcao.nome}
                <span>
                  {opcao.padraoRotulo} · {opcao.equipamentoRotulo} · {opcao.series} séries · sessão
                  estimada em {opcao.duracaoEstimadaMinutos} min
                </span>
              </AlternativaItem>
            ))}
          </AlternativasLista>
        )}
      </DialogoAcao>

      <Topo>
        <BotaoRetorno type="button" onClick={voltarAosTreinos}>
          <FiArrowLeft aria-hidden="true" />
          {rotuloDeOrigem(location.state)}
        </BotaoRetorno>
        <Marca>HealGym</Marca>
        <span aria-hidden="true" />
      </Topo>

      <Conteudo>
        {erro || !treino ? (
          <Surge>
            <TituloPagina>Treino indisponível</TituloPagina>
            <Nota>{erro || 'Não foi possível carregar este treino.'}</Nota>
          </Surge>
        ) : (
          <>
            {typeof location.state?.avisoRecuperacao === 'string' &&
              location.state.avisoRecuperacao && (
                <Aviso $tipo="atencao">
                  <FiAlertCircle aria-hidden="true" />
                  <p>{location.state.avisoRecuperacao}</p>
                </Aviso>
              )}

            <Surge ordem={0}>
              <CabecalhoFicha>
                <TituloPagina>{treino.titulo}</TituloPagina>
                <ResumoFicha>{resumoDaFicha(treino, totalSeries)}</ResumoFicha>
                {treino.realizado && treino.dataRealizacao && (
                  <ResumoFicha>
                    Concluído em {new Date(treino.dataRealizacao).toLocaleDateString('pt-BR')}
                  </ResumoFicha>
                )}
                {!treino.realizado && bloqueado && !podeIniciarConsulta && (
                  <Nota>{treino.bloqueioMensagem || 'Conclua o treino anterior para liberar este.'}</Nota>
                )}
                {podeIniciarConsulta && (
                  <AcaoCentral>
                    <BotaoPrimario type="button" onClick={iniciarConsulta} disabled={indoExecucao}>
                      <FiPlay aria-hidden="true" />
                      {indoExecucao ? 'Abrindo…' : 'Iniciar treino'}
                    </BotaoPrimario>
                  </AcaoCentral>
                )}
                {!bloqueado && !treino.realizado && (
                  <AcaoCentral>
                    <BotaoPrimario type="button" onClick={abrirExecucao} disabled={indoExecucao}>
                      <FiPlay aria-hidden="true" />
                      {indoExecucao ? 'Abrindo…' : rotuloPrincipal}
                    </BotaoPrimario>
                  </AcaoCentral>
                )}
              </CabecalhoFicha>
            </Surge>

            {observacoes.length > 0 && (
              <BlocoExtra>
                <BotaoTexto
                  type="button"
                  aria-expanded={notasAbertas}
                  onClick={() => setNotasAbertas((aberta) => !aberta)}
                >
                  {notasAbertas ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
                  Observações
                </BotaoTexto>
                <AnimatePresence initial={false}>
                  {notasAbertas && (
                    <PainelExtra
                      initial={reduzir ? false : { height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0, transition: passo(reduzir) }}
                      transition={passo(reduzir)}
                      style={{ overflow: 'hidden' }}
                    >
                      <ListaNotas>
                        {observacoes.map((texto) => (
                          <li key={texto}>{simplificarTexto(texto) || texto}</li>
                        ))}
                      </ListaNotas>
                    </PainelExtra>
                  )}
                </AnimatePresence>
              </BlocoExtra>
            )}

            <ListaExercicios>
                {blocos.map((bloco, blocoIndex) => (
                  <ExerciciosBloco
                    key={`${bloco.nome}-${blocoIndex}`}
                    bloco={bloco}
                    mostrarTitulo={blocos.length > 1}
                    renderizar={({ exercicio, index }) => {
                      const uid = uidDoExercicio(exercicio, index);
                      const linhas = registros[uid] || [];
                      const concluidas = contarConcluidas(linhas);
                      const total = Math.max(1, Number(exercicio.series) || 1);
                      const serieCompleta = concluidas >= total;
                      const historico = progresso[exercicio.exercicioId];
                      const anterior = historico?.sessoes?.[0];
                      const registrosFeitos = linhas.filter(
                        (linha) => linha.concluida || linha.carga || linha.repeticoes,
                      );
                      const aberta = Boolean(tecnicaAberta[uid]);
                      const hoje = resumoSessao(
                        linhas
                          .filter((linha) => linha.concluida)
                          .map((linha) => ({
                            carga: lerCarga(linha.carga).valor,
                            repeticoes: lerRepeticoes(linha.repeticoes).valor,
                          })),
                      );
                      const antes = anterior ? resumoSessao(anterior.series) : null;

                      const reserva = orientacaoDeCarga(exercicio.repeticoes, exercicio.rirAlvo);
                      const aquecimento = textoAquecimento(exercicio, index);
                      const marcas =
                        historico && (historico.melhorCarga != null || historico.maisRepeticoes != null);

                      return (
                        <CartaoExercicio
                          key={uid}
                          $feito={serieCompleta}
                          initial={reduzir ? false : { opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: reduzir ? 0 : 0.35,
                            delay: reduzir ? 0 : Math.min(index, 8) * 0.04,
                            ease: CURVA,
                          }}
                        >
                          <Numero $feito={serieCompleta}>{index + 1}</Numero>
                          <CorpoExercicio>
                            <NomeExercicio>{exercicio.nome}</NomeExercicio>
                            <Prescricao>{linhaDaPrescricao(exercicio)}</Prescricao>
                            {reserva && <Reserva>{reserva}</Reserva>}
                            {aquecimento && (
                              <Detalhe>
                                <RotuloDestaque>Aquecimento:</RotuloDestaque>{' '}
                                {aquecimento.replace(/^Aquecimento:\s*/, '')}
                              </Detalhe>
                            )}
                            {anterior && (
                              <Detalhe>
                                <RotuloDestaque>Última vez:</RotuloDestaque>{' '}
                                {anterior.data ? `${formatarData(anterior.data)} · ` : ''}
                                {descreverSeries(anterior.series)}
                              </Detalhe>
                            )}
                            {historico?.sugestao && editavel && (
                              <Reserva>{simplificarTexto(historico.sugestao)}</Reserva>
                            )}
                            {treino.realizado &&
                              registrosFeitos.map((linha) => (
                                <Detalhe key={linha.numero}>
                                  <RotuloDestaque>Série {linha.numero}:</RotuloDestaque>{' '}
                                  {linha.carga ? `${linha.carga} kg` : 'sem carga'}
                                  {linha.repeticoes ? ` × ${linha.repeticoes}` : ''}
                                  {linha.rir != null && linha.rir !== ''
                                    ? ` · ${textoReserva(linha.rir, true)}`
                                    : ''}
                                </Detalhe>
                              ))}
                            {treino.realizado && hoje && antes && (
                              <Detalhe>
                                <RotuloDestaque>Hoje:</RotuloDestaque> {hoje.series}{' '}
                                {hoje.series === 1 ? 'série' : 'séries'}
                                {hoje.maiorCarga != null ? ` · ${formatarCarga(hoje.maiorCarga)} kg` : ''}
                                {hoje.totalRepeticoes != null ? ` · ${hoje.totalRepeticoes} repetições` : ''}
                                {' · '}
                                <RotuloDestaque>Anterior:</RotuloDestaque> {antes.series}{' '}
                                {antes.series === 1 ? 'série' : 'séries'}
                                {antes.maiorCarga != null ? ` · ${formatarCarga(antes.maiorCarga)} kg` : ''}
                              </Detalhe>
                            )}

                            <AcoesDoExercicio>
                              <BotaoTexto
                                type="button"
                                aria-expanded={aberta}
                                onClick={() =>
                                  setTecnicaAberta((atual) => ({ ...atual, [uid]: !atual[uid] }))
                                }
                              >
                                {aberta ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
                                Cuidados
                              </BotaoTexto>
                              {editavel && (
                                <BotaoTexto type="button" onClick={() => abrirTroca(exercicio, index)}>
                                  <FiRepeat aria-hidden="true" />
                                  Trocar
                                </BotaoTexto>
                              )}
                            </AcoesDoExercicio>

                            <AnimatePresence initial={false}>
                              {aberta && (
                                <PainelExtra
                                  initial={reduzir ? false : { height: 0 }}
                                  animate={{ height: 'auto' }}
                                  exit={{ height: 0, transition: passo(reduzir) }}
                                  transition={passo(reduzir)}
                                  style={{ overflow: 'hidden' }}
                                >
                                  <MioloExtra>
                                    {exercicio.videoUrl && (
                                      <Video
                                        controls
                                        preload="none"
                                        playsInline
                                        poster={exercicio.videoThumbnailUrl || undefined}
                                        src={exercicio.videoUrl}
                                        aria-label={`Demonstração de ${exercicio.nome}`}
                                      />
                                    )}
                                    <DetalhesExercicio exercicio={exercicio} />
                                    {marcas && (
                                      <Detalhe>
                                        {historico.melhorCarga != null && (
                                          <>
                                            <RotuloDestaque>Melhor carga:</RotuloDestaque>{' '}
                                            {formatarCarga(historico.melhorCarga)} kg
                                            {historico.repeticoesNaMelhorCarga != null
                                              ? ` × ${historico.repeticoesNaMelhorCarga}`
                                              : ''}
                                          </>
                                        )}
                                        {historico.maisRepeticoes != null && (
                                          <>
                                            {historico.melhorCarga != null ? ' · ' : ''}
                                            <RotuloDestaque>Mais repetições:</RotuloDestaque>{' '}
                                            {historico.maisRepeticoes}
                                            {historico.cargaNasMaisRepeticoes != null
                                              ? ` (${formatarCarga(historico.cargaNasMaisRepeticoes)} kg)`
                                              : ''}
                                          </>
                                        )}
                                      </Detalhe>
                                    )}
                                  </MioloExtra>
                                </PainelExtra>
                              )}
                            </AnimatePresence>
                          </CorpoExercicio>
                        </CartaoExercicio>
                      );
                    }}
                  />
                ))}
            </ListaExercicios>

            {(!treino.realizado && !bloqueado) || podeExcluir ? (
              <AcoesQuietas>
                {!treino.realizado && !bloqueado && (
                  <BotaoTexto type="button" onClick={handleMarcarRealizado}>
                    <FiCheck aria-hidden="true" />
                    Marcar como realizado
                  </BotaoTexto>
                )}
                {podeExcluir && (
                  <AcaoPerigo type="button" onClick={handleDeletarTreino}>
                    <FiTrash2 aria-hidden="true" />
                    Excluir treino
                  </AcaoPerigo>
                )}
              </AcoesQuietas>
            ) : null}

            {!treino.realizado && (erroExecucao || salvamento) && (
              <SalvamentoStatus $erro={erroExecucao || salvamento === 'erro' || salvamento === 'invalido'}>
                {erroExecucao
                  ? 'Não foi possível carregar os registros de séries. Recarregue a página para registrar cargas.'
                  : TEXTO_SALVAMENTO[salvamento]}
              </SalvamentoStatus>
            )}

            {gruposAnalise.length > 0 && (
              <Analise>
                <BotaoAnalise
                  type="button"
                  aria-expanded={analiseAberta}
                  aria-controls="analise-do-treino"
                  onClick={() => setAnaliseAberta((aberta) => !aberta)}
                >
                  {analiseAberta ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
                  Análise do treino
                </BotaoAnalise>
                <AnimatePresence initial={false}>
                  {analiseAberta && (
                    <PainelExtra
                      id="analise-do-treino"
                      initial={reduzir ? false : { height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0, transition: passo(reduzir) }}
                      transition={passo(reduzir)}
                      style={{ overflow: 'hidden' }}
                    >
                      <MioloExtra>
                        <CoberturaTreino grupos={gruposAnalise} />
                      </MioloExtra>
                    </PainelExtra>
                  )}
                </AnimatePresence>
              </Analise>
            )}
          </>
        )}
      </Conteudo>
    </Pagina>
  );
};

const ExerciciosBloco = ({ bloco, mostrarTitulo, renderizar }) => (
  <>
    {mostrarTitulo && <TituloBloco>{bloco.nome}</TituloBloco>}
    {bloco.itens.map((item) => renderizar(item))}
  </>
);

const CabecalhoFicha = styled.header`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
  text-align: center;
`;

const ResumoFicha = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font-family: 'Marcellus', serif;
  font-size: 0.98rem;
  line-height: 1.45;
`;

const AcaoCentral = styled(Acoes)`
  justify-content: center;
  width: 100%;
`;

const AcoesQuietas = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem 1rem;
`;

const AcaoPerigo = styled(BotaoTexto)`
  color: #e8b4b4;
  text-decoration-color: rgba(232, 180, 180, 0.4);
`;

const BlocoExtra = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const ListaNotas = styled.ul`
  margin: 0;
  padding: 0.15rem 0 0.35rem 1.1rem;
  color: var(--text-secondary);
  font-family: 'Marcellus', serif;
  font-size: 0.92rem;
  line-height: 1.45;
`;

const ListaExercicios = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
`;

const TituloBloco = styled.h2`
  margin: 0.35rem 0 0;
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const CartaoExercicio = styled(motion.article)`
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  min-width: 0;
  background: var(--card-bg);
  border: 1px solid
    ${({ $feito }) => ($feito ? 'rgba(198, 169, 100, 0.28)' : 'rgba(198, 169, 100, 0.12)')};
  border-radius: 12px;
  padding: 0.8rem 0.85rem;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: rgba(198, 169, 100, 0.4);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Numero = styled.span`
  flex-shrink: 0;
  width: 1.7rem;
  height: 1.7rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgba(198, 169, 100, 0.45);
  color: ${({ $feito }) => ($feito ? 'var(--white)' : 'var(--accent)')};
  background: ${({ $feito }) => ($feito ? 'rgba(198, 169, 100, 0.18)' : 'transparent')};
  font-family: 'Cinzel', serif;
  font-size: 0.78rem;
`;

const CorpoExercicio = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
`;

const NomeExercicio = styled.h3`
  margin: 0;
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 1.02rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.3;
  text-transform: none;
`;

const Prescricao = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font-family: 'Marcellus', serif;
  font-size: 0.92rem;
  line-height: 1.4;
`;

const Reserva = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font-family: 'Marcellus', serif;
  font-size: 0.9rem;
  line-height: 1.4;
`;

const Detalhe = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font-family: 'Marcellus', serif;
  font-size: 0.88rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
`;

const AcoesDoExercicio = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 0.85rem;
  margin-top: 0.15rem;
`;

const PainelExtra = styled(motion.div)`
  overflow: hidden;
  min-width: 0;
`;

const MioloExtra = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-top: 0.35rem;
`;

const Video = styled.video`
  display: block;
  width: min(100%, 220px);
  max-height: 124px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid rgba(198, 169, 100, 0.35);
  background: #0a0a0a;
`;

const Analise = styled.section`
  border: 1px solid rgba(198, 169, 100, 0.12);
  border-radius: 12px;
  padding: 0.45rem 0.9rem;
  background: var(--card-bg);
`;

const BotaoAnalise = styled.button`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  width: 100%;
  background: transparent;
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  letter-spacing: 0.03em;
  text-transform: none;
  text-align: left;
  padding: 0.35rem 0;

  svg {
    color: var(--accent);
  }

  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.82;
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

export default TreinoGeradoPage;
