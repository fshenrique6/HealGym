package com.healgym.service.rotina;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Distribuição semanal das sessões.
 *
 * <p>Modo flexível: o usuário segue a sequência (A, B, descanso, C...) no dia em que puder; a
 * próxima sessão depende do que foi concluído, nunca da data. Modo calendário: cada sessão tem
 * um dia fixo (1 = segunda ... 7 = domingo), escolhido pelo usuário, inclusive domingo.
 *
 * <p>Recuperação: duas sessões em dias seguidos "competem" quando somam, nos grupos grandes que
 * têm em comum, pelo menos {@link #LIMITE_SOBREPOSICAO} séries diretas (a menor das duas em cada
 * grupo). Nesses casos a sequência recomenda descanso e o calendário mostra um aviso — sem
 * bloquear a escolha do usuário.
 */
final class AgendaSemanal {

  static final String FLEXIVEL = "flexivel";
  static final String CALENDARIO = "calendario";
  static final double LIMITE_SOBREPOSICAO = 4;
  static final List<String> DIAS =
      Collections.unmodifiableList(
          Arrays.asList("", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"));

  static final class Agenda {
    final String modo;
    final List<Integer> dias;

    Agenda(String modo, List<Integer> dias) {
      this.modo = modo;
      this.dias = dias == null ? null : Collections.unmodifiableList(new ArrayList<>(dias));
    }

    boolean calendario() {
      return CALENDARIO.equals(modo);
    }

    Map<String, Object> toMap() {
      Map<String, Object> mapa = new LinkedHashMap<>();
      mapa.put("modo", modo);
      mapa.put("dias", dias == null ? new ArrayList<>() : new ArrayList<>(dias));
      return mapa;
    }
  }

  private AgendaSemanal() {}

  /** Lê e valida a agenda enviada pelo cliente; erros bloqueantes vão para a lista. */
  static Agenda ler(Object bruto, int sessoes, List<String> erros) {
    if (bruto == null) {
      return new Agenda(FLEXIVEL, null);
    }
    if (!(bruto instanceof Map)) {
      erros.add("Agenda inválida.");
      return new Agenda(FLEXIVEL, null);
    }
    Map<?, ?> mapa = (Map<?, ?>) bruto;
    Object modo = mapa.get("modo");
    if (modo == null || FLEXIVEL.equals(modo)) {
      return new Agenda(FLEXIVEL, null);
    }
    if (!CALENDARIO.equals(modo)) {
      erros.add("Modo de agenda inválido.");
      return new Agenda(FLEXIVEL, null);
    }
    Object dias = mapa.get("dias");
    if (dias == null) {
      return new Agenda(CALENDARIO, null);
    }
    if (!(dias instanceof List)) {
      erros.add("Os dias da agenda devem ser uma lista.");
      return new Agenda(FLEXIVEL, null);
    }
    List<Integer> lista = new ArrayList<>();
    for (Object dia : (List<?>) dias) {
      Integer valor = inteiro(dia);
      if (valor == null || valor < 1 || valor > 7) {
        erros.add("Dia da semana inválido na agenda.");
        return new Agenda(FLEXIVEL, null);
      }
      if (lista.contains(valor)) {
        erros.add("Cada dia da semana só pode receber uma sessão.");
        return new Agenda(FLEXIVEL, null);
      }
      lista.add(valor);
    }
    if (lista.size() != sessoes) {
      erros.add(
          "Escolha "
              + sessoes
              + (sessoes == 1 ? " dia" : " dias")
              + " na agenda — um para cada sessão da rotina.");
      return new Agenda(FLEXIVEL, null);
    }
    Collections.sort(lista);
    return new Agenda(CALENDARIO, lista);
  }

  private static Integer inteiro(Object valor) {
    if (valor instanceof Integer || valor instanceof Long || valor instanceof Short) {
      return ((Number) valor).intValue();
    }
    if (valor instanceof Number) {
      double d = ((Number) valor).doubleValue();
      return d == Math.rint(d) ? (int) d : null;
    }
    return null;
  }

  static double sobreposicao(MontadorSessao.Sessao a, MontadorSessao.Sessao b) {
    Map<String, Double> x = VolumeSemanal.grandesDiretas(a.itens);
    Map<String, Double> y = VolumeSemanal.grandesDiretas(b.itens);
    double total = 0;
    for (Map.Entry<String, Double> entrada : x.entrySet()) {
      Double outro = y.get(entrada.getKey());
      if (outro != null) {
        total += Math.min(entrada.getValue(), outro);
      }
    }
    return total;
  }

  static List<String> gruposEmComum(MontadorSessao.Sessao a, MontadorSessao.Sessao b) {
    Set<String> comuns = new LinkedHashSet<>(VolumeSemanal.grandesDiretas(a.itens).keySet());
    comuns.retainAll(VolumeSemanal.grandesDiretas(b.itens).keySet());
    List<String> rotulos = new ArrayList<>();
    for (String grupo : comuns) {
      rotulos.add(VolumeSemanal.ROTULOS.get(grupo).toLowerCase());
    }
    return rotulos;
  }

  static int maxSeguidos(int sessoes) {
    return sessoes >= 5 ? 3 : 2;
  }

  /** Sequência recomendada para o modo flexível: sessão e se há descanso depois dela. */
  static List<Map<String, Object>> sequencia(List<MontadorSessao.Sessao> sessoes) {
    List<Map<String, Object>> lista = new ArrayList<>();
    int n = sessoes.size();
    int seguidos = 0;
    for (int i = 0; i < n; i++) {
      MontadorSessao.Sessao atual = sessoes.get(i);
      MontadorSessao.Sessao proxima = sessoes.get((i + 1) % n);
      seguidos++;
      boolean descanso =
          i == n - 1
              || sobreposicao(atual, proxima) >= LIMITE_SOBREPOSICAO
              || seguidos >= maxSeguidos(n);
      if (descanso) {
        seguidos = 0;
      }
      Map<String, Object> passo = new LinkedHashMap<>();
      passo.put("codigo", atual.codigo);
      passo.put("descansoDepois", descanso);
      lista.add(passo);
    }
    return lista;
  }

  /** Dias sugeridos para o modo calendário (1 = segunda). */
  static List<Integer> sugeridos(int sessoes) {
    switch (sessoes) {
      case 1:
        return Arrays.asList(3);
      case 2:
        return Arrays.asList(1, 4);
      case 3:
        return Arrays.asList(1, 3, 5);
      case 4:
        return Arrays.asList(1, 2, 4, 5);
      case 5:
        return Arrays.asList(1, 2, 4, 5, 6);
      default:
        return Arrays.asList(1, 2, 3, 4, 5, 6);
    }
  }

  /** Avisos de recuperação para os dias escolhidos no calendário. Nunca bloqueiam. */
  static List<String> avisos(Agenda agenda, List<MontadorSessao.Sessao> sessoes) {
    List<String> avisos = new ArrayList<>();
    if (!agenda.calendario() || agenda.dias == null || agenda.dias.size() != sessoes.size()) {
      return avisos;
    }
    int n = sessoes.size();
    for (int i = 0; i < n && n > 1; i++) {
      int dia = agenda.dias.get(i);
      int seguinte = i + 1 < n ? agenda.dias.get(i + 1) : agenda.dias.get(0) + 7;
      if (seguinte - dia != 1) {
        continue;
      }
      MontadorSessao.Sessao atual = sessoes.get(i);
      MontadorSessao.Sessao proxima = sessoes.get((i + 1) % n);
      if (sobreposicao(atual, proxima) >= LIMITE_SOBREPOSICAO) {
        avisos.add(
            "Treino "
                + atual.codigo
                + " ("
                + DIAS.get(dia).toLowerCase()
                + ") e Treino "
                + proxima.codigo
                + " ("
                + DIAS.get(((seguinte - 1) % 7) + 1).toLowerCase()
                + ") trabalham "
                + juntar(gruposEmComum(atual, proxima))
                + " em dias seguidos. Se puder, deixe um dia de intervalo entre eles para recuperar melhor.");
      }
    }
    if (n < 6) {
      int maior = maiorSequencia(agenda.dias);
      if (maior > maxSeguidos(n)) {
        avisos.add(
            maior
                + " dias seguidos de treino. A divisão alterna os músculos, mas o cansaço geral se acumula; um dia de descanso no meio ajuda a manter a qualidade das sessões.");
      }
    }
    return avisos;
  }

  static int maiorSequencia(List<Integer> dias) {
    boolean[] semana = new boolean[8];
    for (int dia : dias) {
      semana[dia] = true;
    }
    int maior = 0;
    for (int inicio = 1; inicio <= 7; inicio++) {
      int atual = 0;
      for (int k = 0; k < 7 && semana[((inicio - 1 + k) % 7) + 1]; k++) {
        atual++;
      }
      maior = Math.max(maior, atual);
    }
    return maior;
  }

  static String juntar(List<String> partes) {
    if (partes.isEmpty()) {
      return "os mesmos grupos";
    }
    if (partes.size() == 1) {
      return partes.get(0);
    }
    return String.join(", ", partes.subList(0, partes.size() - 1)) + " e " + partes.get(partes.size() - 1);
  }
}
