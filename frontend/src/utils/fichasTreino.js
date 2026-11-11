export const ROTULO_ESTADO = {
  nao_iniciado: 'Não iniciado',
  em_andamento: 'Em andamento',
  concluido: 'Realizado',
};

export function classificarFicha(treino, consulta) {
  if (treino?.realizado) {
    return { ...treino, estado: 'concluido' };
  }
  if (!consulta || consulta.ok === false) {
    return { ...treino, estado: 'nao_iniciado' };
  }
  return {
    ...treino,
    estado: consulta.data?.iniciadoEm ? 'em_andamento' : 'nao_iniciado',
  };
}

export function separarFichas(fichas) {
  return {
    salvas: fichas.filter((ficha) => ficha.estado === 'nao_iniciado'),
    historico: fichas.filter(
      (ficha) => ficha.estado === 'em_andamento' || ficha.estado === 'concluido',
    ),
  };
}
