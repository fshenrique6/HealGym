import assert from 'node:assert/strict';
import test from 'node:test';
import { classificarFicha, separarFichas } from './fichasTreino.js';

const avulsa = { _id: 'avulsa', titulo: 'Peito', realizado: false, tipoDivisao: 'ABC' };
const programa = { _id: 'semana', titulo: 'Sessão 1', realizado: false, tipoDivisao: 'PROGRAMA' };
const concluida = { _id: 'feita', titulo: 'Costas', realizado: true, tipoDivisao: 'ABC' };

test('abrir a lista não descarta ficha avulsa, em andamento, concluída nem da programação', () => {
  const fichas = [
    classificarFicha(avulsa, { ok: true, data: null }),
    classificarFicha({ ...avulsa, _id: 'andamento' }, { ok: true, data: { iniciadoEm: '2026-11-01' } }),
    classificarFicha(concluida, { ok: true, data: null }),
    classificarFicha(programa, { ok: true, data: null }),
    classificarFicha({ ...programa, _id: 'semana-feita', realizado: true }, { ok: true, data: { iniciadoEm: '2026-11-02' } }),
  ];
  const grupos = separarFichas(fichas);

  assert.deepEqual(grupos.salvas.map((ficha) => ficha._id), ['avulsa', 'semana']);
  assert.deepEqual(grupos.historico.map((ficha) => ficha._id), ['andamento', 'feita', 'semana-feita']);
  assert.equal(fichas.length, grupos.salvas.length + grupos.historico.length);
});

test('sair sem iniciar mantém a ficha como não iniciada', () => {
  const ficha = classificarFicha(avulsa, { ok: true, data: {} });
  assert.equal(ficha.estado, 'nao_iniciado');
  assert.deepEqual(separarFichas([ficha]).salvas, [ficha]);
});

test('ficha em andamento e ficha concluída permanecem no histórico', () => {
  const andamento = classificarFicha(avulsa, { ok: true, data: { iniciadoEm: '2026-11-01' } });
  const feita = classificarFicha(concluida, { ok: false });
  assert.equal(andamento.estado, 'em_andamento');
  assert.equal(feita.estado, 'concluido');
  assert.deepEqual(separarFichas([andamento, feita]).historico.map((ficha) => ficha.estado), [
    'em_andamento',
    'concluido',
  ]);
});

test('falha ao consultar a execução conserva a ficha', () => {
  const ficha = classificarFicha(programa, { ok: false });
  assert.equal(ficha.estado, 'nao_iniciado');
  assert.equal(separarFichas([ficha]).salvas.length, 1);
  assert.equal(separarFichas([ficha]).historico.length, 0);
});
