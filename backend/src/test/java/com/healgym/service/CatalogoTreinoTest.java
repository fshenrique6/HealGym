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
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

/**
 * Catálogo explícito e geração em memória. Não abre MongoDB, rede nem Spring.
 * Não executa {@code WorkoutGenerationCheck}.
 */
class CatalogoTreinoTest {

  private static final List<String> CATALOGO =
      Arrays.asList(
          "PEITO|medio-supino-reto-com-barra|Supino Reto com Barra",
          "PEITO|medio-supino-reto-com-halteres|Supino Reto com Halteres",
          "PEITO|medio-chest-press-na-maquina|Chest Press na Máquina",
          "PEITO|superior-supino-inclinado-com-barra|Supino Inclinado com Barra",
          "PEITO|superior-supino-inclinado-com-halteres|Supino Inclinado com Halteres",
          "PEITO|inferior-supino-declinado-com-barra|Supino Declinado com Barra",
          "PEITO|inferior-supino-declinado-com-halteres|Supino Declinado com Halteres",
          "PEITO|interno-crucifixo-reto-com-halteres|Crucifixo Reto com Halteres",
          "PEITO|interno-cross-over-na-polia-alta|Cross Over na Polia Alta",
          "PEITO|interno-voador-peitoral|Voador Peitoral",
          "COSTAS|lats_largura-puxada-frontal-pegada-aberta|Puxada Frontal Pegada Aberta",
          "COSTAS|lats_largura-pulldown-com-pegada-supinada|Pulldown com Pegada Supinada",
          "COSTAS|lats_largura-barra-fixa|Barra Fixa",
          "COSTAS|lats_espessura-remada-curvada-com-barra|Remada Curvada com Barra",
          "COSTAS|lats_espessura-remada-unilateral-com-halter|Remada Unilateral com Halter",
          "COSTAS|romboides-remada-na-polia-baixa|Remada na Polia Baixa",
          "OMBROS|anterior-desenvolvimento-com-barra|Desenvolvimento com Barra",
          "OMBROS|anterior-desenvolvimento-com-halteres|Desenvolvimento com Halteres",
          "OMBROS|anterior-desenvolvimento-na-maquina|Desenvolvimento na Máquina",
          "OMBROS|lateral-elevacao-lateral-com-halteres|Elevação Lateral com Halteres",
          "OMBROS|anterior-elevacao-frontal-com-barra|Elevação Frontal com Barra",
          "OMBROS|posterior-crucifixo-inverso-com-halteres|Crucifixo Inverso com Halteres",
          "OMBROS|posterior-voador-invertido|Voador Invertido",
          "TRICEPS|lateral-triceps-pulley-na-polia-alta|Tríceps Pulley na Polia Alta",
          "TRICEPS|lateral-triceps-corda-na-polia-alta|Tríceps Corda na Polia Alta",
          "TRICEPS|longa-triceps-testa-com-barra|Tríceps Testa com Barra",
          "TRICEPS|longa-triceps-frances-com-halteres|Tríceps Francês com Halteres",
          "BICEPS|longa-rosca-direta-com-barra|Rosca Direta com Barra",
          "BICEPS|curta-rosca-alternada-com-halteres|Rosca Alternada com Halteres",
          "BICEPS|braquial-rosca-martelo-com-halteres|Rosca Martelo com Halteres",
          "BICEPS|curta-rosca-scott-com-barra|Rosca Scott com Barra",
          "BICEPS|curta-rosca-concentrada-com-halter|Rosca Concentrada com Halter",
          "PERNAS|quadriceps_completo-agachamento-com-barra|Agachamento com Barra",
          "PERNAS|quadriceps_completo-agachamento-no-smith|Agachamento no Smith",
          "PERNAS|quadriceps_completo-leg-press|Leg Press",
          "PERNAS|vasto_medial-agachamento-goblet-com-halter|Agachamento Goblet com Halter",
          "PERNAS|quadriceps_completo-afundo-com-halteres|Afundo com Halteres",
          "PERNAS|vasto_medial-afundo-bulgaro-com-halteres|Afundo Búlgaro com Halteres",
          "PERNAS|quadriceps_completo-cadeira-extensora|Cadeira Extensora",
          "PERNAS|posteriores-stiff-com-halteres|Stiff com Halteres",
          "PERNAS|posteriores-mesa-flexora|Mesa Flexora",
          "PERNAS|posteriores-cadeira-flexora|Cadeira Flexora",
          "PERNAS|gluteo_maximo-hip-thrust-com-barra|Hip Thrust com Barra",
          "PERNAS|gluteo_maximo-coice-de-gluteo-na-polia|Coice de Glúteo na Polia",
          "PERNAS|gastrocnemio-panturrilha-em-maquina|Panturrilha em Máquina",
          "PERNAS|soleo-panturrilha-sentado-com-halteres|Panturrilha Sentado com Halteres",
          "PERNAS|gastrocnemio-panturrilha-no-leg-press|Panturrilha no Leg Press",
          "CORE|estabilidade-prancha|Prancha",
          "CORE|estabilidade-abdominal-tradicional|Abdominal Tradicional",
          "CORE|estabilidade-elevacao-de-joelhos|Elevação de Joelhos");

  @Test
  void catalogoTemOsExerciciosPrevistosENadaMais() {
    assertTrue(CATALOGO.size() >= 40 && CATALOGO.size() <= 60, "fora da faixa útil: " + CATALOGO.size());
    assertEquals(CATALOGO.size(), ExerciseDatabase.todos().size());
    assertEquals(CATALOGO.size(), ExerciseDatabase.ativos().size());
    Set<String> ids = new LinkedHashSet<>();
    Set<String> nomes = new LinkedHashSet<>();
    Map<String, ExerciseDatabase.Exercise> porId = new LinkedHashMap<>();
    for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.todos()) {
      assertTrue(ids.add(exercicio.id), "id duplicado " + exercicio.id);
      assertTrue(nomes.add(exercicio.nome.toLowerCase(Locale.ROOT)), "nome duplicado " + exercicio.nome);
      assertTrue(exercicio.ativo, exercicio.id);
      porId.put(exercicio.id, exercicio);
    }
    assertEquals(ids.size(), entradasDoCatalogo().size(), "lista do banco divergiu do índice");
    for (String linha : CATALOGO) {
      String[] partes = linha.split("\\|", 3);
      ExerciseDatabase.Exercise exercicio = porId.remove(partes[1]);
      assertNotNull(exercicio, partes[1]);
      assertEquals(partes[0], exercicio.grupo, partes[1]);
      assertEquals(partes[2], exercicio.nome, partes[1]);
    }
    assertTrue(porId.isEmpty(), "exercícios fora da lista: " + porId.keySet());
  }

  @Test
  void facePullETerraRomenoNaoExistemNoCatalogo() {
    for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.todos()) {
      assertFalse(proibido(exercicio.nome), exercicio.nome);
      assertFalse(proibido(exercicio.id), exercicio.id);
    }
    assertNull(ExerciseDatabase.porId("posterior-face-pull-na-polia-alta"));
    assertNull(ExerciseDatabase.porId("deltoide_posterior-face-pull-na-polia-alta"));
    assertNull(ExerciseDatabase.porId("posteriores-levantamento-terra-romeno"));
    assertNull(ExerciseDatabase.porId("lombar-levantamento-terra-romeno"));
  }

  @Test
  void idsPreservadosContinuamNoMesmoExercicio() {
    assertIdentidade("medio-supino-reto-com-barra", "Supino Reto com Barra", "PEITO", "supino_horizontal");
    assertIdentidade("superior-supino-inclinado-com-halteres", "Supino Inclinado com Halteres", "PEITO", "supino_inclinado");
    assertIdentidade("inferior-supino-declinado-com-halteres", "Supino Declinado com Halteres", "PEITO", "supino_declinado");
    assertIdentidade("lats_largura-barra-fixa", "Barra Fixa", "COSTAS", "puxada_vertical");
    assertIdentidade("posterior-crucifixo-inverso-com-halteres", "Crucifixo Inverso com Halteres", "OMBROS", "deltoide_posterior");
    assertIdentidade("curta-rosca-concentrada-com-halter", "Rosca Concentrada com Halter", "BICEPS", "rosca");
    assertIdentidade("posteriores-stiff-com-halteres", "Stiff com Halteres", "PERNAS", "dobradica");
    assertIdentidade("gluteo_maximo-hip-thrust-com-barra", "Hip Thrust com Barra", "PERNAS", "gluteo");
    ExerciseDatabase.Exercise stiff = ExerciseDatabase.porId("posteriores-stiff-com-halteres");
    assertTrue(stiff.ativo);
    assertTrue(stiff.composto);
    assertFalse(stiff.unilateral);
    assertEquals("isquiotibiais", stiff.principal);
    assertEquals(2, stiff.fundamento);
  }

  @Test
  void metadadosObrigatoriosSaoExplicitos() {
    for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.todos()) {
      String id = exercicio.id;
      assertFalse(exercicio.tecnica == null || exercicio.tecnica.isBlank(), id);
      assertFalse(exercicio.equipamento.isEmpty(), id);
      for (String equipamento : exercicio.equipamento) {
        assertTrue(ExerciseAnatomy.EQUIPAMENTOS.containsKey(equipamento), id + " " + equipamento);
      }
      assertTrue(ExerciseAnatomy.PADROES.containsKey(exercicio.padrao), id);
      assertTrue(ExerciseAnatomy.MUSCULOS.containsKey(exercicio.principal), id);
      for (String secundario : exercicio.secundarios) {
        assertTrue(ExerciseAnatomy.MUSCULOS.containsKey(secundario), id + " " + secundario);
      }
      assertTrue(ExerciseAnatomy.CARGAS.containsKey(exercicio.tipoCarga), id + " " + exercicio.tipoCarga);
      assertFalse(exercicio.cuidado == null || exercicio.cuidado.isBlank(), id);
      assertFalse(exercicio.erroComum == null || exercicio.erroComum.isBlank(), id);
      assertTrue(exercicio.dificuldade >= 1 && exercicio.dificuldade <= 3, id);
      assertTrue(exercicio.fundamento >= 1, id);
      assertNull(exercicio.videoUrl, id);
      assertEquals("indisponivel", exercicio.videoStatus, id);
    }
  }

  @Test
  void barraFixaUsaPesoCorporalENaoContaComoBarraLivre() {
    ExerciseDatabase.Exercise barraFixa = ExerciseDatabase.porId("lats_largura-barra-fixa");
    assertEquals(Collections.singletonList("barra_fixa"), barraFixa.equipamento);
    assertEquals("peso_corporal", barraFixa.tipoCarga);
    assertEquals("corpo", SessionPlanner.tipoEquipamento(barraFixa.equipamento));
    assertEquals(3, barraFixa.dificuldade);
    assertTrue(barraFixa.composto);
    assertFalse(barraFixa.unilateral);
  }

  @Test
  void puxadaAltaNaoFicaDificilSoPorConterFrontal() {
    ExerciseDatabase.Exercise puxada = ExerciseDatabase.porId("lats_largura-puxada-frontal-pegada-aberta");
    assertEquals(1, puxada.dificuldade);
    assertEquals(2, puxada.fundamento);
    assertEquals("polia", puxada.tipoCarga);
  }

  @Test
  void gruposEPadroesDasDivisoesTemCobertura() {
    Set<String> principais = new LinkedHashSet<>();
    for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.ativos()) {
      principais.add(exercicio.principal);
    }
    for (String musculo :
        Arrays.asList(
            "peitoral",
            "dorsal",
            "costas_medias",
            "deltoide_anterior",
            "deltoide_lateral",
            "deltoide_posterior",
            "triceps",
            "biceps",
            "braquial",
            "quadriceps",
            "isquiotibiais",
            "gluteos",
            "panturrilhas",
            "core")) {
      assertTrue(principais.contains(musculo), musculo);
    }
    for (String grupamento : SessionPlanner.GRUPAMENTOS) {
      for (String exigido : SessionPlanner.padroesExigidos(grupamento)) {
        boolean achou = false;
        for (String opcao : exigido.split("\\|")) {
          for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.ativos()) {
            if (opcao.equals(exercicio.padrao) && exercicio.fundamento >= 1) {
              achou = true;
            }
          }
        }
        assertTrue(achou, grupamento + " sem " + exigido);
      }
    }
    boolean inferior = false;
    for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.ativos()) {
      if ("PEITO".equals(exercicio.grupo) && exercicio.regioes.contains("peitoral_inferior")) {
        inferior = true;
      }
    }
    assertTrue(inferior);
  }

  @Test
  void geracaoNaoSelecionaProibidosERespeitaLimites() {
    List<String> objetivos = Collections.emptyList();
    for (String grupamento : SessionPlanner.GRUPAMENTOS) {
      for (int tempo = 30; tempo <= 120; tempo += 5) {
        for (String nivel : Arrays.asList("iniciante", "intermediario", "avancado")) {
          int variantes = "FULL_BODY".equals(grupamento) ? 1 : 0;
          for (int variante = 0; variante <= variantes; variante++) {
            String rotulo = grupamento + " " + tempo + " " + nivel + " v" + variante;
            WorkoutGenerator.Session primeira =
                WorkoutGenerator.montar(grupamento, tempo, nivel, objetivos, 4, variante);
            WorkoutGenerator.Session segunda =
                WorkoutGenerator.montar(grupamento, tempo, nivel, objetivos, 4, variante);
            assertEquals(assinatura(primeira), assinatura(segunda), rotulo);
            assertTrue(primeira.segundos <= tempo * 60.0, rotulo + " " + primeira.segundos);
            assertTrue(primeira.duracaoEstimadaMinutos <= tempo, rotulo);
            assertTrue(primeira.problemas.isEmpty(), rotulo + " " + primeira.problemas);
            assertTrue(primeira.exercicios.size() <= teto(tempo), rotulo);
            int experiencia = WorkoutGenerator.nivelRank(nivel);
            int total = 0;
            Map<String, Integer> porBucket = new LinkedHashMap<>();
            Set<String> padroes = new LinkedHashSet<>();
            for (Map<String, Object> item : primeira.exercicios) {
              assertFalse(proibido(String.valueOf(item.get("nome"))), rotulo);
              assertFalse(proibido(String.valueOf(item.get("exercicioId"))), rotulo);
              ExerciseDatabase.Exercise origem =
                  ExerciseDatabase.porId(String.valueOf(item.get("exercicioId")));
              assertNotNull(origem, rotulo);
              assertTrue(origem.ativo, rotulo);
              int series = SessionPlanner.numero(item.get("series"));
              total += series;
              String bucket = SessionPlanner.bucket((String) item.get("musculoPrincipalCodigo"));
              if (bucket != null) {
                porBucket.merge(bucket, series, Integer::sum);
              }
              padroes.add(String.valueOf(item.get("padrao")));
              for (Map<String, Object> alternativa :
                  SessionPlanner.alternativas(item, primeira.exercicios, tempo, experiencia, "hipertrofia")) {
                assertFalse(proibido(String.valueOf(alternativa.get("nome"))), rotulo);
                assertFalse(proibido(String.valueOf(alternativa.get("exercicioId"))), rotulo);
                assertNotNull(ExerciseDatabase.porId(String.valueOf(alternativa.get("exercicioId"))));
              }
            }
            assertTrue(total <= SessionPlanner.capSessao(experiencia), rotulo + " séries " + total);
            for (Map.Entry<String, Integer> entrada : porBucket.entrySet()) {
              int limite = SessionPlanner.capMusculo(entrada.getKey(), experiencia, grupamento);
              assertTrue(
                  entrada.getValue() <= limite,
                  rotulo + " " + entrada.getKey() + " " + entrada.getValue());
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
          }
        }
      }
    }
  }

  @Test
  void stiffEntraNoLugarDaDobradicaEOsNovosIdsExistem() {
    WorkoutGenerator.Session pernas =
        WorkoutGenerator.montar("PERNAS", 60, "intermediario", Collections.emptyList(), 4, 0);
    assertTrue(assinatura(pernas).contains("posteriores-stiff-com-halteres|"));
    assertNotNull(ExerciseDatabase.porId("quadriceps_completo-agachamento-no-smith"));
    assertNotNull(ExerciseDatabase.porId("gluteo_maximo-coice-de-gluteo-na-polia"));
    assertNotNull(ExerciseDatabase.porId("gastrocnemio-panturrilha-no-leg-press"));
    ExerciseDatabase.Exercise smith = ExerciseDatabase.porId("quadriceps_completo-agachamento-no-smith");
    assertEquals("maquina", smith.tipoCarga);
    assertEquals("agachamento", smith.padrao);
    assertFalse(smith.unilateral);
  }

  @Test
  void grupamentosLegadosContinuamDeterministicos() {
    for (String grupamento : Arrays.asList("PEITO", "COSTAS", "OMBROS", "TRICEPS", "BICEPS")) {
      for (double tempo : new double[] {30, 60, 90}) {
        for (String nivel : Arrays.asList("iniciante", "intermediario", "avancado")) {
          WorkoutGenerator.Session primeira =
              WorkoutGenerator.montar(grupamento, tempo, nivel, Collections.emptyList(), 4, 0);
          WorkoutGenerator.Session segunda =
              WorkoutGenerator.montar(grupamento, tempo, nivel, Collections.emptyList(), 4, 0);
          assertEquals(assinatura(primeira), assinatura(segunda));
          assertTrue(primeira.segundos <= tempo * 60.0);
          assertFalse(primeira.exercicios.isEmpty());
          for (Map<String, Object> item : primeira.exercicios) {
            assertFalse(proibido(String.valueOf(item.get("nome"))));
            ExerciseDatabase.Exercise origem =
                ExerciseDatabase.porId(String.valueOf(item.get("exercicioId")));
            assertNotNull(origem);
            assertTrue(origem.ativo);
          }
        }
      }
    }
  }

  private static void assertIdentidade(String id, String nome, String grupo, String padrao) {
    ExerciseDatabase.Exercise exercicio = ExerciseDatabase.porId(id);
    assertNotNull(exercicio, id);
    assertEquals(nome, exercicio.nome);
    assertEquals(grupo, exercicio.grupo);
    assertEquals(padrao, exercicio.padrao);
    assertTrue(exercicio.ativo);
  }

  private static boolean proibido(String texto) {
    String normalizado = String.valueOf(texto).toLowerCase(Locale.ROOT);
    return normalizado.contains("face pull")
        || normalizado.contains("face-pull")
        || normalizado.contains("romeno")
        || normalizado.contains("rdl");
  }

  private static int teto(double tempo) {
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

  private static String assinatura(WorkoutGenerator.Session sessao) {
    StringBuilder texto = new StringBuilder();
    for (Map<String, Object> item : sessao.exercicios) {
      texto.append(item.get("exercicioId"))
          .append('|')
          .append(item.get("series"))
          .append('|')
          .append(item.get("repeticoes"))
          .append('|')
          .append(item.get("descansoSegundos"))
          .append('|')
          .append(item.get("rirAlvo"))
          .append('\n');
    }
    return texto.toString();
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
}
