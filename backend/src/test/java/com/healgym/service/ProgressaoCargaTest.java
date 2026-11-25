package com.healgym.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ProgressaoCargaTest {

  /** Série concluída: {carga, repetições, rir}; valores nulos significam "não registrado". */
  static Map<String, Object> serie(Double carga, Integer repeticoes, Integer rir) {
    Map<String, Object> serie = new LinkedHashMap<>();
    serie.put("carga", carga);
    serie.put("repeticoes", repeticoes);
    serie.put("rir", rir);
    return serie;
  }

  @SafeVarargs
  static Map<String, Object> sessao(String reps, int series, String tipoCarga, Map<String, Object>... feitas) {
    Map<String, Object> sessao = new LinkedHashMap<>();
    sessao.put("repeticoesPrescritas", reps);
    sessao.put("seriesPrescritas", series);
    sessao.put("tipoCarga", tipoCarga);
    sessao.put("series", new ArrayList<>(Arrays.asList(feitas)));
    return sessao;
  }

  static Map<String, Object> tres(String reps, String tipoCarga, double carga, int a, int b, int c) {
    return sessao(reps, 3, tipoCarga, serie(carga, a, null), serie(carga, b, null), serie(carga, c, null));
  }

  @SafeVarargs
  static Map<String, Object> recomendar(Map<String, Object>... sessoes) {
    return ProgressaoCarga.recomendar(Arrays.asList(sessoes), null, null, null);
  }

  static void semRir(Map<String, Object> recomendacao) {
    assertFalse(String.valueOf(recomendacao.get("texto")).contains("RIR"), "RIR não registrado não aparece");
  }

  @Test
  void semHistoricoPedeOPrimeiroRegistro() {
    Map<String, Object> r = ProgressaoCarga.recomendar(new ArrayList<>(), "8-12", 3, "barra_total");
    assertEquals(ProgressaoCarga.REGISTRAR_MAIS, r.get("tipo"));
    assertEquals("8-12", r.get("faixa"));
    assertTrue(((List<?>) r.get("baseadoEm")).isEmpty());
  }

  @Test
  void prescricaoPorTempoNaoRecebeSugestao() {
    assertNull(ProgressaoCarga.recomendar(new ArrayList<>(), "30-45 s", 3, "peso_corporal"));
    assertNull(recomendar(sessao("30s", 2, "peso_corporal", serie(null, 30, null))));
  }

  @Test
  void dadosIncompletosPedemRegistro() {
    Map<String, Object> semReps = recomendar(sessao("8-12", 3, "maquina", serie(40.0, null, null)));
    assertEquals(ProgressaoCarga.REGISTRAR_MAIS, semReps.get("tipo"));

    Map<String, Object> semCarga =
        recomendar(sessao("8-12", 2, "maquina", serie(null, 10, null), serie(null, 10, null)));
    assertEquals(ProgressaoCarga.REGISTRAR_MAIS, semCarga.get("tipo"));

    Map<String, Object> pesoCorporal =
        recomendar(sessao("8-12", 2, "peso_corporal", serie(null, 10, null), serie(null, 9, null)));
    assertEquals(ProgressaoCarga.BUSCAR_REPETICOES, pesoCorporal.get("tipo"), "Peso corporal dispensa carga");
  }

  @Test
  void seriesIncompletasVemAntesDaCarga() {
    Map<String, Object> r =
        recomendar(sessao("8-12", 3, "barra_total", serie(40.0, 12, null), serie(40.0, 12, null)));
    assertEquals(ProgressaoCarga.COMPLETAR_SERIES, r.get("tipo"));
    assertTrue(String.valueOf(r.get("texto")).contains("2 de 3"));
    semRir(r);
  }

  @Test
  void dentroDaFaixaBuscaRepeticoesComAMesmaCarga() {
    Map<String, Object> r = recomendar(tres("8-12", "barra_total", 22.5, 10, 9, 9));
    assertEquals(ProgressaoCarga.BUSCAR_REPETICOES, r.get("tipo"));
    assertTrue(String.valueOf(r.get("texto")).contains("Mantenha 22,5 kg"));
    assertTrue(String.valueOf(r.get("texto")).contains("12"));
    assertEquals(1, ((List<?>) r.get("baseadoEm")).size());
    semRir(r);
  }

  @Test
  void topoUmaVezPedeParaRepetirAntesDeAumentar() {
    Map<String, Object> r = recomendar(tres("8-12", "barra_total", 40, 12, 12, 12), tres("8-12", "barra_total", 40, 11, 10, 10));
    assertEquals(ProgressaoCarga.MANTER, r.get("tipo"));
    assertTrue(String.valueOf(r.get("texto")).contains("Repita"));
    semRir(r);
  }

  @Test
  void topoDuasVezesComAMesmaCargaSugereIncrementoPequeno() {
    Map<String, Object> barra = recomendar(tres("8-12", "barra_total", 40, 12, 12, 12), tres("8-12", "barra_total", 40, 12, 12, 13));
    assertEquals(ProgressaoCarga.AUMENTAR_CARGA, barra.get("tipo"));
    assertTrue(String.valueOf(barra.get("texto")).contains("2 a 2,5 kg"));
    assertEquals(2, ((List<?>) barra.get("baseadoEm")).size());
    semRir(barra);

    Map<String, Object> halteres = recomendar(tres("10-15", "por_halter", 12, 15, 15, 15), tres("10-15", "por_halter", 12, 15, 15, 15));
    assertEquals(ProgressaoCarga.AUMENTAR_CARGA, halteres.get("tipo"));
    assertTrue(String.valueOf(halteres.get("texto")).contains("próximo halter"));
  }

  @Test
  void topoComCargasDiferentesNaoContaComoRepeticao() {
    Map<String, Object> r = recomendar(tres("8-12", "maquina", 50, 12, 12, 12), tres("8-12", "maquina", 45, 12, 12, 12));
    assertEquals(ProgressaoCarga.MANTER, r.get("tipo"));
  }

  @Test
  void rirZeroRegistradoSeguraOAumento() {
    Map<String, Object> ultima =
        sessao("8-12", 3, "barra_total", serie(40.0, 12, 1), serie(40.0, 12, 0), serie(40.0, 12, 0));
    Map<String, Object> r = recomendar(ultima, tres("8-12", "barra_total", 40, 12, 12, 12));
    assertEquals(ProgressaoCarga.MANTER, r.get("tipo"));
    assertTrue(String.valueOf(r.get("texto")).contains("RIR 0"));

    Map<String, Object> comFolga =
        sessao("8-12", 3, "barra_total", serie(40.0, 12, 2), serie(40.0, 12, 1), serie(40.0, 12, 1));
    assertEquals(ProgressaoCarga.AUMENTAR_CARGA, recomendar(comFolga, tres("8-12", "barra_total", 40, 12, 12, 12)).get("tipo"));
  }

  @Test
  void pesoCorporalNoTopoSugereVariacaoMaisDificil() {
    Map<String, Object> sessao =
        sessao("8-12", 3, "peso_corporal", serie(null, 12, null), serie(null, 12, null), serie(null, 12, null));
    Map<String, Object> r = recomendar(sessao, sessao);
    assertEquals(ProgressaoCarga.VARIACAO_MAIS_DIFICIL, r.get("tipo"));
    semRir(r);
  }

  @Test
  void umaSessaoRuimMantemDuasSeguidasReduzem() {
    Map<String, Object> ruim = tres("8-12", "maquina", 60, 7, 6, 6);
    assertEquals(ProgressaoCarga.MANTER, recomendar(ruim, tres("8-12", "maquina", 55, 10, 10, 9)).get("tipo"));

    Map<String, Object> r = recomendar(ruim, tres("8-12", "maquina", 60, 7, 7, 6));
    assertEquals(ProgressaoCarga.REDUZIR_CARGA, r.get("tipo"));
    assertTrue(String.valueOf(r.get("texto")).contains("5 a 10%"));
    semRir(r);

    Map<String, Object> jaReduziu = recomendar(tres("8-12", "maquina", 55, 7, 7, 6), tres("8-12", "maquina", 60, 7, 6, 6));
    assertEquals(ProgressaoCarga.MANTER, jaReduziu.get("tipo"), "Não reduz de novo logo após reduzir");
  }

  @Test
  void prescricaoAtualTemPrioridadeSobreAAntiga() {
    Map<String, Object> antiga = tres("6-8", "barra_total", 60, 8, 8, 8);
    assertEquals(ProgressaoCarga.MANTER, recomendar(antiga).get("tipo"));
    Map<String, Object> r = ProgressaoCarga.recomendar(List.of(antiga), "8-12", 3, "barra_total");
    assertEquals(ProgressaoCarga.BUSCAR_REPETICOES, r.get("tipo"));
    assertEquals("8-12", r.get("faixa"));
    Map<String, Object> maisSeries = ProgressaoCarga.recomendar(List.of(antiga), "6-8", 4, "barra_total");
    assertEquals(ProgressaoCarga.COMPLETAR_SERIES, maisSeries.get("tipo"));
  }
}
