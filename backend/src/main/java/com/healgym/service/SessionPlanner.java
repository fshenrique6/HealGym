package com.healgym.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.bson.types.ObjectId;

public final class SessionPlanner {

  public static final List<String> GRUPAMENTOS =
      Arrays.asList(
          "PEITO_TRICEPS", "COSTAS_BICEPS", "PERNAS_OMBROS", "PERNAS", "OMBROS_BRACOS", "FULL_BODY");

  private static final int SEGUNDOS_APROXIMACAO = 70;
  private static final Set<String> GRANDES =
      new LinkedHashSet<>(
          Arrays.asList("peitoral", "costas", "quadriceps", "isquiotibiais", "gluteos"));

  static final class Slot {
    final String grupo;
    final String padrao;
    final String regiao;
    final int bloco;
    final int ordem;
    final boolean obrigatorio;
    final String volume;
    final boolean variarEquipamento;

    Slot(
        String grupo,
        String padrao,
        String regiao,
        int bloco,
        int ordem,
        boolean obrigatorio,
        String volume,
        boolean variarEquipamento) {
      this.grupo = grupo;
      this.padrao = padrao;
      this.regiao = regiao;
      this.bloco = bloco;
      this.ordem = ordem;
      this.obrigatorio = obrigatorio;
      this.volume = volume;
      this.variarEquipamento = variarEquipamento;
    }
  }

  static final class Estrutura {
    final List<String> blocos;
    final List<Slot> slots = new ArrayList<>();

    Estrutura(String... blocos) {
      this.blocos = Arrays.asList(blocos);
    }

    Estrutura add(String grupo, String padrao, int bloco, int ordem, boolean obrigatorio) {
      slots.add(new Slot(grupo, padrao, null, bloco, ordem, obrigatorio, "normal", false));
      return this;
    }

    Estrutura add(
        String grupo,
        String padrao,
        String regiao,
        int bloco,
        int ordem,
        boolean obrigatorio,
        String volume,
        boolean variar) {
      slots.add(new Slot(grupo, padrao, regiao, bloco, ordem, obrigatorio, volume, variar));
      return this;
    }
  }

  public static final class Plano {
    public final List<Map<String, Object>> exercicios;
    public final int segundos;
    public final List<String> observacoes;
    public final List<String> problemas;

    Plano(
        List<Map<String, Object>> exercicios,
        int segundos,
        List<String> observacoes,
        List<String> problemas) {
      this.exercicios = exercicios;
      this.segundos = segundos;
      this.observacoes = observacoes;
      this.problemas = problemas;
    }

    public int minutos() {
      return Math.max(1, (int) Math.round(segundos / 60.0));
    }
  }

  private SessionPlanner() {}

  public static boolean suporta(String grupamento) {
    return GRUPAMENTOS.contains(grupamento);
  }

  static Estrutura estrutura(String grupamento, double tempo, int variante) {
    switch (grupamento) {
      case "PEITO_TRICEPS": {
        Estrutura e = new Estrutura("Peito", "Tríceps", "Core");
        e.add("PEITO", "supino_horizontal", 0, 0, true);
        e.add("PEITO", "supino_inclinado", null, 0, 1, true, "normal", true);
        e.add("TRICEPS", "triceps_pushdown", 1, 0, true);
        e.add("PEITO", "aducao_horizontal", "peitoral_esternocostal", 0, 2, false, "normal", false);
        if (tempo >= 45) e.add("TRICEPS", "triceps_overhead", 1, 1, false);
        if (tempo >= 60) e.add("PEITO", "*inferior", "peitoral_inferior", 0, 3, false, "normal", false);
        if (tempo >= 75) e.add("CORE", "core", null, 2, 0, false, "baixo", false);
        return e;
      }
      case "COSTAS_BICEPS": {
        Estrutura e = new Estrutura("Costas", "Bíceps", "Core");
        e.add("COSTAS", "puxada_vertical", 0, 0, true);
        e.add("COSTAS", "remada", 0, 1, true);
        e.add("BICEPS", "rosca", 1, 0, true);
        e.add("OMBROS", "deltoide_posterior", 0, 3, false);
        if (tempo >= 45) e.add("BICEPS", "rosca_neutra", 1, 1, false);
        if (tempo >= 60) e.add("COSTAS", "remada", null, 0, 2, false, "normal", true);
        if (tempo >= 75) e.add("CORE", "core", null, 2, 0, false, "baixo", false);
        return e;
      }
      case "PERNAS_OMBROS": {
        Estrutura e = new Estrutura("Pernas", "Ombros");
        e.add("PERNAS", "agachamento", 0, 0, true);
        e.add("PERNAS", "dobradica", 0, 3, true);
        e.add("OMBROS", "elevacao_lateral", 1, 1, true);
        e.add("PERNAS", "panturrilha", 0, 5, false);
        if (tempo >= 45) e.add("OMBROS", "deltoide_posterior", 1, 2, false);
        if (tempo >= 55) e.add("PERNAS", "flexao_joelho", 0, 4, false);
        if (tempo >= 60) e.add("PERNAS", "agachamento", null, 0, 1, false, "normal", true);
        if (tempo >= 75) e.add("OMBROS", "desenvolvimento", 1, 0, false);
        if (tempo >= 90) e.add("PERNAS", "extensao_joelho", null, 0, 2, false, "baixo", false);
        return e;
      }
      case "PERNAS": {
        Estrutura e = new Estrutura("Pernas", "Core");
        e.add("PERNAS", "agachamento", 0, 0, true);
        e.add("PERNAS", "dobradica", 0, 3, true);
        e.add("PERNAS", "flexao_joelho", 0, 4, false);
        e.add("PERNAS", "panturrilha", 0, 6, false);
        if (tempo >= 45) e.add("PERNAS", "agachamento", null, 0, 1, false, "normal", true);
        if (tempo >= 45) e.add("PERNAS", "extensao_joelho", 0, 2, false);
        if (tempo >= 60) e.add("PERNAS", "gluteo", 0, 5, false);
        if (tempo >= 75) e.add("CORE", "core", null, 1, 0, false, "baixo", false);
        return e;
      }
      case "OMBROS_BRACOS": {
        Estrutura e = new Estrutura("Ombros", "Tríceps", "Bíceps");
        e.add("OMBROS", "elevacao_lateral", 0, 1, true);
        e.add("OMBROS", "deltoide_posterior", 0, 2, true);
        e.add("TRICEPS", "triceps_pushdown", null, 1, 0, true, "baixo", false);
        e.add("BICEPS", "rosca", null, 2, 0, true, "baixo", false);
        if (tempo >= 45) e.add("OMBROS", "desenvolvimento", 0, 0, false);
        if (tempo >= 45) e.add("TRICEPS", "triceps_overhead", null, 1, 1, false, "baixo", false);
        if (tempo >= 45) e.add("BICEPS", "rosca_neutra", null, 2, 1, false, "baixo", false);
        return e;
      }
      case "FULL_BODY": {
        Estrutura e = new Estrutura("Movimentos principais", "Complementos");
        e.add("PERNAS", "agachamento", 0, 0, true);
        e.add("PEITO", variante == 1 ? "supino_inclinado" : "supino_horizontal", 0, 1, true);
        e.add("COSTAS", variante == 1 ? "puxada_vertical" : "remada", 0, 2, true);
        e.add("PERNAS", "dobradica", 0, 3, true);
        if (tempo >= 45) e.add("COSTAS", variante == 1 ? "remada" : "puxada_vertical", 1, 0, false);
        if (tempo >= 60) e.add("CORE", "core", null, 1, 5, false, "baixo", false);
        if (tempo >= 55) e.add("OMBROS", variante == 1 ? "deltoide_posterior" : "elevacao_lateral", 1, 1, false);
        if (tempo >= 60) e.add("PERNAS", "panturrilha", null, 1, 4, false, "baixo", false);
        if (tempo >= 75) e.add("PERNAS", variante == 1 ? "extensao_joelho" : "flexao_joelho", 1, 2, false);
        if (tempo >= 90) e.add("TRICEPS", "triceps_pushdown", null, 1, 3, false, "baixo", false);
        if (tempo >= 90) e.add("BICEPS", "rosca", null, 1, 3, false, "baixo", false);
        return e;
      }
      default:
        return new Estrutura("Exercícios");
    }
  }

  public static Plano planejar(
      String grupamento, double tempo, int experiencia, String modo, int seed, int variante) {
    Set<String> evitar = new LinkedHashSet<>();
    if ("FULL_BODY".equals(grupamento) && variante == 1) {
      for (Map<String, Object> item : planejar(grupamento, tempo, experiencia, modo, seed, 0).exercicios) {
        evitar.add(String.valueOf(item.get("exercicioId")));
      }
    }
    Estrutura estrutura = estrutura(grupamento, tempo, variante);
    int orcamento = (int) Math.floor(tempo * 60.0);
    int alvo = (int) Math.round(Math.min(tempo, 90) * 0.87 * 60.0);
    int teto = tetoExercicios(tempo);
    List<Map<String, Object>> itens = new ArrayList<>();
    List<String> observacoes = new ArrayList<>();

    int indice = 0;
    for (Slot slot : estrutura.slots) {
      indice++;
      if (!slot.obrigatorio) {
        continue;
      }
      Map<String, Object> item = criar(slot, estrutura, experiencia, modo, seed + indice * 7, itens, evitar, grupamento);
      if (item != null) {
        itens.add(item);
      }
    }

    ajustarAoOrcamento(itens, tempo, orcamento, observacoes);

    indice = 0;
    for (Slot slot : estrutura.slots) {
      indice++;
      if (slot.obrigatorio) {
        continue;
      }
      if (segundosTotais(itens, tempo) >= alvo || itens.size() >= teto) {
        break;
      }
      Map<String, Object> item = criar(slot, estrutura, experiencia, modo, seed + indice * 7, itens, evitar, grupamento);
      if (item == null) {
        continue;
      }
      int livre = limiteSeries(item, itens, experiencia, grupamento);
      if (livre < 2) {
        continue;
      }
      if (series(item) > livre) {
        item.put("series", livre);
      }
      int base = segundosTotais(itens, tempo);
      while (series(item) > 2 && base + segundosExercicio(item) > orcamento) {
        item.put("series", series(item) - 1);
      }
      if (base + segundosExercicio(item) > orcamento) {
        continue;
      }
      itens.add(item);
    }

    boolean mudou = true;
    while (mudou && segundosTotais(itens, tempo) < alvo) {
      mudou = false;
      for (Map<String, Object> item : itens) {
        if (segundosTotais(itens, tempo) >= alvo) {
          break;
        }
        if (series(item) >= maximoSeries(item, experiencia)) {
          continue;
        }
        if (limiteSeries(item, itens, experiencia, grupamento) < series(item) + 1) {
          continue;
        }
        if (segundosTotais(itens, tempo) + custoSerie(item) > orcamento) {
          continue;
        }
        item.put("series", series(item) + 1);
        mudou = true;
      }
    }

    itens.sort(
        Comparator.comparingInt((Map<String, Object> item) -> numero(item.get("blocoOrdem")))
            .thenComparingInt(item -> numero(item.get("ordem"))));
    int posicao = 1;
    for (Map<String, Object> item : itens) {
      item.put("posicao", posicao++);
    }

    int total = segundosTotais(itens, tempo);
    if (tempo <= 90 && total < alvo) {
      observacoes.add(
          "A estimativa ficou abaixo da faixa planejada para "
              + (int) Math.round(tempo)
              + " min porque o volume desta sessão já atingiu o limite definido para o nível informado. O descanso não foi encurtado e não foram acrescentados exercícios repetidos para preencher o tempo.");
    }
    if (tempo > 90) {
      observacoes.add(
          "Em sessões longas, o limite é um volume recuperável, não ocupar todos os minutos escolhidos.");
    }
    List<String> problemas = validar(grupamento, itens, tempo, experiencia);
    return new Plano(itens, total, observacoes, problemas);
  }

  private static int tetoExercicios(double tempo) {
    if (tempo <= 30) {
      return 5;
    }
    if (tempo <= 45) {
      return 6;
    }
    if (tempo <= 60) {
      return 7;
    }
    return 8;
  }

  private static Map<String, Object> criar(
      Slot slot,
      Estrutura estrutura,
      int experiencia,
      String modo,
      int seed,
      List<Map<String, Object>> itens,
      Set<String> evitar,
      String grupamento) {
    ExerciseDatabase.Exercise exercicio = escolher(slot, experiencia, seed, itens, evitar);
    if (exercicio == null) {
      return null;
    }
    boolean principal =
        exercicio.composto
            && (slot.obrigatorio || slot.ordem == 0)
            && !temCompostoDoMusculo(itens, exercicio.principal);
    Map<String, Object> item = prescrever(exercicio, experiencia, modo, principal, slot.volume, grupamento);
    for (Map<String, Object> anterior : itens) {
      if (numero(anterior.get("seriesAproximacao")) > 1 && numero(item.get("seriesAproximacao")) > 1) {
        item.put("seriesAproximacao", 1);
      }
    }
    item.put("bloco", estrutura.blocos.get(Math.min(slot.bloco, estrutura.blocos.size() - 1)));
    item.put("blocoOrdem", slot.bloco);
    item.put("ordem", slot.ordem);
    item.put("obrigatorio", slot.obrigatorio);
    return item;
  }

  private static boolean temCompostoDoMusculo(List<Map<String, Object>> itens, String musculo) {
    String alvo = bucket(musculo);
    for (Map<String, Object> item : itens) {
      if (Boolean.TRUE.equals(item.get("composto"))
          && alvo != null
          && alvo.equals(bucket((String) item.get("musculoPrincipalCodigo")))) {
        return true;
      }
    }
    return false;
  }

  static ExerciseDatabase.Exercise escolher(
      Slot slot, int experiencia, int seed, List<Map<String, Object>> itens, Set<String> evitar) {
    Map<String, List<ExerciseDatabase.Exercise>> base = ExerciseDatabase.DATABASE.get(slot.grupo);
    if (base == null) {
      return null;
    }
    Set<String> usadosId = new LinkedHashSet<>();
    Set<String> usadosNome = new LinkedHashSet<>();
    for (Map<String, Object> item : itens) {
      usadosId.add(String.valueOf(item.get("exercicioId")));
      usadosNome.add(String.valueOf(item.get("nome")).toLowerCase(Locale.ROOT));
    }
    boolean inferior = "*inferior".equals(slot.padrao);
    List<ExerciseDatabase.Exercise> candidatos = new ArrayList<>();
    for (List<ExerciseDatabase.Exercise> lista : base.values()) {
      for (ExerciseDatabase.Exercise exercicio : lista) {
        if (!exercicio.ativo
            || usadosId.contains(exercicio.id)
            || usadosNome.contains(exercicio.nome.toLowerCase(Locale.ROOT))) {
          continue;
        }
        if (inferior) {
          if (!exercicio.regioes.contains("peitoral_inferior")) {
            continue;
          }
        } else {
          if (!slot.padrao.equals(exercicio.padrao)) {
            continue;
          }
          if (slot.regiao != null && !exercicio.regioes.contains(slot.regiao)) {
            continue;
          }
        }
        if (exercicio.dificuldade > (experiencia >= 3 ? 3 : 2)) {
          continue;
        }
        if ("agachamento".equals(slot.padrao) && exercicio.unilateral) {
          continue;
        }
        candidatos.add(exercicio);
      }
    }
    if (candidatos.isEmpty()) {
      return null;
    }
    if (candidatos.stream().anyMatch(item -> item.fundamento > 0)) {
      candidatos.removeIf(item -> item.fundamento == 0);
    }
    if (experiencia <= 1 && candidatos.stream().anyMatch(item -> item.dificuldade <= 1)) {
      candidatos.removeIf(item -> item.dificuldade > 1);
    }
    if (prefereComposto(slot.padrao) && candidatos.stream().anyMatch(item -> item.composto)) {
      candidatos.removeIf(item -> !item.composto);
    }
    double desejada = experiencia <= 1 ? 1.0 : experiencia == 2 ? 1.5 : 2.0;
    double melhor = -Double.MAX_VALUE;
    List<ExerciseDatabase.Exercise> finais = new ArrayList<>();
    for (ExerciseDatabase.Exercise exercicio : candidatos) {
      double nota = exercicio.fundamento * 10 - Math.abs(exercicio.dificuldade - desejada) * 3;
      String tipo = tipoEquipamento(exercicio.equipamento);
      if (exercicio.composto && slot.obrigatorio && experiencia >= 2 && "barra".equals(tipo)) {
        nota += 1;
      }
      if (exercicio.composto && experiencia <= 1 && ("maquina".equals(tipo) || "polia".equals(tipo))) {
        nota += 2;
      }
      if (exercicio.composto && (!slot.obrigatorio || !evitar.isEmpty()) && "maquina".equals(tipo)) {
        nota += 1;
      }
      if (slot.variarEquipamento) {
        for (Map<String, Object> item : itens) {
          if (numero(item.get("blocoOrdem")) == slot.bloco
              && tipo.equals(tipoEquipamento(equipamentos(item)))) {
            nota -= 6;
          }
        }
      }
      if (evitar.contains(exercicio.id)) {
        nota -= 15;
      }
      if (nota > melhor + 1e-9) {
        melhor = nota;
        finais.clear();
        finais.add(exercicio);
      } else if (Math.abs(nota - melhor) <= 1e-9) {
        finais.add(exercicio);
      }
    }
    finais.sort(Comparator.comparing(item -> item.id));
    return finais.get(Math.floorMod(seed, finais.size()));
  }

  private static boolean prefereComposto(String padrao) {
    return padrao.startsWith("supino")
        || "agachamento".equals(padrao)
        || "remada".equals(padrao)
        || "puxada_vertical".equals(padrao)
        || "desenvolvimento".equals(padrao)
        || "dobradica".equals(padrao);
  }

  @SuppressWarnings("unchecked")
  private static List<String> equipamentos(Map<String, Object> item) {
    Object valor = item.get("equipamento");
    if (valor instanceof List) {
      List<String> lista = new ArrayList<>();
      for (Object entrada : (List<Object>) valor) {
        lista.add(String.valueOf(entrada));
      }
      return lista;
    }
    return Collections.emptyList();
  }

  static String tipoEquipamento(List<String> equipamento) {
    if (equipamento.contains("maquina")) {
      return "maquina";
    }
    for (String item : equipamento) {
      if (item.startsWith("polia")) {
        return "polia";
      }
    }
    if (equipamento.contains("barra")) {
      return "barra";
    }
    if (equipamento.contains("halteres")) {
      return "halteres";
    }
    return "corpo";
  }

  public static Map<String, Object> prescrever(
      ExerciseDatabase.Exercise exercicio,
      int experiencia,
      String modo,
      boolean principal,
      String volume,
      String grupamento) {
    boolean core = "core".equals(exercicio.padrao);
    boolean baixo = "baixo".equals(volume);
    int series;
    if (core || baixo) {
      series = 2;
    } else if (exercicio.composto) {
      series = 3;
    } else {
      series = experiencia <= 1 ? 2 : 3;
    }
    String repeticoes;
    int descanso;
    String rir;
    if (core) {
      repeticoes = repeticoesCore(exercicio.nome);
      descanso = 45;
      rir = null;
    } else if (exercicio.composto) {
      boolean forca = "forca".equals(modo) && experiencia >= 2;
      if (forca && principal) {
        repeticoes = "4-6";
        descanso = 150;
        rir = "2-3";
      } else if (forca) {
        repeticoes = "6-8";
        descanso = 120;
        rir = "1-3";
      } else if ("resistencia".equals(modo)) {
        repeticoes = "12-15";
        descanso = 90;
        rir = "1-3";
      } else if (principal) {
        repeticoes = experiencia <= 1 ? "8-12" : "6-10";
        descanso = experiencia <= 1 ? 90 : 120;
        rir = experiencia <= 1 ? "2-3" : "1-3";
      } else {
        repeticoes = "8-12";
        descanso = 90;
        rir = experiencia <= 1 ? "2-3" : "1-3";
      }
    } else {
      if ("resistencia".equals(modo)) {
        repeticoes = "15-20";
      } else if ("elevacao_lateral".equals(exercicio.padrao)
          || "deltoide_posterior".equals(exercicio.padrao)
          || "panturrilha".equals(exercicio.padrao)) {
        repeticoes = "12-15";
      } else {
        repeticoes = "10-12";
      }
      boolean pernas =
          "extensao_joelho".equals(exercicio.padrao)
              || "flexao_joelho".equals(exercicio.padrao)
              || "gluteo".equals(exercicio.padrao);
      descanso = pernas && experiencia >= 2 ? 75 : 60;
      rir = experiencia <= 1 ? "2-3" : "1-2";
    }
    int aproximacao = 0;
    if (exercicio.composto && principal) {
      aproximacao = experiencia <= 1 ? 1 : 2;
    } else if (exercicio.composto && "barra".equals(tipoEquipamento(exercicio.equipamento))) {
      aproximacao = 1;
    }

    Map<String, Object> item = new LinkedHashMap<>();
    item.put("uid", new ObjectId().toHexString());
    item.put("exercicioId", exercicio.id);
    item.put("nome", exercicio.nome);
    item.put("grupo", exercicio.grupo);
    item.put("padrao", exercicio.padrao);
    item.put("padraoRotulo", ExerciseAnatomy.rotuloPadrao(exercicio.padrao));
    item.put("porcaoMuscular", porcao(exercicio));
    item.put("papel", principal ? "principal" : exercicio.composto ? "composto" : core ? "core" : "complementar");
    item.put("volume", volume);
    item.put("series", series);
    item.put("repeticoes", repeticoes);
    item.put("descanso", descanso + "s");
    item.put("descansoSegundos", descanso);
    item.put("seriesAproximacao", aproximacao);
    if (rir != null) {
      item.put("rirAlvo", rir);
    }
    item.put("tecnica", exercicio.tecnica);
    if (exercicio.cuidado != null) {
      item.put("cuidado", exercicio.cuidado);
    }
    if (exercicio.erroComum != null) {
      item.put("erroComum", exercicio.erroComum);
    }
    item.put("equipamento", new ArrayList<>(exercicio.equipamento));
    item.put("equipamentoRotulo", ExerciseAnatomy.rotuloEquipamentos(exercicio.equipamento));
    item.put("tipoCarga", exercicio.tipoCarga);
    item.put("tipoCargaRotulo", rotuloCarga(exercicio));
    item.put("composto", exercicio.composto);
    item.put("unilateral", exercicio.unilateral);
    item.put("complexidade", exercicio.dificuldade);
    if (exercicio.principal != null) {
      item.put("musculoPrincipalCodigo", exercicio.principal);
      item.put("musculoPrincipal", ExerciseAnatomy.rotuloMusculo(exercicio.principal));
    }
    item.put("secundariosCodigos", new ArrayList<>(exercicio.secundarios));
    if (!exercicio.secundarios.isEmpty()) {
      List<String> rotulos = new ArrayList<>();
      for (String codigo : exercicio.secundarios) {
        rotulos.add(ExerciseAnatomy.rotuloMusculo(codigo));
      }
      item.put("musculosSecundarios", String.join(", ", rotulos));
    }
    item.put("regioes", new ArrayList<>(exercicio.regioes));
    item.put("regioesSecundarias", new ArrayList<>(exercicio.regioesSecundarias));
    if (exercicio.enfase != null) {
      item.put("enfase", exercicio.enfase);
    }
    item.put("videoUrl", exercicio.videoUrl);
    item.put("videoThumbnailUrl", exercicio.videoThumbnailUrl);
    item.put("videoFonte", exercicio.videoFonte);
    item.put("videoAutor", exercicio.videoAutor);
    item.put("videoLicenca", exercicio.videoLicenca);
    item.put("videoStatus", exercicio.videoStatus);
    return item;
  }

  private static String rotuloCarga(ExerciseDatabase.Exercise exercicio) {
    String rotulo = ExerciseAnatomy.CARGAS.get(exercicio.tipoCarga);
    if (rotulo == null) {
      return null;
    }
    if (exercicio.unilateral && !"peso_corporal".equals(exercicio.tipoCarga)) {
      return rotulo + ", cada lado";
    }
    return rotulo;
  }

  private static String porcao(ExerciseDatabase.Exercise exercicio) {
    String musculo = exercicio.principal == null ? null : ExerciseAnatomy.rotuloMusculo(exercicio.principal);
    if (musculo == null) {
      return ExerciseAnatomy.rotuloPadrao(exercicio.padrao);
    }
    if (exercicio.enfase == null) {
      return musculo;
    }
    return musculo + " · " + exercicio.enfase;
  }

  private static String repeticoesCore(String nome) {
    String n = nome.toLowerCase(Locale.ROOT);
    if (n.contains("prancha lateral")) {
      return "20-30s por lado";
    }
    if (n.contains("prancha")) {
      return "20-40s";
    }
    if (n.contains("dead bug")) {
      return "8-10 por lado";
    }
    if (n.contains("pallof")) {
      return "10-12 por lado";
    }
    if (n.contains("joelhos")) {
      return "10-12";
    }
    return "12-15";
  }

  private static int series(Map<String, Object> item) {
    return numero(item.get("series"));
  }

  static int numero(Object valor) {
    return valor instanceof Number ? ((Number) valor).intValue() : 0;
  }

  private static int maximoSeries(Map<String, Object> item, int experiencia) {
    if ("baixo".equals(item.get("volume")) || "core".equals(item.get("padrao"))) {
      return 3;
    }
    if (experiencia <= 1) {
      return 3;
    }
    return "principal".equals(item.get("papel")) || Boolean.TRUE.equals(item.get("composto")) ? 4 : 3;
  }

  static String bucket(String musculo) {
    if (musculo == null) {
      return null;
    }
    if ("dorsal".equals(musculo) || "costas_medias".equals(musculo)) {
      return "costas";
    }
    if ("biceps".equals(musculo) || "braquial".equals(musculo)) {
      return "flexores_cotovelo";
    }
    return musculo;
  }

  static int capMusculo(String bucket, int experiencia, String grupamento) {
    int nivel = Math.max(0, Math.min(2, experiencia - 1));
    boolean fullBody = "FULL_BODY".equals(grupamento);
    if (GRANDES.contains(bucket)) {
      return fullBody ? new int[] {6, 8, 10}[nivel] : new int[] {10, 14, 16}[nivel];
    }
    if ("core".equals(bucket)) {
      return 3;
    }
    int pequeno = fullBody ? new int[] {3, 4, 6}[nivel] : new int[] {6, 8, 9}[nivel];
    if ("OMBROS_BRACOS".equals(grupamento)
        && ("triceps".equals(bucket) || "flexores_cotovelo".equals(bucket))) {
      return pequeno - 2;
    }
    return pequeno;
  }

  static int capSessao(int experiencia) {
    return new int[] {18, 24, 28}[Math.max(0, Math.min(2, experiencia - 1))];
  }

  private static int limiteSeries(
      Map<String, Object> candidato,
      List<Map<String, Object>> itens,
      int experiencia,
      String grupamento) {
    String alvo = bucket((String) candidato.get("musculoPrincipalCodigo"));
    int doMusculo = 0;
    int total = 0;
    for (Map<String, Object> item : itens) {
      if (item == candidato) {
        continue;
      }
      total += series(item);
      if (alvo != null && alvo.equals(bucket((String) item.get("musculoPrincipalCodigo")))) {
        doMusculo += series(item);
      }
    }
    int livre = capSessao(experiencia) - total;
    if (alvo != null) {
      livre = Math.min(livre, capMusculo(alvo, experiencia, grupamento) - doMusculo);
    }
    return livre;
  }

  private static void ajustarAoOrcamento(
      List<Map<String, Object>> itens, double tempo, int orcamento, List<String> observacoes) {
    for (int i = itens.size() - 1; i >= 0 && segundosTotais(itens, tempo) > orcamento; i--) {
      Map<String, Object> item = itens.get(i);
      while (series(item) > 2 && segundosTotais(itens, tempo) > orcamento) {
        item.put("series", series(item) - 1);
      }
    }
    while (itens.size() > 1 && segundosTotais(itens, tempo) > orcamento) {
      Map<String, Object> removido = itens.remove(itens.size() - 1);
      observacoes.add(
          removido.get("nome")
              + " não coube na duração escolhida sem encurtar os descansos e ficou fora desta sessão.");
    }
  }

  public static int aquecimentoSegundos(double tempo) {
    return tempo < 45 ? 180 : 300;
  }

  public static int segundosTotais(List<Map<String, Object>> itens, double tempo) {
    int total = aquecimentoSegundos(tempo);
    for (Map<String, Object> item : itens) {
      total += segundosExercicio(item);
    }
    return total;
  }

  public static int segundosExercicio(Map<String, Object> item) {
    int series = Math.max(1, numero(item.get("series")));
    String repeticoes = String.valueOf(item.get("repeticoes"));
    boolean tempoFixo = repeticoes.matches(".*\\d+s.*");
    double media = mediaReps(repeticoes);
    boolean composto = Boolean.TRUE.equals(item.get("composto"));
    double execucao = tempoFixo ? series * media : series * media * (composto ? 3.5 : 3.0);
    if (Boolean.TRUE.equals(item.get("unilateral"))) {
      execucao = execucao * 2 + series * 10;
    }
    int descanso = numero(item.get("descansoSegundos"));
    if (descanso <= 0) {
      descanso = extrairSegundos(String.valueOf(item.get("descanso")));
    }
    double total = execucao + (series - 1) * descanso;
    if (item.containsKey("seriesAproximacao")) {
      total += numero(item.get("seriesAproximacao")) * SEGUNDOS_APROXIMACAO;
    } else {
      total += numero(item.get("preparacaoSegundos"));
    }
    String tipo = tipoEquipamento(equipamentos(item));
    int preparo = "barra".equals(tipo) ? 45 : "maquina".equals(tipo) || "polia".equals(tipo) ? 20 : "halteres".equals(tipo) ? 15 : 0;
    total += 45 + preparo;
    return (int) Math.round(total);
  }

  private static int custoSerie(Map<String, Object> item) {
    Map<String, Object> copia = new LinkedHashMap<>(item);
    copia.put("series", series(item) + 1);
    return segundosExercicio(copia) - segundosExercicio(item);
  }

  static double mediaReps(String repeticoes) {
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d+)(?:\\s*-\\s*(\\d+))?").matcher(repeticoes);
    if (!m.find()) {
      return 10;
    }
    double a = Double.parseDouble(m.group(1));
    double b = m.group(2) == null ? a : Double.parseDouble(m.group(2));
    return (a + b) / 2.0;
  }

  static int topoReps(String repeticoes) {
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d+)(?:\\s*-\\s*(\\d+))?").matcher(String.valueOf(repeticoes));
    if (!m.find()) {
      return -1;
    }
    return Integer.parseInt(m.group(2) == null ? m.group(1) : m.group(2));
  }

  private static int extrairSegundos(String texto) {
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d+)").matcher(texto);
    return m.find() ? Integer.parseInt(m.group(1)) : 60;
  }

  public static List<String> validar(
      String grupamento, List<Map<String, Object>> itens, double tempo, int experiencia) {
    List<String> problemas = new ArrayList<>();
    Set<String> ids = new LinkedHashSet<>();
    Set<String> nomes = new LinkedHashSet<>();
    Set<String> assinaturas = new LinkedHashSet<>();
    Map<String, Integer> porBucket = new LinkedHashMap<>();
    Set<String> padroes = new LinkedHashSet<>();
    int compostos = 0;
    int isoladores = 0;
    int totalSeries = 0;
    for (Map<String, Object> item : itens) {
      String nome = String.valueOf(item.get("nome"));
      if (!ids.add(String.valueOf(item.get("exercicioId"))) || !nomes.add(nome.toLowerCase(Locale.ROOT))) {
        problemas.add("Exercício duplicado: " + nome);
      }
      String assinatura =
          item.get("padrao") + "|" + item.get("regioes") + "|" + tipoEquipamento(equipamentos(item));
      if (!assinaturas.add(assinatura)) {
        problemas.add("Movimento quase idêntico repetido: " + nome);
      }
      padroes.add(String.valueOf(item.get("padrao")));
      String bucket = bucket((String) item.get("musculoPrincipalCodigo"));
      if (bucket != null) {
        porBucket.merge(bucket, series(item), Integer::sum);
      }
      totalSeries += series(item);
      if ("core".equals(item.get("padrao"))) {
        continue;
      }
      if (Boolean.TRUE.equals(item.get("composto"))) {
        compostos++;
      } else {
        isoladores++;
      }
      int descanso = numero(item.get("descansoSegundos"));
      if (Boolean.TRUE.equals(item.get("composto")) && descanso < 90) {
        problemas.add("Descanso curto para composto: " + nome);
      }
      if (!Boolean.TRUE.equals(item.get("composto")) && descanso < 60) {
        problemas.add("Descanso curto para isolador: " + nome);
      }
    }
    if (segundosTotais(itens, tempo) > tempo * 60) {
      problemas.add("Duração estimada acima do tempo escolhido");
    }
    if (!"OMBROS_BRACOS".equals(grupamento) && isoladores > compostos + 3) {
      problemas.add("Excesso de isoladores");
    }
    for (Map.Entry<String, Integer> entrada : porBucket.entrySet()) {
      if (entrada.getValue() > capMusculo(entrada.getKey(), experiencia, grupamento)) {
        problemas.add("Volume acima do limite para " + entrada.getKey());
      }
    }
    if (totalSeries > capSessao(experiencia)) {
      problemas.add("Volume total acima do limite da sessão");
    }
    boolean joelho = padroes.contains("agachamento") || padroes.contains("extensao_joelho");
    boolean quadril =
        padroes.contains("dobradica") || padroes.contains("flexao_joelho") || padroes.contains("gluteo");
    if (("PERNAS".equals(grupamento) || "PERNAS_OMBROS".equals(grupamento) || "FULL_BODY".equals(grupamento))
        && (!joelho || !quadril)) {
      problemas.add("Pernas sem equilíbrio entre joelho e quadril");
    }
    if ("PERNAS".equals(grupamento)) {
      int quad = porBucket.getOrDefault("quadriceps", 0);
      int posterior = porBucket.getOrDefault("isquiotibiais", 0) + porBucket.getOrDefault("gluteos", 0);
      if (posterior * 2 < quad) {
        problemas.add("Quadríceps muito acima da cadeia posterior");
      }
    }
    for (String exigido : padroesExigidos(grupamento)) {
      boolean ok = false;
      for (String opcao : exigido.split("\\|")) {
        if (padroes.contains(opcao)) {
          ok = true;
        }
      }
      if (!ok) {
        problemas.add("Padrão prioritário ausente: " + exigido);
      }
    }
    return problemas;
  }

  static List<String> padroesExigidos(String grupamento) {
    switch (grupamento) {
      case "PEITO_TRICEPS":
        return Arrays.asList("supino_horizontal", "supino_inclinado", "triceps_pushdown|triceps_overhead");
      case "COSTAS_BICEPS":
        return Arrays.asList("puxada_vertical", "remada", "rosca|rosca_neutra");
      case "PERNAS_OMBROS":
        return Arrays.asList("agachamento", "dobradica|flexao_joelho", "elevacao_lateral|desenvolvimento|deltoide_posterior");
      case "PERNAS":
        return Arrays.asList("agachamento", "dobradica", "flexao_joelho|gluteo|panturrilha");
      case "OMBROS_BRACOS":
        return Arrays.asList("elevacao_lateral", "deltoide_posterior", "triceps_pushdown|triceps_overhead", "rosca|rosca_neutra");
      case "FULL_BODY":
        return Arrays.asList("agachamento", "supino_horizontal|supino_inclinado", "remada|puxada_vertical", "dobradica|gluteo|flexao_joelho");
      default:
        return Collections.emptyList();
    }
  }

  public static List<Map<String, Object>> alternativas(
      Map<String, Object> atual, List<Map<String, Object>> itens, double tempo, int experiencia, String modo) {
    String padrao = String.valueOf(atual.get("padrao"));
    Set<String> nomesNaSessao = new LinkedHashSet<>();
    for (Map<String, Object> item : itens) {
      nomesNaSessao.add(String.valueOf(item.get("nome")).toLowerCase(Locale.ROOT));
    }
    String tipoAtual = tipoEquipamento(equipamentos(atual));
    Set<String> familia = familia(padrao);
    List<ExerciseDatabase.Exercise> candidatos = new ArrayList<>();
    Set<String> vistos = new LinkedHashSet<>();
    for (ExerciseDatabase.Exercise exercicio : ExerciseDatabase.todos()) {
      if (!exercicio.ativo || !familia.contains(exercicio.padrao)) {
        continue;
      }
      String chave = exercicio.nome.toLowerCase(Locale.ROOT);
      if (nomesNaSessao.contains(chave) || !vistos.add(chave)) {
        continue;
      }
      if (exercicio.fundamento == 0 || exercicio.dificuldade > (experiencia >= 3 ? 3 : 2)) {
        continue;
      }
      if ("agachamento".equals(padrao) && exercicio.unilateral != Boolean.TRUE.equals(atual.get("unilateral"))) {
        continue;
      }
      candidatos.add(exercicio);
    }
    candidatos.sort(
        Comparator.comparingDouble(
                (ExerciseDatabase.Exercise e) ->
                    -(e.fundamento * 10
                        + (padrao.equals(e.padrao) ? 6 : 0)
                        + (tipoAtual.equals(tipoEquipamento(e.equipamento)) ? 0 : 3)
                        - Math.abs(e.dificuldade - Math.max(1, Math.min(2, experiencia))) * 2))
            .thenComparing(e -> e.id));
    List<Map<String, Object>> resultado = new ArrayList<>();
    for (ExerciseDatabase.Exercise exercicio : candidatos) {
      Map<String, Object> novo = substituto(atual, exercicio, experiencia, modo);
      List<Map<String, Object>> simulacao = new ArrayList<>();
      for (Map<String, Object> item : itens) {
        simulacao.add(item == atual ? novo : item);
      }
      while (numero(novo.get("series")) > 2 && segundosTotais(simulacao, tempo) > tempo * 60) {
        novo.put("series", numero(novo.get("series")) - 1);
      }
      int segundos = segundosTotais(simulacao, tempo);
      if (segundos > tempo * 60) {
        continue;
      }
      Map<String, Object> opcao = new LinkedHashMap<>();
      opcao.put("exercicioId", exercicio.id);
      opcao.put("nome", exercicio.nome);
      opcao.put("equipamentoRotulo", ExerciseAnatomy.rotuloEquipamentos(exercicio.equipamento));
      opcao.put("padraoRotulo", ExerciseAnatomy.rotuloPadrao(exercicio.padrao));
      opcao.put("mesmoPadrao", padrao.equals(exercicio.padrao));
      opcao.put("series", novo.get("series"));
      opcao.put("duracaoEstimadaMinutos", Math.max(1, (int) Math.round(segundos / 60.0)));
      resultado.add(opcao);
      if (resultado.size() >= 5) {
        break;
      }
    }
    return resultado;
  }

  static Set<String> familia(String padrao) {
    Set<String> familia = new LinkedHashSet<>();
    familia.add(padrao);
    if ("triceps_pushdown".equals(padrao) || "triceps_overhead".equals(padrao) || "supino_fechado".equals(padrao)) {
      familia.addAll(Arrays.asList("triceps_pushdown", "triceps_overhead", "supino_fechado"));
    }
    if ("rosca".equals(padrao) || "rosca_neutra".equals(padrao)) {
      familia.addAll(Arrays.asList("rosca", "rosca_neutra"));
    }
    if ("supino_horizontal".equals(padrao) || "supino_declinado".equals(padrao)) {
      familia.addAll(Arrays.asList("supino_horizontal", "supino_declinado"));
    }
    if ("dobradica".equals(padrao)) {
      familia.add("gluteo");
    }
    if ("panturrilha".equals(padrao) || "core".equals(padrao) || "deltoide_posterior".equals(padrao)) {
      familia.add(padrao);
    }
    return familia;
  }

  public static Map<String, Object> substituto(
      Map<String, Object> atual, ExerciseDatabase.Exercise exercicio, int experiencia, String modo) {
    boolean principal = "principal".equals(atual.get("papel")) && exercicio.composto;
    String volume = atual.get("volume") instanceof String ? (String) atual.get("volume") : "normal";
    Map<String, Object> novo = prescrever(exercicio, experiencia, modo, principal, volume, null);
    int series = numero(atual.get("series"));
    if (series >= 2) {
      novo.put("series", Math.min(series, maximoSeries(novo, experiencia)));
    }
    for (String campo : Arrays.asList("bloco", "blocoOrdem", "ordem", "posicao", "obrigatorio")) {
      if (atual.containsKey(campo)) {
        novo.put(campo, atual.get(campo));
      }
    }
    return novo;
  }
}
