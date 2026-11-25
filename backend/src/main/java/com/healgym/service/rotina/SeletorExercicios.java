package com.healgym.service.rotina;

import com.healgym.service.ExerciseDatabase;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Escolhe exercícios do catálogo para cada vaga. Só considera exercícios ativos e existentes; se
 * nenhuma opção couber nas preferências, a vaga fica vazia e a limitação é informada.
 *
 * <p>Pontuação: fundamento × 10, menos 3 por ponto de distância da dificuldade desejada para o
 * nível técnico, mais bônus de estabilidade (máquina e polia) para iniciantes, bônus de barra no
 * principal para quem já domina a técnica, bônus da preferência de equipamento e penalidades por
 * repetir o mesmo exercício na semana. O desempate é determinístico por usuário e por variação.
 */
final class SeletorExercicios {

  static final class Escolha {
    final ExerciseDatabase.Exercise exercicio;
    final boolean reserva;
    final String bloqueio;

    Escolha(ExerciseDatabase.Exercise exercicio, boolean reserva, String bloqueio) {
      this.exercicio = exercicio;
      this.reserva = reserva;
      this.bloqueio = bloqueio;
    }
  }

  /** Uso dos exercícios ao longo da semana, para evitar repetição desnecessária. */
  static final class UsoSemanal {
    final Map<String, Integer> porExercicio = new HashMap<>();
    final Map<String, Set<String>> porFoco = new HashMap<>();

    void registrar(String foco, String exercicioId) {
      porExercicio.merge(exercicioId, 1, Integer::sum);
      porFoco.computeIfAbsent(foco, chave -> new LinkedHashSet<>()).add(exercicioId);
    }
  }

  private SeletorExercicios() {}

  static int dificuldadeMaxima(int nivelTecnico) {
    return nivelTecnico >= 3 ? 3 : 2;
  }

  static String tipo(Collection<String> equipamento) {
    if (equipamento.contains("maquina")) {
      return "maquina";
    }
    for (String item : equipamento) {
      if (item.startsWith("polia")) {
        return "polia";
      }
    }
    if (equipamento.contains("barra_fixa")) {
      return "corpo";
    }
    if (equipamento.contains("barra")) {
      return "barra";
    }
    if (equipamento.contains("halteres")) {
      return "halteres";
    }
    return "corpo";
  }

  static String assinatura(ExerciseDatabase.Exercise e) {
    return e.padrao + "|" + e.unilateral + "|" + tipo(e.equipamento);
  }

  @SuppressWarnings("unchecked")
  static String assinatura(Map<String, Object> item) {
    Object equipamento = item.get("equipamento");
    List<String> lista = equipamento instanceof List ? (List<String>) equipamento : new ArrayList<>();
    return item.get("padrao") + "|" + Boolean.TRUE.equals(item.get("unilateral")) + "|" + tipo(lista);
  }

  static Escolha escolher(
      ModelosSessao.Vaga vaga,
      boolean principal,
      String chave,
      String foco,
      List<Map<String, Object>> itensSessao,
      UsoSemanal uso,
      PerfilInterpretado perfil,
      int seed,
      int variacao) {
    Set<String> ids = new LinkedHashSet<>();
    Set<String> assinaturas = new LinkedHashSet<>();
    for (Map<String, Object> item : itensSessao) {
      ids.add(String.valueOf(item.get("exercicioId")));
      assinaturas.add(assinatura(item));
    }
    String bloqueio = null;
    for (int indice = 0; indice < vaga.opcoes.size(); indice++) {
      ModelosSessao.Opcao opcao = vaga.opcoes.get(indice);
      ExerciseDatabase.Exercise melhor = null;
      double melhorNota = Double.NEGATIVE_INFINITY;
      for (ExerciseDatabase.Exercise e : ExerciseDatabase.ativos()) {
        if (!compativel(e, opcao, perfil) || ids.contains(e.id) || assinaturas.contains(assinatura(e))) {
          continue;
        }
        String motivo = perfil.preferencias.motivoExclusao(e);
        if (motivo != null) {
          if (bloqueio == null) {
            bloqueio = motivo;
          }
          continue;
        }
        double nota = nota(e, principal, foco, uso, perfil) + ruido(seed, variacao, chave, e.id);
        if (nota > melhorNota || (nota == melhorNota && melhor != null && e.id.compareTo(melhor.id) < 0)) {
          melhor = e;
          melhorNota = nota;
        }
      }
      if (melhor != null) {
        return new Escolha(melhor, indice > 0, indice > 0 ? bloqueio : null);
      }
    }
    return new Escolha(null, false, bloqueio);
  }

  static boolean compativel(
      ExerciseDatabase.Exercise e, ModelosSessao.Opcao opcao, PerfilInterpretado perfil) {
    return e.ativo
        && e.fundamento > 0
        && opcao.padroes.contains(e.padrao)
        && (opcao.unilateral == null || opcao.unilateral == e.unilateral)
        && e.dificuldade <= dificuldadeMaxima(perfil.nivelTecnico);
  }

  static double nota(
      ExerciseDatabase.Exercise e,
      boolean principal,
      String foco,
      UsoSemanal uso,
      PerfilInterpretado perfil) {
    double desejada = perfil.nivelTecnico == 1 ? 1 : perfil.nivelTecnico == 2 ? 1.5 : 2;
    String tipo = tipo(e.equipamento);
    double nota = e.fundamento * 10 - Math.abs(e.dificuldade - desejada) * 3;
    boolean supino = e.padrao.startsWith("supino");
    if (perfil.nivelTecnico == 1) {
      if (supino) {
        nota += "halteres".equals(tipo) ? 2 : 0;
      } else if ("maquina".equals(tipo) || "polia".equals(tipo)) {
        nota += 2;
      }
    }
    if (principal && perfil.nivelTecnico >= 2 && "barra".equals(tipo)) {
      nota += 2;
    }
    if (principal && e.unilateral) {
      nota -= 4;
    }
    String preferencia = perfil.preferencias.preferencia;
    if ("livres".equals(preferencia)
        && ("barra".equals(tipo) || "halteres".equals(tipo) || "corpo".equals(tipo))) {
      nota += 5;
    } else if ("maquinas".equals(preferencia) && ("maquina".equals(tipo) || "polia".equals(tipo))) {
      nota += 5;
    }
    if (uso != null) {
      boolean repeteForca = principal && "forca".equals(perfil.objetivo);
      nota -= (repeteForca ? 1 : 2) * uso.porExercicio.getOrDefault(e.id, 0);
      Set<String> mesmoFoco = uso.porFoco.get(foco);
      if (!repeteForca && mesmoFoco != null && mesmoFoco.contains(e.id)) {
        nota -= 5;
      }
    }
    return nota;
  }

  static double ruido(int seed, int variacao, String chave, String id) {
    int h = 17;
    h = 31 * h + seed;
    h = 31 * h + variacao;
    h = 31 * h + chave.hashCode();
    h = 31 * h + id.hashCode();
    h ^= h >>> 16;
    h *= 0x45d9f3b;
    h ^= h >>> 16;
    double unidade = (h & 0x7fffffff) / (double) Integer.MAX_VALUE;
    return unidade * (variacao == 0 ? 0.9 : 4.0);
  }

  /** Candidatos compatíveis com uma vaga, para trocas manuais. */
  static List<ExerciseDatabase.Exercise> candidatos(
      Set<String> padroes, Boolean unilateral, PerfilInterpretado perfil) {
    List<ExerciseDatabase.Exercise> lista = new ArrayList<>();
    ModelosSessao.Opcao opcao = new ModelosSessao.Opcao(unilateral, padroes.toArray(new String[0]));
    for (ExerciseDatabase.Exercise e : ExerciseDatabase.ativos()) {
      if (compativel(e, opcao, perfil) && perfil.preferencias.permite(e)) {
        lista.add(e);
      }
    }
    return lista;
  }
}
