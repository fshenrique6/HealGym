package com.healgym.service.rotina;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.healgym.model.User;
import com.healgym.service.ExerciseDatabase;
import com.healgym.service.PrescricaoPerfil;
import com.healgym.service.ProgramaSemanal;
import com.healgym.service.SessionPlanner;
import com.healgym.service.WorkoutGenerator;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Motor novo e gerador antigo convivem. A diferença é medida nas funções que os endpoints chamam:
 * POST /workouts/generate sem foco, GET e POST /workouts/programa e GET /workouts/{id}/ciclo usam o
 * antigo; POST /workouts/generate com foco e /rotina usam o novo. A troca segue o motorVersao.
 */
class Fase0MotoresTest {

  @Test
  void prescricaoNovaEAntigaNaoCoincidemNoMesmoPerfil() {
    ExerciseDatabase.Exercise supino = ExerciseDatabase.porId("medio-supino-reto-com-barra");
    PerfilInterpretado iniciante =
        Fase0Suporte.interpretar(Fase0Suporte.perfil("forca", "menos_6_meses", "semanal_1_2", 3, 60));
    PrescricaoPerfil.Configuracao legadoIniciante = PrescricaoPerfil.interpretar(perfilDe(iniciante));
    PerfilInterpretado experiente =
        Fase0Suporte.interpretar(Fase0Suporte.perfil("forca", "mais_de_5_anos", "semanal_5_mais", 4, 75));
    PrescricaoPerfil.Configuracao legadoExperiente = PrescricaoPerfil.interpretar(perfilDe(experiente));
    assertAll(
        () -> comparar("iniciante de força", supino, iniciante, legadoIniciante),
        () ->
            assertEquals(
                experiente.nivelTecnico,
                legadoExperiente.rank,
                "O motor novo usa nível técnico "
                    + experiente.nivelTecnico
                    + " e o gerador antigo recebe rank "
                    + legadoExperiente.rank
                    + " para a mesma experiência."),
        () -> comparar("experiente de força", supino, experiente, legadoExperiente));
  }

  @Test
  void geradorAntigoIgnoraSupinoComBarraEOAvulsoNovoRespeita() {
    User usuario = RotinaServicoTest.usuario("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 60);
    Map<String, Object> corpo = RotinaServicoTest.corpo(usuario);
    corpo.put("preferencias", Map.of("limitacoes", List.of("supino_barra")));
    ArmazemMemoria armazem = new ArmazemMemoria();
    RotinaServico servico = new RotinaServico(armazem, () -> Fase0Suporte.AGORA);
    servico.salvar(usuario, comAssinatura(servico, usuario, corpo));
    org.bson.Document avulso = servico.treinoAvulso(usuario, "superior", 60, 0, Fase0Suporte.AGORA);
    PreferenciasTreino prefs = Fase0Suporte.preferencias(Map.of("limitacoes", List.of("supino_barra")));
    List<String> noAvulso = proibidos(exercicios(avulso), prefs);
    List<String> noAntigo = new ArrayList<>();
    for (int seed = 0; seed < 8; seed++) {
      WorkoutGenerator.Session sessao =
          WorkoutGenerator.montar("PEITO_TRICEPS", 60, 2, "hipertrofia", seed, 0, prefs);
      noAntigo.addAll(proibidos(sessao.exercicios, prefs));
    }
    assertAll(
        () -> assertTrue(noAvulso.isEmpty(), "POST /workouts/generate com foco manteve " + noAvulso),
        () ->
            assertTrue(
                noAntigo.isEmpty(),
                "POST /workouts/generate sem foco usa WorkoutGenerator.montar e ignora a limitação. Exemplos: "
                    + noAntigo));
  }

  @Test
  void programaSemanalAntigoIgnoraExercicioEvitado() {
    User.Profile profile = Fase0Suporte.perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 60);
    PreferenciasTreino prefs =
        Fase0Suporte.preferencias(Map.of("evitar", List.of("quadriceps_completo-agachamento-com-barra")));
    assertTrue(
        !prefs.permite(ExerciseDatabase.porId("quadriceps_completo-agachamento-com-barra")),
        "O id evitado precisa ser recusado pelo motor novo para a comparação valer");
    List<String> restantes = new ArrayList<>();
    for (int seed = 0; seed < 12; seed++) {
      ProgramaSemanal.Programa programa = ProgramaSemanal.planejar(profile, seed, 60, prefs);
      for (ProgramaSemanal.Sessao sessao : programa.sessoes) {
        for (Map<String, Object> item : sessao.exercicios) {
          if ("quadriceps_completo-agachamento-com-barra".equals(item.get("exercicioId"))) {
            restantes.add("seed " + seed + " sessão " + sessao.codigo);
          }
        }
      }
    }
    assertTrue(
        restantes.isEmpty(),
        "GET/POST /workouts/programa usa ProgramaSemanal e manteve o agachamento com barra evitado em "
            + restantes
            + ". O motor novo recusaria esse id.");
  }

  private static void comparar(
      String cenario,
      ExerciseDatabase.Exercise exercicio,
      PerfilInterpretado novo,
      PrescricaoPerfil.Configuracao legado) {
    Map<String, Object> atual = Prescricao.item(exercicio, Prescricao.PRINCIPAL, 4, novo);
    Map<String, Object> antigo =
        SessionPlanner.prescrever(exercicio, legado.rank, novo.objetivo, true, "normal", "PEITO");
    assertEquals(
        atual.get("repeticoes"),
        antigo.get("repeticoes"),
        cenario + " repetições novo=" + atual.get("repeticoes") + " antigo=" + antigo.get("repeticoes"));
    assertEquals(
        atual.get("descansoSegundos"),
        antigo.get("descansoSegundos"),
        cenario
            + " descanso novo="
            + atual.get("descansoSegundos")
            + " antigo="
            + antigo.get("descansoSegundos"));
  }

  private static User.Profile perfilDe(PerfilInterpretado perfil) {
    return Fase0Suporte.perfil(
        perfil.objetivo, perfil.experiencia, perfil.frequencia, perfil.dias, perfil.minutos);
  }

  private static Map<String, Object> comAssinatura(
      RotinaServico servico, User usuario, Map<String, Object> corpo) {
    Map<String, Object> previa = servico.previa(usuario, corpo);
    Map<String, Object> pedido = new java.util.LinkedHashMap<>(corpo);
    pedido.put("assinaturaPrevia", previa.get("assinatura"));
    return pedido;
  }

  @SuppressWarnings("unchecked")
  private static List<Map<String, Object>> exercicios(org.bson.Document treino) {
    return (List<Map<String, Object>>) treino.get("exercicios");
  }

  private static List<String> proibidos(List<Map<String, Object>> itens, PreferenciasTreino prefs) {
    List<String> nomes = new ArrayList<>();
    for (Map<String, Object> item : itens) {
      ExerciseDatabase.Exercise exercicio =
          ExerciseDatabase.porId(String.valueOf(item.get("exercicioId")));
      if (exercicio != null && !prefs.permite(exercicio)) {
        nomes.add(exercicio.nome);
      }
    }
    return nomes;
  }
}
