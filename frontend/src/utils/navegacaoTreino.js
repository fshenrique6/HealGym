const DESTINOS = {
  dashboard: '/dashboard',
  treino: '/treino',
  historico: '/treino#historico',
};

const ROTULOS = {
  dashboard: 'Dashboard',
  treino: 'Treinos',
  historico: 'Histórico',
};

export function estadoOrigem(origem) {
  if (!Object.prototype.hasOwnProperty.call(DESTINOS, origem)) return undefined;
  return { origem };
}

export function destinoVolta(state) {
  const origem = state?.origem;
  return Object.prototype.hasOwnProperty.call(DESTINOS, origem) ? DESTINOS[origem] : '/treino';
}

export function rotuloDeOrigem(state) {
  const origem = state?.origem;
  return Object.prototype.hasOwnProperty.call(ROTULOS, origem) ? ROTULOS[origem] : 'Treinos';
}

const CODIGO_SESSAO = /^[A-F]$/;
const LIMITE_EXERCICIOS = 40;

function texto(valor, maximo) {
  if (typeof valor !== 'string' && typeof valor !== 'number') return '';
  return String(valor).replace(/\s+/g, ' ').trim().slice(0, maximo);
}

function inteiro(valor, maximo) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) return 0;
  return Math.min(maximo, Math.round(numero));
}

function urlHttps(valor) {
  const bruto = typeof valor === 'string' ? valor.trim() : '';
  if (!/^https:\/\/\S+$/i.test(bruto) || bruto.length > 400) return '';
  return bruto;
}

function listaDeTexto(valor, maximoItens, maximoTexto) {
  if (!Array.isArray(valor)) return [];
  return valor
    .slice(0, maximoItens)
    .map((item) => texto(item, maximoTexto))
    .filter(Boolean);
}

function exercicioDaConsulta(exercicio, indice) {
  if (!exercicio || typeof exercicio !== 'object') return null;
  const nome = texto(exercicio.nome, 120);
  if (!nome) return null;
  const copia = {
    nome,
    series: inteiro(exercicio.series, 20),
    repeticoes: texto(exercicio.repeticoes, 40),
    descanso: texto(exercicio.descanso, 40),
    uid: texto(exercicio.uid, 80) || `consulta-${indice}`,
  };
  const exercicioId = texto(exercicio.exercicioId, 90);
  if (/^[a-z0-9-]{1,90}$/.test(exercicioId)) copia.exercicioId = exercicioId;
  [
    ['rirAlvo', 12],
    ['musculoPrincipalCodigo', 40],
    ['musculoPrincipal', 80],
    ['porcaoMuscular', 80],
    ['musculosSecundarios', 240],
    ['tecnica', 600],
    ['cuidado', 600],
    ['erroComum', 600],
    ['equipamentoRotulo', 80],
    ['padraoRotulo', 80],
  ].forEach(([campo, maximo]) => {
    const valor = texto(exercicio[campo], maximo);
    if (valor) copia[campo] = valor;
  });
  const secundarios = listaDeTexto(exercicio.secundariosCodigos, 12, 40);
  if (secundarios.length) copia.secundariosCodigos = secundarios;
  if (Array.isArray(exercicio.equipamento)) {
    const equipamentos = listaDeTexto(exercicio.equipamento, 8, 40);
    if (equipamentos.length) copia.equipamento = equipamentos;
  } else {
    const equipamento = texto(exercicio.equipamento, 80);
    if (equipamento) copia.equipamento = equipamento;
  }
  const video = urlHttps(exercicio.videoUrl);
  const poster = urlHttps(exercicio.videoThumbnailUrl);
  if (video) copia.videoUrl = video;
  if (poster) copia.videoThumbnailUrl = poster;
  return copia;
}

function consultaPronta({ codigo, titulo, exercicios, duracao, avisos, liberada, bloqueio }) {
  if (!CODIGO_SESSAO.test(codigo || '')) return null;
  const lista = (Array.isArray(exercicios) ? exercicios : [])
    .slice(0, LIMITE_EXERCICIOS)
    .map(exercicioDaConsulta)
    .filter(Boolean);
  const nome = texto(titulo, 180);
  if (!lista.length || !nome) return null;
  const podeIniciar = liberada === true;
  return {
    codigo,
    titulo: nome,
    duracaoEstimadaMinutos: inteiro(duracao, 300),
    avisos: listaDeTexto(avisos, 8, 400),
    liberada: podeIniciar,
    bloqueio: podeIniciar ? '' : texto(bloqueio, 240),
    exercicios: lista,
  };
}

/** Ficha de consulta a partir da sessão já carregada. Não cria treino e não aceita endereço. */
export function montarConsulta(sessao, { liberada = false, bloqueio = '' } = {}) {
  if (!sessao || typeof sessao !== 'object') return null;
  const nome = texto(sessao.nome, 80) || (CODIGO_SESSAO.test(sessao.codigo || '') ? `Treino ${sessao.codigo}` : '');
  const foco = texto(sessao.focoRotulo, 80);
  return consultaPronta({
    codigo: sessao.codigo,
    titulo: foco ? `${nome} · ${foco}` : nome,
    exercicios: sessao.exercicios,
    duracao: sessao.duracaoEstimadaMinutos || sessao.minutos,
    avisos: sessao.avisos,
    liberada,
    bloqueio,
  });
}

/** Relê só o que a própria navegação gravou. Qualquer outro formato é ignorado. */
export function lerConsulta(state) {
  const bruto = state?.consulta;
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
  return consultaPronta({
    codigo: bruto.codigo,
    titulo: bruto.titulo,
    exercicios: bruto.exercicios,
    duracao: bruto.duracaoEstimadaMinutos,
    avisos: bruto.avisos,
    liberada: bruto.liberada === true,
    bloqueio: bruto.bloqueio,
  });
}
