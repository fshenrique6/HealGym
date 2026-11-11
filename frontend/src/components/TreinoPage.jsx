import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { FiArrowLeft, FiActivity, FiClock, FiCheck, FiZap, FiAlertCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import api from '../services/api';
import { ROTULO_ESTADO, classificarFicha, separarFichas } from '../utils/fichasTreino';
import {
  Container,
  Header,
  Logo,
  BackButton,
  MainContent,
} from './treinoEstilos';
import { TIPOS_DIVISAO } from '../utils/treinoDivisao';
import ProgramaSemanalPainel from './ProgramaSemanalPainel';
import LoadingSpinner from './LoadingSpinner';
import DialogoAcao from './DialogoAcao';

const TreinoPage = () => {
  const navigate = useNavigate();

  const [tipoDivisao, setTipoDivisao] = useState('ABC');
  const [letraTreino, setLetraTreino] = useState('A');
  const [tempoDisponivel, setTempoDisponivel] = useState('');
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [avulsaAberta, setAvulsaAberta] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    tipo: 'confirm',
    titulo: '',
    mensagem: '',
    onConfirm: null,
    onCancel: null,
  });

  const gerandoRef = useRef(false);

  useEffect(() => {
    if (tipoDivisao === 'ABC' && letraTreino === 'D') {
      setLetraTreino('A');
    }
  }, [tipoDivisao, letraTreino]);

  useEffect(() => {
    carregarHistorico();
  }, []);

  const carregarHistorico = async () => {
    setLoadingHistorico(true);
    try {
      const response = await api.getMyWorkouts();
      if (response.success) {
        const lista = Array.isArray(response.data) ? response.data : [];
        const classificados = [];
        for (const treino of lista) {
          if (treino.realizado) {
            classificados.push(classificarFicha(treino));
            continue;
          }
          try {
            const execucao = await api.getWorkoutExecution(treino._id);
            classificados.push(classificarFicha(treino, { ok: true, data: execucao?.data }));
          } catch {
            classificados.push(classificarFicha(treino, { ok: false }));
          }
        }
        setHistorico(classificados);
      }
    } catch {
    } finally {
      setLoadingHistorico(false);
    }
  };

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

  const handleGerarTreino = async () => {
    if (gerandoRef.current) return;

    if (!tempoDisponivel || tempoDisponivel < 30 || tempoDisponivel > 120) {
      mostrarAlerta('Tempo Inválido', 'Por favor, insira um tempo válido entre 30 e 120 minutos.');
      return;
    }

    if (tipoDivisao !== 'FULL_BODY' && !letraTreino) {
      mostrarAlerta('Treino', 'Escolha qual treino (A, B, C ou D) deseja gerar.');
      return;
    }

    gerandoRef.current = true;
    setLoading(true);
    try {
      const payload = {
        tempoDisponivel: parseInt(tempoDisponivel, 10),
        tipoDivisao,
      };
      if (tipoDivisao !== 'FULL_BODY') {
        payload.letraTreino = letraTreino;
      }

      const response = await api.generateWorkout(payload);
      const id = response?.data?._id;

      if (response?.success && id) {
        navigate(`/treino/${id}`);
        return;
      }

      mostrarAlerta('Erro', 'Não foi possível abrir o treino gerado.');
    } catch {
      mostrarAlerta('Erro', 'Erro ao gerar treino. Tente novamente.');
    } finally {
      gerandoRef.current = false;
      setLoading(false);
    }
  };

  const { salvas, historico: atividades } = separarFichas(historico);
  const historicoVisivel = historicoAberto ? atividades : atividades.slice(0, 3);

  return (
    <Container className="custom-scroll">
      <DialogoAcao
        aberto={modalAberto}
        titulo={modalConfig.titulo}
        mensagem={modalConfig.mensagem}
        icone={<FiAlertCircle />}
        tipo="alerta"
        rotuloConfirmar="OK"
        linhaUnica={Boolean(modalConfig.linhaUnica)}
        onConfirmar={modalConfig.onConfirm}
        onCancelar={modalConfig.onCancel || modalConfig.onConfirm}
      />

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
            onClick={() => navigate('/dashboard')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiArrowLeft />
            Início
          </BackButton>
        </motion.div>
      </Header>

      <MainContent>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ width: '100%' }}
        >
          <PageTitle>Meus treinos</PageTitle>
          <PageSubtitle>A próxima sessão, a programação e o que você já fez.</PageSubtitle>

          <ContentContainer>
            <ProgramaSemanalPainel onAtualizado={carregarHistorico} />
            <GerarTreinoSection>
              <SecaoToggle
                type="button"
                aria-expanded={avulsaAberta}
                onClick={() => setAvulsaAberta((aberta) => !aberta)}
              >
                <SectionTitle>
                  <FiZap />
                  Sessão avulsa
                </SectionTitle>
                {avulsaAberta ? <FiChevronUp /> : <FiChevronDown />}
              </SecaoToggle>
              {avulsaAberta && (
              <FormContainer
                onSubmit={(evento) => {
                  evento.preventDefault();
                  handleGerarTreino();
                }}
              >
                <TreinoDoDiaCard layout>
                  <TreinoDoDiaLabel>Plano de treino</TreinoDoDiaLabel>
                  <DivisaoTipoRow>
                    {TIPOS_DIVISAO.map((tipo) => {
                      const ativo = tipoDivisao === tipo.value;
                      return (
                        <TipoDivisaoChip
                          key={tipo.value}
                          type="button"
                          onClick={() => setTipoDivisao(tipo.value)}
                          whileTap={{ scale: 0.97 }}
                        >
                          {ativo && (
                            <PlanoDestaque
                              layoutId="plano-de-treino"
                              transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                            />
                          )}
                          <ChipRotulo>{tipo.label}</ChipRotulo>
                        </TipoDivisaoChip>
                      );
                    })}
                  </DivisaoTipoRow>
                  <AnimatePresence mode="wait" initial={false}>
                    <DivisaoDetalhe
                      key={tipoDivisao}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {TIPOS_DIVISAO.find((t) => t.value === tipoDivisao)?.detalhe}
                    </DivisaoDetalhe>
                  </AnimatePresence>
                  <AnimatePresence initial={false}>
                    {tipoDivisao !== 'FULL_BODY' && (
                      <motion.div
                        key="letras"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <LetraTreinoLabel>Qual treino você quer gerar agora?</LetraTreinoLabel>
                        <LetraTreinoRow>
                          {(tipoDivisao === 'ABC' ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D']).map(
                            (L, index) => {
                              const ativo = letraTreino === L;
                              return (
                                <LetraTreinoChip
                                  key={L}
                                  type="button"
                                  onClick={() => setLetraTreino(L)}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{
                                    duration: 0.22,
                                    delay: index * 0.045,
                                    ease: [0.22, 1, 0.36, 1],
                                  }}
                                  whileTap={{ scale: 0.96 }}
                                >
                                  {ativo && (
                                    <LetraDestaque
                                      layoutId="letra-treino"
                                      transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                                    >
                                      <ChipRotulo $destaque>Treino {L}</ChipRotulo>
                                    </LetraDestaque>
                                  )}
                                  <ChipRotulo $oculto={ativo}>Treino {L}</ChipRotulo>
                                </LetraTreinoChip>
                              );
                            },
                          )}
                        </LetraTreinoRow>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </TreinoDoDiaCard>

                <InputGroup>
                  <Label>
                    <FiClock />
                    Tempo Disponível (minutos)
                  </Label>
                  <Input
                    type="number"
                    min="30"
                    max="120"
                    value={tempoDisponivel}
                    onChange={(e) => setTempoDisponivel(e.target.value)}
                    placeholder="Entre 30 e 120 minutos"
                  />
                  <InputHint>
                    30 min = treino rápido | 45-60 min = ideal | 75-120 min = avançado
                  </InputHint>
                </InputGroup>

                <GerarButton
                  type="submit"
                  disabled={loading || !tempoDisponivel}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? 'Gerando...' : 'Gerar sessão'}
                </GerarButton>
              </FormContainer>
              )}
            </GerarTreinoSection>

            <HistoricoSection>
              <SectionTitle>
                <FiZap />
                Fichas salvas
              </SectionTitle>
              <NotaSecao>Ainda não iniciadas. Continuar navegando não exclui nenhuma ficha.</NotaSecao>
              {loadingHistorico ? (
                <LoadingContainer>
                  <LoadingSpinner />
                </LoadingContainer>
              ) : salvas.length === 0 ? (
                <EmptyState>
                  <EmptyText>Nenhuma ficha aguardando início</EmptyText>
                  <EmptySubtext>Uma sessão gerada e ainda não iniciada permanece aqui.</EmptySubtext>
                </EmptyState>
              ) : (
                <HistoricoGrid>
                  {salvas.map((treino) => (
                    <CartaoResumo key={treino._id} type="button" onClick={() => navigate(`/treino/${treino._id}`)}>
                      <HistoricoTitulo>{treino.titulo}</HistoricoTitulo>
                      <HistoricoInfo>
                        <HistoricoDetalhe>
                          <FiClock />
                          {treino.tempoDisponivel} min
                        </HistoricoDetalhe>
                        <HistoricoDetalhe>
                          <FiActivity />
                          {treino.exercicios?.length || 0} exercícios
                        </HistoricoDetalhe>
                      </HistoricoInfo>
                      <EstadoTexto>{ROTULO_ESTADO[treino.estado]}</EstadoTexto>
                    </CartaoResumo>
                  ))}
                </HistoricoGrid>
              )}
            </HistoricoSection>

            <HistoricoSection>
              <SectionTitle>
                <FiCheck />
                Histórico de atividades
              </SectionTitle>
              <NotaSecao>Sessões iniciadas ou marcadas como realizadas.</NotaSecao>

              {loadingHistorico ? (
                <LoadingContainer>
                  <LoadingSpinner />
                </LoadingContainer>
              ) : atividades.length === 0 ? (
                <EmptyState>
                  <EmptyText>Nenhuma sessão iniciada</EmptyText>
                  <EmptySubtext>Quando você iniciar ou concluir um treino, ele aparece neste resumo.</EmptySubtext>
                </EmptyState>
              ) : (
                <>
                  <HistoricoGrid>
                    {historicoVisivel.map((treino) => (
                      <CartaoResumo key={treino._id} type="button" onClick={() => navigate(`/treino/${treino._id}`)}>
                        <HistoricoTitulo>{treino.titulo}</HistoricoTitulo>
                        <HistoricoInfo>
                          <HistoricoDetalhe>
                            <FiClock />
                            {treino.tempoDisponivel} min
                          </HistoricoDetalhe>
                          <HistoricoDetalhe>
                            <FiActivity />
                            {treino.exercicios?.length || 0} exercícios
                          </HistoricoDetalhe>
                        </HistoricoInfo>
                        <EstadoTexto $feito={treino.estado === 'concluido'}>
                          {ROTULO_ESTADO[treino.estado]}
                        </EstadoTexto>
                      </CartaoResumo>
                    ))}
                  </HistoricoGrid>
                  {atividades.length > 3 && (
                    <BotaoTexto type="button" onClick={() => setHistoricoAberto((aberto) => !aberto)}>
                      {historicoAberto ? 'Mostrar só os recentes' : `Ver histórico completo (${atividades.length})`}
                    </BotaoTexto>
                  )}
                </>
              )}
            </HistoricoSection>
          </ContentContainer>
        </motion.div>
      </MainContent>
    </Container>
  );
};


const PageTitle = styled.h1`
  color: var(--white);
  font-family: 'Cinzel', serif;
  font-size: 1.55rem;
  line-height: 1.2;
  letter-spacing: 0.04em;
  font-weight: 600;
  margin-bottom: 0.35rem;
  text-align: center;
  text-transform: none;
`;

const PageSubtitle = styled.p`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 1.05rem;
  line-height: 1.3;
  letter-spacing: 0.02em;
  text-align: center;
  margin-bottom: 1.25rem;
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const GerarTreinoSection = styled.section`
  background: #1a1a1a;
  border-radius: 16px;
  padding: 1rem 1.15rem 1.15rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const SecaoToggle = styled.button`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  background: transparent;
  color: var(--white);
  text-transform: none;
  letter-spacing: 0;
  padding: 0.2rem 0;

  svg {
    color: var(--accent);
    flex-shrink: 0;
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--white);
  font-size: 1.05rem;
  line-height: 1.2;
  letter-spacing: 0.03em;
  margin: 0;
  font-weight: 600;
  text-transform: none;

  svg {
    color: var(--accent);
    font-size: 1rem;
  }
`;

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 0.9rem 0 0;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-size: 0.95rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  font-weight: 400;

  svg {
    color: var(--accent);
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 15px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(198, 169, 100, 0.2);
  border-radius: 2px;
  color: var(--white);
  font-size: 0.95rem;
  line-height: 1.25;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  font-family: 'Cormorant', serif;

  &:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 10px rgba(198, 169, 100, 0.2);
  }

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active {
    -webkit-text-fill-color: var(--white) !important;
    caret-color: var(--white);
    -webkit-box-shadow:
      0 0 0 1000px rgba(255, 255, 255, 0.05) inset,
      0 0 0 1000px color-mix(in srgb, var(--white) 3%, var(--background)) inset !important;
    box-shadow:
      0 0 0 1000px rgba(255, 255, 255, 0.05) inset,
      0 0 0 1000px color-mix(in srgb, var(--white) 3%, var(--background)) inset !important;
    transition:
      all 0.3s ease,
      background-color 99999s ease-out 0s,
      color 99999s ease-out 0s,
      box-shadow 0s;
  }

  &:-webkit-autofill:focus {
    -webkit-box-shadow:
      0 0 0 1000px rgba(255, 255, 255, 0.05) inset,
      0 0 0 1000px color-mix(in srgb, var(--white) 3%, var(--background)) inset,
      0 0 10px rgba(198, 169, 100, 0.2) !important;
    box-shadow:
      0 0 0 1000px rgba(255, 255, 255, 0.05) inset,
      0 0 0 1000px color-mix(in srgb, var(--white) 3%, var(--background)) inset,
      0 0 10px rgba(198, 169, 100, 0.2) !important;
    transition:
      all 0.3s ease,
      background-color 99999s ease-out 0s,
      color 99999s ease-out 0s;
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type='number'] {
    -moz-appearance: textfield;
  }
`;

const InputHint = styled.p`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.82rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  font-style: italic;
  cursor: default;
  user-select: none;
`;

const TreinoDoDiaCard = styled(motion.div)`
  background: rgba(198, 169, 100, 0.1);
  border: 2px solid var(--accent);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  text-align: center;
  cursor: default;
  user-select: none;
`;

const TreinoDoDiaLabel = styled.div`
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 1rem;
  cursor: default;
  user-select: none;
`;

const DivisaoTipoRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 0.75rem;
`;

const TipoDivisaoChip = styled(motion.button)`
  position: relative;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(198, 169, 100, 0.35);
  color: var(--white);
  padding: 0.55rem 0.85rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;

  &:hover {
    border-color: var(--accent);
  }
`;

const PlanoDestaque = styled(motion.span)`
  position: absolute;
  inset: -1px;
  border-radius: 10px;
  background: rgba(198, 169, 100, 0.35);
  border: 1px solid var(--accent);
  z-index: 0;
  pointer-events: none;
`;

const ChipRotulo = styled.span`
  position: relative;
  z-index: 1;
  color: ${(p) => (p.$destaque ? 'var(--background, #0a0a0a)' : 'inherit')};
  opacity: ${(p) => (p.$oculto ? 0 : 1)};
`;

const DivisaoDetalhe = styled(motion.p)`
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.88rem;
  line-height: 1.5;
  white-space: pre-line;
  width: fit-content;
  max-width: 100%;
  text-align: left;
  margin: 0 auto 1.25rem;
`;

const LetraTreinoLabel = styled.div`
  color: var(--accent);
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 0.65rem;
`;

const LetraTreinoRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  justify-content: center;
`;

const LetraTreinoChip = styled(motion.button)`
  position: relative;
  background: rgba(255, 255, 255, 0.06);
  color: var(--white);
  border: 1px solid rgba(198, 169, 100, 0.35);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
`;

const LetraDestaque = styled(motion.span)`
  position: absolute;
  inset: -1px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent) 0%, #d4a574 100%);
  border: 1px solid var(--accent);
  z-index: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const GerarButton = styled(motion.button)`
  background: var(--accent);
  color: #1a1a1a;
  border: 1px solid var(--accent);
  padding: 0.7rem 1rem;
  border-radius: 8px;
  font-size: 0.92rem;
  letter-spacing: 0.04em;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.5rem;
  font-family: 'Cinzel', serif;
  text-transform: none;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const HistoricoSection = styled.section`
  background: #1a1a1a;
  border-radius: 16px;
  padding: 1.1rem 1.15rem 1.15rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const NotaSecao = styled.p`
  margin: 0.35rem 0 0.9rem;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.35;
`;

const CartaoResumo = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 0.85rem;
  color: inherit;
  text-transform: none;
  letter-spacing: 0;
  cursor: pointer;

  &:hover {
    border-color: rgba(198, 169, 100, 0.45);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const EstadoTexto = styled.span`
  margin-top: 0.45rem;
  color: ${(props) => (props.$feito ? '#7dcec6' : 'var(--text-secondary)')};
  font-size: 0.82rem;
`;

const BotaoTexto = styled.button`
  margin-top: 0.75rem;
  background: transparent;
  color: var(--accent);
  font-family: 'Cinzel', serif;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  text-transform: none;
  padding: 0.35rem 0;

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 3rem;
`;

const EmptyState = styled.div`
  text-align: left;
  padding: 0.35rem 0 0.2rem;
  color: var(--text-secondary);
`;

const EmptyText = styled.p`
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--white, #f5f5f5);
`;

const EmptySubtext = styled.p`
  font-size: 1rem;
  color: var(--text-secondary, rgba(255, 255, 255, 0.55));
`;

const HistoricoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
`;

const HistoricoTitulo = styled.h4`
  color: var(--white, #f5f5f5);
  font-size: 1.05rem;
  margin-bottom: 0.45rem;
  margin-right: 0;
  font-weight: 600;
  line-height: 1.3;
  text-transform: none;
`;

const HistoricoInfo = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
`;

const HistoricoDetalhe = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary, rgba(255, 255, 255, 0.7));
  font-size: 0.9rem;

  svg {
    color: var(--accent);
    flex-shrink: 0;
  }
`;

export default TreinoPage;
