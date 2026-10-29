package com.healgym.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class CoberturaMuscular {

  public static final String CRITERIO =
      "Séries diretas: séries de exercícios em que o músculo é o principal. Estímulo indireto: cada série conta 0,5 para os músculos secundários. Os números descrevem esta sessão, não a semana.";

  static final class Foco {
    final String nome;
    final List<String> musculos;
    final List<String> regioes;

    Foco(String nome, List<String> musculos, List<String> regioes) {
      this.nome = nome;
      this.musculos = musculos;
      this.regioes = regioes;
    }
  }

  private static final Foco PEITORAL =
      new Foco("Peitoral", Arrays.asList("peitoral"),
          Arrays.asList("peitoral_clavicular", "peitoral_esternocostal", "peitoral_inferior"));
  private static final Foco TRICEPS =
      new Foco("Tríceps", Arrays.asList("triceps"), Arrays.asList("triceps_neutro", "triceps_alongado"));
  private static final Foco COSTAS =
      new Foco("Costas", Arrays.asList("dorsal", "costas_medias"),
          Arrays.asList("dorsal_vertical", "costas_horizontal"));
  private static final Foco BICEPS =
      new Foco("Bíceps e antebraço", Arrays.asList("biceps", "braquial"),
          Arrays.asList("biceps_supinado", "braquial_neutro"));
  private static final Foco OMBROS =
      new Foco("Ombros", Arrays.asList("deltoide_anterior", "deltoide_lateral", "deltoide_posterior"),
          Collections.emptyList());
  private static final Foco PERNAS =
      new Foco("Pernas", Arrays.asList("quadriceps", "isquiotibiais", "gluteos", "panturrilhas"),
          Arrays.asList("isquio_quadril", "isquio_joelho", "gastrocnemio", "soleo"));
  private static final Foco CORE =
      new Foco("Core", Arrays.asList("core"),
          Arrays.asList("core_antiextensao", "core_lateral", "core_antirrotacao", "core_flexao", "core_lombopelvico"));

  private CoberturaMuscular() {}

  static List<Foco> focos(String grupamento) {
    switch (String.valueOf(grupamento)) {
      case "PEITO_TRICEPS":
        return Arrays.asList(PEITORAL, TRICEPS);
      case "COSTAS_BICEPS":
        return Arrays.asList(COSTAS, BICEPS);
      case "PERNAS_OMBROS":
        return Arrays.asList(PERNAS, OMBROS);
      case "PERNAS":
        return Arrays.asList(PERNAS);
      case "OMBROS_BRACOS":
        return Arrays.asList(OMBROS, TRICEPS, BICEPS);
      case "FULL_BODY":
        return Arrays.asList(PERNAS, PEITORAL, COSTAS, OMBROS, TRICEPS, BICEPS, CORE);
      default:
        return Arrays.asList(PEITORAL, COSTAS, OMBROS, PERNAS, TRICEPS, BICEPS, CORE);
    }
  }

  @SuppressWarnings("unchecked")
  static List<String> lista(Object valor) {
    if (!(valor instanceof List)) {
      return Collections.emptyList();
    }
    List<String> resultado = new ArrayList<>();
    for (Object item : (List<Object>) valor) {
      if (item != null) {
        resultado.add(String.valueOf(item));
      }
    }
    return resultado;
  }

  static final class Dados {
    String principal;
    List<String> secundarios = Collections.emptyList();
    List<String> regioes = Collections.emptyList();
    List<String> regioesSecundarias = Collections.emptyList();
    String padrao;
    int series;
    String nome;
    boolean core;
  }

  static Dados dados(Map<String, Object> item) {
    Dados dados = new Dados();
    dados.nome = String.valueOf(item.get("nome"));
    dados.series = SessionPlanner.numero(item.get("series"));
    Object codigo = item.get("musculoPrincipalCodigo");
    if (codigo instanceof String) {
      dados.principal = (String) codigo;
      dados.secundarios = lista(item.get("secundariosCodigos"));
      dados.regioes = lista(item.get("regioes"));
      dados.regioesSecundarias = lista(item.get("regioesSecundarias"));
      dados.padrao = (String) item.get("padrao");
    } else {
      ExerciseDatabase.Exercise exercicio = ExerciseDatabase.porId(String.valueOf(item.get("exercicioId")));
      if (exercicio == null) {
        exercicio = porNome(dados.nome);
      }
      if (exercicio != null) {
        dados.principal = exercicio.principal;
        dados.secundarios = exercicio.secundarios;
        dados.regioes = exercicio.regioes;
        dados.regioesSecundarias = exercicio.regioesSecundarias;
        dados.padrao = exercicio.padrao;
      }
    }
    dados.core = "core".equals(dados.principal);
    return dados;
  }

  static ExerciseDatabase.Exercise porNome(String nome) {
    for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.todos()) {
      if (exercicio.nome.equalsIgnoreCase(nome)) {
        return exercicio;
      }
    }
    return null;
  }

  public static Map<String, Object> calcular(String grupamento, List<Map<String, Object>> itens) {
    Map<String, Double> diretas = new LinkedHashMap<>();
    Map<String, Double> indiretas = new LinkedHashMap<>();
    Map<String, List<String>> regiaoDireta = new LinkedHashMap<>();
    Map<String, List<String>> regiaoIndireta = new LinkedHashMap<>();
    Map<String, Integer> regiaoSeries = new LinkedHashMap<>();
    Map<String, List<String>> padroes = new LinkedHashMap<>();
    int totalSeries = 0;
    for (Map<String, Object> item : itens) {
      Dados dados = dados(item);
      totalSeries += dados.series;
      if (dados.principal != null) {
        diretas.merge(dados.principal, (double) dados.series, Double::sum);
      }
      for (String secundario : dados.secundarios) {
        indiretas.merge(secundario, dados.series * 0.5, Double::sum);
      }
      for (String regiao : dados.regioes) {
        regiaoDireta.computeIfAbsent(regiao, chave -> new ArrayList<>()).add(dados.nome);
        regiaoSeries.merge(regiao, dados.series, Integer::sum);
      }
      for (String regiao : dados.regioesSecundarias) {
        regiaoIndireta.computeIfAbsent(regiao, chave -> new ArrayList<>()).add(dados.nome);
      }
      if (dados.padrao != null) {
        padroes.computeIfAbsent(ExerciseAnatomy.rotuloPadrao(dados.padrao), chave -> new ArrayList<>()).add(dados.nome);
      }
    }

    List<Map<String, Object>> secoes = new ArrayList<>();
    Set<String> cobertos = new LinkedHashSet<>();
    for (Foco foco : focos(grupamento)) {
      List<Map<String, Object>> musculos = new ArrayList<>();
      double somaDiretas = 0;
      double somaIndiretas = 0;
      for (String musculo : foco.musculos) {
        cobertos.add(musculo);
        double d = diretas.getOrDefault(musculo, 0.0);
        double i = indiretas.getOrDefault(musculo, 0.0);
        somaDiretas += d;
        somaIndiretas += i;
        musculos.add(linhaMusculo(musculo, d, i));
      }
      List<Map<String, Object>> regioes = new ArrayList<>();
      for (String regiao : foco.regioes) {
        Map<String, Object> linha = new LinkedHashMap<>();
        linha.put("codigo", regiao);
        linha.put("rotulo", ExerciseAnatomy.REGIOES.getOrDefault(regiao, ExerciseAnatomy.humanizar(regiao)));
        if (regiaoDireta.containsKey(regiao)) {
          linha.put("status", "direta");
          linha.put("seriesDiretas", regiaoSeries.getOrDefault(regiao, 0));
          linha.put("exercicios", new ArrayList<>(new LinkedHashSet<>(regiaoDireta.get(regiao))));
        } else if (regiaoIndireta.containsKey(regiao)) {
          linha.put("status", "indireta");
          linha.put("exercicios", new ArrayList<>(new LinkedHashSet<>(regiaoIndireta.get(regiao))));
        } else {
          linha.put("status", "nao_priorizada");
          linha.put("exercicios", Collections.emptyList());
        }
        regioes.add(linha);
      }
      Map<String, Object> secao = new LinkedHashMap<>();
      secao.put("foco", foco.nome);
      secao.put("status", status(somaDiretas, somaIndiretas));
      secao.put("seriesDiretas", arredondar(somaDiretas));
      secao.put("seriesIndiretas", arredondar(somaIndiretas));
      secao.put("musculos", musculos);
      secao.put("regioes", regioes);
      secoes.add(secao);
    }

    List<Map<String, Object>> secundarios = new ArrayList<>();
    for (Map.Entry<String, Double> entrada : indiretas.entrySet()) {
      if (cobertos.contains(entrada.getKey()) || diretas.containsKey(entrada.getKey())) {
        continue;
      }
      secundarios.add(linhaMusculo(entrada.getKey(), 0, entrada.getValue()));
    }
    for (Map.Entry<String, Double> entrada : diretas.entrySet()) {
      if (!cobertos.contains(entrada.getKey())) {
        secundarios.add(linhaMusculo(entrada.getKey(), entrada.getValue(), indiretas.getOrDefault(entrada.getKey(), 0.0)));
      }
    }

    List<Map<String, Object>> listaPadroes = new ArrayList<>();
    for (Map.Entry<String, List<String>> entrada : padroes.entrySet()) {
      Map<String, Object> linha = new LinkedHashMap<>();
      linha.put("rotulo", entrada.getKey());
      linha.put("exercicios", entrada.getValue());
      listaPadroes.add(linha);
    }

    Map<String, Object> cobertura = new LinkedHashMap<>();
    cobertura.put("criterio", CRITERIO);
    cobertura.put("secoes", secoes);
    cobertura.put("outrosMusculos", secundarios);
    cobertura.put("padroes", listaPadroes);
    cobertura.put("totalSeries", totalSeries);
    cobertura.put("totalExercicios", itens.size());
    return cobertura;
  }

  private static Map<String, Object> linhaMusculo(String musculo, double diretas, double indiretas) {
    Map<String, Object> linha = new LinkedHashMap<>();
    linha.put("codigo", musculo);
    linha.put("rotulo", ExerciseAnatomy.rotuloMusculo(musculo));
    linha.put("seriesDiretas", arredondar(diretas));
    linha.put("seriesIndiretas", arredondar(indiretas));
    linha.put("status", status(diretas, indiretas));
    return linha;
  }

  static String status(double diretas, double indiretas) {
    if (diretas > 0) {
      return "direta";
    }
    if (indiretas > 0) {
      return "indireta";
    }
    return "nao_priorizada";
  }

  static Number arredondar(double valor) {
    double arredondado = Math.round(valor * 2) / 2.0;
    if (arredondado == Math.floor(arredondado)) {
      return (int) arredondado;
    }
    return arredondado;
  }

  public static Map<String, Double> seriesDiretasPorMusculo(List<Map<String, Object>> itens) {
    Map<String, Double> resultado = new LinkedHashMap<>();
    for (Map<String, Object> item : itens) {
      Dados dados = dados(item);
      if (dados.principal != null) {
        resultado.merge(dados.principal, (double) dados.series, Double::sum);
      }
    }
    return resultado;
  }

  public static String resumo(String grupamento, List<Map<String, Object>> itens) {
    Map<String, Object> cobertura = calcular(grupamento, itens);
    StringBuilder texto = new StringBuilder();
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> secoes = (List<Map<String, Object>>) cobertura.get("secoes");
    for (Map<String, Object> secao : secoes) {
      if (texto.length() > 0) {
        texto.append(" · ");
      }
      texto.append(secao.get("foco")).append(": ").append(secao.get("seriesDiretas")).append(" séries diretas");
    }
    return texto.toString();
  }
}
