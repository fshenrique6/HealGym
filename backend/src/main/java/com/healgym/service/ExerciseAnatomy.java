package com.healgym.service;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class ExerciseAnatomy {

  public static final Map<String, String> MUSCULOS = new LinkedHashMap<>();
  public static final Map<String, String> REGIOES = new LinkedHashMap<>();
  public static final Map<String, String> PADROES = new LinkedHashMap<>();
  public static final Map<String, String> EQUIPAMENTOS = new LinkedHashMap<>();
  public static final Map<String, String> CARGAS = new LinkedHashMap<>();

  static {
    MUSCULOS.put("peitoral", "Peitoral maior");
    MUSCULOS.put("dorsal", "Grande dorsal");
    MUSCULOS.put("costas_medias", "Romboides e trapézio médio");
    MUSCULOS.put("eretores", "Eretores da coluna");
    MUSCULOS.put("deltoide_anterior", "Deltoide anterior");
    MUSCULOS.put("deltoide_lateral", "Deltoide lateral");
    MUSCULOS.put("deltoide_posterior", "Deltoide posterior");
    MUSCULOS.put("trapezio_superior", "Trapézio superior");
    MUSCULOS.put("manguito", "Manguito rotador");
    MUSCULOS.put("triceps", "Tríceps braquial");
    MUSCULOS.put("biceps", "Bíceps braquial");
    MUSCULOS.put("braquial", "Braquial e braquiorradial");
    MUSCULOS.put("quadriceps", "Quadríceps");
    MUSCULOS.put("isquiotibiais", "Posteriores de coxa");
    MUSCULOS.put("gluteos", "Glúteos");
    MUSCULOS.put("adutores", "Adutores");
    MUSCULOS.put("abdutores", "Glúteo médio e abdutores");
    MUSCULOS.put("panturrilhas", "Panturrilhas");
    MUSCULOS.put("core", "Core");

    REGIOES.put("peitoral_clavicular", "Porção clavicular (superior)");
    REGIOES.put("peitoral_esternocostal", "Porção esternocostal (central)");
    REGIOES.put("peitoral_inferior", "Fibras inferiores (costais)");
    REGIOES.put("triceps_neutro", "Extensão com o braço ao lado do tronco");
    REGIOES.put("triceps_alongado", "Extensão com o braço acima da cabeça");
    REGIOES.put("dorsal_vertical", "Puxada vertical");
    REGIOES.put("costas_horizontal", "Remada horizontal");
    REGIOES.put("biceps_supinado", "Flexão do cotovelo com pegada supinada");
    REGIOES.put("braquial_neutro", "Pegada neutra ou pronada");
    REGIOES.put("isquio_quadril", "Extensão do quadril (dobradiça)");
    REGIOES.put("isquio_joelho", "Flexão do joelho");
    REGIOES.put("gastrocnemio", "Gastrocnêmio (joelho estendido)");
    REGIOES.put("soleo", "Sóleo (joelho flexionado)");
    REGIOES.put("core_antiextensao", "Antiextensão");
    REGIOES.put("core_lombopelvico", "Controle lombo-pélvico");
    REGIOES.put("core_flexao", "Flexão do tronco");
    REGIOES.put("core_lateral", "Controle lateral");
    REGIOES.put("core_antirrotacao", "Antirrotação");

    PADROES.put("supino_horizontal", "Empurrar horizontal");
    PADROES.put("supino_inclinado", "Empurrar inclinado");
    PADROES.put("supino_declinado", "Empurrar declinado");
    PADROES.put("aducao_horizontal", "Adução horizontal do ombro");
    PADROES.put("pullover", "Pullover");
    PADROES.put("puxada_vertical", "Puxada vertical");
    PADROES.put("remada", "Remada horizontal");
    PADROES.put("remada_alta", "Remada alta");
    PADROES.put("extensao_ombro", "Extensão do ombro");
    PADROES.put("elevacao_y", "Elevação em Y");
    PADROES.put("deltoide_posterior", "Abdução horizontal do ombro");
    PADROES.put("elevacao_lateral", "Abdução do ombro");
    PADROES.put("desenvolvimento", "Empurrar vertical");
    PADROES.put("elevacao_frontal", "Flexão do ombro");
    PADROES.put("manguito", "Rotação externa do ombro");
    PADROES.put("triceps_pushdown", "Extensão de tríceps na polia");
    PADROES.put("triceps_overhead", "Extensão de tríceps acima da cabeça");
    PADROES.put("supino_fechado", "Empurrar com pegada fechada");
    PADROES.put("rosca", "Flexão do cotovelo");
    PADROES.put("rosca_neutra", "Flexão do cotovelo com pegada neutra");
    PADROES.put("agachamento", "Dominante de joelho");
    PADROES.put("extensao_joelho", "Extensão do joelho");
    PADROES.put("dobradica", "Dominante de quadril");
    PADROES.put("flexao_joelho", "Flexão do joelho");
    PADROES.put("gluteo", "Extensão do quadril");
    PADROES.put("abducao", "Abdução do quadril");
    PADROES.put("panturrilha", "Flexão plantar");
    PADROES.put("core", "Estabilização do tronco");
    PADROES.put("lombar", "Extensão do tronco");

    EQUIPAMENTOS.put("banco", "Banco");
    EQUIPAMENTOS.put("barra", "Barra");
    EQUIPAMENTOS.put("halteres", "Halteres");
    EQUIPAMENTOS.put("maquina", "Máquina");
    EQUIPAMENTOS.put("polia_alta", "Polia alta");
    EQUIPAMENTOS.put("polia_baixa", "Polia baixa");
    EQUIPAMENTOS.put("polia_media", "Polia na altura do peito");
    EQUIPAMENTOS.put("paralelas", "Barras paralelas");
    EQUIPAMENTOS.put("peso_corporal", "Peso corporal");

    CARGAS.put("barra_total", "Carga total (barra + anilhas)");
    CARGAS.put("por_halter", "Carga de cada halter");
    CARGAS.put("halter_unico", "Carga do halter");
    CARGAS.put("maquina", "Carga indicada no aparelho");
    CARGAS.put("polia", "Carga indicada na polia");
    CARGAS.put("peso_corporal", "Peso corporal (carga extra opcional)");
  }

  private ExerciseAnatomy() {}

  public static String rotuloPadrao(String padrao) {
    String rotulo = PADROES.get(padrao);
    return rotulo == null ? humanizar(padrao) : rotulo;
  }

  public static String rotuloMusculo(String codigo) {
    String rotulo = MUSCULOS.get(codigo);
    return rotulo == null ? humanizar(codigo) : rotulo;
  }

  public static String rotuloEquipamentos(List<String> equipamento) {
    StringBuilder texto = new StringBuilder();
    for (String item : equipamento) {
      if (texto.length() > 0) {
        texto.append(", ");
      }
      String rotulo = EQUIPAMENTOS.get(item);
      texto.append(rotulo == null ? humanizar(item) : rotulo);
    }
    return texto.toString();
  }

  public static String humanizar(String codigo) {
    if (codigo == null || codigo.isEmpty()) {
      return "";
    }
    String texto = codigo.replace('_', ' ');
    return Character.toUpperCase(texto.charAt(0)) + texto.substring(1);
  }

  private static List<String> l(String... valores) {
    return Collections.unmodifiableList(Arrays.asList(valores));
  }

  static void aplicar(ExerciseDatabase.Exercise e) {
    String n = e.nome.toLowerCase(Locale.ROOT);
    List<String> eq = e.equipamento;
    boolean barra = eq.contains("barra");
    boolean halteres = eq.contains("halteres");
    boolean maquina = eq.contains("maquina");
    boolean polia = false;
    for (String item : eq) {
      if (item.startsWith("polia")) {
        polia = true;
      }
    }
    e.tipoCarga = tipoCarga(n, barra, halteres, maquina, polia);
    switch (e.padrao) {
      case "supino_horizontal":
        definir(e, "peitoral", l("triceps", "deltoide_anterior"), l("peitoral_esternocostal"),
            l("peitoral_clavicular", "peitoral_inferior"), "Porção esternocostal");
        if (barra) {
          tecnica(e, "Mantenha as escápulas apoiadas e desça a barra até a linha média do peito, na amplitude que conseguir controlar.",
              "Tirar o quadril do banco ou deixar a barra quicar no peito.");
        } else if (halteres) {
          tecnica(e, "Desça os halteres ao lado do peito com os antebraços na vertical, na amplitude que conseguir controlar.",
              "Deixar os cotovelos abrirem demais ou perder o controle dos halteres na descida.");
        } else if (maquina) {
          tecnica(e, "Ajuste o banco para as manoplas ficarem na altura do meio do peito e mantenha as costas no encosto.",
              "Banco desregulado, com as manoplas altas demais, ou tirar as costas do encosto para empurrar.");
        } else {
          tecnica(e, "Mantenha o corpo alinhado da cabeça aos pés, com as mãos um pouco mais abertas que os ombros.",
              "Deixar o quadril cair ou subir durante a repetição.");
        }
        break;
      case "supino_inclinado":
        definir(e, "peitoral", l("deltoide_anterior", "triceps"), l("peitoral_clavicular"),
            l("peitoral_esternocostal"), "Porção clavicular (superior)");
        if (barra) {
          tecnica(e, "Use o banco entre 30° e 45° e desça a barra até a parte alta do peito, com as escápulas apoiadas.",
              "Inclinar demais o banco, transferindo o esforço para os ombros, ou tirar o quadril do banco.");
        } else if (halteres) {
          tecnica(e, "Use o banco entre 30° e 45° e desça os halteres ao lado da parte alta do peito, com os antebraços na vertical.",
              "Bater os halteres no topo ou deixar os cotovelos caírem sem controle na descida.");
        } else {
          tecnica(e, "Ajuste o assento para as manoplas ficarem na altura da parte alta do peito.",
              "Tirar as costas do encosto para completar a repetição.");
        }
        break;
      case "supino_declinado":
        definir(e, "peitoral", l("triceps", "deltoide_anterior"), l("peitoral_inferior"),
            l("peitoral_esternocostal"), "Fibras inferiores (costais)");
        if (n.contains("paralelas")) {
          tecnica(e, "Incline levemente o tronco à frente e desça só até onde os ombros permanecerem confortáveis.",
              "Descer além do confortável para os ombros ou balançar o corpo para subir.");
        } else if (barra) {
          tecnica(e, "Com os pés presos no apoio, desça a barra com controle até a parte baixa do peito.",
              "Deixar a barra descer em direção ao pescoço.");
        } else {
          tecnica(e, "Com os pés presos no apoio, desça os halteres ao lado da parte baixa do peito.",
              "Perder o controle dos halteres no fim da descida.");
        }
        break;
      case "aducao_horizontal":
        if (n.contains("inclinad")) {
          definir(e, "peitoral", l("deltoide_anterior"), l("peitoral_clavicular"),
              l("peitoral_esternocostal"), "Adução horizontal com banco inclinado");
        } else if (n.contains("polia alta")) {
          definir(e, "peitoral", l("deltoide_anterior"), l("peitoral_inferior"),
              l("peitoral_esternocostal"), "Adução de cima para baixo");
        } else {
          definir(e, "peitoral", l("deltoide_anterior"), l("peitoral_esternocostal"),
              l(), "Adução horizontal do ombro");
        }
        if (maquina) {
          tecnica(e, "Ajuste o banco para as manoplas ficarem na altura do peito e junte os braços sem bater as placas.",
              "Projetar os ombros à frente no final ou soltar o peso na volta.");
        } else if (polia) {
          tecnica(e, "Incline levemente o tronco e traga as mãos de cima para baixo à frente do quadril, com os cotovelos levemente flexionados.",
              "Usar o tronco para puxar ou dobrar demais os cotovelos.");
        } else {
          tecnica(e, "Mantenha os cotovelos levemente flexionados e fixos e abra só até sentir um alongamento confortável no peito.",
              "Estender os cotovelos e transformar o movimento num supino, ou descer além do confortável.");
        }
        break;
      case "pullover":
        definir(e, "dorsal", l("peitoral", "triceps"), l("dorsal_vertical"), l(), "Extensão do ombro");
        tecnica(e, "Desça os braços atrás da cabeça só até onde os ombros permitirem, sem arquear a lombar.",
            "Dobrar os cotovelos e transformar o movimento numa extensão de tríceps.");
        break;
      case "puxada_vertical":
        definir(e, "dorsal", l("biceps", "costas_medias", "braquial"), l("dorsal_vertical"), l(),
            "Puxada vertical");
        if (n.contains("barra fixa")) {
          tecnica(e, "Comece com os braços estendidos e suba até o queixo passar a barra, sem balançar o corpo.",
              "Usar impulso das pernas ou descer só até a metade.");
        } else {
          tecnica(e, "Puxe a barra até a parte alta do peito, levando os cotovelos para baixo, com o tronco quase vertical.",
              "Puxar atrás da nuca, balançar o tronco ou encolher os ombros.");
        }
        break;
      case "remada":
        definir(e, "costas_medias", l("dorsal", "biceps", "deltoide_posterior"), l("costas_horizontal"),
            l(), "Remada horizontal");
        if (n.contains("unilateral")) {
          tecnica(e, "Com mão e joelho apoiados no banco, puxe o halter em direção ao quadril.",
              "Girar o tronco para subir a carga.");
        } else if (polia) {
          tecnica(e, "Mantenha a coluna neutra, puxe até o abdômen e aproxime as escápulas.",
              "Jogar o tronco para trás para completar a repetição.");
        } else if (n.contains("invertida")) {
          tecnica(e, "Com o corpo alinhado, puxe o peito em direção à barra.",
              "Deixar o quadril cair durante a puxada.");
        } else {
          tecnica(e, "Incline o tronco com a coluna neutra e puxe a barra em direção ao abdômen.",
              "Arredondar a lombar ou levantar o tronco a cada repetição.");
        }
        break;
      case "remada_alta":
        definir(e, "deltoide_lateral", l("trapezio_superior"), l(), l(), "Abdução com rotação interna");
        tecnica(e, "Suba só até a altura em que os ombros ficarem confortáveis.",
            "Puxar acima da linha dos ombros com desconforto.");
        break;
      case "extensao_ombro":
        definir(e, "dorsal", l("triceps"), l("dorsal_vertical"), l(), "Extensão do ombro com braços estendidos");
        tecnica(e, "Com os braços quase estendidos, leve a barra até perto das coxas sem mover o tronco.",
            "Dobrar os cotovelos e transformar o movimento numa extensão de tríceps.");
        break;
      case "elevacao_y":
        definir(e, "costas_medias", l("deltoide_posterior"), l(), l(), "Trapézio inferior");
        tecnica(e, "Com o peito apoiado no banco inclinado, eleve os braços em Y com carga leve.",
            "Encolher os ombros durante a elevação.");
        break;
      case "deltoide_posterior":
        if (n.contains("face pull")) {
          definir(e, "deltoide_posterior", l("costas_medias", "manguito"), l(), l(), "Abdução horizontal com rotação externa");
          tecnica(e, "Puxe a corda em direção ao rosto, afastando as mãos e girando os braços para fora no final.",
              "Puxar com o tronco ou encolher os ombros.");
        } else if (maquina) {
          definir(e, "deltoide_posterior", l("costas_medias"), l(), l(), "Abdução horizontal do ombro");
          tecnica(e, "Com o peito apoiado, abra os braços até a linha dos ombros.",
              "Encolher o trapézio ou usar impulso.");
        } else {
          definir(e, "deltoide_posterior", l("costas_medias"), l(), l(), "Abdução horizontal do ombro");
          tecnica(e, "Mantenha o tronco apoiado ou inclinado com a coluna neutra e abra até a linha dos ombros.",
              "Levantar o tronco ou usar uma carga que obrigue a balançar.");
        }
        break;
      case "elevacao_lateral":
        definir(e, "deltoide_lateral", l(), l(), l(), "Abdução do ombro");
        if (polia) {
          tecnica(e, "Puxe lateralmente com o cotovelo levemente flexionado, mantendo o tronco estável.",
              "Inclinar o tronco para longe da polia para ajudar.");
        } else {
          tecnica(e, "Suba até a altura dos ombros com os cotovelos levemente flexionados.",
              "Encolher o pescoço ou usar impulso do corpo.");
        }
        break;
      case "desenvolvimento":
        definir(e, "deltoide_anterior", l("deltoide_lateral", "triceps"), l(), l(), "Empurrar vertical");
        if (n.contains("arnold")) {
          tecnica(e, "Gire as palmas durante a subida, com movimento controlado.",
              "Acelerar a rotação e perder o controle.");
        } else if (barra) {
          tecnica(e, "Desça a barra até perto da clavícula e empurre acima da cabeça sem arquear a lombar.",
              "Arquear a lombar ou empurrar a barra muito à frente do rosto.");
        } else if (maquina) {
          tecnica(e, "Ajuste o banco para as manoplas ficarem na altura dos ombros e empurre sem tirar as costas do encosto.",
              "Assento baixo demais ou travar os cotovelos com força.");
        } else {
          tecnica(e, "Desça os halteres até perto da altura dos ombros e empurre acima da cabeça.",
              "Arquear a lombar ou abrir demais os cotovelos.");
        }
        break;
      case "elevacao_frontal":
        definir(e, "deltoide_anterior", l(), l(), l(), "Flexão do ombro");
        tecnica(e, "Suba até a altura dos ombros sem balançar o tronco.", "Usar impulso do tronco.");
        break;
      case "manguito":
        definir(e, "manguito", l("deltoide_posterior"), l(), l(), "Rotação externa do ombro");
        tecnica(e, "Mantenha o cotovelo junto ao corpo e use carga leve, com movimento lento.",
            "Afastar o cotovelo do tronco.");
        break;
      case "triceps_pushdown":
        if (n.contains("mergulho")) {
          definir(e, "triceps", l("peitoral", "deltoide_anterior"), l("triceps_neutro"), l(), "Extensão do cotovelo com o peso corporal");
          tecnica(e, "Mantenha o tronco perto do banco e desça até os cotovelos ficarem próximos de 90°.",
              "Descer além do confortável para os ombros.");
        } else if (n.contains("kickback")) {
          definir(e, "triceps", l(), l("triceps_neutro"), l(), "Extensão do cotovelo com o braço junto ao tronco");
          tecnica(e, "Com o braço paralelo ao tronco, estenda o cotovelo sem mover o ombro.",
              "Balançar o braço para levantar a carga.");
        } else {
          definir(e, "triceps", l(), l("triceps_neutro"), l(), "Extensão do cotovelo com o braço junto ao tronco");
          tecnica(e, n.contains("corda")
                  ? "Mantenha os cotovelos junto ao tronco, estenda e afaste as pontas da corda no final."
                  : "Mantenha os cotovelos junto ao tronco e estenda até alinhar o braço, sem mover o ombro.",
              "Deixar os cotovelos irem para a frente ou usar o tronco para empurrar.");
        }
        break;
      case "triceps_overhead":
        definir(e, "triceps", l(), l("triceps_alongado"), l(), "Extensão do cotovelo com o braço acima da cabeça");
        if (polia) {
          tecnica(e, "De costas para a polia, com os cotovelos apontados para a frente, estenda acima da cabeça.",
              "Abrir os cotovelos ou arquear a lombar.");
        } else if (barra) {
          tecnica(e, "Com os cotovelos apontados para o teto, desça a barra até perto da testa.",
              "Deixar os cotovelos abrirem ou mover os ombros.");
        } else {
          tecnica(e, "Com os cotovelos apontados para cima, desça os halteres atrás da cabeça só até onde for confortável.",
              "Abrir os cotovelos ou arquear a lombar.");
        }
        break;
      case "supino_fechado":
        definir(e, "triceps", l("peitoral", "deltoide_anterior"), l("triceps_neutro"), l(), "Empurrar com pegada fechada");
        tecnica(e, "Mãos na largura dos ombros e cotovelos perto do tronco durante a descida.",
            "Pegada estreita demais, forçando os punhos.");
        break;
      case "rosca":
        definir(e, "biceps", l("braquial"), l("biceps_supinado"), l(), "Flexão do cotovelo com pegada supinada");
        if (n.contains("inclinada")) {
          tecnica(e, "Com as costas apoiadas no banco inclinado, desça até alongar sem tirar os ombros do banco.",
              "Tirar os ombros do banco para subir a carga.");
        } else if (n.contains("scott")) {
          tecnica(e, "Com os braços apoiados, desça com controle sem estender o cotovelo por completo sob carga.",
              "Soltar a descida e estender o cotovelo de forma brusca.");
        } else if (n.contains("alternada")) {
          tecnica(e, "Um braço por vez, girando a palma para cima durante a subida.",
              "Balançar o corpo para completar a repetição.");
        } else if (polia) {
          tecnica(e, "Mantenha os cotovelos fixos e a tensão em toda a amplitude.",
              "Afastar os cotovelos do tronco.");
        } else {
          tecnica(e, "Mantenha os cotovelos ao lado do tronco e suba sem balançar.",
              "Jogar o tronco para trás para levantar a carga.");
        }
        break;
      case "rosca_neutra":
        definir(e, "braquial", l("biceps"), l("braquial_neutro"), l(), "Pegada neutra ou pronada");
        tecnica(e, "Mantenha os punhos firmes e os cotovelos ao lado do tronco.",
            "Balançar o corpo para completar a repetição.");
        break;
      case "agachamento":
        boolean unilateral = n.contains("afundo") || n.contains("búlgaro") || n.contains("passada");
        definir(e, "quadriceps", l("gluteos", "adutores"), l(), l(),
            unilateral ? "Dominante de joelho, unilateral" : "Dominante de joelho");
        if (n.contains("leg press")) {
          tecnica(e, "Mantenha lombar e quadril apoiados e desça só até onde o quadril não sair do encosto.",
              "Descer tanto que a lombar descola do encosto, ou travar os joelhos com força no topo.");
        } else if (n.contains("frontal")) {
          tecnica(e, "Barra apoiada na frente dos ombros, cotovelos altos e tronco ereto.",
              "Deixar os cotovelos caírem e o tronco tombar à frente.");
        } else if (n.contains("goblet")) {
          tecnica(e, "Segure o halter junto ao peito e desça mantendo o tronco ereto e os calcanhares no chão.",
              "Tirar os calcanhares do chão ou deixar os joelhos fecharem.");
        } else if (unilateral) {
          tecnica(e, "Com o tronco estável, desça até o joelho de trás se aproximar do chão, com o joelho da frente na direção do pé.",
              "Deixar o joelho da frente cair para dentro.");
        } else if (n.contains("sumô")) {
          tecnica(e, "Pés afastados com as pontas para fora e joelhos na direção dos pés.",
              "Deixar os joelhos fecharem na subida.");
        } else if (barra) {
          tecnica(e, "Barra apoiada no trapézio; desça com os joelhos acompanhando os pés até a profundidade que mantiver a coluna neutra.",
              "Deixar os joelhos fecharem ou arredondar a lombar no fundo.");
        } else {
          tecnica(e, "Com os halteres ao lado do corpo, desça com o tronco estável e os joelhos na direção dos pés.",
              "Tirar os calcanhares do chão ou deixar os joelhos fecharem.");
        }
        break;
      case "extensao_joelho":
        definir(e, "quadriceps", l(), l(), l(), "Extensão do joelho");
        tecnica(e, "Ajuste o encosto para o joelho alinhar com o eixo da máquina e estenda sem impulso.",
            "Tirar o quadril do banco ou soltar o peso na descida.");
        break;
      case "dobradica":
        definir(e, "isquiotibiais", l("gluteos", "eretores"), l("isquio_quadril"), l(), "Dominante de quadril (dobradiça)");
        if (n.contains("good morning")) {
          tecnica(e, "Com a barra no trapézio, incline o tronco levando o quadril para trás com a coluna neutra.",
              "Usar carga alta e arredondar a coluna.");
        } else if (halteres) {
          tecnica(e, "Com os halteres junto às coxas, leve o quadril para trás mantendo a coluna neutra.",
              "Arredondar a coluna para descer mais.");
        } else {
          tecnica(e, "Com os joelhos levemente flexionados, leve o quadril para trás e desça a barra junto às pernas com a coluna neutra.",
              "Arredondar a lombar ou afastar a barra do corpo.");
        }
        break;
      case "flexao_joelho":
        definir(e, "isquiotibiais", l(), l("isquio_joelho"), l(), "Flexão do joelho");
        if (n.contains("mesa")) {
          tecnica(e, "Deitado com o quadril apoiado, traga o rolo em direção ao glúteo.",
              "Erguer o quadril do banco durante a flexão.");
        } else if (n.contains("cadeira")) {
          tecnica(e, "Com a lombar apoiada e a coxa presa, flexione os joelhos sem impulso.",
              "Soltar o peso na volta.");
        } else {
          tecnica(e, "Com os pés presos, desça devagar só a amplitude que conseguir controlar.",
              "Cair sem controle na descida.");
        }
        break;
      case "gluteo":
        definir(e, "gluteos", l("isquiotibiais"), l(), l(), "Extensão do quadril");
        tecnica(e, "Com as costas apoiadas no banco, suba o quadril até alinhar com o tronco, sem arquear a lombar.",
            "Hiperestender a lombar no topo.");
        break;
      case "abducao":
        definir(e, "abdutores", l(), l(), l(), "Abdução do quadril");
        tecnica(e, "Mantenha o tronco estável e afaste a perna sem girar o quadril.", "Inclinar o tronco para ajudar.");
        break;
      case "panturrilha":
        boolean sentado = n.contains("sentado");
        definir(e, "panturrilhas", l(), l(sentado ? "soleo" : "gastrocnemio"), l(),
            sentado ? "Flexão plantar com joelho flexionado" : "Flexão plantar com joelho estendido");
        tecnica(e, "Desça até alongar e suba na ponta dos pés, sem quicar no fundo.",
            "Encurtar a amplitude ou quicar no fim da descida.");
        break;
      case "core":
        if (n.contains("prancha lateral")) {
          definir(e, "core", l(), l("core_lateral"), l(), "Controle lateral");
          tecnica(e, "Cotovelo sob o ombro e corpo alinhado, respirando durante a sustentação.",
              "Deixar o quadril cair.");
        } else if (n.contains("prancha")) {
          definir(e, "core", l(), l("core_antiextensao"), l(), "Antiextensão");
          tecnica(e, "Antebraços sob os ombros, quadril alinhado e respiração contínua.",
              "Deixar o quadril cair ou subir demais.");
        } else if (n.contains("dead bug")) {
          definir(e, "core", l(), l("core_lombopelvico"), l(), "Controle lombo-pélvico");
          tecnica(e, "Com a lombar apoiada no chão, estenda braço e perna opostos devagar.",
              "Arquear a lombar ao estender a perna.");
        } else if (n.contains("pallof")) {
          definir(e, "core", l(), l("core_antirrotacao"), l(), "Antirrotação");
          tecnica(e, "De lado para a polia, estenda os braços à frente sem deixar o tronco girar.",
              "Girar o tronco em direção à polia.");
        } else {
          definir(e, "core", l(), l("core_flexao"), l(), "Flexão do tronco");
          tecnica(e, n.contains("joelhos")
                  ? "Leve os joelhos em direção ao tronco sem balançar o corpo."
                  : "Enrole o tronco até tirar as escápulas do chão, sem puxar o pescoço.",
              n.contains("joelhos") ? "Usar impulso para subir as pernas." : "Puxar a cabeça com as mãos.");
        }
        break;
      case "lombar":
        definir(e, "eretores", l("gluteos", "isquiotibiais"), l(), l(), "Extensão do tronco");
        tecnica(e, "Suba até alinhar o corpo, sem passar dessa linha.", "Hiperestender a lombar no topo.");
        break;
      default:
        definir(e, null, l(), l(), l(), null);
        break;
    }
  }

  private static String tipoCarga(String n, boolean barra, boolean halteres, boolean maquina, boolean polia) {
    if (maquina) {
      return "maquina";
    }
    if (polia) {
      return "polia";
    }
    if (n.contains("barra fixa")
        || n.contains("invertida")
        || n.contains("mergulho")
        || n.contains("flexão com")
        || n.contains("peso do corpo")) {
      return "peso_corporal";
    }
    if (barra) {
      return "barra_total";
    }
    if (halteres) {
      return n.contains("halteres") ? "por_halter" : "halter_unico";
    }
    return "peso_corporal";
  }

  private static void definir(
      ExerciseDatabase.Exercise e,
      String principal,
      List<String> secundarios,
      List<String> regioes,
      List<String> regioesSecundarias,
      String enfase) {
    e.principal = principal;
    e.secundarios = secundarios;
    e.regioes = regioes;
    e.regioesSecundarias = regioesSecundarias;
    e.enfase = enfase;
  }

  private static void tecnica(ExerciseDatabase.Exercise e, String cuidado, String erro) {
    e.cuidado = cuidado;
    e.erroComum = erro;
  }
}
