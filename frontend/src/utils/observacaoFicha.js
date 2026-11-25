/** Aviso explicativo do gerador. Não entra na ficha; o limite de volume continua valendo. */
export function observacaoVisivel(texto) {
  const limpo = String(texto ?? '').trim();
  if (!limpo || /volume recuper[aá]vel/i.test(limpo)) return '';
  return limpo;
}
