import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiTarget,
  FiTrendingUp,
  FiClock,
  FiActivity,
  FiHeart,
  FiRefreshCw,
  FiTrash2,
} from 'react-icons/fi';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  calculateAge,
  calculateBasalMetabolicRate,
  calculateBodyMassIndex,
} from '../utils/healthCalculations';

const MEAL_LABELS = ['Café da Manhã', 'Almoço', 'Lanche da Tarde', 'Jantar'];

function timeToInputValue(h) {
  if (h == null || h === '') return '08:00';
  const match = String(h).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '08:00';
  const hh = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const mm = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

const calcularFatorPorcao = ({ porcao, unidade }) =>
  unidade === 'unidade' ? porcao : porcao / 100;

const calcularCaloriasPorMacros = ({ proteinas, carboidratos, gorduras }) =>
  proteinas * 4 + carboidratos * 4 + gorduras * 9;

const DEFAULT_HORARIOS = MEAL_LABELS.map((_, i) => `${String(7 + i * 3).padStart(2, '0')}:00`);

const DietaPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dietaGerada, setDietaGerada] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historicoDietas, setHistoricoDietas] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [clearHistoryConfirm, setClearHistoryConfirm] = useState(false);
  const [horariosRefeicoes, setHorariosRefeicoes] = useState(() => [...DEFAULT_HORARIOS]);

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const calcularNecessidadesNutricionais = useMemo(() => {
    if (
      !user?.profile?.weight ||
      !user?.profile?.height ||
      !user?.profile?.dateOfBirth ||
      !user?.profile?.gender
    ) {
      return null;
    }

    const peso = user.profile.weight;
    const altura = user.profile.height;
    const idade = calculateAge(user.profile.dateOfBirth);
    const genero = user.profile.gender;

    const imc = calculateBodyMassIndex(peso, altura);
    let classificacaoIMC = '';
    let objetivo = '';

    if (imc < 18.5) {
      classificacaoIMC = 'Abaixo do peso';
      objetivo = 'ganho_peso';
    } else if (imc >= 18.5 && imc < 25) {
      classificacaoIMC = 'Peso normal';
      objetivo = 'manutencao';
    } else if (imc >= 25 && imc < 30) {
      classificacaoIMC = 'Sobrepeso';
      objetivo = 'emagrecimento';
    } else {
      classificacaoIMC = 'Obesidade';
      objetivo = 'emagrecimento';
    }

    const tmb = calculateBasalMetabolicRate(peso, altura, idade, genero);

    const gastoEnergetico = Math.round(tmb);

    let caloriasMeta;
    let deficitSuperavit = 0;

    switch (objetivo) {
      case 'emagrecimento':
        caloriasMeta = Math.round(tmb);
        deficitSuperavit = gastoEnergetico - caloriasMeta;
        break;
      case 'ganho_peso':
        caloriasMeta = Math.round(tmb) + 200;
        deficitSuperavit = caloriasMeta - gastoEnergetico;
        break;
      case 'manutencao':
      default:
        caloriasMeta = gastoEnergetico;
        deficitSuperavit = 0;
        break;
    }

    return {
      calorias: caloriasMeta,
      tmb: Math.round(tmb),
      imc: Math.round(imc * 10) / 10,
      classificacaoIMC,
      objetivo,
      deficitSuperavit: Math.abs(deficitSuperavit),
    };
  }, [
    user?.profile?.weight,
    user?.profile?.height,
    user?.profile?.dateOfBirth,
    user?.profile?.gender,
  ]);

  const carregarHistoricoDietas = async () => {
    const response = await api.getMyDiets();
    if (response.success) {
      setHistoricoDietas(response.diets || []);
    }
  };

  useEffect(() => {
    const fetchHistorico = async () => {
      try {
        await carregarHistoricoDietas();
      } catch {}
    };

    fetchHistorico();
  }, []);

  const gerarDieta = async () => {
    if (!calcularNecessidadesNutricionais) {
      setError('Configure seu perfil antes de gerar uma dieta');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { calorias, objetivo } = calcularNecessidadesNutricionais;
      const peso = user.profile.weight;

      const response = await api.generateDiet({
        targetCalories: calorias,
        objetivo: objetivo,
        weight: peso,
        refeicoesPorDia: 4,
        preferencias: [],
        horarios: horariosRefeicoes,
      });

      if (response.success) {
        setDietaGerada(response.diet);
        if (response.diet?.mealPlan?.length) {
          setHorariosRefeicoes(response.diet.mealPlan.map((m) => timeToInputValue(m.horario)));
        }
        await carregarHistoricoDietas();
      }
    } catch (error) {
      setError(error.message || 'Erro ao gerar dieta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const excluirDieta = async (dietId, event) => {
    event.stopPropagation();

    const diet = historicoDietas.find((d) => d._id === dietId);
    setDeleteConfirm({
      dietId,
      dietInfo: diet,
    });
  };

  const confirmarExclusao = async () => {
    if (!deleteConfirm) return;

    try {
      const response = await api.deleteDiet(deleteConfirm.dietId);

      if (response.success) {
        await carregarHistoricoDietas();

        if (dietaGerada?.id === deleteConfirm.dietId) {
          setDietaGerada(null);
        }

        setDeleteConfirm(null);
      }
    } catch {
      setError('Erro ao excluir dieta. Tente novamente.');
      setDeleteConfirm(null);
    }
  };

  const limparTodoHistorico = async () => {
    setClearHistoryConfirm(true);
  };

  const confirmarLimparHistorico = async () => {
    try {
      setLoading(true);

      const deletePromises = historicoDietas.map((diet) => api.deleteDiet(diet._id));
      await Promise.all(deletePromises);

      setHistoricoDietas([]);
      setDietaGerada(null);
      setClearHistoryConfirm(false);
    } catch {
      setError('Erro ao limpar o histórico');
    } finally {
      setLoading(false);
    }
  };

  const calcularTotaisDieta = (mealPlan) => {
    let totais = {
      calorias: 0,
      proteinas: 0,
      carboidratos: 0,
      gorduras: 0,
      fibras: 0,
      calcio: 0,
      ferro: 0,
      magnesio: 0,
      fosforo: 0,
      potassio: 0,
      zinco: 0,
      vitaminaA: 0,
      vitaminaC: 0,
      vitaminaD: 0,
      vitaminaE: 0,
      vitaminaB12: 0,
      folato: 0,
    };

    mealPlan.forEach((refeicao) => {
      refeicao.alimentos.forEach((alimento) => {
        const { nutrition, porcao, unidade, isSuplemento } = alimento;

        if (isSuplemento) {
          totais.calcio += nutrition.calcio || 0;
          totais.ferro += nutrition.ferro || 0;
          totais.magnesio += nutrition.magnesio || 0;
          totais.fosforo += nutrition.fosforo || 0;
          totais.potassio += nutrition.potassio || 0;
          totais.zinco += nutrition.zinco || 0;
          totais.vitaminaA += nutrition.vitaminaA || 0;
          totais.vitaminaC += nutrition.vitaminaC || 0;
          totais.vitaminaD += nutrition.vitaminaD || 0;
          totais.vitaminaE += nutrition.vitaminaE || 0;
          totais.vitaminaB12 += nutrition.vitaminaB12 || 0;
          totais.folato += nutrition.folato || 0;
          return;
        }

        const fator = calcularFatorPorcao({ porcao, unidade });


        totais.proteinas += (nutrition.proteinas || 0) * fator;
        totais.carboidratos += (nutrition.carboidratos || 0) * fator;
        totais.gorduras += (nutrition.gorduras || 0) * fator;
        totais.fibras += (nutrition.fibras || 0) * fator;
        totais.calcio += (nutrition.calcio || 0) * fator;
        totais.ferro += (nutrition.ferro || 0) * fator;
        totais.magnesio += (nutrition.magnesio || 0) * fator;
        totais.fosforo += (nutrition.fosforo || 0) * fator;
        totais.potassio += (nutrition.potassio || 0) * fator;
        totais.zinco += (nutrition.zinco || 0) * fator;
        totais.vitaminaA += (nutrition.vitaminaA || 0) * fator;
        totais.vitaminaC += (nutrition.vitaminaC || 0) * fator;
        totais.vitaminaD += (nutrition.vitaminaD || 0) * fator;
        totais.vitaminaE += (nutrition.vitaminaE || 0) * fator;
        totais.vitaminaB12 += (nutrition.vitaminaB12 || 0) * fator;
        totais.folato += (nutrition.folato || 0) * fator;
      });
    });

    totais.calorias = calcularCaloriasPorMacros(totais);

    Object.keys(totais).forEach((key) => {
      totais[key] = Math.round(totais[key] * 10) / 10;
    });

    return totais;
  };

  return (
    <Container>
      <Header>
        <BackButton
          as={motion.button}
          onClick={handleBackToDashboard}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <FiArrowLeft size={24} />
        </BackButton>
        <HeaderTitle>PLANO ALIMENTAR</HeaderTitle>
      </Header>

      {deleteConfirm && (
        <ModalOverlay
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setDeleteConfirm(null)}
        >
          <ModalContent
            as={motion.div}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalIcon>🗑️</ModalIcon>
            <ModalTitle>Excluir Dieta</ModalTitle>
            <ModalMessage>Tem certeza que deseja excluir esta dieta?</ModalMessage>
            <ModalDietInfo>
              <div>
                {deleteConfirm.dietInfo?.objetivo === 'emagrecimento' && '🔥 Emagrecimento'}
                {deleteConfirm.dietInfo?.objetivo === 'ganho_peso' && '💪 Ganho de Peso'}
                {deleteConfirm.dietInfo?.objetivo === 'manutencao' && '⚖️ Manutenção'}
              </div>
              <div>{deleteConfirm.dietInfo?.targetCalories} kcal</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {new Date(deleteConfirm.dietInfo?.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </ModalDietInfo>
            <ModalActions>
              <ModalButtonCancel
                as={motion.button}
                onClick={() => setDeleteConfirm(null)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Cancelar
              </ModalButtonCancel>
              <ModalButtonDelete
                as={motion.button}
                onClick={confirmarExclusao}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Excluir
              </ModalButtonDelete>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}

      {clearHistoryConfirm && (
        <ModalOverlay
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setClearHistoryConfirm(false)}
        >
          <ModalContent
            as={motion.div}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalIcon style={{ fontSize: '3rem' }}>⚠️</ModalIcon>
            <ModalTitle style={{ color: '#dc3545' }}>Limpar Todo Histórico</ModalTitle>
            <ModalMessage style={{ textAlign: 'center', lineHeight: '1.6' }}>
              <strong>ATENÇÃO:</strong> Isso irá apagar{' '}
              <strong>TODAS as {historicoDietas.length} dietas</strong> do seu histórico
              permanentemente.
              <br />
              <br />
              <span style={{ color: '#dc3545', fontWeight: '600' }}>
                Esta ação NÃO pode ser desfeita!
              </span>
            </ModalMessage>
            <ModalActions>
              <ModalButtonCancel
                as={motion.button}
                onClick={() => setClearHistoryConfirm(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Cancelar
              </ModalButtonCancel>
              <ModalButtonDelete
                as={motion.button}
                onClick={confirmarLimparHistorico}
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}
              >
                {loading ? 'Excluindo...' : 'Sim, Excluir Tudo'}
              </ModalButtonDelete>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}

      <ContentWrapper>
        {!calcularNecessidadesNutricionais ? (
          <ErrorCard>
            <ErrorIcon>⚠️</ErrorIcon>
            <ErrorTitle>Perfil Incompleto</ErrorTitle>
            <ErrorMessage>Complete seu perfil para gerar uma dieta personalizada</ErrorMessage>
            <ActionButton onClick={() => navigate('/profile-setup')}>Completar Perfil</ActionButton>
          </ErrorCard>
        ) : (
          <>
            <StatsGrid>
              <StatCard>
                <StatIcon>
                  <FiTarget />
                </StatIcon>
                <StatLabel>IMC</StatLabel>
                <StatValue>{calcularNecessidadesNutricionais.imc}</StatValue>
                <StatSubtext>{calcularNecessidadesNutricionais.classificacaoIMC}</StatSubtext>
              </StatCard>

              <StatCard>
                <StatIcon>
                  <FiActivity />
                </StatIcon>
                <StatLabel>TMB</StatLabel>
                <StatValue>{calcularNecessidadesNutricionais.tmb}</StatValue>
                <StatSubtext>kcal/dia</StatSubtext>
              </StatCard>

              <StatCard>
                <StatIcon>
                  <FiTrendingUp />
                </StatIcon>
                <StatLabel>Meta</StatLabel>
                <StatValue>{calcularNecessidadesNutricionais.calorias}</StatValue>
                <StatSubtext>kcal/dia</StatSubtext>
              </StatCard>

              <StatCard>
                <StatIcon>
                  <FiHeart />
                </StatIcon>
                <StatLabel>Objetivo</StatLabel>
                <StatValue style={{ fontSize: '1rem' }}>
                  {calcularNecessidadesNutricionais.objetivo === 'emagrecimento' && 'Emagrecimento'}
                  {calcularNecessidadesNutricionais.objetivo === 'ganho_peso' && 'Ganho de Peso'}
                  {calcularNecessidadesNutricionais.objetivo === 'manutencao' && 'Manutenção'}
                </StatValue>
                <StatSubtext>
                  {calcularNecessidadesNutricionais.deficitSuperavit > 0 &&
                    `${calcularNecessidadesNutricionais.objetivo === 'emagrecimento' ? 'Déficit' : 'Superávit'}: ${calcularNecessidadesNutricionais.deficitSuperavit} kcal`}
                </StatSubtext>
              </StatCard>
            </StatsGrid>

            <HorariosSection>
              <HorariosTitle>Horários das refeições</HorariosTitle>
              <HorariosDescription>
                Defina os horários que combinam com a sua rotina. Eles serão usados ao gerar a dieta
                e aparecem em cada refeição.
              </HorariosDescription>
              <HorariosGrid>
                {MEAL_LABELS.map((label, index) => (
                  <HorarioRow key={label}>
                    <HorarioMealLabel>{label}</HorarioMealLabel>
                    <TimeField
                      type="time"
                      value={horariosRefeicoes[index] ?? DEFAULT_HORARIOS[index]}
                      onChange={(e) => {
                        const v = e.target.value;
                        setHorariosRefeicoes((prev) => {
                          const next = [...prev];
                          while (next.length < MEAL_LABELS.length)
                            next.push(DEFAULT_HORARIOS[next.length]);
                          next[index] = v;
                          return next;
                        });
                      }}
                    />
                  </HorarioRow>
                ))}
              </HorariosGrid>
            </HorariosSection>

            {error && (
              <ErrorMessage style={{ marginBottom: '2rem', textAlign: 'center', color: '#ff6b6b' }}>
                {error}
              </ErrorMessage>
            )}

            {!dietaGerada && (
              <GenerateSection>
                <GenerateTitle>Gerar Dieta Personalizada</GenerateTitle>
                <GenerateDescription>
                  Sua dieta será gerada com informações nutricionais detalhadas da API USDA FoodData
                  Central, incluindo macronutrientes, micronutrientes, vitaminas e minerais.
                </GenerateDescription>
                <GenerateButton
                  as={motion.button}
                  onClick={gerarDieta}
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.05 }}
                  whileTap={{ scale: loading ? 1 : 0.95 }}
                >
                  {loading ? (
                    <>
                      <FiRefreshCw className="spin" size={20} />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <FiTarget size={20} />
                      Gerar Minha Dieta
                    </>
                  )}
                </GenerateButton>
              </GenerateSection>
            )}

            {dietaGerada && (
              <DietContent>
                <DietHeader>
                  <DietTitle>Sua Dieta Personalizada</DietTitle>
                  <RegenerateButton
                    as={motion.button}
                    onClick={gerarDieta}
                    disabled={loading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiRefreshCw size={16} />
                    Gerar Nova Dieta
                  </RegenerateButton>
                </DietHeader>

                <TargetsCard>
                  <TargetsTitle>Metas Diárias</TargetsTitle>
                  <TargetsGrid>
                    <TargetItem>
                      <TargetLabel>Calorias</TargetLabel>
                      <TargetValue>{dietaGerada.targets.calorias} kcal</TargetValue>
                    </TargetItem>
                    <TargetItem>
                      <TargetLabel>Proteínas</TargetLabel>
                      <TargetValue>{dietaGerada.targets.proteinas}g</TargetValue>
                    </TargetItem>
                    <TargetItem>
                      <TargetLabel>Carboidratos</TargetLabel>
                      <TargetValue>{dietaGerada.targets.carboidratos}g</TargetValue>
                    </TargetItem>
                    <TargetItem>
                      <TargetLabel>Gorduras</TargetLabel>
                      <TargetValue>{dietaGerada.targets.gorduras}g</TargetValue>
                    </TargetItem>
                  </TargetsGrid>
                </TargetsCard>

                <MealsSection>
                  {dietaGerada.mealPlan.map((refeicao, index) => {
                    const totaisRefeicao = {
                      calorias: 0,
                      proteinas: 0,
                      carboidratos: 0,
                      gorduras: 0,
                    };

                    refeicao.alimentos.forEach((alimento) => {
                      if (alimento.isSuplemento) return;

                      const fator = calcularFatorPorcao(alimento);
                      totaisRefeicao.proteinas += (alimento.nutrition.proteinas || 0) * fator;
                      totaisRefeicao.carboidratos += (alimento.nutrition.carboidratos || 0) * fator;
                      totaisRefeicao.gorduras += (alimento.nutrition.gorduras || 0) * fator;
                    });

                    totaisRefeicao.calorias = calcularCaloriasPorMacros(totaisRefeicao);

                    return (
                      <MealCard key={index}>
                        <MealHeader>
                          <div>
                            <MealName>{refeicao.nome}</MealName>
                            <MealTime>
                              <FiClock size={14} />
                              {horariosRefeicoes[index] ?? timeToInputValue(refeicao.horario)}
                            </MealTime>
                          </div>
                          <MealCalories>{Math.round(totaisRefeicao.calorias)} kcal</MealCalories>
                        </MealHeader>

                        <FoodsList>
                          {refeicao.alimentos.map((alimento, foodIndex) => {
                            const fatorAlimento = calcularFatorPorcao(alimento);

                            if (alimento.isSuplemento) {
                              return (
                                <FoodItem
                                  key={foodIndex}
                                  style={{
                                    backgroundColor: 'rgba(212, 175, 55, 0.05)',
                                    borderLeft: '3px solid #d4af37',
                                  }}
                                >
                                  <FoodName style={{ color: '#d4af37', fontWeight: '600' }}>
                                    ⭐ {alimento.nome}
                                  </FoodName>
                                  <FoodQuantity style={{ color: '#d4af37' }}>
                                    {alimento.porcao} {alimento.unidade}
                                  </FoodQuantity>
                                  <FoodMacros
                                    style={{
                                      color: '#888',
                                      fontStyle: 'italic',
                                      fontSize: '0.85rem',
                                    }}
                                  >
                                    Suplemento (não conta nos macros)
                                  </FoodMacros>
                                </FoodItem>
                              );
                            }

                            return (
                              <FoodItem key={foodIndex}>
                                <FoodName>{alimento.nome}</FoodName>
                                <FoodQuantity>
                                  {alimento.porcao}
                                  {alimento.unidade === 'unidade'
                                    ? ' unidade(s)'
                                    : alimento.unidade === 'ml'
                                      ? 'ml'
                                      : alimento.unidade === 'cápsula'
                                        ? ' cápsula'
                                        : alimento.unidade === 'cápsulas'
                                          ? ' cápsulas'
                                          : 'g'}
                                </FoodQuantity>
                                <FoodMacros>
                                  P:{' '}
                                  {Math.round((alimento.nutrition.proteinas || 0) * fatorAlimento)}g
                                  | C:{' '}
                                  {Math.round(
                                    (alimento.nutrition.carboidratos || 0) * fatorAlimento,
                                  )}
                                  g | G:{' '}
                                  {Math.round((alimento.nutrition.gorduras || 0) * fatorAlimento)}g
                                </FoodMacros>

                                <MicronutrientsList>
                                  {alimento.nutrition.fibras > 0 && (
                                    <MicroItem>
                                      Fibras:{' '}
                                      {Math.round((alimento.nutrition.fibras || 0) * fatorAlimento)}
                                      g
                                    </MicroItem>
                                  )}
                                  {alimento.nutrition.calcio > 0 && (
                                    <MicroItem>
                                      Cálcio:{' '}
                                      {Math.round((alimento.nutrition.calcio || 0) * fatorAlimento)}
                                      mg
                                    </MicroItem>
                                  )}
                                  {alimento.nutrition.ferro > 0 && (
                                    <MicroItem>
                                      Ferro:{' '}
                                      {Math.round(
                                        (alimento.nutrition.ferro || 0) * fatorAlimento * 10,
                                      ) / 10}
                                      mg
                                    </MicroItem>
                                  )}
                                  {alimento.nutrition.vitaminaC > 0 && (
                                    <MicroItem>
                                      Vit. C:{' '}
                                      {Math.round(
                                        (alimento.nutrition.vitaminaC || 0) * fatorAlimento,
                                      )}
                                      mg
                                    </MicroItem>
                                  )}
                                  {alimento.nutrition.vitaminaA > 0 && (
                                    <MicroItem>
                                      Vit. A:{' '}
                                      {Math.round(
                                        (alimento.nutrition.vitaminaA || 0) * fatorAlimento,
                                      )}
                                      mcg
                                    </MicroItem>
                                  )}
                                </MicronutrientsList>
                              </FoodItem>
                            );
                          })}
                        </FoodsList>

                        <MealTotals>
                          <TotalItem>
                            <TotalLabel>Proteínas</TotalLabel>
                            <TotalValue>{Math.round(totaisRefeicao.proteinas)}g</TotalValue>
                          </TotalItem>
                          <TotalItem>
                            <TotalLabel>Carboidratos</TotalLabel>
                            <TotalValue>{Math.round(totaisRefeicao.carboidratos)}g</TotalValue>
                          </TotalItem>
                          <TotalItem>
                            <TotalLabel>Gorduras</TotalLabel>
                            <TotalValue>{Math.round(totaisRefeicao.gorduras)}g</TotalValue>
                          </TotalItem>
                        </MealTotals>
                      </MealCard>
                    );
                  })}
                </MealsSection>

                <DailyTotals>
                  <DailyTotalsTitle>Totais Diários</DailyTotalsTitle>
                  {(() => {
                    const totais = calcularTotaisDieta(dietaGerada.mealPlan);
                    return (
                      <>
                        <DailyTotalsGrid>
                          <DailyTotalItem>
                            <DailyTotalLabel>Calorias</DailyTotalLabel>
                            <DailyTotalValue>{totais.calorias} kcal</DailyTotalValue>
                          </DailyTotalItem>
                          <DailyTotalItem>
                            <DailyTotalLabel>Proteínas</DailyTotalLabel>
                            <DailyTotalValue>{totais.proteinas}g</DailyTotalValue>
                          </DailyTotalItem>
                          <DailyTotalItem>
                            <DailyTotalLabel>Carboidratos</DailyTotalLabel>
                            <DailyTotalValue>{totais.carboidratos}g</DailyTotalValue>
                          </DailyTotalItem>
                          <DailyTotalItem>
                            <DailyTotalLabel>Gorduras</DailyTotalLabel>
                            <DailyTotalValue>{totais.gorduras}g</DailyTotalValue>
                          </DailyTotalItem>
                          <DailyTotalItem>
                            <DailyTotalLabel>Fibras</DailyTotalLabel>
                            <DailyTotalValue>{totais.fibras}g</DailyTotalValue>
                          </DailyTotalItem>
                        </DailyTotalsGrid>

                        <MicronutrientsSection>
                          <MicronutrientsTitle>Micronutrientes</MicronutrientsTitle>
                          <MicronutrientsGrid>
                            <MicroItem>Cálcio: {totais.calcio}mg</MicroItem>
                            <MicroItem>Ferro: {totais.ferro}mg</MicroItem>
                            <MicroItem>Magnésio: {totais.magnesio}mg</MicroItem>
                            <MicroItem>Fósforo: {totais.fosforo}mg</MicroItem>
                            <MicroItem>Potássio: {totais.potassio}mg</MicroItem>
                            <MicroItem>Zinco: {totais.zinco}mg</MicroItem>
                            <MicroItem>Vit. A: {totais.vitaminaA}mcg</MicroItem>
                            <MicroItem>Vit. C: {totais.vitaminaC}mg</MicroItem>
                            <MicroItem>Vit. D: {totais.vitaminaD}mcg</MicroItem>
                            <MicroItem>Vit. E: {totais.vitaminaE}mg</MicroItem>
                            <MicroItem>Vit. B12: {totais.vitaminaB12}mcg</MicroItem>
                            <MicroItem>Folato: {totais.folato}mcg</MicroItem>
                          </MicronutrientsGrid>
                        </MicronutrientsSection>
                      </>
                    );
                  })()}
                </DailyTotals>
              </DietContent>
            )}

            {historicoDietas.length > 0 && (
              <HistorySection>
                <HistoryHeader>
                  <HistoryTitle>Histórico de Dietas</HistoryTitle>
                  <ClearHistoryButton
                    as={motion.button}
                    onClick={limparTodoHistorico}
                    disabled={loading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiTrash2 size={16} />
                    Limpar Histórico
                  </ClearHistoryButton>
                </HistoryHeader>
                <HistoryList>
                  {historicoDietas.slice(0, 5).map((diet) => (
                    <HistoryItem
                      key={diet._id}
                      onClick={() => {
                        const dietData = {
                          id: diet._id,
                          objetivo: diet.objetivo,
                          targets: {
                            calorias: diet.targetCalories,
                            proteinas: Math.round(diet.targetProtein),
                            carboidratos: Math.round(diet.targetCarbs),
                            gorduras: Math.round(diet.targetFat),
                          },
                          mealPlan: diet.mealPlan,
                        };
                        setDietaGerada(dietData);
                        if (diet.mealPlan?.length) {
                          setHorariosRefeicoes(
                            diet.mealPlan.map((m) => timeToInputValue(m.horario)),
                          );
                        }
                      }}
                      isActive={dietaGerada?.id === diet._id}
                    >
                      <HistoryDate>
                        {new Date(diet.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </HistoryDate>
                      <HistoryInfo>
                        <HistoryObjetivo>
                          {diet.objetivo === 'emagrecimento' && '🔥 Emagrecimento'}
                          {diet.objetivo === 'ganho_peso' && '💪 Ganho de Peso'}
                          {diet.objetivo === 'manutencao' && '⚖️ Manutenção'}
                        </HistoryObjetivo>
                        <HistoryCalories>{diet.targetCalories} kcal</HistoryCalories>
                      </HistoryInfo>
                      <DeleteButton
                        onClick={(e) => excluirDieta(diet._id, e)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <FiTrash2 size={18} />
                      </DeleteButton>
                    </HistoryItem>
                  ))}
                </HistoryList>
              </HistorySection>
            )}
          </>
        )}
      </ContentWrapper>
    </Container>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  color: var(--white);
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const BackButton = styled.button`
  background: rgba(198, 169, 100, 0.1);
  border: 1px solid var(--accent);
  color: var(--accent);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(198, 169, 100, 0.2);
    box-shadow: 0 0 20px rgba(198, 169, 100, 0.3);
  }
`;

const HeaderTitle = styled.h1`
  color: var(--accent);
  font-size: 2rem;
  line-height: 1.15;
  font-weight: 600;
  letter-spacing: 0.14em;
  padding-left: 0.14em;

  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const ContentWrapper = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(motion.div)`
  background: rgba(198, 169, 100, 0.05);
  border: 1px solid rgba(198, 169, 100, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(198, 169, 100, 0.1);
    box-shadow: 0 8px 32px rgba(198, 169, 100, 0.2);
    transform: translateY(-5px);
  }
`;

const StatIcon = styled.div`
  color: var(--accent);
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 0.82rem;
  line-height: 1.3;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
`;

const StatValue = styled.div`
  color: var(--white);
  font-size: 1.5rem;
  line-height: 1.15;
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const StatSubtext = styled.div`
  color: var(--text-secondary);
  font-size: 0.85rem;
`;

const HorariosSection = styled.div`
  background: rgba(198, 169, 100, 0.06);
  border: 1px solid rgba(198, 169, 100, 0.25);
  border-radius: 16px;
  padding: 1.5rem 1.75rem;
  margin-bottom: 2rem;
`;

const HorariosTitle = styled.h3`
  color: var(--accent);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
`;

const HorariosDescription = styled.p`
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0 0 1.25rem 0;
`;

const HorariosGrid = styled.div`
  display: grid;
  gap: 1rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const HorarioRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  border: 1px solid rgba(198, 169, 100, 0.12);
`;

const HorarioMealLabel = styled.span`
  color: var(--white);
  font-size: 0.95rem;
  font-weight: 500;
`;

const TimeField = styled.input`
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(198, 169, 100, 0.35);
  border-radius: 8px;
  color: var(--white);
  padding: 0.45rem 0.65rem;
  font-size: 1rem;
  font-family: inherit;
  color-scheme: dark;
  min-width: 7rem;

  &:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(198, 169, 100, 0.2);
  }

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active {
    -webkit-text-fill-color: var(--white) !important;
    caret-color: var(--white);
    -webkit-box-shadow:
      0 0 0 1000px rgba(255, 255, 255, 0.06) inset,
      0 0 0 1000px color-mix(in srgb, #000000 20%, var(--background)) inset !important;
    box-shadow:
      0 0 0 1000px rgba(255, 255, 255, 0.06) inset,
      0 0 0 1000px color-mix(in srgb, #000000 20%, var(--background)) inset !important;
    transition:
      background-color 99999s ease-out 0s,
      color 99999s ease-out 0s,
      box-shadow 0s;
  }

  &:-webkit-autofill:focus {
    -webkit-box-shadow:
      0 0 0 1000px rgba(255, 255, 255, 0.06) inset,
      0 0 0 1000px color-mix(in srgb, #000000 20%, var(--background)) inset,
      0 0 0 2px rgba(198, 169, 100, 0.2) !important;
    box-shadow:
      0 0 0 1000px rgba(255, 255, 255, 0.06) inset,
      0 0 0 1000px color-mix(in srgb, #000000 20%, var(--background)) inset,
      0 0 0 2px rgba(198, 169, 100, 0.2) !important;
  }
`;

const ErrorCard = styled.div`
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 16px;
  padding: 3rem;
  text-align: center;
  max-width: 600px;
  margin: 2rem auto;
`;

const ErrorIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const ErrorTitle = styled.h3`
  color: #ff6b6b;
  font-size: 1.5rem;
  margin-bottom: 1rem;
`;

const ErrorMessage = styled.p`
  color: var(--text-secondary);
  font-size: 1rem;
  margin-bottom: 2rem;
`;

const ActionButton = styled(motion.button)`
  background: linear-gradient(135deg, var(--accent) 0%, #d4a574 100%);
  color: var(--black);
  border: none;
  font-family: 'Poppins', sans-serif;
  padding: 20px;
  border-radius: 5px;
  font-size: 0.9rem;
  line-height: 0.8;
  letter-spacing: 0.14em;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(198, 169, 100, 0.4);
  }
`;

const GenerateSection = styled.div`
  background: rgba(198, 169, 100, 0.05);
  border: 1px solid rgba(198, 169, 100, 0.2);
  border-radius: 16px;
  padding: 3rem;
  text-align: center;
  margin-bottom: 2rem;
`;

const GenerateTitle = styled.h2`
  color: var(--accent);
  font-size: 1.5rem;
  line-height: 1.15;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
`;

const GenerateDescription = styled.p`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 1rem;
  letter-spacing: 0.04em;
  line-height: 1.3;
  margin-bottom: 2rem;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
`;

const GenerateButton = styled.button`
  background: linear-gradient(135deg, var(--accent) 0%, #d4a574 100%);
  color: var(--black);
  border: none;
  font-family: 'Poppins', sans-serif;
  padding: 20px 28px;
  border-radius: 5px;
  font-size: 0.9rem;
  line-height: 0.8;
  letter-spacing: 0.14em;
  font-weight: 400;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.3s ease;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(198, 169, 100, 0.4);
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const DietContent = styled.div`
  margin-top: 2rem;
`;

const DietHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
`;

const DietTitle = styled.h2`
  color: var(--accent);
  font-size: 2rem;
  font-weight: 700;
`;

const RegenerateButton = styled.button`
  background: rgba(198, 169, 100, 0.1);
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(198, 169, 100, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ClearHistoryButton = styled.button`
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid #dc3545;
  color: #dc3545;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(220, 53, 69, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TargetsCard = styled.div`
  background: rgba(198, 169, 100, 0.1);
  border: 1px solid rgba(198, 169, 100, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const TargetsTitle = styled.h3`
  color: var(--accent);
  font-size: 1.3rem;
  margin-bottom: 1rem;
  text-align: center;
`;

const TargetsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
`;

const TargetItem = styled.div`
  text-align: center;
`;

const TargetLabel = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
`;

const TargetValue = styled.div`
  color: var(--white);
  font-size: 1.3rem;
  font-weight: 700;
`;

const MealsSection = styled.div`
  display: grid;
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const MealCard = styled.div`
  background: rgba(198, 169, 100, 0.05);
  border: 1px solid rgba(198, 169, 100, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
`;

const MealHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(198, 169, 100, 0.2);
`;

const MealName = styled.h4`
  color: var(--accent);
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const MealTime = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const MealCalories = styled.div`
  color: var(--white);
  font-size: 1.1rem;
  font-weight: 600;
`;

const FoodsList = styled.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const FoodItem = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(198, 169, 100, 0.1);
  border-radius: 8px;
  padding: 1rem;
`;

const FoodName = styled.div`
  color: var(--white);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const FoodQuantity = styled.div`
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const FoodMacros = styled.div`
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
`;

const MicronutrientsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const MicroItem = styled.div`
  color: var(--text-secondary);
  font-size: 0.75rem;
  background: rgba(198, 169, 100, 0.05);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
`;

const MealTotals = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding: 1rem;
  background: rgba(198, 169, 100, 0.05);
  border-radius: 8px;
`;

const TotalItem = styled.div`
  text-align: center;
`;

const TotalLabel = styled.div`
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
`;

const TotalValue = styled.div`
  color: var(--white);
  font-size: 1rem;
  font-weight: 600;
`;

const DailyTotals = styled.div`
  background: rgba(198, 169, 100, 0.1);
  border: 1px solid rgba(198, 169, 100, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
`;

const DailyTotalsTitle = styled.h4`
  color: var(--accent);
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 1rem;
`;

const DailyTotalsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const DailyTotalItem = styled.div`
  text-align: center;
`;

const DailyTotalLabel = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
`;

const DailyTotalValue = styled.div`
  color: var(--white);
  font-size: 1.2rem;
  font-weight: 700;
`;

const MicronutrientsSection = styled.div`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(198, 169, 100, 0.2);
`;

const MicronutrientsTitle = styled.h5`
  color: var(--accent);
  font-size: 1.2rem;
  margin-bottom: 1rem;
  text-align: center;
`;

const MicronutrientsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
`;

const HistorySection = styled.div`
  margin-top: 3rem;
  background: rgba(198, 169, 100, 0.05);
  border: 1px solid rgba(198, 169, 100, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
`;

const HistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const HistoryTitle = styled.h3`
  color: var(--accent);
  font-size: 1.5rem;
  margin: 0;
`;

const HistoryList = styled.div`
  display: grid;
  gap: 1rem;
`;

const HistoryItem = styled.div`
  background: ${(props) => (props.isActive ? 'rgba(198, 169, 100, 0.15)' : 'rgba(255, 255, 255, 0.02)')};
  border: 1px solid ${(props) => (props.isActive ? 'var(--accent)' : 'rgba(198, 169, 100, 0.1)')};
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    background: rgba(198, 169, 100, 0.1);
    border-color: var(--accent);
    transform: translateX(5px);
  }
`;

const HistoryDate = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const HistoryInfo = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const HistoryObjetivo = styled.div`
  color: var(--white);
  font-size: 0.9rem;
  font-weight: 600;
`;

const HistoryCalories = styled.div`
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 600;
`;

const DeleteButton = styled(motion.button)`
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-left: 1rem;

  &:hover {
    background: rgba(255, 107, 107, 0.2);
    border-color: #ff6b6b;
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  border: 2px solid rgba(198, 169, 100, 0.3);
  border-radius: 20px;
  padding: 2.5rem;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  text-align: center;
`;

const ModalIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: shake 0.5s ease-in-out;

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-10px) rotate(-5deg);
    }
    75% {
      transform: translateX(10px) rotate(5deg);
    }
  }
`;

const ModalTitle = styled.h3`
  color: #ff6b6b;
  font-family: 'Cinzel', serif;
  font-size: 1.5rem;
  line-height: 1.15;
  letter-spacing: 0.08em;
  font-weight: 600;
  margin-bottom: 8px;
`;

const ModalMessage = styled.p`
  color: var(--text-secondary);
  font-family: 'Cormorant', serif;
  font-size: 1rem;
  letter-spacing: 0.04em;
  line-height: 1.3;
  margin-bottom: 1.5rem;
`;

const ModalDietInfo = styled.div`
  background: rgba(198, 169, 100, 0.05);
  border: 1px solid rgba(198, 169, 100, 0.2);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 2rem;

  div {
    color: var(--white);
    margin: 0.5rem 0;
    font-size: 1rem;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
`;

const ModalButtonCancel = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(198, 169, 100, 0.3);
  color: var(--accent);
  font-family: 'Poppins', sans-serif;
  padding: 12px 18px;
  border-radius: 5px;
  font-size: 0.9rem;
  line-height: 0.8;
  letter-spacing: 0.14em;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;

  &:hover {
    background: rgba(198, 169, 100, 0.1);
    border-color: var(--accent);
  }
`;

const ModalButtonDelete = styled.button`
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  border: none;
  color: white;
  font-family: 'Poppins', sans-serif;
  padding: 12px 18px;
  border-radius: 5px;
  font-size: 0.9rem;
  line-height: 0.8;
  letter-spacing: 0.14em;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);

  &:hover {
    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
    transform: translateY(-2px);
  }
`;

export default DietaPage;
