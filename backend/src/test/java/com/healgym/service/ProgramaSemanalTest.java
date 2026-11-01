package com.healgym.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.healgym.model.User;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ProgramaSemanalTest {

  private static final int SEMENTE = 11;

  @Test
  void umAteSeisDiasMontamSessoesReaisENaoSoONomeDaDivisao() {
    String[] estrategias = {
      "full_body",
      "full_body_ab",
      "full_body_rotacao",
      "superior_inferior",
      "cinco_dias",
      "push_pull_legs"
    };
    for (int dias = 1; dias <= 6; dias++) {
      ProgramaSemanal.Programa programa = semana(dias, 60, "hipertrofia", "de_1_a_2_anos", "semanal_3_4");
      assertEquals(dias, programa.sessoes.size(), "dias " + dias);
      assertEquals(estrategias[dias - 1], programa.estrategia, "dias " + dias);
      assertEquals("perfil", programa.origemDias);
      Set<String> codigos = new LinkedHashSet<>();
      String focoAnterior = null;
      for (ProgramaSemanal.Sessao sessao : programa.sessoes) {
        assertTrue(codigos.add(sessao.codigo));
        assertFalse(sessao.exercicios.isEmpty(), sessao.nome);
        assertTrue(sessao.problemas.isEmpty(), sessao.nome + " " + sessao.problemas);
        assertFalse(sessao.relacao.isBlank());
        if (dias >= 4 && focoAnterior != null) {
          assertNotEquals(focoAnterior, sessao.foco, sessao.nome);
        }
        focoAnterior = sessao.foco;
        conferirSessao(sessao, 60, programa.rank);
      }
      if (dias <= 3) {
        for (ProgramaSemanal.Sessao sessao : programa.sessoes) {
          assertEquals("FULL_BODY", sessao.grupamento);
          assertEquals("corpo", sessao.foco);
        }
      }
      if (dias >= 4) {
        assertNotEquals(programa.sessoes.get(0).foco, programa.sessoes.get(programa.sessoes.size() - 1).foco);
      }
    }
    ProgramaSemanal.Programa tres = semana(3, 60, "hipertrofia", "nunca", "nenhuma");
    assertNotEquals(assinaturaDa(tres, 0), assinaturaDa(tres, 1));
    assertNotEquals(assinaturaDa(tres, 1), assinaturaDa(tres, 2));
    assertTrue(contem(tres, "quadriceps_completo-afundo-com-halteres"));
  }

  @Test
  void inicianteConsistenteEQuemParouMudamAPrescricaoDaSemana() {
    ProgramaSemanal.Programa iniciante = semana(4, 60, "hipertrofia", "nunca", "nenhuma");
    ProgramaSemanal.Programa consistente = semana(4, 60, "hipertrofia", "de_2_a_5_anos", "semanal_3_4");
    ProgramaSemanal.Programa parado = semana(4, 60, "hipertrofia", "mais_de_5_anos", "nenhuma");
    assertEquals(1, iniciante.rank);
    assertEquals(2, consistente.rank);
    assertEquals(1, parado.rank);
    assertEquals("8-12", principal(iniciante).get("repeticoes"));
    assertEquals("6-10", principal(consistente).get("repeticoes"));
    assertEquals(ProgramaSemanal.assinatura(iniciante), ProgramaSemanal.assinatura(parado));
    assertNotEquals(ProgramaSemanal.assinatura(iniciante), ProgramaSemanal.assinatura(consistente));
  }

  @Test
  void objetivoMudaAsSessoesMantendoAEstruturaDaSemana() {
    ProgramaSemanal.Programa hipertrofia = semana(3, 60, "hipertrofia", "nunca", "nenhuma");
    ProgramaSemanal.Programa forca = semana(3, 60, "forca", "nunca", "nenhuma");
    ProgramaSemanal.Programa resistencia = semana(3, 60, "resistencia", "nunca", "nenhuma");
    assertEquals(hipertrofia.estrategia, forca.estrategia);
    assertEquals(hipertrofia.estrategia, resistencia.estrategia);
    assertEquals("6-10", principal(forca).get("repeticoes"));
    assertEquals("12-15", principal(resistencia).get("repeticoes"));
    assertNotEquals("4-6", principal(forca).get("repeticoes"));
    assertNotEquals(ProgramaSemanal.assinatura(hipertrofia), ProgramaSemanal.assinatura(forca));
    assertNotEquals(ProgramaSemanal.assinatura(hipertrofia), ProgramaSemanal.assinatura(resistencia));
  }

  @Test
  void trintaSessentaECentoEVinteRespeitamOTetoSemEncherOTempo() {
    ProgramaSemanal.Programa curto = semana(2, 30, "hipertrofia", "nunca", "nenhuma");
    ProgramaSemanal.Programa medio = semana(2, 60, "hipertrofia", "nunca", "nenhuma");
    ProgramaSemanal.Programa longo = semana(2, 120, "hipertrofia", "de_2_a_5_anos", "semanal_5_mais");
    assertTrue(curto.sessoes.get(0).exercicios.size() <= medio.sessoes.get(0).exercicios.size());
    for (ProgramaSemanal.Sessao sessao : curto.sessoes) {
      conferirSessao(sessao, 30, curto.rank);
    }
    for (ProgramaSemanal.Sessao sessao : medio.sessoes) {
      conferirSessao(sessao, 60, medio.rank);
    }
    for (ProgramaSemanal.Sessao sessao : longo.sessoes) {
      conferirSessao(sessao, 120, longo.rank);
      assertTrue(sessao.duracaoEstimadaMinutos <= 120);
    }
    assertTrue(longo.sessoes.get(0).segundos <= 120 * 60);
  }

  @Test
  void perfilAntigoUsaTresSessoesDeSessentaEMinutosExplicitosVencemAPreferencia() {
    ProgramaSemanal.Programa antigo = ProgramaSemanal.planejar(new User.Profile(), SEMENTE);
    assertEquals(3, antigo.dias);
    assertEquals(60, antigo.minutos);
    assertEquals("padrao", antigo.origemDias);
    assertEquals("padrao", antigo.origemMinutos);
    assertEquals("full_body_rotacao", antigo.estrategia);

    User.Profile perfil = perfil(4, 60, "hipertrofia", "nunca", "nenhuma");
    PrescricaoPerfil.Configuracao cfg = PrescricaoPerfil.interpretar(perfil);
    ProgramaSemanal.Programa explicito = ProgramaSemanal.planejar(cfg, SEMENTE, 45);
    assertEquals(45, explicito.minutos);
    assertEquals("explicito", explicito.origemMinutos);
    assertEquals(4, explicito.dias);
    assertNotEquals(ProgramaSemanal.assinatura(ProgramaSemanal.planejar(cfg, SEMENTE, null)), ProgramaSemanal.assinatura(explicito));
  }

  @Test
  void volumeSemanalFicaDentroDoTetoEOsContratosSeguemIguais() {
    for (int dias = 1; dias <= 6; dias++) {
      for (String modo : Arrays.asList("hipertrofia", "forca", "resistencia")) {
        ProgramaSemanal.Programa programa = semana(dias, 60, modo, "de_1_a_2_anos", "semanal_3_4");
        Map<String, Integer> direto = new LinkedHashMap<>();
        for (ProgramaSemanal.Sessao sessao : programa.sessoes) {
          for (Map.Entry<String, Double> entrada :
              CoberturaMuscular.seriesDiretasPorMusculo(sessao.exercicios).entrySet()) {
            String bucket = SessionPlanner.bucket(entrada.getKey());
            if (bucket != null) {
              direto.merge(bucket, entrada.getValue().intValue(), Integer::sum);
            }
          }
        }
        int tetoGrande = ProgramaSemanal.TETO_GRANDE[programa.rank - 1];
        int tetoPequeno = ProgramaSemanal.TETO_PEQUENO[programa.rank - 1];
        for (Map.Entry<String, Integer> entrada : direto.entrySet()) {
          int teto =
              Arrays.asList("peitoral", "costas", "quadriceps", "isquiotibiais", "gluteos").contains(entrada.getKey())
                  ? tetoGrande
                  : tetoPequeno;
          assertTrue(entrada.getValue() <= teto, dias + " " + modo + " " + entrada.getKey() + " " + entrada.getValue());
        }
        assertEquals(49, ExerciseDatabase.ativos().size());
        assertNullProibidos(programa);
      }
    }
  }

  @Test
  void mesmaEntradaRepeteOProgramaEConsultarNaoCriaFicha() {
    User.Profile perfil = perfil(5, 75, "forca", "de_2_a_5_anos", "semanal_3_4");
    ProgramaSemanal.Programa primeira = ProgramaSemanal.planejar(perfil, SEMENTE);
    ProgramaSemanal.Programa segunda = ProgramaSemanal.planejar(perfil, SEMENTE);
    assertEquals(ProgramaSemanal.assinatura(primeira), ProgramaSemanal.assinatura(segunda));
    assertEquals(primeira.chave, segunda.chave);

    List<String> codigos = Arrays.asList("s1", "s2", "s3", "s4", "s5");
    Map<String, Boolean> vazias = new LinkedHashMap<>();
    ProgramaSemanal.AcaoPersistencia criar = ProgramaSemanal.decidir(vazias, codigos, false);
    assertEquals(codigos, criar.criar);
    assertTrue(criar.atualizar.isEmpty());

    Map<String, Boolean> salvas = new LinkedHashMap<>();
    for (String codigo : codigos) {
      salvas.put(codigo, false);
    }
    ProgramaSemanal.AcaoPersistencia consulta = ProgramaSemanal.decidir(salvas, codigos, false);
    assertTrue(consulta.criar.isEmpty(), "consultar não cria outra ficha");
    assertTrue(consulta.atualizar.isEmpty());

    salvas.put("s2", true);
    ProgramaSemanal.AcaoPersistencia atualizar = ProgramaSemanal.decidir(salvas, codigos, true);
    assertTrue(atualizar.criar.isEmpty());
    assertFalse(atualizar.atualizar.contains("s2"));
    assertEquals(4, atualizar.atualizar.size());
  }

  private static void conferirSessao(ProgramaSemanal.Sessao sessao, int minutos, int rank) {
    assertTrue(sessao.segundos <= minutos * 60, sessao.nome + " " + sessao.segundos);
    assertTrue(sessao.exercicios.size() <= (minutos <= 30 ? 5 : minutos <= 45 ? 6 : minutos <= 60 ? 7 : 8));
    Set<String> ids = new LinkedHashSet<>();
    int series = 0;
    for (Map<String, Object> item : sessao.exercicios) {
      String id = String.valueOf(item.get("exercicioId"));
      assertTrue(ids.add(id), sessao.nome + " duplicou " + id);
      ExerciseDatabase.Exercise origem = ExerciseDatabase.porId(id);
      assertNotNull(origem, id);
      assertTrue(origem.ativo);
      assertNotNull(item.get("uid"));
      assertNotNull(item.get("series"));
      assertNotNull(item.get("repeticoes"));
      assertNotNull(item.get("descansoSegundos"));
      if (!"core".equals(item.get("padrao"))) {
        assertNotNull(item.get("rirAlvo"));
      }
      int quantidade = SessionPlanner.numero(item.get("series"));
      assertTrue(quantidade >= 2 && quantidade <= 4);
      series += quantidade;
      assertFalse(proibido(id));
      assertFalse(proibido(String.valueOf(item.get("nome"))));
    }
    assertTrue(series <= SessionPlanner.capSessao(rank), sessao.nome + " " + series);
  }

  private static void assertNullProibidos(ProgramaSemanal.Programa programa) {
    for (ProgramaSemanal.Sessao sessao : programa.sessoes) {
      for (Map<String, Object> item : sessao.exercicios) {
        assertFalse(proibido(String.valueOf(item.get("exercicioId"))));
        assertFalse(proibido(String.valueOf(item.get("nome"))));
      }
    }
    assertEquals(49, ExerciseDatabase.todos().size());
  }

  private static boolean contem(ProgramaSemanal.Programa programa, String id) {
    for (ProgramaSemanal.Sessao sessao : programa.sessoes) {
      for (Map<String, Object> item : sessao.exercicios) {
        if (id.equals(item.get("exercicioId"))) {
          return true;
        }
      }
    }
    return false;
  }

  private static String assinaturaDa(ProgramaSemanal.Programa programa, int indice) {
    StringBuilder texto = new StringBuilder();
    for (Map<String, Object> item : programa.sessoes.get(indice).exercicios) {
      texto.append(item.get("exercicioId")).append('|').append(item.get("series")).append('\n');
    }
    return texto.toString();
  }

  private static Map<String, Object> principal(ProgramaSemanal.Programa programa) {
    for (Map<String, Object> item : programa.sessoes.get(0).exercicios) {
      if ("principal".equals(item.get("papel"))) {
        return item;
      }
    }
    throw new AssertionError("sem principal");
  }

  private static ProgramaSemanal.Programa semana(
      int dias, int minutos, String objetivo, String experiencia, String frequencia) {
    return ProgramaSemanal.planejar(perfil(dias, minutos, objetivo, experiencia, frequencia), SEMENTE);
  }

  private static User.Profile perfil(
      int dias, int minutos, String objetivo, String experiencia, String frequencia) {
    User.Profile profile = new User.Profile();
    profile.availableDays = dias;
    profile.preferredSessionMinutes = minutos;
    profile.trainingGoal = objetivo;
    profile.trainingExperience = experiencia;
    profile.recentFrequency = frequencia;
    return profile;
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
