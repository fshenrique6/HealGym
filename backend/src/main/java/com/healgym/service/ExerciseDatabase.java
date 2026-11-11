package com.healgym.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ExerciseDatabase {

  public static final class Exercise {
    public final String id;
    public final String nome;
    public final String tecnica;
    public final List<String> equipamento;
    public final String padrao;
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

    Exercise(
        String id,
        String nome,
        String tecnica,
        List<String> equipamento,
        String padrao,
        int dificuldade,
        boolean composto,
        boolean unilateral,
        int fundamento,
        String tipoCarga,
        String cuidado,
        String erroComum) {
      this.id = id;
      this.nome = nome;
      this.tecnica = tecnica;
      this.equipamento = Collections.unmodifiableList(new ArrayList<>(equipamento));
      this.padrao = padrao;
      this.dificuldade = dificuldade;
      this.composto = composto;
      this.unilateral = unilateral;
      this.fundamento = fundamento;
      this.tipoCarga = tipoCarga;
      this.cuidado = cuidado;
      this.erroComum = erroComum;
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

  private static Exercise ex(
      String id,
      String nome,
      String tecnica,
      String padrao,
      int dificuldade,
      boolean composto,
      boolean unilateral,
      int fundamento,
      String tipoCarga,
      String... equipamento) {
    return new Exercise(
        id,
        nome,
        tecnica,
        Arrays.asList(equipamento),
        padrao,
        dificuldade,
        composto,
        unilateral,
        fundamento,
        tipoCarga,
        null,
        null);
  }

  private static Exercise texto(Exercise exercicio, String cuidado, String erro) {
    exercicio.cuidado = cuidado;
    exercicio.erroComum = erro;
    return exercicio;
  }

  private static void registrar(String grupo, Exercise... exercicios) {
    Map<String, List<Exercise>> porPadrao = new LinkedHashMap<>();
    for (Exercise exercicio : exercicios) {
      String carga = exercicio.tipoCarga;
      String cuidado = exercicio.cuidado;
      String erro = exercicio.erroComum;
      exercicio.grupo = grupo;
      exercicio.ativo = true;
      ExerciseAnatomy.aplicar(exercicio);
      exercicio.tipoCarga = carga;
      if (cuidado != null) {
        exercicio.cuidado = cuidado;
      }
      if (erro != null) {
        exercicio.erroComum = erro;
      }
      if (exercicio.principal == null || exercicio.padrao == null) {
        throw new IllegalStateException("Metadado ausente em " + exercicio.id);
      }
      Exercise anterior = POR_ID.putIfAbsent(exercicio.id, exercicio);
      if (anterior != null) {
        throw new IllegalStateException("ID duplicado: " + exercicio.id);
      }
      porPadrao.computeIfAbsent(exercicio.padrao, chave -> new ArrayList<>()).add(exercicio);
    }
    DATABASE.put(grupo, porPadrao);
  }

  static {
    registrar(
        "PEITO",
        ex(
            "medio-supino-reto-com-barra",
            "Supino Reto com Barra",
            "Barra na linha do meio do peito, escápulas apoiadas e pés firmes no chão",
            "supino_horizontal",
            2,
            true,
            false,
            2,
            "barra_total",
            "banco",
            "barra"),
        ex(
            "medio-supino-reto-com-halteres",
            "Supino Reto com Halteres",
            "Desça os halteres ao lado do peito, com os antebraços na vertical",
            "supino_horizontal",
            1,
            true,
            false,
            2,
            "por_halter",
            "banco",
            "halteres"),
        ex(
            "superior-supino-inclinado-com-barra",
            "Supino Inclinado com Barra",
            "Banco entre 30° e 45°, descendo a barra até a parte alta do peito",
            "supino_inclinado",
            2,
            true,
            false,
            2,
            "barra_total",
            "banco",
            "barra"),
        ex(
            "superior-supino-inclinado-com-halteres",
            "Supino Inclinado com Halteres",
            "Banco entre 30° e 45°, descendo os halteres ao lado da parte alta do peito",
            "supino_inclinado",
            1,
            true,
            false,
            2,
            "por_halter",
            "banco",
            "halteres"),
        ex(
            "inferior-supino-declinado-com-barra",
            "Supino Declinado com Barra",
            "Pés presos no apoio, desça a barra com controle até a parte baixa do peito",
            "supino_declinado",
            2,
            true,
            false,
            1,
            "barra_total",
            "banco",
            "barra"),
        ex(
            "inferior-supino-declinado-com-halteres",
            "Supino Declinado com Halteres",
            "Pés presos no apoio, desça os halteres ao lado da parte baixa do peito",
            "supino_declinado",
            2,
            true,
            false,
            1,
            "por_halter",
            "banco",
            "halteres"),
        ex(
            "interno-crucifixo-reto-com-halteres",
            "Crucifixo Reto com Halteres",
            "Cotovelos levemente flexionados e fixos, abrindo só até um alongamento confortável",
            "aducao_horizontal",
            1,
            false,
            false,
            2,
            "por_halter",
            "banco",
            "halteres"),
        ex(
            "interno-cross-over-na-polia-alta",
            "Cross Over na Polia Alta",
            "Tronco levemente inclinado, trazendo as mãos de cima para baixo à frente do corpo",
            "aducao_horizontal",
            1,
            false,
            false,
            2,
            "polia",
            "polia_alta"),
        ex(
            "interno-voador-peitoral",
            "Voador Peitoral",
            "Cotovelos levemente flexionados, juntando os braços à frente do peito",
            "aducao_horizontal",
            1,
            false,
            false,
            2,
            "maquina",
            "maquina"));

    registrar(
        "COSTAS",
        ex(
            "lats_largura-puxada-frontal-pegada-aberta",
            "Puxada Frontal Pegada Aberta",
            "Puxe a barra até a parte alta do peito, levando os cotovelos para baixo",
            "puxada_vertical",
            1,
            true,
            false,
            2,
            "polia",
            "polia_alta"),
        ex(
            "lats_largura-pulldown-com-pegada-supinada",
            "Pulldown com Pegada Supinada",
            "Pegada supinada na largura dos ombros, puxando até a parte alta do peito",
            "puxada_vertical",
            1,
            true,
            false,
            1,
            "polia",
            "polia_alta"),
        ex(
            "lats_largura-barra-fixa",
            "Barra Fixa",
            "Comece com os braços estendidos e suba até o queixo passar a barra, sem balanço",
            "puxada_vertical",
            3,
            true,
            false,
            1,
            "peso_corporal",
            "barra_fixa"),
        ex(
            "lats_espessura-remada-curvada-com-barra",
            "Remada Curvada com Barra",
            "Tronco inclinado com a coluna neutra, puxando a barra até a linha do umbigo",
            "remada",
            2,
            true,
            false,
            2,
            "barra_total",
            "barra"),
        ex(
            "lats_espessura-remada-unilateral-com-halter",
            "Remada Unilateral com Halter",
            "Joelho e mão no banco, puxando o halter em direção ao quadril",
            "remada",
            1,
            true,
            true,
            2,
            "por_halter",
            "banco",
            "halteres"),
        ex(
            "romboides-remada-na-polia-baixa",
            "Remada na Polia Baixa",
            "Puxe até o abdômen e aproxime as escápulas, sem jogar o tronco para trás",
            "remada",
            1,
            true,
            false,
            2,
            "polia",
            "polia_baixa"));

    registrar(
        "OMBROS",
        ex(
            "anterior-desenvolvimento-com-barra",
            "Desenvolvimento com Barra",
            "Desça a barra até perto da clavícula e suba sem arquear a lombar",
            "desenvolvimento",
            2,
            true,
            false,
            2,
            "barra_total",
            "banco",
            "barra"),
        ex(
            "anterior-desenvolvimento-com-halteres",
            "Desenvolvimento com Halteres",
            "Desça os halteres até a altura dos ombros e empurre acima da cabeça",
            "desenvolvimento",
            1,
            true,
            false,
            2,
            "por_halter",
            "banco",
            "halteres"),
        ex(
            "anterior-desenvolvimento-na-maquina",
            "Desenvolvimento na Máquina",
            "Costas apoiadas, empurrando à frente da linha dos ombros sem arquear a lombar",
            "desenvolvimento",
            1,
            true,
            false,
            2,
            "maquina",
            "maquina"),
        ex(
            "lateral-elevacao-lateral-com-halteres",
            "Elevação Lateral com Halteres",
            "Cotovelos levemente flexionados, subindo até a altura dos ombros",
            "elevacao_lateral",
            1,
            false,
            false,
            2,
            "por_halter",
            "halteres"),
        ex(
            "anterior-elevacao-frontal-com-barra",
            "Elevação Frontal com Barra",
            "Suba a barra até a altura dos ombros e controle a descida",
            "elevacao_frontal",
            1,
            false,
            false,
            1,
            "barra_total",
            "barra"),
        ex(
            "posterior-crucifixo-inverso-com-halteres",
            "Crucifixo Inverso com Halteres",
            "Tronco inclinado e coluna neutra, abrindo até a linha dos ombros",
            "deltoide_posterior",
            1,
            false,
            false,
            2,
            "por_halter",
            "banco",
            "halteres"),
        ex(
            "posterior-voador-invertido",
            "Voador Invertido",
            "Peito apoiado, abrindo os braços até a linha dos ombros",
            "deltoide_posterior",
            1,
            false,
            false,
            2,
            "maquina",
            "maquina"));

    registrar(
        "TRICEPS",
        ex(
            "lateral-triceps-pulley-na-polia-alta",
            "Tríceps Pulley na Polia Alta",
            "Cotovelos fixos ao lado do tronco e extensão completa, sem mover o ombro",
            "triceps_pushdown",
            1,
            false,
            false,
            2,
            "polia",
            "polia_alta"),
        ex(
            "lateral-triceps-corda-na-polia-alta",
            "Tríceps Corda na Polia Alta",
            "Cotovelos junto ao tronco, estendendo e afastando as pontas da corda no final",
            "triceps_pushdown",
            1,
            false,
            false,
            2,
            "polia",
            "polia_alta"),
        ex(
            "longa-triceps-testa-com-barra",
            "Tríceps Testa com Barra",
            "Cotovelos apontados para o teto, descendo a barra até perto da testa",
            "triceps_overhead",
            1,
            false,
            false,
            2,
            "barra_total",
            "banco",
            "barra"),
        ex(
            "longa-triceps-frances-com-halteres",
            "Tríceps Francês com Halteres",
            "Cotovelos apontados para cima, descendo os halteres atrás da cabeça só até onde for confortável",
            "triceps_overhead",
            1,
            false,
            false,
            2,
            "por_halter",
            "banco",
            "halteres"));

    registrar(
        "BICEPS",
        ex(
            "longa-rosca-direta-com-barra",
            "Rosca Direta com Barra",
            "Pegada supinada e cotovelos ao lado do tronco, sem balançar o corpo",
            "rosca",
            1,
            false,
            false,
            2,
            "barra_total",
            "barra"),
        ex(
            "curta-rosca-alternada-com-halteres",
            "Rosca Alternada com Halteres",
            "Um braço por vez, girando a palma para cima durante a subida",
            "rosca",
            1,
            false,
            true,
            2,
            "por_halter",
            "halteres"),
        ex(
            "braquial-rosca-martelo-com-halteres",
            "Rosca Martelo com Halteres",
            "Pegada neutra, cotovelos ao lado do tronco e movimento controlado",
            "rosca_neutra",
            1,
            false,
            false,
            2,
            "por_halter",
            "halteres"),
        ex(
            "curta-rosca-scott-com-barra",
            "Rosca Scott com Barra",
            "Braços apoiados, descendo só até manter tensão sem estender o cotovelo de uma vez",
            "rosca",
            1,
            false,
            false,
            2,
            "barra_total",
            "banco",
            "barra"),
        texto(
            ex(
                "curta-rosca-concentrada-com-halter",
                "Rosca Concentrada com Halter",
                "Cotovelo apoiado na parte interna da coxa, subindo sem mover o ombro",
                "rosca",
                1,
                false,
                true,
                1,
                "halter_unico",
                "banco",
                "halteres"),
            "Apoie o cotovelo na parte interna da coxa e flexione o cotovelo sem tirar o braço do apoio.",
            "Levantar o cotovelo da coxa ou balançar o tronco para subir a carga."));

    registrar(
        "PERNAS",
        ex(
            "quadriceps_completo-agachamento-com-barra",
            "Agachamento com Barra",
            "Desça até a profundidade que mantiver a coluna neutra, com os joelhos na direção dos pés",
            "agachamento",
            2,
            true,
            false,
            2,
            "barra_total",
            "barra"),
        texto(
            ex(
                "quadriceps_completo-agachamento-no-smith",
                "Agachamento no Smith",
                "Pés um pouco à frente da barra, descendo com a coluna neutra",
                "agachamento",
                2,
                true,
                false,
                2,
                "maquina",
                "maquina"),
            "Posicione os pés um pouco à frente da barra e desça com os joelhos na direção dos pés, mantendo a coluna neutra.",
            "Travar os joelhos com força no topo ou deixar os joelhos fecharem."),
        ex(
            "quadriceps_completo-leg-press",
            "Leg Press",
            "Pés na plataforma, descendo até os joelhos acompanharem a direção dos pés",
            "agachamento",
            1,
            true,
            false,
            2,
            "maquina",
            "maquina"),
        ex(
            "vasto_medial-agachamento-goblet-com-halter",
            "Agachamento Goblet com Halter",
            "Halter junto ao peito, descendo com o tronco estável e os calcanhares no chão",
            "agachamento",
            1,
            true,
            false,
            2,
            "halter_unico",
            "halteres"),
        ex(
            "quadriceps_completo-afundo-com-halteres",
            "Afundo com Halteres",
            "Passo longo, descendo até o joelho de trás se aproximar do chão",
            "agachamento",
            1,
            true,
            true,
            2,
            "por_halter",
            "halteres"),
        ex(
            "vasto_medial-afundo-bulgaro-com-halteres",
            "Afundo Búlgaro com Halteres",
            "Pé traseiro elevado, descendo até o joelho de trás se aproximar do chão",
            "agachamento",
            2,
            true,
            true,
            2,
            "por_halter",
            "banco",
            "halteres"),
        ex(
            "quadriceps_completo-cadeira-extensora",
            "Cadeira Extensora",
            "Estenda os joelhos até alinhar a perna, sem impulso no final",
            "extensao_joelho",
            1,
            false,
            false,
            2,
            "maquina",
            "maquina"),
        ex(
            "posteriores-stiff-com-halteres",
            "Stiff com Halteres",
            "Joelhos levemente flexionados, levando o quadril para trás com a coluna neutra",
            "dobradica",
            2,
            true,
            false,
            2,
            "por_halter",
            "halteres"),
        ex(
            "posteriores-mesa-flexora",
            "Mesa Flexora",
            "Deitado, traga o calcanhar sem erguer o quadril do banco",
            "flexao_joelho",
            1,
            false,
            false,
            2,
            "maquina",
            "maquina"),
        ex(
            "posteriores-cadeira-flexora",
            "Cadeira Flexora",
            "Sentado, flexione os joelhos com a lombar apoiada",
            "flexao_joelho",
            1,
            false,
            false,
            2,
            "maquina",
            "maquina"),
        ex(
            "gluteo_maximo-hip-thrust-com-barra",
            "Hip Thrust com Barra",
            "Costas no banco e barra no quadril, subindo até alinhar o tronco sem arquear a lombar",
            "gluteo",
            2,
            true,
            false,
            2,
            "barra_total",
            "banco",
            "barra"),
        texto(
            ex(
                "gluteo_maximo-coice-de-gluteo-na-polia",
                "Coice de Glúteo na Polia",
                "Tronco estável, levando o pé para trás até estender o quadril",
                "gluteo",
                1,
                false,
                true,
                1,
                "polia",
                "polia_baixa"),
            "Mantenha o tronco estável e leve o pé para trás até estender o quadril, sem arquear a lombar.",
            "Girar o quadril ou impulsionar o movimento com a lombar."),
        ex(
            "gastrocnemio-panturrilha-em-maquina",
            "Panturrilha em Máquina",
            "Em pé, suba na ponta dos pés sem quicar no final",
            "panturrilha",
            1,
            false,
            false,
            2,
            "maquina",
            "maquina"),
        ex(
            "soleo-panturrilha-sentado-com-halteres",
            "Panturrilha Sentado com Halteres",
            "Halteres apoiados nos joelhos, subindo na ponta dos pés",
            "panturrilha",
            1,
            false,
            false,
            2,
            "por_halter",
            "banco",
            "halteres"),
        texto(
            ex(
                "gastrocnemio-panturrilha-no-leg-press",
                "Panturrilha no Leg Press",
                "Ponta dos pés na borda da plataforma, com os joelhos quase estendidos",
                "panturrilha",
                1,
                false,
                false,
                2,
                "maquina",
                "maquina"),
            "Apoie só a ponta dos pés na borda da plataforma, com os joelhos quase estendidos, e desça até alongar o tornozelo.",
            "Travar os joelhos ou descer além do alongamento confortável do tornozelo."));

    registrar(
        "CORE",
        ex(
            "estabilidade-prancha",
            "Prancha",
            "Antebraços sob os ombros, quadril alinhado e respiração contínua",
            "core",
            1,
            false,
            false,
            2,
            "peso_corporal",
            "peso_corporal"),
        ex(
            "estabilidade-abdominal-tradicional",
            "Abdominal Tradicional",
            "Enrole o tronco até tirar as escápulas do chão, sem puxar o pescoço",
            "core",
            1,
            false,
            false,
            2,
            "peso_corporal",
            "peso_corporal"),
        ex(
            "estabilidade-elevacao-de-joelhos",
            "Elevação de Joelhos",
            "Leve os joelhos em direção ao tronco, sem balançar o corpo",
            "core",
            1,
            false,
            false,
            2,
            "peso_corporal",
            "peso_corporal"));
  }
}
