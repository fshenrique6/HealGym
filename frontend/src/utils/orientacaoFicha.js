export const TEXTO_AQUECIMENTO = 'Aquecimento: 1 série leve antes de começar.';

/** Séries leves prescritas. Ficha antiga, sem o campo, mantém uma série só no primeiro exercício. */
export function seriesPreparatorias(exercicio, indice) {
  const bruto = exercicio?.seriesAproximacao;
  if (bruto === undefined || bruto === null || bruto === '') {
    return Number(indice) === 0 ? 1 : 0;
  }
  const quantidade = Number(bruto);
  return Number.isFinite(quantidade) && quantidade > 0 ? Math.floor(quantidade) : 0;
}

export function textoAquecimento(exercicio, indice) {
  const quantidade = seriesPreparatorias(exercicio, indice);
  if (quantidade <= 0) return '';
  if (quantidade === 1) return TEXTO_AQUECIMENTO;
  return `Aquecimento: ${quantidade} séries leves antes de começar.`;
}

function faixaFalada(repeticoes) {
  const texto = String(repeticoes ?? '')
    .trim()
    .replace(/–/g, '-');
  if (!texto || /\d+\s*s\b/i.test(texto)) return '';
  const faixa = texto.match(/(\d+)\s*-\s*(\d+)/);
  if (faixa) {
    const inicio = Number(faixa[1]);
    const fim = Number(faixa[2]);
    if (inicio === fim) return inicio === 1 ? '1 repetição' : `${inicio} repetições`;
    return `de ${inicio} a ${fim} repetições`;
  }
  const unico = texto.match(/^(\d+)$/);
  if (!unico) return '';
  const n = Number(unico[1]);
  return n === 1 ? '1 repetição' : `${n} repetições`;
}

function sobraFalada(reserva) {
  const texto = String(reserva ?? '')
    .trim()
    .replace(/–/g, '-');
  if (!texto) return '';
  const faixa = texto.match(/^(\d+)\s*-\s*(\d+)$/);
  if (faixa) return `${Number(faixa[1])} ou ${Number(faixa[2])}`;
  const unico = texto.match(/^(\d+)$/);
  if (!unico) return '';
  return Number(unico[1]) === 0 ? 'nenhuma' : String(Number(unico[1]));
}

/** Frase da ficha. Usa a faixa e a reserva já prescritas, sem recalcular carga. */
export function orientacaoDeCarga(repeticoes, reserva) {
  const faixa = faixaFalada(repeticoes);
  const sobra = sobraFalada(reserva);
  if (!faixa || !sobra) return '';
  if (sobra === 'nenhuma') {
    return `Escolha uma carga que permita fazer ${faixa}, sem deixar repetições sobrando.`;
  }
  return `Escolha uma carga que permita fazer ${faixa}, deixando ${sobra} sobrando.`;
}
