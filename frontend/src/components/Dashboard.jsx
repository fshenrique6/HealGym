import styled from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  FiLogOut,
  FiUser,
  FiHeart,
  FiTarget,
  FiCheck,
  FiX,
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
import { avisoBloqueio, estadoDaSessao, sessoesDaRotina, visaoSemanal } from '../utils/rotina';
import { estadoOrigem, montarConsulta } from '../utils/navegacaoTreino';
import SequenciaRotina from './treino/SequenciaRotina';
import { formatarData } from '../utils/medidasCorporais';
import IndicadorAjuda from './IndicadorAjuda';
import CalendarioTreinos from './CalendarioTreinos';
import MedidasCorporais from './MedidasCorporais';
import { LuRuler } from 'react-icons/lu';

const CHAVE_ROLAGEM = 'healgym-rolagem-dashboard';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const reduzir = useReducedMotion();
  const painelRef = useRef(null);
  const [editingField, setEditingField] = useState(null);
  const [agenda, setAgenda] = useState({ rotina: null, estado: null, treinos: [] });
  const [agendaPronta, setAgendaPronta] = useState(false);
  const [agendaErro, setAgendaErro] = useState(false);
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
    let ativo = true;
    const carregarAgenda = async () => {
      try {
        const [rotinaRes, treinosRes] = await Promise.all([api.getRotina(), api.getMyWorkouts()]);
        if (!ativo) return;
        const dados = rotinaRes?.success ? rotinaRes.data : null;
        setAgenda({
          rotina: dados?.rotina || null,
          estado: dados?.estado || null,
          treinos: Array.isArray(treinosRes?.data) ? treinosRes.data : [],
        });
        setAgendaErro(false);
      } catch {
        if (!ativo) return;
        setAgendaErro(true);
      } finally {
        if (ativo) setAgendaPronta(true);
      }
    };
    carregarAgenda();
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') carregarAgenda();
    };
    window.addEventListener('focus', carregarAgenda);
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      ativo = false;
      window.removeEventListener('focus', carregarAgenda);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, []);

  useLayoutEffect(() => {
    const bruto = sessionStorage.getItem(CHAVE_ROLAGEM);
    if (bruto == null || !painelRef.current) return;
    sessionStorage.removeItem(CHAVE_ROLAGEM);
    const topo = Number(bruto);
    if (Number.isFinite(topo) && topo >= 0) painelRef.current.scrollTop = topo;
  }, []);

  const visao = useMemo(() => (agendaPronta ? visaoSemanal(agenda) : null), [agenda, agendaPronta]);
  const treinosNaFaixa =
    visao?.modo === 'flexivel' ? visao.passos.filter((passo) => passo.tipo === 'sessao').length : 0;

  const guardarRolagem = () => {
    if (painelRef.current) sessionStorage.setItem(CHAVE_ROLAGEM, String(painelRef.current.scrollTop));
  };

  const irParaFicha = (id) => {
    if (!id) return;
    guardarRolagem();
    navigate(`/treino/${id}`, { state: estadoOrigem('dashboard') });
  };

  const abrirCartao = (cartao) => {
    if (!cartao || cartao.clicavel === false) return;
    if (cartao.treinoId) {
      irParaFicha(cartao.treinoId);
      return;
    }
    const sessao = sessoesDaRotina(agenda.rotina).find((item) => item.codigo === cartao.codigo);
    if (!sessao) return;
    const situacao = estadoDaSessao(agenda.estado, sessao.codigo);
    const liberada = agenda.estado?.proxima === sessao.codigo && situacao?.status !== 'concluida';
    const consulta = montarConsulta(sessao, {
      liberada,
      bloqueio: liberada ? '' : avisoBloqueio(agenda.rotina, agenda.estado),
    });
    if (!consulta) return;
    guardarRolagem();
    navigate('/treino/consulta', { state: { ...estadoOrigem('dashboard'), consulta } });
  };

  const aoTeclarCartao = (evento, cartao) => {
    if (!cartao?.clicavel) return;
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      abrirCartao(cartao);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleProfileEdit = () => {
    navigate('/edit-profile');
  };

  const handleTreinoClick = () => {
    navigate('/treino');
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
      <CalendarioTreinos
        aberto={calendarioAberto}
        onAbrirTreino={irParaFicha}
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

      <Container ref={painelRef} className="custom-scroll">
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
                  Seu aplicativo completo para treino personalizado.
                </WelcomeDescription>
                <FeaturesList>
                  <FeatureItem
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleTreinoClick}
                  >
                    Treino
                  </FeatureItem>
                </FeaturesList>
              </WelcomeCard>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <WeeklyCalendar>
                  <CabecalhoRotina>
                    <div>
                      <CalendarTitle>
                        {visao?.modo === 'calendario' ? 'Cronograma Semanal' : 'Sua rotina'}
                      </CalendarTitle>
                      <CalendarSubtitle>
                        {agendaErro && visao?.modo !== 'calendario' && visao?.modo !== 'flexivel'
                          ? 'Não foi possível carregar a programação'
                          : visao?.modo === 'calendario'
                            ? 'Dias definidos'
                            : visao?.modo === 'flexivel'
                              ? `Rotina flexível · ${treinosNaFaixa} ${treinosNaFaixa === 1 ? 'treino' : 'treinos'}`
                              : agendaPronta
                                ? 'Nenhuma programação salva'
                                : 'Carregando a programação'}
                      </CalendarSubtitle>
                    </div>
                    <AcoesRotina>
                      {visao?.modo === 'vazio' && (
                        <CalendarAction
                          type="button"
                          onClick={handleTreinoClick}
                          whileHover={reduzir ? undefined : { scale: 1.02 }}
                          whileTap={reduzir ? undefined : { scale: 0.98 }}
                        >
                          Criar programação
                        </CalendarAction>
                      )}
                      <CalendarAction
                        ref={botaoCalendarioRef}
                        type="button"
                        aria-haspopup="dialog"
                        aria-expanded={calendarioAberto}
                        aria-controls="calendario-treinos"
                        onClick={() => setCalendarioAberto(true)}
                        whileHover={reduzir ? undefined : { scale: 1.02 }}
                        whileTap={reduzir ? undefined : { scale: 0.98 }}
                      >
                        Ver calendário completo
                      </CalendarAction>
                    </AcoesRotina>
                  </CabecalhoRotina>
                  {visao?.modo === 'flexivel' && visao.passos?.length > 0 && (
                    <SequenciaRotina passos={visao.passos} onAbrir={abrirCartao} />
                  )}
                  {visao?.modo === 'calendario' && (
                    <CalendarGrid>
                      {visao.dias.map((dia, index) => (
                        <CalendarDay
                          key={dia.dia}
                          $hoje={dia.hoje}
                          $descanso={dia.status === 'descanso'}
                          $andamento={dia.status === 'em_andamento'}
                          $proxima={dia.proxima}
                          $clicavel={dia.clicavel}
                          role={dia.clicavel ? 'button' : undefined}
                          tabIndex={dia.clicavel ? 0 : undefined}
                          aria-current={dia.hoje ? 'date' : undefined}
                          onClick={() => abrirCartao(dia)}
                          onKeyDown={(evento) => aoTeclarCartao(evento, dia)}
                          initial={reduzir ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: reduzir ? 0 : 0.22, delay: reduzir ? 0 : index * 0.03, ease: [0.22, 1, 0.36, 1] }}
                          whileHover={reduzir ? undefined : { scale: 1.02 }}
                          whileTap={dia.clicavel && !reduzir ? { scale: 0.98 } : undefined}
                        >
                          <DayHeader>
                            <DayName>{dia.rotulo}</DayName>
                            {dia.hoje && <TodayIndicator>HOJE</TodayIndicator>}
                          </DayHeader>
                          <WorkoutInfo>
                            {dia.titulo && (
                              <WorkoutName $quieto={dia.status === 'descanso'}>
                                {dia.status === 'concluida' && <FiCheck aria-hidden="true" />}
                                {dia.titulo}
                              </WorkoutName>
                            )}
                            {dia.detalhe && <MuscleGroup>{dia.detalhe}</MuscleGroup>}
                          </WorkoutInfo>
                        </CalendarDay>
                      ))}
                    </CalendarGrid>
                  )}
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
  margin: 1.5rem 0 0;
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
  margin-top: 1rem;
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
  display: flex;
  justify-content: center;
`;

const FeatureItem = styled(motion.div)`
  width: min(100%, calc(50% - 0.5rem));
  min-width: min(100%, 280px);
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

const CabecalhoRotina = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem 1.25rem;
  margin-bottom: 0.85rem;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const AcoesRotina = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const CalendarTitle = styled.h2`
  color: var(--white);
  font-size: 1.5rem;
  line-height: 1.15;
  letter-spacing: 0.08em;
  font-weight: 600;
  margin: 0;
  text-align: left;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  cursor: default;
`;

const CalendarSubtitle = styled.p`
  color: var(--text-secondary, rgba(255, 255, 255, 0.7));
  font-family: 'Cormorant', serif;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  line-height: 1.3;
  margin: 0.35rem 0 0;
  text-align: left;
  cursor: default;
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
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const CalendarDay = styled(motion.div)`
  background: ${(props) => {
    if (props.$hoje) return 'rgba(198, 169, 100, 0.12)';
    if (props.$descanso) return 'rgba(255, 255, 255, 0.03)';
    return 'rgba(255, 255, 255, 0.05)';
  }};
  border: 1px solid
    ${(props) => {
      if (props.$hoje || props.$andamento || props.$proxima) return 'var(--accent)';
      if (props.$descanso) return 'rgba(255, 255, 255, 0.08)';
      return 'rgba(198, 169, 100, 0.2)';
    }};
  border-radius: 8px;
  padding: 0.65rem 0.7rem;
  text-align: left;
  cursor: ${(props) => (props.$clicavel ? 'pointer' : 'default')};
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  min-height: 92px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  outline: none;

  &:hover {
    box-shadow: 0 4px 15px rgba(198, 169, 100, 0.2);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
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
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.2;
  overflow-wrap: anywhere;
`;

const WorkoutInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const WorkoutName = styled.div`
  color: ${({ $quieto }) => ($quieto ? 'var(--text-secondary)' : 'var(--accent)')};
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.25;
  margin-bottom: 0.25rem;
  overflow-wrap: anywhere;
  display: flex;
  align-items: flex-start;
  gap: 0.3rem;

  svg {
    flex-shrink: 0;
    color: var(--accent);
  }
`;

const MuscleGroup = styled.div`
  color: var(--text-secondary);
  font-size: 0.75rem;
  line-height: 1.3;
  overflow-wrap: anywhere;
`;

const TodayIndicator = styled.div`
  flex-shrink: 0;
  background: var(--accent);
  color: var(--background);
  font-size: 0.58rem;
  font-weight: 700;
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  letter-spacing: 0.04em;
`;


export default Dashboard;
