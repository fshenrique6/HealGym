package com.healgym.service;

import com.healgym.repository.ExecutionRepository;
import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import org.bson.Document;
import org.bson.types.ObjectId;

public final class WorkoutGenerationCheck {

  private static int falhas = 0;
  private static int verificacoes = 0;
  private static final String[] NIVEIS = {"iniciante", "intermediario", "avancado"};

  private static void check(boolean condicao, String mensagem) {
    verificacoes++;
    if (!condicao) {
      falhas++;
      System.out.println("FALHA: " + mensagem);
    }
  }

  private static WorkoutGenerator.Session gerar(String grupamento, double tempo, String nivel, int variante) {
    return WorkoutGenerator.montar(grupamento, tempo, nivel, Collections.emptyList(), 4, variante);
  }

  private static List<String> padroes(WorkoutGenerator.Session s) {
    List<String> lista = new ArrayList<>();
    for (Map<String, Object> item : s.exercicios) {
      lista.add(String.valueOf(item.get("padrao")));
    }
    return lista;
  }

  private static List<String> ids(WorkoutGenerator.Session s) {
    List<String> lista = new ArrayList<>();
    for (Map<String, Object> item : s.exercicios) {
      lista.add(String.valueOf(item.get("exercicioId")));
    }
    return lista;
  }

  private static boolean tem(WorkoutGenerator.Session s, String... opcoes) {
    List<String> p = padroes(s);
    for (String opcao : opcoes) {
      if (p.contains(opcao)) {
        return true;
      }
    }
    return false;
  }

  private static int seriesDe(WorkoutGenerator.Session s, String musculo) {
    int total = 0;
    for (Map<String, Object> item : s.exercicios) {
      if (musculo.equals(item.get("musculoPrincipalCodigo"))) {
        total += SessionPlanner.numero(item.get("series"));
      }
    }
    return total;
  }

  private static int primeiroBloco(WorkoutGenerator.Session s, String bloco) {
    for (int i = 0; i < s.exercicios.size(); i++) {
      if (bloco.equals(s.exercicios.get(i).get("bloco"))) {
        return i;
      }
    }
    return -1;
  }

  private static int ultimoBloco(WorkoutGenerator.Session s, String bloco) {
    int ultimo = -1;
    for (int i = 0; i < s.exercicios.size(); i++) {
      if (bloco.equals(s.exercicios.get(i).get("bloco"))) {
        ultimo = i;
      }
    }
    return ultimo;
  }

  @SuppressWarnings("unchecked")
  private static String statusRegiao(WorkoutGenerator.Session s, String foco, String regiao) {
    for (Map<String, Object> secao : (List<Map<String, Object>>) s.cobertura.get("secoes")) {
      if (!foco.equals(secao.get("foco"))) {
        continue;
      }
      for (Map<String, Object> linha : (List<Map<String, Object>>) secao.get("regioes")) {
        if (regiao.equals(linha.get("codigo"))) {
          return String.valueOf(linha.get("status"));
        }
      }
    }
    return null;
  }

  private static int minimoAlvo(double tempo) {
    if (tempo == 30) return 26;
    if (tempo == 45) return 39;
    if (tempo == 60) return 51;
    if (tempo == 75) return 64;
    if (tempo == 90) return 76;
    return (int) Math.floor(tempo * 0.84);
  }

  private static void validarSessao(String rotulo, String grupamento, double tempo, WorkoutGenerator.Session s) {
    check(s.problemas.isEmpty(), rotulo + " problemas " + s.problemas);
    check(s.segundos <= tempo * 60, rotulo + " passou do tempo: " + s.segundos);
    check(s.duracaoEstimadaMinutos <= tempo, rotulo + " minutos acima do escolhido");
    check(
        WorkoutGenerator.segundos(s.exercicios, SessionPlanner.aquecimentoSegundos(tempo)) == s.segundos,
        rotulo + " estimativa inconsistente");
    Set<String> vistos = new LinkedHashSet<>();
    int blocoAnterior = -1;
    for (Map<String, Object> item : s.exercicios) {
      String nome = String.valueOf(item.get("nome"));
      check(vistos.add(nome), rotulo + " duplicado " + nome);
      ExerciseDatabase.Exercise origem = ExerciseDatabase.porId(String.valueOf(item.get("exercicioId")));
      check(origem != null && origem.ativo, rotulo + " exercício inativo ou sem cadastro: " + nome);
      int bloco = SessionPlanner.numero(item.get("blocoOrdem"));
      check(bloco >= blocoAnterior, rotulo + " blocos intercalados em " + nome);
      blocoAnterior = bloco;
      check(item.get("videoUrl") == null, rotulo + " mídia alterada");
      check(item.get("uid") instanceof String, rotulo + " sem uid");
      int descanso = SessionPlanner.numero(item.get("descansoSegundos"));
      if ("core".equals(item.get("padrao"))) {
        check(descanso >= 45, rotulo + " descanso core");
      } else if (Boolean.TRUE.equals(item.get("composto"))) {
        check(descanso >= 90, rotulo + " descanso composto " + nome);
      } else {
        check(descanso >= 60, rotulo + " descanso isolador " + nome);
      }
      for (String campo : Arrays.asList("porcaoMuscular", "padraoRotulo", "equipamentoRotulo", "musculoPrincipal", "musculosSecundarios", "tipoCargaRotulo")) {
        Object valor = item.get(campo);
        check(valor == null || !String.valueOf(valor).contains("_"), rotulo + " código interno em " + campo + ": " + valor);
      }
      String texto = (item.get("tecnica") + " " + item.get("cuidado") + " " + item.get("erroComum")).toLowerCase(Locale.ROOT);
      check(!texto.contains("nenhum músculo dominante"), rotulo + " texto antigo");
      check(!texto.contains("isola completamente") && !texto.contains("isolamento total"), rotulo + " promessa de isolamento");
      List<?> equipamento = (List<?>) item.get("equipamento");
      if (equipamento.contains("halteres") && !equipamento.contains("barra")) {
        check(!texto.contains("barra") && !texto.contains("encostar os halteres") && !texto.contains("juntar os halteres"),
            rotulo + " texto de barra em exercício com halteres: " + nome);
      }
      String porcao = String.valueOf(item.get("porcaoMuscular")).toLowerCase(Locale.ROOT);
      check(!porcao.contains("interno") && !porcao.contains("medial"), rotulo + " porção inventada");
    }
    if (tempo <= 90) {
      check(
          s.duracaoEstimadaMinutos >= minimoAlvo(tempo) || !s.observacoes.isEmpty(),
          rotulo + " abaixo da faixa sem observação: " + s.duracaoEstimadaMinutos);
    }
  }

  private static void imprimir(String rotulo, String grupamento, double tempo, WorkoutGenerator.Session s) {
    int series = 0;
    for (Map<String, Object> item : s.exercicios) {
      series += SessionPlanner.numero(item.get("series"));
    }
    System.out.println();
    System.out.println("=== " + rotulo + " — " + (int) tempo + " min escolhidos, estimativa " + s.duracaoEstimadaMinutos
        + " min, " + s.exercicios.size() + " exercícios, " + series + " séries");
    String bloco = null;
    for (Map<String, Object> item : s.exercicios) {
      if (!String.valueOf(item.get("bloco")).equals(bloco)) {
        bloco = String.valueOf(item.get("bloco"));
        System.out.println("  [" + bloco + "]");
      }
      System.out.println("   " + item.get("posicao") + ". " + item.get("nome") + " — " + item.get("series") + "x"
          + item.get("repeticoes") + ", descanso " + item.get("descanso")
          + (SessionPlanner.numero(item.get("seriesAproximacao")) > 0 ? ", " + item.get("seriesAproximacao") + " aproximação" : "")
          + (item.get("rirAlvo") != null ? ", RIR " + item.get("rirAlvo") : "")
          + " | " + item.get("porcaoMuscular") + " | " + item.get("equipamentoRotulo"));
    }
    System.out.println("  Cobertura: " + s.resumo);
    imprimirRegioes(s);
    for (String obs : s.observacoes) {
      System.out.println("  Obs: " + obs);
    }
  }

  @SuppressWarnings("unchecked")
  private static void imprimirRegioes(WorkoutGenerator.Session s) {
    for (Map<String, Object> secao : (List<Map<String, Object>>) s.cobertura.get("secoes")) {
      StringBuilder linha = new StringBuilder("    " + secao.get("foco") + ": ");
      for (Map<String, Object> musculo : (List<Map<String, Object>>) secao.get("musculos")) {
        linha.append(musculo.get("rotulo")).append(" ").append(musculo.get("seriesDiretas")).append(" diretas/")
            .append(musculo.get("seriesIndiretas")).append(" indiretas; ");
      }
      for (Map<String, Object> regiao : (List<Map<String, Object>>) secao.get("regioes")) {
        linha.append(regiao.get("rotulo")).append(" = ").append(regiao.get("status")).append("; ");
      }
      System.out.println(linha);
    }
  }

  public static void main(String[] args) {
    check(!WorkoutGenerator.WORKOUT_GROUPS.contains("OMBROS_CORE"), "ABCDE ainda listado");
    check(!WorkoutGenerator.WORKOUT_GROUPS.contains("BRACOS"), "ABCDE ainda listado");
    Map<String, Object> abcde = new LinkedHashMap<>();
    abcde.put("tipoDivisao", "ABCDE");
    abcde.put("letraTreino", "E");
    check(WorkoutGenerator.resolveGrupamentoGeracao(abcde).error != null, "ABCDE aceito");

    Set<String> idsCatalogo = new LinkedHashSet<>();
    int legPress = 0;
    for (ExerciseDatabase.Exercise e : ExerciseDatabase.todos()) {
      check(idsCatalogo.add(e.id), "id duplicado " + e.id);
      check(e.principal != null, "sem músculo principal: " + e.nome);
      check(e.tipoCarga != null, "sem tipo de carga: " + e.nome);
      check(e.cuidado != null && e.erroComum != null, "sem cuidado/erro: " + e.nome);
      check(e.padrao != null && e.grupo != null, "sem padrão/grupo: " + e.nome);
      if ("Leg Press".equals(e.nome)) {
        legPress++;
      }
    }
    check(legPress == 1, "Leg Press duplicado no catálogo");
    for (String antigo : Arrays.asList("medio-supino-reto-com-barra", "superior-supino-inclinado-com-halteres")) {
      check(ExerciseDatabase.porId(antigo) != null && ExerciseDatabase.porId(antigo).ativo, "id antigo perdido " + antigo);
    }
    Set<String> principais = new LinkedHashSet<>(Arrays.asList(
        "Supino Reto com Barra", "Supino Reto com Halteres", "Supino Inclinado com Barra", "Supino Inclinado com Halteres",
        "Supino Declinado com Barra", "Chest Press na Máquina", "Crucifixo Reto com Halteres", "Voador Peitoral", "Cross Over na Polia Alta",
        "Puxada Frontal Pegada Aberta", "Pulldown com Pegada Supinada", "Barra Fixa", "Remada Curvada com Barra",
        "Remada Unilateral com Halter", "Remada na Polia Baixa", "Remada Cavalinho com Barra",
        "Desenvolvimento com Barra", "Desenvolvimento com Halteres", "Desenvolvimento na Máquina", "Elevação Lateral com Halteres",
        "Crucifixo Inverso com Halteres", "Voador Invertido", "Face Pull na Polia Alta",
        "Tríceps Pulley na Polia Alta", "Tríceps Corda na Polia Alta", "Tríceps Testa com Barra", "Tríceps Francês com Halteres", "Mergulho entre Bancos",
        "Rosca Direta com Barra", "Rosca Alternada com Halteres", "Rosca Martelo com Halteres", "Rosca Scott com Barra",
        "Agachamento com Barra", "Leg Press", "Cadeira Extensora", "Mesa Flexora", "Cadeira Flexora", "Levantamento Terra Romeno",
        "Afundo com Halteres", "Afundo Búlgaro com Halteres", "Hip Thrust com Barra", "Panturrilha em Máquina",
        "Panturrilha Sentado com Halteres", "Agachamento Goblet com Halter",
        "Prancha", "Abdominal Tradicional", "Elevação de Joelhos", "Prancha Lateral", "Dead Bug"));
    Set<String> ativos = new LinkedHashSet<>();
    for (ExerciseDatabase.Exercise e : ExerciseDatabase.ativos()) {
      check(ativos.add(e.nome), "exercício ativo duplicado " + e.nome);
      check(e.id != null && !e.id.isEmpty(), "ativo sem identificador " + e.nome);
    }
    check(ativos.size() == 49, "catálogo ativo com " + ativos.size() + " exercícios");
    check(ativos.equals(principais), "catálogo ativo diferente da lista principal");
    ExerciseDatabase.Exercise mergulho = null;
    for (ExerciseDatabase.Exercise e : ExerciseDatabase.ativos()) {
      if ("Mergulho entre Bancos".equals(e.nome)) {
        mergulho = e;
      }
    }
    check(mergulho != null && "TRICEPS".equals(mergulho.grupo) && "triceps".equals(mergulho.principal), "mergulho fora do tríceps");
    ExerciseDatabase.Exercise stiff = ExerciseDatabase.porId("posteriores-stiff-com-halteres");
    check(stiff != null && !stiff.ativo, "exercício retirado foi apagado ou continua prescritível");

    for (String grupamento : SessionPlanner.GRUPAMENTOS) {
      for (int tempo = 30; tempo <= 120; tempo += 5) {
        for (String nivel : NIVEIS) {
          for (int variante = 0; variante <= ("FULL_BODY".equals(grupamento) ? 1 : 0); variante++) {
            WorkoutGenerator.Session s = gerar(grupamento, tempo, nivel, variante);
            validarSessao(grupamento + " " + tempo + " " + nivel + " v" + variante, grupamento, tempo, s);
            check(ids(s).equals(ids(gerar(grupamento, tempo, nivel, variante))), "instável " + grupamento + " " + tempo);
          }
        }
      }
    }

    String n = "intermediario";
    WorkoutGenerator.Session a30 = gerar("PEITO_TRICEPS", 30, n, 0);
    WorkoutGenerator.Session a60 = gerar("PEITO_TRICEPS", 60, n, 0);
    for (WorkoutGenerator.Session s : Arrays.asList(a30, a60)) {
      check("supino_horizontal".equals(s.exercicios.get(0).get("padrao")), "A não começa no supino reto");
      check(tem(s, "supino_inclinado"), "A sem inclinado");
      check(tem(s, "triceps_pushdown", "triceps_overhead"), "A sem tríceps");
      check(ultimoBloco(s, "Peito") < primeiroBloco(s, "Tríceps"), "A com peito e tríceps intercalados");
      check("direta".equals(statusRegiao(s, "Peitoral", "peitoral_clavicular")), "A sem porção clavicular direta");
      check("direta".equals(statusRegiao(s, "Peitoral", "peitoral_esternocostal")), "A sem porção esternocostal direta");
      check(!"nao_priorizada".equals(statusRegiao(s, "Peitoral", "peitoral_inferior")), "A sem estímulo inferior");
    }
    check(tem(a60, "triceps_overhead"), "A60 sem extensão acima da cabeça");

    for (int tempo : new int[] {45, 90}) {
      WorkoutGenerator.Session b = gerar("COSTAS_BICEPS", tempo, n, 0);
      check("puxada_vertical".equals(b.exercicios.get(0).get("padrao")), "B não começa na puxada");
      check(tem(b, "remada"), "B sem remada");
      check(tem(b, "rosca"), "B sem rosca");
      check(ultimoBloco(b, "Costas") < primeiroBloco(b, "Bíceps"), "B intercalado");
    }

    for (int tempo : new int[] {30, 60}) {
      WorkoutGenerator.Session c = gerar("PERNAS_OMBROS", tempo, n, 0);
      check(tem(c, "agachamento"), "C sem joelho");
      check(tem(c, "dobradica", "flexao_joelho"), "C sem posterior");
      check(tem(c, "elevacao_lateral"), "C sem lateral");
      check(ultimoBloco(c, "Pernas") < primeiroBloco(c, "Ombros"), "C intercalado");
    }
    check(tem(gerar("PERNAS_OMBROS", 60, n, 0), "panturrilha"), "C60 sem panturrilha");

    WorkoutGenerator.Session dA30 = gerar("PEITO_TRICEPS", 30, n, 0);
    check(ids(dA30).equals(ids(a30)), "ABCD A difere de ABC A");
    check(tem(gerar("COSTAS_BICEPS", 60, n, 0), "puxada_vertical", "remada"), "ABCD B60");
    for (int tempo : new int[] {45, 90}) {
      WorkoutGenerator.Session c = gerar("PERNAS", tempo, n, 0);
      check(tem(c, "agachamento") && tem(c, "dobradica"), "ABCD C sem base");
      check(tem(c, "flexao_joelho"), "ABCD C sem flexão de joelho");
      check(tem(c, "panturrilha"), "ABCD C sem panturrilha");
      List<String> p = padroes(c);
      check(!(p.size() == 3 && p.contains("agachamento") && p.contains("extensao_joelho")), "perna só de quadríceps");
    }
    for (int tempo : new int[] {30, 60}) {
      WorkoutGenerator.Session d = gerar("OMBROS_BRACOS", tempo, n, 0);
      check(tem(d, "elevacao_lateral") && tem(d, "deltoide_posterior"), "D sem deltoides");
      check(tem(d, "triceps_pushdown", "triceps_overhead") && tem(d, "rosca", "rosca_neutra"), "D sem braços");
      check(seriesDe(d, "triceps") <= SessionPlanner.capMusculo("triceps", 2, "OMBROS_BRACOS"), "D braço excessivo");
    }

    for (int tempo : new int[] {30, 45, 60, 90, 120}) {
      for (int variante = 0; variante <= 1; variante++) {
        WorkoutGenerator.Session fb = gerar("FULL_BODY", tempo, n, variante);
        check(tem(fb, "agachamento"), "FB sem joelho");
        check(tem(fb, "dobradica", "gluteo", "flexao_joelho"), "FB sem quadril");
        check(tem(fb, "supino_horizontal", "supino_inclinado"), "FB sem empurrar");
        check(tem(fb, "remada", "puxada_vertical"), "FB sem puxar");
        if (tempo >= 60) {
          check(tem(fb, "core"), "FB " + tempo + " sem estabilização do tronco");
        }
      }
      check(!ids(gerar("FULL_BODY", tempo, n, 0)).equals(ids(gerar("FULL_BODY", tempo, n, 1))), "FB sem variação planejada");
    }
    WorkoutGenerator.Session fbB = gerar("FULL_BODY", 45, n, 1);
    check(tem(fbB, "supino_inclinado") && "puxada_vertical".equals(fbB.exercicios.get(2).get("padrao")), "FB sessão 2 fora do plano");

    for (ExerciseDatabase.Exercise e : ExerciseDatabase.todos()) {
      if (e.equipamento.contains("halteres") && !e.equipamento.contains("barra")) {
        String texto = (e.tecnica + " " + e.cuidado + " " + e.erroComum).toLowerCase(Locale.ROOT);
        check(!texto.contains("barra"), "catálogo: texto de barra em halteres: " + e.nome);
      }
    }
    ExerciseDatabase.Exercise inclinadoHalteres = ExerciseDatabase.porId("superior-supino-inclinado-com-halteres");
    check(inclinadoHalteres != null && "por_halter".equals(inclinadoHalteres.tipoCarga), "tipo de carga halteres");

    testarExecucao();
    testarSubstituicao(a30);
    testarCompatibilidade();
    testarMongo();

    imprimir("ABC A (Peito e Tríceps)", "PEITO_TRICEPS", 30, a30);
    imprimir("ABC C (Pernas e Ombros)", "PERNAS_OMBROS", 60, gerar("PERNAS_OMBROS", 60, n, 0));
    imprimir("ABCD C (Pernas)", "PERNAS", 60, gerar("PERNAS", 60, n, 0));
    imprimir("ABCD D (Ombros e Braços)", "OMBROS_BRACOS", 45, gerar("OMBROS_BRACOS", 45, n, 0));
    imprimir("Full Body sessão 1", "FULL_BODY", 30, gerar("FULL_BODY", 30, n, 0));
    imprimir("Full Body sessão 1", "FULL_BODY", 60, gerar("FULL_BODY", 60, n, 0));
    imprimir("Full Body sessão 2", "FULL_BODY", 60, gerar("FULL_BODY", 60, n, 1));

    System.out.println();
    System.out.println(verificacoes + " verificações, " + falhas + " falhas");
    if (falhas > 0) {
      System.exit(1);
    }
    System.out.println("OK");
  }

  private static boolean lanca(Runnable acao) {
    try {
      acao.run();
      return false;
    } catch (ExecucaoRegras.Invalido e) {
      return true;
    }
  }

  private static Map<String, Object> serie(int numero, Object carga, Object reps, Object rir, boolean concluida) {
    Map<String, Object> s = new LinkedHashMap<>();
    s.put("numero", numero);
    s.put("carga", carga);
    s.put("repeticoes", reps);
    s.put("rir", rir);
    s.put("concluida", concluida);
    return s;
  }

  private static Map<String, Object> registro(String uid, Object... series) {
    Map<String, Object> r = new LinkedHashMap<>();
    r.put("uid", uid);
    r.put("series", Arrays.asList(series));
    return r;
  }

  private static Document porUid(List<Document> lista, String uid) {
    for (Document doc : lista) {
      if (uid.equals(doc.getString("uid"))) {
        return doc;
      }
    }
    return null;
  }

  private static void testarExecucao() {
    check(ExecucaoRegras.carga("22,5") == 22.5, "carga com vírgula");
    check(ExecucaoRegras.carga("22.5") == 22.5, "carga com ponto");
    check(ExecucaoRegras.carga(" 40 ") == 40.0, "carga com espaços");
    check(ExecucaoRegras.carga("") == null && ExecucaoRegras.carga(null) == null, "carga vazia");
    check(lanca(() -> ExecucaoRegras.carga("-5")), "carga negativa aceita");
    check(lanca(() -> ExecucaoRegras.carga("abc")), "carga texto aceita");
    check(lanca(() -> ExecucaoRegras.carga("5000")), "carga absurda aceita");
    check(lanca(() -> ExecucaoRegras.inteiro("301", 300, "Repetições")), "reps acima do limite");
    check(lanca(() -> ExecucaoRegras.inteiro(8.5, 300, "Repetições")), "reps fracionadas");
    check(ExecucaoRegras.inteiro("12", 300, "Repetições") == 12, "reps texto");

    List<Map<String, Object>> itens = gerar("PEITO_TRICEPS", 45, "intermediario", 0).exercicios;
    String uid0 = (String) itens.get(0).get("uid");
    String uid1 = (String) itens.get(1).get("uid");
    Date t1 = new Date(1000);
    List<Document> primeira = ExecucaoRegras.mesclar(itens,
        Arrays.asList(registro(uid0, serie(1, "60", 10, 2, true), serie(2, "", null, null, false))), null, t1);
    check(primeira.size() == 1, "registro inicial");
    Document s1 = (Document) ((List<?>) primeira.get(0).get("series")).get(0);
    check(Double.valueOf(60.0).equals(s1.get("carga")) && Integer.valueOf(10).equals(s1.get("repeticoes")), "carga e reps separadas");
    check(Integer.valueOf(SessionPlanner.numero(itens.get(0).get("series"))).equals(primeira.get(0).get("seriesPrescritas")), "prescrição preservada à parte");
    check(t1.equals(s1.get("concluidaEm")), "data de conclusão");

    Date t2 = new Date(2000);
    List<Document> segunda = ExecucaoRegras.mesclar(itens,
        Arrays.asList(registro(uid1, serie(1, "22,5", 9, null, true))), primeira, t2);
    check(segunda.size() == 2, "outro exercício apagou o anterior");
    List<Document> terceira = ExecucaoRegras.mesclar(itens,
        Arrays.asList(registro(uid0, serie(1, "62,5", 10, 2, true), serie(2, "60", 8, 1, true))), segunda, new Date(3000));
    Document corrigida = (Document) ((List<?>) porUid(terceira, uid0).get("series")).get(0);
    check(Double.valueOf(62.5).equals(corrigida.get("carga")), "correção de carga");
    check(t1.equals(corrigida.get("concluidaEm")), "data original preservada na correção");
    List<Document> desmarcada = ExecucaoRegras.mesclar(itens,
        Arrays.asList(registro(uid0, serie(1, "62,5", 10, 2, false))), terceira, new Date(4000));
    Document semConclusao = (Document) ((List<?>) porUid(desmarcada, uid0).get("series")).get(0);
    check(porUid(desmarcada, uid1) != null, "desmarcar apagou outro exercício");
    check(!Boolean.TRUE.equals(semConclusao.get("concluida")) && semConclusao.get("concluidaEm") == null, "desmarcar série");
    check(lanca(() -> ExecucaoRegras.mesclar(itens, Arrays.asList(registro("inexistente", serie(1, 10, 10, null, true))), null, t1)), "uid de outro treino aceito");
    check(lanca(() -> ExecucaoRegras.mesclar(itens, Arrays.asList(registro(uid0, serie(1, 10, 10, null, true), serie(1, 10, 10, null, true))), null, t1)), "série duplicada aceita");
    check(lanca(() -> ExecucaoRegras.mesclar(itens, Arrays.asList(registro(uid0, serie(1, 10, 10, 11, true))), null, t1)), "RIR inválido aceito");
    List<Document> semRir = ExecucaoRegras.mesclar(itens, Arrays.asList(registro(uid0, serie(1, 10, 10, null, true))), null, t1);
    check(((Document) ((List<?>) semRir.get(0).get("series")).get(0)).get("rir") == null, "RIR ausente deve ser aceito");

    List<Document> historico = new ArrayList<>();
    for (int i = 0; i < 2; i++) {
      Document entrada = new Document("uid", "u" + i).append("exercicioId", "medio-supino-reto-com-barra")
          .append("nome", "Supino Reto com Barra").append("seriesPrescritas", 3).append("repeticoesPrescritas", "6-10")
          .append("series", Arrays.asList(
              new Document("numero", 1).append("carga", 60.0).append("repeticoes", 10).append("rir", 2).append("concluida", true),
              new Document("numero", 2).append("carga", 60.0).append("repeticoes", 10).append("rir", 1).append("concluida", true),
              new Document("numero", 3).append("carga", 60.0).append("repeticoes", 10).append("rir", null).append("concluida", true)));
      historico.add(new Document("workout", new ObjectId()).append("updatedAt", new Date(10000 - i)).append("exercicios", Arrays.asList(entrada)));
    }
    Map<String, Object> prog = ExecucaoRegras.progresso("medio-supino-reto-com-barra", "Supino Reto com Barra", historico, 5);
    check(prog.get("sugestao") != null, "sugestão deveria aparecer após topo repetido");
    check(Double.valueOf(60.0).equals(prog.get("melhorCarga")), "melhor carga");
    check(((List<?>) prog.get("sessoes")).size() == 2, "histórico simples");
    Document falha = (Document) ((List<?>) ((Document) ((List<?>) historico.get(0).get("exercicios")).get(0)).get("series")).get(0);
    falha.put("rir", 0);
    check(ExecucaoRegras.progresso("medio-supino-reto-com-barra", null, historico, 5).get("sugestao") == null, "sugestão com RIR 0");
    falha.put("rir", 2);
    falha.put("repeticoes", 8);
    check(ExecucaoRegras.progresso("medio-supino-reto-com-barra", null, historico, 5).get("sugestao") == null, "sugestão sem topo da faixa");
    check(ExecucaoRegras.progresso("medio-supino-reto-com-barra", null, historico.subList(0, 1), 5).get("sugestao") == null, "sugestão com uma sessão só");
    testarSessao();
  }

  private static void testarSessao() {
    Document doc = new Document("status", "pausado").append("tempoAcumuladoSegundos", 0);
    Date inicio = new Date(1_000_000L);
    check(ExecucaoRegras.iniciar(doc, inicio), "iniciar sessão");
    check(inicio.equals(doc.get("iniciadoEm")) && inicio.equals(doc.get("retomadoEm")), "cronômetro começa uma vez");
    check(!ExecucaoRegras.iniciar(doc, new Date(1_005_000L)), "segundo iniciar reiniciou o cronômetro");
    check(inicio.equals(doc.get("retomadoEm")), "retomadoEm alterado no segundo iniciar");
    check(ExecucaoRegras.segundosDecorridos(doc, new Date(1_012_000L)) == 12, "tempo decorrido");
    check(ExecucaoRegras.pausar(doc, inicio, new Date(1_020_000L)), "pausar");
    check(Integer.valueOf(20).equals(doc.getInteger("tempoAcumuladoSegundos")), "tempo acumulado ao pausar");
    check("pausado".equals(doc.getString("status")) && doc.get("retomadoEm") == null, "sessão pausada");
    check(!ExecucaoRegras.pausar(doc, inicio, new Date(1_030_000L)), "pausa duplicada");
    Date retomada = new Date(1_040_000L);
    check(ExecucaoRegras.retomar(doc, retomada), "retomar");
    check(!ExecucaoRegras.pausar(doc, inicio, new Date(1_045_000L)), "pausa atrasada depois de retomar");
    check("em_andamento".equals(doc.getString("status")), "pausa atrasada mudou o estado");
    check(ExecucaoRegras.segundosDecorridos(doc, new Date(1_044_000L)) == 24, "tempo depois de retomar");
    Date agora = new Date(1_050_000L);
    check(ExecucaoRegras.iniciarDescanso(doc, 90, "Próxima série: 2 de 3", "abc", 2, agora), "descanso");
    Date fim = (Date) doc.get("descansoTerminaEm");
    check(fim.getTime() == agora.getTime() + 90_000L, "descanso pelo horário de término");
    check(!ExecucaoRegras.iniciarDescanso(doc, 30, "Outro", "abc", 3, new Date(agora.getTime() + 1000L)), "descanso duplicado");
    check(fim.equals(doc.get("descansoTerminaEm")), "segundo descanso moveu o término");
    check(ExecucaoRegras.descansoRestante(doc, new Date(fim.getTime() - 15_000L)) == 15, "restante do descanso");
    check(ExecucaoRegras.descansoRestante(doc, new Date(fim.getTime() + 1000L)) == 0, "descanso encerrado");
    ExecucaoRegras.pularDescanso(doc, new Date(fim.getTime()));
    check(doc.get("descansoTerminaEm") == null, "pular descanso");
    check(ExecucaoRegras.encerrar(doc, null, new Date(1_060_000L)), "finalizar");
    check("concluida".equals(doc.getString("status")), "sessão concluída");
    check(Integer.valueOf(40).equals(doc.getInteger("duracaoRealSegundos")), "duração congelada ao finalizar");
    check(doc.get("descansoTerminaEm") == null, "finalizar encerra o descanso");
    check(!ExecucaoRegras.encerrar(doc, 10, new Date(1_070_000L)), "finalização duplicada");
    check(Integer.valueOf(40).equals(doc.getInteger("duracaoRealSegundos")), "segunda finalização alterou a duração");
    check(!ExecucaoRegras.iniciar(doc, new Date(1_080_000L)), "iniciar depois de concluir");
  }

  private static void testarSubstituicao(WorkoutGenerator.Session base) {
    List<Map<String, Object>> itens = new ArrayList<>(base.exercicios);
    Map<String, Object> inclinado = null;
    for (Map<String, Object> item : itens) {
      if ("supino_inclinado".equals(item.get("padrao"))) {
        inclinado = item;
      }
    }
    check(inclinado != null, "A30 sem inclinado para trocar");
    if (inclinado == null) {
      return;
    }
    List<Map<String, Object>> opcoes = SessionPlanner.alternativas(inclinado, itens, 30, 2, "hipertrofia");
    check(!opcoes.isEmpty(), "sem alternativas para o inclinado");
    Set<String> nomes = new LinkedHashSet<>();
    for (Map<String, Object> item : itens) {
      nomes.add(String.valueOf(item.get("nome")));
    }
    for (Map<String, Object> opcao : opcoes) {
      ExerciseDatabase.Exercise e = ExerciseDatabase.porId(String.valueOf(opcao.get("exercicioId")));
      check(e != null && e.ativo && "supino_inclinado".equals(e.padrao), "alternativa fora do padrão: " + opcao.get("nome"));
      check(!nomes.contains(String.valueOf(opcao.get("nome"))), "alternativa já presente");
      check(SessionPlanner.numero(opcao.get("duracaoEstimadaMinutos")) <= 30, "alternativa estoura o tempo");
    }
    ExerciseDatabase.Exercise escolhido = ExerciseDatabase.porId(String.valueOf(opcoes.get(0).get("exercicioId")));
    Map<String, Object> novo = SessionPlanner.substituto(inclinado, escolhido, 2, "hipertrofia");
    check(!novo.get("uid").equals(inclinado.get("uid")), "substituto com mesmo uid");
    check(novo.get("bloco").equals(inclinado.get("bloco")) && novo.get("ordem").equals(inclinado.get("ordem")), "substituto mudou de bloco");
  }

  private static void testarCompatibilidade() {
    Map<String, Object> antigo = new LinkedHashMap<>();
    antigo.put("exercicioId", "medio-supino-reto-com-barra");
    antigo.put("nome", "Supino Reto com Barra");
    antigo.put("series", 3);
    antigo.put("repeticoes", "8-12");
    antigo.put("descanso", "90s");
    antigo.put("descansoSegundos", 90);
    antigo.put("preparacaoSegundos", 140);
    antigo.put("composto", true);
    antigo.put("equipamento", Arrays.asList("banco", "barra"));
    List<Map<String, Object>> itens = Arrays.asList(antigo);
    check("idx-0".equals(ExecucaoRegras.uidDe(antigo, 0)), "uid de treino antigo");
    Map<String, Object> cobertura = CoberturaMuscular.calcular("PEITO_TRICEPS", itens);
    check(cobertura.get("secoes") instanceof List, "cobertura de treino antigo");
    check(CoberturaMuscular.seriesDiretasPorMusculo(itens).getOrDefault("peitoral", 0.0) == 3.0, "séries diretas de treino antigo");
    check(SessionPlanner.segundosExercicio(antigo) > 0, "estimativa de treino antigo");
    Map<String, Object> retirado = new LinkedHashMap<>();
    retirado.put("exercicioId", "posteriores-stiff-com-halteres");
    retirado.put("nome", "Stiff com Halteres");
    retirado.put("series", 3);
    Map<String, Object> coberturaAntiga = CoberturaMuscular.calcular("PERNAS", Arrays.asList(retirado));
    check(coberturaAntiga.get("secoes") instanceof List, "treino antigo com exercício retirado do catálogo ativo");
    check(CoberturaMuscular.seriesDiretasPorMusculo(Arrays.asList(retirado)).getOrDefault("isquiotibiais", 0.0) == 3.0,
        "séries do exercício retirado");
  }

  private static void testarMongo() {
    MongoClient cliente = null;
    try {
      MongoClientSettings settings = MongoClientSettings.builder()
          .applyConnectionString(new ConnectionString("mongodb://127.0.0.1:27017"))
          .applyToClusterSettings(b -> b.serverSelectionTimeout(2, TimeUnit.SECONDS))
          .build();
      cliente = MongoClients.create(settings);
      MongoCollection<Document> colecao = cliente.getDatabase("healgym_teste").getCollection("workout_executions");
      colecao.drop();
      ExecutionRepository repo = new ExecutionRepository(colecao);
      repo.ensureIndexes();
      ObjectId usuario = new ObjectId();
      ObjectId outro = new ObjectId();
      ObjectId treino = new ObjectId();
      Document execucao = new Document("user", usuario).append("workout", treino).append("exercicios", new ArrayList<>()).append("updatedAt", new Date());
      repo.save(execucao);
      repo.save(new Document("user", usuario).append("workout", treino).append("exercicios", new ArrayList<>()).append("updatedAt", new Date()));
      check(repo.count(usuario, treino) == 1, "execução duplicada no Mongo");
      check(repo.find(outro, treino) == null, "outro usuário acessou a execução");
      check(repo.recentes(outro, null, 10).isEmpty(), "progresso vazou para outro usuário");
      boolean bloqueado = false;
      try {
        colecao.insertOne(new Document("user", usuario).append("workout", treino));
      } catch (RuntimeException e) {
        bloqueado = true;
      }
      check(bloqueado, "índice único ausente");
      repo.deleteByWorkout(outro, treino);
      check(repo.find(usuario, treino) != null, "outro usuário apagou a execução");
      repo.deleteByWorkout(usuario, treino);
      check(repo.find(usuario, treino) == null, "exclusão da execução");
      colecao.drop();
      System.out.println("Persistência testada em healgym_teste.");
    } catch (RuntimeException e) {
      System.out.println("Mongo indisponível, teste de persistência ignorado: " + e.getClass().getSimpleName());
    } finally {
      if (cliente != null) {
        cliente.close();
      }
    }
  }
}
