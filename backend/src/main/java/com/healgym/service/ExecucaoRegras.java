package com.healgym.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.bson.Document;

public final class ExecucaoRegras {

  public static final int MAX_SERIES = 10;
  public static final double MAX_CARGA = 1000;
  public static final int MAX_REPETICOES = 300;
  public static final int MAX_SEGUNDOS = 6 * 3600;

  private static final Pattern NUMERO = Pattern.compile("^\\d{1,4}(\\.\\d{1,3})?$");
  private static final Pattern INTEIRO = Pattern.compile("^\\d{1,4}$");

  public static final class Invalido extends RuntimeException {
    public Invalido(String mensagem) {
      super(mensagem);
    }
  }

  private ExecucaoRegras() {}

  public static Double carga(Object valor) {
    if (valor == null) {
      return null;
    }
    double numero;
    if (valor instanceof Number) {
      numero = ((Number) valor).doubleValue();
      if (Double.isNaN(numero) || Double.isInfinite(numero)) {
        throw new Invalido("Carga inválida");
      }
    } else if (valor instanceof String) {
      String texto = ((String) valor).trim().replace(" ", "");
      if (texto.isEmpty()) {
        return null;
      }
      if (texto.startsWith("-")) {
        throw new Invalido("A carga não pode ser negativa");
      }
      if (texto.contains(",") && texto.contains(".")) {
        texto = texto.replace(".", "");
      }
      texto = texto.replace(',', '.');
      if (!NUMERO.matcher(texto).matches()) {
        throw new Invalido("Carga inválida. Use números, como 22,5");
      }
      numero = Double.parseDouble(texto);
    } else {
      throw new Invalido("Carga inválida");
    }
    if (numero < 0) {
      throw new Invalido("A carga não pode ser negativa");
    }
    if (numero > MAX_CARGA) {
      throw new Invalido("Carga acima do limite aceito");
    }
    return BigDecimal.valueOf(numero).setScale(2, RoundingMode.HALF_UP).doubleValue();
  }

  public static Integer inteiro(Object valor, int maximo, String campo) {
    if (valor == null) {
      return null;
    }
    int numero;
    if (valor instanceof Number) {
      double bruto = ((Number) valor).doubleValue();
      if (bruto != Math.floor(bruto) || Double.isInfinite(bruto)) {
        throw new Invalido(campo + " deve ser um número inteiro");
      }
      numero = (int) bruto;
    } else if (valor instanceof String) {
      String texto = ((String) valor).trim();
      if (texto.isEmpty()) {
        return null;
      }
      if (!INTEIRO.matcher(texto).matches()) {
        throw new Invalido(campo + " deve ser um número inteiro");
      }
      numero = Integer.parseInt(texto);
    } else {
      throw new Invalido(campo + " inválido");
    }
    if (numero < 0 || numero > maximo) {
      throw new Invalido(campo + " fora do intervalo aceito");
    }
    return numero;
  }

  public static String uidDe(Map<String, Object> item, int indice) {
    Object uid = item.get("uid");
    return uid instanceof String && !((String) uid).isEmpty() ? (String) uid : "idx-" + indice;
  }

  public static Map<String, Map<String, Object>> itensPorUid(List<Map<String, Object>> itens) {
    Map<String, Map<String, Object>> mapa = new LinkedHashMap<>();
    for (int i = 0; i < itens.size(); i++) {
      mapa.put(uidDe(itens.get(i), i), itens.get(i));
    }
    return mapa;
  }

  @SuppressWarnings("unchecked")
  public static List<Document> mesclar(
      List<Map<String, Object>> itensTreino,
      Object entrada,
      List<Document> existentes,
      Date agora) {
    if (!(entrada instanceof List)) {
      throw new Invalido("exercicios deve ser uma lista");
    }
    Map<String, Map<String, Object>> porUid = itensPorUid(itensTreino);
    Map<String, Document> atuais = new LinkedHashMap<>();
    for (Document existente : existentes == null ? Collections.<Document>emptyList() : existentes) {
      atuais.put(existente.getString("uid"), existente);
    }
    Set<String> vistos = new LinkedHashSet<>();
    for (Object bruto : (List<Object>) entrada) {
      if (!(bruto instanceof Map)) {
        throw new Invalido("Registro de exercício inválido");
      }
      Map<String, Object> registro = (Map<String, Object>) bruto;
      Object uidBruto = registro.get("uid");
      if (!(uidBruto instanceof String)) {
        throw new Invalido("Exercício sem identificador");
      }
      String uid = (String) uidBruto;
      if (!vistos.add(uid)) {
        throw new Invalido("Exercício repetido no registro");
      }
      Map<String, Object> item = porUid.get(uid);
      if (item == null) {
        throw new Invalido("Exercício não pertence a este treino");
      }
      Document anterior = atuais.get(uid);
      atuais.put(uid, documento(uid, item, registro.get("series"), anterior, agora));
    }
    return new ArrayList<>(atuais.values());
  }

  @SuppressWarnings("unchecked")
  static Document documento(
      String uid, Map<String, Object> item, Object seriesBrutas, Document anterior, Date agora) {
    if (!(seriesBrutas instanceof List)) {
      throw new Invalido("series deve ser uma lista");
    }
    List<Object> lista = (List<Object>) seriesBrutas;
    if (lista.size() > MAX_SERIES) {
      throw new Invalido("Número de séries acima do limite");
    }
    Map<Integer, Document> seriesAnteriores = new LinkedHashMap<>();
    if (anterior != null && anterior.get("series") instanceof List) {
      for (Object serie : (List<Object>) anterior.get("series")) {
        if (serie instanceof Document) {
          Document doc = (Document) serie;
          seriesAnteriores.put(doc.getInteger("numero"), doc);
        }
      }
    }
    List<Document> series = new ArrayList<>();
    Set<Integer> numeros = new LinkedHashSet<>();
    for (Object bruto : lista) {
      if (!(bruto instanceof Map)) {
        throw new Invalido("Série inválida");
      }
      Map<String, Object> serie = (Map<String, Object>) bruto;
      Integer numero = inteiro(serie.get("numero"), MAX_SERIES, "Número da série");
      if (numero == null || numero < 1) {
        throw new Invalido("Número da série inválido");
      }
      if (!numeros.add(numero)) {
        throw new Invalido("Série duplicada");
      }
      boolean concluida = Boolean.TRUE.equals(serie.get("concluida"));
      Document doc = new Document("numero", numero);
      doc.append("carga", carga(serie.get("carga")));
      doc.append("repeticoes", inteiro(serie.get("repeticoes"), MAX_REPETICOES, "Repetições"));
      doc.append("rir", inteiro(serie.get("rir"), 10, "RIR"));
      doc.append("concluida", concluida);
      Document velha = seriesAnteriores.get(numero);
      if (concluida) {
        Object quando = velha != null && Boolean.TRUE.equals(velha.get("concluida")) ? velha.get("concluidaEm") : null;
        doc.append("concluidaEm", quando instanceof Date ? quando : agora);
      } else {
        doc.append("concluidaEm", null);
      }
      series.add(doc);
    }
    series.sort((a, b) -> Integer.compare(a.getInteger("numero"), b.getInteger("numero")));
    return new Document("uid", uid)
        .append("exercicioId", item.get("exercicioId"))
        .append("nome", item.get("nome"))
        .append("tipoCarga", item.get("tipoCarga"))
        .append("seriesPrescritas", item.get("series"))
        .append("repeticoesPrescritas", item.get("repeticoes"))
        .append("series", series);
  }

  @SuppressWarnings("unchecked")
  public static List<Document> seriesConcluidas(Document entrada) {
    List<Document> resultado = new ArrayList<>();
    Object series = entrada.get("series");
    if (series instanceof List) {
      for (Object serie : (List<Object>) series) {
        if (serie instanceof Document && Boolean.TRUE.equals(((Document) serie).get("concluida"))) {
          resultado.add((Document) serie);
        }
      }
    }
    return resultado;
  }

  public static boolean temSerieConcluida(Document execucao, String uid) {
    for (Document entrada : entradas(execucao)) {
      if (uid.equals(entrada.getString("uid")) && !seriesConcluidas(entrada).isEmpty()) {
        return true;
      }
    }
    return false;
  }

  @SuppressWarnings("unchecked")
  public static List<Document> entradas(Document execucao) {
    if (execucao == null || !(execucao.get("exercicios") instanceof List)) {
      return Collections.emptyList();
    }
    List<Document> lista = new ArrayList<>();
    for (Object entrada : (List<Object>) execucao.get("exercicios")) {
      if (entrada instanceof Document) {
        lista.add((Document) entrada);
      }
    }
    return lista;
  }

  public static Map<String, Object> progresso(
      String exercicioId, String nome, List<Document> execucoesRecentes, int limite) {
    List<Map<String, Object>> sessoes = new ArrayList<>();
    Double melhorCarga = null;
    Integer repsNaMelhorCarga = null;
    Integer maisRepeticoes = null;
    Double cargaNasMaisRepeticoes = null;
    for (Document execucao : execucoesRecentes) {
      for (Document entrada : entradas(execucao)) {
        boolean mesmo =
            exercicioId.equals(entrada.getString("exercicioId"))
                || (nome != null && nome.equalsIgnoreCase(String.valueOf(entrada.get("nome"))));
        if (!mesmo) {
          continue;
        }
        List<Document> feitas = seriesConcluidas(entrada);
        if (feitas.isEmpty()) {
          continue;
        }
        List<Map<String, Object>> series = new ArrayList<>();
        for (Document serie : feitas) {
          Double carga = numeroOuNulo(serie.get("carga"));
          Integer reps = serie.get("repeticoes") instanceof Number ? ((Number) serie.get("repeticoes")).intValue() : null;
          Map<String, Object> linha = new LinkedHashMap<>();
          linha.put("numero", serie.get("numero"));
          linha.put("carga", carga);
          linha.put("repeticoes", reps);
          linha.put("rir", serie.get("rir"));
          series.add(linha);
          if (carga != null && (melhorCarga == null || carga > melhorCarga || (carga.equals(melhorCarga) && reps != null && (repsNaMelhorCarga == null || reps > repsNaMelhorCarga)))) {
            melhorCarga = carga;
            repsNaMelhorCarga = reps;
          }
          if (reps != null && (maisRepeticoes == null || reps > maisRepeticoes)) {
            maisRepeticoes = reps;
            cargaNasMaisRepeticoes = carga;
          }
        }
        if (sessoes.size() < limite) {
          Map<String, Object> sessao = new LinkedHashMap<>();
          sessao.put("workoutId", execucao.get("workout") == null ? null : execucao.get("workout").toString());
          sessao.put("data", execucao.get("finalizadoEm") != null ? execucao.get("finalizadoEm") : execucao.get("updatedAt"));
          sessao.put("seriesPrescritas", entrada.get("seriesPrescritas"));
          sessao.put("repeticoesPrescritas", entrada.get("repeticoesPrescritas"));
          sessao.put("tipoCarga", entrada.get("tipoCarga"));
          sessao.put("series", series);
          sessoes.add(sessao);
        }
        break;
      }
    }
    Map<String, Object> resultado = new LinkedHashMap<>();
    resultado.put("sessoes", sessoes);
    if (melhorCarga != null) {
      resultado.put("melhorCarga", melhorCarga);
      resultado.put("repeticoesNaMelhorCarga", repsNaMelhorCarga);
    }
    if (maisRepeticoes != null) {
      resultado.put("maisRepeticoes", maisRepeticoes);
      resultado.put("cargaNasMaisRepeticoes", cargaNasMaisRepeticoes);
    }
    String sugestao = sugestao(sessoes);
    if (sugestao != null) {
      resultado.put("sugestao", sugestao);
    }
    return resultado;
  }

  private static Double numeroOuNulo(Object valor) {
    return valor instanceof Number ? ((Number) valor).doubleValue() : null;
  }

  @SuppressWarnings("unchecked")
  public static String sugestao(List<Map<String, Object>> sessoes) {
    if (sessoes.size() < 2) {
      return null;
    }
    Double cargaReferencia = null;
    boolean primeira = true;
    for (int i = 0; i < 2; i++) {
      Map<String, Object> sessao = sessoes.get(i);
      int topo = SessionPlanner.topoReps(String.valueOf(sessao.get("repeticoesPrescritas")));
      if (topo <= 0 || String.valueOf(sessao.get("repeticoesPrescritas")).matches(".*\\d+s.*")) {
        return null;
      }
      Object prescritas = sessao.get("seriesPrescritas");
      List<Map<String, Object>> series = (List<Map<String, Object>>) sessao.get("series");
      if (!(prescritas instanceof Number) || series.size() < ((Number) prescritas).intValue()) {
        return null;
      }
      for (Map<String, Object> serie : series) {
        Object reps = serie.get("repeticoes");
        if (!(reps instanceof Number) || ((Number) reps).intValue() < topo) {
          return null;
        }
        Object rir = serie.get("rir");
        if (rir instanceof Number && ((Number) rir).intValue() < 1) {
          return null;
        }
        Double carga = (Double) serie.get("carga");
        if (primeira) {
          cargaReferencia = carga;
          primeira = false;
        } else if (cargaReferencia == null ? carga != null : !cargaReferencia.equals(carga)) {
          return null;
        }
      }
    }
    if (cargaReferencia == null || cargaReferencia == 0) {
      return "Você completou o topo da faixa nas duas últimas sessões. Se a execução continuou sólida, considere uma variação um pouco mais difícil. A decisão é sua.";
    }
    return "Você completou o topo da faixa nas duas últimas sessões com a mesma carga. Se a execução continuou sólida, considere um pequeno aumento na próxima vez. A decisão é sua.";
  }

  private static int segundosDe(Document execucao, String campo) {
    Object valor = execucao.get(campo);
    return valor instanceof Number ? Math.max(0, ((Number) valor).intValue()) : 0;
  }

  public static int segundosDecorridos(Document execucao, Date agora) {
    int base = segundosDe(execucao, "tempoAcumuladoSegundos");
    Object retomado = execucao.get("retomadoEm");
    if ("em_andamento".equals(execucao.getString("status")) && retomado instanceof Date) {
      long delta = Math.max(0, (agora.getTime() - ((Date) retomado).getTime()) / 1000L);
      return (int) Math.min(MAX_SEGUNDOS, base + delta);
    }
    return Math.min(MAX_SEGUNDOS, base);
  }

  public static int descansoRestante(Document execucao, Date agora) {
    Object fim = execucao.get("descansoTerminaEm");
    if (!(fim instanceof Date)) {
      return 0;
    }
    long delta = (((Date) fim).getTime() - agora.getTime() + 999L) / 1000L;
    return (int) Math.max(0, delta);
  }

  public static boolean iniciar(Document execucao, Date agora) {
    if ("concluida".equals(execucao.getString("status"))) {
      return false;
    }
    if (execucao.get("iniciadoEm") == null) {
      execucao.put("iniciadoEm", agora);
    }
    if ("em_andamento".equals(execucao.getString("status")) && execucao.get("retomadoEm") instanceof Date) {
      return false;
    }
    execucao.put("status", "em_andamento");
    execucao.put("retomadoEm", agora);
    execucao.put("updatedAt", agora);
    return true;
  }

  public static boolean pausar(Document execucao, Date vistoEm, Date agora) {
    if (!"em_andamento".equals(execucao.getString("status"))) {
      return false;
    }
    Object retomado = execucao.get("retomadoEm");
    if (!(retomado instanceof Date)) {
      return false;
    }
    if (vistoEm != null && ((Date) retomado).getTime() != vistoEm.getTime()) {
      return false;
    }
    long delta = Math.max(0, (agora.getTime() - ((Date) retomado).getTime()) / 1000L);
    execucao.put("tempoAcumuladoSegundos", (int) Math.min(MAX_SEGUNDOS, segundosDe(execucao, "tempoAcumuladoSegundos") + delta));
    execucao.put("retomadoEm", null);
    execucao.put("status", "pausado");
    execucao.put("pausadoEm", agora);
    execucao.put("updatedAt", agora);
    return true;
  }

  public static boolean retomar(Document execucao, Date agora) {
    if ("concluida".equals(execucao.getString("status"))) {
      return false;
    }
    if ("em_andamento".equals(execucao.getString("status")) && execucao.get("retomadoEm") instanceof Date) {
      return false;
    }
    if (execucao.get("iniciadoEm") == null) {
      execucao.put("iniciadoEm", agora);
    }
    execucao.put("status", "em_andamento");
    execucao.put("retomadoEm", agora);
    execucao.put("updatedAt", agora);
    return true;
  }

  public static boolean iniciarDescanso(
      Document execucao, int segundos, String rotulo, String uid, int serie, Date agora) {
    if (segundos < 1 || segundos > 600) {
      throw new Invalido("Descanso inválido");
    }
    if (descansoRestante(execucao, agora) > 0) {
      return false;
    }
    execucao.put("descansoTerminaEm", new Date(agora.getTime() + segundos * 1000L));
    execucao.put("descansoSegundos", segundos);
    execucao.put("descansoRotulo", rotulo);
    execucao.put("descansoUid", uid);
    execucao.put("descansoSerie", serie);
    execucao.put("updatedAt", agora);
    return true;
  }

  public static void pularDescanso(Document execucao, Date agora) {
    execucao.put("descansoTerminaEm", null);
    execucao.put("descansoSegundos", null);
    execucao.put("descansoRotulo", null);
    execucao.put("descansoUid", null);
    execucao.put("descansoSerie", null);
    execucao.put("updatedAt", agora);
  }

  public static void definirPosicao(Document execucao, String uid, Integer serie, List<String> pulados, Date agora) {
    if (uid != null) {
      execucao.put("exercicioAtualUid", uid);
    }
    if (serie != null) {
      execucao.put("serieAtual", serie);
    }
    if (pulados != null) {
      execucao.put("pulados", new ArrayList<>(pulados));
    }
    execucao.put("updatedAt", agora);
  }

  public static boolean encerrar(Document execucao, Integer duracaoInformada, Date agora) {
    if ("concluida".equals(execucao.getString("status"))) {
      return false;
    }
    if ("em_andamento".equals(execucao.getString("status"))) {
      pausar(execucao, null, agora);
    }
    int tempo = duracaoInformada != null ? duracaoInformada : segundosDe(execucao, "tempoAcumuladoSegundos");
    execucao.put("status", "concluida");
    execucao.put("finalizadoEm", agora);
    execucao.put("duracaoRealSegundos", tempo);
    execucao.put("retomadoEm", null);
    pularDescanso(execucao, agora);
    return true;
  }
}
