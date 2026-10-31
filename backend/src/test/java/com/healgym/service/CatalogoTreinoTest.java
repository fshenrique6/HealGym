package com.healgym.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

/**
 * Suíte pura de catálogo e geração. Não abre MongoDB, não usa rede e não grava arquivo.
 *
 * <p>Não chama {@code WorkoutGenerationCheck}. O {@code main} dessa classe executa
 * {@code testarMongo()}, que apaga {@code healgym_teste.workout_executions}. O Surefire
 * a exclui de propósito.
 *
 * <p>Contagens travadas pela execução desta classe, não pela auditoria anterior: o índice
 * tem 103 exercícios, todos com id único, e nenhum foi descartado por {@code putIfAbsent}.
 * 49 ficam ativos porque {@code ativarCatalogoPrincipal} casa {@code grupo|nome} com 9 de
 * peito, 7 de costas, 7 de ombros, 5 de tríceps, 4 de bíceps, 12 de pernas e 5 de core.
 * Os outros 54 permanecem no índice, inativos, para treinos já gravados.
 */
class CatalogoTreinoTest {

  private static final int EXERCICIOS_NO_INDICE = 103;
  private static final int EXERCICIOS_ATIVOS = 49;

  private static final List<String> ATIVOS_ESPERADOS =
      Arrays.asList(
          "PEITO|Supino Reto com Barra",
          "PEITO|Supino Reto com Halteres",
          "PEITO|Supino Inclinado com Barra",
          "PEITO|Supino Inclinado com Halteres",
          "PEITO|Supino Declinado com Barra",
          "PEITO|Chest Press na Máquina",
          "PEITO|Crucifixo Reto com Halteres",
          "PEITO|Voador Peitoral",
          "PEITO|Cross Over na Polia Alta",
          "COSTAS|Puxada Frontal Pegada Aberta",
          "COSTAS|Pulldown com Pegada Supinada",
          "COSTAS|Barra Fixa",
          "COSTAS|Remada Curvada com Barra",
          "COSTAS|Remada Unilateral com Halter",
          "COSTAS|Remada na Polia Baixa",
          "COSTAS|Remada Cavalinho com Barra",
          "OMBROS|Desenvolvimento com Barra",
          "OMBROS|Desenvolvimento com Halteres",
          "OMBROS|Desenvolvimento na Máquina",
          "OMBROS|Elevação Lateral com Halteres",
          "OMBROS|Crucifixo Inverso com Halteres",
          "OMBROS|Voador Invertido",
          "OMBROS|Face Pull na Polia Alta",
          "TRICEPS|Tríceps Pulley na Polia Alta",
          "TRICEPS|Tríceps Corda na Polia Alta",
          "TRICEPS|Tríceps Testa com Barra",
          "TRICEPS|Tríceps Francês com Halteres",
          "TRICEPS|Mergulho entre Bancos",
          "BICEPS|Rosca Direta com Barra",
          "BICEPS|Rosca Alternada com Halteres",
          "BICEPS|Rosca Martelo com Halteres",
          "BICEPS|Rosca Scott com Barra",
          "PERNAS|Agachamento com Barra",
          "PERNAS|Leg Press",
          "PERNAS|Cadeira Extensora",
          "PERNAS|Mesa Flexora",
          "PERNAS|Cadeira Flexora",
          "PERNAS|Levantamento Terra Romeno",
          "PERNAS|Afundo com Halteres",
          "PERNAS|Afundo Búlgaro com Halteres",
          "PERNAS|Hip Thrust com Barra",
          "PERNAS|Panturrilha em Máquina",
          "PERNAS|Panturrilha Sentado com Halteres",
          "PERNAS|Agachamento Goblet com Halter",
          "CORE|Prancha",
          "CORE|Abdominal Tradicional",
          "CORE|Elevação de Joelhos",
          "CORE|Prancha Lateral",
          "CORE|Dead Bug");

  private static final Map<String, Set<String>> PADROES_ATIVOS_POR_GRUPO = padroesAtivos();

  @Test
  void idsSaoUnicosENenhumFoiDescartado() {
    List<ExerciseDatabase.Exercise> entradas = entradasDoCatalogo();
    Set<String> ids = new LinkedHashSet<>();
    List<String> repetidos = new ArrayList<>();
    for (ExerciseDatabase.Exercise exercicio : entradas) {
      if (!ids.add(exercicio.id)) {
        repetidos.add(exercicio.id + " (" + exercicio.nome + ")");
      }
    }
    assertTrue(repetidos.isEmpty(), "ids repetidos nas listas: " + repetidos);
    assertEquals(entradas.size(), ExerciseDatabase.todos().size(), "putIfAbsent descartou um id");
    assertEquals(ids, new LinkedHashSet<>(idsDe(ExerciseDatabase.todos())));
  }

  @Test
  void contagemAtivaEInativa() {
    assertEquals(
        EXERCICIOS_ATIVOS,
        ATIVOS_ESPERADOS.size(),
        "a lista de regressão deixou de ter 49 chaves grupo|nome");
    assertEquals(EXERCICIOS_NO_INDICE, entradasDoCatalogo().size());
    assertEquals(EXERCICIOS_NO_INDICE, ExerciseDatabase.todos().size());
    assertEquals(EXERCICIOS_ATIVOS, ExerciseDatabase.ativos().size());
    assertEquals(
        EXERCICIOS_NO_INDICE - EXERCICIOS_ATIVOS,
        ExerciseDatabase.todos().size() - ExerciseDatabase.ativos().size());

    Set<String> ativos = new LinkedHashSet<>();
    for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.ativos()) {
      assertTrue(ativos.add(chave(exercicio)), "ativo duplicado " + exercicio.nome);
    }
    assertEquals(new LinkedHashSet<>(ATIVOS_ESPERADOS), ativos);
  }

  @Test
  void nomesRepetidosTemIdsDistintosESoUmaCopiaAtiva() {
    Map<String, List<ExerciseDatabase.Exercise>> porNome = new LinkedHashMap<>();
    for (ExerciseDatabase.Exercise exercicio : entradasDoCatalogo()) {
      porNome.computeIfAbsent(exercicio.nome, chave -> new ArrayList<>()).add(exercicio);
    }
    Set<String> repetidos = new LinkedHashSet<>();
    for (Map.Entry<String, List<ExerciseDatabase.Exercise>> entrada : porNome.entrySet()) {
      if (entrada.getValue().size() < 2) {
        continue;
      }
      repetidos.add(entrada.getKey());
      Set<String> ids = new LinkedHashSet<>();
      int ativos = 0;
      for (ExerciseDatabase.Exercise exercicio : entrada.getValue()) {
        assertTrue(ids.add(exercicio.id), entrada.getKey());
        assertNotNull(ExerciseDatabase.porId(exercicio.id));
        if (exercicio.ativo) {
          ativos++;
        }
      }
      assertEquals(1, ativos, entrada.getKey());
    }
    assertEquals(
        new LinkedHashSet<>(
            Arrays.asList(
                "Crucifixo Inverso com Halteres",
                "Face Pull na Polia Alta",
                "Levantamento Terra Romeno",
                "Mergulho entre Bancos")),
        repetidos);
  }

  @Test
  void inativosContinuamRecuperaveis() {
    assertHistorico("posteriores-stiff-com-halteres", "Stiff com Halteres", "PERNAS", false);
    assertHistorico(
        "lombar-levantamento-terra-romeno", "Levantamento Terra Romeno", "COSTAS", false);
    assertHistorico(
        "posteriores-levantamento-terra-romeno", "Levantamento Terra Romeno", "PERNAS", true);
    assertHistorico("inferior-mergulho-entre-bancos", "Mergulho entre Bancos", "PEITO", false);
    assertHistorico("lateral-mergulho-entre-bancos", "Mergulho entre Bancos", "TRICEPS", true);
    assertHistorico(
        "trapezio_medio-crucifixo-inverso-com-halteres",
        "Crucifixo Inverso com Halteres",
        "COSTAS",
        false);
    assertHistorico(
        "posterior-crucifixo-inverso-com-halteres",
        "Crucifixo Inverso com Halteres",
        "OMBROS",
        true);
    assertHistorico(
        "deltoide_posterior-face-pull-na-polia-alta", "Face Pull na Polia Alta", "COSTAS", false);
    assertHistorico(
        "posterior-face-pull-na-polia-alta", "Face Pull na Polia Alta", "OMBROS", true);
    assertHistorico("medio-supino-reto-com-barra", "Supino Reto com Barra", "PEITO", true);
    assertHistorico(
        "superior-supino-inclinado-com-halteres", "Supino Inclinado com Halteres", "PEITO", true);

    for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.todos()) {
      if (!exercicio.ativo) {
        assertNotNull(ExerciseDatabase.porId(exercicio.id), exercicio.nome);
      }
    }
  }

  @Test
  void ativosTemMetadadosObrigatorios() {
    for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.ativos()) {
      String rotulo = exercicio.id;
      assertFalse(exercicio.id == null || exercicio.id.isBlank(), rotulo);
      assertFalse(exercicio.nome == null || exercicio.nome.isBlank(), rotulo);
      assertFalse(exercicio.tecnica == null || exercicio.tecnica.isBlank(), rotulo);
      assertFalse(exercicio.equipamento.isEmpty(), rotulo);
      for (String equipamento : exercicio.equipamento) {
        assertTrue(ExerciseAnatomy.EQUIPAMENTOS.containsKey(equipamento), rotulo + " " + equipamento);
      }
      assertTrue(ExerciseAnatomy.PADROES.containsKey(exercicio.padrao), rotulo + " " + exercicio.padrao);
      assertTrue(PADROES_ATIVOS_POR_GRUPO.get(exercicio.grupo).contains(exercicio.padrao), rotulo);
      assertTrue(ExerciseAnatomy.MUSCULOS.containsKey(exercicio.principal), rotulo);
      for (String secundario : exercicio.secundarios) {
        assertTrue(ExerciseAnatomy.MUSCULOS.containsKey(secundario), rotulo + " " + secundario);
      }
      assertTrue(ExerciseAnatomy.CARGAS.containsKey(exercicio.tipoCarga), rotulo);
      assertFalse(exercicio.cuidado == null || exercicio.cuidado.isBlank(), rotulo);
      assertFalse(exercicio.erroComum == null || exercicio.erroComum.isBlank(), rotulo);
      assertTrue(exercicio.dificuldade >= 1 && exercicio.dificuldade <= 3, rotulo);
      assertNull(exercicio.videoUrl, rotulo);
      assertEquals("indisponivel", exercicio.videoStatus, rotulo);
    }
  }

  @Test
  void todoOIndiceTemMusculoPrincipalEPadraoConhecido() {
    for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.todos()) {
      assertNotNull(exercicio.principal, exercicio.id);
      assertTrue(ExerciseAnatomy.MUSCULOS.containsKey(exercicio.principal), exercicio.id);
      assertTrue(ExerciseAnatomy.PADROES.containsKey(exercicio.padrao), exercicio.id + " " + exercicio.padrao);
      assertNotNull(exercicio.tipoCarga, exercicio.id);
      assertNotNull(exercicio.cuidado, exercicio.id);
      assertNotNull(exercicio.erroComum, exercicio.id);
      assertTrue(exercicio.dificuldade >= 1 && exercicio.dificuldade <= 3, exercicio.id);
    }
  }

  @Test
  void divisoesEncontramOsPadroesNecessarios() {
    for (String grupamento : SessionPlanner.GRUPAMENTOS) {
      for (String exigido : SessionPlanner.padroesExigidos(grupamento)) {
        boolean achou = false;
        for (String opcao : exigido.split("\\|")) {
          for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.ativos()) {
            if (opcao.equals(exercicio.padrao)) {
              achou = true;
            }
          }
        }
        assertTrue(achou, grupamento + " sem ativo para " + exigido);
      }
    }
    boolean inferior = false;
    for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.ativos()) {
      if ("PEITO".equals(exercicio.grupo) && exercicio.regioes.contains("peitoral_inferior")) {
        inferior = true;
      }
    }
    assertTrue(inferior, "nenhum peito ativo cobre a região inferior");
  }

  @Test
  void geracaoEDeterministicaERespeitaOsLimitesAtuais() {
    for (String grupamento : SessionPlanner.GRUPAMENTOS) {
      for (int tempo = 30; tempo <= 120; tempo += 5) {
        for (String nivel : Arrays.asList("iniciante", "intermediario", "avancado")) {
          int variantes = "FULL_BODY".equals(grupamento) ? 1 : 0;
          for (int variante = 0; variante <= variantes; variante++) {
            conferirSessao(grupamento, tempo, nivel, 4, variante, true);
          }
        }
      }
    }
  }

  @Test
  void grupamentosLegadosContinuamDeterministicos() {
    for (String grupamento : Arrays.asList("PEITO", "COSTAS", "OMBROS", "TRICEPS", "BICEPS")) {
      for (double tempo : new double[] {30, 60, 90}) {
        for (String nivel : Arrays.asList("iniciante", "intermediario", "avancado")) {
          conferirSessao(grupamento, tempo, nivel, 4, 0, false);
        }
      }
    }
  }

  @Test
  void classificacoesFrageisPermanecemDocumentadas() {
    ExerciseDatabase.Exercise puxada = ExerciseDatabase.porId("lats_largura-puxada-frontal-pegada-aberta");
    assertEquals(2, puxada.dificuldade);

    ExerciseDatabase.Exercise barraFixa = ExerciseDatabase.porId("lats_largura-barra-fixa");
    assertEquals(3, barraFixa.dificuldade);
    assertTrue(barraFixa.equipamento.contains("barra"));
    assertEquals("peso_corporal", barraFixa.tipoCarga);
    assertTrue(barraFixa.composto);

    ExerciseDatabase.Exercise romeno = ExerciseDatabase.porId("posteriores-levantamento-terra-romeno");
    assertEquals(2, romeno.dificuldade);
    assertEquals("dobradica", romeno.padrao);

    ExerciseDatabase.Exercise alternada = ExerciseDatabase.porId("curta-rosca-alternada-com-halteres");
    assertTrue(alternada.unilateral);
    assertTrue(alternada.ativo);

    ExerciseDatabase.Exercise mergulho = ExerciseDatabase.porId("lateral-mergulho-entre-bancos");
    assertTrue(mergulho.ativo);
    assertEquals(0, mergulho.fundamento);
    assertEquals("triceps_pushdown", mergulho.padrao);
    assertTrue(mergulho.composto);

    ExerciseDatabase.Exercise deadBug = ExerciseDatabase.porId("estabilidade-dead-bug");
    assertFalse(deadBug.unilateral);
    assertEquals("core", deadBug.padrao);

    ExerciseDatabase.Exercise flexao = ExerciseDatabase.porId("medio-flexao-com-pes-elevados");
    assertNotNull(flexao);
    assertFalse(flexao.ativo);
    assertEquals("supino_horizontal", flexao.padrao);
    assertTrue(flexao.composto);
    assertFalse(flexao.equipamento.contains("peso_corporal"));
  }

  private static void conferirSessao(
      String grupamento, double tempo, String nivel, int seed, int variante, boolean planejador) {
    String rotulo = grupamento + " " + (int) tempo + " " + nivel + " v" + variante;
    List<String> objetivos = Collections.emptyList();
    WorkoutGenerator.Session primeira =
        WorkoutGenerator.montar(grupamento, tempo, nivel, objetivos, seed, variante);
    WorkoutGenerator.Session segunda =
        WorkoutGenerator.montar(grupamento, tempo, nivel, objetivos, seed, variante);

    assertEquals(idsDeSessao(primeira), idsDeSessao(segunda), rotulo);
    assertEquals(prescricao(primeira), prescricao(segunda), rotulo);
    assertTrue(primeira.segundos <= tempo * 60, rotulo + " " + primeira.segundos);
    assertTrue(primeira.duracaoEstimadaMinutos <= tempo, rotulo);
    assertFalse(primeira.exercicios.isEmpty(), rotulo);

    if (planejador) {
      assertTrue(primeira.problemas.isEmpty(), rotulo + " " + primeira.problemas);
      assertTrue(primeira.exercicios.size() <= tetoExercicios(tempo), rotulo);
      int experiencia = WorkoutGenerator.nivelRank(nivel);
      int total = 0;
      Map<String, Integer> porBucket = new LinkedHashMap<>();
      for (Map<String, Object> item : primeira.exercicios) {
        int series = SessionPlanner.numero(item.get("series"));
        total += series;
        String bucket = SessionPlanner.bucket((String) item.get("musculoPrincipalCodigo"));
        if (bucket != null) {
          porBucket.merge(bucket, series, Integer::sum);
        }
        ExerciseDatabase.Exercise origem =
            ExerciseDatabase.porId(String.valueOf(item.get("exercicioId")));
        assertNotNull(origem, rotulo);
        assertTrue(origem.ativo, rotulo + " " + item.get("exercicioId"));
      }
      assertTrue(total <= SessionPlanner.capSessao(experiencia), rotulo + " séries " + total);
      for (Map.Entry<String, Integer> entrada : porBucket.entrySet()) {
        int teto = SessionPlanner.capMusculo(entrada.getKey(), experiencia, grupamento);
        assertTrue(entrada.getValue() <= teto, rotulo + " " + entrada.getKey() + " " + entrada.getValue());
      }
      Set<String> padroes = new LinkedHashSet<>();
      for (Map<String, Object> item : primeira.exercicios) {
        padroes.add(String.valueOf(item.get("padrao")));
      }
      for (String exigido : SessionPlanner.padroesExigidos(grupamento)) {
        boolean ok = false;
        for (String opcao : exigido.split("\\|")) {
          if (padroes.contains(opcao)) {
            ok = true;
          }
        }
        assertTrue(ok, rotulo + " sem " + exigido);
      }
    } else {
      assertTrue(primeira.exercicios.size() <= 3, rotulo);
      for (Map<String, Object> item : primeira.exercicios) {
        ExerciseDatabase.Exercise origem =
            ExerciseDatabase.porId(String.valueOf(item.get("exercicioId")));
        assertNotNull(origem, rotulo);
        assertTrue(origem.ativo, rotulo);
      }
    }
  }

  private static int tetoExercicios(double tempo) {
    if (tempo <= 30) {
      return 5;
    }
    if (tempo <= 45) {
      return 6;
    }
    if (tempo <= 60) {
      return 7;
    }
    return 8;
  }

  private static void assertHistorico(String id, String nome, String grupo, boolean ativo) {
    ExerciseDatabase.Exercise exercicio = ExerciseDatabase.porId(id);
    assertNotNull(exercicio, id);
    assertEquals(nome, exercicio.nome, id);
    assertEquals(grupo, exercicio.grupo, id);
    assertEquals(ativo, exercicio.ativo, id);
  }

  private static List<ExerciseDatabase.Exercise> entradasDoCatalogo() {
    List<ExerciseDatabase.Exercise> entradas = new ArrayList<>();
    for (Map<String, List<ExerciseDatabase.Exercise>> porcoes : ExerciseDatabase.DATABASE.values()) {
      for (List<ExerciseDatabase.Exercise> lista : porcoes.values()) {
        entradas.addAll(lista);
      }
    }
    return entradas;
  }

  private static String chave(ExerciseDatabase.Exercise exercicio) {
    return exercicio.grupo + "|" + exercicio.nome;
  }

  private static List<String> idsDe(List<ExerciseDatabase.Exercise> exercicios) {
    List<String> ids = new ArrayList<>();
    for (ExerciseDatabase.Exercise exercicio : exercicios) {
      ids.add(exercicio.id);
    }
    return ids;
  }

  private static List<String> idsDeSessao(WorkoutGenerator.Session sessao) {
    List<String> ids = new ArrayList<>();
    for (Map<String, Object> item : sessao.exercicios) {
      ids.add(String.valueOf(item.get("exercicioId")));
    }
    return ids;
  }

  private static List<String> prescricao(WorkoutGenerator.Session sessao) {
    List<String> linhas = new ArrayList<>();
    for (Map<String, Object> item : sessao.exercicios) {
      linhas.add(
          item.get("exercicioId")
              + "|"
              + item.get("series")
              + "|"
              + item.get("repeticoes")
              + "|"
              + item.get("descansoSegundos")
              + "|"
              + item.get("rirAlvo"));
    }
    return linhas;
  }

  private static Map<String, Set<String>> padroesAtivos() {
    Map<String, Set<String>> mapa = new LinkedHashMap<>();
    mapa.put(
        "PEITO",
        new LinkedHashSet<>(
            Arrays.asList(
                "supino_horizontal", "supino_inclinado", "supino_declinado", "aducao_horizontal")));
    mapa.put("COSTAS", new LinkedHashSet<>(Arrays.asList("puxada_vertical", "remada")));
    mapa.put(
        "OMBROS",
        new LinkedHashSet<>(
            Arrays.asList("desenvolvimento", "elevacao_lateral", "deltoide_posterior")));
    mapa.put(
        "TRICEPS",
        new LinkedHashSet<>(Arrays.asList("triceps_pushdown", "triceps_overhead")));
    mapa.put("BICEPS", new LinkedHashSet<>(Arrays.asList("rosca", "rosca_neutra")));
    mapa.put(
        "PERNAS",
        new LinkedHashSet<>(
            Arrays.asList(
                "agachamento",
                "extensao_joelho",
                "flexao_joelho",
                "dobradica",
                "gluteo",
                "panturrilha")));
    mapa.put("CORE", new LinkedHashSet<>(Collections.singletonList("core")));
    return mapa;
  }
}
