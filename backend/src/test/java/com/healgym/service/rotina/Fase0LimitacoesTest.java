package com.healgym.service.rotina;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.healgym.service.ExerciseDatabase;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * A seleção tem de cumprir o texto que a interface mostra. Passar pelo filtro não torna o
 * exercício compatível com a descrição da limitação.
 */
class Fase0LimitacoesTest {

  @Test
  void cadaLimitacaoRemoveOQueODetalheLista() {
    for (String limitacao : PreferenciasTreino.LIMITACOES.keySet()) {
      PreferenciasTreino prefs =
          Fase0Suporte.preferencias(Map.of("limitacoes", List.of(limitacao)));
      MotorRotina.Proposta proposta =
          Fase0Suporte.gerar(
              Fase0Suporte.interpretar(
                  Fase0Suporte.perfilParaSessoes(4, "hipertrofia", 75), prefs, -1));
      for (MontadorSessao.Sessao sessao : proposta.sessoes) {
        for (Map<String, Object> item : sessao.itens) {
          ExerciseDatabase.Exercise exercicio =
              ExerciseDatabase.porId(String.valueOf(item.get("exercicioId")));
          assertTrue(
              prefs.permite(exercicio),
              limitacao + " deixou entrar " + exercicio.nome + ", que o próprio filtro recusa");
        }
      }
    }
  }

  @Test
  void cargaNaColunaAindaPermiteTroncoInclinadoComPeso() {
    PreferenciasTreino prefs =
        Fase0Suporte.preferencias(Map.of("limitacoes", List.of("carga_coluna")));
    List<String> restantes = new ArrayList<>();
    for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.ativos()) {
      if (!troncoInclinadoComPeso(exercicio) || "peso_corporal".equals(exercicio.tipoCarga)) {
        continue;
      }
      if (prefs.permite(exercicio)) {
        restantes.add(exercicio.nome + " [" + exercicio.tecnica + "]");
      }
    }
    assertTrue(
        restantes.isEmpty(),
        "A limitação diz \"tronco inclinado com peso\", mas estes exercícios continuam disponíveis: "
            + restantes
            + ". Detalhe exibido: "
            + PreferenciasTreino.LIMITACOES_DETALHE.get("carga_coluna"));
  }

  @Test
  void acimaDaCabecaAindaPermiteBracoAcimaDaCabeca() {
    PreferenciasTreino prefs =
        Fase0Suporte.preferencias(Map.of("limitacoes", List.of("acima_cabeca")));
    List<String> restantes = new ArrayList<>();
    for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.ativos()) {
      String texto = Fase0Suporte.textoVisivel(exercicio);
      boolean acima =
          texto.contains("acima da cabeça")
              || "desenvolvimento".equals(exercicio.padrao)
              || "puxada_vertical".equals(exercicio.padrao);
      if (acima && prefs.permite(exercicio)) {
        restantes.add(exercicio.nome + " [" + exercicio.enfase + "]");
      }
    }
    assertTrue(
        restantes.isEmpty(),
        "A limitação é \"elevar os braços acima da cabeça\", mas continuam disponíveis: "
            + restantes
            + ". Detalhe exibido: "
            + PreferenciasTreino.LIMITACOES_DETALHE.get("acima_cabeca"));
  }

  @Test
  void afundosRemoveOsDoisAfundosENaoPrometeRemoverAgachamento() {
    PreferenciasTreino prefs = Fase0Suporte.preferencias(Map.of("limitacoes", List.of("afundos")));
    assertFalse(prefs.permite(ExerciseDatabase.porId("quadriceps_completo-afundo-com-halteres")));
    assertFalse(prefs.permite(ExerciseDatabase.porId("vasto_medial-afundo-bulgaro-com-halteres")));
    assertTrue(
        prefs.permite(ExerciseDatabase.porId("quadriceps_completo-agachamento-com-barra")),
        "O detalhe de afundos não promete retirar o agachamento");
    String texto =
        PreferenciasTreino.LIMITACOES.get("afundos")
            + " "
            + PreferenciasTreino.LIMITACOES_DETALHE.get("afundos");
    assertFalse(texto.toLowerCase().contains("agachamento") || texto.toLowerCase().contains("leg press"));
  }

  @Test
  void legPressEGobletPassamPorTodasAsLimitacoes() {
    String[] ids = {"quadriceps_completo-leg-press", "vasto_medial-agachamento-goblet-com-halter"};
    List<String> semCobertura = new ArrayList<>();
    for (String id : ids) {
      ExerciseDatabase.Exercise exercicio = ExerciseDatabase.porId(id);
      boolean algumaRemove = false;
      for (String limitacao : PreferenciasTreino.LIMITACOES.keySet()) {
        PreferenciasTreino prefs =
            Fase0Suporte.preferencias(Map.of("limitacoes", List.of(limitacao)));
        if (!prefs.permite(exercicio)) {
          algumaRemove = true;
        }
      }
      if (!algumaRemove) {
        semCobertura.add(exercicio.nome);
      }
    }
    assertTrue(
        semCobertura.isEmpty(),
        "Nenhuma das quatro limitações retira "
            + semCobertura
            + ". Carga na coluna só retira agachamento com barra e no Smith; afundos só retira os dois afundos. "
            + "Leg press e goblet seguem disponíveis em qualquer combinação.");
  }

  @Test
  void supinoComBarraTrocaABarraENaoRemoveOHalter() {
    PreferenciasTreino prefs =
        Fase0Suporte.preferencias(Map.of("limitacoes", List.of("supino_barra")));
    MotorRotina.Proposta proposta =
        Fase0Suporte.gerar(
            Fase0Suporte.interpretar(
                Fase0Suporte.perfil("hipertrofia", "mais_de_5_anos", "semanal_5_mais", 4, 75),
                prefs,
                -1));
    boolean viuSupino = false;
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      for (Map<String, Object> item : sessao.itens) {
        String padrao = String.valueOf(item.get("padrao"));
        if (!padrao.startsWith("supino")) {
          continue;
        }
        viuSupino = true;
        assertFalse(
            String.valueOf(item.get("equipamento")).contains("barra"),
            String.valueOf(item.get("nome")));
      }
    }
    assertTrue(viuSupino, "A limitação deveria trocar o supino com barra por halteres, não apagar o peito");
    assertTrue(prefs.permite(ExerciseDatabase.porId("medio-supino-reto-com-halteres")));
  }

  @Test
  void supinoComBarraNaoPrometeRemoverAbducaoHorizontal() {
    PreferenciasTreino prefs =
        Fase0Suporte.preferencias(Map.of("limitacoes", List.of("supino_barra")));
    ExerciseDatabase.Exercise crucifixo =
        ExerciseDatabase.porId("posterior-crucifixo-inverso-com-halteres");
    assertTrue(
        prefs.permite(crucifixo),
        "A promessa do supino com barra não inclui a abdução horizontal do ombro");
    assertFalse(textosDasLimitacoes().contains("abdução") || textosDasLimitacoes().contains("abducao"));
  }

  private static String textosDasLimitacoes() {
    StringBuilder texto = new StringBuilder();
    for (Map.Entry<String, String> limitacao : PreferenciasTreino.LIMITACOES.entrySet()) {
      texto.append(limitacao.getValue()).append(' ').append(PreferenciasTreino.LIMITACOES_DETALHE.get(limitacao.getKey())).append(' ');
    }
    return texto.toString().toLowerCase();
  }

  private static boolean troncoInclinadoComPeso(ExerciseDatabase.Exercise exercicio) {
    String texto = Fase0Suporte.textoVisivel(exercicio);
    return texto.contains("tronco inclinado")
        || texto.contains("incline o tronco")
        || texto.contains("tronco apoiado ou inclinado");
  }

}
