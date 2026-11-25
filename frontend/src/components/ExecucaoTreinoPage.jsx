import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { estadoOrigem } from '../utils/navegacaoTreino';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowLeft, FiCheck, FiChevronDown, FiClock, FiPause, FiPlay, FiAlertCircle } from 'react-icons/fi';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import DialogoAcao from './DialogoAcao';
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
  rotuloDivisao,
  segundosDecorridos,
  uidDoExercicio,
} from '../utils/treinoExecucao';
import { execucaoConfirmaAquecimento, execucaoConfirmaPayload } from '../utils/confirmacaoExecucao';
import { orientacaoDeCarga, seriesPreparatorias, textoAquecimento } from '../utils/orientacaoFicha';
import { simplificarTexto } from '../utils/rotina';
import DetalhesExercicio from './treino/DetalhesExercicio';
import RotuloDestaque from './treino/RotuloDestaque';
import { CURVA } from './treino/movimento';
import {
  BackButton,
  Container,
  Header,
  Logo,
  MainContent,
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
  TextoClaro,
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
const HOVER_BOTAO = { scale: 1.02 };
const TOQUE_BOTAO = { scale: 0.98 };
const passo = (reduzir) => (reduzir ? { duration: 0 } : { duration: 0.22, ease: CURVA });

function SetaPainel(props) {
  return <motion.span {...props} style={{ display: 'inline-flex', flexShrink: 0 }} />;
}
const CIRCUNFERENCIA = 2 * Math.PI * 96;

const indiceDoUid = (exercicios, uid) =>
  exercicios.findIndex((exercicio, index) => uidDoExercicio(exercicio, index) === uid);

const ExecucaoTreinoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const reduzir = useReducedMotion();
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
  const [painelPorExercicio, setPainelPorExercicio] = useState({});
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
  const seriesPainel = useRef(null);
  const cuidadosPainel = useRef(null);
  const seguirPainel = useRef(null);

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
    const espera = { id: null };

    api
      .getWorkout(id)
      .then(async (resposta) => {
        if (!ativo) return null;
        if (!resposta?.success || !Array.isArray(resposta.data?.exercicios)) {
          setErro('Não foi possível carregar este treino.');
          return null;
        }
        const dados = resposta.data;
        if (dados.execucaoPermitida === false) {
          setErro(dados.bloqueioMensagem || 'Conclua o treino anterior para liberar este.');
          return null;
        }
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
        if (recarregou && ativo) {
          espera.id = setTimeout(() => {
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
        else if (status === 409) setErro(error.message || 'Conclua o treino anterior para liberar este.');
        else setErro('Não foi possível abrir a execução do treino.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
      vivoRef.current = false;
      if (espera.id) clearTimeout(espera.id);
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
  const preparatorias = seriesPreparatorias(exercicio, indice);
  const aquecimentoFeito = (execucao?.exercicios || []).find((item) => item?.uid === foco?.uid)?.aquecimento;
  const aquecimentoPendente = Boolean(
    foco?.uid &&
      preparatorias > 0 &&
      foco?.serie === 1 &&
      !treino?.realizado &&
      !aquecimentoFeito?.concluida &&
      !(registros[foco.uid] || []).some((linha) => linha.concluida),
  );

  useEffect(() => {
    if (!foco || !exercicio) return undefined;
    if (aquecimentoPendente) {
      setCarga('');
      setRepeticoes('');
      setErroAcao('');
      return undefined;
    }
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
    return undefined;
  }, [foco, exercicio, progresso, aquecimentoPendente]);

  useEffect(() => {
    if (!execucao?.descansoUid) {
      restanteAnterior.current = restante;
      return;
    }
    if (restanteAnterior.current > 0 && restante === 0 && fase !== 'resumo') {
      const destino = { uid: execucao.descansoUid, serie: Number(execucao.descansoSerie) || 1 };
      const mesmoExercicio = destino.uid === focoRef.current?.uid;
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
      try {
        await api.saveWorkoutExecution(id, { exercicios: payload.exercicios });
        registrosRef.current = novas;
        setRegistros(novas);
        return true;
      } catch (error) {
        if (!error?.response) {
          try {
            const atual = await api.getWorkoutExecution(id);
            if (execucaoConfirmaPayload(atual?.data, payload.exercicios)) {
              registrosRef.current = novas;
              setRegistros(novas);
              return true;
            }
          } catch {
            setErroAcao('Sem resposta do servidor. Os dados continuam na tela; recarregue ou tente de novo.');
            return false;
          }
        }
        setErroAcao('Não foi possível salvar esta série. Os dados continuam na tela; tente de novo.');
        return false;
      }
    },
    [id],
  );

  const concluirAquecimento = async () => {
    if (!exercicio || !foco || processandoRef.current || treino?.realizado || !aquecimentoPendente) return;
    const cargaLida = lerCarga(carga);
    const repsLidas = lerRepeticoes(repeticoes);
    const pesoCorporal = exercicio.tipoCarga === 'peso_corporal';
    if (cargaLida.erro || repsLidas.erro || repsLidas.valor === null) {
      setErroAcao('Informe as repetições da série leve. A carga aceita decimal, como 22,5, e não pode ser negativa.');
      return;
    }
    if (!pesoCorporal && cargaLida.valor === null) {
      setErroAcao('Informe a carga usada na série leve.');
      return;
    }
    processandoRef.current = true;
    setProcessando(true);
    setErroAcao('');
    const cargaFinal = cargaLida.valor === null ? 0 : cargaLida.valor;
    const registro = {
      carga: cargaFinal,
      repeticoes: repsLidas.valor,
      concluida: true,
    };
    const payload = montarPayload(registrosRef.current);
    if (payload.invalido) {
      processandoRef.current = false;
      setProcessando(false);
      setErroAcao('Use números válidos. A carga aceita decimal, como 22,5, e não pode ser negativa.');
      return;
    }
    const lista = payload.exercicios.slice();
    const atual = lista.find((item) => item.uid === foco.uid);
    if (atual) atual.aquecimento = registro;
    else lista.push({ uid: foco.uid, series: [], aquecimento: registro });
    try {
      await api.saveWorkoutExecution(id, { exercicios: lista });
      setExecucao((atualExecucao) => {
        const gravados = Array.isArray(atualExecucao?.exercicios)
          ? atualExecucao.exercicios.map((item) => ({ ...item }))
          : [];
        const posicao = gravados.findIndex((item) => item?.uid === foco.uid);
        if (posicao >= 0) gravados[posicao] = { ...gravados[posicao], aquecimento: registro };
        else gravados.push({ uid: foco.uid, series: [], aquecimento: registro });
        return { ...(atualExecucao || {}), exercicios: gravados };
      });
      setCarga('');
      setRepeticoes('');
    } catch (error) {
      if (!error?.response) {
        try {
          const atual = await api.getWorkoutExecution(id);
          if (execucaoConfirmaAquecimento(atual?.data, foco.uid, registro)) {
            if (atual?.data) setExecucao(atual.data);
            setCarga('');
            setRepeticoes('');
          } else {
            setErroAcao('Não foi possível confirmar o aquecimento. Os dados continuam na tela; tente de novo.');
          }
        } catch {
          setErroAcao('Sem resposta do servidor. O aquecimento continua na tela; recarregue ou tente de novo.');
        }
      } else {
        setErroAcao('Não foi possível salvar o aquecimento. Tente de novo.');
      }
    }
    processandoRef.current = false;
    setProcessando(false);
  };

  const concluirSerie = async () => {
    if (!exercicio || !foco || processandoRef.current || treino?.realizado || aquecimentoPendente) return;
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
    if (!foco || !exercicio || processandoRef.current || treino?.realizado) return;
    const cargaLida = lerCarga(carga);
    const repsLidas = lerRepeticoes(repeticoes);
    const pesoCorporal = exercicio.tipoCarga === 'peso_corporal';
    if (cargaLida.erro || repsLidas.erro || repsLidas.valor === null || (!pesoCorporal && cargaLida.valor === null)) {
      setErroAcao('Para corrigir, informe a carga e as repetições.');
      return;
    }
    processandoRef.current = true;
    setProcessando(true);
    setErroAcao('');
    const cargaFinal = cargaLida.valor === null ? 0 : cargaLida.valor;
    const serieCorrigida = Number(foco.serie);
    const salvou = await salvarLinhas(foco.uid, (linha) =>
      Number(linha.numero) === serieCorrigida
        ? {
            ...linha,
            carga: formatarCarga(cargaFinal),
            repeticoes: String(repsLidas.valor),
            concluida: true,
          }
        : linha,
    );
    if (!salvou) {
      processandoRef.current = false;
      setProcessando(false);
      return;
    }
    const pendencia = primeiraPendencia(exercicios, registrosRef.current, pulados);
    if (!pendencia) {
      setFase('resumo');
    } else {
      await irPara(pendencia);
    }
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

  const sair = async () => {
    const atual = execRef.current;
    if (atual?.status === 'em_andamento' && atual.retomadoEm && !treino?.realizado) {
      try {
        await api.controlWorkoutExecution(id, { acao: 'pausar', vistoEm: atual.retomadoEm });
      } catch {}
    }
    sessionStorage.removeItem(chave);
    navigate(`/treino/${id}`, { replace: true, state: estadoOrigem(location.state?.origem) });
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
    const marcarConcluido = (treinoSalvo) => {
      setTreino(treinoSalvo);
      setExecucao((atual) => (atual ? { ...atual, status: 'concluida' } : atual));
      setFase('resumo');
      sessionStorage.removeItem(chave);
    };
    try {
      const resposta = await api.completeWorkout(id, { duracaoRealSegundos: segundosDecorridos(execRef.current) });
      if (resposta?.success && resposta.data?.realizado) {
        marcarConcluido(resposta.data);
      } else {
        setErroAcao('O servidor não confirmou a conclusão. O treino continua aberto.');
      }
    } catch (error) {
      if (!error?.response) {
        try {
          const atual = await api.getWorkout(id);
          if (atual?.data?.realizado) {
            marcarConcluido(atual.data);
          } else {
            setErroAcao('Não foi possível confirmar a conclusão. O treino continua aberto; tente de novo.');
          }
        } catch {
          setErroAcao('Sem resposta do servidor. Recarregue a página antes de tentar de novo.');
        }
      } else {
        setErroAcao('Não foi possível finalizar o treino. Nada foi marcado como concluído.');
      }
    }
    processandoRef.current = false;
    setProcessando(false);
  };

  if (carregando) return <LoadingSpinner />;

  const progressoExercicio = exercicio ? progresso[exercicio.exercicioId] : null;
  const historico = progressoExercicio?.sessoes?.[0] || null;
  const sugestao = progressoExercicio?.recomendacao || null;
  const seguinte = indice >= 0 ? exercicios[indice + 1] : null;
  const emDescanso = restante > 0 && fase !== 'resumo' && fase !== 'transicao';
  const partesDescanso = execucao?.descansoRotulo ? partirRotulo(execucao.descansoRotulo) : null;
  const painelAtual = foco?.uid ? painelPorExercicio[foco.uid] || null : null;
  const alternarPainel = (alvo) => {
    if (!foco?.uid) return;
    setPainelPorExercicio((atual) => {
      const proximo = atual[foco.uid] === alvo ? null : alvo;
      seguirPainel.current = proximo;
      return { ...atual, [foco.uid]: proximo };
    });
  };
  const pesoCorporal = exercicio?.tipoCarga === 'peso_corporal';
  const totalDescanso = Number(execucao?.descansoSegundos) || restante || 1;
  const anel = CIRCUNFERENCIA * (1 - Math.min(1, restante / totalDescanso));
  const cena = {
    initial: reduzir ? false : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: reduzir ? { opacity: 1 } : { opacity: 0, y: -6 },
    transition: passo(reduzir),
  };
  const confirmarNoEnter = (event) => {
    if (event.key !== 'Enter' || event.repeat) return;
    if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    const alvo = event.target;
    if (alvo instanceof Element && alvo.closest('button, a, textarea, select')) return;
    if (processando || treino?.realizado || confirmarPular) return;
    event.preventDefault();
    if (aquecimentoPendente) concluirAquecimento();
    else concluirSerie();
  };

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
                  <RotuloDestaque>
                    {[rotuloDivisao(treino), treino.letraTreino ? `Treino ${treino.letraTreino}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </RotuloDestaque>
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

            <AnimatePresence mode="wait" initial={false}>
            {fase === 'resumo' ? (
              <motion.div key="resumo" {...cena} style={{ width: '100%' }}>
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
                onVoltar={() => {
                  if (treino?.realizado) {
                    navigate(`/treino/${id}`, { replace: true, state: estadoOrigem(location.state?.origem) });
                  } else sair();
                }}
              />
              </motion.div>
            ) : fase === 'transicao' && transicao ? (
              <MissaoCard key="transicao" {...cena}>
                <ExercicioEtapa>Exercício concluído</ExercicioEtapa>
                <NomeExercicio>{transicao.concluido}</NomeExercicio>
                <MetaExercicio>Séries previstas finalizadas.</MetaExercicio>
                <ProximoDiscreto>
                  <TextoClaro>Próximo exercício:</TextoClaro> <RotuloDestaque>{transicao.proximo}</RotuloDestaque>
                </ProximoDiscreto>
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
              <MissaoCard key="descanso" {...cena}>
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
                  {partesDescanso?.rotulo === 'Próximo exercício' ? (
                    <MetaExercicio>
                      <TextoClaro>Próximo exercício:</TextoClaro>{' '}
                      <RotuloDestaque>{partesDescanso.valor}</RotuloDestaque>
                    </MetaExercicio>
                  ) : partesDescanso ? (
                    <MetaExercicio>
                      <RotuloDestaque>{partesDescanso.rotulo}:</RotuloDestaque> {partesDescanso.valor}
                    </MetaExercicio>
                  ) : (
                    <MetaExercicio>Prepare a próxima série.</MetaExercicio>
                  )}
                  <BotaoPular
                    type="button"
                    onClick={pularDescanso}
                    disabled={processando}
                    whileHover={processando ? undefined : HOVER_BOTAO}
                    whileTap={processando ? undefined : TOQUE_BOTAO}
                  >
                    PULAR DESCANSO
                  </BotaoPular>
                </DescansoTela>
              </MissaoCard>
            ) : exercicio && foco ? (
              <MissaoCard
                key={`${foco.uid}-${foco.serie}${aquecimentoPendente ? '-aquecimento' : ''}`}
                {...cena}
                onKeyDown={confirmarNoEnter}
              >
                <ExercicioEtapa>
                  Exercício {indice + 1} de {exercicios.length}
                </ExercicioEtapa>
                <NomeExercicio>{exercicio.nome}</NomeExercicio>
                {porcaoLegivel(exercicio) && <MetaExercicio>{porcaoLegivel(exercicio)}</MetaExercicio>}
                {aquecimentoPendente ? (
                  <SerieAtual>Aquecimento</SerieAtual>
                ) : (
                  <SerieAtual>
                    Série {foco.serie} de {exercicio.series}
                    {linhaAtual?.concluida ? <span> · concluída</span> : null}
                  </SerieAtual>
                )}
                {aquecimentoPendente ? (
                  <MetaExercicio>
                    <RotuloDestaque>Aquecimento:</RotuloDestaque>{' '}
                    {textoAquecimento(exercicio, indice).replace(/^Aquecimento:\s*/, '')}
                  </MetaExercicio>
                ) : (
                  <>
                    <MetaExercicio>
                      <RotuloDestaque>Meta:</RotuloDestaque> {exercicio.repeticoes} repetições
                    </MetaExercicio>
                    <MetaExercicio>
                      <RotuloDestaque>Descanso:</RotuloDestaque> {exercicio.descanso}
                    </MetaExercicio>
                    {orientacaoDeCarga(exercicio.repeticoes, exercicio.rirAlvo) && (
                      <MetaExercicio>{orientacaoDeCarga(exercicio.repeticoes, exercicio.rirAlvo)}</MetaExercicio>
                    )}
                  </>
                )}
                {historico && (
                  <Referencia>
                    <RotuloDestaque>Última execução:</RotuloDestaque>{' '}
                    {historico.data ? `${new Date(historico.data).toLocaleDateString('pt-BR')} · ` : ''}
                    {descreverSeries(historico.series)}
                  </Referencia>
                )}
                {sugestao?.titulo && (
                  <Referencia>
                    <RotuloDestaque>Sugestão:</RotuloDestaque>{' '}
                    {simplificarTexto(sugestao.titulo) || sugestao.titulo}
                    {sugestao.texto ? ` — ${simplificarTexto(sugestao.texto)}` : ''}
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
                      $erro={lerCarga(carga).erro}
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
                      $erro={lerRepeticoes(repeticoes).erro}
                      onChange={(event) => setRepeticoes(event.target.value.replace(/\D/g, ''))}
                    />
                  </CampoBloco>
                </Campos>
                {!treino.realizado && (
                  <BotaoConcluir
                    type="button"
                    onClick={aquecimentoPendente ? concluirAquecimento : concluirSerie}
                    disabled={processando}
                    whileHover={processando ? undefined : HOVER_PRINCIPAL}
                    whileTap={processando ? undefined : TOQUE_PRINCIPAL}
                  >
                    <FiCheck />
                    {processando
                      ? 'SALVANDO…'
                      : aquecimentoPendente
                        ? 'CONCLUIR AQUECIMENTO'
                        : linhaAtual?.concluida
                          ? 'SALVAR CORREÇÃO'
                          : 'CONCLUIR SÉRIE'}
                  </BotaoConcluir>
                )}
                {erroAcao && <AvisoExecucao>{erroAcao}</AvisoExecucao>}
                <DialogoAcao
                  aberto={confirmarPular}
                  titulo="Pular exercício"
                  mensagem={
                    exercicio
                      ? `Pular ${exercicio.nome}? As séries dele continuam pendentes e entram no resumo.`
                      : ''
                  }
                  icone={<FiAlertCircle />}
                  tipo="confirmar"
                  onConfirmar={pularExercicio}
                  onCancelar={() => setConfirmarPular(false)}
                />
                {seguinte && !pulados.includes(uidDoExercicio(seguinte, indice + 1)) && (
                  <ProximoDiscreto>
                    <TextoClaro>Próximo exercício:</TextoClaro> <RotuloDestaque>{seguinte.nome}</RotuloDestaque>
                  </ProximoDiscreto>
                )}
                <AcoesExecucao>
                  <BotaoAcao
                    type="button"
                    aria-expanded={painelAtual === 'series'}
                    aria-controls={`series-${foco.uid}`}
                    onClick={() => alternarPainel('series')}
                    whileHover={HOVER_BOTAO}
                    whileTap={TOQUE_BOTAO}
                  >
                    {painelAtual === 'series' ? 'Ocultar séries' : 'Ver séries'}
                    <SetaPainel
                      aria-hidden="true"
                      animate={{ rotate: painelAtual === 'series' ? 180 : 0 }}
                      transition={passo(reduzir)}
                    >
                      <FiChevronDown />
                    </SetaPainel>
                  </BotaoAcao>
                  <BotaoAcao
                    type="button"
                    aria-expanded={painelAtual === 'cuidados'}
                    aria-controls={`cuidados-${foco.uid}`}
                    onClick={() => alternarPainel('cuidados')}
                    whileHover={HOVER_BOTAO}
                    whileTap={TOQUE_BOTAO}
                  >
                    {painelAtual === 'cuidados' ? 'Ocultar cuidados' : 'Cuidados'}
                    <SetaPainel
                      aria-hidden="true"
                      animate={{ rotate: painelAtual === 'cuidados' ? 180 : 0 }}
                      transition={passo(reduzir)}
                    >
                      <FiChevronDown />
                    </SetaPainel>
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
                <AnimatePresence mode="wait" initial={false}>
                  {painelAtual === 'series' && (
                    <motion.div
                      id={`series-${foco.uid}`}
                      ref={seriesPainel}
                      key="series"
                      initial={reduzir ? false : { height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0, transition: passo(reduzir) }}
                      transition={passo(reduzir)}
                      style={{ overflow: 'hidden' }}
                      onUpdate={() => {
                        if (seguirPainel.current !== 'series' || reduzir) return;
                        acompanharAbertura(seriesPainel.current);
                      }}
                      onAnimationComplete={() => {
                        if (seguirPainel.current !== 'series') return;
                        acompanharAbertura(seriesPainel.current);
                        seguirPainel.current = null;
                      }}
                    >
                      <ListaSeries style={{ marginTop: 0, paddingTop: '0.85rem' }}>
                        {linhas.filter((linha) => linha.concluida).length === 0 && (
                          <ItemSerie>Nenhuma série concluída neste exercício.</ItemSerie>
                        )}
                        {linhas
                          .filter((linha) => linha.concluida)
                          .map((linha) => (
                            <ItemSerie key={linha.numero}>
                              <span>
                                <RotuloDestaque>Série {linha.numero}:</RotuloDestaque>{' '}
                                {linha.carga || '0'} kg × {linha.repeticoes || '–'}
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
                    </motion.div>
                  )}
                  {painelAtual === 'cuidados' && (
                    <TecnicaPainel
                      id={`cuidados-${foco.uid}`}
                      ref={cuidadosPainel}
                      key="cuidados"
                      initial={reduzir ? false : { height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0, transition: passo(reduzir) }}
                      transition={passo(reduzir)}
                      onUpdate={() => {
                        if (seguirPainel.current !== 'cuidados' || reduzir) return;
                        acompanharAbertura(cuidadosPainel.current);
                      }}
                      onAnimationComplete={() => {
                        if (seguirPainel.current !== 'cuidados') return;
                        acompanharAbertura(cuidadosPainel.current);
                        seguirPainel.current = null;
                      }}
                    >
                      <DetalhesExercicio exercicio={exercicio} />
                    </TecnicaPainel>
                  )}
                </AnimatePresence>
              </MissaoCard>
            ) : null}
            </AnimatePresence>
          </TreinoDisplay>
          </motion.div>
        )}
      </MainContent>
    </Container>
  );
};

function partirRotulo(texto) {
  const indice = String(texto).indexOf(':');
  if (indice < 0) return { rotulo: String(texto), valor: '' };
  const rotulo = String(texto).slice(0, indice).trim();
  const valor = String(texto).slice(indice + 1).trim();
  if (rotulo === 'Próximo') return { rotulo: 'Próximo exercício', valor };
  return { rotulo, valor };
}

function acompanharAbertura(elemento) {
  if (!elemento) return;
  const margem = 24;
  const fundo = elemento.getBoundingClientRect().bottom + margem;
  let pai = elemento.parentElement;
  while (pai && pai !== document.body && pai !== document.documentElement) {
    const estilo = window.getComputedStyle(pai);
    const podeRolar = /(auto|scroll)/.test(estilo.overflowY);
    if (podeRolar && pai.scrollHeight > pai.clientHeight + 1) {
      const limite = pai.getBoundingClientRect().bottom - margem;
      if (fundo > limite) pai.scrollTop += fundo - limite;
      return;
    }
    pai = pai.parentElement;
  }
  if (fundo <= window.innerHeight) return;
  const pagina = document.scrollingElement || document.documentElement;
  const comportamento = pagina.style.scrollBehavior;
  pagina.style.scrollBehavior = 'auto';
  pagina.scrollTop += fundo - window.innerHeight;
  pagina.style.scrollBehavior = comportamento;
}

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
    <MissaoCard>
      <ExercicioEtapa>{pendentes > 0 ? 'Treino encerrado com pendências' : 'Treino concluído'}</ExercicioEtapa>
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
                <RotuloDestaque>{exercicio.nome}</RotuloDestaque>
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
      <DialogoAcao
        aberto={confirmarFim}
        titulo="Finalizar treino"
        mensagem={`Ficam ${pendentes} séries pendentes. A sessão será concluída com esse resultado, sem marcar o que não foi feito.`}
        icone={<FiAlertCircle />}
        tipo="confirmar"
        rotuloConfirmar="Finalizar treino"
        confirmarDesabilitado={processando}
        onConfirmar={onFinalizar}
        onCancelar={onCancelarConfirmacao}
      />
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
        {!treino.realizado && pendentes > 0 && (
          <BotaoAcao type="button" onClick={onContinuar} whileHover={HOVER_BOTAO} whileTap={TOQUE_BOTAO}>
            Continuar séries pendentes
          </BotaoAcao>
        )}
        <BotaoAcao type="button" onClick={onVoltar} whileHover={HOVER_BOTAO} whileTap={TOQUE_BOTAO}>
          Voltar à ficha
        </BotaoAcao>
      </AcoesExecucao>
    </MissaoCard>
  );
}

export default ExecucaoTreinoPage;
