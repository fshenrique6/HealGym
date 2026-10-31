import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  FiLogOut,
  FiUser,
  FiActivity,
  FiHeart,
  FiTarget,
  FiCheck,
  FiX,
  FiClock,
  FiEdit2,
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { validatePhysicalProfileField } from '../utils/profileValidation';
import { BODY_TYPE_OPTIONS, GENDER_OPTIONS } from '../utils/profileOptions';
import {
  calculateAge,
  calculateBasalMetabolicRate,
  calculateBodyMassIndex,
} from '../utils/healthCalculations';
import { cronogramaSemanal } from '../utils/cronogramaSemanal';
import { formatarData } from '../utils/medidasCorporais';
import IndicadorAjuda from './IndicadorAjuda';
import CalendarioTreinos from './CalendarioTreinos';
import MedidasCorporais from './MedidasCorporais';
import { LuRuler } from 'react-icons/lu';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [editingField, setEditingField] = useState(null);
  const [treinosRealizados, setTreinosRealizados] = useState([]);
  const [modalHistorico, setModalHistorico] = useState(false);
  const [treinosDoDia, setTreinosDoDia] = useState([]);
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [calendarioAberto, setCalendarioAberto] = useState(false);
  const [medidasAberto, setMedidasAberto] = useState(false);
  const [resumoMedidas, setResumoMedidas] = useState(null);
  const botaoCalendarioRef = useRef(null);
  const botaoMedidasRef = useRef(null);

  const getIMCClassification = (imc) => {
    if (!imc) return null;
    const imcValue = parseFloat(imc);
    if (imcValue < 18.5) return { text: 'Abaixo do peso', color: '#3b82f6' };
    if (imcValue < 25) return { text: 'Peso normal', color: '#10b981' };
    if (imcValue < 30) return { text: 'Sobrepeso', color: '#f59e0b' };
    if (imcValue < 35) return { text: 'Obesidade grau I', color: '#ef4444' };
    if (imcValue < 40) return { text: 'Obesidade grau II', color: '#dc2626' };
    return { text: 'Obesidade grau III', color: '#991b1b' };
  };

  const calculateIdealWeight = (height, gender) => {
    if (!height || !gender) return null;
    const baseWeight = height - 100;
    return gender === 'masculino' ? Math.round(baseWeight * 0.9) : Math.round(baseWeight * 0.85);
  };

  useEffect(() => {
    carregarTreinosRealizados();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modalHistorico) {
        setModalHistorico(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalHistorico]);

  const carregarTreinosRealizados = async () => {
    try {
      const response = await api.getMyWorkouts();
      if (response.success) {
        const realizados = response.data.filter((treino) => treino.realizado);
        setTreinosRealizados(realizados);
      }
    } catch {}
  };

  const isTreinoRealizado = (dayOfWeek) => {
    const today = new Date();
    const currentWeekStart = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    const targetDate = new Date(currentWeekStart);
    targetDate.setDate(currentWeekStart.getDate() + (dayOfWeek - 1));

    return treinosRealizados.some((treino) => {
      const treinoDate = new Date(treino.dataRealizacao || treino.createdAt);
      return treinoDate.toDateString() === targetDate.toDateString();
    });
  };

  const handleDiaClick = (dayOfWeek, diaNome) => {
    const today = new Date();
    const currentWeekStart = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    const targetDate = new Date(currentWeekStart);
    targetDate.setDate(currentWeekStart.getDate() + (dayOfWeek - 1));

    const treinosDesseDia = treinosRealizados.filter((treino) => {
      const treinoDate = new Date(treino.dataRealizacao || treino.createdAt);
      return treinoDate.toDateString() === targetDate.toDateString();
    });

    if (treinosDesseDia.length > 0) {
      setTreinosDoDia(treinosDesseDia);
      setDiaSelecionado(diaNome);
      setModalHistorico(true);
    }
  };

  const getDiaAtual = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    return dayOfWeek === 0 ? 7 : dayOfWeek;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleProfileEdit = () => {
    navigate('/edit-profile');
  };

  const handleTreinoClick = () => {
    const diaAtual = getDiaAtual();

    if (diaAtual === 7) {
      alert('Domingo é dia de descanso! Volte amanhã para treinar.');
      return;
    }

    navigate('/treino');
  };

  const handleDietaClick = () => {
    navigate('/dieta');
  };
  const age = calculateAge(user?.profile?.dateOfBirth);
  const basalMetabolicRate = calculateBasalMetabolicRate(
    user?.profile?.weight,
    user?.profile?.height,
    age,
    user?.profile?.gender,
  );
  const bodyMassIndex = calculateBodyMassIndex(user?.profile?.weight, user?.profile?.height);
  const tmb = basalMetabolicRate === null ? null : Math.round(basalMetabolicRate);
  const imc = bodyMassIndex === null ? null : bodyMassIndex.toFixed(1);
  const imcClass = getIMCClassification(imc);
  const idealWeight = calculateIdealWeight(user?.profile?.height, user?.profile?.gender);

  return (
    <>
      <AnimatePresence>
        {modalHistorico && (
          <ModalOverlay
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalHistorico(false)}
          >
            <ModalContainer
              as={motion.div}
              initial={{ opacity: 0, scale: 0.9, y: -50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -50 }}
              transition={{ type: 'spring', duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitulo>Treinos de {diaSelecionado}</ModalTitulo>
                <CloseButton onClick={() => setModalHistorico(false)}>
                  <FiX />
                </CloseButton>
              </ModalHeader>
              <ModalBody>
                {treinosDoDia.map((treino, index) => (
                  <TreinoCard key={treino._id || index}>
                    <TreinoCardHeader>
                      <TreinoCardTitulo>{treino.titulo}</TreinoCardTitulo>
                      <TreinoCardData>
                        {new Date(treino.dataRealizacao).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TreinoCardData>
                    </TreinoCardHeader>
                    <TreinoCardInfo>
                      <TreinoCardDetalhe>
                        <FiClock />
                        {treino.tempoDisponivel} min
                      </TreinoCardDetalhe>
                      <TreinoCardDetalhe>
                        <FiActivity />
                        {treino.exercicios.length} exercícios
                      </TreinoCardDetalhe>
                    </TreinoCardInfo>
                    <TreinoCardObjetivo>{treino.objetivo}</TreinoCardObjetivo>
                  </TreinoCard>
                ))}
              </ModalBody>
            </ModalContainer>
          </ModalOverlay>
        )}
      </AnimatePresence>

      <CalendarioTreinos
        aberto={calendarioAberto}
        onFechar={() => {
          setCalendarioAberto(false);
          botaoCalendarioRef.current?.blur();
        }}
      />

      {user?.profile && (
        <MedidasCorporais
          aberto={medidasAberto}
          altura={user.profile.height}
          sexo={user.profile.gender}
          imc={imc}
          classificacaoImc={imcClass?.text}
          onFechar={() => {
            setMedidasAberto(false);
            botaoMedidasRef.current?.blur();
          }}
          onResumo={setResumoMedidas}
        />
      )}

      <Container className="custom-scroll">
        <Header>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Logo>HealGym</Logo>
            <UserSection>
              <WelcomeText>Olá, {user?.name?.split(' ')[0] || 'Usuário'}!</WelcomeText>
              <ProfileButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleProfileEdit}
                title="Editar Perfil"
              >
                <FiUser />
              </ProfileButton>
              <LogoutButton
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
              >
                <FiLogOut />
                Sair
              </LogoutButton>
            </UserSection>
          </motion.div>
        </Header>

        <MainContent>
          <HealthPanel>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {user?.profile ? (
                <>
                  <MetricCard>
                    <MetricIcon>
                      <FiHeart />
                    </MetricIcon>
                    <MetricContent>
                      <MetricHeading>
                        <MetricLabel>Taxa Metabólica Basal</MetricLabel>
                        <IndicadorAjuda
                          tipo="tmb"
                          peso={user?.profile?.weight}
                          altura={user?.profile?.height}
                          idade={age}
                          sexo={user?.profile?.gender}
                          resultado={tmb}
                        />
                      </MetricHeading>
                      <MetricValue>{tmb ? `${tmb} kcal/dia` : 'Calculando...'}</MetricValue>
                      <MetricDescription>Calorias queimadas em repouso</MetricDescription>
                    </MetricContent>
                  </MetricCard>

                  <MetricCard>
                    <MetricIcon>
                      <FiTarget />
                    </MetricIcon>
                    <MetricContent>
                      <MetricHeading>
                        <MetricLabel>Índice de Massa Corporal</MetricLabel>
                        <IndicadorAjuda
                          tipo="imc"
                          peso={user?.profile?.weight}
                          altura={user?.profile?.height}
                          resultado={imc}
                          classificacao={imcClass?.text}
                        />
                      </MetricHeading>
                      <MetricValue>{imc ? `${imc} kg/m²` : 'Calculando...'}</MetricValue>
                      {imcClass && <IMCStatus color={imcClass.color}>{imcClass.text}</IMCStatus>}
                    </MetricContent>
                  </MetricCard>

                  <InfoGrid>
                    <EditableInfo
                      field="age"
                      label="Idade"
                      kind="number"
                      min="13"
                      max="120"
                      value={age ?? ''}
                      display={age ? `${age} anos` : 'N/A'}
                      editingField={editingField}
                      setEditingField={setEditingField}
                    />
                    <EditableInfo
                      field="gender"
                      label="Sexo"
                      kind="select"
                      value={user.profile.gender || ''}
                      display={user.profile.gender === 'masculino' ? 'Masculino' : 'Feminino'}
                      editingField={editingField}
                      setEditingField={setEditingField}
                    />
                    <EditableInfo
                      field="height"
                      label="Altura"
                      kind="number"
                      min="100"
                      max="250"
                      value={user.profile.height ?? ''}
                      display={user.profile.height ? `${user.profile.height} cm` : 'N/A'}
                      editingField={editingField}
                      setEditingField={setEditingField}
                    />
                    <EditableInfo
                      field="weight"
                      label="Peso Atual"
                      kind="number"
                      min="30"
                      max="300"
                      step="0.1"
                      value={user.profile.weight ?? ''}
                      display={user.profile.weight ? `${user.profile.weight} kg` : 'N/A'}
                      editingField={editingField}
                      setEditingField={setEditingField}
                    />
                    <InfoItem>
                      <InfoLabel>Peso Ideal</InfoLabel>
                      <InfoValue>{idealWeight ? `${idealWeight} kg` : 'N/A'}</InfoValue>
                    </InfoItem>
                    <EditableInfo
                      field="bodyType"
                      label="Biotipo"
                      kind="select"
                      value={user.profile.bodyType || ''}
                      display={
                        user.profile.bodyType === 'ectomorfo'
                          ? 'Ectomorfo'
                          : user.profile.bodyType === 'mesomorfo'
                            ? 'Mesomorfo'
                            : user.profile.bodyType === 'endomorfo'
                              ? 'Endomorfo'
                              : ''
                      }
                      editingField={editingField}
                      setEditingField={setEditingField}
                    />
                  </InfoGrid>
                  <MedidasActionRow>
                    <MedidasAction
                      ref={botaoMedidasRef}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      aria-haspopup="dialog"
                      aria-expanded={medidasAberto}
                      onClick={() => setMedidasAberto(true)}
                    >
                      <LuRuler aria-hidden="true" />
                      Medidas corporais
                    </MedidasAction>
                    {resumoMedidas?.quantidade === 0 && (
                      <MedidasChamada>Nenhuma medição ainda. Você pode adicionar a primeira.</MedidasChamada>
                    )}
                    {resumoMedidas?.quantidade > 0 && (
                      <MedidasChamada>
                        Última medição em {formatarData(resumoMedidas.ultimaData)}.
                      </MedidasChamada>
                    )}
                  </MedidasActionRow>
                </>
              ) : (
                <EmptyState>
                  <EmptyStateText>
                    Complete seu perfil para ver suas métricas de saúde
                  </EmptyStateText>
                  <CompleteProfileButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleProfileEdit}
                  >
                    Completar Perfil
                  </CompleteProfileButton>
                </EmptyState>
              )}
            </motion.div>
          </HealthPanel>

          <MainArea>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <WelcomeCard>
                <WelcomeTitle>Bem-vindo ao HealGym!</WelcomeTitle>
                <WelcomeDescription>
                  Seu aplicativo completo para treino e dieta personalizada.
                </WelcomeDescription>
                <FeaturesList>
                  <FeatureItem
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleTreinoClick}
                  >
                    Treino
                  </FeatureItem>
                  <FeatureItem
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDietaClick}
                  >
                    Dieta
                  </FeatureItem>
                </FeaturesList>
              </WelcomeCard>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <WeeklyCalendar>
                  <CalendarTitle>Cronograma Semanal</CalendarTitle>
                  <CalendarSubtitle>
                    Em <strong>Treinos</strong> você escolhe divisão em <strong>ABC</strong> (3
                    dias), <strong>ABCD</strong> (4 dias) ou <strong>Full Body</strong>. <br />
                    Aqui marcamos apenas se houve treino realizado naquele dia.
                  </CalendarSubtitle>
                  <CalendarActionRow>
                    <CalendarAction
                      ref={botaoCalendarioRef}
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded={calendarioAberto}
                      aria-controls="calendario-treinos"
                      onClick={() => setCalendarioAberto(true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Ver calendário completo
                    </CalendarAction>
                  </CalendarActionRow>
                  <CalendarGrid>
                    {cronogramaSemanal.map((diaInfo, index) => {
                      const isToday = getDiaAtual() === diaInfo.dayOfWeek;
                      const isCompleted = isTreinoRealizado(diaInfo.dayOfWeek);

                      return (
                        <CalendarDay
                          key={index}
                          isToday={isToday}
                          isCompleted={isCompleted}
                          isClickable={isCompleted}
                          onClick={() =>
                            isCompleted && handleDiaClick(diaInfo.dayOfWeek, diaInfo.dia)
                          }
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <DayHeader>
                            <DayName>{diaInfo.dia}</DayName>
                            {isCompleted && (
                              <CompletedIcon>
                                <FiCheck />
                              </CompletedIcon>
                            )}
                          </DayHeader>
                          <WorkoutInfo>
                            <WorkoutName>{diaInfo.treino}</WorkoutName>
                            <MuscleGroup>{diaInfo.grupos}</MuscleGroup>
                          </WorkoutInfo>
                          {isToday && <TodayIndicator>HOJE</TodayIndicator>}
                          {isCompleted && <ClickHint>Clique para ver</ClickHint>}
                        </CalendarDay>
                      );
                    })}

                    <CalendarDay isRest={true}>
                      <DayHeader>
                        <DayName>Domingo</DayName>
                      </DayHeader>
                      <WorkoutInfo>
                        <WorkoutName>Descanso</WorkoutName>
                        <MuscleGroup>Recuperação</MuscleGroup>
                      </WorkoutInfo>
                      {getDiaAtual() === 7 && <TodayIndicator>HOJE</TodayIndicator>}
                    </CalendarDay>
                  </CalendarGrid>
                </WeeklyCalendar>
              </motion.div>
            </motion.div>
          </MainArea>
        </MainContent>
      </Container>
    </>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    var(--gradient-start) 0%,
    var(--gradient-mid) 50%,
    var(--gradient-end) 100%
  );
  color: var(--text);
  overflow-y: auto;
  overflow-x: hidden;
`;

const Header = styled.header`
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(198, 169, 100, 0.2);

  > div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
`;

const Logo = styled.h1`
  font-family: 'Cinzel', serif;
  font-size: 2rem;
  line-height: 1.1;
  letter-spacing: 0.14em;
  padding-left: 0.14em;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  cursor: default;
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const WelcomeText = styled.span`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 1rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  font-weight: 400;
`;

const ProfileButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 0.75rem;
  border-radius: 50%;
  width: 45px;
  height: 45px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: var(--accent);
    color: var(--background);
  }

  svg {
    font-size: 1.2rem;
  }
`;

const LogoutButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 12px 18px;
  border-radius: 5px;
  font-family: 'Poppins', sans-serif;
  font-size: 0.9rem;
  line-height: 0.8;
  letter-spacing: 0.14em;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: var(--accent);
    color: var(--background);
  }

  svg {
    font-size: 1.2rem;
  }
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 2rem;
  padding: 2rem;
  min-height: calc(100vh - 120px);

  @media (max-width: 1200px) {
    grid-template-columns: 350px 1fr;
    gap: 1.5rem;
  }

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const HealthPanel = styled.div`
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(198, 169, 100, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  height: fit-content;
  max-height: calc(100vh - 160px);
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--accent);
    border-radius: 3px;
  }
`;

const MetricCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(198, 169, 100, 0.2);
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  transition: all 0.3s ease;
  cursor: default;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(198, 169, 100, 0.3);
    transform: translateY(-2px);
  }
`;

const MetricIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gold-gradient);
  border-radius: 8px;
  width: 40px;
  height: 40px;
  flex-shrink: 0;

  svg {
    color: var(--background);
    font-size: 1.2rem;
  }
`;

const MetricContent = styled.div`
  flex: 1;
`;

const MetricHeading = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
`;

const MetricLabel = styled.div`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.82rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  font-weight: 400;
`;

const MetricValue = styled.div`
  color: var(--white);
  font-size: 1.15rem;
  line-height: 1.2;
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const MetricDescription = styled.div`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.82rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  opacity: 0.8;
`;

const IMCStatus = styled.div`
  color: ${(props) => props.color};
  font-size: 0.85rem;
  font-weight: 600;
  background: ${(props) => `${props.color}20`};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
  margin-top: 0.25rem;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 1.5rem 0;
`;

const InfoItem = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(198, 169, 100, 0.1);
  border-radius: 6px;
  padding: 0.75rem;
  text-align: center;
  cursor: default;
`;

const InfoLabel = styled.div`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.82rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  margin-bottom: 0.25rem;
  font-weight: 400;
`;

const InfoValue = styled.div`
  color: var(--white);
  font-size: 0.95rem;
  line-height: 1.25;
  font-weight: 600;
`;

const MedidasActionRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.25rem;
`;

const MedidasAction = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  background: transparent;
  border: 1px solid rgba(198, 169, 100, 0.45);
  color: var(--accent);
  border-radius: 8px;
  padding: 0.5rem 0.95rem;
  font-family: 'Cormorant', serif;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.03em;
  text-transform: none;
  cursor: pointer;

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  &:hover {
    background: rgba(198, 169, 100, 0.12);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const MedidasChamada = styled.p`
  margin: 0;
  width: 110%;
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.88rem;
  line-height: 1.3;
  text-align: center;
`;

const InfoValueRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

const PencilButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  svg {
    width: 12px;
    height: 12px;
  }

  &:hover:not(:disabled) {
    background: rgba(198, 169, 100, 0.14);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const EditBox = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const EditActions = styled.div`
  display: flex;
  justify-content: center;
  gap: 6px;
`;

const InlineInput = styled.input`
  width: 100%;
  padding: 8px 10px;
  border-radius: 5px;
  border: 1px solid rgba(198, 169, 100, 0.35);
  background: #0a0a0a;
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-size: 0.95rem;
  line-height: 1.25;
  text-align: center;

  &:focus {
    outline: none;
    border-color: var(--accent);
  }
`;

const InlineSelect = styled.select`
  width: 100%;
  padding: 8px 10px;
  border-radius: 5px;
  border: 1px solid rgba(198, 169, 100, 0.35);
  background: #0a0a0a;
  color: var(--white);
  font-family: 'Cormorant', serif;
  font-size: 0.9rem;
  line-height: 1.25;
`;

const FieldError = styled.p`
  margin: 0;
  color: #ff6b6b;
  font-family: 'Cormorant', serif;
  font-size: 0.78rem;
  font-style: italic;
  line-height: 1.3;
`;

const EditableInfo = ({
  label,
  field,
  value,
  display,
  kind,
  min,
  max,
  step,
  editingField,
  setEditingField,
}) => {
  const { updateUser } = useAuth();
  const editing = editingField === field;
  const [draft, setDraft] = useState(value ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(value ?? '');
      setError('');
    }
  }, [value, editing]);

  const cancel = () => {
    setDraft(value ?? '');
    setError('');
    setEditingField(null);
  };

  const save = async () => {
    if (saving) return;

    const message = validatePhysicalProfileField(field, draft);
    if (message) {
      setError(message);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        [field]: kind === 'number' ? Number(draft) : draft,
      };
      const response = await api.updateProfile(payload);
      updateUser(response.user);
      setEditingField(null);
    } catch (err) {
      setError(err.message || 'Não foi possível salvar esta informação.');
    } finally {
      setSaving(false);
    }
  };

  const confirmOnEnter = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    save();
  };

  return (
    <InfoItem>
      <InfoLabel>{label}</InfoLabel>
      {editing ? (
        <EditBox initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {kind === 'select' ? (
            <InlineSelect
              value={draft}
              aria-label={label}
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={confirmOnEnter}
            >
              {(field === 'gender' ? GENDER_OPTIONS : BODY_TYPE_OPTIONS).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </InlineSelect>
          ) : (
            <InlineInput
              type="number"
              value={draft}
              min={min}
              max={max}
              step={step}
              aria-label={label}
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={confirmOnEnter}
            />
          )}
          <EditActions>
            <PencilButton type="button" onClick={save} disabled={saving} aria-label={`Salvar ${label}`}>
              <FiCheck />
            </PencilButton>
            <PencilButton type="button" onClick={cancel} disabled={saving} aria-label={`Cancelar edição de ${label}`}>
              <FiX />
            </PencilButton>
          </EditActions>
          {error && <FieldError>{error}</FieldError>}
        </EditBox>
      ) : (
        <InfoValueRow>
          <InfoValue>{display}</InfoValue>
          <PencilButton
            type="button"
            aria-label={`Editar ${label}`}
            onClick={() => {
              setDraft(value ?? '');
              setError('');
              setEditingField(field);
            }}
          >
            <FiEdit2 />
          </PencilButton>
        </InfoValueRow>
      )}
    </InfoItem>
  );
};

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem 1rem;
`;

const EmptyStateText = styled.p`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 1rem;
  letter-spacing: 0.04em;
  margin-bottom: 20px;
  line-height: 1.3;
`;

const CompleteProfileButton = styled(motion.button)`
  background: var(--gold-gradient);
  color: var(--background);
  border: none;
  font-family: 'Poppins', sans-serif;
  font-size: 0.9rem;
  line-height: 0.8;
  letter-spacing: 0.14em;
  padding: 20px;
  border-radius: 5px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 15px rgba(198, 169, 100, 0.4);
  }
`;

const MainArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const WelcomeCard = styled.div`
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  border: 1px solid rgba(198, 169, 100, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const WelcomeTitle = styled.h1`
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
  cursor: default;
  text-align: center;
`;

const WelcomeDescription = styled.p`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 1rem;
  letter-spacing: 0.04em;
  line-height: 1.3;
  margin-bottom: 20px;
  cursor: default;
  text-align: center;
`;

const FeaturesList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
`;

const FeatureItem = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(198, 169, 100, 0.2);
  border-radius: 8px;
  padding: 1.5rem;
  color: var(--white);
  font-family: 'Cinzel', serif;
  font-size: 1.15rem;
  line-height: 1.2;
  letter-spacing: 0.08em;
  font-weight: 600;
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
    border-color: var(--accent);
    box-shadow: 0 4px 15px rgba(198, 169, 100, 0.3);
  }
`;

const WeeklyCalendar = styled.div`
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(198, 169, 100, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  margin-top: 1.5rem;
`;

const CalendarTitle = styled.h2`
  color: var(--white);
  font-size: 1.5rem;
  line-height: 1.15;
  letter-spacing: 0.08em;
  font-weight: 600;
  margin-bottom: 8px;
  text-align: center;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const CalendarSubtitle = styled.p`
  color: var(--text-secondary, rgba(255, 255, 255, 0.7));
  font-family: 'Cormorant', serif;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  line-height: 1.3;
  margin: 0 auto 20px auto;
  max-width: 640px;
  text-align: center;
`;

const CalendarActionRow = styled.div`
  display: flex;
  justify-content: center;
  margin: 0 0 1.25rem;
`;

const CalendarAction = styled(motion.button)`
  background: transparent;
  border: 1px solid rgba(198, 169, 100, 0.45);
  color: var(--accent);
  border-radius: 8px;
  padding: 0.45rem 0.95rem;
  font-family: 'Cormorant', serif;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.03em;
  text-transform: none;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: rgba(198, 169, 100, 0.12);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.75rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const CalendarDay = styled(motion.div)`
  background: ${(props) => {
    if (props.isRest) return 'rgba(100, 100, 100, 0.1)';
    if (props.isCompleted) return 'rgba(76, 175, 80, 0.15)';
    if (props.isToday) return 'rgba(198, 169, 100, 0.15)';
    return 'rgba(255, 255, 255, 0.05)';
  }};
  border: 1px solid
    ${(props) => {
      if (props.isRest) return 'rgba(100, 100, 100, 0.3)';
      if (props.isCompleted) return 'rgba(76, 175, 80, 0.6)';
      if (props.isToday) return 'var(--accent)';
      return 'rgba(198, 169, 100, 0.2)';
    }};
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
  cursor: ${(props) => (props.isClickable ? 'pointer' : 'default')};
  transition: all 0.3s ease;
  position: relative;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px
      ${(props) => (props.isCompleted ? 'rgba(76, 175, 80, 0.4)' : 'rgba(198, 169, 100, 0.2)')};
  }
`;

const DayHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const DayName = styled.div`
  color: var(--white);
  font-size: 0.9rem;
  font-weight: 600;
`;

const CompletedIcon = styled.div`
  background: #4caf50;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    color: white;
    font-size: 0.8rem;
  }
`;

const WorkoutInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const WorkoutName = styled.div`
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const MuscleGroup = styled.div`
  color: var(--text-secondary);
  font-size: 0.7rem;
  line-height: 1.2;
`;

const TodayIndicator = styled.div`
  background: var(--accent);
  color: var(--background);
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  letter-spacing: 0.5px;
`;

const ClickHint = styled.div`
  color: #4caf50;
  font-size: 0.65rem;
  font-weight: 600;
  margin-top: 0.25rem;
  opacity: 0.8;
  cursor: pointer;
`;


const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
  cursor: default;
`;

const ModalContainer = styled.div`
  background: linear-gradient(135deg, rgba(26, 26, 26, 0.98) 0%, rgba(10, 10, 10, 0.98) 100%);
  border: 2px solid var(--accent);
  border-radius: 16px;
  max-width: 700px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(198, 169, 100, 0.3);
  cursor: default;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  background: rgba(198, 169, 100, 0.1);
  border-bottom: 1px solid var(--accent);
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: default;
`;

const ModalTitulo = styled.h2`
  color: var(--white);
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  cursor: default;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: var(--accent);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;

  svg {
    font-size: 1.5rem;
  }

  &:hover {
    background: rgba(198, 169, 100, 0.2);
    transform: rotate(90deg);
  }
`;

const ModalBody = styled.div`
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
  cursor: default;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--accent);
    border-radius: 4px;
  }
`;

const TreinoCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(198, 169, 100, 0.2);
  border-left: 4px solid #4caf50;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  transition: all 0.3s ease;
  cursor: default;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(5px);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const TreinoCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  cursor: default;
`;

const TreinoCardTitulo = styled.h3`
  color: var(--white);
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
  flex: 1;
  cursor: default;
`;

const TreinoCardData = styled.div`
  color: #4caf50;
  font-size: 0.9rem;
  font-weight: 600;
  background: rgba(76, 175, 80, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  cursor: default;
`;

const TreinoCardInfo = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  cursor: default;
`;

const TreinoCardDetalhe = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: default;

  svg {
    color: var(--accent);
  }
`;

const TreinoCardObjetivo = styled.p`
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0;
  cursor: default;
`;

export default Dashboard;
