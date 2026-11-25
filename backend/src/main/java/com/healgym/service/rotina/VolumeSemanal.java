package com.healgym.service.rotina;

import com.healgym.service.CoberturaMuscular;
import com.healgym.service.ExerciseDatabase;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Volume semanal por grupo muscular.
 *
 * <p>Critério: cada série conta 1 para o músculo principal do exercício e 0,5 para cada músculo
 * secundário de outro grupo (empurrar estimula tríceps, puxar estimula bíceps). As faixas abaixo
 * são heurísticas de séries efetivas por semana, crescentes com a capacidade atual:
 *
 * <pre>
 *                      capacidade 1   capacidade 2   capacidade 3
 * grupos grandes          6 a 10         9 a 14        12 a 18
 * grupos pequenos         3 a 8          5 a 12         6 a 16
 * </pre>
 *
 * Grupos priorizados pelo usuário ganham +2 no mínimo e +4 no máximo. Ombro anterior e core não
 * têm mínimo: recebem bastante estímulo indireto e entram como complemento.
 */
final class VolumeSemanal {

  static final List<String> GRUPOS =
      Collections.unmodifiableList(
          Arrays.asList(
              "peito",
              "costas",
              "deltoide_anterior",
              "deltoide_lateral",
              "deltoide_posterior",
              "triceps",
              "biceps",
              "quadriceps",
              "isquiotibiais",
              "gluteos",
              "panturrilhas",
              "core"));

  static final Map<String, String> ROTULOS = new LinkedHashMap<>();
  static final Set<String> GRANDES =
      new LinkedHashSet<>(Arrays.asList("peito", "costas", "quadriceps", "isquiotibiais", "gluteos"));
  static final Set<String> PEQUENOS =
      new LinkedHashSet<>(
          Arrays.asList("deltoide_lateral", "deltoide_posterior", "triceps", "biceps", "panturrilhas"));

  static {
    ROTULOS.put("peito", "Peito");
    ROTULOS.put("costas", "Costas");
    ROTULOS.put("deltoide_anterior", "Ombro (anterior)");
    ROTULOS.put("deltoide_lateral", "Ombro (lateral)");
    ROTULOS.put("deltoide_posterior", "Ombro (posterior)");
    ROTULOS.put("triceps", "Tríceps");
    ROTULOS.put("biceps", "Bíceps");
    ROTULOS.put("quadriceps", "Quadríceps");
    ROTULOS.put("isquiotibiais", "Posteriores de coxa");
    ROTULOS.put("gluteos", "Glúteos");
    ROTULOS.put("panturrilhas", "Panturrilhas");
    ROTULOS.put("core", "Core");
  }

  static final class Contagem {
    double diretas;
    double indiretas;

    double efetivas() {
      return diretas + indiretas;
    }
  }

  private VolumeSemanal() {}

  static String grupo(String musculo) {
    if (musculo == null) {
      return null;
    }
    switch (musculo) {
      case "peitoral":
        return "peito";
      case "dorsal":
      case "costas_medias":
        return "costas";
      case "biceps":
      case "braquial":
        return "biceps";
      case "deltoide_anterior":
      case "deltoide_lateral":
      case "deltoide_posterior":
      case "triceps":
      case "quadriceps":
      case "isquiotibiais":
      case "gluteos":
      case "panturrilhas":
      case "core":
        return musculo;
      default:
        return null;
    }
  }

  static int[] faixa(String grupo, int capacidade, boolean prioridade) {
    int i = Math.max(0, Math.min(2, capacidade - 1));
    int minimo;
    int maximo;
    if (GRANDES.contains(grupo)) {
      minimo = new int[] {6, 9, 12}[i];
      maximo = new int[] {10, 14, 18}[i];
    } else if (PEQUENOS.contains(grupo)) {
      minimo = new int[] {3, 5, 6}[i];
      maximo = new int[] {8, 12, 16}[i];
    } else if ("deltoide_anterior".equals(grupo)) {
      minimo = 0;
      maximo = new int[] {12, 16, 20}[i];
    } else {
      minimo = 0;
      maximo = new int[] {6, 8, 9}[i];
    }
    if (prioridade && minimo > 0) {
      minimo += 2;
      maximo += 4;
    }
    return new int[] {minimo, maximo};
  }

  @SuppressWarnings("unchecked")
  static Map<String, Contagem> contar(List<Map<String, Object>> itens) {
    Map<String, Contagem> mapa = new LinkedHashMap<>();
    for (Map<String, Object> item : itens) {
      int series = MontadorSessao.numero(item.get("series"));
      String principal = grupo((String) item.get("musculoPrincipalCodigo"));
      if (principal != null) {
        mapa.computeIfAbsent(principal, chave -> new Contagem()).diretas += series;
      }
      Object secundarios = item.get("secundariosCodigos");
      if (secundarios instanceof List) {
        Set<String> vistos = new LinkedHashSet<>();
        for (Object secundario : (List<Object>) secundarios) {
          String g = grupo(String.valueOf(secundario));
          if (g != null && !g.equals(principal) && vistos.add(g)) {
            mapa.computeIfAbsent(g, chave -> new Contagem()).indiretas += series * 0.5;
          }
        }
      }
    }
    return mapa;
  }

  static Map<String, Contagem> contarSemana(List<MontadorSessao.Sessao> sessoes) {
    Map<String, Contagem> total = new LinkedHashMap<>();
    for (MontadorSessao.Sessao sessao : sessoes) {
      for (Map.Entry<String, Contagem> entrada : contar(sessao.itens).entrySet()) {
        Contagem c = total.computeIfAbsent(entrada.getKey(), chave -> new Contagem());
        c.diretas += entrada.getValue().diretas;
        c.indiretas += entrada.getValue().indiretas;
      }
    }
    return total;
  }

  static double efetivas(Map<String, Contagem> mapa, String grupo) {
    Contagem c = mapa.get(grupo);
    return c == null ? 0 : c.efetivas();
  }

  /**
   * Grupos com mínimo próprio e estímulo efetivo zero. Volume abaixo da meta, com algum estímulo,
   * não entra aqui: uma rotina mais curta pode ser válida.
   */
  static List<String> gruposSemEstimulo(List<MontadorSessao.Sessao> sessoes, PerfilInterpretado perfil) {
    Set<String> prioritarios = perfil.preferencias.gruposPrioritarios();
    Map<String, Contagem> semana = contarSemana(sessoes);
    List<String> grupos = new ArrayList<>();
    for (String g : GRUPOS) {
      if (faixa(g, perfil.capacidade, prioritarios.contains(g))[0] > 0 && efetivas(semana, g) <= 0.01) {
        grupos.add(g);
      }
    }
    return grupos;
  }

  /** Há exercício do catálogo para o grupo, respeitando equipamento, limitação e nível. */
  static boolean existeCompativel(String grupo, PerfilInterpretado perfil) {
    List<ModelosSessao.Vaga> vagas = ModelosSessao.COMPLEMENTOS.get(grupo);
    if (vagas == null) {
      return false;
    }
    for (ModelosSessao.Vaga vaga : vagas) {
      for (ExerciseDatabase.Exercise exercicio :
          SeletorExercicios.candidatos(vaga.todosPadroes(), null, perfil)) {
        if (grupo.equals(grupo(exercicio.principal))) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Quando um grupo relevante ficou sem nenhum estímulo, tenta encaixar um exercício compatível.
   * Primeiro respeita o orçamento. Se o tempo não couber, inclui o mínimo e avisa que a sessão
   * passa da duração. Não inventa exercício fora do catálogo nem fora das preferências.
   */
  static void recuperarAusentes(
      List<MontadorSessao.Sessao> sessoes, PerfilInterpretado perfil, int seed, int variacao) {
    Set<String> prioritarios = perfil.preferencias.gruposPrioritarios();
    for (String grupo : gruposSemEstimulo(sessoes, perfil)) {
      if (!GRANDES.contains(grupo)) {
        continue;
      }
      if (complementar(sessoes, grupo, perfil, prioritarios, seed, variacao)) {
        continue;
      }
      inserirEstimuloMinimo(sessoes, grupo, perfil, seed, variacao);
    }
  }

  /**
   * Corta excessos e depois completa déficits sem estourar tempo, tetos por sessão nem máximos.
   * Para completar, primeiro soma séries aos exercícios existentes; se não houver como, acrescenta
   * um exercício complementar numa sessão cujo foco inclua o grupo.
   */
  static void equilibrar(
      List<MontadorSessao.Sessao> sessoes, PerfilInterpretado perfil, int seed, int variacao) {
    Set<String> prioritarios = perfil.preferencias.gruposPrioritarios();
    for (int volta = 0; volta < 120; volta++) {
      Map<String, Contagem> semana = contarSemana(sessoes);
      String excedido = null;
      double maior = 0;
      for (String g : GRUPOS) {
        double excesso = efetivas(semana, g) - faixa(g, perfil.capacidade, prioritarios.contains(g))[1];
        if (excesso > 0.01 && excesso > maior) {
          maior = excesso;
          excedido = g;
        }
      }
      if (excedido == null || !reduzirGrupo(sessoes, excedido)) {
        break;
      }
    }
    for (int volta = 0; volta < 120; volta++) {
      Map<String, Contagem> semana = contarSemana(sessoes);
      List<String> faltando = new ArrayList<>();
      for (String g : GRUPOS) {
        if (faixa(g, perfil.capacidade, prioritarios.contains(g))[0] - efetivas(semana, g) > 0.01) {
          faltando.add(g);
        }
      }
      faltando.sort(
          (a, b) ->
              Double.compare(
                  faixa(b, perfil.capacidade, prioritarios.contains(b))[0] - efetivas(semana, b),
                  faixa(a, perfil.capacidade, prioritarios.contains(a))[0] - efetivas(semana, a)));
      boolean mudou = false;
      for (String g : faltando) {
        if (acrescentar(sessoes, g, perfil, prioritarios)
            || complementar(sessoes, g, perfil, prioritarios, seed, variacao)) {
          mudou = true;
          break;
        }
      }
      if (!mudou) {
        break;
      }
    }
  }

  private static boolean reduzirGrupo(List<MontadorSessao.Sessao> sessoes, String grupo) {
    Map<String, Object> alvo = null;
    int alvoPrioridade = -1;
    int alvoSeries = -1;
    for (MontadorSessao.Sessao sessao : sessoes) {
      for (Map<String, Object> item : sessao.itens) {
        if (!grupo.equals(grupo((String) item.get("musculoPrincipalCodigo")))
            || Prescricao.PRINCIPAL.equals(item.get("papel"))) {
          continue;
        }
        int series = MontadorSessao.numero(item.get("series"));
        int prioridade = MontadorSessao.numero(item.get("prioridade"));
        if (series <= 2) {
          continue;
        }
        if (prioridade > alvoPrioridade || (prioridade == alvoPrioridade && series >= alvoSeries)) {
          alvo = item;
          alvoPrioridade = prioridade;
          alvoSeries = series;
        }
      }
    }
    if (alvo != null) {
      alvo.put("series", alvoSeries - 1);
      return true;
    }
    for (int s = sessoes.size() - 1; s >= 0; s--) {
      MontadorSessao.Sessao sessao = sessoes.get(s);
      for (int i = sessao.itens.size() - 1; i >= 0; i--) {
        Map<String, Object> item = sessao.itens.get(i);
        if (grupo.equals(grupo((String) item.get("musculoPrincipalCodigo")))
            && MontadorSessao.numero(item.get("prioridade")) == 3) {
          sessao.itens.remove(i);
          MontadorSessao.numerar(sessao);
          return true;
        }
      }
    }
    for (MontadorSessao.Sessao sessao : sessoes) {
      for (Map<String, Object> item : sessao.itens) {
        if (grupo.equals(grupo((String) item.get("musculoPrincipalCodigo")))
            && MontadorSessao.numero(item.get("series")) > 2) {
          item.put("series", MontadorSessao.numero(item.get("series")) - 1);
          return true;
        }
      }
    }
    return false;
  }

  private static boolean acrescentar(
      List<MontadorSessao.Sessao> sessoes,
      String grupo,
      PerfilInterpretado perfil,
      Set<String> prioritarios) {
    List<Object[]> candidatos = new ArrayList<>();
    for (MontadorSessao.Sessao sessao : sessoes) {
      for (Map<String, Object> item : sessao.itens) {
        if (!grupo.equals(grupo((String) item.get("musculoPrincipalCodigo")))) {
          continue;
        }
        int series = MontadorSessao.numero(item.get("series"));
        if (series >= Prescricao.seriesMaximas(String.valueOf(item.get("papel")), perfil)) {
          continue;
        }
        candidatos.add(new Object[] {sessao, item});
      }
    }
    candidatos.sort(
        (a, b) -> {
          Map<String, Object> x = item(a);
          Map<String, Object> y = item(b);
          int porSeries =
              Integer.compare(MontadorSessao.numero(x.get("series")), MontadorSessao.numero(y.get("series")));
          if (porSeries != 0) {
            return porSeries;
          }
          return Integer.compare(
              MontadorSessao.numero(x.get("prioridade")), MontadorSessao.numero(y.get("prioridade")));
        });
    for (Object[] candidato : candidatos) {
      MontadorSessao.Sessao sessao = (MontadorSessao.Sessao) candidato[0];
      Map<String, Object> item = item(candidato);
      int series = MontadorSessao.numero(item.get("series"));
      item.put("series", series + 1);
      if (cabe(sessao, perfil) && semanaDentroDosMaximos(sessoes, perfil, prioritarios)) {
        return true;
      }
      item.put("series", series);
    }
    return false;
  }

  private static boolean complementar(
      List<MontadorSessao.Sessao> sessoes,
      String grupo,
      PerfilInterpretado perfil,
      Set<String> prioritarios,
      int seed,
      int variacao) {
    List<ModelosSessao.Vaga> vagas = ModelosSessao.COMPLEMENTOS.get(grupo);
    if (vagas == null) {
      return false;
    }
    List<MontadorSessao.Sessao> ordem = new ArrayList<>(sessoes);
    ordem.sort((a, b) -> Integer.compare(a.segundos(), b.segundos()));
    for (ModelosSessao.Vaga vaga : vagas) {
      for (MontadorSessao.Sessao sessao : ordem) {
        Set<String> permitidos = ModelosSessao.GRUPOS_DO_FOCO.get(sessao.modelo.foco);
        if (permitidos == null || !permitidos.contains(grupo)) {
          continue;
        }
        SeletorExercicios.Escolha escolha =
            SeletorExercicios.escolher(
                vaga,
                false,
                sessao.codigo + ":extra:" + vaga.id,
                sessao.modelo.foco,
                sessao.itens,
                null,
                perfil,
                seed,
                variacao);
        if (escolha.exercicio == null
            || !grupo.equals(grupo(escolha.exercicio.principal))) {
          continue;
        }
        String papel = Prescricao.papel(escolha.exercicio, false);
        Map<String, Object> item = Prescricao.item(escolha.exercicio, papel, 2, perfil);
        item.put("prioridade", 3);
        item.put("vaga", vaga.id);
        item.put("vagaRotulo", vaga.rotulo);
        item.put("complemento", true);
        sessao.itens.add(item);
        MontadorSessao.numerar(sessao);
        if (cabe(sessao, perfil) && semanaDentroDosMaximos(sessoes, perfil, prioritarios)) {
          return true;
        }
        sessao.itens.remove(item);
        MontadorSessao.numerar(sessao);
      }
    }
    return false;
  }

  /**
   * Inclui 2 séries quando o grupo ficaria sem estímulo. Ignora o orçamento de tempo, respeita os
   * tetos de séries e registra o aviso se a sessão passar da duração escolhida.
   */
  private static boolean inserirEstimuloMinimo(
      List<MontadorSessao.Sessao> sessoes, String grupo, PerfilInterpretado perfil, int seed, int variacao) {
    List<ModelosSessao.Vaga> vagas = ModelosSessao.COMPLEMENTOS.get(grupo);
    if (vagas == null) {
      return false;
    }
    List<MontadorSessao.Sessao> ordem = new ArrayList<>(sessoes);
    ordem.sort((a, b) -> Integer.compare(a.segundos(), b.segundos()));
    for (ModelosSessao.Vaga vaga : vagas) {
      for (MontadorSessao.Sessao sessao : ordem) {
        Set<String> permitidos = ModelosSessao.GRUPOS_DO_FOCO.get(sessao.modelo.foco);
        if (permitidos == null || !permitidos.contains(grupo)) {
          continue;
        }
        SeletorExercicios.Escolha escolha =
            SeletorExercicios.escolher(
                vaga,
                false,
                sessao.codigo + ":cobertura:" + vaga.id,
                sessao.modelo.foco,
                sessao.itens,
                null,
                perfil,
                seed,
                variacao);
        if (escolha.exercicio == null || !grupo.equals(grupo(escolha.exercicio.principal))) {
          continue;
        }
        String papel = Prescricao.papel(escolha.exercicio, false);
        Map<String, Object> item = Prescricao.item(escolha.exercicio, papel, 2, perfil);
        item.put("prioridade", 3);
        item.put("vaga", vaga.id);
        item.put("vagaRotulo", vaga.rotulo);
        item.put("complemento", true);
        item.put("coberturaEssencial", true);
        sessao.itens.add(item);
        MontadorSessao.numerar(sessao);
        if (!dentroDosTetos(sessao, perfil)) {
          sessao.itens.remove(item);
          MontadorSessao.numerar(sessao);
          continue;
        }
        avisarSePassarDoTempo(sessao);
        return true;
      }
    }
    return false;
  }

  private static boolean dentroDosTetos(MontadorSessao.Sessao sessao, PerfilInterpretado perfil) {
    int total = 0;
    Map<String, Integer> porGrupo = new LinkedHashMap<>();
    for (Map<String, Object> item : sessao.itens) {
      int series = MontadorSessao.numero(item.get("series"));
      total += series;
      String g = grupo((String) item.get("musculoPrincipalCodigo"));
      if (g != null) {
        porGrupo.merge(g, series, Integer::sum);
      }
    }
    if (total > MontadorSessao.capSeriesSessao(perfil.capacidade)) {
      return false;
    }
    for (int valor : porGrupo.values()) {
      if (valor > MontadorSessao.capGrupoSessao(perfil.capacidade)) {
        return false;
      }
    }
    return true;
  }

  private static void avisarSePassarDoTempo(MontadorSessao.Sessao sessao) {
    if (sessao.segundos() <= sessao.minutos * 60) {
      return;
    }
    for (String aviso : sessao.avisos) {
      if (aviso.startsWith("Mesmo só com os exercícios essenciais")) {
        return;
      }
    }
    sessao.avisos.add(
        "Mesmo só com os exercícios essenciais, a estimativa passa de "
            + sessao.minutos
            + " min. O movimento foi mantido para o grupo não ficar sem estímulo. Considere uma duração maior.");
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> item(Object[] par) {
    return (Map<String, Object>) par[1];
  }

  private static boolean cabe(MontadorSessao.Sessao sessao, PerfilInterpretado perfil) {
    if (sessao.segundos() > sessao.orcamento()) {
      return false;
    }
    int total = 0;
    Map<String, Integer> porGrupo = new LinkedHashMap<>();
    for (Map<String, Object> item : sessao.itens) {
      int series = MontadorSessao.numero(item.get("series"));
      total += series;
      String g = grupo((String) item.get("musculoPrincipalCodigo"));
      if (g != null) {
        porGrupo.merge(g, series, Integer::sum);
      }
    }
    if (total > MontadorSessao.capSeriesSessao(perfil.capacidade)) {
      return false;
    }
    for (int valor : porGrupo.values()) {
      if (valor > MontadorSessao.capGrupoSessao(perfil.capacidade)) {
        return false;
      }
    }
    return true;
  }

  private static boolean semanaDentroDosMaximos(
      List<MontadorSessao.Sessao> sessoes, PerfilInterpretado perfil, Set<String> prioritarios) {
    Map<String, Contagem> semana = contarSemana(sessoes);
    for (String g : GRUPOS) {
      if (efetivas(semana, g) > faixa(g, perfil.capacidade, prioritarios.contains(g))[1] + 0.01) {
        return false;
      }
    }
    return true;
  }

  static List<Map<String, Object>> resumo(
      List<MontadorSessao.Sessao> sessoes, PerfilInterpretado perfil) {
    Set<String> prioritarios = perfil.preferencias.gruposPrioritarios();
    Map<String, Contagem> semana = contarSemana(sessoes);
    List<Map<String, Object>> linhas = new ArrayList<>();
    for (String g : GRUPOS) {
      Contagem c = semana.getOrDefault(g, new Contagem());
      int[] faixa = faixa(g, perfil.capacidade, prioritarios.contains(g));
      int frequencia = 0;
      for (MontadorSessao.Sessao sessao : sessoes) {
        Contagem daSessao = contar(sessao.itens).get(g);
        if (daSessao != null && (daSessao.diretas > 0 || daSessao.indiretas > 0)) {
          frequencia++;
        }
      }
      double efetivas = c.efetivas();
      Map<String, Object> linha = new LinkedHashMap<>();
      linha.put("codigo", g);
      linha.put("rotulo", ROTULOS.get(g));
      linha.put("diretas", CoberturaMuscular.arredondar(c.diretas));
      linha.put("indiretas", CoberturaMuscular.arredondar(c.indiretas));
      linha.put("efetivas", CoberturaMuscular.arredondar(efetivas));
      linha.put("minimo", faixa[0]);
      linha.put("maximo", faixa[1]);
      linha.put(
          "status",
          efetivas + 0.01 < faixa[0] ? "abaixo" : efetivas - 0.01 > faixa[1] ? "acima" : "ok");
      linha.put("frequencia", frequencia);
      linha.put("prioridade", prioritarios.contains(g));
      linha.put("grande", GRANDES.contains(g));
      linhas.add(linha);
    }
    return linhas;
  }

  /** Grupos grandes com séries diretas na sessão, usados para avaliar recuperação. */
  static Map<String, Double> grandesDiretas(List<Map<String, Object>> itens) {
    Map<String, Double> mapa = new LinkedHashMap<>();
    for (Map.Entry<String, Contagem> entrada : contar(itens).entrySet()) {
      if (GRANDES.contains(entrada.getKey()) && entrada.getValue().diretas > 0) {
        mapa.put(entrada.getKey(), entrada.getValue().diretas);
      }
    }
    return mapa;
  }
}
