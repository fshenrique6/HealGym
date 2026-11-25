package com.healgym.service.rotina;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.healgym.model.User;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;

/**
 * A ausência de sessões no aplicativo não anula uma frequência declarada. Só uma pausa declarada
 * reduz a programação.
 */
class FrequenciaDeclaradaTest {

  private static final long DIA = 24L * 60 * 60 * 1000;

  @Test
  void experienteComAltaFrequenciaEHistoricoVazioRecebeSeisSessoes() {
    User.Profile bruto =
        Fase0Suporte.perfil("hipertrofia", "mais_de_5_anos", "semanal_5_mais", 6, 60);
    PerfilInterpretado perfil =
        PerfilInterpretado.interpretar(bruto, PreferenciasTreino.padrao(), 0);

    assertEquals("hipertrofia", perfil.objetivo);
    assertEquals("mais_de_5_anos", perfil.experiencia);
    assertEquals("semanal_5_mais", perfil.frequencia);
    assertEquals(6, perfil.dias);
    assertEquals(60, perfil.minutos);
    assertEquals(0, perfil.concluidosRecentes);
    assertFalse(perfil.frequenciaSemRegistro);
    assertFalse(perfil.frequenciaPeloHistorico);
    assertEquals(3, perfil.nivelTecnico);
    assertEquals(3, perfil.capacidade);
    assertEquals(6, perfil.maxSessoes);
    assertEquals("experiente", perfil.fase);
    assertNotEquals("retorno", perfil.fase);

    MotorRotina.Proposta proposta = Fase0Suporte.gerar(perfil);
    assertEquals(6, proposta.totalSessoes());
    assertEquals("ppl_6", proposta.estrategia());
    assertNull(proposta.motivoMenosSessoes());
    assertNull(texto(proposta, "frequencia"));
    assertTrue(proposta.avisos.stream().noneMatch(a -> a.contains("séries registradas")));
    for (Map<String, Object> linha : proposta.volume) {
      assertNotEquals("acima", linha.get("status"), String.valueOf(linha.get("codigo")));
    }
    User.Profile tresDias =
        Fase0Suporte.perfil("hipertrofia", "mais_de_5_anos", "semanal_5_mais", 3, 60);
    MotorRotina.Proposta tres =
        Fase0Suporte.gerar(PerfilInterpretado.interpretar(tresDias, PreferenciasTreino.padrao(), 0));
    assertEquals(volume(proposta, "peito").get("maximo"), volume(tres, "peito").get("maximo"));
    assertEquals(2, ((Number) volume(proposta, "peito").get("frequencia")).intValue());

    PerfilInterpretado semContagem =
        PerfilInterpretado.interpretar(bruto, PreferenciasTreino.padrao(), -1);
    assertEquals(semContagem.capacidade, perfil.capacidade);
    assertEquals(Fase0Suporte.gerar(semContagem).assinatura, proposta.assinatura);
  }

  @Test
  void previaEAlteracaoUsamAFrequenciaDeclaradaQuandoNaoHaRegistro() {
    AtomicLong agora = new AtomicLong(Instant.parse("2026-03-02T10:00:00Z").toEpochMilli());
    ArmazemMemoria armazem = new ArmazemMemoria();
    RotinaServico servico = new RotinaServico(armazem, () -> new Date(agora.get()));
    User usuario =
        RotinaServicoTest.usuario("hipertrofia", "mais_de_5_anos", "semanal_5_mais", 6, 60);

    Map<String, Object> previa = servico.previa(usuario, RotinaServicoTest.corpo(usuario));
    @SuppressWarnings("unchecked")
    Map<String, Object> interpretado = (Map<String, Object>) previa.get("perfil");
    assertEquals("semanal_5_mais", interpretado.get("frequencia"));
    assertEquals(0, ((Number) interpretado.get("concluidosRecentes")).intValue());
    assertEquals(3, ((Number) interpretado.get("capacidade")).intValue());
    assertEquals(6, ((Number) previa.get("sessoesPorSemana")).intValue());
    assertEquals("ppl_6", ((Map<?, ?>) previa.get("estrategia")).get("codigo"));
    assertNull(previa.get("motivoMenosSessoes"));

    Map<String, Object> pedido = new java.util.LinkedHashMap<>(RotinaServicoTest.corpo(usuario));
    pedido.put("assinaturaPrevia", previa.get("assinatura"));
    servico.salvar(usuario, pedido);
    Document salva = armazem.ativa(usuario.getId());
    assertEquals(6, ((List<?>) salva.get("sessoes")).size());
    ObjectId rotinaAnterior = salva.getObjectId("_id");

    usuario.getProfile().trainingGoal = "forca";
    Map<String, Object> alterada = servico.previa(usuario, RotinaServicoTest.corpo(usuario));
    assertEquals(6, ((Number) alterada.get("sessoesPorSemana")).intValue());
    assertEquals("ppl_6", ((Map<?, ?>) alterada.get("estrategia")).get("codigo"));
    assertNotEquals(previa.get("assinatura"), alterada.get("assinatura"));
    assertEquals(rotinaAnterior, armazem.ativa(usuario.getId()).getObjectId("_id"));
    assertEquals(1, armazem.rotinasDe(usuario.getId()).size());
  }

  @Test
  void outrosPerfisNaoGanhamSeisSessoesSoPorTerSeisDias() {
    assertSessoes("nunca", "semanal_5_mais", 0, 1, 3, "full_body_3", "inicial");
    assertSessoes("menos_6_meses", "semanal_5_mais", 0, 1, 3, "full_body_3", "inicial");
    assertSessoes("de_6_a_12_meses", "semanal_5_mais", 0, 2, 5, "superior_inferior_ppl_5", "experiência");
    assertSessoes("de_1_a_2_anos", "semanal_5_mais", 0, 2, 5, "superior_inferior_ppl_5", "experiência");
    assertSessoes("de_2_a_5_anos", "semanal_5_mais", 0, 3, 6, "ppl_6", null);
    assertSessoes("mais_de_5_anos", "semanal_3_4", 0, 3, 6, "ppl_6", null);
    assertSessoes("mais_de_5_anos", "semanal_1_2", 0, 2, 4, "superior_inferior_4", "1 a 2");
    assertSessoes("mais_de_5_anos", "irregular", 0, 1, 3, "full_body_3", "irregular");
    assertSessoes("mais_de_5_anos", "nenhuma", 0, 1, 3, "full_body_3", "não tem treinado");

    User.Profile pausa =
        Fase0Suporte.perfil("hipertrofia", "mais_de_5_anos", "nenhuma", 6, 60);
    PerfilInterpretado retorno =
        PerfilInterpretado.interpretar(pausa, PreferenciasTreino.padrao(), 0);
    assertEquals("retorno", retorno.fase);

    User.Profile antigo =
        Fase0Suporte.perfil("hipertrofia", "mais_de_5_anos", "semanal_5_mais", 6, 60);
    PerfilInterpretado comRegistrosAntigos =
        PerfilInterpretado.interpretar(antigo, PreferenciasTreino.padrao(), 0);
    assertEquals(6, comRegistrosAntigos.maxSessoes);
    assertEquals("experiente", comRegistrosAntigos.fase);
  }

  @Test
  void registrosAntigosForaDaJanelaNaoApagamAFrequenciaDeclarada() {
    AtomicLong agora = new AtomicLong(Instant.parse("2026-03-02T10:00:00Z").toEpochMilli());
    ArmazemMemoria armazem = new ArmazemMemoria();
    RotinaServico servico = new RotinaServico(armazem, () -> new Date(agora.get()));
    User usuario =
        RotinaServicoTest.usuario("hipertrofia", "mais_de_5_anos", "semanal_5_mais", 6, 60);
    for (int i = 0; i < 4; i++) {
      Document treino =
          armazem.inserirTreinoAvulso(usuario.getId(), true, new Date(agora.get() - 40 * DIA));
      armazem.registrarExecucao(usuario.getId(), treino.getObjectId("_id"), serieConcluida());
    }
    Map<String, Object> previa = servico.previa(usuario, RotinaServicoTest.corpo(usuario));
    @SuppressWarnings("unchecked")
    Map<String, Object> perfil = (Map<String, Object>) previa.get("perfil");
    assertEquals(0, ((Number) perfil.get("concluidosRecentes")).intValue());
    assertEquals(Boolean.FALSE, perfil.get("frequenciaPeloHistorico"));
    assertEquals(6, ((Number) previa.get("sessoesPorSemana")).intValue());
  }

  @Test
  void historicoRecenteAindaPodeElevarFrequenciaBaixa() {
    User.Profile bruto = Fase0Suporte.perfil("hipertrofia", "de_1_a_2_anos", "irregular", 4, 60);
    PerfilInterpretado perfil =
        PerfilInterpretado.interpretar(bruto, PreferenciasTreino.padrao(), 12);
    assertTrue(perfil.frequenciaPeloHistorico);
    assertEquals(2, perfil.capacidade);
  }

  private static void assertSessoes(
      String experiencia,
      String frequencia,
      int concluidos,
      int capacidade,
      int sessoes,
      String estrategia,
      String motivo) {
    User.Profile bruto = Fase0Suporte.perfil("hipertrofia", experiencia, frequencia, 6, 60);
    PerfilInterpretado perfil =
        PerfilInterpretado.interpretar(bruto, PreferenciasTreino.padrao(), concluidos);
    MotorRotina.Proposta proposta = Fase0Suporte.gerar(perfil);
    String contexto = experiencia + " / " + frequencia;
    assertEquals(capacidade, perfil.capacidade, contexto);
    assertEquals(sessoes, proposta.totalSessoes(), contexto);
    assertEquals(estrategia, proposta.estrategia(), contexto);
    String explicacao = texto(proposta, "frequencia");
    String motivoGerado = proposta.motivoMenosSessoes();
    if (motivo == null) {
      assertNull(motivoGerado, contexto);
      assertNull(explicacao, contexto);
    } else {
      assertEquals(motivoGerado, explicacao, contexto);
      assertTrue(motivoGerado.contains(motivo), contexto + ": " + motivoGerado);
      assertFalse(motivoGerado.contains("recuperação"), contexto);
      assertFalse(motivoGerado.contains("recuperar"), contexto);
    }
  }

  private static Map<String, Object> volume(MotorRotina.Proposta proposta, String codigo) {
    for (Map<String, Object> linha : proposta.volume) {
      if (codigo.equals(linha.get("codigo"))) {
        return linha;
      }
    }
    throw new AssertionError("Volume sem " + codigo);
  }

  private static String texto(MotorRotina.Proposta proposta, String tipo) {
    for (Map<String, Object> item : proposta.explicacao) {
      if (tipo.equals(item.get("tipo"))) {
        return String.valueOf(item.get("texto"));
      }
    }
    return null;
  }

  private static Document serieConcluida() {
    return new Document(
        "exercicios",
        List.of(
            new Document(
                "series",
                List.of(
                    new Document("numero", 1)
                        .append("carga", 20)
                        .append("repeticoes", 8)
                        .append("rir", 2)
                        .append("concluida", true)))));
  }
}
