const GRUPOS = [
  ['Pernas', ['quadriceps', 'isquiotibiais', 'gluteos', 'panturrilhas']],
  ['Peito', ['peitoral']],
  ['Costas', ['dorsal', 'costas_medias']],
  ['Ombros', ['deltoide_anterior', 'deltoide_lateral', 'deltoide_posterior']],
  ['Braços', ['triceps', 'biceps', 'braquial']],
  ['Abdômen', ['core']],
];

const CODIGOS = new Set(GRUPOS.flatMap(([, codigos]) => codigos));

function numero(valor) {
  const lido = Number(valor);
  return Number.isFinite(lido) ? lido : 0;
}

function linhasDaCobertura(cobertura) {
  const linhas = [];
  for (const secao of cobertura?.secoes || []) {
    for (const musculo of secao?.musculos || []) linhas.push(musculo);
  }
  for (const musculo of cobertura?.outrosMusculos || []) linhas.push(musculo);
  return linhas;
}

function seriesPorCodigo(treino) {
  const porCodigo = new Map();
  const linhas = linhasDaCobertura(treino?.cobertura);
  if (linhas.length > 0) {
    for (const linha of linhas) {
      const codigo = linha?.codigo;
      const diretas = numero(linha?.seriesDiretas);
      if (!CODIGOS.has(codigo) || diretas <= 0 || porCodigo.has(codigo)) continue;
      porCodigo.set(codigo, diretas);
    }
    return porCodigo;
  }

  for (const exercicio of treino?.exercicios || []) {
    const codigo = exercicio?.musculoPrincipalCodigo;
    const series = numero(exercicio?.series);
    if (!CODIGOS.has(codigo) || series <= 0) continue;
    porCodigo.set(codigo, (porCodigo.get(codigo) || 0) + series);
  }
  return porCodigo;
}

export function seriesPorGrupo(treino) {
  const porCodigo = seriesPorCodigo(treino);
  return GRUPOS.map(([nome, codigos]) => ({
    nome,
    series: codigos.reduce((total, codigo) => total + (porCodigo.get(codigo) || 0), 0),
  })).filter((grupo) => grupo.series > 0);
}

export function rotuloSeries(valor) {
  const numeroSeries = numero(valor);
  const texto = Number.isInteger(numeroSeries)
    ? String(numeroSeries)
    : String(numeroSeries).replace('.', ',');
  return `${texto} ${numeroSeries === 1 ? 'série' : 'séries'}`;
}
