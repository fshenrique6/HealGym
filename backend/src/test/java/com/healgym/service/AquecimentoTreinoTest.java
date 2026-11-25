package com.healgym.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.junit.jupiter.api.Test;

class AquecimentoTreinoTest {

  @Test
  void aquecimentoNaoReduzNemSomaNasSeriesEfetivas() {
    Map<String, Object> primeiro = new LinkedHashMap<>();
    primeiro.put("series", 4);
    primeiro.put("seriesAproximacao", 2);
    Map<String, Object> segundo = new LinkedHashMap<>();
    segundo.put("series", 3);
    segundo.put("seriesAproximacao", 1);
    SessionPlanner.marcarAquecimentoInicial(Arrays.asList(primeiro, segundo));

    assertEquals(4, primeiro.get("series"));
    assertEquals(3, segundo.get("series"));
    assertEquals(1, primeiro.get("seriesAproximacao"));
    assertEquals(0, segundo.get("seriesAproximacao"));
  }

  @Test
  void cadaSessaoDoProgramaTemUmaSerieLeveSoNoInicio() {
    for (String grupamento : SessionPlanner.GRUPAMENTOS) {
      for (String modo : new String[] {"hipertrofia", "forca", "resistencia"}) {
        for (int experiencia : new int[] {1, 2, 3}) {
          WorkoutGenerator.Session sessao =
              WorkoutGenerator.montar(grupamento, 75, experiencia, modo, 11);
          assertAquecimento(sessao.exercicios, grupamento + " " + modo + " " + experiencia);
        }
      }
    }
  }

  @Test
  void registroSeparaAquecimentoDasSeriesDeTrabalho() {
    List<Map<String, Object>> itens = Arrays.asList(item("e1", 4), item("e2", 3));
    Date agora = new Date();
    Map<String, Object> aquecimento = new LinkedHashMap<>();
    aquecimento.put("carga", 20);
    aquecimento.put("repeticoes", 12);
    aquecimento.put("concluida", true);
    Map<String, Object> primeiro = new LinkedHashMap<>();
    primeiro.put("uid", "e1");
    primeiro.put("series", Arrays.asList(serie(1, 40, 12)));
    primeiro.put("aquecimento", aquecimento);
    Map<String, Object> segundo = new LinkedHashMap<>();
    segundo.put("uid", "e2");
    segundo.put("series", Arrays.asList(serie(1, 30, 10)));
    segundo.put("aquecimento", aquecimento);

    List<Document> salvos = ExecucaoRegras.mesclar(itens, Arrays.asList(primeiro, segundo), null, agora);
    Document doPrimeiro = salvos.get(0);
    Document doSegundo = salvos.get(1);
    assertEquals(1, ExecucaoRegras.seriesConcluidas(doPrimeiro).size());
    assertEquals(4, doPrimeiro.get("seriesPrescritas"));
    assertEquals(20.0, ((Document) doPrimeiro.get("aquecimento")).get("carga"));
    assertNull(doSegundo.get("aquecimento"));

    Map<String, Object> deNovo = new LinkedHashMap<>();
    deNovo.put("uid", "e1");
    deNovo.put("series", Arrays.asList(serie(1, 40, 12), serie(2, 40, 12)));
    List<Document> preservado =
        ExecucaoRegras.mesclar(itens, Arrays.asList(deNovo), salvos, new Date(agora.getTime() + 1000));
    assertEquals(20.0, ((Document) preservado.get(0).get("aquecimento")).get("carga"));
    assertEquals(2, ExecucaoRegras.seriesConcluidas(preservado.get(0)).size());

    Document execucao = new Document("exercicios", preservado);
    Map<String, Object> progresso = ExecucaoRegras.progresso("ex-e1", "Exercício e1", Arrays.asList(execucao), 3);
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> sessoes = (List<Map<String, Object>>) progresso.get("sessoes");
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> series = (List<Map<String, Object>>) sessoes.get(0).get("series");
    assertEquals(2, series.size());
    assertTrue(series.stream().noneMatch(serie -> Integer.valueOf(20).equals(serie.get("carga")) || Double.valueOf(20).equals(serie.get("carga"))));
  }

  private static void assertAquecimento(List<Map<String, Object>> exercicios, String contexto) {
    assertTrue(exercicios.size() > 1, contexto);
    int preparatorias = 0;
    for (int i = 0; i < exercicios.size(); i++) {
      Map<String, Object> item = exercicios.get(i);
      int series = SessionPlanner.numero(item.get("series"));
      int aquecimento = SessionPlanner.numero(item.get("seriesAproximacao"));
      assertTrue(series >= 1, contexto + " perdeu série efetiva");
      assertEquals(i == 0 ? 1 : 0, aquecimento, contexto + " exercício " + i);
      preparatorias += aquecimento;
    }
    assertEquals(1, preparatorias, contexto);
  }

  private static Map<String, Object> item(String uid, int series) {
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("uid", uid);
    item.put("exercicioId", "ex-" + uid);
    item.put("nome", "Exercício " + uid);
    item.put("series", series);
    item.put("repeticoes", "12-15");
    item.put("tipoCarga", "barra_total");
    return item;
  }

  private static Map<String, Object> serie(int numero, int carga, int repeticoes) {
    Map<String, Object> serie = new LinkedHashMap<>();
    serie.put("numero", numero);
    serie.put("carga", carga);
    serie.put("repeticoes", repeticoes);
    serie.put("concluida", true);
    return serie;
  }
}
