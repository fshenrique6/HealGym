import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowLeft, FiCheck, FiClock, FiPause, FiPlay } from 'react-icons/fi';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import {
  contarConcluidas,
  descansoPrescrito,
  descansoRestanteSegundos,
  descreverSeries,
  formatarCarga,
  formatarRelogio,
  lerCarga,
  lerRepeticoes,
  montarPayload,
  porcaoLegivel,
  registrosDaExecucao,
  rotuloCarga,
  rotuloDivisao,
  segundosDecorridos,
  uidDoExercicio,
} from '../utils/treinoExecucao';
import {
  BackButton,
  Container,
  Header,
  Logo,
  MainContent,
  Tecnica,
  TreinoDisplay,
  TreinoTitulo,
} from './treinoEstilos';
import { TecnicaPainel } from './treinoFichaEstilos';
import {
  AcoesExecucao,
  Anel,
  AvisoExecucao,
  BotaoAcao,
  BotaoConcluir,
  BotaoPular,
  BotaoTexto,
  CampoBloco,
  CampoGrande,
  Campos,
  DescansoNumero,
  DescansoTela,
  DescansoTitulo,
  ExercicioEtapa,
  ExecucaoFaixa,
  ExecucaoTopo,
  ItemSerie,
  ListaSeries,
  MetaExercicio,
  MissaoCard,
  NomeExercicio,
  ProgressoBarra,
  ProgressoBloco,
  ProgressoTexto,
  ProgressoTrilha,
  ProximoDiscreto,
  Referencia,
  Relogio,
  ResumoLinha,
  ResumoLista,
  SerieAtual,
} from './treinoExecucaoEstilos';

const ID_TREINO = /^[a-fA-F0-9]{24}$/;
const ENTRADA = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } };
const HOVER_PRINCIPAL = { scale: 1.02 };
const TOQUE_PRINCIPAL = { scale: 0.98 };
const HOVER_BOTAO = { scale: 1.05 };
const TOQUE_BOTAO = { scale: 0.95 };
const CIRCUNFERENCIA = 2 * Math.PI * 96;
const SOM_DESCANSO =
  'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dyvg==';

const indiceDoUid = (exercicios, uid) =>
  exercicios.findIndex((exercicio, index) => uidDoExercicio(exercicio, index) === uid);

const ExecucaoTreinoPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const chave = `hg-exec-${id}`;

  const [treino, setTreino] = useState(null);
  const [execucao, setExecucao] = useState(null);
  const [registros, setRegistros] = useState({});
  const [progresso, setProgresso] = useState({});
  const [foco, setFoco] = useState(null);
  const [fase, setFase] = useState(null);
  const [transicao, setTransicao] = useState(null);
  const [carga, setCarga] = useState('');
  const [repeticoes, setRepeticoes] = useState('');
  const [tecnicaAberta, setTecnicaAberta] = useState(false);
  const [seriesAbertas, setSeriesAbertas] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [erroAcao, setErroAcao] = useState('');
  const [processando, setProcessando] = useState(false);
  const [confirmarPular, setConfirmarPular] = useState(false);
  const [confirmarFim, setConfirmarFim] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  const execRef = useRef(null);
  const registrosRef = useRef({});
  const focoRef = useRef(null);
  const processandoRef = useRef(false);
  const vivoRef = useRef(false);
  const restanteAnterior = useRef(0);
  const somLiberado = useRef(false);
  const audioRef = useRef(null);

  useEffect(() => {
    execRef.current = execucao;
  }, [execucao]);

  useEffect(() => {
    focoRef.current = foco;
  }, [foco]);

  const aplicarSessao = useCallback((dados, sessao) => {
    const linhas = registrosDaExecucao(dados.exercicios, sessao);
    registrosRef.current = linhas;
    setRegistros(linhas);
    setExecucao(sessao);
    if (dados.realizado || sessao?.status === 'concluida') {
      setFase('resumo');
      return;
    }
    const pulados = Array.isArray(sessao?.pulados) ? sessao.pulados : [];
    const pendente = primeiraPendencia(dados.exercicios, linhas, pulados);
    const descansoAtivo = Boolean(sessao?.descansoUid) && descansoRestanteSegundos(sessao) > 0;
    if (!pendente && !descansoAtivo) {
      setFase('resumo');
      return;
    }
    let uid = sessao?.exercicioAtualUid;
    let serie = Number(sessao?.serieAtual) || 1;
    const linhaSalva = uid ? (linhas[uid] || []).find((linha) => linha.numero === serie) : null;
    if (!descansoAtivo && (!uid || indiceDoUid(dados.exercicios, uid) < 0 || linhaSalva?.concluida)) {
      uid = pendente ? pendente.uid : uidDoExercicio(dados.exercicios[0], 0);
      serie = pendente ? pendente.serie : 1;
    }
    if (!descansoAtivo && sessao?.descansoUid) {
      uid = sessao.descansoUid;
      serie = Number(sessao.descansoSerie) || 1;
    }
    setFoco({ uid, serie });
  }, []);

  useEffect(() => {
    let ativo = true;
    vivoRef.current = true;
    setCarregando(true);
    setErro('');
    setTreino(null);
    setFase(null);

    if (!ID_TREINO.test(id || '')) {
      setErro('Treino não encontrado.');
      setCarregando(false);
      return undefined;
    }

    const recarregou = sessionStorage.getItem(chave) === '1';

    api
      .getWorkout(id)
      .then(async (resposta) => {
        if (!ativo) return null;
        if (!resposta?.success || !Array.isArray(resposta.data?.exercicios)) {
          setErro('Não foi possível carregar este treino.');
          return null;
        }
        const dados = resposta.data;
        setTreino(dados);
        let sessao = null;
        try {
          const atual = await api.getWorkoutExecution(id);
          sessao = atual?.data || null;
        } catch {
          setErro('Não foi possível carregar a sessão de treino.');
          return null;
        }
        if (!dados.realizado && sessao?.status !== 'concluida') {
          const rodando = sessao?.status === 'em_andamento' && sessao.retomadoEm;
          const acao = !sessao?.iniciadoEm ? 'iniciar' : rodando ? null : 'retomar';
          if (acao) {
            const controle = await api.controlWorkoutExecution(id, { acao });
            sessao = controle.data;
          }
        }
        if (!ativo) return null;
        sessionStorage.setItem(chave, '1');
        aplicarSessao(dados, sessao);
        const ids = [
          ...new Set((dados.exercicios || []).map((item) => item.exercicioId).filter(Boolean)),
        ].slice(0, 20);
        if (ids.length) {
          api
            .getWorkoutProgress(ids, id)
            .then((progressoResposta) => {
              if (ativo && progressoResposta?.success) setProgresso(progressoResposta.data || {});
            })
            .catch(() => {});
        }
        return dados;
      })
      .catch((error) => {
        if (!ativo) return;
        const status = error?.response?.status;
        if (status === 404) setErro('Treino não encontrado.');
        else if (status === 401 || status === 403) setErro('Você não tem permissão para ver este treino.');
        else setErro('Não foi possível abrir a execução do treino.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    let atraso = null;
    if (recarregou) {
      atraso = setTimeout(() => {
        if (!vivoRef.current) return;
        api
          .controlWorkoutExecution(id, { acao: 'retomar' })
          .then((controle) => {
            if (vivoRef.current && controle?.data && !controle.data.finalizadoEm) {
              setExecucao(controle.data);
            }
          })
          .catch(() => {});
      }, 800);
    }

    return () => {
      ativo = false;
      vivoRef.current = false;
      if (atraso) clearTimeout(atraso);
    };
  }, [id, chave, aplicarSessao]);

  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(relogio);
  }, []);

  useEffect(() => {
    const pausarSeSaiu = () => {
      setTimeout(() => {
        if (vivoRef.current) return;
        const atual = execRef.current;
        if (atual?.status === 'em_andamento' && atual.retomadoEm) {
          api.pauseWorkoutBeacon(id, atual.retomadoEm);
        }
      }, 0);
    };
    const aoEsconder = () => {
      const atual = execRef.current;
      if (atual?.status === 'em_andamento' && atual.retomadoEm) {
        api.pauseWorkoutBeacon(id, atual.retomadoEm);
      }
    };
    window.addEventListener('pagehide', aoEsconder);
    return () => {
      window.removeEventListener('pagehide', aoEsconder);
      pausarSeSaiu();
    };
  }, [id]);

  const exercicios = treino?.exercicios || [];
  const indice = foco ? indiceDoUid(exercicios, foco.uid) : -1;
  const exercicio = indice >= 0 ? exercicios[indice] : null;
  const linhas = foco ? registros[foco.uid] || [] : [];
  const linhaAtual = linhas.find((linha) => linha.numero === foco?.serie) || null;
  const restante = descansoRestanteSegundos(execucao, agora);
  const decorrido = segundosDecorridos(execucao, agora);
  const totalSeries = exercicios.reduce((soma, item) => soma + (Number(item.series) || 0), 0);
  const seriesFeitas = Object.values(registros).reduce((soma, lista) => soma + contarConcluidas(lista), 0);
  const progressoPercentual = totalSeries ? Math.min(100, (seriesFeitas / totalSeries) * 100) : 0;
  const pulados = Array.isArray(execucao?.pulados) ? execucao.pulados : [];
  const pendentes = useMemo(() => contarPendentes(exercicios, registros), [exercicios, registros]);

  useEffect(() => {
    if (!foco || !exercicio) return undefined;
    const salva = (registrosRef.current[foco.uid] || []).find((linha) => linha.numero === foco.serie);
    const historico = progresso[exercicio.exercicioId]?.sessoes?.[0];
    const referencia = historico?.series?.find((serie) => Number(serie.numero) === foco.serie);
    if (salva && (salva.carga || salva.concluida)) {
      setCarga(salva.carga);
      setRepeticoes(salva.repeticoes);
    } else {
      setCarga(referencia && referencia.carga != null ? formatarCarga(referencia.carga) : '');
      setRepeticoes('');
    }
    setErroAcao('');
    setTecnicaAberta(false);
    return undefined;
  }, [foco, exercicio, progresso]);

  useEffect(() => {
    if (!execucao?.descansoUid) {
      restanteAnterior.current = restante;
      return;
    }
    if (restanteAnterior.current > 0 && restante === 0 && fase !== 'resumo') {
      const destino = { uid: execucao.descansoUid, serie: Number(execucao.descansoSerie) || 1 };
      const mesmoExercicio = destino.uid === focoRef.current?.uid;
      if (somLiberado.current && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      if (mesmoExercicio) {
        setFoco(destino);
        api
          .controlWorkoutExecution(id, {
            acao: 'posicao',
            exercicioAtualUid: destino.uid,
            serieAtual: destino.serie,
          })
          .then((controle) => {
            if (controle?.data) setExecucao(controle.data);
          })
          .catch(() => {});
      } else {
        const posicao = indiceDoUid(exercicios, destino.uid);
        setTransicao({
          concluido: exercicio?.nome,
          proximo: posicao >= 0 ? exercicios[posicao].nome : 'Próximo exercício',
          uid: destino.uid,
          serie: destino.serie,
        });
        setFase('transicao');
      }
    }
    restanteAnterior.current = restante;
  }, [restante, execucao, fase, id, exercicios, exercicio]);

  const irPara = useCallback(
    async (destino, listaPulados = pulados) => {
      setFoco({ uid: destino.uid, serie: destino.serie });
      setFase(null);
      setTransicao(null);
      try {
        const controle = await api.controlWorkoutExecution(id, {
          acao: 'posicao',
          exercicioAtualUid: destino.uid,
          serieAtual: destino.serie,
          pulados: listaPulados,
        });
        if (controle?.data) setExecucao(controle.data);
      } catch {
        setErroAcao('A série está na tela, mas a posição não foi salva. Ela volta ao recarregar.');
      }
    },
    [id, pulados],
  );

  const salvarLinhas = useCallback(
    async (uid, transformar) => {
      const anteriores = registrosRef.current;
      const novas = {
        ...anteriores,
        [uid]: (anteriores[uid] || []).map((linha) => transformar(linha)),
      };
      const payload = montarPayload(novas);
      if (payload.invalido) {
        setErroAcao('Use números válidos. A carga aceita decimal, como 22,5, e não pode ser negativa.');
        return false;
      }
      registrosRef.current = novas;
      setRegistros(novas);
      try {
        await api.saveWorkoutExecution(id, { exercicios: payload.exercicios });
        return true;
      } catch {
        registrosRef.current = anteriores;
        setRegistros(anteriores);
        setErroAcao('Não foi possível salvar esta série. Os dados continuam na tela; tente de novo.');
        return false;
      }
    },
    [id],
  );

  const concluirSerie = async () => {
    if (!exercicio || !foco || processandoRef.current || treino?.realizado) return;
    if (linhaAtual?.concluida) {
      await corrigirSerie();
      return;
    }
    const cargaLida = lerCarga(carga);
    const repsLidas = lerRepeticoes(repeticoes);
    const pesoCorporal = exercicio.tipoCarga === 'peso_corporal';
    if (cargaLida.erro || repsLidas.erro || repsLidas.valor === null) {
      setErroAcao('Informe as repetições feitas. A carga aceita decimal, como 22,5, e não pode ser negativa.');
      return;
    }
    if (!pesoCorporal && cargaLida.valor === null) {
      setErroAcao('Informe a carga usada nesta série.');
      return;
    }
    processandoRef.current = true;
    setProcessando(true);
    setErroAcao('');
    somLiberado.current = true;
    if (!audioRef.current) audioRef.current = new Audio(SOM_DESCANSO);
    audioRef.current.volume = 0;
    audioRef.current
      .play()
      .then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 0.4;
      })
      .catch(() => {});
    const cargaFinal = cargaLida.valor === null ? 0 : cargaLida.valor;
    const salvou = await salvarLinhas(foco.uid, (linha) =>
      linha.numero === foco.serie
        ? { ...linha, carga: formatarCarga(cargaFinal), repeticoes: String(repsLidas.valor), concluida: true }
        : linha,
    );
    if (!salvou) {
      processandoRef.current = false;
      setProcessando(false);
      return;
    }
    const destino = proximoDestino(exercicios, foco.uid, foco.serie, pulados);
    if (!destino) {
      setFase('resumo');
      processandoRef.current = false;
      setProcessando(false);
      return;
    }
    const rotulo = destino.novo
      ? `Próximo: ${destino.nome}`
      : `Próxima série: ${destino.serie} de ${exercicio.series}`;
    try {
      const controle = await api.controlWorkoutExecution(id, {
        acao: 'descanso',
        descansoSegundos: descansoPrescrito(exercicio),
        descansoRotulo: rotulo,
        descansoUid: destino.uid,
        descansoSerie: destino.serie,
      });
      if (controle?.data) {
        restanteAnterior.current = descansoRestanteSegundos(controle.data);
        setExecucao(controle.data);
      }
    } catch {
      setErroAcao('A série foi salva, mas o descanso não iniciou. Use Pular ou recarregue a página.');
      setFoco({ uid: destino.uid, serie: destino.serie });
    }
    processandoRef.current = false;
    setProcessando(false);
  };

  const corrigirSerie = async () => {
    if (!foco || processandoRef.current) return;
    const cargaLida = lerCarga(carga);
    const repsLidas = lerRepeticoes(repeticoes);
    const pesoCorporal = exercicio?.tipoCarga === 'peso_corporal';
    if (cargaLida.erro || repsLidas.erro || repsLidas.valor === null || (!pesoCorporal && cargaLida.valor === null)) {
      setErroAcao('Para corrigir, informe a carga e as repetições.');
      return;
    }
    processandoRef.current = true;
    setProcessando(true);
    const cargaFinal = cargaLida.valor === null ? 0 : cargaLida.valor;
    const salvou = await salvarLinhas(foco.uid, (linha) =>
      linha.numero === foco.serie
        ? {
            ...linha,
            carga: formatarCarga(cargaFinal),
            repeticoes: String(repsLidas.valor),
            concluida: true,
          }
        : linha,
    );
    if (salvou) setErroAcao('');
    processandoRef.current = false;
    setProcessando(false);
  };

  const pularDescanso = async () => {
    if (processandoRef.current) return;
    processandoRef.current = true;
    setProcessando(true);
    try {
      const controle = await api.controlWorkoutExecution(id, { acao: 'pular_descanso' });
      const sessao = controle?.data;
      restanteAnterior.current = 0;
      if (sessao) setExecucao({ ...sessao, descansoTerminaEm: null });
      const destinoUid = execucao?.descansoUid;
      const destinoSerie = Number(execucao?.descansoSerie) || 1;
      if (destinoUid && destinoUid !== foco?.uid) {
        const posicao = indiceDoUid(exercicios, destinoUid);
        setTransicao({
          concluido: exercicio?.nome,
          proximo: posicao >= 0 ? exercicios[posicao].nome : 'Próximo exercício',
          uid: destinoUid,
          serie: destinoSerie,
        });
        setFase('transicao');
      } else if (destinoUid) {
        setFoco({ uid: destinoUid, serie: destinoSerie });
      }
    } catch {
      setErroAcao('Não foi possível pular o descanso.');
    }
    processandoRef.current = false;
    setProcessando(false);
  };

  const pausarOuRetomar = async () => {
    if (!execucao || processandoRef.current) return;
    processandoRef.current = true;
    setProcessando(true);
    try {
      const acao = execucao.status === 'em_andamento' ? 'pausar' : 'retomar';
      const controle = await api.controlWorkoutExecution(id, {
        acao,
        vistoEm: execucao.retomadoEm,
      });
      if (controle?.data) setExecucao(controle.data);
    } catch {
      setErroAcao('Não foi possível atualizar o cronômetro.');
    }
    processandoRef.current = false;
    setProcessando(false);
  };

  const pularExercicio = async () => {
    if (!foco || !exercicio) return;
    const lista = pulados.includes(foco.uid) ? pulados : [...pulados, foco.uid];
    const destino = proximoDestino(exercicios, foco.uid, Number(exercicio.series), lista);
    setConfirmarPular(false);
    if (!destino) {
      try {
        const controle = await api.controlWorkoutExecution(id, { acao: 'posicao', pulados: lista });
        if (controle?.data) setExecucao(controle.data);
      } catch {}
      setFase('resumo');
      return;
    }
    await irPara(destino, lista);
  };

  const serieAnterior = () => {
    if (!foco || indice < 0) return;
    if (foco.serie > 1) {
      irPara({ uid: foco.uid, serie: foco.serie - 1 });
      return;
    }
    if (indice > 0) {
      const anterior = exercicios[indice - 1];
      irPara({ uid: uidDoExercicio(anterior, indice - 1), serie: Number(anterior.series) || 1 });
    }
  };

  const sair = async () => {
    const atual = execRef.current;
    if (atual?.status === 'em_andamento' && atual.retomadoEm && !treino?.realizado) {
      try {
        await api.controlWorkoutExecution(id, { acao: 'pausar', vistoEm: atual.retomadoEm });
      } catch {}
    }
    sessionStorage.removeItem(chave);
    navigate(`/treino/${id}`);
  };

  const finalizar = async () => {
    if (processandoRef.current || treino?.realizado) return;
    if (pendentes > 0 && !confirmarFim) {
      setConfirmarFim(true);
      return;
    }
    processandoRef.current = true;
    setProcessando(true);
    setConfirmarFim(false);
    try {
      const resposta = await api.completeWorkout(id, { duracaoRealSegundos: segundosDecorridos(execRef.current) });
      if (resposta?.success && resposta.data) {
        setTreino(resposta.data);
        setExecucao((atual) => (atual ? { ...atual, status: 'concluida' } : atual));
        setFase('resumo');
        sessionStorage.removeItem(chave);
      }
    } catch {
      setErroAcao('Não foi possível finalizar o treino. Nada foi marcado como concluído.');
    }
    processandoRef.current = false;
    setProcessando(false);
  };

  if (carregando) return <LoadingSpinner />;

  const historico = exercicio ? progresso[exercicio.exercicioId]?.sessoes?.[0] : null;
  const seguinte = indice >= 0 ? exercicios[indice + 1] : null;
  const emDescanso = restante > 0 && fase !== 'resumo' && fase !== 'transicao';
  const pesoCorporal = exercicio?.tipoCarga === 'peso_corporal';
  const totalDescanso = Number(execucao?.descansoSegundos) || restante || 1;
  const anel = CIRCUNFERENCIA * (1 - Math.min(1, restante / totalDescanso));

  return (
    <Container className="custom-scroll">
      <Header>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Logo>HealGym</Logo>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <BackButton type="button" onClick={sair} whileHover={HOVER_BOTAO} whileTap={TOQUE_BOTAO}>
            <FiArrowLeft />
            Ficha
          </BackButton>
        </motion.div>
      </Header>
      <MainContent>
        {erro || !treino ? (
          <motion.div {...ENTRADA}>
            <TreinoDisplay>
              <TreinoTitulo>Treino indisponível</TreinoTitulo>
              <MetaExercicio>{erro || 'Não foi possível abrir este treino.'}</MetaExercicio>
            </TreinoDisplay>
          </motion.div>
        ) : (
          <motion.div {...ENTRADA} style={{ width: '100%' }}>
          <TreinoDisplay>
            <ExecucaoTopo>
              <TreinoTitulo>{treino.titulo}</TreinoTitulo>
              <ExecucaoFaixa>
                <MetaExercicio style={{ margin: 0 }}>
                  {[rotuloDivisao(treino), treino.letraTreino ? `Treino ${treino.letraTreino}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </MetaExercicio>
                <Relogio>
                  <FiClock />
                  <div>
                    <span>{execucao?.status === 'pausado' ? 'Pausado' : 'Tempo de treino'}</span>
                    <div>{formatarRelogio(decorrido)}</div>
                  </div>
                  {!treino.realizado && fase !== 'resumo' && (
                    <BotaoAcao
                      type="button"
                      onClick={pausarOuRetomar}
                      disabled={processando}
                      whileHover={processando ? undefined : HOVER_BOTAO}
                      whileTap={processando ? undefined : TOQUE_BOTAO}
                    >
                      {execucao?.status === 'em_andamento' ? <FiPause /> : <FiPlay />}
                      {execucao?.status === 'em_andamento' ? 'Pausar' : 'Retomar'}
                    </BotaoAcao>
                  )}
                </Relogio>
              </ExecucaoFaixa>
              <ProgressoBloco>
                <ProgressoTexto>
                  <span>
                    Exercício <strong>{Math.max(indice + 1, 1)}</strong> de <strong>{exercicios.length}</strong>
                  </span>
                  <span>
                    Séries concluídas: <strong>{seriesFeitas}</strong> de <strong>{totalSeries}</strong>
                  </span>
                  <span>
                    Progresso: <strong>{formatarPercentual(progressoPercentual)}</strong>
                  </span>
                </ProgressoTexto>
                <ProgressoTrilha>
                  <ProgressoBarra valor={progressoPercentual} />
                </ProgressoTrilha>
              </ProgressoBloco>
            </ExecucaoTopo>

            {fase === 'resumo' ? (
              <ResumoSessao
                treino={treino}
                exercicios={exercicios}
                registros={registros}
                pulados={pulados}
                progresso={progresso}
                decorrido={treino.duracaoRealSegundos || decorrido}
                seriesFeitas={seriesFeitas}
                totalSeries={totalSeries}
                pendentes={pendentes}
                processando={processando}
                confirmarFim={confirmarFim}
                onFinalizar={finalizar}
                onCancelarConfirmacao={() => setConfirmarFim(false)}
                onContinuar={() => {
                  const pendencia = primeiraPendencia(exercicios, registros, []);
                  if (pendencia) irPara(pendencia, pulados.filter((uid) => uid !== pendencia.uid));
                }}
                onVoltar={() => navigate('/treino')}
              />
            ) : fase === 'transicao' && transicao ? (
              <MissaoCard {...ENTRADA}>
                <ExercicioEtapa>Exercício concluído</ExercicioEtapa>
                <NomeExercicio>{transicao.concluido}</NomeExercicio>
                <MetaExercicio>Séries previstas finalizadas.</MetaExercicio>
                <ProximoDiscreto>Próximo exercício: {transicao.proximo}</ProximoDiscreto>
                <BotaoConcluir
                  type="button"
                  onClick={() => irPara({ uid: transicao.uid, serie: transicao.serie })}
                  whileHover={HOVER_PRINCIPAL}
                  whileTap={TOQUE_PRINCIPAL}
                >
                  CONTINUAR
                </BotaoConcluir>
              </MissaoCard>
            ) : emDescanso ? (
              <MissaoCard {...ENTRADA}>
                <DescansoTela>
                  <DescansoTitulo>DESCANSO</DescansoTitulo>
                  <Anel>
                    <svg viewBox="0 0 220 220" aria-hidden="true">
                      <circle cx="110" cy="110" r="96" fill="none" stroke="rgba(198,169,100,0.18)" strokeWidth="8" />
                      <circle
                        cx="110"
                        cy="110"
                        r="96"
                        fill="none"
                        stroke="#c6a964"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUNFERENCIA}
                        strokeDashoffset={anel}
                        transform="rotate(-90 110 110)"
                      />
                    </svg>
                    <DescansoNumero>{formatarRelogio(restante).slice(3)}</DescansoNumero>
                  </Anel>
                  <MetaExercicio>{execucao?.descansoRotulo || 'Prepare a próxima série.'}</MetaExercicio>
                  <BotaoPular
                    type="button"
                    onClick={pularDescanso}
                    disabled={processando}
                    whileHover={processando ? undefined : HOVER_BOTAO}
                    whileTap={processando ? undefined : TOQUE_BOTAO}
                  >
                    PULAR DESCANSO
                  </BotaoPular>
                  <BotaoAcao type="button" onClick={serieAnterior} whileHover={HOVER_BOTAO} whileTap={TOQUE_BOTAO}>
                    Corrigir série anterior
                  </BotaoAcao>
                </DescansoTela>
              </MissaoCard>
            ) : exercicio && foco ? (
              <MissaoCard {...ENTRADA}>
                <ExercicioEtapa>
                  Exercício {indice + 1} de {exercicios.length}
                </ExercicioEtapa>
                <NomeExercicio>{exercicio.nome}</NomeExercicio>
                <MetaExercicio>{porcaoLegivel(exercicio)}</MetaExercicio>
                <SerieAtual>
                  Série {foco.serie} de {exercicio.series}
                  {linhaAtual?.concluida ? ' · concluída' : ''}
                </SerieAtual>
                <MetaExercicio>Meta: {exercicio.repeticoes} repetições</MetaExercicio>
                <MetaExercicio>Descanso: {exercicio.descanso}</MetaExercicio>
                {rotuloCarga(exercicio) && <MetaExercicio>{rotuloCarga(exercicio)}</MetaExercicio>}
                {historico && (
                  <Referencia>
                    Última execução
                    {historico.data ? ` · ${new Date(historico.data).toLocaleDateString('pt-BR')}` : ''}:{' '}
                    {descreverSeries(historico.series)}
                  </Referencia>
                )}
                <Campos>
                  <CampoBloco>
                    {pesoCorporal ? 'Carga extra (kg)' : 'Carga utilizada (kg)'}
                    <CampoGrande
                      type="text"
                      inputMode="decimal"
                      aria-label="Carga utilizada"
                      placeholder={pesoCorporal ? '0' : 'kg'}
                      value={carga}
                      disabled={treino.realizado || processando}
                      maxLength={8}
                      erro={lerCarga(carga).erro}
                      onChange={(event) => setCarga(event.target.value)}
                    />
                  </CampoBloco>
                  <CampoBloco>
                    Repetições realizadas
                    <CampoGrande
                      type="text"
                      inputMode="numeric"
                      aria-label="Repetições realizadas"
                      placeholder="reps"
                      value={repeticoes}
                      disabled={treino.realizado || processando}
                      maxLength={3}
                      erro={lerRepeticoes(repeticoes).erro}
                      onChange={(event) => setRepeticoes(event.target.value.replace(/\D/g, ''))}
                    />
                  </CampoBloco>
                </Campos>
                {!treino.realizado && (
                  <BotaoConcluir
                    type="button"
                    onClick={concluirSerie}
                    disabled={processando}
                    whileHover={processando ? undefined : HOVER_PRINCIPAL}
                    whileTap={processando ? undefined : TOQUE_PRINCIPAL}
                  >
                    <FiCheck />
                    {processando ? 'SALVANDO…' : linhaAtual?.concluida ? 'SALVAR CORREÇÃO' : 'CONCLUIR SÉRIE'}
                  </BotaoConcluir>
                )}
                {erroAcao && <AvisoExecucao>{erroAcao}</AvisoExecucao>}
                {confirmarPular && (
                  <AvisoExecucao>
                    Pular {exercicio.nome}? As séries dele continuam pendentes e entram no resumo.
                    <AcoesExecucao>
                      <BotaoAcao type="button" onClick={pularExercicio} whileHover={HOVER_BOTAO} whileTap={TOQUE_BOTAO}>
                        Confirmar
                      </BotaoAcao>
                      <BotaoAcao
                        type="button"
                        onClick={() => setConfirmarPular(false)}
                        whileHover={HOVER_BOTAO}
                        whileTap={TOQUE_BOTAO}
                      >
                        Cancelar
                      </BotaoAcao>
                    </AcoesExecucao>
                  </AvisoExecucao>
                )}
                {seguinte && !pulados.includes(uidDoExercicio(seguinte, indice + 1)) && (
                  <ProximoDiscreto>Em seguida: {seguinte.nome}</ProximoDiscreto>
                )}
                <AcoesExecucao>
                  <BotaoAcao
                    type="button"
                    onClick={serieAnterior}
                    disabled={indice === 0 && foco.serie === 1}
                    whileHover={indice === 0 && foco.serie === 1 ? undefined : HOVER_BOTAO}
                    whileTap={indice === 0 && foco.serie === 1 ? undefined : TOQUE_BOTAO}
                  >
                    Série anterior
                  </BotaoAcao>
                  <BotaoAcao
                    type="button"
                    onClick={() => setSeriesAbertas((atual) => !atual)}
                    whileHover={HOVER_BOTAO}
                    whileTap={TOQUE_BOTAO}
                  >
                    {seriesAbertas ? 'Ocultar séries' : 'Séries feitas'}
                  </BotaoAcao>
                  <BotaoAcao
                    type="button"
                    onClick={() => setTecnicaAberta((atual) => !atual)}
                    whileHover={HOVER_BOTAO}
                    whileTap={TOQUE_BOTAO}
                  >
                    Técnica
                  </BotaoAcao>
                  {!treino.realizado && (
                    <BotaoAcao
                      type="button"
                      onClick={() => setConfirmarPular(true)}
                      whileHover={HOVER_BOTAO}
                      whileTap={TOQUE_BOTAO}
                    >
                      Pular exercício
                    </BotaoAcao>
                  )}
                </AcoesExecucao>
                {seriesAbertas && (
                  <ListaSeries>
                    {linhas.filter((linha) => linha.concluida).length === 0 && (
                      <ItemSerie>Nenhuma série concluída neste exercício.</ItemSerie>
                    )}
                    {linhas
                      .filter((linha) => linha.concluida)
                      .map((linha) => (
                        <ItemSerie key={linha.numero}>
                          <span>
                            Série {linha.numero}: {linha.carga || '0'} kg × {linha.repeticoes || '–'}
                          </span>
                          <BotaoTexto
                            type="button"
                            onClick={() => irPara({ uid: foco.uid, serie: linha.numero })}
                            whileHover={HOVER_BOTAO}
                            whileTap={TOQUE_BOTAO}
                          >
                            Corrigir
                          </BotaoTexto>
                        </ItemSerie>
                      ))}
                  </ListaSeries>
                )}
                <AnimatePresence initial={false}>
                  {tecnicaAberta && (
                    <TecnicaPainel
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <Tecnica>
                        <strong>Técnica:</strong> {exercicio.tecnica}
                      </Tecnica>
                      {exercicio.cuidado && (
                        <Tecnica>
                          <strong>Cuidado:</strong> {exercicio.cuidado}
                        </Tecnica>
                      )}
                      {exercicio.erroComum && (
                        <Tecnica>
                          <strong>Erro comum:</strong> {exercicio.erroComum}
                        </Tecnica>
                      )}
                    </TecnicaPainel>
                  )}
                </AnimatePresence>
              </MissaoCard>
            ) : null}
          </TreinoDisplay>
          </motion.div>
        )}
      </MainContent>
    </Container>
  );
};

function primeiraPendencia(exercicios, registros, pulados) {
  for (let index = 0; index < exercicios.length; index += 1) {
    const uid = uidDoExercicio(exercicios[index], index);
    if (pulados.includes(uid)) continue;
    const pendente = (registros[uid] || []).find((linha) => !linha.concluida);
    if (pendente) return { uid, serie: pendente.numero };
  }
  return null;
}

function proximoDestino(exercicios, uid, serie, pulados) {
  const index = indiceDoUid(exercicios, uid);
  if (index < 0) return null;
  const atual = exercicios[index];
  if (serie < Number(atual.series)) {
    return { uid, serie: serie + 1, novo: false, nome: atual.nome };
  }
  for (let proximo = index + 1; proximo < exercicios.length; proximo += 1) {
    const uidProximo = uidDoExercicio(exercicios[proximo], proximo);
    if (pulados.includes(uidProximo)) continue;
    return { uid: uidProximo, serie: 1, novo: true, nome: exercicios[proximo].nome };
  }
  return null;
}

function contarPendentes(exercicios, registros) {
  return exercicios.reduce((soma, exercicio, index) => {
    const uid = uidDoExercicio(exercicio, index);
    const feitas = contarConcluidas(registros[uid]);
    return soma + Math.max(0, (Number(exercicio.series) || 0) - feitas);
  }, 0);
}

function formatarPercentual(valor) {
  const texto = (Math.round(valor * 10) / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return `${texto}%`;
}

function ResumoSessao({
  treino,
  exercicios,
  registros,
  pulados,
  progresso,
  decorrido,
  seriesFeitas,
  totalSeries,
  pendentes,
  processando,
  confirmarFim,
  onFinalizar,
  onCancelarConfirmacao,
  onContinuar,
  onVoltar,
}) {
  const reps = Object.values(registros).reduce(
    (soma, linhas) =>
      soma +
      linhas.reduce((parcial, linha) => {
        if (!linha.concluida) return parcial;
        const valor = lerRepeticoes(linha.repeticoes).valor;
        return parcial + (valor || 0);
      }, 0),
    0,
  );
  const nomesPulados = exercicios
    .filter((exercicio, index) => pulados.includes(uidDoExercicio(exercicio, index)))
    .map((exercicio) => exercicio.nome);

  return (
    <MissaoCard {...ENTRADA}>
      <ExercicioEtapa>{pendentes > 0 ? 'Sessão encerrada com pendências' : 'Treino concluído'}</ExercicioEtapa>
      <NomeExercicio>{treino.titulo}</NomeExercicio>
      <ResumoLista>
        <ResumoLinha>
          <span>Tempo executado</span>
          <strong>{formatarRelogio(decorrido)}</strong>
        </ResumoLinha>
        <ResumoLinha>
          <span>Séries concluídas</span>
          <strong>
            {seriesFeitas} de {totalSeries}
          </strong>
        </ResumoLinha>
        <ResumoLinha>
          <span>Repetições registradas</span>
          <strong>{reps}</strong>
        </ResumoLinha>
        {pendentes > 0 && (
          <ResumoLinha>
            <span>Séries pendentes</span>
            <strong>{pendentes}</strong>
          </ResumoLinha>
        )}
      </ResumoLista>
      <ListaSeries>
        {exercicios.map((exercicio, index) => {
          const uid = uidDoExercicio(exercicio, index);
          const feitas = (registros[uid] || []).filter((linha) => linha.concluida);
          const anterior = progresso[exercicio.exercicioId]?.sessoes?.[0];
          if (!feitas.length && !pulados.includes(uid)) return null;
          return (
            <ItemSerie key={uid}>
              <span>
                {exercicio.nome}
                {pulados.includes(uid) ? ' · pulado' : ''}
                {feitas.length
                  ? ` · ${feitas.map((linha) => `${linha.carga || '0'} kg × ${linha.repeticoes}`).join(', ')}`
                  : ''}
                {anterior ? ` · última: ${descreverSeries(anterior.series)}` : ''}
              </span>
            </ItemSerie>
          );
        })}
      </ListaSeries>
      {nomesPulados.length > 0 && (
        <ProximoDiscreto>Exercícios pulados: {nomesPulados.join(', ')}</ProximoDiscreto>
      )}
      {confirmarFim && (
        <AvisoExecucao>
          Ficam {pendentes} séries pendentes. A sessão será concluída com esse resultado, sem marcar o que não foi feito.
        </AvisoExecucao>
      )}
      {!treino.realizado && (
        <BotaoConcluir
          type="button"
          onClick={onFinalizar}
          disabled={processando}
          whileHover={processando ? undefined : HOVER_PRINCIPAL}
          whileTap={processando ? undefined : TOQUE_PRINCIPAL}
        >
          {processando ? 'FINALIZANDO…' : 'FINALIZAR TREINO'}
        </BotaoConcluir>
      )}
      <AcoesExecucao>
        {confirmarFim && (
          <BotaoAcao type="button" onClick={onCancelarConfirmacao} whileHover={HOVER_BOTAO} whileTap={TOQUE_BOTAO}>
            Cancelar
          </BotaoAcao>
        )}
        {!treino.realizado && pendentes > 0 && (
          <BotaoAcao type="button" onClick={onContinuar} whileHover={HOVER_BOTAO} whileTap={TOQUE_BOTAO}>
            Continuar séries pendentes
          </BotaoAcao>
        )}
        <BotaoAcao type="button" onClick={onVoltar} whileHover={HOVER_BOTAO} whileTap={TOQUE_BOTAO}>
          Voltar aos treinos
        </BotaoAcao>
      </AcoesExecucao>
    </MissaoCard>
  );
}

export default ExecucaoTreinoPage;
