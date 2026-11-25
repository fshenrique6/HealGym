import assert from 'node:assert/strict';
import test from 'node:test';
import { orientacaoDeCarga, textoAquecimento } from './orientacaoFicha.js';

test('a orientação de carga usa a faixa e a reserva de cada exercício', () => {
  assert.equal(
    orientacaoDeCarga('12-15', '1-2'),
    'Escolha uma carga que permita fazer de 12 a 15 repetições, deixando 1 ou 2 sobrando.',
  );
  assert.equal(
    orientacaoDeCarga('8–12', '2-3'),
    'Escolha uma carga que permita fazer de 8 a 12 repetições, deixando 2 ou 3 sobrando.',
  );
  assert.equal(
    orientacaoDeCarga('10', '1'),
    'Escolha uma carga que permita fazer 10 repetições, deixando 1 sobrando.',
  );
  assert.equal(
    orientacaoDeCarga('6-8', 0),
    'Escolha uma carga que permita fazer de 6 a 8 repetições, sem deixar repetições sobrando.',
  );
  assert.equal(orientacaoDeCarga('20-40s', '1-2'), '');
  assert.equal(orientacaoDeCarga('12-15', ''), '');
  assert.equal(orientacaoDeCarga('12-15', '1-2').includes('RIR'), false);
});

test('a ficha mostra as séries leves prescritas e preserva a ficha antiga', () => {
  assert.equal(textoAquecimento({}, 0), 'Aquecimento: 1 série leve antes de começar.');
  assert.equal(textoAquecimento({}, 1), '');
  assert.equal(
    textoAquecimento({ seriesAproximacao: 3 }, 2),
    'Aquecimento: 3 séries leves antes de começar.',
  );
  assert.equal(textoAquecimento({ seriesAproximacao: 0 }, 0), '');
  assert.equal(textoAquecimento({ seriesAproximacao: 1 }, 4), 'Aquecimento: 1 série leve antes de começar.');
});
