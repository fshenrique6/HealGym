import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { FiArrowLeft, FiActivity, FiClock, FiTrash2, FiCheck, FiZap } from 'react-icons/fi';
import api from '../services/api';
import {
  Container,
  Header,
  Logo,
  BackButton,
  MainContent,
  ModalOverlay,
  ModalContainer,
  ModalHeader,
  ModalTitulo,
  ModalBody,
  ModalMensagem,
  ModalFooter,
  ModalButton,
} from './treinoEstilos';
import { TIPOS_DIVISAO } from '../utils/treinoDivisao';
import LoadingSpinner from './LoadingSpinner';

const TreinoPage = () => {
  const navigate = useNavigate();

  const [tipoDivisao, setTipoDivisao] = useState('ABC');
  const [letraTreino, setLetraTreino] = useState('A');
  const [tempoDisponivel, setTempoDisponivel] = useState('');
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modalAberto) {
        if (modalConfig.tipo === 'alert') {
          modalConfig.onConfirm();
        } else {
          modalConfig.onCancel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalAberto, modalConfig]);

  const carregarHistorico = async () => {
    setLoadingHistorico(true);
    try {
      const response = await api.getMyWorkouts();
      if (response.success) {
        setHistorico(response.data);
      }
    } catch {
    } finally {
      setLoadingHistorico(false);
    }
  };

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

  const handleLimparHistorico = async () => {
    mostrarConfirm(
      'Limpar Histórico',
      'Deseja realmente limpar todo o histórico de treinos? Todos os treinos serão permanentemente deletados.',
      async () => {
        try {
          const response = await api.clearWorkoutHistory();
          if (response.success) {
            setHistorico([]);
            setModalAberto(false);
            mostrarAlerta('Sucesso', 'Histórico limpo com sucesso!');
          }
        } catch {
          setModalAberto(false);
          mostrarAlerta('Erro', 'Erro ao limpar histórico. Tente novamente.');
        }
      },
    );
  };

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
          <PageTitle>Sistema de Treinos</PageTitle>
          <PageSubtitle>
            Escolha a divisão (ABC, ABCD ou FULL BODY), o treino do dia quando aplicável e o tempo
            disponível.
          </PageSubtitle>

          <ContentContainer>
            <GerarTreinoSection
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <SectionTitle>
                <FiZap />
                Gerar Novo Treino
              </SectionTitle>

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
                  {loading ? 'Gerando...' : 'Gerar Treino Perfeito'}
                </GerarButton>
              </FormContainer>
            </GerarTreinoSection>

            <HistoricoSection
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <HistoricoHeader>
                <SectionTitle>
                  <FiActivity />
                  Histórico de Treinos
                </SectionTitle>
                {historico.length > 0 && (
                  <LimparButton onClick={handleLimparHistorico}>
                    <FiTrash2 />
                    Limpar Histórico
                  </LimparButton>
                )}
              </HistoricoHeader>

              {loadingHistorico ? (
                <LoadingContainer>
                  <LoadingSpinner />
                </LoadingContainer>
              ) : historico.length === 0 ? (
                <EmptyState>
                  <FiActivity size={48} />
                  <EmptyText>Nenhum treino gerado ainda</EmptyText>
                  <EmptySubtext>Gere seu primeiro treino acima!</EmptySubtext>
                </EmptyState>
              ) : (
                <HistoricoGrid>
                  {historico.map((treino) => (
                    <HistoricoCard
                      key={treino._id}
                      onClick={() => navigate(`/treino/${treino._id}`)}
                      realizado={treino.realizado}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {treino.realizado && (
                        <RealizadoIcon>
                          <FiCheck />
                        </RealizadoIcon>
                      )}
                      <HistoricoTitulo>{treino.titulo}</HistoricoTitulo>
                      <HistoricoInfo>
                        <HistoricoDetalhe>
                          <FiClock />
                          {treino.tempoDisponivel} min
                        </HistoricoDetalhe>
                        <HistoricoDetalhe>
                          <FiActivity />
                          {treino.exercicios.length} exercícios
                        </HistoricoDetalhe>
                      </HistoricoInfo>
                      <HistoricoData>
                        {new Date(treino.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </HistoricoData>
                    </HistoricoCard>
                  ))}
                </HistoricoGrid>
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
  font-size: 2rem;
  line-height: 1.15;
  letter-spacing: 0.14em;
  padding-left: 0.14em;
  font-weight: 600;
  margin-bottom: 8px;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
  cursor: default;
  user-select: none;
`;

const PageSubtitle = styled.p`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 1rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  text-align: center;
  margin-bottom: 20px;
  cursor: default;
  user-select: none;
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const GerarTreinoSection = styled.div`
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  border: 1px solid rgba(198, 169, 100, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--white);
  font-size: 1.5rem;
  line-height: 1.15;
  letter-spacing: 0.08em;
  margin-bottom: 20px;
  font-weight: 600;
  cursor: default;
  user-select: none;

  svg {
    color: var(--accent);
  }
`;

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin: 0;
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
  background: var(--gold-gradient);
  color: var(--background);
  border: none;
  padding: 20px;
  border-radius: 5px;
  font-size: 0.9rem;
  line-height: 0.8;
  letter-spacing: 0.14em;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 8px;
  font-family: 'Poppins', sans-serif;

  &:hover:not(:disabled) {
    box-shadow: 0 5px 15px rgba(198, 169, 100, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const HistoricoSection = styled.div`
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  border: 1px solid rgba(198, 169, 100, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const HistoricoHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const LimparButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #ff5252;
    transform: translateY(-2px);
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 3rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary, rgba(255, 255, 255, 0.65));

  svg {
    margin-bottom: 1rem;
    opacity: 0.5;
    color: var(--accent);
  }
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const HistoricoCard = styled(motion.div)`
  background: ${(props) =>
    props.realizado ? 'rgba(78, 205, 196, 0.12)' : 'rgba(255, 255, 255, 0.04)'};
  border: 1px solid
    ${(props) => (props.realizado ? 'rgba(78, 205, 196, 0.45)' : 'rgba(198, 169, 100, 0.25)')};
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    border-color: var(--accent);
    background: rgba(198, 169, 100, 0.1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    transform: translateY(-2px);
  }
`;

const RealizadoIcon = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #4ecdc4;
  color: white;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
`;

const HistoricoTitulo = styled.h4`
  color: var(--white, #f5f5f5);
  font-size: 1.2rem;
  margin-bottom: 1rem;
  margin-right: 2.5rem;
  font-weight: 700;
  line-height: 1.35;
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

const HistoricoData = styled.div`
  color: var(--text-secondary, rgba(255, 255, 255, 0.55));
  font-size: 0.85rem;
  font-style: italic;
`;


export default TreinoPage;
