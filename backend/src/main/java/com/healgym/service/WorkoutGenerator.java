package com.healgym.service;

import com.healgym.util.Js;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

public final class WorkoutGenerator {

  public static final List<String> WORKOUT_GROUPS =
      Arrays.asList(
          "PEITO",
          "COSTAS",
          "OMBROS",
          "TRICEPS",
          "BICEPS",
          "PERNAS",
          "PEITO_TRICEPS",
          "COSTAS_BICEPS",
          "PERNAS_OMBROS",
          "OMBROS_BRACOS",
          "FULL_BODY");

  public static final List<String> DIVISOES = Arrays.asList("ABC", "ABCD", "FULL_BODY");

  public static final class Resolved {
    public final String grupamento;
    public final String letra;
    public final String error;

    Resolved(String grupamento, String letra, String error) {
      this.grupamento = grupamento;
      this.letra = letra;
      this.error = error;
    }
  }

  public static final class Metadata {
    public final String titulo;
    public final String objetivo;

    Metadata(String titulo, String objetivo) {
      this.titulo = titulo;
      this.objetivo = objetivo;
    }
  }

  public static final class Session {
    public final List<Map<String, Object>> exercicios;
    public final int duracaoEstimadaMinutos;
    public final int segundos;
    public final String resumo;
    public final Map<String, Object> cobertura;
    public final List<String> observacoes;
    public final List<String> problemas;

    Session(
        List<Map<String, Object>> exercicios,
        int segundos,
        String resumo,
        Map<String, Object> cobertura,
        List<String> observacoes,
        List<String> problemas) {
      this.exercicios = exercicios;
      this.segundos = segundos;
      this.duracaoEstimadaMinutos = Math.max(1, (int) Math.round(segundos / 60.0));
      this.resumo = resumo;
      this.cobertura = cobertura;
      this.observacoes = observacoes;
      this.problemas = problemas;
    }
  }

  private static final Map<String, Metadata> METADATA = new LinkedHashMap<>();

  static {
    METADATA.put("PEITO", new Metadata("Treino A — Peito", "Supinos horizontal e inclinado, com adução quando o tempo permitir."));
    METADATA.put("COSTAS", new Metadata("Treino B — Costas", "Puxada vertical e remada, com deltoide posterior quando o tempo permitir."));
    METADATA.put("OMBROS", new Metadata("Treino C — Ombros", "Deltoides lateral e posterior, com desenvolvimento quando o tempo permitir."));
    METADATA.put("TRICEPS", new Metadata("Treino D — Tríceps", "Extensões de cotovelo com o braço ao lado do tronco e acima da cabeça."));
    METADATA.put("BICEPS", new Metadata("Treino E — Bíceps", "Flexão do cotovelo com pegada supinada e neutra."));
    METADATA.put("PERNAS", new Metadata("Treino C — Pernas", "Dominante de joelho, dominante de quadril, flexão do joelho e panturrilhas."));
    METADATA.put("PEITO_TRICEPS", new Metadata("Treino A — Peito e Tríceps", "Bloco de peito com supinos e adução, seguido do bloco de tríceps."));
    METADATA.put("COSTAS_BICEPS", new Metadata("Treino B — Costas e Bíceps", "Bloco de costas com puxada e remada, seguido do bloco de bíceps."));
    METADATA.put("PERNAS_OMBROS", new Metadata("Treino C — Pernas e Ombros", "Pernas com joelho e quadril, seguidas de deltoides lateral e posterior."));
    METADATA.put("OMBROS_BRACOS", new Metadata("Treino D — Ombros e Braços", "Deltoides com volume principal; braços com volume reduzido, pois já trabalham em A e B."));
    METADATA.put("FULL_BODY", new Metadata("Treino Full Body", "Dominante de joelho, dominante de quadril, empurrar e puxar na mesma sessão."));
  }

  private static final Pattern LETTER = Pattern.compile("^[A-D]$");
  private static final Pattern TITLE_LETTER = Pattern.compile("^Treino [A-Z](?= —)");

  private WorkoutGenerator() {}

  public static Session montar(
      String grupamento, double tempoMinutos, String nivel, List<String> objetivos, int seed) {
    return montar(grupamento, tempoMinutos, nivel, objetivos, seed, 0);
  }

  public static Session montar(
      String grupamento,
      double tempoMinutos,
      String nivel,
      List<String> objetivos,
      int seed,
      int variante) {
    int experiencia = nivelRank(nivel);
    String modo = modoObjetivo(objetivos);
    if (SessionPlanner.suporta(grupamento)) {
      SessionPlanner.Plano plano =
          SessionPlanner.planejar(grupamento, tempoMinutos, experiencia, modo, seed, variante);
      return new Session(
          plano.exercicios,
          plano.segundos,
          CoberturaMuscular.resumo(grupamento, plano.exercicios),
          CoberturaMuscular.calcular(grupamento, plano.exercicios),
          plano.observacoes,
          plano.problemas);
    }
    return montarLegado(grupamento, tempoMinutos, experiencia, modo, seed);
  }

  private static Session montarLegado(
      String grupamento, double tempoMinutos, int experiencia, String modo, int seed) {
    int orcamento = (int) Math.floor(tempoMinutos * 60.0);
    List<Map<String, Object>> escolhidos = new ArrayList<>();
    Set<String> usados = new LinkedHashSet<>();
    for (String[] slot : plano(grupamento, tempoMinutos)) {
      boolean essencial = "1".equals(slot[2]);
      ExerciseDatabase.Exercise exercicio =
          escolher(slot[0], slot[1], experiencia, seed + escolhidos.size() * 17, usados);
      if (exercicio == null) {
        continue;
      }
      boolean principal = exercicio.composto && escolhidos.stream().noneMatch(item -> Boolean.TRUE.equals(item.get("composto")));
      Map<String, Object> item = SessionPlanner.prescrever(exercicio, experiencia, modo, principal, "normal", grupamento);
      item.put("bloco", "Exercícios");
      item.put("blocoOrdem", 0);
      item.put("ordem", escolhidos.size());
      List<Map<String, Object>> teste = new ArrayList<>(escolhidos);
      teste.add(item);
      while (SessionPlanner.numero(item.get("series")) > 2
          && SessionPlanner.segundosTotais(teste, tempoMinutos) > orcamento) {
        item.put("series", SessionPlanner.numero(item.get("series")) - 1);
      }
      if (SessionPlanner.segundosTotais(teste, tempoMinutos) > orcamento && (!essencial || !escolhidos.isEmpty())) {
        continue;
      }
      usados.add(exercicio.id);
      escolhidos.add(item);
    }
    int posicao = 1;
    for (Map<String, Object> item : escolhidos) {
      item.put("posicao", posicao++);
    }
    int total = SessionPlanner.segundosTotais(escolhidos, tempoMinutos);
    return new Session(
        escolhidos,
        total,
        CoberturaMuscular.resumo(grupamento, escolhidos),
        CoberturaMuscular.calcular(grupamento, escolhidos),
        new ArrayList<>(),
        new ArrayList<>());
  }

  private static List<String[]> plano(String grupamento, double tempo) {
    List<String[]> slots = new ArrayList<>();
    switch (grupamento) {
      case "PEITO":
        slot(slots, "PEITO", "supino_horizontal", true);
        slot(slots, "PEITO", "supino_inclinado", true);
        if (tempo >= 45) slot(slots, "PEITO", "aducao_horizontal", false);
        break;
      case "COSTAS":
        slot(slots, "COSTAS", "puxada_vertical", true);
        slot(slots, "COSTAS", "remada", true);
        if (tempo >= 45) slot(slots, "OMBROS", "deltoide_posterior", false);
        break;
      case "OMBROS":
        slot(slots, "OMBROS", "desenvolvimento", false);
        slot(slots, "OMBROS", "elevacao_lateral", true);
        slot(slots, "OMBROS", "deltoide_posterior", true);
        break;
      case "TRICEPS":
        slot(slots, "TRICEPS", "triceps_pushdown", true);
        slot(slots, "TRICEPS", "triceps_overhead", true);
        break;
      case "BICEPS":
        slot(slots, "BICEPS", "rosca", true);
        slot(slots, "BICEPS", "rosca_neutra", true);
        break;
      default:
        break;
    }
    return slots;
  }

  private static void slot(List<String[]> slots, String grupo, String padrao, boolean essencial) {
    slots.add(new String[] {grupo, padrao, essencial ? "1" : "0"});
  }

  private static ExerciseDatabase.Exercise escolher(
      String grupo, String padrao, int experiencia, int seed, Set<String> usados) {
    Map<String, List<ExerciseDatabase.Exercise>> base = ExerciseDatabase.DATABASE.get(grupo);
    if (base == null) {
      return null;
    }
    List<ExerciseDatabase.Exercise> candidatos = new ArrayList<>();
    for (List<ExerciseDatabase.Exercise> lista : base.values()) {
      for (ExerciseDatabase.Exercise exercicio : lista) {
        if (!exercicio.ativo || usados.contains(exercicio.id) || !padrao.equals(exercicio.padrao)) {
          continue;
        }
        if (exercicio.fundamento == 0 || exercicio.dificuldade > (experiencia >= 3 ? 3 : 2)) {
          continue;
        }
        candidatos.add(exercicio);
      }
    }
    if (candidatos.isEmpty()) {
      return null;
    }
    candidatos.sort(
        Comparator.comparingInt((ExerciseDatabase.Exercise item) -> -item.fundamento)
            .thenComparingInt(item -> item.dificuldade)
            .thenComparing(item -> item.id));
    int melhor = candidatos.get(0).fundamento;
    candidatos.removeIf(item -> item.fundamento < melhor);
    return candidatos.get(Math.floorMod(seed, candidatos.size()));
  }

  public static String modoObjetivo(List<String> objetivos) {
    if (objetivos == null || objetivos.isEmpty()) {
      return "hipertrofia";
    }
    String texto = String.join(" ", objetivos).toLowerCase(Locale.ROOT);
    if (texto.contains("forca") || texto.contains("força") || texto.contains("strength")) {
      return "forca";
    }
    if (texto.contains("resist")) {
      return "resistencia";
    }
    return "hipertrofia";
  }

  public static String rotuloModo(String modo) {
    if ("forca".equals(modo)) {
      return "Força";
    }
    if ("resistencia".equals(modo)) {
      return "Resistência muscular";
    }
    return "Hipertrofia";
  }

  public static int nivelRank(String nivel) {
    if ("avancado".equals(nivel)) {
      return 3;
    }
    if ("intermediario".equals(nivel)) {
      return 2;
    }
    return 1;
  }

  static int segundos(List<Map<String, Object>> exercicios, int aquecimento) {
    int total = aquecimento;
    for (Map<String, Object> exercicio : exercicios) {
      total += SessionPlanner.segundosExercicio(exercicio);
    }
    return total;
  }

  public static int estimarSegundos(List<Map<String, Object>> exercicios, double tempo) {
    return SessionPlanner.segundosTotais(exercicios, tempo);
  }

  public static Metadata gerarMetadados(String grupamento, String letraTreino) {
    Metadata base = METADATA.get(grupamento);
    if (base == null) {
      base = new Metadata("Treino", "Hipertrofia muscular");
    }
    if (letraTreino != null
        && LETTER.matcher(letraTreino).matches()
        && TITLE_LETTER.matcher(base.titulo).find()) {
      return new Metadata(
          TITLE_LETTER.matcher(base.titulo).replaceFirst("Treino " + letraTreino), base.objetivo);
    }
    return base;
  }

  public static Map<String, String> letrasDaDivisao(String tipoDivisao) {
    Map<String, String> letras = new LinkedHashMap<>();
    if ("ABC".equals(tipoDivisao)) {
      letras.put("A", "PEITO_TRICEPS");
      letras.put("B", "COSTAS_BICEPS");
      letras.put("C", "PERNAS_OMBROS");
    } else if ("ABCD".equals(tipoDivisao)) {
      letras.put("A", "PEITO_TRICEPS");
      letras.put("B", "COSTAS_BICEPS");
      letras.put("C", "PERNAS");
      letras.put("D", "OMBROS_BRACOS");
    }
    return letras;
  }

  public static Map<String, Object> ciclo(
      String tipoDivisao,
      String letraAtual,
      List<Map<String, Object>> itensAtuais,
      double tempo,
      String nivel,
      List<String> objetivos,
      int seed) {
    Map<String, String> letras = letrasDaDivisao(tipoDivisao);
    if (letras.isEmpty()) {
      return null;
    }
    List<String> musculos =
        Arrays.asList(
            "peitoral", "dorsal", "costas_medias", "deltoide_anterior", "deltoide_lateral",
            "deltoide_posterior", "triceps", "biceps", "braquial", "quadriceps", "isquiotibiais",
            "gluteos", "panturrilhas", "core");
    List<Map<String, Object>> sessoes = new ArrayList<>();
    Map<String, Double> totais = new LinkedHashMap<>();
    for (Map.Entry<String, String> entrada : letras.entrySet()) {
      List<Map<String, Object>> itens =
          entrada.getKey().equals(letraAtual) && itensAtuais != null
              ? itensAtuais
              : montar(entrada.getValue(), tempo, nivel, objetivos, seed).exercicios;
      Map<String, Double> diretas = CoberturaMuscular.seriesDiretasPorMusculo(itens);
      Map<String, Object> porMusculo = new LinkedHashMap<>();
      for (String musculo : musculos) {
        double valor = diretas.getOrDefault(musculo, 0.0);
        porMusculo.put(musculo, CoberturaMuscular.arredondar(valor));
        totais.merge(musculo, valor, Double::sum);
      }
      Map<String, Object> sessao = new LinkedHashMap<>();
      sessao.put("letra", entrada.getKey());
      sessao.put("titulo", gerarMetadados(entrada.getValue(), entrada.getKey()).titulo);
      sessao.put("atual", entrada.getKey().equals(letraAtual));
      sessao.put("seriesDiretas", porMusculo);
      sessoes.add(sessao);
    }
    List<Map<String, Object>> linhas = new ArrayList<>();
    for (String musculo : musculos) {
      Map<String, Object> linha = new LinkedHashMap<>();
      linha.put("codigo", musculo);
      linha.put("rotulo", ExerciseAnatomy.rotuloMusculo(musculo));
      linha.put("total", CoberturaMuscular.arredondar(totais.getOrDefault(musculo, 0.0)));
      linhas.add(linha);
    }
    Map<String, Object> resultado = new LinkedHashMap<>();
    resultado.put("tipoDivisao", tipoDivisao);
    resultado.put("sessoes", sessoes);
    resultado.put("musculos", linhas);
    resultado.put(
        "observacao",
        "Séries diretas programadas em uma passagem completa pelas letras, com a mesma duração desta sessão. A frequência semanal depende de quantas vezes o ciclo é repetido.");
    return resultado;
  }

  public static Resolved resolveGrupamentoGeracao(Map<String, Object> body) {
    Object grupamentoLegado = body.get("grupamento");
    Object tipoDivisao = body.get("tipoDivisao");
    Object letraTreino = body.get("letraTreino");
    String letra = letraTreino instanceof String ? (String) letraTreino : null;

    if ("FULL_BODY".equals(tipoDivisao)) {
      return new Resolved("FULL_BODY", null, null);
    }

    if ("ABC".equals(tipoDivisao) || "ABCD".equals(tipoDivisao)) {
      String g = letra == null ? null : letrasDaDivisao((String) tipoDivisao).get(letra);
      if (g == null) {
        return new Resolved(
            null,
            null,
            "ABC".equals(tipoDivisao)
                ? "Para divisão ABC, informe letraTreino: A, B ou C"
                : "Para divisão ABCD, informe letraTreino: A, B, C ou D");
      }
      return new Resolved(g, letra, null);
    }

    if (Js.truthy(tipoDivisao)) {
      return new Resolved(null, null, "Divisão inválida. Use ABC, ABCD ou FULL_BODY");
    }

    if (Js.truthy(grupamentoLegado)) {
      return new Resolved(
          grupamentoLegado instanceof String ? (String) grupamentoLegado : "\u0000invalid", null, null);
    }

    return new Resolved(
        null,
        null,
        "Informe tipoDivisao (ABC, ABCD ou FULL_BODY) e letraTreino quando aplicável, ou grupamento (modo legado)");
  }
}
