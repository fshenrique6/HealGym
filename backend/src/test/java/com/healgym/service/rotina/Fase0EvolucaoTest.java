package com.healgym.service.rotina;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.healgym.model.User;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;

/**
 * A Fase 0 só demonstra as lacunas da evolução. Não promove capacidade, não reavalia o perfil e
 * não distingue treino vazio de treino com séries.
 */
class Fase0EvolucaoTest {

  @Test
  void inicianteContinuaCapacidadeUmDepoisDeSemanasTreinando() {
    User usuario = RotinaServicoTest.usuario("hipertrofia", "nunca", "nenhuma", 3, 60);
    ArmazemMemoria armazem = new ArmazemMemoria();
    for (int i = 0; i < 12; i++) {
      ObjectId treino = new ObjectId();
      armazem.guardar(
          new Document("_id", treino)
              .append("user", usuario.getId())
              .append("realizado", true)
              .append("dataRealizacao", Fase0Suporte.AGORA)
              .append("createdAt", Fase0Suporte.AGORA));
      armazem.registrarExecucao(usuario.getId(), treino, execucaoConcluida());
    }
    Map<String, Object> perfil = perfilDaPrevia(armazem, usuario);
    boolean pedeReavaliacao =
        Boolean.TRUE.equals(perfil.get("reavaliacao"))
            || texto(perfil).contains("reavali");
    assertTrue(
        ((Number) perfil.get("capacidade")).intValue() > 1 || pedeReavaliacao,
        "12 treinos concluídos com série não mudam a capacidade de quem declarou \"nunca\" "
            + "(capacidade "
            + perfil.get("capacidade")
            + ", fase "
            + perfil.get("fase")
            + ") e a prévia não pede reavaliação.");
  }

  @Test
  void zeroTreinosNaoTransformaFrequenciaAltaEmPausa() {
    User usuario = RotinaServicoTest.usuario("forca", "mais_de_5_anos", "semanal_5_mais", 4, 75);
    Map<String, Object> previa = previa(new ArmazemMemoria(), usuario);
    @SuppressWarnings("unchecked")
    Map<String, Object> perfil = (Map<String, Object>) previa.get("perfil");
    assertEquals(3, ((Number) perfil.get("capacidade")).intValue());
    assertEquals("experiente", perfil.get("fase"));
    assertEquals(Boolean.FALSE, perfil.get("frequenciaSemRegistro"));
    assertEquals(0, ((Number) perfil.get("concluidosRecentes")).intValue());
    assertEquals(4, ((Number) previa.get("sessoesPorSemana")).intValue());
  }

  @Test
  void execucoesConcluidasDeFatoElevamAFrequenciaConsiderada() {
    User usuario = RotinaServicoTest.usuario("hipertrofia", "de_1_a_2_anos", "irregular", 4, 60);
    ArmazemMemoria armazem = new ArmazemMemoria();
    for (int i = 0; i < 12; i++) {
      ObjectId treino = new ObjectId();
      Document documento =
          new Document("_id", treino)
              .append("user", usuario.getId())
              .append("realizado", true)
              .append("dataRealizacao", Fase0Suporte.AGORA)
              .append("createdAt", Fase0Suporte.AGORA);
      armazem.guardar(documento);
      armazem.registrarExecucao(usuario.getId(), treino, execucaoConcluida());
    }
    Map<String, Object> perfil = perfilDaPrevia(armazem, usuario);
    assertEquals(Boolean.TRUE, perfil.get("frequenciaPeloHistorico"));
    assertEquals(2, ((Number) perfil.get("capacidade")).intValue());
  }

  @Test
  void treinoMarcadoSemSeriesContaComoTreinoDeVerdade() {
    User usuario = RotinaServicoTest.usuario("hipertrofia", "de_6_a_12_meses", "nenhuma", 4, 60);
    ArmazemMemoria vazio = new ArmazemMemoria();
    for (int i = 0; i < 12; i++) {
      vazio.inserirTreinoAvulso(usuario.getId(), true, Fase0Suporte.AGORA);
    }
    Map<String, Object> semSerie = perfilDaPrevia(vazio, usuario);
    assertEquals(
        1,
        ((Number) semSerie.get("capacidade")).intValue(),
        "12 treinos marcados como realizados, sem nenhuma série registrada, elevaram a capacidade para "
            + semSerie.get("capacidade")
            + ". O mesmo perfil sem esses treinos permanece em 1.");
  }

  @Test
  void frequenciaDeclaradaEFrequenciaRealNaoSaoAMesmaCoisa() {
    User declarouAlto =
        RotinaServicoTest.usuario("forca", "mais_de_5_anos", "semanal_5_mais", 4, 75);
    User declarouPausa = RotinaServicoTest.usuario("forca", "mais_de_5_anos", "nenhuma", 4, 75);
    int semNenhumTreino = capacidade(new ArmazemMemoria(), declarouAlto);
    int pausaDeclarada = capacidade(new ArmazemMemoria(), declarouPausa);
    assertEquals(3, semNenhumTreino);
    assertEquals(1, pausaDeclarada);
  }

  @Test
  void rotinaNaoPedeReavaliacaoSoPorTerEnvelhecido() {
    User usuario = RotinaServicoTest.usuario("hipertrofia", "de_1_a_2_anos", "semanal_3_4", 4, 60);
    long[] agora = {Fase0Suporte.AGORA.getTime()};
    RotinaServico servico = new RotinaServico(new ArmazemMemoria(), () -> new Date(agora[0]));
    Map<String, Object> corpo = RotinaServicoTest.corpo(usuario);
    Map<String, Object> previa = servico.previa(usuario, corpo);
    corpo.put("assinaturaPrevia", previa.get("assinatura"));
    servico.salvar(usuario, corpo);
    agora[0] += 56L * 24 * 60 * 60 * 1000;
    Map<String, Object> consulta = servico.consultar(usuario);
    boolean pede =
        Boolean.TRUE.equals(consulta.get("desatualizada")) || consulta.containsKey("reavaliacao");
    assertTrue(
        pede,
        "Oito semanas depois, com o mesmo perfil declarado, consultar não pede reavaliação. desatualizada="
            + consulta.get("desatualizada"));
  }

  private static int capacidade(ArmazemMemoria armazem, User usuario) {
    return ((Number) perfilDaPrevia(armazem, usuario).get("capacidade")).intValue();
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> perfilDaPrevia(ArmazemMemoria armazem, User usuario) {
    return (Map<String, Object>) previa(armazem, usuario).get("perfil");
  }

  private static Map<String, Object> previa(ArmazemMemoria armazem, User usuario) {
    RotinaServico servico = new RotinaServico(armazem, () -> Fase0Suporte.AGORA);
    return servico.previa(usuario, RotinaServicoTest.corpo(usuario));
  }

  private static String texto(Map<String, Object> perfil) {
    return String.valueOf(perfil.get("faseRotulo")) + " " + perfil.get("fase");
  }

  private static Document execucaoConcluida() {
    Map<String, Object> serie = new LinkedHashMap<>();
    serie.put("numero", 1);
    serie.put("carga", 20);
    serie.put("repeticoes", 10);
    serie.put("rir", 2);
    serie.put("concluida", true);
    return new Document("exercicios", List.of(new Document("series", List.of(serie))));
  }
}
