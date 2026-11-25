package com.healgym.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import java.util.Arrays;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;

/**
 * A progressão já lê repetições, carga e RIR. Estes testes exigem que a data da sessão também
 * entre na decisão e que uma correção tardia não reordene o histórico.
 */
class ProgressaoDataDiagnosticoTest {

  private static final long DIA = 24L * 60 * 60 * 1000;
  /**
   * Instante em que o teste roda. A âncora antiga (novembro de 2023) faria toda sessão parecer uma
   * pausa de anos para o relógio real, e o treino de 3 dias atrás deixaria de ser recente.
   */
  private static final Date HOJE = new Date();

  @Test
  void treinoRegularNoTopoPedeAumento() {
    Map<String, Object> recomendacao = recomendar(topo(diasAtras(3)), topo(diasAtras(6)));
    assertEquals(ProgressaoCarga.AUMENTAR_CARGA, recomendacao.get("tipo"));
  }

  @Test
  void trintaDiasSemTreinarNaoPedeAumento() {
    pausaNaoAumenta(30);
  }

  @Test
  void sessentaDiasSemTreinarNaoPedeAumento() {
    pausaNaoAumenta(60);
  }

  @Test
  void noventaDiasSemTreinarNaoPedeAumento() {
    pausaNaoAumenta(90);
  }

  @Test
  void umaSessaoAbaixoDaFaixaMantem() {
    Map<String, Object> recomendacao = recomendar(sessao(diasAtras(2), 40, 5, 6, 7));
    assertEquals(ProgressaoCarga.MANTER, recomendacao.get("tipo"));
  }

  @Test
  void duasSessoesRecentesAbaixoDaFaixaReduzem() {
    Map<String, Object> recomendacao =
        recomendar(sessao(diasAtras(2), 40, 4, 5, 6), sessao(diasAtras(5), 40, 5, 6, 7));
    assertEquals(ProgressaoCarga.REDUZIR_CARGA, recomendacao.get("tipo"));
  }

  @Test
  void dentroDaFaixaBuscaRepeticoes() {
    Map<String, Object> recomendacao = recomendar(sessao(diasAtras(2), 40, 9, 10, 11));
    assertEquals(ProgressaoCarga.BUSCAR_REPETICOES, recomendacao.get("tipo"));
  }

  @Test
  void umaSessaoAcimaDaFaixaAindaNaoAumenta() {
    Map<String, Object> recomendacao = recomendar(sessao(diasAtras(2), 40, 12, 13, 12));
    assertEquals(
        ProgressaoCarga.MANTER,
        recomendacao.get("tipo"),
        "Uma sessão no topo, mesmo passando da faixa, pede repetir a carga. " + recomendacao.get("texto"));
  }

  @Test
  void duasSessoesRecentesAcimaDaFaixaPedemAumento() {
    Map<String, Object> recomendacao =
        recomendar(sessao(diasAtras(2), 40, 12, 13, 12), sessao(diasAtras(5), 40, 12, 12, 14));
    assertEquals(ProgressaoCarga.AUMENTAR_CARGA, recomendacao.get("tipo"), recomendacao.get("texto").toString());
  }

  @Test
  void historicoInsuficientePedeRegistro() {
    Map<String, Object> recomendacao = ProgressaoCarga.recomendar(List.of(), "8-12", 3, "barra_total");
    assertEquals(ProgressaoCarga.REGISTRAR_MAIS, recomendacao.get("tipo"));
  }

  @Test
  void rirZeroRegistradoSeguraOAumentoMesmoComDataRecente() {
    Map<String, Object> ultima = topo(diasAtras(3));
    for (Map<String, Object> serie : series(ultima)) {
      serie.put("rir", 0);
    }
    Map<String, Object> recomendacao = recomendar(ultima, topo(diasAtras(6)));
    assertEquals(ProgressaoCarga.MANTER, recomendacao.get("tipo"));
  }

  @Test
  void correcaoTardiaNaoPodePassarNaFrenteDaSessaoMaisRecente() {
    String id = "medio-supino-reto-com-barra";
    Document antigaCorrigidaHoje =
        execucao(id, diasAtras(90), HOJE, 40, 12, 12, 12);
    Document recenteAbaixo =
        execucao(id, diasAtras(2), diasAtras(2), 40, 5, 6, 7);
    List<Document> comoORepositorio = List.of(antigaCorrigidaHoje, recenteAbaixo);
    Map<String, Object> progresso =
        ExecucaoRegras.progresso(id, "Supino Reto com Barra", comoORepositorio, 5);
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> sessoes = (List<Map<String, Object>>) progresso.get("sessoes");
    Map<String, Object> recomendacao =
        ProgressaoCarga.recomendar(sessoes, "8-12", 3, "barra_total");
    assertAll(
        () ->
            assertEquals(
                diasAtras(2),
                sessoes.get(0).get("data"),
                "A lista imita ExecutionRepository.recentes, que ordena por updatedAt. A sessão corrigida "
                    + "hoje ficou na frente da sessão realizada há 2 dias."),
        () ->
            assertEquals(
                "Mantenha a carga",
                recomendacao.get("titulo"),
                "A sessão mais recente ficou abaixo de 8 repetições. A recomendação leu a correção de "
                    + "90 dias atrás como se fosse o último treino. Texto: "
                    + recomendacao.get("texto")));
  }

  private static void pausaNaoAumenta(int dias) {
    Map<String, Object> recomendacao =
        recomendar(topo(diasAtras(dias)), topo(diasAtras(dias + 3)));
    assertNotEquals(
        ProgressaoCarga.AUMENTAR_CARGA,
        recomendacao.get("tipo"),
        dias
            + " dias desde a última sessão no topo da faixa e a recomendação foi \""
            + recomendacao.get("titulo")
            + "\". A data vai no campo data de cada sessão e hoje é ignorada. Texto: "
            + recomendacao.get("texto"));
    assertNotEquals(ProgressaoCarga.VARIACAO_MAIS_DIFICIL, recomendacao.get("tipo"));
  }

  private static Map<String, Object> recomendar(Map<String, Object>... sessoes) {
    return ProgressaoCarga.recomendar(Arrays.asList(sessoes), "8-12", 3, "barra_total");
  }

  private static Map<String, Object> topo(Date data) {
    return sessao(data, 40, 12, 12, 12);
  }

  private static Map<String, Object> sessao(Date data, double carga, int a, int b, int c) {
    Map<String, Object> sessao = new LinkedHashMap<>();
    sessao.put("data", data);
    sessao.put("repeticoesPrescritas", "8-12");
    sessao.put("seriesPrescritas", 3);
    sessao.put("tipoCarga", "barra_total");
    sessao.put(
        "series",
        List.of(serie(carga, a, 2), serie(carga, b, 2), serie(carga, c, 2)));
    return sessao;
  }

  private static Map<String, Object> serie(double carga, int repeticoes, int rir) {
    Map<String, Object> serie = new LinkedHashMap<>();
    serie.put("carga", carga);
    serie.put("repeticoes", repeticoes);
    serie.put("rir", rir);
    return serie;
  }

  @SuppressWarnings("unchecked")
  private static List<Map<String, Object>> series(Map<String, Object> sessao) {
    return (List<Map<String, Object>>) sessao.get("series");
  }

  private static Date diasAtras(int dias) {
    return new Date(HOJE.getTime() - dias * DIA);
  }

  private static Document execucao(
      String exercicioId, Date finalizado, Date atualizado, double carga, int a, int b, int c) {
    List<Document> series = new ArrayListSeries(carga, a, b, c);
    Document entrada =
        new Document("uid", "ex1")
            .append("exercicioId", exercicioId)
            .append("nome", "Supino Reto com Barra")
            .append("tipoCarga", "barra_total")
            .append("seriesPrescritas", 3)
            .append("repeticoesPrescritas", "8-12")
            .append("series", series);
    return new Document("workout", new ObjectId())
        .append("finalizadoEm", finalizado)
        .append("updatedAt", atualizado)
        .append("exercicios", List.of(entrada));
  }

  private static final class ArrayListSeries extends java.util.ArrayList<Document> {
    ArrayListSeries(double carga, int a, int b, int c) {
      add(serie(1, carga, a));
      add(serie(2, carga, b));
      add(serie(3, carga, c));
    }

    private static Document serie(int numero, double carga, int repeticoes) {
      return new Document("numero", numero)
          .append("carga", carga)
          .append("repeticoes", repeticoes)
          .append("rir", 2)
          .append("concluida", true);
    }
  }
}
