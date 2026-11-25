export const ROTULO_ESTADO = {
  nao_iniciado: 'Não iniciado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
};

export const ORDEM_ESTADOS = ['em_andamento', 'nao_iniciado', 'concluido'];

/** Estado da ficha a partir do que o servidor informa na listagem; a consulta não grava nada. */
export function estadoDaFicha(treino) {
  if (treino?.realizado) return 'concluido';
  return treino?.estadoExecucao === 'em_andamento' ? 'em_andamento' : 'nao_iniciado';
}

export function separarFichas(treinos) {
  const grupos = { em_andamento: [], nao_iniciado: [], concluido: [] };
  (treinos || []).forEach((treino) => {
    grupos[estadoDaFicha(treino)].push(treino);
  });
  return grupos;
}
