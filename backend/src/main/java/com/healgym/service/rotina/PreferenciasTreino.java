package com.healgym.service.rotina;

import com.healgym.service.ExerciseDatabase;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.bson.Document;

/**
 * Preferências opcionais da rotina. Ficam no documento da rotina, não no perfil do usuário.
 *
 * <p>Limitações são autodeclaradas e mapeadas para exercícios ou padrões exatos do catálogo. Não
 * são diagnóstico nem substituem orientação profissional.
 */
public final class PreferenciasTreino {

  public static final Map<String, String> EQUIPAMENTOS = new LinkedHashMap<>();
  public static final Map<String, String> PREFERENCIAS = new LinkedHashMap<>();
  public static final Map<String, String> LIMITACOES = new LinkedHashMap<>();
  public static final Map<String, String> LIMITACOES_DETALHE = new LinkedHashMap<>();
  public static final Map<String, String> PRIORIDADES = new LinkedHashMap<>();
  public static final int MAX_EVITAR = 20;
  public static final int MAX_PRIORIDADES = 2;

  private static final Map<String, Set<String>> IDS_POR_LIMITACAO = new LinkedHashMap<>();
  private static final Map<String, Set<String>> PADROES_POR_LIMITACAO = new LinkedHashMap<>();

  static {
    EQUIPAMENTOS.put("barra", "Barra e anilhas");
    EQUIPAMENTOS.put("halteres", "Halteres");
    EQUIPAMENTOS.put("banco", "Banco");
    EQUIPAMENTOS.put("maquina", "Máquinas");
    EQUIPAMENTOS.put("polia", "Polias (cabos)");
    EQUIPAMENTOS.put("barra_fixa", "Barra fixa");

    PREFERENCIAS.put("indiferente", "Sem preferência");
    PREFERENCIAS.put("livres", "Prefiro pesos livres");
    PREFERENCIAS.put("maquinas", "Prefiro máquinas e polias");

    LIMITACOES.put("acima_cabeca", "Desconforto ao elevar os braços acima da cabeça");
    LIMITACOES_DETALHE.put(
        "acima_cabeca",
        "Retira desenvolvimentos, puxadas verticais e extensões de tríceps com o braço acima da cabeça (tríceps testa e tríceps francês).");
    PADROES_POR_LIMITACAO.put(
        "acima_cabeca",
        new LinkedHashSet<>(Arrays.asList("desenvolvimento", "puxada_vertical", "triceps_overhead")));

    LIMITACOES.put("carga_coluna", "Evitar carga sobre a coluna ou tronco inclinado com peso");
    LIMITACOES_DETALHE.put(
        "carga_coluna",
        "Retira carga sobre a coluna (agachamento com barra, agachamento no Smith e desenvolvimento com barra) e tronco inclinado com peso (remada curvada, stiff e crucifixo inverso).");
    IDS_POR_LIMITACAO.put(
        "carga_coluna",
        new LinkedHashSet<>(
            Arrays.asList(
                "quadriceps_completo-agachamento-com-barra",
                "quadriceps_completo-agachamento-no-smith",
                "lats_espessura-remada-curvada-com-barra",
                "posteriores-stiff-com-halteres",
                "anterior-desenvolvimento-com-barra",
                "posterior-crucifixo-inverso-com-halteres")));

    LIMITACOES.put("afundos", "Desconforto nos joelhos em afundos");
    LIMITACOES_DETALHE.put("afundos", "Retira afundo e afundo búlgaro.");
    IDS_POR_LIMITACAO.put(
        "afundos",
        new LinkedHashSet<>(
            Arrays.asList(
                "quadriceps_completo-afundo-com-halteres",
                "vasto_medial-afundo-bulgaro-com-halteres")));

    LIMITACOES.put("flexao_joelho", "Desconforto na flexão acentuada dos joelhos");
    LIMITACOES_DETALHE.put(
        "flexao_joelho",
        "Retira agachamento com barra, no Smith, goblet, leg press, afundo e afundo búlgaro. Não é diagnóstico e não torna outro exercício necessariamente seguro.");
    PADROES_POR_LIMITACAO.put("flexao_joelho", new LinkedHashSet<>(Arrays.asList("agachamento")));

    LIMITACOES.put("supino_barra", "Desconforto nos ombros em supinos com barra");
    LIMITACOES_DETALHE.put(
        "supino_barra", "Troca supinos com barra por versões com halteres.");
    IDS_POR_LIMITACAO.put(
        "supino_barra",
        new LinkedHashSet<>(
            Arrays.asList(
                "medio-supino-reto-com-barra",
                "superior-supino-inclinado-com-barra",
                "inferior-supino-declinado-com-barra")));

    PRIORIDADES.put("peito", "Peito");
    PRIORIDADES.put("costas", "Costas");
    PRIORIDADES.put("ombros", "Ombros");
    PRIORIDADES.put("bracos", "Braços");
    PRIORIDADES.put("quadriceps", "Quadríceps");
    PRIORIDADES.put("posteriores_gluteos", "Posteriores e glúteos");
  }

  public final List<String> equipamentos;
  public final String preferencia;
  public final List<String> evitar;
  public final List<String> limitacoes;
  public final List<String> prioridades;

  private PreferenciasTreino(
      List<String> equipamentos,
      String preferencia,
      List<String> evitar,
      List<String> limitacoes,
      List<String> prioridades) {
    this.equipamentos = Collections.unmodifiableList(ordenar(equipamentos, EQUIPAMENTOS.keySet()));
    this.preferencia = preferencia;
    this.evitar = Collections.unmodifiableList(new ArrayList<>(new TreeSet<>(evitar)));
    this.limitacoes = Collections.unmodifiableList(ordenar(limitacoes, LIMITACOES.keySet()));
    this.prioridades = Collections.unmodifiableList(ordenar(prioridades, PRIORIDADES.keySet()));
  }

  public static PreferenciasTreino padrao() {
    return new PreferenciasTreino(
        new ArrayList<>(EQUIPAMENTOS.keySet()),
        "indiferente",
        Collections.emptyList(),
        Collections.emptyList(),
        Collections.emptyList());
  }

  /** Lê e valida o corpo enviado pelo cliente. Erros entram em {@code erros}. */
  public static PreferenciasTreino ler(Object bruto, List<String> erros) {
    if (bruto == null) {
      return padrao();
    }
    if (!(bruto instanceof Map)) {
      erros.add("Preferências de treino inválidas");
      return padrao();
    }
    Map<?, ?> mapa = (Map<?, ?>) bruto;
    List<String> equipamentos =
        mapa.containsKey("equipamentos")
            ? lista(mapa.get("equipamentos"), EQUIPAMENTOS.keySet(), "equipamento", erros, 10)
            : new ArrayList<>(EQUIPAMENTOS.keySet());
    if (mapa.containsKey("equipamentos") && equipamentos.isEmpty() && erros.isEmpty()) {
      erros.add(
          "Selecione ao menos um equipamento. Só com o peso do corpo, o catálogo atual não monta uma rotina completa.");
    }
    String preferencia = "indiferente";
    Object pref = mapa.get("preferenciaEquipamento");
    if (pref != null) {
      if (pref instanceof String && PREFERENCIAS.containsKey(pref)) {
        preferencia = (String) pref;
      } else {
        erros.add("Preferência de equipamento inválida");
      }
    }
    List<String> evitar = new ArrayList<>();
    Object brutoEvitar = mapa.get("evitar");
    if (brutoEvitar != null) {
      if (!(brutoEvitar instanceof List)) {
        erros.add("Lista de exercícios a evitar inválida");
      } else if (((List<?>) brutoEvitar).size() > MAX_EVITAR) {
        erros.add("Escolha no máximo " + MAX_EVITAR + " exercícios para evitar");
      } else {
        for (Object item : (List<?>) brutoEvitar) {
          ExerciseDatabase.Exercise exercicio =
              item instanceof String ? ExerciseDatabase.porId((String) item) : null;
          if (exercicio == null || !exercicio.ativo) {
            erros.add("Exercício a evitar não existe no catálogo");
            break;
          }
          if (!evitar.contains(exercicio.id)) {
            evitar.add(exercicio.id);
          }
        }
      }
    }
    List<String> limitacoes =
        lista(mapa.get("limitacoes"), LIMITACOES.keySet(), "limitação", erros, 10);
    return new PreferenciasTreino(
        equipamentos, preferencia, evitar, limitacoes, Collections.emptyList());
  }

  /** Leitura tolerante de dados já gravados: valores desconhecidos são descartados. */
  public static PreferenciasTreino fromDocument(Object bruto) {
    if (!(bruto instanceof Map)) {
      return padrao();
    }
    Map<?, ?> mapa = (Map<?, ?>) bruto;
    List<String> equipamentos =
        mapa.containsKey("equipamentos")
            ? filtrar(mapa.get("equipamentos"), EQUIPAMENTOS.keySet())
            : new ArrayList<>(EQUIPAMENTOS.keySet());
    if (equipamentos.isEmpty()) {
      equipamentos = new ArrayList<>(EQUIPAMENTOS.keySet());
    }
    Object pref = mapa.get("preferenciaEquipamento");
    String preferencia =
        pref instanceof String && PREFERENCIAS.containsKey(pref) ? (String) pref : "indiferente";
    List<String> evitar = new ArrayList<>();
    if (mapa.get("evitar") instanceof List) {
      for (Object item : (List<?>) mapa.get("evitar")) {
        if (item instanceof String && ExerciseDatabase.porId((String) item) != null) {
          evitar.add((String) item);
        }
      }
    }
    List<String> prioridades = filtrar(mapa.get("prioridades"), PRIORIDADES.keySet());
    if (prioridades.size() > MAX_PRIORIDADES) {
      prioridades = prioridades.subList(0, MAX_PRIORIDADES);
    }
    return new PreferenciasTreino(
        equipamentos,
        preferencia,
        evitar,
        filtrar(mapa.get("limitacoes"), LIMITACOES.keySet()),
        prioridades);
  }

  public Document toDocument() {
    return new Document("equipamentos", new ArrayList<>(equipamentos))
        .append("preferenciaEquipamento", preferencia)
        .append("evitar", new ArrayList<>(evitar))
        .append("limitacoes", new ArrayList<>(limitacoes))
        .append("prioridades", new ArrayList<>(prioridades));
  }

  public boolean todosEquipamentos() {
    return equipamentos.size() == EQUIPAMENTOS.size();
  }

  public boolean padraoCompleto() {
    return todosEquipamentos()
        && "indiferente".equals(preferencia)
        && evitar.isEmpty()
        && limitacoes.isEmpty()
        && prioridades.isEmpty();
  }

  /**
   * Grupos que rotinas antigas pediam para priorizar. Programações novas não usam essa escolha: a
   * distribuição fica com o motor. A lista gravada continua legível para não apagar o histórico.
   */
  public Set<String> gruposPrioritarios() {
    return Collections.emptySet();
  }

  public boolean permite(ExerciseDatabase.Exercise exercicio) {
    return motivoExclusao(exercicio) == null;
  }

  /** Motivo pelo qual o exercício fica fora, ou {@code null} se ele é permitido. */
  public String motivoExclusao(ExerciseDatabase.Exercise exercicio) {
    if (evitar.contains(exercicio.id)) {
      return "evitado";
    }
    for (String limitacao : limitacoes) {
      if (limitacaoAtinge(limitacao, exercicio)) {
        return "limitacao";
      }
    }
    for (String item : exercicio.equipamento) {
      String categoria = categoria(item);
      if (categoria != null && !equipamentos.contains(categoria)) {
        return "equipamento";
      }
      if (categoria == null && !"peso_corporal".equals(item)) {
        return "equipamento";
      }
    }
    return null;
  }

  /**
   * A regra segue o atributo do exercício. As listas de id e padrão permanecem como registro
   * explícito dos mesmos critérios, para as limitações que não cabem num único atributo.
   */
  static boolean limitacaoAtinge(String limitacao, ExerciseDatabase.Exercise exercicio) {
    if (IDS_POR_LIMITACAO.getOrDefault(limitacao, Collections.emptySet()).contains(exercicio.id)
        || PADROES_POR_LIMITACAO
            .getOrDefault(limitacao, Collections.emptySet())
            .contains(exercicio.padrao)) {
      return true;
    }
    switch (limitacao) {
      case "acima_cabeca":
        return exercicio.bracosAcimaDaCabeca;
      case "carga_coluna":
        return exercicio.cargaAxial || exercicio.troncoInclinadoComCarga;
      case "flexao_joelho":
        return exercicio.flexaoProfundaJoelho;
      default:
        return false;
    }
  }

  static String categoria(String equipamento) {
    if (equipamento == null) {
      return null;
    }
    if (equipamento.startsWith("polia")) {
      return "polia";
    }
    switch (equipamento) {
      case "barra":
      case "halteres":
      case "banco":
      case "maquina":
      case "barra_fixa":
        return equipamento;
      default:
        return null;
    }
  }

  static Set<String> idsDeLimitacoes() {
    Set<String> ids = new LinkedHashSet<>();
    for (Set<String> valores : IDS_POR_LIMITACAO.values()) {
      ids.addAll(valores);
    }
    return ids;
  }

  /** Texto canônico usado na assinatura da rotina. Prioridades antigas não entram. */
  String canonico() {
    return String.join(",", equipamentos)
        + "|"
        + preferencia
        + "|"
        + String.join(",", evitar)
        + "|"
        + String.join(",", limitacoes);
  }

  private static List<String> lista(
      Object bruto, Set<String> permitidos, String nome, List<String> erros, int maximo) {
    List<String> resultado = new ArrayList<>();
    if (bruto == null) {
      return resultado;
    }
    if (!(bruto instanceof List) || ((List<?>) bruto).size() > maximo) {
      erros.add("Lista de " + nome + " inválida");
      return resultado;
    }
    for (Object item : (List<?>) bruto) {
      if (!(item instanceof String) || !permitidos.contains(item)) {
        erros.add("Valor de " + nome + " inválido");
        return new ArrayList<>();
      }
      if (!resultado.contains(item)) {
        resultado.add((String) item);
      }
    }
    return resultado;
  }

  private static List<String> filtrar(Object bruto, Set<String> permitidos) {
    List<String> resultado = new ArrayList<>();
    if (bruto instanceof List) {
      for (Object item : (List<?>) bruto) {
        if (item instanceof String && permitidos.contains(item) && !resultado.contains(item)) {
          resultado.add((String) item);
        }
      }
    }
    return resultado;
  }

  private static List<String> ordenar(List<String> valores, Set<String> ordem) {
    List<String> resultado = new ArrayList<>();
    for (String chave : ordem) {
      if (valores.contains(chave)) {
        resultado.add(chave);
      }
    }
    return resultado;
  }
}
