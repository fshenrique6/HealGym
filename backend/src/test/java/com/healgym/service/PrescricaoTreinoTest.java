package com.healgym.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.healgym.model.User;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class PrescricaoTreinoTest {

  private static final int SEMENTE = 11;
  private static final String GRUPO = "PEITO_TRICEPS";
  private static final double TEMPO = 60;

  @Test
  void perfilSemCamposNovosUsaOPadraoConservadorDeHipertrofia() {
    PrescricaoPerfil.Configuracao cfg = PrescricaoPerfil.interpretar(new User.Profile());
    assertEquals("hipertrofia", cfg.modo);
    assertEquals(1, cfg.rank);
    assertEquals("padrao", cfg.origemModo);
    assertEquals("legado", cfg.origemRank);

    assertEquals(
        assinatura(WorkoutGenerator.montar(GRUPO, TEMPO, "iniciante", Collections.emptyList(), SEMENTE)),
        assinatura(gerar(new User.Profile())));
  }

  @Test
  void inicianteAbsolutoMudaAPrescricaoConformeOObjetivo() {
    User.Profile hipertrofia = perfil("hipertrofia", "nunca", "nenhuma");
    User.Profile forca = perfil("forca", "nunca", "nenhuma");
    User.Profile resistencia = perfil("resistencia", "nunca", "semanal_5_mais");

    assertEquals(1, PrescricaoPerfil.interpretar(hipertrofia).rank);
    assertEquals(1, PrescricaoPerfil.interpretar(forca).rank);
    assertEquals(1, PrescricaoPerfil.interpretar(resistencia).rank);
    assertEquals("forca", PrescricaoPerfil.interpretar(forca).modo);
    assertEquals("resistencia", PrescricaoPerfil.interpretar(resistencia).modo);

    Map<String, Object> base = principal(gerar(hipertrofia));
    Map<String, Object> força = principal(gerar(forca));
    Map<String, Object> resist = principal(gerar(resistencia));

    assertEquals("medio-supino-reto-com-halteres", base.get("exercicioId"));
    assertEquals(base.get("exercicioId"), força.get("exercicioId"));
    assertEquals(base.get("exercicioId"), resist.get("exercicioId"));
    assertEquals("8-12", base.get("repeticoes"));
    assertEquals(90, base.get("descansoSegundos"));
    assertEquals("2-3", base.get("rirAlvo"));

    assertEquals("6-10", força.get("repeticoes"));
    assertEquals(120, força.get("descansoSegundos"));
    assertEquals("2-3", força.get("rirAlvo"));
    assertNotEquals("4-6", força.get("repeticoes"));

    assertEquals("12-15", resist.get("repeticoes"));
    assertEquals(90, resist.get("descansoSegundos"));
    assertNotEquals(assinatura(gerar(hipertrofia)), assinatura(gerar(forca)));
    assertNotEquals(assinatura(gerar(hipertrofia)), assinatura(gerar(resistencia)));
  }

  @Test
  void experienteConsistenteNaoRecebeOMesmoTreinoDeQuemNaoTemTreinado() {
    User.Profile parado = perfil("hipertrofia", "de_2_a_5_anos", "nenhuma");
    User.Profile irregular = perfil("hipertrofia", "de_2_a_5_anos", "irregular");
    User.Profile consistente = perfil("hipertrofia", "de_2_a_5_anos", "semanal_3_4");
    User.Profile muitoFrequente = perfil("hipertrofia", "de_2_a_5_anos", "semanal_5_mais");

    assertEquals(1, PrescricaoPerfil.interpretar(parado).rank);
    assertEquals(1, PrescricaoPerfil.interpretar(irregular).rank);
    assertEquals(2, PrescricaoPerfil.interpretar(consistente).rank);
    assertEquals(2, PrescricaoPerfil.interpretar(muitoFrequente).rank);
    assertNotEquals(3, PrescricaoPerfil.interpretar(consistente).rank);

    assertEquals("8-12", principal(gerar(parado)).get("repeticoes"));
    assertEquals("6-10", principal(gerar(consistente)).get("repeticoes"));
    assertEquals(assinatura(gerar(parado)), assinatura(gerar(irregular)));
    assertEquals(assinatura(gerar(consistente)), assinatura(gerar(muitoFrequente)));
    assertNotEquals(assinatura(gerar(parado)), assinatura(gerar(consistente)));
  }

  @Test
  void forcaDeQuemVoltouATreinarNaoUsaAFaixaDeQuemTreinaComRegularidade() {
    User.Profile parado = perfil("forca", "mais_de_5_anos", "nenhuma");
    User.Profile regular = perfil("forca", "mais_de_5_anos", "semanal_5_mais");

    assertEquals(1, PrescricaoPerfil.interpretar(parado).rank);
    assertEquals(2, PrescricaoPerfil.interpretar(regular).rank);
    assertEquals("6-10", principal(gerar(parado)).get("repeticoes"));
    assertEquals("4-6", principal(gerar(regular)).get("repeticoes"));
    assertEquals(150, principal(gerar(regular)).get("descansoSegundos"));
    assertNotEquals(assinatura(gerar(parado)), assinatura(gerar(regular)));
  }

  @Test
  void umADoisAnosComFrequenciaRegularSobeEMenosDeUmAnoNaoSobe() {
    User.Profile intermediario = perfil("hipertrofia", "de_1_a_2_anos", "semanal_3_4");
    User.Profile aindaInicial = perfil("hipertrofia", "de_6_a_12_meses", "semanal_5_mais");
    User.Profile poucoFrequente = perfil("hipertrofia", "de_1_a_2_anos", "semanal_1_2");

    assertEquals(2, PrescricaoPerfil.interpretar(intermediario).rank);
    assertEquals(1, PrescricaoPerfil.interpretar(aindaInicial).rank);
    assertEquals(1, PrescricaoPerfil.interpretar(poucoFrequente).rank);
    assertNotEquals(assinatura(gerar(intermediario)), assinatura(gerar(aindaInicial)));
  }

  @Test
  void mudarSoObjetivoSoExperienciaOuSoFrequenciaAlteraASessaoQuandoARegraMuda() {
    String experiencia = "de_2_a_5_anos";
    String frequencia = "semanal_3_4";
    String soObjetivoA = assinatura(gerar(perfil("hipertrofia", experiencia, frequencia)));
    String soObjetivoB = assinatura(gerar(perfil("forca", experiencia, frequencia)));
    String soObjetivoC = assinatura(gerar(perfil("resistencia", experiencia, frequencia)));
    assertNotEquals(soObjetivoA, soObjetivoB);
    assertNotEquals(soObjetivoA, soObjetivoC);

    String poucaExperiencia = assinatura(gerar(perfil("hipertrofia", "nunca", frequencia)));
    String muitaExperiencia = assinatura(gerar(perfil("hipertrofia", experiencia, frequencia)));
    assertNotEquals(poucaExperiencia, muitaExperiencia);

    String semTreino = assinatura(gerar(perfil("hipertrofia", experiencia, "nenhuma")));
    String comTreino = assinatura(gerar(perfil("hipertrofia", experiencia, frequencia)));
    assertNotEquals(semTreino, comTreino);
  }

  @Test
  void camposNovosPrevalecemSobreOLegadoEOLegadoContinuaValendoSozinho() {
    User.Profile legado = new User.Profile();
    legado.fitnessLevel = "avancado";
    legado.goals = Arrays.asList("força máxima");
    PrescricaoPerfil.Configuracao antigo = PrescricaoPerfil.interpretar(legado);
    assertEquals("forca", antigo.modo);
    assertEquals(3, antigo.rank);
    assertEquals("legado", antigo.origemModo);
    assertEquals("legado", antigo.origemRank);
    assertEquals(
        assinatura(WorkoutGenerator.montar(GRUPO, TEMPO, "avancado", legado.goals, SEMENTE)),
        assinatura(gerar(legado)));

    User.Profile atual = perfil("hipertrofia", "nunca", "nenhuma");
    atual.fitnessLevel = "avancado";
    atual.goals = Arrays.asList("força máxima");
    PrescricaoPerfil.Configuracao novo = PrescricaoPerfil.interpretar(atual);
    assertEquals("hipertrofia", novo.modo);
    assertEquals(1, novo.rank);
    assertEquals("perfil", novo.origemModo);
    assertEquals("experiencia", novo.origemRank);
    assertNotEquals(assinatura(gerar(legado)), assinatura(gerar(atual)));
  }

  @Test
  void diasEDuracaoGuardadosNaoMudamAPrescricao() {
    User.Profile curto = perfil("forca", "de_1_a_2_anos", "semanal_3_4");
    curto.availableDays = 1;
    curto.preferredSessionMinutes = 30;
    User.Profile longo = perfil("forca", "de_1_a_2_anos", "semanal_3_4");
    longo.availableDays = 6;
    longo.preferredSessionMinutes = 120;

    assertEquals(PrescricaoPerfil.interpretar(curto).rank, PrescricaoPerfil.interpretar(longo).rank);
    assertEquals(PrescricaoPerfil.interpretar(curto).modo, PrescricaoPerfil.interpretar(longo).modo);
    assertEquals(assinatura(gerar(curto)), assinatura(gerar(longo)));
  }

  @Test
  void mesmaSementeEMesmoPerfilGeramAMesmaPrescricaoDentroDoCatalogoEDosLimites() {
    User.Profile profile = perfil("hipertrofia", "de_2_a_5_anos", "semanal_3_4");
    WorkoutGenerator.Session primeira = gerar(profile);
    WorkoutGenerator.Session segunda = gerar(profile);
    assertEquals(assinatura(primeira), assinatura(segunda));
    assertTrue(primeira.segundos <= TEMPO * 60);
    assertTrue(primeira.problemas.isEmpty());
    assertFalse(primeira.exercicios.isEmpty());

    int rank = PrescricaoPerfil.interpretar(profile).rank;
    int total = 0;
    Set<String> ids = new LinkedHashSet<>();
    for (Map<String, Object> item : primeira.exercicios) {
      assertNotNull(item.get("uid"));
      assertNotNull(item.get("nome"));
      assertNotNull(item.get("series"));
      assertNotNull(item.get("repeticoes"));
      assertNotNull(item.get("descanso"));
      assertNotNull(item.get("descansoSegundos"));
      if (!"core".equals(item.get("padrao"))) {
        assertNotNull(item.get("rirAlvo"));
      }
      String id = String.valueOf(item.get("exercicioId"));
      ExerciseDatabase.Exercise origem = ExerciseDatabase.porId(id);
      assertNotNull(origem, id);
      assertTrue(origem.ativo, id);
      assertFalse(proibido(id));
      assertFalse(proibido(String.valueOf(item.get("nome"))));
      assertTrue(ids.add(id));
      int series = SessionPlanner.numero(item.get("series"));
      assertTrue(series >= 2 && series <= 4);
      total += series;
    }
    assertTrue(total <= SessionPlanner.capSessao(rank));
  }

  private static User.Profile perfil(String objetivo, String experiencia, String frequencia) {
    User.Profile profile = new User.Profile();
    profile.trainingGoal = objetivo;
    profile.trainingExperience = experiencia;
    profile.recentFrequency = frequencia;
    return profile;
  }

  private static WorkoutGenerator.Session gerar(User.Profile profile) {
    PrescricaoPerfil.Configuracao cfg = PrescricaoPerfil.interpretar(profile);
    return WorkoutGenerator.montar(GRUPO, TEMPO, cfg.rank, cfg.modo, SEMENTE);
  }

  private static Map<String, Object> principal(WorkoutGenerator.Session sessao) {
    for (Map<String, Object> item : sessao.exercicios) {
      if ("principal".equals(item.get("papel"))) {
        return item;
      }
    }
    throw new AssertionError("sessão sem exercício principal");
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

  private static boolean proibido(String texto) {
    String normalizado = texto.toLowerCase();
    return normalizado.contains("face pull")
        || normalizado.contains("face-pull")
        || normalizado.contains("romeno")
        || normalizado.contains("rdl")
        || normalizado.contains("chest press")
        || normalizado.contains("chest-press");
  }
}
