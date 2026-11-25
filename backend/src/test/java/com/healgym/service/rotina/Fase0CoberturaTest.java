package com.healgym.service.rotina;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.healgym.model.User;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Cobertura da Fase 0. Um grupo com mínimo próprio e estímulo efetivo zero (nem direto nem
 * indireto) precisa ser nomeado e impedir o salvamento sem confirmação. Estímulo só indireto não
 * conta como músculo intocado.
 */
class Fase0CoberturaTest {

  @ParameterizedTest(name = "{0} sessões, 30 e 75 min")
  @ValueSource(ints = {1, 2, 3, 4, 5, 6})
  void academiaCompletaMantemOsGrandesGrupos(int sessoes) {
    for (int minutos : new int[] {30, 75}) {
      MotorRotina.Proposta proposta = Fase0Suporte.gerar(Fase0Suporte.interpretar(
          Fase0Suporte.perfilParaSessoes(sessoes, "hipertrofia", minutos)));
      List<String> zerados = new ArrayList<>();
      for (String grupo : Fase0Suporte.GRANDES) {
        Map<String, Object> linha = Fase0Suporte.linha(proposta, grupo);
        if (Fase0Suporte.numero(linha.get("efetivas")) <= 0.01) {
          zerados.add(grupo);
        }
      }
      assertTrue(
          zerados.isEmpty(),
          minutos
              + " min / "
              + sessoes
              + " sessões zeraram "
              + zerados
              + ". "
              + Fase0Suporte.descrever(proposta.volume, Arrays.asList(Fase0Suporte.GRANDES)));
    }
  }

  @Test
  void gluteoIndiretoNaoETratadoComoMusculoIntocado() {
    MotorRotina.Proposta proposta =
        Fase0Suporte.gerar(
            Fase0Suporte.interpretar(Fase0Suporte.perfilParaSessoes(4, "hipertrofia", 75)));
    Map<String, Object> gluteos = Fase0Suporte.linha(proposta, "gluteos");
    double diretas = Fase0Suporte.numero(gluteos.get("diretas"));
    double indiretas = Fase0Suporte.numero(gluteos.get("indiretas"));
    assertTrue(
        diretas + indiretas > 0.01,
        "Glúteos ficaram sem estímulo direto e indireto: " + gluteos);
    System.out.println(
        "Glúteos na academia completa (4 sessões, 75 min): diretas="
            + diretas
            + " indiretas="
            + indiretas
            + ". Estímulo indireto, sozinho, não seria tratado como músculo intocado.");
  }

  @ParameterizedTest(name = "somente halteres, {0} sessões")
  @ValueSource(ints = {1, 2, 3, 4, 5, 6})
  void somenteHalteresZeraGruposEAindaPodeSerSalva(int sessoes) {
    exigirBloqueio(
        "Somente halteres / " + sessoes + " sessões",
        Fase0Suporte.perfilParaSessoes(sessoes, "hipertrofia", 75),
        equipamentos("halteres"));
  }

  @Test
  void halteresComBancoRecuperamOsGrandesGrupos() {
    MotorRotina.Proposta proposta =
        gerar(Fase0Suporte.perfilParaSessoes(4, "hipertrofia", 75), equipamentos("halteres", "banco"));
    List<String> zerados = new ArrayList<>();
    for (String grupo : Fase0Suporte.GRANDES) {
      if (Fase0Suporte.numero(Fase0Suporte.linha(proposta, grupo).get("efetivas")) <= 0.01) {
        zerados.add(grupo);
      }
    }
    assertTrue(
        zerados.isEmpty(),
        "Halteres com banco ainda zeraram " + zerados + ". " + Fase0Suporte.descrever(proposta.volume, Arrays.asList(Fase0Suporte.GRANDES)));
  }

  @Test
  void somenteMaquinaZeraGrupoComMinimoEAindaPodeSerSalva() {
    exigirBloqueio(
        "Somente máquinas",
        Fase0Suporte.perfilParaSessoes(4, "hipertrofia", 75),
        equipamentos("maquina"));
  }

  @Test
  void somentePoliaZeraQuadricepsEAindaPodeSerSalva() {
    exigirBloqueio(
        "Somente polia",
        Fase0Suporte.perfilParaSessoes(4, "hipertrofia", 75),
        equipamentos("polia"));
  }

  @Test
  void barraEBancoSemHalterNemMaquinaZeramPanturrilhaEAindaPodemSerSalvos() {
    exigirBloqueio(
        "Barra e banco",
        Fase0Suporte.perfilParaSessoes(4, "hipertrofia", 75),
        equipamentos("barra", "banco"));
  }

  @Test
  void evitarPeitoECostasZeraOsDoisGruposEAindaPodeSerSalvo() {
    List<String> evitar = new ArrayList<>();
    evitar.addAll(Fase0Suporte.idsDoGrupo("PEITO"));
    evitar.addAll(Fase0Suporte.idsDoGrupo("COSTAS"));
    Map<String, Object> prefs = new LinkedHashMap<>();
    prefs.put("evitar", evitar);
    exigirBloqueio(
        "15 exercícios de peito e costas evitados",
        Fase0Suporte.perfilParaSessoes(4, "hipertrofia", 75),
        prefs);
  }

  @Test
  void restricoesSimultaneasNaoLiberamExercicioProibidoNemEscondemLacuna() {
    Map<String, Object> prefs = new LinkedHashMap<>();
    prefs.put("equipamentos", Arrays.asList("barra", "halteres", "banco"));
    prefs.put("limitacoes", Arrays.asList("carga_coluna", "acima_cabeca"));
    prefs.put("evitar", Arrays.asList("lats_espessura-remada-unilateral-com-halter"));
    User.Profile bruto = Fase0Suporte.perfilParaSessoes(4, "hipertrofia", 75);
    PreferenciasTreino preferencias = Fase0Suporte.preferencias(prefs);
    MotorRotina.Proposta proposta =
        Fase0Suporte.gerar(Fase0Suporte.interpretar(bruto, preferencias, -1));
    for (MontadorSessao.Sessao sessao : proposta.sessoes) {
      for (Map<String, Object> item : sessao.itens) {
        com.healgym.service.ExerciseDatabase.Exercise exercicio =
            com.healgym.service.ExerciseDatabase.porId(String.valueOf(item.get("exercicioId")));
        assertTrue(preferencias.permite(exercicio), exercicio.nome + " passou por um filtro que deveria barrá-lo");
      }
    }
    List<String> semEstimulo = Fase0Suporte.gruposSemEstimulo(proposta);
    if (!semEstimulo.isEmpty()) {
      exigirBloqueio("Restrições simultâneas", bruto, prefs);
    }
  }

  private static Map<String, Object> equipamentos(String... ids) {
    Map<String, Object> prefs = new LinkedHashMap<>();
    prefs.put("equipamentos", Arrays.asList(ids));
    return prefs;
  }

  private static MotorRotina.Proposta gerar(User.Profile bruto, Map<String, Object> prefs) {
    return Fase0Suporte.gerar(Fase0Suporte.interpretar(bruto, Fase0Suporte.preferencias(prefs), -1));
  }

  private static void exigirBloqueio(String cenario, User.Profile bruto, Map<String, Object> prefs) {
    User usuario = Fase0Suporte.usuario(bruto);
    Fase0Suporte.Gravacao gravacao = Fase0Suporte.tentarSalvar(usuario, Fase0Suporte.corpo(usuario, prefs));
    List<Map<String, Object>> volume = Fase0Suporte.volumeDe(gravacao.previa);
    List<String> semEstimulo = Fase0Suporte.gruposSemEstimulo(volume);
    assertFalse(
        semEstimulo.isEmpty(),
        cenario
            + " não zerou nenhum grupo com mínimo positivo. O cenário não reproduz a lacuna. Volume: "
            + Fase0Suporte.descrever(volume, codigos(volume))
            + ". Só indiretos: "
            + Fase0Suporte.somenteIndiretos(volume));
    List<String> avisos = Fase0Suporte.avisosDe(gravacao.previa);
    List<String> semNome = new ArrayList<>();
    for (String codigo : semEstimulo) {
      String rotulo = String.valueOf(Fase0Suporte.linha(volume, codigo).get("rotulo"));
      if (!Fase0Suporte.avisoNomeia(avisos, rotulo)) {
        semNome.add(rotulo);
      }
    }
    String descricao = Fase0Suporte.descrever(volume, semEstimulo);
    assertAll(
        () ->
            assertTrue(
                semNome.isEmpty(),
                cenario
                    + " deixou músculos sem estímulo e o aviso não diz quais: "
                    + semNome
                    + ". Avisos: "
                    + avisos
                    + ". "
                    + descricao),
        () ->
            assertFalse(
                gravacao.salvou,
                cenario
                    + " foi gravada sem confirmação, com estímulo zero em: "
                    + descricao
                    + ". Só indiretos (não exigidos aqui): "
                    + Fase0Suporte.somenteIndiretos(volume)));
  }

  private static List<String> codigos(List<Map<String, Object>> volume) {
    List<String> codigos = new ArrayList<>();
    for (Map<String, Object> linha : volume) {
      codigos.add(String.valueOf(linha.get("codigo")));
    }
    return codigos;
  }
}
