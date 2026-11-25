function numeroProximo(esquerda, direita) {
  const a = Number(esquerda);
  const b = Number(direita);
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.001;
}

function serieGravada(salvo, serie) {
  const encontrada = (salvo?.series || []).find((item) => Number(item?.numero) === Number(serie?.numero));
  if (!encontrada) return false;
  if (Boolean(encontrada.concluida) !== Boolean(serie.concluida)) return false;
  if (!serie.concluida) return true;
  return numeroProximo(encontrada.carga, serie.carga) && numeroProximo(encontrada.repeticoes, serie.repeticoes);
}

/** A resposta sumiu: só considera a série salva se o documento persistido tiver os mesmos valores. */
export function execucaoConfirmaPayload(execucao, exercicios) {
  const gravados = new Map((execucao?.exercicios || []).map((item) => [item?.uid, item]));
  return (exercicios || []).every((pedido) => {
    const salvo = gravados.get(pedido?.uid);
    if (!salvo) return false;
    if (!(pedido?.series || []).every((serie) => serieGravada(salvo, serie))) return false;
    if (pedido.aquecimento) return execucaoConfirmaAquecimento(execucao, pedido.uid, pedido.aquecimento);
    return true;
  });
}

export function execucaoConfirmaAquecimento(execucao, uid, registro) {
  const salvo = (execucao?.exercicios || []).find((item) => item?.uid === uid);
  const aquecimento = salvo?.aquecimento;
  if (!aquecimento?.concluida || !registro?.concluida) return false;
  return numeroProximo(aquecimento.carga, registro.carga) && numeroProximo(aquecimento.repeticoes, registro.repeticoes);
}
