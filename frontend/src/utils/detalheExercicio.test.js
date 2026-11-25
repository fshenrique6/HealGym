import assert from 'node:assert/strict';
import test from 'node:test';
import {
  linhasDeDetalhe,
  musculoPrincipalLegivel,
  musculosSecundariosLegiveis,
  nomeMusculo,
  ROTULOS_DETALHE,
} from './detalheExercicio.js';

const CATALOGO = {
  peitoral: 'Peitoral maior',
  dorsal: 'Dorsal',
  costas_medias: 'Meio das costas',
  eretores: 'Lombar',
  deltoide_anterior: 'Parte da frente dos ombros',
  deltoide_lateral: 'Parte lateral dos ombros',
  deltoide_posterior: 'Parte de trás dos ombros',
  trapezio_superior: 'Parte de cima do trapézio',
  manguito: 'Músculos que estabilizam o ombro',
  triceps: 'Tríceps',
  biceps: 'Bíceps',
  braquial: 'Por baixo do bíceps e no antebraço',
  quadriceps: 'Quadríceps',
  isquiotibiais: 'Parte de trás da coxa',
  gluteos: 'Glúteos',
  adutores: 'Parte de dentro da coxa',
  abdutores: 'Lado do quadril',
  panturrilhas: 'Panturrilhas',
  core: 'Abdômen',
};

test('nomes do catálogo ficam claros sem mudar o músculo', () => {
  Object.entries(CATALOGO).forEach(([codigo, esperado]) => {
    assert.equal(nomeMusculo(codigo), esperado);
  });
  assert.equal(nomeMusculo('Peitoral maior'), 'Peitoral maior');
  assert.equal(nomeMusculo('Deltoide anterior'), 'Parte da frente dos ombros');
  assert.equal(nomeMusculo('Tríceps braquial'), 'Tríceps');
  assert.equal(nomeMusculo('Grande dorsal'), 'Dorsal');
  assert.equal(nomeMusculo('Bíceps braquial'), 'Bíceps');
  assert.equal(nomeMusculo('Posteriores de coxa'), 'Parte de trás da coxa');
  assert.equal(nomeMusculo('Romboides e trapézio médio'), 'Meio das costas');
  assert.equal(nomeMusculo('Braquial e braquiorradial'), 'Por baixo do bíceps e no antebraço');
  assert.equal(nomeMusculo('Glúteo médio e abdutores'), 'Lado do quadril');
  assert.equal(nomeMusculo('Músculo ainda não catalogado'), 'Músculo ainda não catalogado');
});

test('a porção técnica sai da apresentação e o músculo permanece', () => {
  const supino = {
    musculoPrincipalCodigo: 'peitoral',
    musculoPrincipal: 'Peitoral maior',
    enfase: 'Porção esternocostal',
    porcaoMuscular: 'Peitoral maior · Porção esternocostal',
  };
  assert.equal(musculoPrincipalLegivel(supino), 'Peitoral maior');
  assert.equal(nomeMusculo('Peitoral maior · Porção esternocostal'), 'Peitoral maior');
  assert.equal(
    musculoPrincipalLegivel({ porcaoMuscular: 'Deltoide anterior · Empurrar vertical' }),
    'Parte da frente dos ombros',
  );
});

test('secundários, vários equipamentos e campos ausentes seguem o mesmo padrão', () => {
  const completo = {
    tecnica: 'Desça a barra até a linha média do peito.',
    musculoPrincipal: 'Peitoral maior',
    enfase: 'Porção esternocostal',
    musculosSecundarios: 'Tríceps braquial, Deltoide anterior',
    cuidado: 'Mantenha as escápulas apoiadas.',
    erroComum: 'Tirar o quadril do banco.',
  };
  const linhas = linhasDeDetalhe(completo, 'Barra, Banco');
  assert.deepEqual(
    linhas.map((linha) => linha.rotulo),
    [
      ROTULOS_DETALHE.tecnica,
      ROTULOS_DETALHE.principal,
      ROTULOS_DETALHE.secundarios,
      ROTULOS_DETALHE.cuidados,
      ROTULOS_DETALHE.evite,
      ROTULOS_DETALHE.equipamentos,
    ],
  );
  assert.equal(linhas.find((linha) => linha.id === 'principal').texto, 'Peitoral maior');
  assert.equal(
    linhas.find((linha) => linha.id === 'secundarios').texto,
    'Tríceps, Parte da frente dos ombros',
  );
  assert.equal(linhas.find((linha) => linha.id === 'equipamentos').texto, 'Barra, Banco');
  assert.equal(linhas.find((linha) => linha.id === 'tecnica').texto, completo.tecnica);
  assert.equal(linhas.find((linha) => linha.id === 'cuidados').texto, completo.cuidado);
  assert.equal(linhas.find((linha) => linha.id === 'evite').texto, completo.erroComum);

  const soNome = linhasDeDetalhe({ nome: 'Alongamento livre' }, '   ');
  assert.deepEqual(soNome, []);

  const pelosCodigos = musculosSecundariosLegiveis({
    secundariosCodigos: ['triceps', 'deltoide_anterior'],
    musculosSecundarios: 'texto antigo',
  });
  assert.equal(pelosCodigos, 'Tríceps, Parte da frente dos ombros');
});
