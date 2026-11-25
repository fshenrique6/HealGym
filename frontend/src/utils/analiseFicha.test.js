import assert from 'node:assert/strict';
import test from 'node:test';
import { rotuloSeries, seriesPorGrupo } from './analiseFicha.js';

function musculo(codigo, diretas, indiretas = 0) {
  return { codigo, seriesDiretas: diretas, seriesIndiretas: indiretas, status: diretas > 0 ? 'direta' : 'indireta' };
}

test('soma só as séries diretas dos grupos do catálogo e omite quem está em zero', () => {
  const grupos = seriesPorGrupo({
    cobertura: {
      secoes: [
        {
          foco: 'Pernas',
          seriesDiretas: 5,
          musculos: [
            musculo('quadriceps', 3, 1),
            musculo('isquiotibiais', 2),
            musculo('gluteos', 0, 1.5),
            musculo('panturrilhas', 0),
          ],
        },
        { foco: 'Peitoral', seriesDiretas: 2, musculos: [musculo('peitoral', 2, 1)] },
        { foco: 'Costas', seriesDiretas: 2, musculos: [musculo('dorsal', 2), musculo('costas_medias', 0, 2)] },
        {
          foco: 'Ombros',
          seriesDiretas: 2,
          musculos: [
            musculo('deltoide_anterior', 0, 2),
            musculo('deltoide_lateral', 2),
            musculo('deltoide_posterior', 0),
          ],
        },
        { foco: 'Tríceps', seriesDiretas: 0, musculos: [musculo('triceps', 0, 1)] },
        { foco: 'Bíceps e antebraço', seriesDiretas: 2, musculos: [musculo('biceps', 2), musculo('braquial', 0)] },
        { foco: 'Core', seriesDiretas: 0, musculos: [musculo('core', 0)] },
      ],
      outrosMusculos: [musculo('eretores', 3), musculo('abdutores', 4), musculo('manguito', 2)],
      padroes: [{ rotulo: 'Agachar' }],
      criterio: 'Séries diretas mais metade das indiretas',
    },
  });

  assert.deepEqual(grupos, [
    { nome: 'Pernas', series: 5 },
    { nome: 'Peito', series: 2 },
    { nome: 'Costas', series: 2 },
    { nome: 'Ombros', series: 2 },
    { nome: 'Braços', series: 2 },
  ]);
});

test('bíceps, braquial e tríceps entram juntos em Braços, sem somar o estímulo indireto', () => {
  const grupos = seriesPorGrupo({
    cobertura: {
      secoes: [
        { musculos: [musculo('triceps', 3, 2)] },
        { musculos: [musculo('biceps', 2, 0.5), musculo('braquial', 1)] },
      ],
    },
  });

  assert.deepEqual(grupos, [{ nome: 'Braços', series: 6 }]);
});

test('o mesmo músculo não é contado duas vezes', () => {
  const grupos = seriesPorGrupo({
    cobertura: {
      secoes: [{ musculos: [musculo('peitoral', 4)] }],
      outrosMusculos: [musculo('peitoral', 4)],
    },
  });

  assert.deepEqual(grupos, [{ nome: 'Peito', series: 4 }]);
});

test('sem cobertura, usa as séries do exercício e o músculo principal', () => {
  const grupos = seriesPorGrupo({
    exercicios: [
      { nome: 'Leg press', musculoPrincipalCodigo: 'quadriceps', series: 4 },
      { nome: 'Mesa flexora', musculoPrincipalCodigo: 'isquiotibiais', series: 3 },
      { nome: 'Supino', musculoPrincipalCodigo: 'peitoral', series: 3 },
      { nome: 'Remada', musculoPrincipalCodigo: 'dorsal', series: 3 },
      { nome: 'Desenvolvimento', musculoPrincipalCodigo: 'deltoide_anterior', series: 3 },
      { nome: 'Tríceps pulley', musculoPrincipalCodigo: 'triceps', series: 2 },
      { nome: 'Rosca', musculoPrincipalCodigo: 'biceps', series: 2 },
      { nome: 'Prancha', musculoPrincipalCodigo: 'core', series: 3 },
      { nome: 'Abdução', musculoPrincipalCodigo: 'abdutores', series: 3 },
      { nome: 'Lombar', musculoPrincipalCodigo: 'eretores', series: 3 },
    ],
  });

  assert.deepEqual(grupos, [
    { nome: 'Pernas', series: 7 },
    { nome: 'Peito', series: 3 },
    { nome: 'Costas', series: 3 },
    { nome: 'Ombros', series: 3 },
    { nome: 'Braços', series: 4 },
    { nome: 'Abdômen', series: 3 },
  ]);
});

test('cobertura zerada não é substituída pela lista de exercícios', () => {
  const grupos = seriesPorGrupo({
    cobertura: { secoes: [{ musculos: [musculo('peitoral', 0, 3)] }] },
    exercicios: [{ musculoPrincipalCodigo: 'peitoral', series: 4 }],
  });

  assert.deepEqual(grupos, []);
});

test('o rótulo distingue uma série de várias', () => {
  assert.equal(rotuloSeries(1), '1 série');
  assert.equal(rotuloSeries(5), '5 séries');
});
