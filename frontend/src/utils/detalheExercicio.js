const MUSCULOS_SIMPLES = {
  peitoral: 'Peitoral maior',
  dorsal: 'Dorsal',
  costas_medias: 'Meio das costas',
  eretores: 'Lombar',
  deltoide_anterior: 'Parte da frente dos ombros',
  deltoide_lateral: 'Parte lateral dos ombros',
  deltoide_posterior: 'Parte de trás dos ombros',
  trapezio_superior: 'Parte de cima do trapézio',
  manguito: 'Músculos que estabilizam o ombro',
  triceps: 'Tríceps',
  biceps: 'Bíceps',
  braquial: 'Por baixo do bíceps e no antebraço',
  quadriceps: 'Quadríceps',
  isquiotibiais: 'Parte de trás da coxa',
  gluteos: 'Glúteos',
  adutores: 'Parte de dentro da coxa',
  abdutores: 'Lado do quadril',
  panturrilhas: 'Panturrilhas',
  core: 'Abdômen',
};

const ROTULO_PARA_CODIGO = {
  'peitoral maior': 'peitoral',
  'grande dorsal': 'dorsal',
  dorsal: 'dorsal',
  'romboides e trapezio medio': 'costas_medias',
  'meio das costas': 'costas_medias',
  'eretores da coluna': 'eretores',
  lombar: 'eretores',
  'deltoide anterior': 'deltoide_anterior',
  'parte da frente dos ombros': 'deltoide_anterior',
  'deltoide lateral': 'deltoide_lateral',
  'parte lateral dos ombros': 'deltoide_lateral',
  'deltoide posterior': 'deltoide_posterior',
  'parte de tras dos ombros': 'deltoide_posterior',
  'trapezio superior': 'trapezio_superior',
  'parte de cima do trapezio': 'trapezio_superior',
  'manguito rotador': 'manguito',
  'musculos que estabilizam o ombro': 'manguito',
  'triceps braquial': 'triceps',
  triceps: 'triceps',
  'biceps braquial': 'biceps',
  biceps: 'biceps',
  'braquial e braquiorradial': 'braquial',
  'por baixo do biceps e no antebraco': 'braquial',
  quadriceps: 'quadriceps',
  'posteriores de coxa': 'isquiotibiais',
  'parte de tras da coxa': 'isquiotibiais',
  gluteos: 'gluteos',
  adutores: 'adutores',
  'parte de dentro da coxa': 'adutores',
  'gluteo medio e abdutores': 'abdutores',
  'lado do quadril': 'abdutores',
  panturrilhas: 'panturrilhas',
  core: 'core',
  abdomen: 'core',
};

export const ROTULOS_DETALHE = {
  tecnica: 'Técnica',
  principal: 'Músculo principal',
  secundarios: 'Outros músculos trabalhados',
  cuidados: 'Cuidados',
  evite: 'Evite',
  equipamentos: 'Equipamentos',
};

function chave(texto) {
  return String(texto)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function limpar(valor) {
  return String(valor ?? '').trim();
}

function simplesDe(texto) {
  if (MUSCULOS_SIMPLES[texto]) return MUSCULOS_SIMPLES[texto];
  const codigo = ROTULO_PARA_CODIGO[chave(texto)];
  return codigo ? MUSCULOS_SIMPLES[codigo] : '';
}

export function nomeMusculo(valor) {
  const texto = limpar(valor);
  if (!texto) return '';
  const direto = simplesDe(texto);
  if (direto) return direto;
  const base = texto.split(/\s*[·•]\s*/)[0].trim();
  if (base && base !== texto) {
    const conhecido = simplesDe(base);
    if (conhecido) return conhecido;
  }
  return texto;
}

export function musculoPrincipalLegivel(exercicio) {
  if (!exercicio) return '';
  const codigo = exercicio.musculoPrincipalCodigo;
  if (codigo && MUSCULOS_SIMPLES[codigo]) return MUSCULOS_SIMPLES[codigo];
  return nomeMusculo(exercicio.musculoPrincipal) || nomeMusculo(exercicio.porcaoMuscular);
}

export function musculosSecundariosLegiveis(exercicio) {
  const codigos = Array.isArray(exercicio?.secundariosCodigos) ? exercicio.secundariosCodigos : [];
  const pelosCodigos = codigos.map((codigo) => MUSCULOS_SIMPLES[codigo]).filter(Boolean);
  if (codigos.length && pelosCodigos.length === codigos.length) return pelosCodigos.join(', ');
  const texto = limpar(exercicio?.musculosSecundarios);
  if (!texto) return pelosCodigos.join(', ');
  return texto
    .split(',')
    .map((parte) => nomeMusculo(parte))
    .filter(Boolean)
    .join(', ');
}

export function linhasDeDetalhe(exercicio, equipamento = '') {
  if (!exercicio) return [];
  const campos = [
    ['tecnica', limpar(exercicio.tecnica)],
    ['principal', musculoPrincipalLegivel(exercicio)],
    ['secundarios', musculosSecundariosLegiveis(exercicio)],
    ['cuidados', limpar(exercicio.cuidado)],
    ['evite', limpar(exercicio.erroComum)],
    ['equipamentos', limpar(equipamento)],
  ];
  return campos
    .filter(([, texto]) => texto)
    .map(([id, texto]) => ({ id, rotulo: ROTULOS_DETALHE[id], texto }));
}
