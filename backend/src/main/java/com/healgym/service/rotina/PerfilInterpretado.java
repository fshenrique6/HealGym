package com.healgym.service.rotina;

import com.healgym.model.User;
import com.healgym.service.PrescricaoPerfil;
import com.healgym.service.WorkoutGenerator;
import com.healgym.validation.TrainingProfile;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Leitura conjunta do perfil, das preferências e do histórico do app.
 *
 * <p>Separa duas coisas que o perfil antigo misturava:
 *
 * <ul>
 *   <li><b>nível técnico</b> (1 a 3): quais exercícios cabem, pelo tempo de experiência;
 *   <li><b>capacidade atual</b> (1 a 3): quanto volume e quantas sessões a pessoa recupera agora,
 *       pela experiência combinada com a frequência recente.
 * </ul>
 *
 * <p>Assim, quem treina há anos e parou recebe volume de readaptação, mas não é tratado como quem
 * nunca treinou na escolha dos exercícios. Sexo, idade e biotipo não entram nessas decisões.
 *
 * <p>Experiência, frequência declarada, frequência observada e dias disponíveis são leituras
 * diferentes. A frequência declarada fica no perfil e não é reescrita. O histórico verificado
 * (sessões com série registrada) pode elevá-la quando há registros suficientes. Zero registros no
 * aplicativo é ausência de dado, não uma pausa: não reduz a declaração nem a capacidade. A
 * programação conservadora de retorno só entra quando a própria pessoa informa que não tem
 * treinado. Contagem desconhecida ({@code -1}) também não altera o que foi declarado. Peso, sexo,
 * idade e biotipo não entram na quantidade de sessões.
 */
public final class PerfilInterpretado {

  public static final int DIAS_PADRAO = 3;
  public static final int MINUTOS_PADRAO = 60;

  public final String objetivo;
  public final String origemObjetivo;
  public final String experiencia;
  public final String frequencia;
  public final int nivelTecnico;
  public final int capacidade;
  public final int maxSessoes;
  public final String fase;
  public final String faseRotulo;
  public final int dias;
  public final String origemDias;
  public final int minutos;
  public final String origemMinutos;
  public final int concluidosRecentes;
  public final boolean frequenciaPeloHistorico;
  public final boolean reavaliacao;
  public final boolean frequenciaSemRegistro;
  public final List<String> lacunas;
  public final PreferenciasTreino preferencias;

  private PerfilInterpretado(Builder b) {
    this.objetivo = b.objetivo;
    this.origemObjetivo = b.origemObjetivo;
    this.experiencia = b.experiencia;
    this.frequencia = b.frequencia;
    this.nivelTecnico = b.nivelTecnico;
    this.capacidade = b.capacidade;
    this.maxSessoes = b.maxSessoes;
    this.fase = b.fase;
    this.faseRotulo = b.faseRotulo;
    this.dias = b.dias;
    this.origemDias = b.origemDias;
    this.minutos = b.minutos;
    this.origemMinutos = b.origemMinutos;
    this.concluidosRecentes = b.concluidosRecentes;
    this.frequenciaPeloHistorico = b.frequenciaPeloHistorico;
    this.reavaliacao = b.reavaliacao;
    this.frequenciaSemRegistro = b.frequenciaSemRegistro;
    this.lacunas = Collections.unmodifiableList(b.lacunas);
    this.preferencias = b.preferencias;
  }

  /**
   * @param concluidosRecentes treinos concluídos no app nas últimas 4 semanas, ou -1 se
   *     desconhecido
   */
  public static PerfilInterpretado interpretar(
      User.Profile perfil, PreferenciasTreino preferencias, int concluidosRecentes) {
    User.Profile p = perfil == null ? new User.Profile() : perfil;
    PrescricaoPerfil.Configuracao cfg = PrescricaoPerfil.interpretar(p);
    Builder b = new Builder();
    b.preferencias = preferencias == null ? PreferenciasTreino.padrao() : preferencias;
    b.objetivo = cfg.modo;
    b.origemObjetivo = cfg.origemModo;
    b.concluidosRecentes = concluidosRecentes;

    boolean experienciaValida = TrainingProfile.EXPERIENCES.contains(p.trainingExperience);
    boolean frequenciaValida = TrainingProfile.FREQUENCIES.contains(p.recentFrequency);
    b.experiencia = experienciaValida ? p.trainingExperience : null;
    b.frequencia = frequenciaValida ? p.recentFrequency : null;

    int exp;
    boolean experienciaConhecida = true;
    if (experienciaValida) {
      exp = TrainingProfile.EXPERIENCES.indexOf(p.trainingExperience);
    } else if ("avancado".equals(p.fitnessLevel)) {
      exp = 4;
    } else if ("intermediario".equals(p.fitnessLevel)) {
      exp = 3;
    } else if ("iniciante".equals(p.fitnessLevel)) {
      exp = 1;
    } else {
      exp = 1;
      experienciaConhecida = false;
    }

    int fr;
    if (frequenciaValida) {
      fr = nivelFrequencia(p.recentFrequency);
    } else if (!experienciaValida
        && ("avancado".equals(p.fitnessLevel) || "intermediario".equals(p.fitnessLevel))) {
      fr = 1;
    } else {
      fr = 0;
    }
    if (concluidosRecentes >= 12 && fr < 2) {
      fr = 2;
      b.frequenciaPeloHistorico = true;
    } else if (concluidosRecentes >= 6 && fr < 1) {
      fr = 1;
      b.frequenciaPeloHistorico = true;
    }
    if (concluidosRecentes >= 12 && exp <= 1) {
      b.reavaliacao = true;
    }

    b.nivelTecnico = exp <= 2 ? 1 : exp == 3 ? 2 : 3;
    int cap;
    if (exp <= 1 || fr == 0) {
      cap = 1;
    } else if (exp == 2) {
      cap = fr >= 2 ? 2 : 1;
    } else if (exp == 3) {
      cap = 2;
    } else {
      cap = fr >= 2 ? 3 : 2;
    }
    b.capacidade = cap;
    b.maxSessoes = cap == 1 ? 3 : cap == 2 ? (fr >= 3 ? 5 : 4) : 6;

    if (!experienciaConhecida) {
      b.fase = "nao_informado";
      b.faseRotulo = "Perfil de treino incompleto";
    } else if (exp <= 1) {
      b.fase = "inicio";
      b.faseRotulo = "Começando na musculação";
    } else if (fr == 0) {
      b.fase = exp == 2 ? "retomada" : "retorno";
      b.faseRotulo = exp == 2 ? "Retomando os treinos" : "Retorno após uma pausa";
    } else if (exp == 2) {
      b.fase = "iniciante";
      b.faseRotulo = "Iniciante em evolução";
    } else if (exp == 3) {
      b.fase = "intermediario";
      b.faseRotulo = "Intermediário";
    } else if (cap == 3) {
      b.fase = "experiente";
      b.faseRotulo = "Experiente e treinando com regularidade";
    } else {
      b.fase = "experiente_reduzido";
      b.faseRotulo = "Experiente com frequência reduzida";
    }

    b.dias = cfg.dias == null ? DIAS_PADRAO : cfg.dias;
    b.origemDias = cfg.dias == null ? "padrao" : "perfil";
    b.minutos = cfg.minutos == null ? MINUTOS_PADRAO : cfg.minutos;
    b.origemMinutos = cfg.minutos == null ? "padrao" : "perfil";

    if (!"perfil".equals(cfg.origemModo)) {
      b.lacunas.add("objetivo");
    }
    if (!experienciaValida) {
      b.lacunas.add("experiência");
    }
    if (!frequenciaValida) {
      b.lacunas.add("frequência recente");
    }
    if (cfg.dias == null) {
      b.lacunas.add("dias disponíveis");
    }
    if (cfg.minutos == null) {
      b.lacunas.add("duração da sessão");
    }
    return new PerfilInterpretado(b);
  }

  static int nivelFrequencia(String frequencia) {
    if ("semanal_1_2".equals(frequencia)) {
      return 1;
    }
    if ("semanal_3_4".equals(frequencia)) {
      return 2;
    }
    if ("semanal_5_mais".equals(frequencia)) {
      return 3;
    }
    return 0;
  }

  public boolean conservador() {
    return nivelTecnico == 1 || capacidade == 1;
  }

  /**
   * Frase usada quando a programação tem menos sessões do que os dias informados. A razão é a
   * restrição que de fato limitou {@link #maxSessoes}.
   */
  static String motivoMenosSessoes(PerfilInterpretado perfil, int sessoes) {
    if (perfil == null || sessoes >= perfil.dias) {
      return null;
    }
    String quantidade = sessoes == 1 ? "1 treino" : sessoes + " treinos";
    String dias = perfil.dias == 1 ? "1 dia" : perfil.dias + " dias";
    return "Você informou " + dias + ". A programação ficou com " + quantidade + ". " + razaoDaReducao(perfil);
  }

  private static String razaoDaReducao(PerfilInterpretado perfil) {
    if ("nenhuma".equals(perfil.frequencia)) {
      return "Você informou que não tem treinado.";
    }
    if ("irregular".equals(perfil.frequencia)) {
      return "Você informou que treina de forma irregular.";
    }
    if (perfil.frequencia == null) {
      return "A frequência recente não foi informada.";
    }
    if ("nunca".equals(perfil.experiencia) || "menos_6_meses".equals(perfil.experiencia)) {
      return "A experiência ainda é inicial.";
    }
    if ("semanal_1_2".equals(perfil.frequencia)) {
      return "Você informou treinar 1 a 2 vezes por semana.";
    }
    if ("semanal_3_4".equals(perfil.frequencia)) {
      return "Você informou treinar 3 a 4 vezes por semana.";
    }
    if (perfil.nivelTecnico < 3) {
      return "A experiência ainda não sustenta " + perfil.dias + " sessões.";
    }
    return "O limite desta programação é de " + perfil.maxSessoes + " sessões.";
  }

  /** Mesma leitura com outra duração de sessão (treino avulso). */
  public PerfilInterpretado comMinutos(int novosMinutos) {
    Builder b = new Builder();
    b.objetivo = objetivo;
    b.origemObjetivo = origemObjetivo;
    b.experiencia = experiencia;
    b.frequencia = frequencia;
    b.nivelTecnico = nivelTecnico;
    b.capacidade = capacidade;
    b.maxSessoes = maxSessoes;
    b.fase = fase;
    b.faseRotulo = faseRotulo;
    b.dias = dias;
    b.origemDias = origemDias;
    b.minutos = novosMinutos;
    b.origemMinutos = "pedido";
    b.concluidosRecentes = concluidosRecentes;
    b.frequenciaPeloHistorico = frequenciaPeloHistorico;
    b.reavaliacao = reavaliacao;
    b.frequenciaSemRegistro = frequenciaSemRegistro;
    b.lacunas.addAll(lacunas);
    b.lacunas.remove("duração da sessão");
    b.preferencias = preferencias;
    return new PerfilInterpretado(b);
  }

  public String objetivoRotulo() {
    return WorkoutGenerator.rotuloModo(objetivo);
  }

  public Map<String, Object> resumo() {
    Map<String, Object> mapa = new LinkedHashMap<>();
    mapa.put("objetivo", objetivo);
    mapa.put("objetivoRotulo", objetivoRotulo());
    mapa.put("origemObjetivo", origemObjetivo);
    mapa.put("experiencia", experiencia);
    mapa.put("frequencia", frequencia);
    mapa.put("fase", fase);
    mapa.put("faseRotulo", faseRotulo);
    mapa.put("nivelTecnico", nivelTecnico);
    mapa.put("capacidade", capacidade);
    mapa.put("maxSessoes", maxSessoes);
    mapa.put("dias", dias);
    mapa.put("origemDias", origemDias);
    mapa.put("minutos", minutos);
    mapa.put("origemMinutos", origemMinutos);
    mapa.put("concluidosRecentes", concluidosRecentes);
    mapa.put("frequenciaPeloHistorico", frequenciaPeloHistorico);
    mapa.put("reavaliacao", reavaliacao);
    mapa.put("frequenciaSemRegistro", frequenciaSemRegistro);
    mapa.put("lacunas", new ArrayList<>(lacunas));
    return mapa;
  }

  private static final class Builder {
    String objetivo;
    String origemObjetivo;
    String experiencia;
    String frequencia;
    int nivelTecnico;
    int capacidade;
    int maxSessoes;
    String fase;
    String faseRotulo;
    int dias;
    String origemDias;
    int minutos;
    String origemMinutos;
    int concluidosRecentes;
    boolean frequenciaPeloHistorico;
    boolean reavaliacao;
    boolean frequenciaSemRegistro;
    final List<String> lacunas = new ArrayList<>();
    PreferenciasTreino preferencias;
  }
}
