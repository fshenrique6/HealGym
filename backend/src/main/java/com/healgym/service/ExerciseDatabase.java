package com.healgym.service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class ExerciseDatabase {

  public static final class Exercise {
    public String id;
    public final String nome;
    public final String tecnica;
    public final List<String> equipamento;
    public String padrao;
    public String grupo;
    public final int dificuldade;
    public final boolean composto;
    public final boolean unilateral;
    public final int fundamento;
    public String principal;
    public List<String> secundarios = Collections.emptyList();
    public List<String> regioes = Collections.emptyList();
    public List<String> regioesSecundarias = Collections.emptyList();
    public String enfase;
    public String cuidado;
    public String erroComum;
    public String tipoCarga;
    public final String videoUrl;
    public final String videoThumbnailUrl;
    public final String videoFonte;
    public final String videoAutor;
    public final String videoLicenca;
    public final String videoStatus;
    public boolean ativo = true;

    Exercise(String nome, String tecnica, List<String> equipamento) {
      this.nome = nome;
      this.tecnica = tecnica;
      this.equipamento = Collections.unmodifiableList(equipamento);
      String base =
          Normalizer.normalize(nome, Normalizer.Form.NFD)
              .replaceAll("\\p{M}", "")
              .toLowerCase(Locale.ROOT)
              .replaceAll("[^a-z0-9]+", "-")
              .replaceAll("^-|-$", "");
      this.id = base;
      this.dificuldade = inferDificuldade(nome);
      this.composto = inferComposto(nome);
      this.unilateral = inferUnilateral(nome);
      this.fundamento = fundamentoDe(nome);
      this.videoUrl = null;
      this.videoThumbnailUrl = null;
      this.videoFonte = null;
      this.videoAutor = null;
      this.videoLicenca = null;
      this.videoStatus = "indisponivel";
    }
  }

  public static final Map<String, Map<String, List<Exercise>>> DATABASE = new LinkedHashMap<>();
  private static final Map<String, Exercise> POR_ID = new LinkedHashMap<>();

  private ExerciseDatabase() {}

  public static Exercise porId(String id) {
    return id == null ? null : POR_ID.get(id);
  }

  public static List<Exercise> todos() {
    return new ArrayList<>(POR_ID.values());
  }

  public static List<Exercise> ativos() {
    List<Exercise> lista = new ArrayList<>();
    for (Exercise exercise : POR_ID.values()) {
      if (exercise.ativo) {
        lista.add(exercise);
      }
    }
    return lista;
  }

  private static Exercise ex(String nome, String tecnica, String... equipamento) {
    return new Exercise(nome, tecnica, new ArrayList<>(Arrays.asList(equipamento)));
  }

  private static Map<String, List<Exercise>> group(Object... entries) {
    Map<String, List<Exercise>> map = new LinkedHashMap<>();
    for (int i = 0; i + 1 < entries.length; i += 2) {
      @SuppressWarnings("unchecked")
      List<Exercise> list = (List<Exercise>) entries[i + 1];
      for (Exercise exercise : list) {
        exercise.padrao = padraoDe((String) entries[i], exercise.nome);
        exercise.id = entries[i] + "-" + exercise.id;
        ExerciseAnatomy.aplicar(exercise);
      }
      map.put((String) entries[i], list);
    }
    return map;
  }

  private static void registrar(String grupo, Map<String, List<Exercise>> porcoes) {
    for (List<Exercise> lista : porcoes.values()) {
      for (Exercise exercise : lista) {
        exercise.grupo = grupo;
        POR_ID.putIfAbsent(exercise.id, exercise);
      }
    }
    DATABASE.put(grupo, porcoes);
  }

  private static List<Exercise> list(Exercise... exercises) {
    return new ArrayList<>(Arrays.asList(exercises));
  }

  private static int inferDificuldade(String nome) {
    String n = nome.toLowerCase(Locale.ROOT);
    if (n.contains("nórdica")
        || n.contains("nordica")
        || n.contains("sissy")
        || n.contains("good morning")
        || n.contains("arnold")
        || n.contains("hack")
        || n.contains("agachamento frontal")
        || n.contains("barra fixa")
        || n.contains("flexão de joelhos com o peso do corpo")) {
      return 3;
    }
    if (n.contains("declinado")
        || n.contains("frontal")
        || n.contains("búlgaro")
        || n.contains("bulgaro")
        || n.contains("terra")
        || n.contains("remada curvada")
        || n.contains("cavalinho")
        || n.contains("paralelas")
        || n.contains("supino fechado")
        || n.contains("desenvolvimento com barra")
        || n.contains("agachamento com barra")) {
      return 2;
    }
    return 1;
  }

  private static boolean inferComposto(String nome) {
    String n = nome.toLowerCase(Locale.ROOT);
    if (n.contains("flexão de joelhos")
        || n.contains("flexao de joelhos")
        || n.contains("braços estendidos")
        || n.contains("remada y")
        || n.contains("pallof")) {
      return false;
    }
    return n.contains("supino")
        || n.contains("chest press")
        || n.contains("leg press")
        || n.contains("agachamento")
        || n.contains("desenvolvimento")
        || n.contains("remada")
        || n.contains("puxada")
        || n.contains("pulldown")
        || n.contains("barra fixa")
        || n.contains("levantamento")
        || n.contains("afundo")
        || n.contains("hip thrust")
        || n.contains("mergulho")
        || n.contains("flexão")
        || n.contains("flexao")
        || n.contains("stiff")
        || n.contains("good morning")
        || n.contains("passada");
  }

  private static int fundamentoDe(String nome) {
    switch (nome) {
      case "Supino Reto com Barra":
      case "Supino Reto com Halteres":
      case "Supino Inclinado com Barra":
      case "Supino Inclinado com Halteres":
      case "Chest Press na Máquina":
      case "Crucifixo Reto com Halteres":
      case "Crucifixo Inclinado com Halteres":
      case "Cross Over na Polia Alta":
      case "Voador Peitoral":
      case "Puxada Frontal Pegada Aberta":
      case "Barra Fixa":
      case "Remada Curvada com Barra":
      case "Remada na Polia Baixa":
      case "Remada Unilateral com Halter":
      case "Remada Cavalinho com Barra":
      case "Desenvolvimento com Barra":
      case "Desenvolvimento com Halteres":
      case "Desenvolvimento na Máquina":
      case "Elevação Lateral com Halteres":
      case "Elevação Lateral na Polia Baixa":
      case "Crucifixo Inverso com Halteres":
      case "Crucifixo Inverso Inclinado":
      case "Face Pull na Polia Alta":
      case "Voador Invertido":
      case "Rosca Direta com Barra":
      case "Rosca Alternada com Halteres":
      case "Rosca Martelo com Halteres":
      case "Rosca Scott com Barra":
      case "Rosca Inclinada com Halteres":
      case "Rosca na Polia Baixa":
      case "Tríceps Pulley na Polia Alta":
      case "Tríceps Corda na Polia Alta":
      case "Extensão Overhead na Polia Baixa":
      case "Tríceps Testa com Barra":
      case "Tríceps Francês com Halteres":
      case "Agachamento com Barra":
      case "Agachamento Goblet com Halter":
      case "Agachamento com Halteres":
      case "Leg Press":
      case "Afundo com Halteres":
      case "Afundo Búlgaro com Halteres":
      case "Cadeira Extensora":
      case "Levantamento Terra Romeno":
      case "Stiff com Halteres":
      case "Mesa Flexora":
      case "Cadeira Flexora":
      case "Hip Thrust com Barra":
      case "Panturrilha em Pé com Barra":
      case "Panturrilha Sentado com Halteres":
      case "Panturrilha em Máquina":
      case "Prancha":
      case "Dead Bug":
      case "Abdominal Tradicional":
      case "Elevação de Joelhos":
      case "Prancha Lateral":
      case "Pallof Press na Polia":
        return 2;
      case "Supino Declinado com Barra":
      case "Supino Declinado com Halteres":
      case "Mergulho nas Paralelas":
      case "Supino Fechado com Barra":
      case "Agachamento Frontal com Barra":
      case "Pulldown Reto Braços Estendidos":
      case "Pulldown com Pegada Supinada":
      case "Panturrilha Sentado com Barra":
        return 1;
      default:
        return 0;
    }
  }

  private static boolean inferUnilateral(String nome) {
    String n = nome.toLowerCase(Locale.ROOT);
    return n.contains("unilateral")
        || n.contains("alternad")
        || n.contains("búlgaro")
        || n.contains("bulgaro")
        || n.contains("passada")
        || n.contains("concentrada")
        || n.contains("cruzada")
        || n.contains("prancha lateral")
        || n.contains("pallof");
  }

  private static String padraoDe(String porcao, String nome) {
    String n = nome.toLowerCase(Locale.ROOT);
    if (n.contains("prancha")
        || n.contains("dead bug")
        || n.contains("abdominal")
        || n.contains("pallof")
        || n.contains("elevação de joelhos")
        || n.contains("elevacao de joelhos")) {
      return "core";
    }
    if (n.contains("press pegada fechada")) {
      return "supino_horizontal";
    }
    if (n.contains("voador invertido")) {
      return "deltoide_posterior";
    }
    if (n.contains("voador")) {
      return "aducao_horizontal";
    }
    if (n.contains("leg press")) {
      return "agachamento";
    }
    if (n.contains("extensora")) {
      return "extensao_joelho";
    }
    if (n.contains("flexora")
        || n.contains("flexão de joelhos")
        || n.contains("flexao de joelhos")) {
      return "flexao_joelho";
    }
    if (n.contains("panturrilha")) {
      return "panturrilha";
    }
    if (n.contains("face pull")
        || n.contains("crucifixo inverso")
        || n.contains("elevação lateral curvado")
        || n.contains("elevacao lateral curvado")) {
      return "deltoide_posterior";
    }
    if (n.contains("rotação") || n.contains("rotacao")) {
      return "manguito";
    }
    if (n.contains("rosca martelo") || n.contains("rosca inversa")) {
      return "rosca_neutra";
    }
    if (n.contains("rosca")) {
      return "rosca";
    }
    if (n.contains("supino fechado")) {
      return "supino_fechado";
    }
    if (n.contains("testa") || n.contains("francês") || n.contains("frances") || n.contains("overhead")) {
      return "triceps_overhead";
    }
    if (n.contains("paralelas")) {
      return "supino_declinado";
    }
    if (n.contains("tríceps") || n.contains("triceps") || n.contains("mergulho")) {
      return "triceps_pushdown";
    }
    if (n.contains("elevação lateral") || n.contains("elevacao lateral")) {
      return "elevacao_lateral";
    }
    if (n.contains("elevação frontal") || n.contains("elevacao frontal")) {
      return "elevacao_frontal";
    }
    if (n.contains("desenvolvimento") || n.contains("arnold")) {
      return "desenvolvimento";
    }
    if (n.contains("agachamento")
        || n.contains("afundo")
        || n.contains("passada")
        || n.contains("sissy")) {
      return "agachamento";
    }
    if (n.contains("terra")
        || n.contains("stiff")
        || n.contains("good morning")
        || n.contains("nórdica")
        || n.contains("nordica")) {
      return "dobradica";
    }
    if (n.contains("hip thrust")
        || n.contains("ponte")
        || n.contains("elevação de quadril")
        || n.contains("elevacao de quadril")) {
      return "gluteo";
    }
    if (n.contains("abdução") || n.contains("abducao")) {
      return "abducao";
    }
    if (n.contains("braços estendidos")) {
      return "extensao_ombro";
    }
    if (n.contains("puxada") || n.contains("pulldown") || n.contains("barra fixa")) {
      return "puxada_vertical";
    }
    if (n.contains("remada alta")) {
      return "remada_alta";
    }
    if (n.contains("remada y")) {
      return "elevacao_y";
    }
    if (n.contains("remada")) {
      return "remada";
    }
    if (n.contains("crucifixo") || n.contains("cross over") || n.contains("abertura")) {
      return "aducao_horizontal";
    }
    if (n.contains("pullover")) {
      return "pullover";
    }
    if (n.contains("supino inclinado")) {
      return "supino_inclinado";
    }
    if (n.contains("supino declinado")) {
      return "supino_declinado";
    }
    if (n.contains("supino")
        || n.contains("chest press")
        || n.contains("flexão")
        || n.contains("flexao")) {
      return "supino_horizontal";
    }
    if (n.contains("extensão de tronco") || n.contains("extensao de tronco")) {
      return "lombar";
    }
    return porcao;
  }

  static {
    registrar(
        "PEITO",
        group(
            "superior",
            list(
                ex("Supino Inclinado com Barra", "Banco entre 30° e 45°, escápulas apoiadas, descer a barra com controle até a parte alta do peito", "banco", "barra"),
                ex("Supino Inclinado com Halteres", "Banco entre 30° e 45°, descer os halteres ao lado da parte alta do peito e empurrar sem bater um no outro", "banco", "halteres"),
                ex("Crucifixo Inclinado com Halteres", "Cotovelos levemente flexionados, abrir só até um alongamento confortável", "banco", "halteres")),
            "medio",
            list(
                ex("Supino Reto com Barra", "Barra na linha do meio do peito, escápulas retraídas e pés firmes no chão", "banco", "barra"),
                ex("Supino Reto com Halteres", "Descer os halteres ao lado do peito com os antebraços na vertical, na amplitude que conseguir controlar", "banco", "halteres"),
                ex("Flexão com Pés Elevados", "Corpo alinhado, descer até quase tocar o chão", "banco"),
                ex("Chest Press na Máquina", "Manoplas na altura do meio do peito, costas apoiadas, empurrar sem travar os cotovelos com força", "maquina")),
            "inferior",
            list(
                ex("Supino Declinado com Barra", "Pés presos no apoio, descer a barra com controle até a parte baixa do peito", "banco", "barra"),
                ex("Supino Declinado com Halteres", "Pés presos no apoio, descer os halteres ao lado da parte baixa do peito com controle", "banco", "halteres"),
                ex("Mergulho entre Bancos", "Tronco inclinado à frente, descer controlado", "banco"),
                ex("Mergulho nas Paralelas", "Tronco levemente inclinado à frente, descer só até onde os ombros permanecerem confortáveis", "paralelas")),
            "interno",
            list(
                ex("Crucifixo Reto com Halteres", "Cotovelos levemente flexionados, abrir até um alongamento confortável e voltar sem bater os halteres", "banco", "halteres"),
                ex("Cross Over na Polia Alta", "Tronco levemente inclinado, trazer as mãos de cima para baixo à frente do corpo", "polia_alta"),
                ex("Press Pegada Fechada com Halteres", "Halteres juntos durante todo movimento", "banco", "halteres"),
                ex("Voador Peitoral", "Cotovelos levemente flexionados, juntar os braços à frente do peito", "maquina")),
            "externo",
            list(
                ex("Supino com Halteres Abertura Ampla", "Descer até a linha do peito, sem ultrapassar uma amplitude dolorosa", "banco", "halteres"),
                ex("Abertura Inclinada com Halteres", "Cotovelos levemente flexionados, alongar só até a amplitude confortável", "banco", "halteres")),
            "estiramento",
            list(
                ex("Pullover com Halter", "Braços quase retos, descer atrás da cabeça só até onde os ombros permitirem", "banco", "halteres"),
                ex("Pullover Inclinado com Halter", "Banco a 30°, alongamento controlado", "banco", "halteres"))));

    registrar(
        "COSTAS",
        group(
            "lats_largura",
            list(
                ex("Puxada Frontal Pegada Aberta", "Puxar até a parte alta do peito, levando os cotovelos para baixo", "polia_alta"),
                ex("Remada Curvada Pegada Aberta", "Torso a 45°, puxar até abdômen", "barra"),
                ex("Pulldown com Pegada Supinada", "Pegada supinada na largura dos ombros, puxar até a parte alta do peito", "polia_alta"),
                ex("Barra Fixa", "Começar com os braços estendidos e subir até o queixo passar a barra, sem balanço", "barra")),
            "lats_espessura",
            list(
                ex("Remada Curvada com Barra", "Tronco inclinado com a coluna neutra, puxar a barra para a linha do umbigo", "barra"),
                ex("Remada Unilateral com Halter", "Joelho e mão no banco, puxar o halter em direção ao quadril", "banco", "halteres"),
                ex("Remada Cavalinho com Barra", "Tronco inclinado com a coluna neutra, puxar a pegada em direção ao abdômen", "barra")),
            "romboides",
            list(
                ex("Remada na Polia Baixa", "Puxar até o abdômen e aproximar as escápulas, sem jogar o tronco para trás", "polia_baixa"),
                ex("Remada Invertida", "Corpo suspenso, puxar peito até a barra", "barra"),
                ex("Remada Alta com Barra", "Puxar até a altura em que os ombros ficarem confortáveis", "barra")),
            "trapezio_medio",
            list(
                ex("Remada Alta na Polia Baixa", "Puxar até a altura em que os ombros ficarem confortáveis", "polia_baixa"),
                ex("Crucifixo Inverso com Halteres", "Tronco apoiado, abrir até a linha dos ombros sem arquear o pescoço", "banco", "halteres")),
            "trapezio_inferior",
            list(
                ex("Pulldown Reto Braços Estendidos", "Braços quase estendidos, levar a barra até perto das coxas", "polia_alta"),
                ex("Remada Y com Halteres", "Banco inclinado, braços em Y", "banco", "halteres")),
            "deltoide_posterior",
            list(
                ex("Crucifixo Inverso Inclinado", "Tronco a 45°, abrir lateralmente", "banco", "halteres"),
                ex("Face Pull na Polia Alta", "Puxar em direção ao rosto e girar os braços para fora no final, sem encolher os ombros", "polia_alta")),
            "lombar",
            list(
                ex("Levantamento Terra Romeno", "Joelhos levemente flexionados, descer com a coluna neutra até a barra passar os joelhos", "barra"),
                ex("Good Morning com Barra", "Barra nas costas, flexionar quadril mantendo costas retas", "barra"),
                ex("Extensão de Tronco no Banco", "Flexionar o quadril com a coluna neutra e subir até alinhar o corpo", "banco"))));

    registrar(
        "OMBROS",
        group(
            "anterior",
            list(
                ex("Desenvolvimento com Barra", "Descer a barra até perto da clavícula e subir sem arquear a lombar", "banco", "barra"),
                ex("Desenvolvimento com Halteres", "Descer os halteres até perto da altura dos ombros e empurrar acima da cabeça", "banco", "halteres"),
                ex("Elevação Frontal com Barra", "Subir até a altura dos ombros, controlar a descida", "barra"),
                ex("Elevação Frontal Alternada com Halteres", "Um braço por vez, evitar balanço", "halteres"),
                ex("Desenvolvimento na Máquina", "Costas apoiadas, empurrar à frente da linha dos ombros sem arquear a lombar", "maquina")),
            "lateral",
            list(
                ex("Elevação Lateral com Halteres", "Cotovelos levemente flexionados, subir até altura dos ombros", "halteres"),
                ex("Elevação Lateral na Polia Baixa", "Puxar lateralmente com o tronco estável", "polia_baixa"),
                ex("Desenvolvimento Arnold", "Girar as palmas durante a subida, com movimento controlado", "banco", "halteres")),
            "posterior",
            list(
                ex("Crucifixo Inverso com Halteres", "Tronco inclinado, abrir até a linha dos ombros sem arquear o pescoço", "banco", "halteres"),
                ex("Face Pull na Polia Alta", "Puxar a corda em direção ao rosto e girar os braços para fora no final, sem encolher os ombros", "polia_alta"),
                ex("Elevação Lateral Curvado", "Tronco paralelo ao chão, elevar lateralmente", "halteres"),
                ex("Voador Invertido", "Peito apoiado, abrir os braços até a linha dos ombros sem encolher o trapézio", "maquina")),
            "manguito",
            list(
                ex("Rotação Externa na Polia Baixa", "Cotovelo colado ao corpo, rotação externa lenta", "polia_baixa"),
                ex("Rotação L com Halteres", "Deitado de lado, rotação do antebraço", "banco", "halteres"))));

    registrar(
        "TRICEPS",
        group(
            "longa",
            list(
                ex("Tríceps Testa com Barra", "Cotovelos apontados para o teto, descer a barra até perto da testa", "banco", "barra"),
                ex("Tríceps Francês com Halteres", "Cotovelos apontados para cima, descer os halteres atrás da cabeça só até onde for confortável", "banco", "halteres"),
                ex("Extensão Overhead na Polia Baixa", "Costas para polia, estender acima da cabeça", "polia_baixa")),
            "medial",
            list(
                ex("Tríceps Pegada Invertida na Polia Alta", "Pegada supinada, cotovelos colados", "polia_alta"),
                ex("Tríceps Kickback com Halteres", "Tronco inclinado e braço paralelo ao corpo, estender o cotovelo sem mover o ombro", "banco", "halteres")),
            "lateral",
            list(
                ex("Tríceps Pulley na Polia Alta", "Cotovelos fixos, extensão completa", "polia_alta"),
                ex("Tríceps Corda na Polia Alta", "Cotovelos junto ao tronco, estender e afastar as pontas da corda no final", "polia_alta"),
                ex("Mergulho entre Bancos", "Tronco reto, descer até os cotovelos ficarem próximos de 90 graus", "banco"),
                ex("Supino Fechado com Barra", "Mãos na largura dos ombros e cotovelos perto do tronco", "banco", "barra"))));

    registrar(
        "BICEPS",
        group(
            "longa",
            list(
                ex("Rosca Direta com Barra", "Pegada supinada, cotovelos fixos", "barra"),
                ex("Rosca Inclinada com Halteres", "Costas apoiadas, descer até alongar o bíceps sem tirar os ombros do banco", "banco", "halteres"),
                ex("Rosca na Polia Baixa", "Cotovelos fixos, manter a tensão em toda a amplitude", "polia_baixa")),
            "curta",
            list(
                ex("Rosca Scott com Barra", "Braços apoiados, descer só até manter tensão sem estender o cotovelo por completo", "banco", "barra"),
                ex("Rosca Concentrada com Halter", "Cotovelo apoiado na coxa interna", "banco", "halteres"),
                ex("Rosca Alternada com Halteres", "Girar a palma para cima durante a subida, um braço por vez", "halteres")),
            "braquial",
            list(
                ex("Rosca Martelo com Halteres", "Pegada neutra, movimento controlado", "halteres"),
                ex("Rosca Inversa com Barra", "Pegada pronada, cotovelos ao lado do tronco", "barra")),
            "braquiorradial",
            list(
                ex("Rosca Inversa na Polia Baixa", "Pegada pronada, antebraço ativo", "polia_baixa"),
                ex("Rosca Martelo Cruzada", "Cruzar na frente do corpo", "halteres"))));

    registrar(
        "PERNAS",
        group(
            "quadriceps_completo",
            list(
                ex("Agachamento com Barra", "Descer até a profundidade que mantiver a coluna neutra, joelhos acompanhando os pés", "barra"),
                ex("Agachamento Frontal com Barra", "Barra na frente, tronco ereto", "barra"),
                ex("Afundo com Halteres", "Passo longo, descer até o joelho de trás se aproximar do chão", "halteres"),
                ex("Leg Press", "Pés na plataforma, descer até os joelhos acompanharem a direção dos pés", "maquina"),
                ex("Cadeira Extensora", "Estender os joelhos até alinhar a perna, sem impulso no final", "maquina")),
            "vasto_medial",
            list(
                ex("Afundo Búlgaro com Halteres", "Pé traseiro elevado, descer até o joelho de trás se aproximar do chão", "banco", "halteres"),
                ex("Agachamento Goblet com Halter", "Halter junto ao peito, descer até a profundidade confortável com o tronco estável", "halteres")),
            "vasto_lateral",
            list(
                ex("Agachamento Sumô com Halter", "Pés bem afastados, halter entre pernas", "halteres"),
                ex("Passada Lateral com Halteres", "Passo lateral, agachar no lado ativo", "halteres")),
            "reto_femoral",
            list(
                ex("Agachamento com Halteres", "Halteres ao lado do corpo, descer até a coxa ficar próxima da paralela", "halteres"),
                ex("Elevação de Quadril com Barra", "Costas no banco, barra no quadril", "banco", "barra")),
            "posteriores",
            list(
                ex("Levantamento Terra Romeno", "Joelhos levemente flexionados, descer com a coluna neutra até a barra passar os joelhos", "barra"),
                ex("Stiff com Halteres", "Joelhos levemente flexionados, descer até sentir os posteriores sem arredondar a coluna", "halteres"),
                ex("Flexão de Joelhos com o Peso do Corpo", "Pés fixos, descer só a amplitude que conseguir controlar e voltar sem impulso", "banco"),
                ex("Mesa Flexora", "Deitado, trazer o calcanhar sem erguer o quadril do banco", "maquina"),
                ex("Cadeira Flexora", "Sentado, flexionar os joelhos com a lombar apoiada", "maquina")),
            "gluteo_maximo",
            list(
                ex("Hip Thrust com Barra", "Costas no banco e barra apoiada no quadril, subir até alinhar o tronco sem arquear a lombar", "banco", "barra"),
                ex("Agachamento Sumô com Barra", "Pés afastados, descer até a amplitude confortável sem arredondar a lombar", "barra"),
                ex("Ponte de Glúteo Unilateral", "Uma perna por vez, contração no topo", "banco")),
            "gluteo_medio",
            list(
                ex("Abdução na Polia Baixa", "Lateral para polia, abrir perna lateralmente", "polia_baixa"),
                ex("Agachamento com Joelhos Estáveis", "Descer controlado e manter os joelhos acompanhando a direção dos pés", "halteres")),
            "gastrocnemio",
            list(
                ex("Panturrilha em Pé com Barra", "Barra nas costas, subir na ponta dos pés", "barra"),
                ex("Panturrilha em Máquina", "Ponta dos pés apoiada, subir sem quicar no final", "maquina"),
                ex("Panturrilha no Banco", "Pé no banco, halter na mão, subir", "banco", "halteres")),
            "soleo",
            list(
                ex("Panturrilha Sentado com Halteres", "Halteres nos joelhos, subir na ponta dos pés", "banco", "halteres"),
                ex("Panturrilha Sentado com Barra", "Barra apoiada nos joelhos com proteção, subir e descer sem quicar", "banco", "barra"))));

    registrar(
        "CORE",
        group(
            "estabilidade",
            list(
                ex(
                    "Prancha",
                    "Apoiar antebraços e pontas dos pés, manter quadril alinhado e respirar",
                    "peso_corporal"),
                ex(
                    "Dead Bug",
                    "Lombar apoiada no chão, estender braço e perna opostos sem arquear a coluna",
                    "peso_corporal"),
                ex(
                    "Abdominal Tradicional",
                    "Enrolar o tronco até tirar as escápulas do chão, sem puxar o pescoço",
                    "peso_corporal"),
                ex(
                    "Elevação de Joelhos",
                    "Levar os joelhos em direção ao tronco, sem balançar o corpo",
                    "peso_corporal"),
                ex(
                    "Prancha Lateral",
                    "Cotovelo sob o ombro e corpo alinhado, sem deixar o quadril cair",
                    "peso_corporal"),
                ex(
                    "Pallof Press na Polia",
                    "De lado para a polia, estender os braços à frente sem deixar o tronco girar",
                    "polia_media"))));
    ativarCatalogoPrincipal();
  }

  private static void ativarCatalogoPrincipal() {
    List<String> principais =
        Arrays.asList(
            "PEITO|Supino Reto com Barra",
            "PEITO|Supino Reto com Halteres",
            "PEITO|Supino Inclinado com Barra",
            "PEITO|Supino Inclinado com Halteres",
            "PEITO|Supino Declinado com Barra",
            "PEITO|Chest Press na Máquina",
            "PEITO|Crucifixo Reto com Halteres",
            "PEITO|Voador Peitoral",
            "PEITO|Cross Over na Polia Alta",
            "COSTAS|Puxada Frontal Pegada Aberta",
            "COSTAS|Pulldown com Pegada Supinada",
            "COSTAS|Barra Fixa",
            "COSTAS|Remada Curvada com Barra",
            "COSTAS|Remada Unilateral com Halter",
            "COSTAS|Remada na Polia Baixa",
            "COSTAS|Remada Cavalinho com Barra",
            "OMBROS|Desenvolvimento com Barra",
            "OMBROS|Desenvolvimento com Halteres",
            "OMBROS|Desenvolvimento na Máquina",
            "OMBROS|Elevação Lateral com Halteres",
            "OMBROS|Crucifixo Inverso com Halteres",
            "OMBROS|Voador Invertido",
            "OMBROS|Face Pull na Polia Alta",
            "TRICEPS|Tríceps Pulley na Polia Alta",
            "TRICEPS|Tríceps Corda na Polia Alta",
            "TRICEPS|Tríceps Testa com Barra",
            "TRICEPS|Tríceps Francês com Halteres",
            "TRICEPS|Mergulho entre Bancos",
            "BICEPS|Rosca Direta com Barra",
            "BICEPS|Rosca Alternada com Halteres",
            "BICEPS|Rosca Martelo com Halteres",
            "BICEPS|Rosca Scott com Barra",
            "PERNAS|Agachamento com Barra",
            "PERNAS|Leg Press",
            "PERNAS|Cadeira Extensora",
            "PERNAS|Mesa Flexora",
            "PERNAS|Cadeira Flexora",
            "PERNAS|Levantamento Terra Romeno",
            "PERNAS|Afundo com Halteres",
            "PERNAS|Afundo Búlgaro com Halteres",
            "PERNAS|Hip Thrust com Barra",
            "PERNAS|Panturrilha em Máquina",
            "PERNAS|Panturrilha Sentado com Halteres",
            "PERNAS|Agachamento Goblet com Halter",
            "CORE|Prancha",
            "CORE|Abdominal Tradicional",
            "CORE|Elevação de Joelhos",
            "CORE|Prancha Lateral",
            "CORE|Dead Bug");
    for (Exercise exercise : POR_ID.values()) {
      exercise.ativo = principais.contains(exercise.grupo + "|" + exercise.nome);
    }
  }
}
