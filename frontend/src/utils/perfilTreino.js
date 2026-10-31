export const OBJETIVOS = [
  { value: 'hipertrofia', label: 'Hipertrofia' },
  { value: 'forca', label: 'Força' },
  { value: 'resistencia', label: 'Resistência muscular' },
];

export const EXPERIENCIAS = [
  { value: 'nunca', label: 'Nunca treinou' },
  { value: 'menos_6_meses', label: 'Menos de 6 meses' },
  { value: 'de_6_a_12_meses', label: 'De 6 a 12 meses' },
  { value: 'de_1_a_2_anos', label: 'De 1 a 2 anos' },
  { value: 'de_2_a_5_anos', label: 'De 2 a 5 anos' },
  { value: 'mais_de_5_anos', label: 'Mais de 5 anos' },
];

export const FREQUENCIAS = [
  { value: 'nenhuma', label: 'Não tenho treinado' },
  { value: 'irregular', label: 'Treino irregularmente' },
  { value: 'semanal_1_2', label: '1 a 2 vezes por semana' },
  { value: 'semanal_3_4', label: '3 a 4 vezes por semana' },
  { value: 'semanal_5_mais', label: '5 ou mais vezes por semana' },
];

export const DIAS = [1, 2, 3, 4, 5, 6];
export const DURACOES = [30, 45, 60, 75, 90, 120];

const CAMPOS = [
  'trainingGoal',
  'trainingExperience',
  'recentFrequency',
  'availableDays',
  'preferredSessionMinutes',
];

export function rotulo(opcoes, valor) {
  return opcoes.find((item) => item.value === valor)?.label || 'Não informado';
}

export function validarCampoTreino(name, value) {
  if (!CAMPOS.includes(name)) {
    return '';
  }
  if (name === 'trainingGoal' && !OBJETIVOS.some((item) => item.value === value)) {
    return 'Selecione o objetivo do treino';
  }
  if (name === 'trainingExperience' && !EXPERIENCIAS.some((item) => item.value === value)) {
    return 'Selecione sua experiência em musculação';
  }
  if (name === 'recentFrequency' && !FREQUENCIAS.some((item) => item.value === value)) {
    return 'Selecione a frequência dos últimos 3 meses';
  }
  if (name === 'availableDays' && !DIAS.includes(Number(value))) {
    return 'Escolha de 1 a 6 dias disponíveis';
  }
  if (name === 'preferredSessionMinutes' && !DURACOES.includes(Number(value))) {
    return 'Selecione a duração da sessão';
  }
  return '';
}

export function dadosTreinoDoPerfil(profile) {
  return {
    trainingGoal: profile?.trainingGoal || '',
    trainingExperience: profile?.trainingExperience || '',
    recentFrequency: profile?.recentFrequency || '',
    availableDays: profile?.availableDays ? String(profile.availableDays) : '',
    preferredSessionMinutes: profile?.preferredSessionMinutes
      ? String(profile.preferredSessionMinutes)
      : '',
  };
}

export function payloadTreino(form) {
  return {
    trainingGoal: form.trainingGoal,
    trainingExperience: form.trainingExperience,
    recentFrequency: form.recentFrequency,
    availableDays: Number(form.availableDays),
    preferredSessionMinutes: Number(form.preferredSessionMinutes),
  };
}

export function confirmarTreinoSalvo(enviado, usuario) {
  const perfil = usuario?.profile;
  if (!perfil) {
    return 'O servidor não confirmou o perfil salvo.';
  }

  const esperado = {
    trainingGoal: enviado.trainingGoal,
    trainingExperience: enviado.trainingExperience,
    recentFrequency: enviado.recentFrequency,
    availableDays: Number(enviado.availableDays),
    preferredSessionMinutes: Number(enviado.preferredSessionMinutes),
  };

  const recebido = {
    trainingGoal: perfil.trainingGoal,
    trainingExperience: perfil.trainingExperience,
    recentFrequency: perfil.recentFrequency,
    availableDays: Number(perfil.availableDays),
    preferredSessionMinutes: Number(perfil.preferredSessionMinutes),
  };

  const confere = CAMPOS.every((campo) => esperado[campo] === recebido[campo]);
  return confere ? '' : 'O servidor não confirmou os dados de treino.';
}
