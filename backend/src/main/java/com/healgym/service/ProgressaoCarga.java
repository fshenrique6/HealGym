package com.healgym.service;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Recomendação de progressão baseada apenas no que foi registrado.
 *
 * <p>Dupla progressão conservadora:
 *
 * <ol>
 *   <li>Completar todas as séries prescritas.
 *   <li>Com a mesma carga, subir as repetições até o topo da faixa.
 *   <li>Aumentar a carga só depois de duas sessões seguidas no topo com a mesma carga.
 * </ol>
 *
 * Uma sessão abaixo da faixa pede para manter a carga; duas seguidas, para reduzir. O RIR só entra
 * na decisão quando foi registrado; nada é estimado no lugar do usuário.
 *
 * <p>Uma pausa de {@link #PAUSA_DIAS} dias ou mais, contada pela data de realização da sessão mais
 * recente, não autoriza aumento. O número acompanha a janela de 28 dias já usada no histórico e é
 * uma heurística ajustável, não um limite fisiológico.
 */
public final class ProgressaoCarga {

  public static final String REGISTRAR_MAIS = "registrar_mais";
  public static final String COMPLETAR_SERIES = "completar_series";
  public static final String BUSCAR_REPETICOES = "buscar_repeticoes";
  public static final String AUMENTAR_CARGA = "aumentar_carga";
  public static final String VARIACAO_MAIS_DIFICIL = "variacao_mais_dificil";
  public static final String REDUZIR_CARGA = "reduzir_carga";
  public static final String MANTER = "manter";

  /** Dias sem treinar a partir dos quais o aumento deixa de ser sugerido. Heurística ajustável. */
  public static final int PAUSA_DIAS = 28;

  private static final long DIA_MS = 24L * 60 * 60 * 1000;

  private static final Pattern FAIXA = Pattern.compile("(\\d+)(?:\\s*-\\s*(\\d+))?");
  private static final Pattern TEMPO = Pattern.compile("\\d+\\s*(s\\b|seg)");

  private ProgressaoCarga() {}

  static final class Faixa {
    final int minimo;
    final int maximo;

    Faixa(int minimo, int maximo) {
      this.minimo = minimo;
      this.maximo = maximo;
    }
  }

  /** Faixa de repetições, ou {@code null} quando a prescrição é por tempo ou ilegível. */
  static Faixa faixa(Object repeticoes) {
    if (!(repeticoes instanceof String)) {
      return null;
    }
    String texto = ((String) repeticoes).toLowerCase(Locale.ROOT);
    if (TEMPO.matcher(texto).find()) {
      return null;
    }
    Matcher m = FAIXA.matcher(texto);
    if (!m.find()) {
      return null;
    }
    int minimo = Integer.parseInt(m.group(1));
    int maximo = m.group(2) == null ? minimo : Integer.parseInt(m.group(2));
    if (minimo <= 0 || maximo < minimo) {
      return null;
    }
    return new Faixa(minimo, maximo);
  }

  /** Leitura de uma sessão registrada (apenas séries concluídas). */
  static final class Leitura {
    int feitas;
    int abaixo;
    boolean semRepeticoes;
    boolean semCarga;
    boolean todasNoTopo = true;
    boolean rirZero;
    Double cargaMinima;
    Double cargaMaxima;
    final List<Integer> repeticoes = new ArrayList<>();

    boolean cargaUnica() {
      return cargaMinima == null ? cargaMaxima == null : cargaMinima.equals(cargaMaxima);
    }
  }

  @SuppressWarnings("unchecked")
  static Leitura ler(Map<String, Object> sessao, Faixa faixa) {
    Leitura l = new Leitura();
    Object series = sessao.get("series");
    if (!(series instanceof List)) {
      l.todasNoTopo = false;
      return l;
    }
    for (Object bruta : (List<Object>) series) {
      if (!(bruta instanceof Map)) {
        continue;
      }
      Map<String, Object> serie = (Map<String, Object>) bruta;
      l.feitas++;
      Object reps = serie.get("repeticoes");
      if (!(reps instanceof Number)) {
        l.semRepeticoes = true;
        l.todasNoTopo = false;
      } else {
        int valor = ((Number) reps).intValue();
        l.repeticoes.add(valor);
        if (valor < faixa.minimo) {
          l.abaixo++;
        }
        if (valor < faixa.maximo) {
          l.todasNoTopo = false;
        }
      }
      Object carga = serie.get("carga");
      if (!(carga instanceof Number)) {
        l.semCarga = true;
      } else {
        double valor = ((Number) carga).doubleValue();
        l.cargaMinima = l.cargaMinima == null ? valor : Math.min(l.cargaMinima, valor);
        l.cargaMaxima = l.cargaMaxima == null ? valor : Math.max(l.cargaMaxima, valor);
      }
      Object rir = serie.get("rir");
      if (rir instanceof Number && ((Number) rir).intValue() <= 0) {
        l.rirZero = true;
      }
    }
    if (l.feitas == 0) {
      l.todasNoTopo = false;
    }
    return l;
  }

  static String kg(Double carga) {
    DecimalFormat formato = new DecimalFormat("0.##", DecimalFormatSymbols.getInstance(new Locale("pt", "BR")));
    return formato.format(carga) + " kg";
  }

  private static String incremento(String tipoCarga, Double carga) {
    switch (tipoCarga == null ? "" : tipoCarga) {
      case "barra_total":
        return "Aumente cerca de 2 a 2,5 kg no total (1 a 1,25 kg de cada lado), ou o menor incremento disponível.";
      case "por_halter":
      case "halter_unico":
        return "Passe para o próximo halter disponível (em geral, 1 a 2 kg a mais).";
      case "maquina":
      case "polia":
        return "Suba para a próxima placa ou o menor ajuste do aparelho.";
      case "peso_corporal":
        return "Acrescente o menor incremento de carga extra disponível.";
      default:
        return carga == null
            ? "Aumente a carga no menor incremento disponível."
            : "Aumente a carga no menor incremento disponível a partir de " + kg(carga) + ".";
    }
  }

  private static Map<String, Object> recomendacao(
      String tipo, String titulo, String texto, Faixa faixa, Integer series, List<String> base) {
    Map<String, Object> mapa = new LinkedHashMap<>();
    mapa.put("tipo", tipo);
    mapa.put("titulo", titulo);
    mapa.put("texto", texto);
    if (faixa != null) {
      mapa.put("faixa", faixa.minimo == faixa.maximo ? String.valueOf(faixa.minimo) : faixa.minimo + "-" + faixa.maximo);
    }
    if (series != null) {
      mapa.put("seriesAlvo", series);
    }
    mapa.put("baseadoEm", base);
    return mapa;
  }

  static String resumo(String rotulo, Leitura l) {
    StringBuilder texto = new StringBuilder(rotulo).append(": ");
    texto.append(l.feitas).append(l.feitas == 1 ? " série" : " séries");
    if (!l.repeticoes.isEmpty()) {
      List<String> reps = new ArrayList<>();
      for (Integer valor : l.repeticoes) {
        reps.add(String.valueOf(valor));
      }
      texto.append(" · ").append(String.join(", ", reps)).append(" repetições");
    }
    if (l.cargaMaxima != null) {
      texto.append(" · ")
          .append(l.cargaUnica() ? kg(l.cargaMaxima) : kg(l.cargaMinima) + " a " + kg(l.cargaMaxima));
    }
    return texto.toString();
  }

  /**
   * A sessão mais recente está parada há tempo demais para sustentar um aumento. Sem data, a regra
   * antiga permanece: o histórico sem data não é tratado como pausa inventada.
   */
  public static boolean pausaLonga(Map<String, Object> sessao) {
    Object data = sessao == null ? null : sessao.get("data");
    if (!(data instanceof Date)) {
      return false;
    }
    long idade = System.currentTimeMillis() - ((Date) data).getTime();
    return idade >= PAUSA_DIAS * DIA_MS;
  }

  private static Integer inteiro(Object valor) {
    return valor instanceof Number ? ((Number) valor).intValue() : null;
  }

  /**
   * @param sessoes sessões registradas do exercício, da mais recente para a mais antiga, no formato
   *     de {@link ExecucaoRegras#progresso}
   * @param repeticoesAlvo prescrição atual (se nula, usa a da última sessão)
   * @param seriesAlvo séries prescritas agora (se nulas, usa as da última sessão)
   * @param tipoCargaAlvo tipo de carga do exercício (se nulo, usa o da última sessão)
   * @return recomendação, ou {@code null} quando a prescrição é por tempo
   */
  public static Map<String, Object> recomendar(
      List<Map<String, Object>> sessoes, Object repeticoesAlvo, Object seriesAlvo, Object tipoCargaAlvo) {
    Map<String, Object> ultima = sessoes == null || sessoes.isEmpty() ? null : sessoes.get(0);
    Faixa faixa =
        faixa(repeticoesAlvo != null ? repeticoesAlvo : ultima == null ? null : ultima.get("repeticoesPrescritas"));
    if (faixa == null) {
      return null;
    }
    Integer series = inteiro(seriesAlvo != null ? seriesAlvo : ultima == null ? null : ultima.get("seriesPrescritas"));
    Object tipo = tipoCargaAlvo != null ? tipoCargaAlvo : ultima == null ? null : ultima.get("tipoCarga");
    String tipoCarga = tipo instanceof String ? (String) tipo : null;
    List<String> base = new ArrayList<>();
    if (ultima == null) {
      return recomendacao(
          REGISTRAR_MAIS,
          "Primeiro registro",
          "Escolha uma carga que permita completar as repetições com boa técnica, deixando 2 ou 3 de reserva. Registre carga e repetições para receber sugestões nas próximas vezes.",
          faixa,
          series,
          base);
    }
    Leitura l = ler(ultima, faixa);
    base.add(resumo("Última sessão", l));
    if (l.feitas == 0 || l.semRepeticoes) {
      return recomendacao(
          REGISTRAR_MAIS,
          "Registre as repetições",
          "Registre as repetições de cada série para receber uma sugestão de progressão.",
          faixa,
          series,
          base);
    }
    if (l.semCarga && !"peso_corporal".equals(tipoCarga)) {
      return recomendacao(
          REGISTRAR_MAIS,
          "Registre a carga",
          "Registre a carga de cada série para acompanhar a evolução e receber uma sugestão.",
          faixa,
          series,
          base);
    }
    if (series != null && l.feitas < series) {
      return recomendacao(
          COMPLETAR_SERIES,
          "Complete as séries",
          "Na última vez você concluiu " + l.feitas + " de " + series
              + " séries. Mantenha a carga e complete todas as séries antes de pensar em aumentar.",
          faixa,
          series,
          base);
    }
    Leitura anterior = sessoes.size() > 1 ? ler(sessoes.get(1), faixa) : null;
    if (l.abaixo * 2 >= l.feitas) {
      boolean repetiu =
          anterior != null
              && anterior.feitas > 0
              && !anterior.semRepeticoes
              && anterior.abaixo * 2 >= anterior.feitas
              && (l.cargaMaxima == null
                  || anterior.cargaMaxima == null
                  || l.cargaMaxima >= anterior.cargaMaxima);
      if (repetiu) {
        base.add(resumo("Sessão anterior", anterior));
        return recomendacao(
            REDUZIR_CARGA,
            "Reduza um pouco a carga",
            "Nas duas últimas sessões, a maioria das séries ficou abaixo de " + faixa.minimo
                + " repetições. Reduza a carga em cerca de 5 a 10% para voltar à faixa de "
                + faixa.minimo + " a " + faixa.maximo + " com boa técnica.",
            faixa,
            series,
            base);
      }
      return recomendacao(
          MANTER,
          "Mantenha a carga",
          "Na última sessão, a maioria das séries ficou abaixo de " + faixa.minimo
              + " repetições. Mantenha a carga e tente voltar à faixa; se acontecer de novo, reduza um pouco.",
          faixa,
          series,
          base);
    }
    if (l.todasNoTopo && l.cargaUnica()) {
      if (l.rirZero) {
        return recomendacao(
            MANTER,
            "Mantenha a carga",
            "Você chegou ao topo da faixa, mas registrou RIR 0 (nenhuma repetição de reserva). Mantenha a carga até completar o topo com alguma folga.",
            faixa,
            series,
            base);
      }
      boolean repetiu =
          anterior != null
              && anterior.todasNoTopo
              && anterior.cargaUnica()
              && !anterior.rirZero
              && (series == null || anterior.feitas >= series)
              && (l.cargaMaxima == null
                  ? anterior.cargaMaxima == null
                  : l.cargaMaxima.equals(anterior.cargaMaxima));
      if (!repetiu) {
        return recomendacao(
            MANTER,
            "Repita a carga mais uma vez",
            "Você completou " + faixa.maximo
                + " repetições em todas as séries. Repita essa carga na próxima sessão; se completar o topo de novo, aumente.",
            faixa,
            series,
            base);
      }
      base.add(resumo("Sessão anterior", anterior));
      if (pausaLonga(ultima)) {
        return recomendacao(
            MANTER,
            "Retome com calma",
            "Faz cerca de "
                + PAUSA_DIAS
                + " dias ou mais desde a última sessão registrada. Retome com a carga anterior ou um pouco menos e reavalie antes de progredir. Nada é aumentado automaticamente.",
            faixa,
            series,
            base);
      }
      if (l.cargaMaxima == null || l.cargaMaxima == 0) {
        return recomendacao(
            VARIACAO_MAIS_DIFICIL,
            "Hora de dificultar",
            "Você completou o topo da faixa nas duas últimas sessões. Experimente uma variação um pouco mais difícil ou acrescente uma carga leve.",
            faixa,
            series,
            base);
      }
      return recomendacao(
          AUMENTAR_CARGA,
          "Aumente a carga",
          "Você completou o topo da faixa nas duas últimas sessões com " + kg(l.cargaMaxima) + ". "
              + incremento(tipoCarga, l.cargaMaxima)
              + " Se a técnica piorar, volte à carga anterior.",
          faixa,
          series,
          base);
    }
    String carga = l.cargaMaxima != null && l.cargaUnica() ? "Mantenha " + kg(l.cargaMaxima) + " e busque" : "Busque";
    return recomendacao(
        BUSCAR_REPETICOES,
        "Busque mais repetições",
        carga + " mais repetições, até chegar a " + faixa.maximo + " em todas as séries.",
        faixa,
        series,
        base);
  }
}
