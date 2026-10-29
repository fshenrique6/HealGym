import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  FiArrowLeft,
  FiActivity,
  FiClock,
  FiTrash2,
  FiCheck,
  FiPlay,
  FiCheckCircle,
  FiRepeat,
  FiChevronDown,
  FiChevronUp,
  FiLayers,
  FiTarget,
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
  porcaoLegivel,
  registrosDaExecucao,
  resumoSessao,
  rotuloCarga,
  rotuloDivisao,
  rotuloEquipamento,
  seriesDoRegistro,
  uidDoExercicio,
} from '../utils/treinoExecucao';
import {
  Container,
  Header,
  Logo,
  BackButton,
  MainContent,
  TreinoDisplay,
  TreinoHeader,
  TreinoTitulo,
  MetaTag,
  TreinoObjetivo,
  ActionButtons,
  ActionButton,
  RealizadoBadge,
  ExerciciosList,
  ExercicioCard,
  ExercicioNumero,
  ExercicioInfo,
  ExercicioDemo,
  DemoVideo,
  DemoIndisponivel,
  ExercicioNome,
  PorcaoMuscular,
  Tecnica,
  Equipamentos,
  ResumoSection,
  ResumoTitulo,
  ResumoTexto,
  TimerSection,
  IniciarTreinoButton,
  ExercicioHeader,
  SeriesProgress,
  SeriesProgressInfo,
  SeriesProgressLabel,
  SeriesProgressPercentual,
  SeriesProgressBar,
  SeriesProgressFill,
  ModalOverlay,
  ModalContainer,
  ModalHeader,
  ModalTitulo,
  ModalBody,
  ModalMensagem,
  ModalFooter,
  ModalButton,
} from './treinoEstilos';
import {
  FichaMeta,
  Observacoes,
  BlocoTitulo,
  PrescricaoLinha,
  HistoricoLinha,
  SugestaoTexto,
  ComparacaoLinha,
  FichaBotoes,
  BotaoDiscreto,
  TecnicaPainel,
  SalvamentoStatus,
  AlternativasLista,
  AlternativaItem,
} from './treinoFichaEstilos';

const ID_TREINO = /^[a-fA-F0-9]{24}$/;
const ID_EXERCICIO = /^[a-z0-9-]{1,90}$/;

const TEXTO_SALVAMENTO = {
  salvando: 'Salvando registros…',
  salvo: 'Registros salvos.',
  erro: 'Não foi possível salvar agora. Seus dados continuam na tela; tente novamente.',
  invalido: 'Corrija os campos destacados para salvar (use números, como 22,5).',
};

const TreinoGeradoPage = () => {
  const navigate = useNavigate();
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
  const [troca, setTroca] = useState(null);
  const [sessaoAndamento, setSessaoAndamento] = useState(false);
  const [indoExecucao, setIndoExecucao] = useState(false);

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
    setTroca(null);
    setSessaoAndamento(false);
    setIndoExecucao(false);
    setCarregando(true);

    if (!ID_TREINO.test(id || '')) {
      setErro('Treino não encontrado.');
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
  }, [id, carregarProgresso]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (modalAberto) {
        if (modalConfig.tipo === 'alert') {
          modalConfig.onConfirm();
        } else {
          modalConfig.onCancel();
        }
      } else if (troca && !troca.enviando) {
        setTroca(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalAberto, modalConfig, troca]);

  const mostrarConfirm = useCallback((titulo, mensagem, onConfirm) => {
    setModalConfig({
      tipo: 'confirm',
      titulo,
      mensagem,
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

  const podeSalvar = Boolean(treino && !treino.realizado && execucaoPronta && !erroExecucao);

  const salvarAgora = useCallback(() => {
    const atual = treinoRef.current;
    if (!atual || atual.realizado) return Promise.resolve(true);
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

  const iniciarTreino = useCallback(async () => {
    if (!treino || indoExecucao) return;
    setIndoExecucao(true);
    try {
      await api.controlWorkoutExecution(treino._id, { acao: 'iniciar' });
      navigate(`/treino/${treino._id}/executar`);
    } catch {
      setIndoExecucao(false);
      mostrarAlerta('Erro', 'Não foi possível iniciar o treino. Tente novamente.');
    }
  }, [treino, indoExecucao, navigate, mostrarAlerta]);

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
      } catch {
        mostrarAlerta('Erro', 'Erro ao marcar treino como realizado. Tente novamente.');
      }
    };

    if (totalConcluidas === 0) {
      mostrarConfirm(
        'Marcar como Realizado',
        'Nenhuma série foi marcada como concluída. Deseja marcar o treino como realizado mesmo assim?',
        async () => {
          setModalAberto(false);
          await concluir();
        },
      );
      return;
    }
    await concluir();
  };

  const handleDeletarTreino = async () => {
    mostrarConfirm(
      'Deletar Treino',
      'Deseja realmente deletar este treino? Esta ação não pode ser desfeita.',
      async () => {
        try {
          const response = await api.deleteWorkout(treino._id);
          if (response.success) {
            setModalConfig({
              tipo: 'alert',
              titulo: 'Sucesso',
              mensagem: 'Treino deletado com sucesso!',
              onConfirm: () => navigate('/treino'),
              onCancel: null,
            });
            setModalAberto(true);
          }
        } catch {
          setModalAberto(false);
          mostrarAlerta('Erro', 'Erro ao deletar treino. Tente novamente.');
        }
      },
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

  const treinoCorresponde = treino && String(treino._id) === id;

  if (carregando || (!erro && !treinoCorresponde)) {
    return <LoadingSpinner />;
  }

  const totalSeries = treino
    ? treino.exercicios.reduce((soma, e) => soma + (Number(e.series) || 0), 0)
    : 0;
  const divisao = treino ? rotuloDivisao(treino) : null;
  const rotuloSessao = treino
    ? treino.letraTreino
      ? `Treino ${treino.letraTreino}`
      : treino.variante
        ? `Sessão ${treino.variante}`
        : null
    : null;
  const editavel = podeSalvar;

  return (
    <Container className="custom-scroll">
      <AnimatePresence>
        {modalAberto && (
          <ModalOverlay
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() =>
              modalConfig.tipo === 'alert' ? modalConfig.onConfirm() : modalConfig.onCancel()
            }
          >
            <ModalContainer
              as={motion.div}
              initial={{ opacity: 0, scale: 0.8, y: -50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -50 }}
              transition={{ type: 'spring', duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitulo>{modalConfig.titulo}</ModalTitulo>
              </ModalHeader>
              <ModalBody>
                <ModalMensagem>{modalConfig.mensagem}</ModalMensagem>
              </ModalBody>
              <ModalFooter>
                {modalConfig.tipo === 'confirm' ? (
                  <>
                    <ModalButton
                      color="#6c757d"
                      onClick={modalConfig.onCancel}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Cancelar
                    </ModalButton>
                    <ModalButton
                      color="var(--accent)"
                      onClick={modalConfig.onConfirm}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Confirmar
                    </ModalButton>
                  </>
                ) : (
                  <ModalButton
                    color="var(--accent)"
                    onClick={modalConfig.onConfirm}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ width: '100%' }}
                  >
                    OK
                  </ModalButton>
                )}
              </ModalFooter>
            </ModalContainer>
          </ModalOverlay>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {troca && !modalAberto && (
          <ModalOverlay
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !troca.enviando && setTroca(null)}
          >
            <ModalContainer
              as={motion.div}
              initial={{ opacity: 0, scale: 0.8, y: -50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -50 }}
              transition={{ type: 'spring', duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitulo>Trocar Exercício</ModalTitulo>
              </ModalHeader>
              <ModalBody>
                {troca.confirmar ? (
                  <ModalMensagem>
                    {troca.nome} já tem séries concluídas. Ao trocar por {troca.confirmar.nome}, os
                    registros feitos continuam no histórico, e as séries do novo exercício começam
                    em branco.
                  </ModalMensagem>
                ) : troca.carregando ? (
                  <ModalMensagem>Buscando alternativas equivalentes…</ModalMensagem>
                ) : troca.erro ? (
                  <ModalMensagem>{troca.erro}</ModalMensagem>
                ) : troca.opcoes.length === 0 ? (
                  <ModalMensagem>
                    Não há alternativa equivalente para {troca.nome} que caiba na duração escolhida.
                  </ModalMensagem>
                ) : (
                  <AlternativasLista>
                    <ModalMensagem>Alternativas equivalentes para {troca.nome}:</ModalMensagem>
                    {troca.opcoes.map((opcao) => (
                      <AlternativaItem
                        key={opcao.exercicioId}
                        type="button"
                        disabled={troca.enviando}
                        onClick={() => executarTroca(opcao, false)}
                      >
                        {opcao.nome}
                        <span>
                          {opcao.padraoRotulo} · {opcao.equipamentoRotulo} · {opcao.series} séries ·
                          sessão estimada em {opcao.duracaoEstimadaMinutos} min
                        </span>
                      </AlternativaItem>
                    ))}
                  </AlternativasLista>
                )}
              </ModalBody>
              <ModalFooter>
                <ModalButton
                  color="#6c757d"
                  onClick={() =>
                    troca.confirmar ? setTroca({ ...troca, confirmar: null }) : setTroca(null)
                  }
                  disabled={troca.enviando}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {troca.confirmar ? 'Voltar' : 'Cancelar'}
                </ModalButton>
                {troca.confirmar && (
                  <ModalButton
                    color="var(--accent)"
                    onClick={() => executarTroca(troca.confirmar, true)}
                    disabled={troca.enviando}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {troca.enviando ? 'Trocando…' : 'Confirmar troca'}
                  </ModalButton>
                )}
              </ModalFooter>
            </ModalContainer>
          </ModalOverlay>
        )}
      </AnimatePresence>

      <Header>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Logo>HealGym</Logo>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <BackButton
            onClick={() => navigate('/treino')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiArrowLeft />
            Treinos
          </BackButton>
        </motion.div>
      </Header>

      <MainContent>
        {erro || !treino ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <TreinoDisplay>
              <TreinoHeader>
                <TreinoTitulo>Treino indisponível</TreinoTitulo>
                <TreinoObjetivo>{erro || 'Não foi possível carregar este treino.'}</TreinoObjetivo>
              </TreinoHeader>
            </TreinoDisplay>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ width: '100%' }}
          >
            <TreinoDisplay>
              <TreinoHeader>
                <TreinoTitulo>{treino.titulo}</TreinoTitulo>
                <FichaMeta>
                  {(divisao || rotuloSessao) && (
                    <MetaTag>
                      <FiLayers />
                      {[divisao, rotuloSessao].filter(Boolean).join(' · ')}
                    </MetaTag>
                  )}
                  <MetaTag>
                    <FiTarget />
                    {treino.tempoDisponivel} min selecionados
                  </MetaTag>
                  {treino.duracaoEstimadaMinutos && (
                    <MetaTag>
                      <FiClock />
                      {treino.duracaoEstimadaMinutos} min estimados
                    </MetaTag>
                  )}
                  {treino.realizado && Number(treino.duracaoRealSegundos) > 0 && (
                    <MetaTag>
                      <FiClock />
                      {Math.max(1, Math.round(Number(treino.duracaoRealSegundos) / 60))} min reais
                    </MetaTag>
                  )}
                  <MetaTag>
                    <FiActivity />
                    {treino.exercicios.length} exercícios · {totalSeries} séries
                  </MetaTag>
                </FichaMeta>
                <TreinoObjetivo>{treino.objetivo}</TreinoObjetivo>
                {Array.isArray(treino.observacoes) && treino.observacoes.length > 0 && (
                  <Observacoes>
                    {treino.observacoes.map((texto) => (
                      <li key={texto}>{texto}</li>
                    ))}
                  </Observacoes>
                )}

                {!treino.realizado && (
                  <TimerSection>
                    <IniciarTreinoButton
                      onClick={iniciarTreino}
                      disabled={indoExecucao}
                      whileHover={indoExecucao ? {} : { scale: 1.02 }}
                      whileTap={indoExecucao ? {} : { scale: 0.98 }}
                    >
                      <FiPlay />
                      {indoExecucao ? 'Abrindo…' : sessaoAndamento ? 'Retomar Treino' : 'Iniciar Treino'}
                    </IniciarTreinoButton>
                  </TimerSection>
                )}

                <ActionButtons>
                  {!treino.realizado && (
                    <ActionButton color="#4ecdc4" onClick={handleMarcarRealizado}>
                      <FiCheck />
                      Marcar como Realizado
                    </ActionButton>
                  )}
                  <ActionButton color="#ff6b6b" onClick={handleDeletarTreino}>
                    <FiTrash2 />
                    Deletar
                  </ActionButton>
                </ActionButtons>

                {!treino.realizado && (erroExecucao || salvamento) && (
                  <SalvamentoStatus erro={erroExecucao || salvamento === 'erro' || salvamento === 'invalido'}>
                    {erroExecucao
                      ? 'Não foi possível carregar os registros de séries. Recarregue a página para registrar cargas.'
                      : TEXTO_SALVAMENTO[salvamento]}
                  </SalvamentoStatus>
                )}

                {treino.realizado && (
                  <RealizadoBadge>
                    <FiCheck />
                    Treino Realizado em{' '}
                    {new Date(treino.dataRealizacao).toLocaleDateString('pt-BR')}
                  </RealizadoBadge>
                )}
              </TreinoHeader>

              <ExerciciosList>
                {agruparEmBlocos(treino.exercicios).map((bloco, blocoIndex) => (
                  <ExerciciosBloco
                    key={`${bloco.nome}-${blocoIndex}`}
                    bloco={bloco}
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
                      const carga = rotuloCarga(exercicio);

                      return (
                        <ExercicioCard key={uid} completo={serieCompleta}>
                          <ExercicioNumero completo={serieCompleta}>
                            {serieCompleta ? <FiCheckCircle /> : index + 1}
                          </ExercicioNumero>
                          <ExercicioInfo>
                            <ExercicioHeader>
                              <div>
                                <ExercicioNome>{exercicio.nome}</ExercicioNome>
                                <PorcaoMuscular>{porcaoLegivel(exercicio)}</PorcaoMuscular>
                              </div>
                            </ExercicioHeader>

                            <ExercicioDemo>
                              {exercicio.videoUrl ? (
                                <DemoVideo
                                  controls
                                  preload="none"
                                  playsInline
                                  poster={exercicio.videoThumbnailUrl || undefined}
                                  src={exercicio.videoUrl}
                                  aria-label={`Demonstração de ${exercicio.nome}`}
                                />
                              ) : (
                                <DemoIndisponivel>
                                  <FiPlay aria-hidden="true" />
                                  <span>Demonstração indisponível</span>
                                </DemoIndisponivel>
                              )}
                            </ExercicioDemo>

                            <PrescricaoLinha>
                              <span>
                                <strong>Séries:</strong> {exercicio.series}
                              </span>
                              <span>
                                <strong>Repetições:</strong> {exercicio.repeticoes}
                              </span>
                              <span>
                                <strong>Descanso:</strong> {exercicio.descanso}
                              </span>
                              {exercicio.rirAlvo && (
                                <span title="Repetições que ainda caberiam ao final da série">
                                  <strong>RIR alvo:</strong> {exercicio.rirAlvo}
                                </span>
                              )}
                              {Number(exercicio.seriesAproximacao) > 0 && (
                                <span>
                                  <strong>Aproximação:</strong> {exercicio.seriesAproximacao}{' '}
                                  {Number(exercicio.seriesAproximacao) === 1 ? 'série leve' : 'séries leves'}
                                </span>
                              )}
                            </PrescricaoLinha>

                            {carga && <HistoricoLinha>{carga}</HistoricoLinha>}

                            {anterior && (
                              <HistoricoLinha>
                                <strong>Última vez{anterior.data ? ` (${formatarData(anterior.data)})` : ''}:</strong>
                                {descreverSeries(anterior.series)}
                              </HistoricoLinha>
                            )}
                            {historico && (historico.melhorCarga != null || historico.maisRepeticoes != null) && (
                              <HistoricoLinha>
                                {historico.melhorCarga != null && (
                                  <>
                                    <strong>Melhor carga:</strong>
                                    {formatarCarga(historico.melhorCarga)} kg
                                    {historico.repeticoesNaMelhorCarga != null
                                      ? ` × ${historico.repeticoesNaMelhorCarga}`
                                      : ''}
                                    {'   '}
                                  </>
                                )}
                                {historico.maisRepeticoes != null && (
                                  <>
                                    <strong>Mais repetições:</strong>
                                    {historico.maisRepeticoes}
                                    {historico.cargaNasMaisRepeticoes != null
                                      ? ` (${formatarCarga(historico.cargaNasMaisRepeticoes)} kg)`
                                      : ''}
                                  </>
                                )}
                              </HistoricoLinha>
                            )}
                            {historico?.sugestao && editavel && (
                              <SugestaoTexto>{historico.sugestao}</SugestaoTexto>
                            )}

                            {treino.realizado && registrosFeitos.length > 0 &&
                              registrosFeitos.map((linha) => (
                                <HistoricoLinha key={linha.numero}>
                                  <strong>Série {linha.numero}:</strong>
                                  {linha.carga ? `${linha.carga} kg` : 'sem carga'}
                                  {linha.repeticoes ? ` × ${linha.repeticoes}` : ''}
                                  {linha.rir != null && linha.rir !== '' ? ` · RIR ${linha.rir}` : ''}
                                </HistoricoLinha>
                              ))}

                            {treino.realizado && hoje && antes && (
                              <ComparacaoLinha>
                                Hoje: {hoje.series} {hoje.series === 1 ? 'série' : 'séries'}
                                {hoje.maiorCarga != null ? ` · maior carga ${formatarCarga(hoje.maiorCarga)} kg` : ''}
                                {hoje.totalRepeticoes != null ? ` · ${hoje.totalRepeticoes} repetições` : ''}
                                {'  |  '}Anterior: {antes.series} {antes.series === 1 ? 'série' : 'séries'}
                                {antes.maiorCarga != null ? ` · maior carga ${formatarCarga(antes.maiorCarga)} kg` : ''}
                                {antes.totalRepeticoes != null ? ` · ${antes.totalRepeticoes} repetições` : ''}
                              </ComparacaoLinha>
                            )}

                            {treino.realizado && concluidas > 0 && (
                              <SeriesProgress>
                                <SeriesProgressInfo>
                                  <SeriesProgressLabel>
                                    Séries: {concluidas} / {total}
                                  </SeriesProgressLabel>
                                  <SeriesProgressPercentual>
                                    {Math.min(100, Math.round((concluidas / total) * 100))}%
                                  </SeriesProgressPercentual>
                                </SeriesProgressInfo>
                                <SeriesProgressBar>
                                  <SeriesProgressFill
                                    progresso={Math.min(100, (concluidas / total) * 100)}
                                    as={motion.div}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (concluidas / total) * 100)}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                  />
                                </SeriesProgressBar>
                              </SeriesProgress>
                            )}

                            <FichaBotoes>
                              <BotaoDiscreto
                                type="button"
                                aria-expanded={aberta}
                                onClick={() =>
                                  setTecnicaAberta((atual) => ({ ...atual, [uid]: !atual[uid] }))
                                }
                              >
                                {aberta ? <FiChevronUp /> : <FiChevronDown />}
                                Técnica e cuidados
                              </BotaoDiscreto>
                              {editavel && (
                                <BotaoDiscreto type="button" onClick={() => abrirTroca(exercicio, index)}>
                                  <FiRepeat />
                                  Trocar exercício
                                </BotaoDiscreto>
                              )}
                            </FichaBotoes>

                            <AnimatePresence initial={false}>
                              {aberta && (
                                <TecnicaPainel
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                >
                                  <Tecnica>
                                    <strong>Técnica:</strong> {exercicio.tecnica}
                                  </Tecnica>
                                  {exercicio.musculoPrincipal && (
                                    <Tecnica>
                                      <strong>Principal:</strong> {exercicio.musculoPrincipal}
                                      {exercicio.enfase ? ` · ${exercicio.enfase}` : ''}
                                    </Tecnica>
                                  )}
                                  {exercicio.musculosSecundarios && (
                                    <Tecnica>
                                      <strong>Também:</strong> {exercicio.musculosSecundarios}
                                    </Tecnica>
                                  )}
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
                                  <Equipamentos>
                                    <strong>Equipamento:</strong> {rotuloEquipamento(exercicio)}
                                  </Equipamentos>
                                </TecnicaPainel>
                              )}
                            </AnimatePresence>
                          </ExercicioInfo>
                        </ExercicioCard>
                      );
                    }}
                  />
                ))}
              </ExerciciosList>

              {treino.cobertura ? (
                <CoberturaTreino treino={treino} />
              ) : (
                <ResumoSection>
                  <ResumoTitulo>Resumo de Cobertura Muscular</ResumoTitulo>
                  <ResumoTexto>{treino.resumo}</ResumoTexto>
                </ResumoSection>
              )}
            </TreinoDisplay>
          </motion.div>
        )}
      </MainContent>
    </Container>
  );
};

const ExerciciosBloco = ({ bloco, renderizar }) => (
  <>
    <BlocoTitulo>{bloco.nome}</BlocoTitulo>
    {bloco.itens.map((item) => renderizar(item))}
  </>
);

export default TreinoGeradoPage;
