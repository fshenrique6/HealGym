import assert from 'node:assert/strict';
import test from 'node:test';
import { execucaoConfirmaAquecimento, execucaoConfirmaPayload } from './confirmacaoExecucao.js';

test('série só conta como salva quando o documento tem o mesmo número, carga e repetições', () => {
  const pedido = [
    { uid: 'ex-1', series: [{ numero: 1, carga: 40, repeticoes: 8, concluida: true }] },
  ];
  assert.equal(
    execucaoConfirmaPayload(
      { exercicios: [{ uid: 'ex-1', series: [{ numero: 1, carga: 40, repeticoes: 8, concluida: true }] }] },
      pedido,
    ),
    true,
  );
  assert.equal(
    execucaoConfirmaPayload(
      { exercicios: [{ uid: 'ex-1', series: [{ numero: 1, carga: 42, repeticoes: 8, concluida: true }] }] },
      pedido,
    ),
    false,
  );
  assert.equal(execucaoConfirmaPayload({ exercicios: [] }, pedido), false);
});

test('aquecimento confirmado exige a série leve concluída com os mesmos valores', () => {
  const registro = { carga: 20, repeticoes: 12, concluida: true };
  assert.equal(
    execucaoConfirmaAquecimento(
      { exercicios: [{ uid: 'ex-1', aquecimento: { carga: 20, repeticoes: 12, concluida: true } }] },
      'ex-1',
      registro,
    ),
    true,
  );
  assert.equal(
    execucaoConfirmaAquecimento(
      { exercicios: [{ uid: 'ex-1', aquecimento: { carga: 20, repeticoes: 12, concluida: false } }] },
      'ex-1',
      registro,
    ),
    false,
  );
});
