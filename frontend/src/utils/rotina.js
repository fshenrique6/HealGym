export const DIAS_SEMANA = [
  { dia: 1, rotulo: 'Segunda', curto: 'Seg' },
  { dia: 2, rotulo: 'Terça', curto: 'Ter' },
  { dia: 3, rotulo: 'Quarta', curto: 'Qua' },
  { dia: 4, rotulo: 'Quinta', curto: 'Qui' },
  { dia: 5, rotulo: 'Sexta', curto: 'Sex' },
  { dia: 6, rotulo: 'Sábado', curto: 'Sáb' },
  { dia: 7, rotulo: 'Domingo', curto: 'Dom' },
];

export const ROTULO_STATUS = {
  planejada: 'Planejada',
  disponivel: 'Disponível',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  nao_realizada: 'Não realizada',
  descanso: 'Descanso',
};

export const FOCOS_AVULSO = [
  { value: 'corpo_inteiro', label: 'Corpo inteiro' },
  { value: 'superior', label: 'Superiores' },
  { value: 'inferior', label: 'Inferiores' },
  { value: 'empurrar', label: 'Empurrar' },
  { value: 'puxar', label: 'Puxar' },
];

const PREFERENCIAS_PADRAO = {
  equipamentos: null,
  preferenciaEquipamento: 'indiferente',
  evitar: [],
  limitacoes: [],
};

/** 1 = segunda … 7 = domingo, no horário local. */
export function diaDaSemana(data = new Date()) {
  const d = data instanceof Date ? data : new Date(data);
  return ((d.getDay() + 6) % 7) + 1;
}

/** Segunda-feira, 00:00 no horário local, da semana que contém a data. */
export function inicioDaSemana(data = new Date()) {
  const d = new Date(data instanceof Date ? data.getTime() : data);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (diaDaSemana(d) - 1));
  return d;
}

export function rotuloDia(dia) {
  return DIAS_SEMANA.find((item) => item.dia === Number(dia))?.rotulo || '';
}

export function listaDeDias(dias, curto = true) {
  return (dias || [])
    .map((dia) => DIAS_SEMANA.find((item) => item.dia === Number(dia)))
    .filter(Boolean)
    .map((item) => (curto ? item.curto.toLowerCase() : item.rotulo.toLowerCase()))
    .join(', ');
}

/** Tira só o multiplicador final, como “(2×)”, porque a quantidade de treinos já aparece ao lado. */
export function divisaoCurta(rotulo) {
  return String(rotulo || '')
    .replace(/\s*\(\d+\s*[×x]\)\s*$/i, '')
    .trim();
}

function fraseDeDias(dias) {
  const nomes = (dias || [])
    .map((dia) => DIAS_SEMANA.find((item) => item.dia === Number(dia)))
    .filter(Boolean)
    .map((item) => item.rotulo.toLowerCase());
  if (!nomes.length) return '';
  if (nomes.length === 1) return nomes[0];
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

function capitalizar(texto) {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Resumo curto da prévia. Os rótulos vêm da proposta gerada; a estrutura não é escolhida aqui.
 */
export function resumoDaProgramacao(proposta, objetivo) {
  const sessoes = Array.isArray(proposta?.sessoes) ? proposta.sessoes : [];
  const quantidade = Number(proposta?.sessoesPorSemana) || sessoes.length;
  const minutos = sessoes
    .map((sessao) => Number(sessao?.duracaoEstimadaMinutos))
    .filter((valor) => Number.isFinite(valor) && valor > 0);
  const menor = minutos.length ? Math.min(...minutos) : null;
  const maior = minutos.length ? Math.max(...minutos) : null;
  const duracao =
    menor == null ? '' : menor === maior ? `~${menor} min\u00A0cada` : `~${menor}–${maior} min`;
  const titulo = [
    objetivo || '',
    quantidade ? `${quantidade} ${quantidade === 1 ? 'treino' : 'treinos'}` : '',
    duracao,
  ]
    .filter(Boolean)
    .join(' · ');
  const agenda = proposta?.agenda;
  let organizacao = 'Flexível';
  if (agenda?.modo === 'calendario') {
    const dias = fraseDeDias(agenda.dias);
    organizacao = dias ? capitalizar(dias) : 'Dias definidos';
  }
  return {
    titulo,
    divisao: divisaoCurta(proposta?.estrategia?.rotulo || proposta?.estrategia?.codigo),
    organizacao,
  };
}

const ROTULO_OBJETIVO = {
  hipertrofia: 'Hipertrofia',
  forca: 'Força',
  resistencia: 'Resistência muscular',
};

function rotuloObjetivo(valor) {
  return ROTULO_OBJETIVO[valor] || '';
}

function quantidadeTreinos(valor) {
  const numero = Number(valor);
  if (!numero) return '';
  return `${numero} ${numero === 1 ? 'treino' : 'treinos'}`;
}

/**
 * Diferenças curtas entre a rotina salva e a proposta. A agenda sozinha não troca os exercícios.
 */
export function oQueVaiMudar(rotina, proposta, perfil) {
  if (!rotina || !proposta) return [];
  const itens = [];
  const antesFlexivel = rotina.agenda?.modo !== 'calendario';
  const depoisFlexivel = proposta.agenda?.modo !== 'calendario';
  if (antesFlexivel !== depoisFlexivel) {
    itens.push(
      `${antesFlexivel ? 'Rotina flexível' : 'Dias definidos'} → ${depoisFlexivel ? 'Rotina flexível' : 'Dias definidos'}.`,
    );
  }
  if (!depoisFlexivel) {
    const antes = fraseDeDias(rotina.agenda?.dias);
    const depois = fraseDeDias(proposta.agenda?.dias);
    if (depois && antes !== depois) {
      itens.push(antes ? `${capitalizar(antes)} → ${depois}.` : `Dias: ${depois}.`);
    }
  }
  const quantidadeAntes = sessoesDaRotina(rotina).length;
  const quantidadeDepois = Number(proposta.sessoesPorSemana) || (proposta.sessoes || []).length;
  if (quantidadeAntes && quantidadeDepois && quantidadeAntes !== quantidadeDepois) {
    itens.push(`${quantidadeTreinos(quantidadeAntes)} → ${quantidadeTreinos(quantidadeDepois)}.`);
  }
  const minutosAntes = Number(rotina.entrada?.perfil?.preferredSessionMinutes);
  const minutosDepois = Number(perfil?.preferredSessionMinutes);
  if (minutosAntes && minutosDepois && minutosAntes !== minutosDepois) {
    itens.push(`${minutosAntes} minutos → ${minutosDepois} minutos.`);
  }
  const objetivoAntes = rotuloObjetivo(rotina.entrada?.perfil?.trainingGoal);
  const objetivoDepois = rotuloObjetivo(perfil?.trainingGoal);
  if (objetivoAntes && objetivoDepois && objetivoAntes !== objetivoDepois) {
    itens.push(`${objetivoAntes} → ${objetivoDepois}.`);
  }
  const diasPedidos = Number(perfil?.availableDays);
  if (diasPedidos && quantidadeDepois && diasPedidos > quantidadeDepois) {
    const motivo = typeof proposta?.motivoMenosSessoes === 'string' ? proposta.motivoMenosSessoes.trim() : '';
    itens.push(
      motivo ||
        `Você informou ${diasPedidos} dias. A programação ficou com ${quantidadeTreinos(quantidadeDepois)}.`,
    );
  }
  const mesmaProgramacao =
    rotina.assinatura && proposta.assinatura && rotina.assinatura === proposta.assinatura;
  if (mesmaProgramacao && itens.length) {
    itens.push('Os exercícios e as séries continuam os mesmos.');
  }
  if (!mesmaProgramacao && rotina.assinatura && proposta.assinatura) {
    itens.push('Nova divisão adaptada ao perfil.');
  }
  return itens;
}

export function sessoesDaRotina(rotina) {
  return Array.isArray(rotina?.sessoes) ? rotina.sessoes : [];
}

export function estadoDaSessao(estado, codigo) {
  return (estado?.sessoes || []).find((item) => item.codigo === codigo) || null;
}

export function idDaSessaoAberta(estado, codigo) {
  return idTexto(estadoDaSessao(estado, codigo)?.treinoAbertoId);
}

export function nomeDaSessao(rotina, codigo) {
  const sessao = sessoesDaRotina(rotina).find((item) => item.codigo === codigo);
  return sessao?.nome || (codigo ? `Treino ${codigo}` : 'treino anterior');
}

/** A sessão que pode ser iniciada agora é a próxima persistida pelo backend. */
export function sessaoLiberada(estado, codigo) {
  return Boolean(codigo) && estado?.proxima === codigo;
}

export function avisoBloqueio(rotina, estado) {
  const nome = nomeDaSessao(rotina, estado?.proxima);
  const artigo = /^o\s/i.test(nome) ? '' : 'o ';
  return `Conclua ${artigo}${nome} para liberar este treino.`;
}

/** Rótulo discreto: “em andamento” só quando a execução de fato começou. */
export function aparenciaDaSessao(situacao, proxima) {
  if (situacao?.status === 'concluida') return { status: 'concluida', rotulo: ROTULO_STATUS.concluida };
  if (!situacao || situacao.codigo !== proxima) {
    return { status: 'planejada', rotulo: ROTULO_STATUS.planejada };
  }
  if (situacao.execucaoIniciada) return { status: 'em_andamento', rotulo: ROTULO_STATUS.em_andamento };
  if (situacao.treinoAbertoId) return { status: 'planejada', rotulo: 'Não iniciado' };
  return { status: 'disponivel', rotulo: ROTULO_STATUS.disponivel };
}

/**
 * Próxima sessão do ciclo. "Em andamento" só quando existe ficha aberta da sessão; nada é dado
 * como feito por causa da data.
 */
export function proximaSessao(rotina, estado) {
  const codigo = estado?.proxima;
  const sessao = sessoesDaRotina(rotina).find((item) => item.codigo === codigo);
  if (!sessao) return null;
  const situacao = estadoDaSessao(estado, codigo);
  return {
    sessao,
    status: situacao?.status === 'em_andamento' ? 'em_andamento' : 'planejada',
    treinoAbertoId: situacao?.treinoAbertoId || null,
    execucaoIniciada: Boolean(situacao?.execucaoIniciada),
  };
}

/** Passos do modo flexível: sessões na ordem recomendada, com os descansos sugeridos. */
export function sequenciaFlexivel(rotina, estado) {
  const sessoes = sessoesDaRotina(rotina);
  const passos =
    Array.isArray(rotina?.sequencia) && rotina.sequencia.length
      ? rotina.sequencia
      : sessoes.map((sessao) => ({ codigo: sessao.codigo, descansoDepois: false }));
  const itens = [];
  passos.forEach((passo) => {
    const sessao = sessoes.find((item) => item.codigo === passo.codigo);
    if (!sessao) return;
    const situacao = estadoDaSessao(estado, sessao.codigo);
    itens.push({
      tipo: 'sessao',
      sessao,
      status: situacao?.status || 'planejada',
      proxima: estado?.proxima === sessao.codigo,
    });
    if (passo.descansoDepois) itens.push({ tipo: 'descanso' });
  });
  return itens;
}

/**
 * Semana atual no modo calendário. "Não realizada" é só exibição para um dia que já passou sem
 * conclusão registrada; não altera o histórico nem remarca a sessão.
 */
export function semanaCalendario(rotina, estado, hoje = new Date()) {
  const dias = Array.isArray(rotina?.agenda?.dias) ? rotina.agenda.dias.map(Number) : [];
  const sessoes = sessoesDaRotina(rotina);
  const segunda = inicioDaSemana(hoje);
  const diaHoje = diaDaSemana(hoje);
  return DIAS_SEMANA.map(({ dia, rotulo, curto }) => {
    const indice = dias.indexOf(dia);
    const sessao = indice >= 0 ? sessoes[indice] || null : null;
    const base = { dia, rotulo, curto, hoje: dia === diaHoje, sessao };
    if (!sessao) return { ...base, status: 'descanso' };
    const situacao = estadoDaSessao(estado, sessao.codigo);
    const conclusao = situacao?.ultimaConclusao ? new Date(situacao.ultimaConclusao) : null;
    const atual = Boolean(situacao) && estado?.proxima === sessao.codigo;
    let status = 'planejada';
    if (conclusao && !Number.isNaN(conclusao.getTime()) && conclusao >= segunda) {
      status = 'concluida';
    } else if (atual && situacao.execucaoIniciada) {
      status = 'em_andamento';
    } else if (atual && situacao.treinoAbertoId) {
      status = 'planejada';
    } else if (atual) {
      status = 'disponivel';
    } else if (dia < diaHoje) {
      status = 'nao_realizada';
    }
    return { ...base, status };
  });
}

const ROTULO_CARD = {
  concluida: 'Concluído',
  em_andamento: 'Em andamento',
  nao_realizada: 'Não realizado',
};

function idTexto(valor) {
  if (typeof valor === 'string' && valor) return valor;
  if (valor && typeof valor === 'object') {
    if (typeof valor.$oid === 'string') return valor.$oid;
    if (typeof valor.toHexString === 'function') return valor.toHexString();
  }
  return null;
}

function instanteDe(valor) {
  if (!valor) return null;
  const data = valor instanceof Date ? new Date(valor.getTime()) : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function fimDaSemana(segunda) {
  const fim = new Date(segunda.getTime());
  fim.setDate(fim.getDate() + 7);
  return fim;
}

function sessaoPorCodigo(rotina, codigo) {
  if (!codigo) return null;
  return sessoesDaRotina(rotina).find((item) => item.codigo === codigo) || null;
}

function nomeExibicao(sessao, treino) {
  if (sessao?.nome) return sessao.nome;
  const titulo = String(treino?.titulo || '')
    .split('·')[0]
    .trim();
  return titulo || 'Treino';
}

function focoExibicao(sessao) {
  return sessao?.focoRotulo || '';
}

function fichaAberta(situacao) {
  return idTexto(situacao?.treinoAbertoId);
}

function fichaConcluida(situacao) {
  return idTexto(situacao?.ultimoConcluidoId);
}

/**
 * Visão do Dashboard. O modo vem da agenda salva, não da quantidade de dias.
 * Consultar não cria ficha nem libera sessão fora da próxima persistida.
 */
export function visaoSemanal({ rotina, estado, treinos, hoje = new Date() } = {}) {
  const lista = Array.isArray(treinos) ? treinos : [];
  const sessoes = sessoesDaRotina(rotina);
  const atividade = atividadeRecente(rotina, lista, hoje);
  if (!sessoes.length) {
    return { modo: 'vazio', proximo: null, ...atividade };
  }
  const diasFixos =
    rotina?.agenda?.modo === 'calendario' &&
    Array.isArray(rotina.agenda?.dias) &&
    rotina.agenda.dias.length > 0;
  if (diasFixos) {
    return { modo: 'calendario', dias: diasDefinidos(rotina, estado, hoje) };
  }
  return {
    modo: 'flexivel',
    proximo: proximoTreino(rotina, estado),
    passos: passosVisiveis(rotina, estado),
    ...atividade,
  };
}

function passosVisiveis(rotina, estado) {
  const itens = sequenciaFlexivel(rotina, estado);
  // O descanso do último passo só fecha o ciclo. Não é um intervalo entre sessões.
  const semFecho = itens[itens.length - 1]?.tipo === 'descanso' ? itens.slice(0, -1) : itens;
  return semFecho.map((passo, indice) => {
    if (passo.tipo !== 'sessao') return { tipo: 'descanso', chave: `descanso-${indice}` };
    const situacao = estadoDaSessao(estado, passo.sessao.codigo);
    const visual = aparenciaDaSessao(
      situacao || { codigo: passo.sessao.codigo, status: 'planejada' },
      estado?.proxima,
    );
    const concluida = visual.status === 'concluida';
    const destaque = Boolean(passo.proxima) && !concluida;
    let rotulo = 'Em sequência';
    if (concluida) rotulo = 'Concluído';
    else if (visual.status === 'em_andamento') rotulo = 'Em andamento';
    else if (destaque) rotulo = 'Próximo treino';
    return {
      tipo: 'sessao',
      chave: passo.sessao.codigo,
      codigo: passo.sessao.codigo,
      nome: passo.sessao.nome || 'Treino',
      foco: focoExibicao(passo.sessao),
      rotulo,
      destaque,
      quando: concluida ? instanteDe(situacao?.ultimaConclusao) : null,
      treinoId: concluida ? fichaConcluida(situacao) : destaque ? fichaAberta(situacao) : null,
    };
  });
}

function proximoTreino(rotina, estado) {
  const proxima = proximaSessao(rotina, estado);
  if (!proxima) return null;
  const situacao = estadoDaSessao(estado, proxima.sessao.codigo);
  const visual = aparenciaDaSessao(
    situacao || { codigo: proxima.sessao.codigo, status: 'planejada' },
    estado?.proxima,
  );
  return {
    codigo: proxima.sessao.codigo,
    nome: proxima.sessao.nome || 'Treino',
    foco: focoExibicao(proxima.sessao),
    continuar: visual.status === 'em_andamento',
    treinoId: fichaAberta(situacao),
  };
}

function atividadeRecente(rotina, treinos, hoje) {
  const segunda = inicioDaSemana(hoje);
  const fim = fimDaSemana(segunda);
  const concluidos = treinos
    .filter((treino) => treino?.realizado === true)
    .map((treino) => ({ treino, quando: instanteDe(treino.dataRealizacao) }))
    .filter((item) => item.quando)
    .sort((a, b) => b.quando - a.quando);
  const ultimo = concluidos[0] || null;
  const semana = concluidos.filter((item) => item.quando >= segunda && item.quando < fim).length;
  return {
    recente: ultimo
      ? {
          nome: nomeExibicao(sessaoPorCodigo(rotina, ultimo.treino.rotinaCodigo), ultimo.treino),
          quando: ultimo.quando,
          treinoId: idTexto(ultimo.treino._id),
        }
      : null,
    semana,
  };
}

function diasDefinidos(rotina, estado, hoje) {
  return semanaCalendario(rotina, estado, hoje).map((dia) => {
    const situacao = dia.sessao ? estadoDaSessao(estado, dia.sessao.codigo) : null;
    const proxima = Boolean(dia.sessao) && estado?.proxima === dia.sessao.codigo && dia.status !== 'concluida';
    const titulo = dia.sessao ? dia.sessao.nome || 'Treino' : 'Descanso';
    let detalhe = '';
    if (dia.status === 'concluida' || dia.status === 'em_andamento' || dia.status === 'nao_realizada') {
      detalhe = ROTULO_CARD[dia.status];
    } else if (dia.sessao) {
      detalhe = focoExibicao(dia.sessao);
    }
    const treinoId =
      dia.status === 'concluida'
        ? fichaConcluida(situacao)
        : proxima
          ? fichaAberta(situacao)
          : null;
    return {
      dia: dia.dia,
      rotulo: dia.rotulo,
      hoje: dia.hoje,
      titulo,
      detalhe,
      status: dia.status,
      codigo: dia.sessao?.codigo || null,
      treinoId,
      proxima,
      clicavel: Boolean(dia.sessao),
    };
  });
}

function dataDoTreino(treino) {
  const bruta = treino?.dataRealizacao || treino?.updatedAt || treino?.createdAt;
  const data = bruta ? new Date(bruta) : null;
  return data && !Number.isNaN(data.getTime()) ? data : null;
}

/** Janela [de, ate) das últimas quatro semanas, incluindo a atual, para a consulta por período. */
export function janelaProgresso(hoje = new Date()) {
  const de = inicioDaSemana(hoje);
  de.setDate(de.getDate() - 21);
  const ate = new Date(hoje.getTime());
  ate.setHours(0, 0, 0, 0);
  ate.setDate(ate.getDate() + 1);
  return { de, ate };
}

/** Resumo discreto a partir dos treinos concluídos; sem treinos, devolve zeros e nenhum último. */
export function resumoProgresso(treinos, hoje = new Date()) {
  const segunda = inicioDaSemana(hoje);
  const { de } = janelaProgresso(hoje);
  const concluidos = (treinos || [])
    .filter((treino) => treino?.realizado)
    .map((treino) => ({ treino, quando: dataDoTreino(treino) }))
    .filter((item) => item.quando && item.quando >= de)
    .sort((a, b) => b.quando - a.quando);
  const semanas = new Set(
    concluidos.map((item) => Math.floor((inicioDaSemana(item.quando) - de) / (7 * 86400000))),
  );
  const ultimo = concluidos[0] || null;
  return {
    semana: concluidos.filter((item) => item.quando >= segunda).length,
    ultimasQuatro: concluidos.length,
    semanasAtivas: semanas.size,
    minutosSemana: Math.round(
      concluidos
        .filter((item) => item.quando >= segunda)
        .reduce((total, item) => total + (Number(item.treino.duracaoRealSegundos) || 0), 0) / 60,
    ),
    ultimo: ultimo ? { titulo: ultimo.treino.titulo || 'Treino', quando: ultimo.quando } : null,
  };
}

const ROTULO_EXPLICACAO = {
  estrutura: 'Divisão',
  frequencia: 'Frequência',
  fase: 'Perfil',
  prescricao: 'Intensidade',
  tempo: 'Duração',
  preferencias: 'Preferências',
  historico: 'Histórico',
  perfil: 'Perfil incompleto',
};

export const AJUDA_REPETICOES =
  'É quantas repetições você ainda conseguiria fazer no fim da série.';

/** Texto simples para o valor interno de reserva (ex.: "1-2"). Não altera o valor guardado. */
export function textoReserva(valor, feito = false) {
  const texto = String(valor ?? '')
    .trim()
    .replace('–', '-');
  if (!texto) return '';
  const faixa = texto.match(/^(\d+)\s*-\s*(\d+)$/);
  const unico = texto.match(/^(\d+)$/);
  let miolo;
  if (faixa) miolo = `${faixa[1]} ou ${faixa[2]} repetições sobrando`;
  else if (unico) {
    const n = Number(unico[1]);
    if (n === 0) miolo = 'nenhuma repetição sobrando';
    else if (n === 1) miolo = '1 repetição sobrando';
    else miolo = `${n} repetições sobrando`;
  } else miolo = `${texto.replace('-', ' ou ')} repetições sobrando`;
  if (feito || miolo.startsWith('nenhuma')) {
    return `${miolo.charAt(0).toUpperCase()}${miolo.slice(1)}.`;
  }
  const quantidade = miolo.replace(/ repetições sobrando$| repetição sobrando$/, '');
  const unidade = miolo.includes('repetição sobrando') && !miolo.includes('repetições')
    ? 'repetição'
    : 'repetições';
  return `Termine cada série sentindo que conseguiria fazer mais ${quantidade} ${unidade}.`;
}

/** Frase curta da ficha. O valor prescrito continua o mesmo. */
export function fraseCurtaReserva(valor) {
  const texto = String(valor ?? '')
    .trim()
    .replace('–', '-');
  if (!texto) return '';
  const faixa = texto.match(/^(\d+)\s*-\s*(\d+)$/);
  const unico = texto.match(/^(\d+)$/);
  if (faixa) return `Deixe ${faixa[1]} ou ${faixa[2]} repetições sobrando.`;
  if (unico) {
    const n = Number(unico[1]);
    if (n === 0) return 'Não deixe repetições sobrando.';
    if (n === 1) return 'Deixe 1 repetição sobrando.';
    return `Deixe ${n} repetições sobrando.`;
  }
  return `Deixe ${texto.replace('-', ' ou ')} repetições sobrando.`;
}

const TROCAS_DE_TERMO = [
  [/Nas duas últimas sessões/g, 'Nos dois últimos treinos'],
  [/nas duas últimas sessões/g, 'nos dois últimos treinos'],
  [/Na última sessão/g, 'No último treino'],
  [/na última sessão/g, 'no último treino'],
  [/Na próxima sessão/g, 'No próximo treino'],
  [/na próxima sessão/g, 'no próximo treino'],
  [/última sessão/g, 'último treino'],
  [/próxima sessão/g, 'próximo treino'],
  [/Cada sessão/g, 'Cada treino'],
  [/cada sessão/g, 'cada treino'],
  [/por sessão/g, 'por treino'],
  [/uma sessão/g, 'um treino'],
  [/da sessão/g, 'do treino'],
  [/na sessão/g, 'no treino'],
  [/\ba sessão\b/g, 'o treino'],
  [/As sessões/g, 'Os treinos'],
  [/as sessões/g, 'os treinos'],
  [/das sessões/g, 'dos treinos'],
  [/nas sessões/g, 'nos treinos'],
  [/sessões/g, 'treinos'],
  [/Sessões/g, 'Treinos'],
  [/sessão/g, 'treino'],
  [/Sessão/g, 'Treino'],
  [/mais volume semanal/gi, 'mais séries na semana'],
  [/o volume semanal/gi, 'a quantidade de séries na semana'],
  [/volume semanal/gi, 'quantidade de séries na semana'],
  [/\bprescrição\b/gi, 'treino planejado'],
];

function textoDaReserva(faixa) {
  return String(faixa || '')
    .split(/\s+ou\s+/)
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((parte) => {
      const normal = parte.replace('–', '-');
      const intervalo = normal.match(/^(\d+)\s*-\s*(\d+)$/);
      if (intervalo) return `${intervalo[1]} ou ${intervalo[2]}`;
      if (normal === '0') return 'nenhuma';
      if (normal === '1') return '1';
      return normal;
    });
}

/** Troca siglas e termos da explicação por frases curtas, sem mudar os números. */
export function simplificarTexto(texto) {
  let atual = String(texto || '').trim();
  if (!atual || /^RIR é/i.test(atual)) return '';
  atual = atual.replace(/\s*RIR é[^.]*\.?/gi, '');
  atual = atual.replace(
    /registrou RIR\s*0\s*\(nenhuma repetição de reserva\)/gi,
    'registrou que não sobrou nenhuma repetição',
  );
  atual = atual.replace(/RIR\s*0\s*\(nenhuma repetição de reserva\)/gi, 'nenhuma repetição sobrando');
  atual = atual.replace(/,?\s*RIR\s+([^.]+)/gi, (_, faixa) => {
    const partes = textoDaReserva(faixa);
    if (!partes.length) return '';
    if (partes.length === 1 && partes[0] === 'nenhuma') return '. Sem repetição sobrando';
    if (partes.length === 1 && partes[0] === '1') {
      return '. Termine cada série sentindo que conseguiria fazer mais 1 repetição';
    }
    return `. Termine cada série sentindo que conseguiria fazer mais ${partes.join(', ou ')} repetições`;
  });
  atual = atual.replace(/\bRIR\b/g, 'repetições sobrando');
  atual = atual.replace(/descanso de (\d+)\s*s a (\d+)\s*s\b/gi, '$1 a $2 segundos de descanso');
  atual = atual.replace(/descanso de (\d+)\s*s\b/gi, '$1 segundos de descanso');
  atual = atual.replace(/descanso de (\d+)\s*min\b/gi, '$1 minutos de descanso');
  atual = atual.replace(/,\s*(\d+(?: a \d+)? segundos de descanso)/g, ' · $1');
  TROCAS_DE_TERMO.forEach(([de, para]) => {
    atual = atual.replace(de, para);
  });
  atual = atual.replace(/(^|(?<=\.\s))Principal:/g, 'Exercícios principais:');
  atual = atual.replace(/(^|(?<=\.\s))Compostos:/g, 'Exercícios compostos:');
  atual = atual.replace(/(^|(?<=\.\s))Complementares:/g, 'Exercícios complementares:');
  return atual
    .replace(/\s+\./g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const TECNICO =
  /séries diretas|indiretas|meta semanal|coeficiente|pondera|volume semanal|metade das/i;

function fraseParaLeigo(frase) {
  if (TECNICO.test(frase)) {
    return 'Distribuímos os exercícios para trabalhar os músculos de forma equilibrada.';
  }
  return simplificarTexto(frase);
}

/** Frases do texto gerado pelo motor, sem reescrever o conteúdo. */
export function frasesDe(texto) {
  return String(texto || '')
    .split(/(?<=\.)\s+/)
    .map((frase) => frase.trim())
    .filter(Boolean);
}

/**
 * Cada justificativa vira um rótulo curto e frases simples.
 * A organização da semana fica de fora da tela; a sequência continua no motor.
 */
export function resumirExplicacoes(explicacao) {
  return (Array.isArray(explicacao) ? explicacao : [])
    .filter((item) => item?.tipo !== 'agenda')
    .map((item) => {
      const bruto = typeof item === 'string' ? item : item?.texto;
      const frases = frasesDe(bruto);
      const linhas = [];
      frases.map(fraseParaLeigo).filter(Boolean).forEach((linha) => {
        if (!linhas.includes(linha)) linhas.push(linha);
      });
      const ajuda = frases.some((frase) => /^RIR é/i.test(frase)) ? AJUDA_REPETICOES : '';
      return {
        tipo: item?.tipo || 'outro',
        rotulo: ROTULO_EXPLICACAO[item?.tipo] || item?.titulo || 'Rotina',
        linhas,
        ajuda,
      };
    })
    .filter((item) => item.linhas.length);
}

function juntarNomes(partes) {
  if (partes.length <= 1) return partes[0] || '';
  return `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`;
}

/**
 * Separa a prévia em alertas visíveis e observações opcionais.
 * Sem a classificação do motor, só um grupo descoberto vira alerta. Textos antigos não viram card.
 */
export function separarMensagens(proposta) {
  const brutas = Array.isArray(proposta?.mensagens) ? proposta.mensagens : null;
  if (!brutas) {
    const grupos = (Array.isArray(proposta?.gruposDescobertos) ? proposta.gruposDescobertos : []).filter(
      (nome) => typeof nome === 'string' && nome,
    );
    if (!grupos.length) return { importantes: [], observacoes: [] };
    const verbo = grupos.length === 1 ? 'ficou' : 'ficaram';
    return {
      importantes: [
        {
          codigo: 'sem_estimulo',
          nivel: 'bloqueio',
          resumo: `${juntarNomes(grupos)} ${verbo} sem exercício nesta semana. Ajuste a duração ou as preferências.`,
          acao: 'preferencias',
        },
      ],
      observacoes: [],
    };
  }
  const importantes = [];
  const observacoes = [];
  brutas.forEach((item) => {
    if (!item || typeof item.resumo !== 'string' || !item.resumo.trim()) return;
    if (item.nivel === 'observacao') observacoes.push(item);
    else if (item.nivel === 'bloqueio' || item.nivel === 'atencao') importantes.push(item);
  });
  return { importantes, observacoes };
}

export function quandoRelativo(data, hoje = new Date()) {
  if (!data) return '';
  const alvo = new Date(data);
  if (Number.isNaN(alvo.getTime())) return '';
  const zero = (d) => {
    const copia = new Date(d.getTime());
    copia.setHours(0, 0, 0, 0);
    return copia;
  };
  const dias = Math.round((zero(hoje) - zero(alvo)) / 86400000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return alvo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function preferenciasIniciais(rotina, opcoes) {
  const salvas = rotina?.preferencias || {};
  const todos = (opcoes?.equipamentos || []).map((item) => item.id);
  const equipamentos = Array.isArray(salvas.equipamentos) && salvas.equipamentos.length
    ? salvas.equipamentos.filter((id) => !todos.length || todos.includes(id))
    : todos;
  return {
    ...PREFERENCIAS_PADRAO,
    equipamentos,
    preferenciaEquipamento: salvas.preferenciaEquipamento || 'indiferente',
    evitar: Array.isArray(salvas.evitar) ? [...new Set(salvas.evitar)] : [],
    limitacoes: Array.isArray(salvas.limitacoes) ? [...salvas.limitacoes] : [],
  };
}

export function normalizarBusca(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** No máximo `maximo` exercícios cujo nome contém o termo, sem repetir os já escolhidos. */
export function filtrarExercicios(exercicios, termo, selecionados = [], maximo = 8) {
  const consulta = normalizarBusca(termo);
  if (consulta.length < 2) return [];
  const escolhidos = new Set(selecionados);
  const vistos = new Set();
  const lista = [];
  for (const item of exercicios || []) {
    if (!item?.id || escolhidos.has(item.id) || vistos.has(item.id)) continue;
    if (!normalizarBusca(item.nome).includes(consulta)) continue;
    vistos.add(item.id);
    lista.push(item);
    if (lista.length >= maximo) break;
  }
  return lista;
}

export function alternarItem(lista, valor, limite = Infinity) {
  const atual = Array.isArray(lista) ? lista : [];
  if (atual.includes(valor)) return atual.filter((item) => item !== valor);
  if (atual.length >= limite) return atual;
  return [...atual, valor];
}

/** Corpo comum de prévia, alternativas e salvamento. Campos vazios ficam de fora. */
export function corpoDaRotina({ perfil, preferencias, variacao, estrategia, agenda, ajustes }) {
  const corpo = {
    perfil: {
      trainingGoal: perfil.trainingGoal,
      trainingExperience: perfil.trainingExperience,
      recentFrequency: perfil.recentFrequency,
      availableDays: Number(perfil.availableDays),
      preferredSessionMinutes: Number(perfil.preferredSessionMinutes),
    },
    preferencias: {
      equipamentos: preferencias.equipamentos,
      preferenciaEquipamento: preferencias.preferenciaEquipamento,
      evitar: preferencias.evitar,
      limitacoes: preferencias.limitacoes,
    },
  };
  if (variacao) corpo.variacao = variacao;
  if (estrategia) corpo.estrategia = estrategia;
  if (agenda?.modo === 'calendario') {
    corpo.agenda =
      Array.isArray(agenda.dias) && agenda.dias.length
        ? { modo: 'calendario', dias: agenda.dias.map(Number).sort((a, b) => a - b) }
        : { modo: 'calendario' };
  } else if (agenda?.modo === 'flexivel') {
    corpo.agenda = { modo: 'flexivel' };
  }
  if (ajustes?.length) corpo.ajustes = ajustes;
  return corpo;
}

/** Registra a troca escolhida para uma posição, substituindo uma troca anterior na mesma vaga. */
export function aplicarAjuste(ajustes, sessao, posicao, exercicioId) {
  const restantes = (ajustes || []).filter(
    (item) => !(item.sessao === sessao && Number(item.posicao) === Number(posicao)),
  );
  return [...restantes, { sessao, posicao: Number(posicao), exercicioId }];
}

const PERSONALIZACAO_VAZIA = { variacao: 0, estrategia: null, agenda: null, ajustes: [] };

function trocasSimples(ajustes) {
  return (ajustes || []).map(({ sessao, posicao, exercicioId }) => ({
    sessao,
    posicao: Number(posicao),
    exercicioId,
  }));
}

/** Personalização da rotina ativa, para que editar sem mudar nada reproduza a mesma rotina. */
export function personalizacaoInicial(rotina) {
  if (!rotina) return { ...PERSONALIZACAO_VAZIA };
  const dias = rotina.agenda?.dias;
  return {
    variacao: Number(rotina.variacao) || 0,
    estrategia: rotina.entrada?.estrategiaPedida || null,
    agenda:
      rotina.agenda?.modo === 'calendario' && Array.isArray(dias) && dias.length
        ? { modo: 'calendario', dias: dias.map(Number) }
        : null,
    ajustes: trocasSimples(rotina.ajustes),
  };
}

/**
 * Personalização pedida depois de uma mudança. Trocas manuais dependem dos exercícios montados,
 * então perfil, preferências, estrutura ou variação novos as desfazem.
 */
export function personalizacaoApos(atual, mudanca) {
  const base = { ...PERSONALIZACAO_VAZIA, ...atual };
  switch (mudanca?.tipo) {
    case 'agenda': {
      const proxima = { ...base, agenda: mudanca.agenda };
      if (Object.prototype.hasOwnProperty.call(mudanca, 'estrategia')) {
        const pedida = mudanca.estrategia || null;
        if (pedida !== (base.estrategia || null)) proxima.ajustes = [];
        proxima.estrategia = pedida;
      }
      return proxima;
    }
    case 'troca':
      return {
        ...base,
        ajustes: aplicarAjuste(base.ajustes, mudanca.sessao, mudanca.posicao, mudanca.exercicioId),
      };
    case 'estrategia':
      return { ...base, estrategia: mudanca.estrategia || null, ajustes: [] };
    case 'variacao':
      return { ...base, variacao: mudanca.variacao, ajustes: [] };
    default:
      return { ...base, ajustes: [] };
  }
}

/** Segunda tentativa quando os dias fixos podem não bater com o novo número de sessões. */
export function semDiasFixos(personalizacao) {
  const agenda = personalizacao?.agenda;
  if (agenda?.modo !== 'calendario' || !Array.isArray(agenda.dias) || !agenda.dias.length) {
    return null;
  }
  return { ...personalizacao, agenda: { modo: 'calendario', dias: null } };
}

/** Personalização como o servidor a aplicou: dias sugeridos e trocas efetivas da proposta. */
export function personalizacaoConfirmada(usada, proposta) {
  let agenda = null;
  if (usada?.agenda) {
    agenda =
      proposta?.agenda?.modo === 'calendario'
        ? { modo: 'calendario', dias: (proposta.agenda.dias || []).map(Number) }
        : { modo: 'flexivel' };
  }
  return { ...PERSONALIZACAO_VAZIA, ...usada, agenda, ajustes: trocasSimples(proposta?.ajustes) };
}

const CAMPOS_PERFIL = [
  ['trainingGoal', 'Objetivo'],
  ['trainingExperience', 'Experiência'],
  ['recentFrequency', 'Frequência recente'],
  ['availableDays', 'Dias disponíveis'],
  ['preferredSessionMinutes', 'Duração da sessão'],
];

/** Campos de treino que serão gravados no perfil ao salvar a rotina. */
export function mudancasNoPerfil(original, rascunho) {
  return CAMPOS_PERFIL.filter(([campo]) => {
    const antes = original?.[campo];
    const depois = rascunho?.[campo];
    const normalizar = (valor) =>
      valor === null || valor === undefined || valor === '' ? '' : String(valor);
    return normalizar(antes) !== normalizar(depois);
  }).map(([, rotulo]) => rotulo);
}

export function diasValidos(agenda, sessoes) {
  if (agenda?.modo !== 'calendario') return true;
  const dias = new Set((agenda.dias || []).map(Number));
  return dias.size === Number(sessoes) && [...dias].every((dia) => dia >= 1 && dia <= 7);
}

export function novaChave() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const parte = () => Math.random().toString(16).slice(2, 10).padEnd(8, '0');
  return `${parte()}-${parte()}-${parte()}-${parte()}`;
}

export function mensagemDeErro(error, padrao = 'Não foi possível concluir agora.') {
  if (!error?.response) {
    return 'Sem resposta do servidor. Verifique sua conexão e tente de novo.';
  }
  if (error.response.status === 401) {
    return 'Sua sessão expirou. Entre novamente para continuar.';
  }
  const dados = error.response.data || {};
  const detalhe = Array.isArray(dados.details) && dados.details.length ? dados.details[0]?.msg : '';
  return detalhe || dados.message || dados.error || padrao;
}

export function codigoDoErro(error) {
  return error?.response?.data?.codigo || null;
}
