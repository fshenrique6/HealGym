package com.healgym.service.rotina;

import com.healgym.service.ExerciseDatabase;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/** Textos de "Por que escolhemos essa rotina para você?", montados a partir das regras usadas. */
final class ExplicacaoRotina {

  private ExplicacaoRotina() {}

  static List<Map<String, Object>> gerar(
      PerfilInterpretado p,
      EstrategiaSemanal.Estrutura estrutura,
      List<MontadorSessao.Sessao> sessoes,
      AgendaSemanal.Agenda agenda,
      List<Map<String, Object>> sequencia) {
    List<Map<String, Object>> itens = new ArrayList<>();
    int n = sessoes.size();
    itens.add(item("estrutura", "Estrutura: " + estrutura.rotulo, EstrategiaSemanal.porque(estrutura, p)));
    if (n < p.dias) {
      itens.add(
          item(
              "frequencia",
              "Por que " + n + (n == 1 ? " sessão" : " sessões") + " e não " + p.dias,
              PerfilInterpretado.motivoMenosSessoes(p, n)));
    }
    itens.add(item("fase", p.faseRotulo, textoFase(p)));
    itens.add(item("prescricao", "Séries, repetições e descanso", textoPrescricao(p, sessoes)));
    itens.add(item("tempo", "Duração das sessões", textoTempo(p, sessoes)));
    String preferencias = textoPreferencias(p, sessoes);
    if (preferencias != null) {
      itens.add(item("preferencias", "Suas preferências", preferencias));
    }
    if (p.frequenciaPeloHistorico) {
      itens.add(
          item(
              "historico",
              "Seu histórico no app",
              "Você concluiu "
                  + p.concluidosRecentes
                  + " treinos no app nas últimas 4 semanas. Levamos essa regularidade em conta."));
    }
    if (!p.lacunas.isEmpty()) {
      itens.add(item("perfil", "Informações que faltam no perfil", textoLacunas(p)));
    }
    itens.add(item("agenda", "Como seguir a semana", textoAgenda(agenda, sessoes, sequencia)));
    return itens;
  }

  private static Map<String, Object> item(String tipo, String titulo, String texto) {
    Map<String, Object> mapa = new LinkedHashMap<>();
    mapa.put("tipo", tipo);
    mapa.put("titulo", titulo);
    mapa.put("texto", texto);
    return mapa;
  }

  static String textoFase(PerfilInterpretado p) {
    String base;
    switch (p.fase) {
      case "inicio":
        base =
            "Você está começando: os exercícios são estáveis e fáceis de aprender, e cada série termina com algumas repetições sobrando.";
        break;
      case "retomada":
        base =
            "Você treinou alguns meses, mas está sem regularidade agora: os treinos começam mais leves até a rotina se firmar.";
        break;
      case "retorno":
        base =
            "Você já treinou por um bom tempo, mas está sem regularidade agora: os exercícios respeitam sua experiência e os treinos começam mais leves.";
        break;
      case "iniciante":
        base =
            "Você treina com regularidade há alguns meses: exercícios estáveis e uma quantidade moderada de séries.";
        break;
      case "intermediario":
        base =
            "Você treina com regularidade há mais de um ano: exercícios principais com barra quando o equipamento permite.";
        break;
      case "experiente":
        base =
            "Você treina há bastante tempo e com regularidade: os treinos podem ser um pouco mais exigentes.";
        break;
      case "experiente_reduzido":
        base =
            "Você tem experiência, mas está treinando 1 a 2 vezes por semana: os exercícios respeitam isso e a carga de trabalho fica moderada.";
        break;
      default:
        base =
            "Seu perfil não informa a experiência em musculação, então usamos a abordagem mais conservadora.";
        break;
    }
    return base + " Distribuímos os exercícios para trabalhar os músculos de forma equilibrada.";
  }

  static String textoPrescricao(PerfilInterpretado p, List<MontadorSessao.Sessao> sessoes) {
    String[] papeis = {Prescricao.PRINCIPAL, Prescricao.COMPOSTO, Prescricao.ISOLADO};
    String[] rotulos = {"principais", "compostos", "complementares"};
    StringBuilder texto = new StringBuilder();
    switch (p.objetivo) {
      case "forca":
        texto.append("Para ganhar força, o exercício principal usa cargas mais altas, menos repetições e descansos mais longos.");
        break;
      case "resistencia":
        texto.append("Para resistência, as séries têm mais repetições e descansos mais curtos.");
        break;
      default:
        texto.append("Organizamos os treinos para equilibrar esforço e recuperação.");
        break;
    }
    for (int i = 0; i < papeis.length; i++) {
      Set<String> repeticoes = new TreeSet<>((a, b) -> {
        int porInicio = Integer.compare(inicio(a), inicio(b));
        return porInicio != 0 ? porInicio : a.compareTo(b);
      });
      TreeSet<Integer> descansos = new TreeSet<>();
      Set<String> rirs = new LinkedHashSet<>();
      for (MontadorSessao.Sessao sessao : sessoes) {
        for (Map<String, Object> item : sessao.itens) {
          if (!papeis[i].equals(item.get("papel"))) {
            continue;
          }
          if (item.get("repeticoes") != null) {
            repeticoes.add(String.valueOf(item.get("repeticoes")).replace('-', '–'));
          }
          descansos.add(MontadorSessao.numero(item.get("descansoSegundos")));
          if (item.get("rirAlvo") != null) {
            rirs.add(String.valueOf(item.get("rirAlvo")).replace('-', '–'));
          }
        }
      }
      if (repeticoes.isEmpty()) {
        continue;
      }
      texto
          .append(" Nos exercícios ")
          .append(rotulos[i])
          .append(", faça ")
          .append(String.join(" ou ", repeticoes))
          .append(" repetições e descanse ")
          .append(
              descansos.first().equals(descansos.last())
                  ? descansoLegivel(descansos.first())
                  : descansoLegivel(descansos.first()) + " a " + descansoLegivel(descansos.last()))
          .append('.');
      if (!rirs.isEmpty()) {
        texto.append(' ').append(fraseReserva(String.join(" ou ", rirs)));
      }
    }
    return texto.toString();
  }

  static String fraseReserva(String rir) {
    String[] partes = rir.replace('–', '-').split("\\s+ou\\s+");
    List<String> miolos = new ArrayList<>();
    for (String parte : partes) {
      String normal = parte.trim();
      if (normal.matches("\\d+-\\d+")) {
        String[] numeros = normal.split("-");
        miolos.add(numeros[0] + " ou " + numeros[1]);
      } else if (normal.matches("\\d+")) {
        miolos.add(normal);
      }
    }
    if (miolos.isEmpty()) {
      return "";
    }
    if (miolos.size() == 1 && "0".equals(miolos.get(0))) {
      return "Termine a série sem repetição sobrando.";
    }
    if (miolos.size() == 1 && "1".equals(miolos.get(0))) {
      return "Termine cada série sentindo que conseguiria fazer mais 1 repetição.";
    }
    return "Termine cada série sentindo que conseguiria fazer mais " + String.join(" ou ", miolos) + " repetições.";
  }

  static String descansoLegivel(int segundos) {
    if (segundos < 120) {
      return segundos + (segundos == 1 ? " segundo" : " segundos");
    }
    int minutos = segundos / 60;
    int resto = segundos % 60;
    if (resto == 0) {
      return minutos + (minutos == 1 ? " minuto" : " minutos");
    }
    return minutos + " min " + resto + " s";
  }

  private static int inicio(String faixa) {
    StringBuilder digitos = new StringBuilder();
    for (char c : faixa.toCharArray()) {
      if (!Character.isDigit(c)) {
        break;
      }
      digitos.append(c);
    }
    return digitos.length() == 0 ? 0 : Integer.parseInt(digitos.toString());
  }

  static String textoTempo(PerfilInterpretado p, List<MontadorSessao.Sessao> sessoes) {
    int menor = Integer.MAX_VALUE;
    int maior = 0;
    Set<String> removidos = new LinkedHashSet<>();
    for (MontadorSessao.Sessao sessao : sessoes) {
      menor = Math.min(menor, sessao.duracaoMinutos());
      maior = Math.max(maior, sessao.duracaoMinutos());
      removidos.addAll(sessao.removidosPorTempo);
    }
    StringBuilder texto =
        new StringBuilder("Cada treino foi pensado para caber em até ")
            .append(p.minutos)
            .append(" minutos");
    texto.append(
        menor == maior
            ? " e a estimativa é de " + menor + " minutos."
            : ". A estimativa fica entre " + menor + " e " + maior + " minutos.");
    if (!removidos.isEmpty()) {
      texto
          .append(" Para caber no tempo, ficaram de fora: ")
          .append(AgendaSemanal.juntar(new ArrayList<>(removidos)))
          .append(". Os exercícios principais foram mantidos.");
    } else if (maior <= p.minutos * 0.75) {
      texto.append(" O treino termina antes do limite para não acumular cansaço demais.");
    }
    return texto.toString();
  }

  static String textoPreferencias(PerfilInterpretado p, List<MontadorSessao.Sessao> sessoes) {
    PreferenciasTreino prefs = p.preferencias;
    Set<String> reservas = new LinkedHashSet<>();
    for (MontadorSessao.Sessao sessao : sessoes) {
      reservas.addAll(sessao.reservas);
    }
    if (prefs.padraoCompleto() && reservas.isEmpty()) {
      return null;
    }
    List<String> partes = new ArrayList<>();
    if (!prefs.todosEquipamentos()) {
      List<String> nomes = new ArrayList<>();
      for (String codigo : prefs.equipamentos) {
        nomes.add(PreferenciasTreino.EQUIPAMENTOS.get(codigo));
      }
      partes.add("Equipamentos considerados: " + AgendaSemanal.juntar(nomes) + ".");
    }
    if ("livres".equals(prefs.preferencia)) {
      partes.add("Pesos livres têm prioridade quando há opção equivalente.");
    } else if ("maquinas".equals(prefs.preferencia)) {
      partes.add("Máquinas e polias têm prioridade quando há opção equivalente.");
    }
    if (!prefs.evitar.isEmpty()) {
      List<String> nomes = new ArrayList<>();
      for (String id : prefs.evitar) {
        ExerciseDatabase.Exercise e = ExerciseDatabase.porId(id);
        if (e != null) {
          nomes.add(e.nome);
        }
      }
      partes.add("Exercícios evitados: " + AgendaSemanal.juntar(nomes) + ".");
    }
    if (!prefs.limitacoes.isEmpty()) {
      List<String> nomes = new ArrayList<>();
      for (String codigo : prefs.limitacoes) {
        String rotulo = PreferenciasTreino.LIMITACOES.get(codigo);
        nomes.add(Character.toLowerCase(rotulo.charAt(0)) + rotulo.substring(1));
      }
      partes.add(
          "Limitações informadas: "
              + String.join("; ", nomes)
              + ". Os exercícios ligados a elas ficaram de fora; isso não substitui uma avaliação profissional.");
    }
    int limite = 0;
    for (String reserva : reservas) {
      if (limite++ == 4) {
        break;
      }
      partes.add(reserva);
    }
    return partes.isEmpty() ? null : String.join(" ", partes);
  }

  static String textoLacunas(PerfilInterpretado p) {
    List<String> usados = new ArrayList<>();
    if (p.lacunas.contains("objetivo")) {
      usados.add("objetivo " + p.objetivoRotulo().toLowerCase());
    }
    if (p.lacunas.contains("dias disponíveis")) {
      usados.add(PerfilInterpretado.DIAS_PADRAO + " dias por semana");
    }
    if (p.lacunas.contains("duração da sessão")) {
      usados.add(PerfilInterpretado.MINUTOS_PADRAO + " min por sessão");
    }
    if (p.lacunas.contains("experiência") || p.lacunas.contains("frequência recente")) {
      usados.add("volume de quem está começando");
    }
    return "Seu perfil não informa "
        + AgendaSemanal.juntar(new ArrayList<>(p.lacunas))
        + ". Enquanto isso, usamos valores conservadores ("
        + AgendaSemanal.juntar(usados)
        + "). Complete o perfil para uma rotina mais precisa.";
  }

  static String textoAgenda(
      AgendaSemanal.Agenda agenda,
      List<MontadorSessao.Sessao> sessoes,
      List<Map<String, Object>> sequencia) {
    if (agenda.calendario() && agenda.dias != null) {
      List<String> partes = new ArrayList<>();
      for (int i = 0; i < sessoes.size(); i++) {
        partes.add(
            "Treino "
                + sessoes.get(i).codigo
                + (agenda.dias.get(i) >= 6 ? " no " : " na ")
                + AgendaSemanal.DIAS.get(agenda.dias.get(i)).toLowerCase());
      }
      return "Dias combinados: "
          + AgendaSemanal.juntar(partes)
          + ". Se um dia passar sem o treino, ele continua pendente.";
    }
    return "Siga a ordem dos treinos. O próximo só libera quando você conclui o anterior.";
  }
}
