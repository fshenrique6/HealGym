import assert from 'node:assert/strict';
import test from 'node:test';
import { destinoVolta, estadoOrigem, lerConsulta, montarConsulta, rotuloDeOrigem } from './navegacaoTreino.js';

test('a origem aceita só os destinos conhecidos do HealGym', () => {
  assert.deepEqual(estadoOrigem('dashboard'), { origem: 'dashboard' });
  assert.deepEqual(estadoOrigem('treino'), { origem: 'treino' });
  assert.deepEqual(estadoOrigem('historico'), { origem: 'historico' });
  assert.equal(estadoOrigem('/dashboard'), undefined);
  assert.equal(estadoOrigem('https://exemplo.test'), undefined);
  assert.equal(estadoOrigem('../admin'), undefined);
  assert.equal(estadoOrigem(''), undefined);
  assert.equal(estadoOrigem(undefined), undefined);
});

test('voltar usa a origem salva e cai no centro quando o acesso é direto', () => {
  assert.equal(destinoVolta({ origem: 'dashboard' }), '/dashboard');
  assert.equal(destinoVolta({ origem: 'treino' }), '/treino');
  assert.equal(destinoVolta({ origem: 'historico' }), '/treino#historico');
  assert.equal(destinoVolta({ origem: '/dashboard' }), '/treino');
  assert.equal(destinoVolta({ origem: 'javascript:alert(1)' }), '/treino');
  assert.equal(destinoVolta(null), '/treino');
  assert.equal(destinoVolta({}), '/treino');
});

test('a consulta da sessão planejada não leva endereço nem ação escondida', () => {
  const consulta = montarConsulta(
    {
      codigo: 'B',
      nome: 'Treino B',
      focoRotulo: 'Corpo inteiro',
      minutos: 48,
      avisos: ['Mantenha o controle da descida.'],
      destino: '/admin',
      exercicios: [
        {
          nome: 'Agachamento Goblet',
          series: 3,
          repeticoes: '8–12',
          descanso: '90s',
          videoUrl: 'javascript:alert(1)',
          tecnica: 'Desça até a coxa ficar paralela ao chão.',
        },
      ],
    },
    { liberada: false, bloqueio: 'Conclua o Treino A para liberar este treino.' },
  );
  assert.equal(consulta.titulo, 'Treino B · Corpo inteiro');
  assert.equal(consulta.liberada, false);
  assert.equal(consulta.bloqueio, 'Conclua o Treino A para liberar este treino.');
  assert.equal(consulta.exercicios[0].videoUrl, undefined);
  assert.equal(consulta.destino, undefined);
  assert.equal(montarConsulta({ codigo: 'Z', exercicios: [{ nome: 'A', series: 1 }] }), null);
  assert.equal(montarConsulta({ codigo: 'A', exercicios: [] }), null);

  const relida = lerConsulta({ origem: 'dashboard', consulta });
  assert.equal(relida.codigo, 'B');
  assert.equal(relida.exercicios[0].nome, 'Agachamento Goblet');
  assert.equal(lerConsulta({ consulta: { codigo: '/dashboard', titulo: 'Treino', exercicios: [{ nome: 'A' }] } }), null);
  assert.equal(lerConsulta(null), null);
  assert.equal(destinoVolta({ origem: 'dashboard', consulta }), '/dashboard');
});

test('o rótulo do botão acompanha a origem', () => {
  assert.equal(rotuloDeOrigem({ origem: 'dashboard' }), 'Dashboard');
  assert.equal(rotuloDeOrigem({ origem: 'treino' }), 'Treinos');
  assert.equal(rotuloDeOrigem({ origem: 'historico' }), 'Histórico');
  assert.equal(rotuloDeOrigem({ origem: '/treino' }), 'Treinos');
});
