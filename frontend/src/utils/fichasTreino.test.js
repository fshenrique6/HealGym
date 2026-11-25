import assert from 'node:assert/strict';
import test from 'node:test';
import { estadoDaFicha, separarFichas } from './fichasTreino.js';

const avulsa = { _id: 'avulsa', titulo: 'Peito', realizado: false, tipoDivisao: 'AVULSO' };
const rotina = { _id: 'rotina', titulo: 'Treino A', realizado: false, tipoDivisao: 'ROTINA' };
const concluida = { _id: 'feita', titulo: 'Costas', realizado: true, tipoDivisao: 'ABC' };

test('abrir a lista não descarta nenhuma ficha: cada uma cai em exatamente um grupo', () => {
  const fichas = [
    { ...avulsa, estadoExecucao: 'nao_iniciado' },
    { ...avulsa, _id: 'andamento', estadoExecucao: 'em_andamento' },
    { ...concluida, estadoExecucao: 'concluido' },
    { ...rotina, estadoExecucao: 'nao_iniciado' },
    { ...rotina, _id: 'rotina-feita', realizado: true },
  ];
  const grupos = separarFichas(fichas);

  assert.deepEqual(grupos.nao_iniciado.map((ficha) => ficha._id), ['avulsa', 'rotina']);
  assert.deepEqual(grupos.em_andamento.map((ficha) => ficha._id), ['andamento']);
  assert.deepEqual(grupos.concluido.map((ficha) => ficha._id), ['feita', 'rotina-feita']);
  const total = grupos.nao_iniciado.length + grupos.em_andamento.length + grupos.concluido.length;
  assert.equal(total, fichas.length);
});

test('sem informação de execução, a ficha aberta fica como não iniciada', () => {
  assert.equal(estadoDaFicha(avulsa), 'nao_iniciado');
  assert.equal(estadoDaFicha({ ...avulsa, estadoExecucao: 'valor_desconhecido' }), 'nao_iniciado');
});

test('treino concluído é concluído mesmo que a listagem traga outro estado', () => {
  assert.equal(estadoDaFicha({ ...concluida, estadoExecucao: 'em_andamento' }), 'concluido');
});

test('lista vazia ou ausente devolve grupos vazios', () => {
  assert.deepEqual(separarFichas(undefined), { em_andamento: [], nao_iniciado: [], concluido: [] });
});
