package com.healgym.service.rotina;

import com.healgym.service.ExerciseDatabase;
import com.healgym.service.SessionPlanner;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Monta uma sessão a partir de um modelo: escolhe os exercícios, prescreve, aplica os tetos de
 * volume por sessão e ajusta ao tempo disponível.
 *
 * <p>Ordem de cortes quando a estimativa passa do tempo: séries extras dos complementares, depois
 * os complementares (prioridade 3), séries dos compostos secundários, os exercícios importantes
 * (prioridade 2) e, por último, séries do principal. Exercícios essenciais (prioridade 1) nunca
 * saem; se mesmo assim não couber, a sessão registra o aviso.
 */
final class MontadorSessao {

  /** Fração do tempo usada como alvo, deixando folga para pausas não planejadas. */
  static final double FOLGA = 0.95;

  static final class Sessao {
    final String codigo;
    final ModelosSessao.Modelo modelo;
    final int minutos;
    final List<Map<String, Object>> itens = new ArrayList<>();
    final List<String> avisos = new ArrayList<>();
    final List<Map<String, Object>> ocorrencias = new ArrayList<>();
    final List<String> removidosPorTempo = new ArrayList<>();
    final List<String> vagasSemExercicio = new ArrayList<>();
    final List<String> reservas = new ArrayList<>();

    Sessao(String codigo, ModelosSessao.Modelo modelo, int minutos) {
      this.codigo = codigo;
      this.modelo = modelo;
      this.minutos = minutos;
    }

    int segundos() {
      return SessionPlanner.segundosTotais(itens, minutos);
    }

    int duracaoMinutos() {
      return Math.max(1, (int) Math.round(segundos() / 60.0));
    }

    int orcamento() {
      return (int) Math.floor(minutos * 60 * FOLGA);
    }
  }

  private MontadorSessao() {}

  static int capGrupoSessao(int capacidade) {
    return new int[] {6, 8, 10}[capacidade - 1];
  }

  static int capSeriesSessao(int capacidade) {
    return new int[] {18, 24, 28}[capacidade - 1];
  }

  static Sessao montar(
      String codigo,
      ModelosSessao.Modelo modelo,
      PerfilInterpretado perfil,
      SeletorExercicios.UsoSemanal uso,
      int seed,
      int variacao) {
    Sessao sessao = new Sessao(codigo, modelo, perfil.minutos);
    Set<String> prioritarios = perfil.preferencias.gruposPrioritarios();
    for (int i = 0; i < modelo.posicoes.size(); i++) {
      ModelosSessao.Posicao posicao = modelo.posicoes.get(i);
      SeletorExercicios.Escolha escolha =
          SeletorExercicios.escolher(
              posicao.vaga,
              posicao.principal,
              codigo + ":" + i,
              modelo.foco,
              sessao.itens,
              uso,
              perfil,
              seed,
              variacao);
      if (escolha.exercicio == null) {
        if (!padraoCoberto(sessao, posicao.vaga)) {
          sessao.vagasSemExercicio.add(posicao.vaga.rotulo);
          sessao.avisos.add(
              "Sem exercício compatível para "
                  + posicao.vaga.rotulo.toLowerCase()
                  + motivo(escolha.bloqueio)
                  + ".");
          Map<String, Object> ocorrencia = new LinkedHashMap<>();
          ocorrencia.put("codigo", "sem_exercicio");
          ocorrencia.put("rotulo", posicao.vaga.rotulo);
          ocorrencia.put("motivo", escolha.bloqueio == null ? "" : escolha.bloqueio);
          sessao.ocorrencias.add(ocorrencia);
        }
        continue;
      }
      ExerciseDatabase.Exercise e = escolha.exercicio;
      String papel = Prescricao.papel(e, posicao.principal);
      int series = Prescricao.seriesPadrao(papel, perfil);
      if (prioritarios.contains(VolumeSemanal.grupo(e.principal))) {
        series = Math.min(series + 1, Prescricao.seriesMaximas(papel, perfil));
      }
      Map<String, Object> item = Prescricao.item(e, papel, series, perfil);
      item.put("prioridade", posicao.prioridade);
      item.put("vaga", posicao.vaga.id);
      item.put("vagaRotulo", posicao.vaga.rotulo);
      sessao.itens.add(item);
      if (escolha.reserva && escolha.bloqueio != null) {
        sessao.reservas.add(
            e.nome
                + " substitui "
                + posicao.vaga.rotulo.toLowerCase()
                + " por causa d"
                + motivoReserva(escolha.bloqueio)
                + ".");
      }
    }
    garantirPrincipal(sessao, perfil);
    aplicarTetos(sessao, perfil);
    ajustarAoTempo(sessao, perfil);
    numerar(sessao);
    for (Map<String, Object> item : sessao.itens) {
      uso.registrar(modelo.foco, String.valueOf(item.get("exercicioId")));
    }
    return sessao;
  }

  static String motivo(String bloqueio) {
    if (bloqueio == null) {
      return "";
    }
    switch (bloqueio) {
      case "equipamento":
        return " com os equipamentos disponíveis";
      case "limitacao":
        return " com as limitações informadas";
      case "evitado":
        return " sem os exercícios que você pediu para evitar";
      default:
        return "";
    }
  }

  static String motivoReserva(String bloqueio) {
    switch (bloqueio) {
      case "equipamento":
        return "os equipamentos disponíveis";
      case "limitacao":
        return "as limitações informadas";
      default:
        return "os exercícios que você pediu para evitar";
    }
  }

  /** A sessão já tem um exercício do padrão preferido da vaga (vindo de outra vaga). */
  private static boolean padraoCoberto(Sessao sessao, ModelosSessao.Vaga vaga) {
    for (Map<String, Object> item : sessao.itens) {
      if (vaga.opcoes.get(0).padroes.contains(item.get("padrao"))) {
        return true;
      }
    }
    return false;
  }

  private static void garantirPrincipal(Sessao sessao, PerfilInterpretado perfil) {
    for (Map<String, Object> item : sessao.itens) {
      if (Prescricao.PRINCIPAL.equals(item.get("papel"))) {
        return;
      }
    }
    for (int i = 0; i < sessao.itens.size(); i++) {
      Map<String, Object> item = sessao.itens.get(i);
      if (Boolean.TRUE.equals(item.get("composto"))) {
        sessao.itens.set(i, represcrever(item, Prescricao.PRINCIPAL, perfil));
        return;
      }
    }
  }

  static Map<String, Object> represcrever(
      Map<String, Object> item, String papel, PerfilInterpretado perfil) {
    ExerciseDatabase.Exercise e = ExerciseDatabase.porId(String.valueOf(item.get("exercicioId")));
    int series = Math.max(Prescricao.seriesPadrao(papel, perfil), numero(item.get("series")));
    series = Math.min(series, Prescricao.seriesMaximas(papel, perfil));
    Map<String, Object> novo = Prescricao.item(e, papel, series, perfil);
    for (String campo : new String[] {"prioridade", "vaga", "vagaRotulo"}) {
      if (item.containsKey(campo)) {
        novo.put(campo, item.get(campo));
      }
    }
    return novo;
  }

  static void aplicarTetos(Sessao sessao, PerfilInterpretado perfil) {
    int capGrupo = capGrupoSessao(perfil.capacidade);
    for (int volta = 0; volta < 40; volta++) {
      Map<String, Integer> porGrupo = new LinkedHashMap<>();
      int total = 0;
      for (Map<String, Object> item : sessao.itens) {
        String grupo = VolumeSemanal.grupo((String) item.get("musculoPrincipalCodigo"));
        int series = numero(item.get("series"));
        total += series;
        if (grupo != null) {
          porGrupo.merge(grupo, series, Integer::sum);
        }
      }
      String excedido = null;
      for (Map.Entry<String, Integer> entrada : porGrupo.entrySet()) {
        if (entrada.getValue() > capGrupo) {
          excedido = entrada.getKey();
          break;
        }
      }
      if (excedido == null && total <= capSeriesSessao(perfil.capacidade)) {
        return;
      }
      if (!reduzir(sessao, excedido)) {
        return;
      }
    }
  }

  /** Tira uma série (ou um complementar) do grupo indicado, ou de qualquer grupo se for nulo. */
  private static boolean reduzir(Sessao sessao, String grupo) {
    Map<String, Object> alvo = null;
    for (int prioridade = 3; prioridade >= 1 && alvo == null; prioridade--) {
      for (int i = sessao.itens.size() - 1; i >= 0; i--) {
        Map<String, Object> item = sessao.itens.get(i);
        if (numero(item.get("prioridade")) != prioridade
            || numero(item.get("series")) <= 2
            || (grupo != null && !grupo.equals(VolumeSemanal.grupo((String) item.get("musculoPrincipalCodigo"))))) {
          continue;
        }
        if (Prescricao.PRINCIPAL.equals(item.get("papel")) && prioridade == 1 && alvo == null) {
          continue;
        }
        alvo = item;
        break;
      }
    }
    if (alvo != null) {
      alvo.put("series", numero(alvo.get("series")) - 1);
      return true;
    }
    for (int i = sessao.itens.size() - 1; i >= 0; i--) {
      Map<String, Object> item = sessao.itens.get(i);
      if (numero(item.get("prioridade")) == 3
          && (grupo == null || grupo.equals(VolumeSemanal.grupo((String) item.get("musculoPrincipalCodigo"))))) {
        sessao.itens.remove(i);
        return true;
      }
    }
    return false;
  }

  static void ajustarAoTempo(Sessao sessao, PerfilInterpretado perfil) {
    int orcamento = sessao.orcamento();
    if (sessao.segundos() <= orcamento) {
      return;
    }
    reduzirSeries(sessao, orcamento, 3, false);
    reduzirSeries(sessao, orcamento, 2, true);
    removerPorPrioridade(sessao, orcamento, 3);
    reduzirSeries(sessao, orcamento, 2, false);
    reduzirSeries(sessao, orcamento, 1, false);
    removerPorPrioridade(sessao, orcamento, 2);
    for (Map<String, Object> item : sessao.itens) {
      if (sessao.segundos() <= orcamento) {
        break;
      }
      if (Prescricao.PRINCIPAL.equals(item.get("papel"))) {
        while (numero(item.get("series")) > 2 && sessao.segundos() > orcamento) {
          item.put("series", numero(item.get("series")) - 1);
        }
        while (numero(item.get("seriesAproximacao")) > 1 && sessao.segundos() > orcamento) {
          item.put("seriesAproximacao", numero(item.get("seriesAproximacao")) - 1);
        }
      }
    }
    if (sessao.segundos() > sessao.minutos * 60) {
      sessao.avisos.add(
          "Mesmo só com os exercícios essenciais, a estimativa passa de "
              + sessao.minutos
              + " min. Considere uma duração maior para esta sessão.");
    }
  }

  private static void reduzirSeries(
      Sessao sessao, int orcamento, int prioridade, boolean soIsolados) {
    for (int i = sessao.itens.size() - 1; i >= 0 && sessao.segundos() > orcamento; i--) {
      Map<String, Object> item = sessao.itens.get(i);
      if (numero(item.get("prioridade")) != prioridade || Prescricao.PRINCIPAL.equals(item.get("papel"))) {
        continue;
      }
      if (soIsolados && Boolean.TRUE.equals(item.get("composto"))) {
        continue;
      }
      while (numero(item.get("series")) > 2 && sessao.segundos() > orcamento) {
        item.put("series", numero(item.get("series")) - 1);
      }
    }
  }

  private static void removerPorPrioridade(Sessao sessao, int orcamento, int prioridade) {
    for (int i = sessao.itens.size() - 1; i >= 0 && sessao.segundos() > orcamento; i--) {
      Map<String, Object> item = sessao.itens.get(i);
      if (numero(item.get("prioridade")) == prioridade
          && !Prescricao.PRINCIPAL.equals(item.get("papel"))) {
        sessao.itens.remove(i);
        sessao.removidosPorTempo.add(String.valueOf(item.get("nome")));
      }
    }
  }

  static int blocoOrdem(Map<String, Object> item) {
    String papel = String.valueOf(item.get("papel"));
    return Prescricao.CORE.equals(papel) ? 2 : Prescricao.ISOLADO.equals(papel) ? 1 : 0;
  }

  static void numerar(Sessao sessao) {
    List<Map<String, Object>> ordenados = new ArrayList<>(sessao.itens);
    ordenados.sort(
        Comparator.comparingInt(MontadorSessao::blocoOrdem)
            .thenComparingInt(item -> Prescricao.PRINCIPAL.equals(item.get("papel")) ? 0 : 1));
    sessao.itens.clear();
    sessao.itens.addAll(ordenados);
    int posicao = 1;
    for (Map<String, Object> item : sessao.itens) {
      int blocoOrdem = blocoOrdem(item);
      item.put("bloco", blocoOrdem == 0 ? "Exercícios principais" : blocoOrdem == 1 ? "Complementares" : "Core");
      item.put("blocoOrdem", blocoOrdem);
      item.put("ordem", posicao);
      item.put("posicao", posicao);
      item.put("obrigatorio", numero(item.get("prioridade")) == 1);
      item.put("uid", sessao.codigo + posicao);
      posicao++;
    }
  }

  static int numero(Object valor) {
    return valor instanceof Number ? ((Number) valor).intValue() : 0;
  }
}
