const ROTULOS_EQUIPAMENTO = {
  banco: 'Banco',
  barra: 'Barra',
  halteres: 'Halteres',
  maquina: 'Máquina',
  polia_alta: 'Polia alta',
  polia_baixa: 'Polia baixa',
  polia_media: 'Polia na altura do peito',
  paralelas: 'Barras paralelas',
  peso_corporal: 'Peso corporal',
};

const ROTULOS_CARGA = {
  barra_total: 'Carga total (barra + anilhas)',
  por_halter: 'Carga de cada halter',
  halter_unico: 'Carga do halter',
  maquina: 'Carga indicada no aparelho',
  polia: 'Carga indicada na polia',
  peso_corporal: 'Peso corporal (carga extra opcional)',
};

const BLOCO_POR_GRUPO = {
  PEITO: 'Peito',
  TRICEPS: 'Tríceps',
  COSTAS: 'Costas',
  BICEPS: 'Bíceps',
  OMBROS: 'Ombros',
  PERNAS: 'Pernas',
  CORE: 'Core',
};

const DIVISOES = { ABC: 'ABC', ABCD: 'ABCD', FULL_BODY: 'Full Body' };

export function rotuloDivisao(treino) {
  return DIVISOES[treino?.tipoDivisao] || null;
}

function humanizar(codigo) {
  if (!codigo) return '';
  const texto = String(codigo).replace(/_/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function rotuloEquipamento(exercicio) {
  if (exercicio?.equipamentoRotulo) return exercicio.equipamentoRotulo;
  const lista = Array.isArray(exercicio?.equipamento)
    ? exercicio.equipamento
    : exercicio?.equipamento
      ? [exercicio.equipamento]
      : [];
  return lista.map((item) => ROTULOS_EQUIPAMENTO[item] || humanizar(item)).join(', ');
}

export function rotuloCarga(exercicio) {
  if (exercicio?.tipoCargaRotulo) return exercicio.tipoCargaRotulo;
  return ROTULOS_CARGA[exercicio?.tipoCarga] || null;
}

export function porcaoLegivel(exercicio) {
  const texto = exercicio?.porcaoMuscular;
  if (!texto) return '';
  return String(texto).includes('_') ? humanizar(texto) : texto;
}

export function uidDoExercicio(exercicio, indice) {
  return exercicio?.uid ? String(exercicio.uid) : `idx-${indice}`;
}

export function agruparEmBlocos(exercicios) {
  const blocos = [];
  exercicios.forEach((exercicio, index) => {
    const nome = exercicio.bloco || BLOCO_POR_GRUPO[exercicio.grupo] || 'Exercícios';
    const ultimo = blocos[blocos.length - 1];
    if (ultimo && ultimo.nome === nome) {
      ultimo.itens.push({ exercicio, index });
    } else {
      blocos.push({ nome, itens: [{ exercicio, index }] });
    }
  });
  return blocos;
}

export function lerCarga(texto) {
  if (texto === null || texto === undefined) return { valor: null, erro: false };
  let limpo = String(texto).trim().replace(/\s/g, '');
  if (!limpo) return { valor: null, erro: false };
  if (limpo.startsWith('-')) return { valor: null, erro: true };
  if (limpo.includes(',') && limpo.includes('.')) limpo = limpo.replace(/\./g, '');
  limpo = limpo.replace(',', '.');
  if (!/^\d{1,4}(\.\d{1,3})?$/.test(limpo)) return { valor: null, erro: true };
  const valor = Math.round(parseFloat(limpo) * 100) / 100;
  if (valor > 1000) return { valor: null, erro: true };
  return { valor, erro: false };
}

export function lerRepeticoes(texto) {
  if (texto === null || texto === undefined) return { valor: null, erro: false };
  const limpo = String(texto).trim();
  if (!limpo) return { valor: null, erro: false };
  if (!/^\d{1,3}$/.test(limpo)) return { valor: null, erro: true };
  const valor = parseInt(limpo, 10);
  if (valor > 300) return { valor: null, erro: true };
  return { valor, erro: false };
}

export function formatarCarga(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  const numero = Number(valor);
  if (Number.isNaN(numero)) return '';
  return numero.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export function seriesDoRegistro(exercicio, registro) {
  const prescritas = Math.max(1, Number(exercicio?.series) || 1);
  const salvas = Array.isArray(registro?.series) ? registro.series : [];
  const total = Math.min(10, Math.max(prescritas, ...salvas.map((s) => Number(s.numero) || 0)));
  const linhas = [];
  for (let numero = 1; numero <= total; numero += 1) {
    const salva = salvas.find((s) => Number(s.numero) === numero);
    linhas.push({
      numero,
      carga: salva ? formatarCarga(salva.carga) : '',
      repeticoes:
        salva && salva.repeticoes !== null && salva.repeticoes !== undefined
          ? String(salva.repeticoes)
          : '',
      rir: salva && salva.rir !== null && salva.rir !== undefined ? Number(salva.rir) : null,
      concluida: Boolean(salva?.concluida),
    });
  }
  return linhas;
}

export function registrosDaExecucao(exercicios, execucao) {
  const registros = {};
  const entradas = Array.isArray(execucao?.exercicios) ? execucao.exercicios : [];
  exercicios.forEach((exercicio, index) => {
    const uid = uidDoExercicio(exercicio, index);
    const entrada = entradas.find((item) => item.uid === uid);
    registros[uid] = seriesDoRegistro(exercicio, entrada);
  });
  return registros;
}

function linhaTemDados(linha) {
  return Boolean(linha.concluida || linha.carga || linha.repeticoes || linha.rir !== null);
}

export function montarPayload(registros) {
  const exercicios = [];
  let invalido = false;
  Object.entries(registros).forEach(([uid, linhas]) => {
    if (!linhas.some(linhaTemDados)) return;
    const series = [];
    linhas.forEach((linha) => {
      if (!linhaTemDados(linha)) return;
      const carga = lerCarga(linha.carga);
      const repeticoes = lerRepeticoes(linha.repeticoes);
      if (carga.erro || repeticoes.erro) {
        invalido = true;
        return;
      }
      series.push({
        numero: linha.numero,
        carga: carga.valor,
        repeticoes: repeticoes.valor,
        rir: linha.rir,
        concluida: linha.concluida,
      });
    });
    exercicios.push({ uid, series });
  });
  return { exercicios, invalido };
}

export function contarConcluidas(linhas) {
  return (linhas || []).filter((linha) => linha.concluida).length;
}

export function resumoSessao(series) {
  const feitas = (series || []).filter((s) => s.concluida !== false);
  if (!feitas.length) return null;
  const cargas = feitas.map((s) => (s.carga === '' ? null : s.carga)).filter((c) => c !== null && c !== undefined);
  const reps = feitas
    .map((s) => (s.repeticoes === '' ? null : Number(s.repeticoes)))
    .filter((r) => r !== null && !Number.isNaN(r));
  return {
    series: feitas.length,
    maiorCarga: cargas.length ? Math.max(...cargas.map(Number)) : null,
    totalRepeticoes: reps.length ? reps.reduce((a, b) => a + b, 0) : null,
  };
}

export function descreverSeries(series) {
  return (series || [])
    .map((s) => {
      const carga = s.carga !== null && s.carga !== undefined ? `${formatarCarga(s.carga)} kg` : 'sem carga';
      const reps = s.repeticoes !== null && s.repeticoes !== undefined ? `${s.repeticoes}` : '–';
      return `${carga} × ${reps}`;
    })
    .join(' · ');
}

export function descansoPrescrito(exercicio) {
  if (Number(exercicio?.descansoSegundos) > 0) return Number(exercicio.descansoSegundos);
  const match = String(exercicio?.descanso || '').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 60;
}

export function segundosDecorridos(execucao, agora = Date.now()) {
  if (!execucao) return 0;
  const base = Number(execucao.tempoAcumuladoSegundos) || 0;
  if (execucao.status === 'em_andamento' && execucao.retomadoEm) {
    const delta = Math.max(0, Math.floor((agora - new Date(execucao.retomadoEm).getTime()) / 1000));
    return Math.min(6 * 3600, base + delta);
  }
  return base;
}

export function descansoRestanteSegundos(execucao, agora = Date.now()) {
  if (!execucao?.descansoTerminaEm) return 0;
  const delta = new Date(execucao.descansoTerminaEm).getTime() - agora;
  if (delta <= 0) return 0;
  return Math.ceil(delta / 1000);
}

export function formatarRelogio(total) {
  const segundos = Math.max(0, Math.floor(total));
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const resto = segundos % 60;
  return [horas, minutos, resto].map((n) => String(n).padStart(2, '0')).join(':');
}

export function formatarData(dataIso) {
  if (!dataIso) return '';
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
