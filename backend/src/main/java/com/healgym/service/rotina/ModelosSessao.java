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
 * Modelos de sessão por foco. Cada vaga pede um padrão de movimento (com reservas, em ordem de
 * preferência) e tem prioridade: 1 essencial, 2 importante, 3 complementar. Quando o tempo não
 * comporta tudo, as vagas de prioridade mais baixa saem primeiro.
 */
final class ModelosSessao {

  static final class Opcao {
    final Set<String> padroes;
    final Boolean unilateral;

    Opcao(Boolean unilateral, String... padroes) {
      this.unilateral = unilateral;
      this.padroes = Collections.unmodifiableSet(new LinkedHashSet<>(Arrays.asList(padroes)));
    }
  }

  static final class Vaga {
    final String id;
    final String rotulo;
    final String grupo;
    final List<Opcao> opcoes;

    Vaga(String id, String rotulo, String grupo, Opcao... opcoes) {
      this.id = id;
      this.rotulo = rotulo;
      this.grupo = grupo;
      this.opcoes = Collections.unmodifiableList(Arrays.asList(opcoes));
    }

    Set<String> todosPadroes() {
      Set<String> padroes = new LinkedHashSet<>();
      for (Opcao opcao : opcoes) {
        padroes.addAll(opcao.padroes);
      }
      return padroes;
    }
  }

  static final class Posicao {
    final Vaga vaga;
    final int prioridade;
    final boolean principal;

    Posicao(Vaga vaga, int prioridade, boolean principal) {
      this.vaga = vaga;
      this.prioridade = prioridade;
      this.principal = principal;
    }
  }

  static final class Modelo {
    final String codigo;
    final String foco;
    final List<Posicao> posicoes;

    Modelo(String codigo, String foco, Posicao... posicoes) {
      this.codigo = codigo;
      this.foco = foco;
      this.posicoes = Collections.unmodifiableList(Arrays.asList(posicoes));
    }
  }

  static final Vaga JOELHO =
      new Vaga(
          "joelho",
          "Dominante de joelho",
          "quadriceps",
          new Opcao(false, "agachamento"),
          new Opcao(null, "agachamento"));
  static final Vaga JOELHO_LIVRE =
      new Vaga("joelho_variado", "Dominante de joelho", "quadriceps", new Opcao(null, "agachamento"));
  static final Vaga JOELHO_UNI =
      new Vaga(
          "joelho_unilateral",
          "Dominante de joelho unilateral",
          "quadriceps",
          new Opcao(true, "agachamento"),
          new Opcao(null, "agachamento"));
  static final Vaga EXTENSORA =
      new Vaga("extensao_joelho", "Extensão do joelho", "quadriceps", new Opcao(null, "extensao_joelho"));
  static final Vaga QUADRIL =
      new Vaga(
          "quadril",
          "Dominante de quadril",
          "isquiotibiais",
          new Opcao(null, "dobradica"),
          new Opcao(false, "gluteo"),
          new Opcao(null, "gluteo"));
  static final Vaga GLUTEO =
      new Vaga("gluteo", "Extensão do quadril", "gluteos", new Opcao(null, "gluteo"));
  static final Vaga FLEXORA =
      new Vaga(
          "flexao_joelho",
          "Flexão do joelho",
          "isquiotibiais",
          new Opcao(null, "flexao_joelho"),
          new Opcao(null, "dobradica"));
  static final Vaga PANTURRILHA =
      new Vaga("panturrilha", "Panturrilhas", "panturrilhas", new Opcao(null, "panturrilha"));
  static final Vaga SUPINO =
      new Vaga(
          "empurrar_horizontal",
          "Empurrar horizontal",
          "peito",
          new Opcao(null, "supino_horizontal", "supino_declinado"),
          new Opcao(null, "supino_inclinado"));
  static final Vaga INCLINADO =
      new Vaga(
          "empurrar_inclinado",
          "Empurrar inclinado",
          "peito",
          new Opcao(null, "supino_inclinado"),
          new Opcao(null, "supino_horizontal", "supino_declinado"));
  static final Vaga CRUCIFIXO =
      new Vaga("aducao", "Adução horizontal do ombro", "peito", new Opcao(null, "aducao_horizontal"));
  static final Vaga PUXADA =
      new Vaga(
          "puxada_vertical",
          "Puxada vertical",
          "costas",
          new Opcao(null, "puxada_vertical"),
          new Opcao(null, "remada"));
  static final Vaga REMADA =
      new Vaga(
          "remada",
          "Remada",
          "costas",
          new Opcao(null, "remada"),
          new Opcao(null, "puxada_vertical"));
  static final Vaga DESENVOLVIMENTO =
      new Vaga(
          "empurrar_vertical",
          "Empurrar vertical",
          "deltoide_anterior",
          new Opcao(null, "desenvolvimento"),
          new Opcao(null, "elevacao_lateral"));
  static final Vaga LATERAL =
      new Vaga(
          "elevacao_lateral",
          "Elevação lateral",
          "deltoide_lateral",
          new Opcao(null, "elevacao_lateral"),
          new Opcao(null, "desenvolvimento"));
  static final Vaga POSTERIOR =
      new Vaga(
          "deltoide_posterior",
          "Ombro posterior",
          "deltoide_posterior",
          new Opcao(null, "deltoide_posterior"));
  static final Vaga TRICEPS =
      new Vaga(
          "triceps",
          "Tríceps",
          "triceps",
          new Opcao(null, "triceps_pushdown"),
          new Opcao(null, "triceps_overhead"));
  static final Vaga TRICEPS_ALONGADO =
      new Vaga(
          "triceps_alongado",
          "Tríceps com o braço acima da cabeça",
          "triceps",
          new Opcao(null, "triceps_overhead"),
          new Opcao(null, "triceps_pushdown"));
  static final Vaga BICEPS =
      new Vaga(
          "biceps", "Bíceps", "biceps", new Opcao(null, "rosca"), new Opcao(null, "rosca_neutra"));
  static final Vaga BICEPS_NEUTRO =
      new Vaga(
          "biceps_neutro",
          "Bíceps com pegada neutra",
          "biceps",
          new Opcao(null, "rosca_neutra"),
          new Opcao(null, "rosca"));
  static final Vaga CORE = new Vaga("core", "Core", "core", new Opcao(null, "core"));

  /** Vagas usadas para completar o volume de um grupo quando as séries existentes não bastam. */
  static final Map<String, List<Vaga>> COMPLEMENTOS = new LinkedHashMap<>();

  /** Grupos que cada foco pode receber como complemento. */
  static final Map<String, Set<String>> GRUPOS_DO_FOCO = new LinkedHashMap<>();

  static final Map<String, Modelo> MODELOS = new LinkedHashMap<>();
  static final Map<String, String> FOCO_ROTULO = new LinkedHashMap<>();
  static final Map<String, String> FOCO_GRUPOS = new LinkedHashMap<>();
  static final Map<String, String> FOCO_GRUPAMENTO = new LinkedHashMap<>();

  static {
    COMPLEMENTOS.put("peito", Arrays.asList(INCLINADO, CRUCIFIXO, SUPINO));
    COMPLEMENTOS.put("costas", Arrays.asList(PUXADA, REMADA));
    COMPLEMENTOS.put("deltoide_lateral", Arrays.asList(LATERAL));
    COMPLEMENTOS.put("deltoide_posterior", Arrays.asList(POSTERIOR));
    COMPLEMENTOS.put("triceps", Arrays.asList(TRICEPS, TRICEPS_ALONGADO));
    COMPLEMENTOS.put("biceps", Arrays.asList(BICEPS, BICEPS_NEUTRO));
    COMPLEMENTOS.put("quadriceps", Arrays.asList(EXTENSORA, JOELHO_UNI));
    COMPLEMENTOS.put("isquiotibiais", Arrays.asList(FLEXORA, QUADRIL));
    COMPLEMENTOS.put("gluteos", Arrays.asList(GLUTEO));
    COMPLEMENTOS.put("panturrilhas", Arrays.asList(PANTURRILHA));

    Set<String> superiores =
        new LinkedHashSet<>(
            Arrays.asList(
                "peito", "costas", "deltoide_anterior", "deltoide_lateral", "deltoide_posterior", "triceps", "biceps"));
    Set<String> inferiores =
        new LinkedHashSet<>(Arrays.asList("quadriceps", "isquiotibiais", "gluteos", "panturrilhas", "core"));
    Set<String> todos = new LinkedHashSet<>(superiores);
    todos.addAll(inferiores);
    GRUPOS_DO_FOCO.put("FULL_BODY", todos);
    GRUPOS_DO_FOCO.put("SUPERIOR", superiores);
    GRUPOS_DO_FOCO.put("INFERIOR", inferiores);
    GRUPOS_DO_FOCO.put("PERNAS", inferiores);
    GRUPOS_DO_FOCO.put(
        "EMPURRAR",
        new LinkedHashSet<>(Arrays.asList("peito", "deltoide_anterior", "deltoide_lateral", "triceps")));
    GRUPOS_DO_FOCO.put(
        "PUXAR", new LinkedHashSet<>(Arrays.asList("costas", "deltoide_posterior", "biceps", "core")));

    FOCO_ROTULO.put("FULL_BODY", "Corpo inteiro");
    FOCO_ROTULO.put("SUPERIOR", "Superior");
    FOCO_ROTULO.put("INFERIOR", "Inferior");
    FOCO_ROTULO.put("EMPURRAR", "Empurrar");
    FOCO_ROTULO.put("PUXAR", "Puxar");
    FOCO_ROTULO.put("PERNAS", "Pernas");

    FOCO_GRUPOS.put("FULL_BODY", "Pernas, peito, costas e ombros");
    FOCO_GRUPOS.put("SUPERIOR", "Peito, costas, ombros e braços");
    FOCO_GRUPOS.put("INFERIOR", "Quadríceps, posteriores, glúteos e panturrilhas");
    FOCO_GRUPOS.put("EMPURRAR", "Peito, ombros e tríceps");
    FOCO_GRUPOS.put("PUXAR", "Costas, ombro posterior e bíceps");
    FOCO_GRUPOS.put("PERNAS", "Quadríceps, posteriores, glúteos e panturrilhas");

    FOCO_GRUPAMENTO.put("FULL_BODY", "FULL_BODY");
    FOCO_GRUPAMENTO.put("SUPERIOR", "SUPERIOR");
    FOCO_GRUPAMENTO.put("INFERIOR", "PERNAS");
    FOCO_GRUPAMENTO.put("EMPURRAR", "EMPURRAR");
    FOCO_GRUPAMENTO.put("PUXAR", "PUXAR");
    FOCO_GRUPAMENTO.put("PERNAS", "PERNAS");

    registrar(
        new Modelo(
            "FB_UNICO",
            "FULL_BODY",
            p(JOELHO, 1, true),
            p(SUPINO, 1),
            p(REMADA, 1),
            p(QUADRIL, 1),
            p(PUXADA, 2),
            p(LATERAL, 2),
            p(TRICEPS, 3),
            p(BICEPS, 3),
            p(CORE, 3)));
    registrar(
        new Modelo(
            "FB_A",
            "FULL_BODY",
            p(JOELHO, 1, true),
            p(SUPINO, 1),
            p(REMADA, 1),
            p(QUADRIL, 2),
            p(LATERAL, 3),
            p(BICEPS, 3),
            p(PANTURRILHA, 3)));
    registrar(
        new Modelo(
            "FB_B",
            "FULL_BODY",
            p(JOELHO_LIVRE, 1, true),
            p(PUXADA, 1),
            p(INCLINADO, 1),
            p(FLEXORA, 2),
            p(DESENVOLVIMENTO, 3),
            p(POSTERIOR, 3),
            p(PANTURRILHA, 3)));
    registrar(
        new Modelo(
            "FB_C",
            "FULL_BODY",
            p(QUADRIL, 1, true),
            p(SUPINO, 1),
            p(REMADA, 1),
            p(JOELHO_UNI, 2),
            p(POSTERIOR, 3),
            p(LATERAL, 3),
            p(PANTURRILHA, 3)));
    registrar(
        new Modelo(
            "SUP_A",
            "SUPERIOR",
            p(SUPINO, 1, true),
            p(REMADA, 1),
            p(PUXADA, 1),
            p(DESENVOLVIMENTO, 2),
            p(LATERAL, 2),
            p(TRICEPS, 3),
            p(BICEPS, 3),
            p(POSTERIOR, 3)));
    registrar(
        new Modelo(
            "SUP_B",
            "SUPERIOR",
            p(PUXADA, 1, true),
            p(INCLINADO, 1),
            p(REMADA, 1),
            p(LATERAL, 2),
            p(CRUCIFIXO, 3),
            p(BICEPS_NEUTRO, 3),
            p(TRICEPS_ALONGADO, 3),
            p(POSTERIOR, 3)));
    registrar(
        new Modelo(
            "SUP_C",
            "SUPERIOR",
            p(REMADA, 1, true),
            p(SUPINO, 1),
            p(PUXADA, 1),
            p(DESENVOLVIMENTO, 2),
            p(LATERAL, 2),
            p(BICEPS, 3),
            p(TRICEPS, 3)));
    registrar(
        new Modelo(
            "INF_A",
            "INFERIOR",
            p(JOELHO, 1, true),
            p(QUADRIL, 1),
            p(JOELHO_UNI, 2),
            p(FLEXORA, 2),
            p(EXTENSORA, 3),
            p(PANTURRILHA, 3),
            p(CORE, 3)));
    registrar(
        new Modelo(
            "INF_B",
            "INFERIOR",
            p(QUADRIL, 1, true),
            p(JOELHO_LIVRE, 1),
            p(FLEXORA, 2),
            p(GLUTEO, 2),
            p(EXTENSORA, 3),
            p(PANTURRILHA, 3),
            p(CORE, 3)));
    registrar(
        new Modelo(
            "INF_C",
            "INFERIOR",
            p(JOELHO_LIVRE, 1, true),
            p(QUADRIL, 1),
            p(JOELHO_UNI, 2),
            p(FLEXORA, 2),
            p(GLUTEO, 3),
            p(PANTURRILHA, 3)));
    registrar(
        new Modelo(
            "PUSH_A",
            "EMPURRAR",
            p(SUPINO, 1, true),
            p(DESENVOLVIMENTO, 1),
            p(INCLINADO, 2),
            p(LATERAL, 2),
            p(TRICEPS, 2),
            p(CRUCIFIXO, 3),
            p(TRICEPS_ALONGADO, 3)));
    registrar(
        new Modelo(
            "PUSH_B",
            "EMPURRAR",
            p(INCLINADO, 1, true),
            p(DESENVOLVIMENTO, 1),
            p(CRUCIFIXO, 2),
            p(LATERAL, 2),
            p(TRICEPS_ALONGADO, 2),
            p(SUPINO, 3),
            p(TRICEPS, 3)));
    registrar(
        new Modelo(
            "PULL_A",
            "PUXAR",
            p(PUXADA, 1, true),
            p(REMADA, 1),
            p(REMADA, 2),
            p(POSTERIOR, 2),
            p(BICEPS, 2),
            p(BICEPS_NEUTRO, 3),
            p(CORE, 3)));
    registrar(
        new Modelo(
            "PULL_B",
            "PUXAR",
            p(REMADA, 1, true),
            p(PUXADA, 1),
            p(PUXADA, 2),
            p(POSTERIOR, 2),
            p(BICEPS, 2),
            p(BICEPS_NEUTRO, 3),
            p(CORE, 3)));
    registrar(
        new Modelo(
            "LEG_A",
            "PERNAS",
            p(JOELHO, 1, true),
            p(QUADRIL, 1),
            p(JOELHO_UNI, 2),
            p(FLEXORA, 2),
            p(EXTENSORA, 3),
            p(PANTURRILHA, 3),
            p(CORE, 3)));
    registrar(
        new Modelo(
            "LEG_B",
            "PERNAS",
            p(QUADRIL, 1, true),
            p(JOELHO_LIVRE, 1),
            p(FLEXORA, 2),
            p(GLUTEO, 2),
            p(EXTENSORA, 3),
            p(PANTURRILHA, 3),
            p(CORE, 3)));
  }

  private ModelosSessao() {}

  private static Posicao p(Vaga vaga, int prioridade) {
    return new Posicao(vaga, prioridade, false);
  }

  private static Posicao p(Vaga vaga, int prioridade, boolean principal) {
    return new Posicao(vaga, prioridade, principal);
  }

  private static void registrar(Modelo modelo) {
    MODELOS.put(modelo.codigo, modelo);
  }

  static Modelo modelo(String codigo) {
    Modelo modelo = MODELOS.get(codigo);
    if (modelo == null) {
      throw new IllegalArgumentException("Modelo de sessão desconhecido: " + codigo);
    }
    return modelo;
  }

  static Vaga vaga(String id) {
    for (Modelo modelo : MODELOS.values()) {
      for (Posicao posicao : modelo.posicoes) {
        if (posicao.vaga.id.equals(id)) {
          return posicao.vaga;
        }
      }
    }
    return null;
  }

  /** Padrões essenciais (prioridade 1) de um modelo, para validação. */
  static List<Vaga> essenciais(Modelo modelo) {
    List<Vaga> vagas = new ArrayList<>();
    for (Posicao posicao : modelo.posicoes) {
      if (posicao.prioridade == 1) {
        vagas.add(posicao.vaga);
      }
    }
    return vagas;
  }
}
