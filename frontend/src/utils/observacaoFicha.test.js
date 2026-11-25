import assert from 'node:assert/strict';
import test from 'node:test';
import { observacaoVisivel } from './observacaoFicha.js';

test('a observação de volume recuperável sai da ficha e os outros avisos ficam', () => {
  assert.equal(
    observacaoVisivel(
      'Em sessões longas, o limite é um volume recuperável, não ocupar todos os minutos escolhidos.',
    ),
    '',
  );
  assert.equal(
    observacaoVisivel(
      'Em treinos longos, o limite é um volume recuperável, não ocupar todos os minutos escolhidos.',
    ),
    '',
  );
  assert.equal(observacaoVisivel('   '), '');
  const importante =
    'Supino reto com barra não coube na duração escolhida sem encurtar os descansos e ficou fora desta sessão.';
  assert.equal(observacaoVisivel(importante), importante);
  const faixa =
    'A estimativa ficou abaixo da faixa planejada para 60 min porque o volume desta sessão já atingiu o limite definido para o nível informado.';
  assert.equal(observacaoVisivel(faixa), faixa);
});
