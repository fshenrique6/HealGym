import assert from 'node:assert/strict';
import test from 'node:test';
import {
  alternarItem,
  aplicarAjuste,
  corpoDaRotina,
  diaDaSemana,
  diasValidos,
  inicioDaSemana,
  janelaProgresso,
  divisaoCurta,
  listaDeDias,
  resumoDaProgramacao,
  mensagemDeErro,
  oQueVaiMudar,
  separarMensagens,
  mudancasNoPerfil,
  personalizacaoApos,
  personalizacaoConfirmada,
  personalizacaoInicial,
  filtrarExercicios,
  preferenciasIniciais,
  proximaSessao,
  semDiasFixos,
  quandoRelativo,
  aparenciaDaSessao,
  avisoBloqueio,
  resumirExplicacoes,
  idDaSessaoAberta,
  sessaoLiberada,
  resumoProgresso,
  simplificarTexto,
  fraseCurtaReserva,
  textoReserva,
  semanaCalendario,
  sequenciaFlexivel,
  visaoSemanal,
} from './rotina.js';

// 22/11/2026 é domingo; 16/11/2026 é a segunda-feira da mesma semana.
const domingo = new Date(2026, 10, 22, 10, 0);
const quarta = new Date(2026, 10, 18, 9, 30);

const rotina = {
  sessoes: [
    { codigo: 'A', nome: 'Treino A', focoRotulo: 'Superiores' },
    { codigo: 'B', nome: 'Treino B', focoRotulo: 'Inferiores' },
    { codigo: 'C', nome: 'Treino C', focoRotulo: 'Corpo inteiro' },
  ],
  sequencia: [
    { codigo: 'A', descansoDepois: false },
    { codigo: 'B', descansoDepois: true },
    { codigo: 'C', descansoDepois: true },
  ],
  agenda: { modo: 'calendario', dias: [1, 3, 7] },
};

test('domingo é o dia 7 e pertence à semana que começou na segunda anterior', () => {
  assert.equal(diaDaSemana(domingo), 7);
  assert.equal(diaDaSemana(new Date(2026, 10, 16, 0, 0)), 1);
  const segunda = inicioDaSemana(domingo);
  assert.equal(segunda.getDate(), 16);
  assert.equal(segunda.getMonth(), 10);
  assert.equal(segunda.getHours(), 0);
});

test('calendário: domingo pode ser dia de treino e dias sem sessão são descanso', () => {
  const semana = semanaCalendario(rotina, { sessoes: [] }, quarta);
  assert.equal(semana.length, 7);
  assert.equal(semana[6].sessao.codigo, 'C');
  assert.equal(semana[6].status, 'planejada');
  assert.equal(semana[1].status, 'descanso');
  assert.equal(semana[2].hoje, true);
});

test('calendário: dia passado sem conclusão aparece como não realizado, sem virar concluído', () => {
  const estado = { sessoes: [{ codigo: 'A', status: 'planejada', concluidas: 0 }] };
  const semana = semanaCalendario(rotina, estado, quarta);
  assert.equal(semana[0].status, 'nao_realizada');
  assert.equal(semana[2].status, 'planejada');
});

test('calendário: só conta como concluída a conclusão registrada nesta semana', () => {
  const estado = {
    sessoes: [
      { codigo: 'A', status: 'planejada', ultimaConclusao: new Date(2026, 10, 16, 18).toISOString() },
      { codigo: 'B', status: 'planejada', ultimaConclusao: new Date(2026, 10, 11, 18).toISOString() },
      { codigo: 'C', status: 'em_andamento', treinoAbertoId: 'abc' },
    ],
  };
  const semana = semanaCalendario(rotina, estado, domingo);
  assert.equal(semana[0].status, 'concluida');
  assert.equal(semana[2].status, 'nao_realizada');
  assert.equal(semana[6].status, 'planejada');
  const emExecucao = semanaCalendario(
    rotina,
    {
      proxima: 'C',
      sessoes: [{ codigo: 'C', status: 'em_andamento', treinoAbertoId: 'abc', execucaoIniciada: true }],
    },
    domingo,
  );
  assert.equal(emExecucao[6].status, 'em_andamento');
});

test('próxima sessão: em andamento só com ficha aberta; código desconhecido não quebra', () => {
  const aberta = proximaSessao(rotina, {
    proxima: 'B',
    sessoes: [{ codigo: 'B', status: 'em_andamento', treinoAbertoId: 'x1', execucaoIniciada: true }],
  });
  assert.equal(aberta.sessao.codigo, 'B');
  assert.equal(aberta.status, 'em_andamento');
  assert.equal(aberta.treinoAbertoId, 'x1');
  assert.equal(aberta.execucaoIniciada, true);

  const planejada = proximaSessao(rotina, { proxima: 'A', sessoes: [{ codigo: 'A', status: 'concluida' }] });
  assert.equal(planejada.status, 'planejada');
  assert.equal(planejada.treinoAbertoId, null);

  assert.equal(proximaSessao(rotina, { proxima: 'Z' }), null);
  assert.equal(proximaSessao(null, null), null);
});

test('modo flexível: segue a sequência recomendada e insere os descansos sugeridos', () => {
  const passos = sequenciaFlexivel(rotina, { proxima: 'B', sessoes: [{ codigo: 'A', status: 'concluida' }] });
  assert.deepEqual(
    passos.map((passo) => (passo.tipo === 'sessao' ? passo.sessao.codigo : 'descanso')),
    ['A', 'B', 'descanso', 'C', 'descanso'],
  );
  assert.equal(passos[0].status, 'concluida');
  assert.equal(passos[1].proxima, true);
  assert.equal(passos[3].status, 'planejada');
});

test('calendário do dashboard usa os dias salvos, inclusive domingo, e não marca o futuro como feito', () => {
  const estado = {
    proxima: 'B',
    sessoes: [
      { codigo: 'A', status: 'concluida', ultimaConclusao: new Date(2026, 10, 16, 19).toISOString(), ultimoConcluidoId: 'ficha-a' },
      { codigo: 'B', status: 'em_andamento', treinoAbertoId: 'ficha-b', execucaoIniciada: true },
      { codigo: 'C', status: 'planejada' },
    ],
  };
  const visao = visaoSemanal({ rotina, estado, treinos: [], hoje: quarta });
  assert.equal(visao.modo, 'calendario');
  assert.equal(visao.dias.length, 7);
  assert.equal(visao.dias[0].titulo, 'Treino A');
  assert.equal(visao.dias[0].detalhe, 'Concluído');
  assert.equal(visao.dias[0].treinoId, 'ficha-a');
  assert.equal(visao.dias[1].titulo, 'Descanso');
  assert.equal(visao.dias[1].clicavel, false);
  assert.equal(visao.dias[2].titulo, 'Treino B');
  assert.equal(visao.dias[2].detalhe, 'Em andamento');
  assert.equal(visao.dias[2].treinoId, 'ficha-b');
  assert.equal(visao.dias[2].proxima, true);
  assert.equal(visao.dias[6].titulo, 'Treino C');
  assert.equal(visao.dias[6].detalhe, 'Corpo inteiro');
  assert.equal(visao.dias[6].treinoId, null);
  assert.equal(visao.dias[6].proxima, false);
  assert.equal(visao.dias[6].status, 'planejada');
  const atrasada = visaoSemanal({
    rotina,
    estado: {
      proxima: 'B',
      sessoes: [
        { codigo: 'A', status: 'planejada' },
        { codigo: 'B', status: 'planejada' },
      ],
    },
    hoje: quarta,
  });
  assert.equal(atrasada.dias[0].detalhe, 'Não realizado');
  assert.equal(atrasada.dias[0].treinoId, null);
  assert.equal(atrasada.dias[2].detalhe, 'Inferiores');
  assert.equal(atrasada.dias[2].proxima, true);
  assert.equal(atrasada.dias[2].treinoId, null);
});

test('um dia e seis dias seguem a agenda salva, e trocar os dias muda a distribuição', () => {
  const uma = visaoSemanal({
    rotina: { sessoes: [{ codigo: 'A', nome: 'Treino A', focoRotulo: 'Empurrar' }], agenda: { modo: 'calendario', dias: [7] } },
    estado: { proxima: 'A', sessoes: [] },
    hoje: domingo,
  });
  assert.equal(uma.dias[6].titulo, 'Treino A');
  assert.equal(uma.dias[6].hoje, true);
  assert.equal(uma.dias[0].status, 'descanso');

  const seis = visaoSemanal({
    rotina: {
      sessoes: ['A', 'B', 'C', 'D', 'E', 'F'].map((codigo) => ({ codigo, nome: `Treino ${codigo}` })),
      agenda: { modo: 'calendario', dias: [1, 2, 3, 4, 5, 6] },
    },
    estado: { proxima: 'A', sessoes: [] },
    hoje: quarta,
  });
  assert.deepEqual(
    seis.dias.map((dia) => dia.titulo),
    ['Treino A', 'Treino B', 'Treino C', 'Treino D', 'Treino E', 'Treino F', 'Descanso'],
  );

  const reorganizado = visaoSemanal({
    rotina: { ...rotina, agenda: { modo: 'calendario', dias: [2, 4, 6] } },
    estado: { proxima: 'A', sessoes: [] },
    hoje: quarta,
  });
  assert.equal(reorganizado.dias[0].status, 'descanso');
  assert.equal(reorganizado.dias[1].titulo, 'Treino A');
  assert.equal(reorganizado.dias[3].titulo, 'Treino B');
  assert.equal(reorganizado.dias[5].titulo, 'Treino C');
});

test('rotina flexível resume o próximo treino e a atividade real, sem grade de dias', () => {
  const flexivel = {
    ...rotina,
    agenda: { modo: 'flexivel' },
    perfil: { availableDays: 6 },
  };
  const estado = {
    proxima: 'B',
    sessoes: [
      { codigo: 'A', status: 'concluida', ultimoConcluidoId: 'feita', ultimaConclusao: new Date(2026, 10, 16, 18).toISOString() },
      { codigo: 'B', status: 'em_andamento', treinoAbertoId: 'aberta', abertoDesde: new Date(2026, 10, 18, 7).toISOString(), execucaoIniciada: true },
      { codigo: 'C', status: 'planejada' },
    ],
  };
  const treinos = [
    { _id: 'feita', realizado: true, rotinaCodigo: 'A', titulo: 'Treino A · Superiores', dataRealizacao: new Date(2026, 10, 16, 18).toISOString() },
    { _id: 'aberta', realizado: false, rotinaCodigo: 'B', createdAt: new Date(2026, 10, 18, 7).toISOString() },
    { _id: 'antigo', realizado: true, titulo: 'Treino antigo', dataRealizacao: new Date(2026, 10, 10, 8).toISOString() },
    { _id: 'sem-data', realizado: true, titulo: 'Sem data', updatedAt: new Date(2026, 10, 18, 12).toISOString() },
  ];
  const visao = visaoSemanal({ rotina: flexivel, estado, treinos, hoje: quarta });
  assert.equal(visao.modo, 'flexivel');
  assert.equal(visao.dias, undefined);
  assert.equal(visao.proximo.codigo, 'B');
  assert.equal(visao.proximo.nome, 'Treino B');
  assert.equal(visao.proximo.foco, 'Inferiores');
  assert.equal(visao.proximo.continuar, true);
  assert.equal(visao.proximo.treinoId, 'aberta');
  assert.equal(visao.recente.nome, 'Treino A');
  assert.equal(visao.recente.quando.getDate(), 16);
  assert.equal(visao.recente.treinoId, 'feita');
  assert.equal(visao.semana, 1);
  assert.deepEqual(
    visao.passos.map((passo) => (passo.tipo === 'descanso' ? 'descanso' : passo.codigo)),
    ['A', 'B', 'descanso', 'C'],
  );
  assert.equal(visao.passos[0].rotulo, 'Concluído');
  assert.equal(visao.passos[0].foco, 'Superiores');
  assert.equal(visao.passos[0].quando.getDate(), 16);
  assert.equal(visao.passos[0].treinoId, 'feita');
  assert.equal(visao.passos[0].destaque, false);
  assert.equal(visao.passos[1].quando, null);
  assert.equal(visao.passos[1].rotulo, 'Em andamento');
  assert.equal(visao.passos[1].destaque, true);
  assert.equal(visao.passos[1].treinoId, 'aberta');
  assert.equal(visao.passos[3].rotulo, 'Em sequência');
  assert.equal(visao.passos[3].treinoId, null);
});

test('rotina flexível sem conclusões mostra só o próximo treino', () => {
  const visao = visaoSemanal({
    rotina: { sessoes: rotina.sessoes, agenda: { modo: 'flexivel' } },
    estado: { proxima: 'A', sessoes: [{ codigo: 'A', status: 'planejada' }] },
    treinos: [],
    hoje: quarta,
  });
  assert.equal(visao.proximo.nome, 'Treino A');
  assert.equal(visao.proximo.foco, 'Superiores');
  assert.equal(visao.proximo.continuar, false);
  assert.equal(visao.proximo.treinoId, null);
  assert.equal(visao.recente, null);
  assert.equal(visao.semana, 0);
  assert.equal(visao.dias, undefined);
  assert.equal(visao.passos[0].rotulo, 'Próximo treino');
  assert.equal(visao.passos[0].foco, 'Superiores');
  assert.equal(visao.passos[0].destaque, true);
  assert.equal(visao.passos[0].treinoId, null);
  assert.equal(visao.passos[1].rotulo, 'Em sequência');
  assert.equal(visao.passos[1].treinoId, null);
  assert.equal(visao.passos.some((passo) => passo.tipo === 'descanso'), false);
  assert.equal(visao.passos.some((passo) => passo.rotulo?.includes('Segunda')), false);
});

test('sem rotina o resumo não inventa dias e preserva a conclusão registrada', () => {
  const visao = visaoSemanal({
    rotina: null,
    estado: null,
    treinos: [
      { _id: 'legado', realizado: true, titulo: 'Peito e tríceps', dataRealizacao: new Date(2026, 10, 17, 9).toISOString() },
    ],
    hoje: quarta,
  });
  assert.equal(visao.modo, 'vazio');
  assert.equal(visao.proximo, null);
  assert.equal(visao.dias, undefined);
  assert.equal(visao.recente.nome, 'Peito e tríceps');
  assert.equal(visao.recente.quando.getDate(), 17);
  assert.equal(visao.semana, 1);
});

test('agenda antiga sem modo continua flexível, sem atribuir treinos aos dias', () => {
  const visao = visaoSemanal({
    rotina: { sessoes: rotina.sessoes },
    estado: { proxima: 'A', sessoes: [{ codigo: 'A', status: 'planejada' }] },
    treinos: [],
    hoje: quarta,
  });
  assert.equal(visao.modo, 'flexivel');
  assert.equal(visao.proximo.nome, 'Treino A');
  assert.equal(visao.proximo.foco, 'Superiores');
  assert.equal(visao.proximo.treinoId, null);
  assert.equal(visao.dias, undefined);
  assert.deepEqual(
    visao.passos.map((passo) => passo.codigo || passo.tipo),
    ['A', 'B', 'C'],
  );
  assert.equal(visao.passos[0].rotulo, 'Próximo treino');
});

test('execução em andamento sem data de conclusão não vira treino feito', () => {
  const visao = visaoSemanal({
    rotina: { sessoes: rotina.sessoes, agenda: { modo: 'flexivel' } },
    estado: { proxima: 'A', sessoes: [{ codigo: 'A', status: 'em_andamento', treinoAbertoId: 'aberta', execucaoIniciada: true }] },
    treinos: [{ _id: 'aberta', realizado: false, createdAt: new Date(2026, 10, 18, 7).toISOString() }],
    hoje: quarta,
  });
  assert.equal(visao.proximo.continuar, true);
  assert.equal(visao.proximo.treinoId, 'aberta');
  assert.equal(visao.recente, null);
  assert.equal(visao.semana, 0);
  assert.equal(visao.passos[0].rotulo, 'Em andamento');
  assert.equal(visao.passos[0].destaque, true);
  assert.equal(visao.passos[0].treinoId, 'aberta');
  assert.equal(visao.passos[1].treinoId, null);

  const fichaAberta = visaoSemanal({
    rotina: { sessoes: rotina.sessoes, agenda: { modo: 'flexivel' } },
    estado: { proxima: 'A', sessoes: [{ codigo: 'A', status: 'em_andamento', treinoAbertoId: 'aberta' }] },
    treinos: [],
    hoje: quarta,
  });
  assert.equal(fichaAberta.passos[0].rotulo, 'Próximo treino');
  assert.equal(fichaAberta.passos[0].destaque, true);
  assert.equal(fichaAberta.passos[0].treinoId, 'aberta');
});

test('faixa flexível mostra só o descanso marcado entre sessões', () => {
  const sessoes = ['A', 'B', 'C', 'D', 'E', 'F'].map((codigo) => ({
    codigo,
    nome: `Treino ${codigo}`,
    focoRotulo: 'Corpo inteiro',
  }));
  const visaoDe = (codigos, descansoNos, proxima, situacoes) =>
    visaoSemanal({
      rotina: {
        sessoes: sessoes.filter((sessao) => codigos.includes(sessao.codigo)),
        sequencia: codigos.map((codigo, indice) => ({
          codigo,
          descansoDepois: descansoNos.includes(indice),
        })),
        agenda: { modo: 'flexivel' },
      },
      estado: { proxima, sessoes: situacoes },
      treinos: [],
      hoje: quarta,
    });
  const marcas = (visao) => visao.passos.map((passo) => (passo.tipo === 'descanso' ? 'descanso' : passo.codigo));

  assert.deepEqual(marcas(visaoDe(['A'], [0], 'A', [])), ['A']);
  assert.equal(visaoDe(['A'], [0], 'A', []).passos[0].rotulo, 'Próximo treino');
  assert.equal(visaoDe(['A'], [0], 'A', []).passos[0].foco, 'Corpo inteiro');

  assert.deepEqual(marcas(visaoDe(['A', 'B'], [1], 'A', [])), ['A', 'B']);
  assert.deepEqual(
    marcas(visaoDe(['A', 'B', 'C'], [1, 2], 'B', [{ codigo: 'A', status: 'concluida', ultimoConcluidoId: 'feita' }])),
    ['A', 'B', 'descanso', 'C'],
  );
  const quatro = visaoDe(['A', 'B', 'C', 'D'], [3], 'A', []);
  assert.deepEqual(marcas(quatro), ['A', 'B', 'C', 'D']);
  assert.equal(quatro.passos.filter((passo) => passo.tipo === 'sessao').length, 4);
  assert.equal(quatro.passos[1].rotulo, 'Em sequência');
  assert.equal(quatro.passos[1].treinoId, null);

  assert.deepEqual(marcas(visaoDe(['A', 'B', 'C', 'D', 'E'], [4], 'A', [])), ['A', 'B', 'C', 'D', 'E']);

  const seis = visaoDe(
    ['A', 'B', 'C', 'D', 'E', 'F'],
    [2, 5],
    'D',
    [
      { codigo: 'A', status: 'concluida', ultimaConclusao: new Date(2026, 10, 16, 18).toISOString(), ultimoConcluidoId: 'feita-a' },
      { codigo: 'B', status: 'concluida', ultimaConclusao: new Date(2026, 10, 17, 18).toISOString() },
      { codigo: 'C', status: 'concluida' },
      { codigo: 'D', status: 'planejada' },
    ],
  );
  assert.deepEqual(marcas(seis), ['A', 'B', 'C', 'descanso', 'D', 'E', 'F']);
  assert.equal(seis.passos[0].quando.getDate(), 16);
  assert.equal(seis.passos[1].quando.getDate(), 17);
  assert.equal(seis.passos[2].quando, null);
  assert.equal(seis.passos[4].rotulo, 'Próximo treino');
  assert.equal(seis.passos[4].destaque, true);
  assert.equal(seis.passos[4].treinoId, null);
  assert.equal(seis.passos[5].rotulo, 'Em sequência');
  assert.equal(seis.passos[5].treinoId, null);
  assert.equal(seis.dias, undefined);
});

test('modo flexível sem sequência gravada usa a ordem das sessões', () => {
  const passos = sequenciaFlexivel({ sessoes: rotina.sessoes }, null);
  assert.deepEqual(passos.map((passo) => passo.sessao.codigo), ['A', 'B', 'C']);
});

test('progresso usa apenas treinos concluídos e registrados dentro da janela', () => {
  const treinos = [
    { titulo: 'Treino A', realizado: true, dataRealizacao: new Date(2026, 10, 21, 8).toISOString(), duracaoRealSegundos: 3000 },
    { titulo: 'Treino C', realizado: true, dataRealizacao: new Date(2026, 10, 17, 8).toISOString(), duracaoRealSegundos: 2400 },
    { titulo: 'Treino B', realizado: true, dataRealizacao: new Date(2026, 10, 10, 8).toISOString() },
    { titulo: 'Antigo', realizado: true, dataRealizacao: new Date(2026, 9, 1, 8).toISOString() },
    { titulo: 'Aberto', realizado: false, createdAt: new Date(2026, 10, 22, 8).toISOString() },
  ];
  const resumo = resumoProgresso(treinos, domingo);
  assert.equal(resumo.semana, 2);
  assert.equal(resumo.ultimasQuatro, 3);
  assert.equal(resumo.semanasAtivas, 2);
  assert.equal(resumo.minutosSemana, 90);
  assert.equal(resumo.ultimo.titulo, 'Treino A');
});

test('sem treinos registrados o progresso fica zerado, sem estimativas', () => {
  const resumo = resumoProgresso([], domingo);
  assert.deepEqual(resumo, { semana: 0, ultimasQuatro: 0, semanasAtivas: 0, minutosSemana: 0, ultimo: null });
});

test('janela do progresso cobre quatro semanas e termina depois de hoje', () => {
  const { de, ate } = janelaProgresso(domingo);
  assert.equal(de.getDate(), 26);
  assert.equal(de.getMonth(), 9);
  assert.equal(ate.getDate(), 23);
  assert.ok((ate - de) / 86400000 <= 40);
});

test('corpo da rotina converte números, ordena dias e omite campos vazios', () => {
  const perfil = {
    trainingGoal: 'hipertrofia',
    trainingExperience: 'de_1_a_2_anos',
    recentFrequency: 'semanal_3_4',
    availableDays: '3',
    preferredSessionMinutes: '60',
  };
  const preferencias = {
    equipamentos: ['barra', 'halteres'],
    preferenciaEquipamento: 'indiferente',
    evitar: [],
    limitacoes: [],
    prioridades: ['costas'],
  };
  const simples = corpoDaRotina({ perfil, preferencias, variacao: 0, agenda: null, ajustes: [] });
  assert.equal(simples.perfil.availableDays, 3);
  assert.equal(simples.perfil.preferredSessionMinutes, 60);
  assert.equal('prioridades' in simples.preferencias, false);
  assert.equal('variacao' in simples, false);
  assert.equal('agenda' in simples, false);
  assert.equal('ajustes' in simples, false);

  const completo = corpoDaRotina({
    perfil,
    preferencias,
    variacao: 2,
    estrategia: 'full_body_3',
    agenda: { modo: 'calendario', dias: [5, 1, 3] },
    ajustes: [{ sessao: 'A', posicao: 2, exercicioId: 'x' }],
  });
  assert.equal(completo.variacao, 2);
  assert.equal(completo.estrategia, 'full_body_3');
  assert.deepEqual(completo.agenda, { modo: 'calendario', dias: [1, 3, 5] });
  assert.equal(completo.ajustes.length, 1);
  assert.deepEqual(corpoDaRotina({ perfil, preferencias, agenda: { modo: 'flexivel' } }).agenda, {
    modo: 'flexivel',
  });
  assert.deepEqual(
    corpoDaRotina({ perfil, preferencias, agenda: { modo: 'calendario', dias: null } }).agenda,
    { modo: 'calendario' },
  );
});

test('troca na mesma vaga substitui a anterior em vez de acumular', () => {
  let ajustes = aplicarAjuste([], 'A', 2, 'um');
  ajustes = aplicarAjuste(ajustes, 'B', 1, 'dois');
  ajustes = aplicarAjuste(ajustes, 'A', '2', 'tres');
  assert.deepEqual(ajustes, [
    { sessao: 'B', posicao: 1, exercicioId: 'dois' },
    { sessao: 'A', posicao: 2, exercicioId: 'tres' },
  ]);
});

test('editar a rotina ativa parte da mesma estrutura, variação, agenda e trocas', () => {
  const ativa = {
    variacao: 2,
    entrada: { estrategiaPedida: 'full_body_3' },
    agenda: { modo: 'calendario', dias: [1, 3, 5], sugeridos: [1, 3, 5] },
    ajustes: [{ sessao: 'A', posicao: 2, exercicioId: 'x', de: 'Antigo', para: 'Novo' }],
  };
  assert.deepEqual(personalizacaoInicial(ativa), {
    variacao: 2,
    estrategia: 'full_body_3',
    agenda: { modo: 'calendario', dias: [1, 3, 5] },
    ajustes: [{ sessao: 'A', posicao: 2, exercicioId: 'x' }],
  });
  assert.deepEqual(personalizacaoInicial(null), { variacao: 0, estrategia: null, agenda: null, ajustes: [] });
  assert.equal(personalizacaoInicial({ agenda: { modo: 'flexivel', dias: [] } }).agenda, null);
});

test('mudar perfil, estrutura ou variação desfaz trocas; agenda e novas trocas as mantêm', () => {
  const atual = {
    variacao: 1,
    estrategia: null,
    agenda: { modo: 'calendario', dias: [1, 4] },
    ajustes: [{ sessao: 'A', posicao: 1, exercicioId: 'x' }],
  };
  assert.deepEqual(personalizacaoApos(atual, { tipo: 'perfil' }).ajustes, []);
  assert.deepEqual(personalizacaoApos(atual, { tipo: 'variacao', variacao: 2 }).ajustes, []);
  assert.equal(personalizacaoApos(atual, { tipo: 'variacao', variacao: 2 }).variacao, 2);
  assert.equal(personalizacaoApos(atual, { tipo: 'estrategia', estrategia: 'full_body_2' }).estrategia, 'full_body_2');
  assert.equal(personalizacaoApos(atual, { tipo: 'estrategia', estrategia: null }).estrategia, null);

  const agenda = personalizacaoApos(atual, { tipo: 'agenda', agenda: { modo: 'flexivel' } });
  assert.deepEqual(agenda.agenda, { modo: 'flexivel' });
  assert.equal(agenda.ajustes.length, 1);
  const automatica = personalizacaoApos(
    { ...atual, estrategia: 'superior_inferior_6' },
    { tipo: 'agenda', agenda: { modo: 'flexivel' }, estrategia: null },
  );
  assert.equal(automatica.estrategia, null);
  assert.equal(automatica.ajustes.length, 0);
  const mesma = personalizacaoApos(atual, {
    tipo: 'agenda',
    agenda: { modo: 'flexivel' },
    estrategia: null,
  });
  assert.equal(mesma.estrategia, null);
  assert.equal(mesma.ajustes.length, 1);

  const troca = personalizacaoApos(atual, { tipo: 'troca', sessao: 'B', posicao: 3, exercicioId: 'y' });
  assert.equal(troca.ajustes.length, 2);
  assert.deepEqual(troca.agenda, atual.agenda);
});

test('segunda tentativa sem dias só existe quando havia dias fixos', () => {
  assert.equal(semDiasFixos({ agenda: { modo: 'flexivel' } }), null);
  assert.equal(semDiasFixos({ agenda: null }), null);
  assert.equal(semDiasFixos({ agenda: { modo: 'calendario', dias: [] } }), null);
  assert.deepEqual(semDiasFixos({ variacao: 1, agenda: { modo: 'calendario', dias: [1, 3] } }), {
    variacao: 1,
    agenda: { modo: 'calendario', dias: null },
  });
});

test('personalização confirmada copia os dias e as trocas efetivamente aplicados', () => {
  const proposta = {
    agenda: { modo: 'calendario', dias: [1, 2, 4, 5], sugeridos: [1, 2, 4, 5] },
    ajustes: [{ sessao: 'A', posicao: '2', exercicioId: 'x', de: 'Um', para: 'Dois' }],
  };
  const confirmada = personalizacaoConfirmada({ variacao: 0, agenda: { modo: 'calendario', dias: null } }, proposta);
  assert.deepEqual(confirmada.agenda, { modo: 'calendario', dias: [1, 2, 4, 5] });
  assert.deepEqual(confirmada.ajustes, [{ sessao: 'A', posicao: 2, exercicioId: 'x' }]);

  const padrao = personalizacaoConfirmada({ agenda: null }, { agenda: { modo: 'flexivel', dias: [] } });
  assert.equal(padrao.agenda, null);
});

test('mudanças no perfil ignoram diferença entre texto e número', () => {
  const original = { trainingGoal: 'forca', availableDays: 3, preferredSessionMinutes: 60 };
  assert.deepEqual(
    mudancasNoPerfil(original, { trainingGoal: 'forca', availableDays: '3', preferredSessionMinutes: '60' }),
    [],
  );
  assert.deepEqual(
    mudancasNoPerfil(original, { trainingGoal: 'hipertrofia', availableDays: '4', preferredSessionMinutes: '60' }),
    ['Objetivo', 'Dias disponíveis'],
  );
});

test('calendário exige exatamente um dia distinto por sessão', () => {
  assert.equal(diasValidos({ modo: 'calendario', dias: [1, 3, 5] }, 3), true);
  assert.equal(diasValidos({ modo: 'calendario', dias: [1, 3] }, 3), false);
  assert.equal(diasValidos({ modo: 'calendario', dias: [1, 1, 3] }, 3), false);
  assert.equal(diasValidos({ modo: 'flexivel' }, 3), true);
});

test('alternar item respeita o limite e permite desmarcar', () => {
  assert.deepEqual(alternarItem(['peito'], 'costas', 2), ['peito', 'costas']);
  assert.deepEqual(alternarItem(['peito', 'costas'], 'ombros', 2), ['peito', 'costas']);
  assert.deepEqual(alternarItem(['peito', 'costas'], 'peito', 2), ['costas']);
});

test('preferências iniciais: todos os equipamentos por padrão e só valores conhecidos', () => {
  const opcoes = { equipamentos: [{ id: 'barra' }, { id: 'halteres' }, { id: 'maquina' }] };
  assert.deepEqual(preferenciasIniciais(null, opcoes).equipamentos, ['barra', 'halteres', 'maquina']);
  const salvas = preferenciasIniciais(
    { preferencias: { equipamentos: ['halteres', 'antigo'], prioridades: ['costas'] } },
    opcoes,
  );
  assert.deepEqual(salvas.equipamentos, ['halteres']);
  assert.equal('prioridades' in salvas, false);
  assert.equal(salvas.preferenciaEquipamento, 'indiferente');
});

test('busca de exercícios ignora acentos, duplicados e a seleção atual', () => {
  const catalogo = [
    { id: 'agachamento', nome: 'Agachamento com Barra' },
    { id: 'agachamento', nome: 'Agachamento com Barra' },
    { id: 'smith', nome: 'Agachamento no Smith' },
    { id: 'rosca', nome: 'Rosca Direta' },
  ];
  assert.deepEqual(filtrarExercicios(catalogo, 'a', []), []);
  assert.deepEqual(
    filtrarExercicios(catalogo, 'agacha', ['agachamento']).map((item) => item.id),
    ['smith'],
  );
  assert.equal(filtrarExercicios(catalogo, 'rosca', []).length, 1);
});

test('sessão aberta só é reconhecida pelo identificador persistido', () => {
  assert.equal(idDaSessaoAberta({ sessoes: [{ codigo: 'A' }] }, 'A'), null);
  assert.equal(
    idDaSessaoAberta({ sessoes: [{ codigo: 'A', treinoAbertoId: 'abc123' }] }, 'A'),
    'abc123',
  );
  assert.equal(
    idDaSessaoAberta({ sessoes: [{ codigo: 'A', treinoAbertoId: 'abc123' }] }, 'B'),
    null,
  );
});

test('mensagens de erro distinguem rede, sessão expirada e validação', () => {
  assert.match(mensagemDeErro(new Error('Failed to fetch')), /conexão/);
  assert.match(mensagemDeErro({ response: { status: 401, data: {} } }), /sessão expirou/);
  assert.equal(
    mensagemDeErro({ response: { status: 400, data: { message: 'Revise', details: [{ msg: 'Dias inválidos' }] } } }),
    'Dias inválidos',
  );
  assert.equal(mensagemDeErro({ response: { status: 409, data: { message: 'Conflito' } } }), 'Conflito');
});

test('explicações do motor viram frases curtas e escondem a organização da semana', () => {
  const itens = resumirExplicacoes([
    { tipo: 'estrutura', titulo: 'Estrutura: Superior e inferior', texto: 'Cada grupo é treinado duas vezes. Os dias alternam.' },
    { tipo: 'prescricao', texto: 'Para hipertrofia, as séries ficam perto da falha. Principal: 6–10 repetições, descanso de 75 s, RIR 1–2. RIR é quantas repetições ainda caberiam ao terminar a série.' },
    { tipo: 'tempo', texto: 'A estimativa fica entre 37 e 48 min.' },
    { tipo: 'agenda', texto: 'Siga a sequência A → B no dia em que puder. A próxima sessão é sempre a seguinte.' },
    { tipo: 'fase', texto: '' },
  ]);
  assert.deepEqual(itens.map((item) => item.rotulo), ['Divisão', 'Intensidade', 'Duração']);
  assert.equal(itens[0].linhas.length, 2);
  assert.equal(itens[1].linhas.length, 2);
  assert.equal(
    itens[1].linhas[1],
    'Exercícios principais: 6–10 repetições · 75 segundos de descanso. Termine cada série sentindo que conseguiria fazer mais 1 ou 2 repetições.',
  );
  assert.equal(itens[1].ajuda, 'É quantas repetições você ainda conseguiria fazer no fim da série.');
  assert.equal(JSON.stringify(itens).includes('RIR'), false);
  assert.equal(itens[2].linhas[0], 'A estimativa fica entre 37 e 48 min.');
  assert.equal(
    textoReserva('1-2'),
    'Termine cada série sentindo que conseguiria fazer mais 1 ou 2 repetições.',
  );
  const tecnico = resumirExplicacoes([
    {
      tipo: 'fase',
      texto:
        'Meta semanal: 12 a 18 séries para grupos grandes (séries diretas mais metade das indiretas — um supino também conta para o tríceps).',
    },
  ]);
  assert.deepEqual(tecnico[0].linhas, [
    'Distribuímos os exercícios para trabalhar os músculos de forma equilibrada.',
  ]);
  assert.equal(textoReserva(0, true), 'Nenhuma repetição sobrando.');
  assert.equal(fraseCurtaReserva('1-2'), 'Deixe 1 ou 2 repetições sobrando.');
  assert.equal(fraseCurtaReserva('1'), 'Deixe 1 repetição sobrando.');
  assert.equal(fraseCurtaReserva(0), 'Não deixe repetições sobrando.');
  assert.equal(
    simplificarTexto('Você registrou RIR 0 (nenhuma repetição de reserva). Na última sessão, mantenha a carga.'),
    'Você registrou que não sobrou nenhuma repetição. No último treino, mantenha a carga.',
  );
});

test('só a próxima sessão da sequência pode ser iniciada', () => {
  const estado = {
    proxima: 'B',
    sessoes: [
      { codigo: 'A', status: 'concluida' },
      { codigo: 'B', status: 'planejada' },
      { codigo: 'C', status: 'planejada' },
    ],
  };
  assert.equal(sessaoLiberada(estado, 'B'), true);
  assert.equal(sessaoLiberada(estado, 'C'), false);
  assert.equal(aparenciaDaSessao(estado.sessoes[1], 'B').rotulo, 'Disponível');
  assert.equal(
    aparenciaDaSessao({ codigo: 'B', status: 'em_andamento', treinoAbertoId: 'ficha' }, 'B').rotulo,
    'Não iniciado',
  );
  assert.equal(aparenciaDaSessao({ ...estado.sessoes[1], execucaoIniciada: true, codigo: 'B' }, 'B').rotulo, 'Em andamento');
  assert.equal(aparenciaDaSessao(estado.sessoes[2], 'B').rotulo, 'Planejada');
  assert.match(avisoBloqueio(rotina, estado), /Conclua o Treino B/);
});

test('datas relativas e listas de dias em português', () => {
  assert.equal(quandoRelativo(new Date(2026, 10, 22, 7), domingo), 'hoje');
  assert.equal(quandoRelativo(new Date(2026, 10, 21, 22), domingo), 'ontem');
  assert.equal(quandoRelativo(new Date(2026, 10, 19, 22), domingo), 'há 3 dias');
  assert.equal(listaDeDias([1, 3, 7]), 'seg, qua, dom');
});

test('a prévia separa alerta de observação e ignora o texto antigo', () => {
  const separado = separarMensagens({
    avisos: ['Não há treinos com séries registradas nestas semanas. A programação começa mais leve.'],
    mensagens: [
      { codigo: 'sem_historico', nivel: 'interno', resumo: 'Começa mais leve.' },
      { codigo: 'fora_tempo', nivel: 'observacao', resumo: 'Panturrilhas ficaram de fora pelo tempo disponível.', acao: 'duracao' },
      { codigo: 'sem_estimulo', nivel: 'bloqueio', resumo: 'Peito ficou sem exercício compatível.', acao: 'preferencias' },
    ],
  });
  assert.deepEqual(separado.observacoes.map((item) => item.codigo), ['fora_tempo']);
  assert.deepEqual(separado.importantes.map((item) => item.codigo), ['sem_estimulo']);

  const antigo = separarMensagens({
    avisos: ['Alguns músculos ficam com menos séries do que o ideal nesta semana.'],
  });
  assert.deepEqual(antigo, { importantes: [], observacoes: [] });

  const descoberto = separarMensagens({ gruposDescobertos: ['Peito', 'Costas'] });
  assert.equal(descoberto.importantes.length, 1);
  assert.equal(descoberto.importantes[0].nivel, 'bloqueio');
  assert.match(descoberto.importantes[0].resumo, /Peito e Costas/);
  assert.deepEqual(descoberto.observacoes, []);
});

test('o resumo da alteração distingue calendário de uma nova divisão', () => {
  const rotina = {
    assinatura: 'a'.repeat(64),
    agenda: { modo: 'flexivel' },
    sessoes: [{ codigo: 'A' }, { codigo: 'B' }, { codigo: 'C' }],
    entrada: { perfil: { trainingGoal: 'hipertrofia', preferredSessionMinutes: 60, availableDays: 3 } },
  };
  const soDias = {
    assinatura: rotina.assinatura,
    sessoesPorSemana: 3,
    sessoes: rotina.sessoes,
    agenda: { modo: 'calendario', dias: [1, 3, 5, 7] },
  };
  const mudancaDeDias = oQueVaiMudar(rotina, soDias, { availableDays: 3, preferredSessionMinutes: 60, trainingGoal: 'hipertrofia' });
  assert.match(mudancaDeDias.join(' '), /Rotina flexível → Dias definidos/);
  assert.match(mudancaDeDias.join(' '), /domingo/);
  assert.match(mudancaDeDias.join(' '), /continuam os mesmos/);

  const nova = {
    assinatura: 'b'.repeat(64),
    sessoesPorSemana: 4,
    sessoes: [{}, {}, {}, {}],
    agenda: { modo: 'flexivel' },
  };
  const mudancaDePerfil = oQueVaiMudar(rotina, nova, {
    availableDays: 5,
    preferredSessionMinutes: 45,
    trainingGoal: 'forca',
  });
  assert.match(mudancaDePerfil.join(' '), /3 treinos → 4 treinos/);
  assert.match(mudancaDePerfil.join(' '), /60 minutos → 45 minutos/);
  assert.match(mudancaDePerfil.join(' '), /Hipertrofia → Força/);
  assert.match(mudancaDePerfil.join(' '), /5 dias/);
  assert.doesNotMatch(mudancaDePerfil.join(' '), /recupera/);
  assert.match(mudancaDePerfil.join(' '), /Nova divisão adaptada ao perfil/);

  const comMotivo = {
    ...nova,
    motivoMenosSessoes:
      'Você informou 6 dias. A programação ficou com 3 treinos. A experiência ainda é inicial.',
  };
  const textoMotivo = oQueVaiMudar(rotina, comMotivo, {
    availableDays: 6,
    preferredSessionMinutes: 60,
    trainingGoal: 'hipertrofia',
  }).join(' ');
  assert.match(textoMotivo, /experiência ainda é inicial/);
  assert.doesNotMatch(textoMotivo, /recupera/);
  assert.deepEqual(oQueVaiMudar(null, nova, {}), []);
});

test('resumo da prévia fica curto para todas as divisões e organizações', () => {
  const rotulos = [
    ['Corpo inteiro', 'Corpo inteiro'],
    ['Corpo inteiro A e B', 'Corpo inteiro A e B'],
    ['Corpo inteiro A, B e C', 'Corpo inteiro A, B e C'],
    ['Superior, inferior e corpo inteiro', 'Superior, inferior e corpo inteiro'],
    ['Empurrar, puxar e pernas', 'Empurrar, puxar e pernas'],
    ['Superior e inferior', 'Superior e inferior'],
    ['Superior e inferior + empurrar, puxar e pernas', 'Superior e inferior + empurrar, puxar e pernas'],
    ['Empurrar, puxar e pernas (2×)', 'Empurrar, puxar e pernas'],
    ['Superior e inferior (3×)', 'Superior e inferior'],
  ];
  rotulos.forEach(([entrada, esperado]) => {
    assert.equal(divisaoCurta(entrada), esperado);
  });

  const flexivel = resumoDaProgramacao(
    {
      sessoesPorSemana: 6,
      estrategia: { rotulo: 'Empurrar, puxar e pernas (2×)' },
      agenda: { modo: 'flexivel' },
      sessoes: [{ duracaoEstimadaMinutos: 46 }, { duracaoEstimadaMinutos: 46 }],
    },
    'Resistência muscular',
  );
  assert.equal(flexivel.titulo, 'Resistência muscular · 6 treinos · ~46 min\u00A0cada');
  assert.equal(flexivel.divisao, 'Empurrar, puxar e pernas');
  assert.equal(flexivel.organizacao, 'Flexível');

  const calendario = resumoDaProgramacao(
    {
      sessoesPorSemana: 3,
      estrategia: { rotulo: 'Corpo inteiro A, B e C' },
      agenda: { modo: 'calendario', dias: [1, 3, 5] },
      sessoes: [
        { duracaoEstimadaMinutos: 40 },
        { duracaoEstimadaMinutos: 55 },
        { duracaoEstimadaMinutos: 48 },
      ],
    },
    'Hipertrofia',
  );
  assert.equal(calendario.titulo, 'Hipertrofia · 3 treinos · ~40–55 min');
  assert.equal(calendario.divisao, 'Corpo inteiro A, B e C');
  assert.equal(calendario.organizacao, 'Segunda, quarta e sexta');

  const unico = resumoDaProgramacao(
    {
      sessoesPorSemana: 1,
      estrategia: { codigo: 'full_body_1', rotulo: 'Corpo inteiro' },
      agenda: { modo: 'calendario', dias: [] },
      sessoes: [{}],
    },
    'Força',
  );
  assert.equal(unico.titulo, 'Força · 1 treino');
  assert.equal(unico.divisao, 'Corpo inteiro');
  assert.equal(unico.organizacao, 'Dias definidos');
});
