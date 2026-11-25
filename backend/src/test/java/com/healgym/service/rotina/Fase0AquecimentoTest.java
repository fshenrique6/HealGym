package com.healgym.service.rotina;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.healgym.service.ExecucaoRegras;
import com.healgym.service.ExerciseDatabase;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.junit.jupiter.api.Test;

/** A série preparatória prescrita tem de ser a mesma que a ficha grava e que a execução aceita. */
class Fase0AquecimentoTest {

  @Test
  void volumeNaoContaASeriePreparatoria() {
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("series", 4);
    item.put("seriesAproximacao", 3);
    item.put("musculoPrincipalCodigo", "peitoral");
    item.put("secundariosCodigos", List.of("triceps", "deltoide_anterior"));
    VolumeSemanal.Contagem peito = VolumeSemanal.contar(List.of(item)).get("peito");
    VolumeSemanal.Contagem triceps = VolumeSemanal.contar(List.of(item)).get("triceps");
    assertEquals(4, peito.diretas, 0.01, "a aproximação não pode entrar nas séries diretas");
    assertEquals(2, triceps.indiretas, 0.01, "o indireto também só usa as séries efetivas");
  }

  @Test
  void forcaPesadaPerdeAsAproximacoesDepoisDaMontagem() {
    PerfilInterpretado perfil =
        Fase0Suporte.interpretar(
            Fase0Suporte.perfil("forca", "de_2_a_5_anos", "semanal_3_4", 4, 90));
    MotorRotina.Proposta proposta = Fase0Suporte.gerar(perfil);
    List<String> divergencias = new ArrayList<>();
    List<String> pesadosSemRampa = new ArrayList<>();
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      for (Map<String, Object> item : sessao.itens) {
        ExerciseDatabase.Exercise exercicio =
            ExerciseDatabase.porId(String.valueOf(item.get("exercicioId")));
        String papel = String.valueOf(item.get("papel"));
        int prescrito = Prescricao.aproximacao(exercicio, papel, perfil);
        int aplicado = MontadorSessao.numero(item.get("seriesAproximacao"));
        if (aplicado < prescrito) {
          divergencias.add(
              "Treino "
                  + sessao.codigo
                  + " "
                  + exercicio.nome
                  + ": Prescricao pede "
                  + prescrito
                  + " e a proposta grava "
                  + aplicado);
        }
        int topo = topo(String.valueOf(item.get("repeticoes")));
        if (exercicio.composto && topo > 0 && topo <= 8 && aplicado < 2) {
          pesadosSemRampa.add(
              "Treino " + sessao.codigo + " " + exercicio.nome + " " + item.get("repeticoes")
                  + " com "
                  + aplicado
                  + " série preparatória");
        }
      }
    }
    assertAll(
        () ->
            assertTrue(
                divergencias.isEmpty(),
                "O motor calcula aproximações e depois as substitui. " + divergencias),
        () ->
            assertTrue(
                pesadosSemRampa.isEmpty(),
                "Composto de força com até 8 repetições ficou com menos de 2 séries preparatórias: "
                    + pesadosSemRampa));
  }

  @Test
  void segundoCompostoPesadoDeOutraRegiaoTambemFicaSemAproximacao() {
    PerfilInterpretado perfil =
        Fase0Suporte.interpretar(
            Fase0Suporte.perfil("forca", "mais_de_5_anos", "semanal_5_mais", 3, 75));
    MotorRotina.Proposta proposta = Fase0Suporte.gerar(perfil);
    List<String> descobertos = new ArrayList<>();
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      String regiao = null;
      for (int i = 0; i < sessao.itens.size(); i++) {
        Map<String, Object> item = sessao.itens.get(i);
        if (!Boolean.TRUE.equals(item.get("composto"))) {
          continue;
        }
        String atual = ExerciseDatabase.porId(String.valueOf(item.get("exercicioId"))).grupo;
        int topo = topo(String.valueOf(item.get("repeticoes")));
        int aplicado = MontadorSessao.numero(item.get("seriesAproximacao"));
        if (regiao != null && !regiao.equals(atual) && topo > 0 && topo <= 8 && aplicado < 1) {
          descobertos.add(
              "Treino "
                  + sessao.codigo
                  + ", posição "
                  + (i + 1)
                  + ": "
                  + item.get("nome")
                  + " muda de "
                  + regiao
                  + " para "
                  + atual
                  + " e não tem série preparatória");
        }
        regiao = atual;
      }
    }
    assertTrue(
        descobertos.isEmpty(),
        "A troca de região num composto pesado não recebe preparação. " + descobertos);
  }

  @Test
  void execucaoSoAceitaAquecimentoNoPrimeiroExercicio() {
    Map<String, Object> primeiro = item("primeiro", "Agachamento", 4, 3);
    Map<String, Object> segundo = item("segundo", "Supino", 4, 2);
    List<Document> gravado =
        ExecucaoRegras.mesclar(
            List.of(primeiro, segundo),
            List.of(registro("primeiro", true), registro("segundo", true)),
            List.of(),
            new Date());
    assertNotNull(porUid(gravado, "primeiro").get("aquecimento"), "o primeiro exercício registra a série leve");
    assertNotNull(
        porUid(gravado, "segundo").get("aquecimento"),
        "A execução descarta o aquecimento do segundo exercício mesmo quando a prescrição pede séries de aproximação. "
            + "ExecucaoRegras.mesclar só libera aquecimento para o primeiro uid.");
  }

  private static Map<String, Object> item(String uid, String nome, int series, int aproximacao) {
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("uid", uid);
    item.put("exercicioId", "teste-" + uid);
    item.put("nome", nome);
    item.put("series", series);
    item.put("seriesAproximacao", aproximacao);
    item.put("repeticoes", "4-6");
    item.put("tipoCarga", "barra_total");
    return item;
  }

  private static Map<String, Object> registro(String uid, boolean comAquecimento) {
    Map<String, Object> registro = new LinkedHashMap<>();
    registro.put("uid", uid);
    registro.put("series", List.of(serieTrabalho()));
    if (comAquecimento) {
      Map<String, Object> aquecimento = new LinkedHashMap<>();
      aquecimento.put("carga", 20);
      aquecimento.put("repeticoes", 5);
      aquecimento.put("concluida", true);
      registro.put("aquecimento", aquecimento);
    }
    return registro;
  }

  private static Map<String, Object> serieTrabalho() {
    Map<String, Object> serie = new LinkedHashMap<>();
    serie.put("numero", 1);
    serie.put("carga", 60);
    serie.put("repeticoes", 5);
    serie.put("rir", 2);
    serie.put("concluida", true);
    return serie;
  }

  private static Document porUid(List<Document> gravado, String uid) {
    for (Document entrada : gravado) {
      if (uid.equals(entrada.getString("uid"))) {
        return entrada;
      }
    }
    throw new AssertionError("uid ausente: " + uid);
  }

  private static int topo(String repeticoes) {
    String digitos = "";
    int maior = 0;
    for (int i = 0; i <= repeticoes.length(); i++) {
      char c = i == repeticoes.length() ? ' ' : repeticoes.charAt(i);
      if (c >= '0' && c <= '9') {
        digitos += c;
      } else if (!digitos.isEmpty()) {
        maior = Math.max(maior, Integer.parseInt(digitos));
        digitos = "";
      }
    }
    return maior;
  }
}
