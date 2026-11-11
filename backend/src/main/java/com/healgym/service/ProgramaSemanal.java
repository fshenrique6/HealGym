package com.healgym.service;

import com.healgym.model.User;
import com.healgym.validation.TrainingProfile;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Monta a semana a partir de {@link PrescricaoPerfil} e das sessões já existentes.
 *
 * <p>Dias e minutos não mudam séries, repetições, descanso nem RIR de um grupamento. Eles escolhem
 * quantas sessões existem, a ordem e o tempo pedido ao {@link SessionPlanner}. O tempo pedido é
 * teto: a sessão pode terminar antes.
 *
 * <p>Heurística de produto, não lei universal: frequência direta perto de duas vezes na semana
 * quando há dias para isso; um dia único cobre o corpo inteiro; sessões vizinhas não repetem o
 * mesmo foco, exceto no corpo inteiro de 2 e 3 dias, em que a variação é de exercício. Volume
 * indireto não entra no teto semanal.
 */
public final class ProgramaSemanal {

  public static final int DIAS_PADRAO = 3;
  public static final int MINUTOS_PADRAO = 60;

  /** Séries diretas por músculo na semana. Rank 1, 2 e 3. */
  static final int[] TETO_GRANDE = {14, 20, 24};

  static final int[] TETO_PEQUENO = {10, 14, 16};

  private static final Set<String> GRANDES =
      new LinkedHashSet<>(
          Arrays.asList("peitoral", "costas", "quadriceps", "isquiotibiais", "gluteos"));

  private ProgramaSemanal() {}

  public static final class Sessao {
    public final String codigo;
    public final int ordem;
    public final String nome;
    public final String grupamento;
    public final int variante;
    public final String foco;
    public final String relacao;
    public final int minutos;
    public final List<Map<String, Object>> exercicios;
    public final int segundos;
    public final int duracaoEstimadaMinutos;
    public final List<String> grupos;
    public final List<String> problemas;
    public final List<String> observacoes;

    Sessao(
        String codigo,
        int ordem,
        String nome,
        String grupamento,
        int variante,
        String foco,
        String relacao,
        int minutos,
        List<Map<String, Object>> exercicios,
        int segundos,
        List<String> grupos,
        List<String> problemas,
        List<String> observacoes) {
      this.codigo = codigo;
      this.ordem = ordem;
      this.nome = nome;
      this.grupamento = grupamento;
      this.variante = variante;
      this.foco = foco;
      this.relacao = relacao;
      this.minutos = minutos;
      this.exercicios = exercicios;
      this.segundos = segundos;
      this.duracaoEstimadaMinutos = Math.max(1, (int) Math.round(segundos / 60.0));
      this.grupos = grupos;
      this.problemas = problemas;
      this.observacoes = observacoes;
    }
  }

  public static final class Programa {
    public final int dias;
    public final int minutos;
    public final String origemDias;
    public final String origemMinutos;
    public final String modo;
    public final int rank;
    public final String estrategia;
    public final String rotulo;
    public final String chave;
    public final List<Sessao> sessoes;
    public final Map<String, Double> volumeDireto;
    public final Map<String, Double> volumeIndireto;
    public final List<String> observacoes;

    Programa(
        int dias,
        int minutos,
        String origemDias,
        String origemMinutos,
        String modo,
        int rank,
        String estrategia,
        String rotulo,
        String chave,
        List<Sessao> sessoes,
        Map<String, Double> volumeDireto,
        Map<String, Double> volumeIndireto,
        List<String> observacoes) {
      this.dias = dias;
      this.minutos = minutos;
      this.origemDias = origemDias;
      this.origemMinutos = origemMinutos;
      this.modo = modo;
      this.rank = rank;
      this.estrategia = estrategia;
      this.rotulo = rotulo;
      this.chave = chave;
      this.sessoes = sessoes;
      this.volumeDireto = volumeDireto;
      this.volumeIndireto = volumeIndireto;
      this.observacoes = observacoes;
    }
  }

  public static final class AcaoPersistencia {
    public final List<String> criar;
    public final List<String> atualizar;

    AcaoPersistencia(List<String> criar, List<String> atualizar) {
      this.criar = criar;
      this.atualizar = atualizar;
    }
  }

  public static Programa planejar(User.Profile profile, int seed) {
    return planejar(profile, seed, null);
  }

  public static Programa planejar(User.Profile profile, int seed, Integer minutosExplicitos) {
    return planejar(PrescricaoPerfil.interpretar(profile), seed, minutosExplicitos);
  }

  public static Programa planejar(PrescricaoPerfil.Configuracao cfg, int seed, Integer minutosExplicitos) {
    int dias = cfg.dias == null ? DIAS_PADRAO : cfg.dias;
    String origemDias = cfg.dias == null ? "padrao" : cfg.origemDias;
    int minutos = cfg.minutos == null ? MINUTOS_PADRAO : cfg.minutos;
    String origemMinutos = cfg.minutos == null ? "padrao" : cfg.origemMinutos;
    if (minutosExplicitos != null && TrainingProfile.SESSION_MINUTES.contains(minutosExplicitos)) {
      minutos = minutosExplicitos;
      origemMinutos = "explicito";
    }
    List<Modelo> modelos = modelos(dias);
    String estrategia = modelos.get(0).estrategia;
    List<Sessao> sessoes = new ArrayList<>();
    int ordem = 1;
    for (Modelo modelo : modelos) {
      WorkoutGenerator.Session gerada =
          WorkoutGenerator.montar(modelo.grupamento, minutos, cfg.rank, cfg.modo, seed, modelo.variante);
      List<String> grupos = new ArrayList<>();
      for (Map<String, Object> item : gerada.exercicios) {
        String bloco = String.valueOf(item.get("bloco"));
        if (!grupos.contains(bloco)) {
          grupos.add(bloco);
        }
      }
      sessoes.add(
          new Sessao(
              "s" + ordem,
              ordem,
              "Sessão " + ordem + " — " + modelo.nome,
              modelo.grupamento,
              modelo.variante,
              modelo.foco,
              modelo.relacao,
              minutos,
              gerada.exercicios,
              gerada.segundos,
              grupos,
              new ArrayList<>(gerada.problemas),
              new ArrayList<>(gerada.observacoes)));
      ordem++;
    }
    List<String> notas = new ArrayList<>();
    limitarVolume(sessoes, cfg.rank, notas);
    notas.add(
        "A duração soma aquecimento, séries de aproximação, execução, descanso, transição e o dobro do tempo nos unilaterais. Ela não precisa ocupar todos os minutos pedidos.");
    notas.add("Séries indiretas não contam como volume direto.");
    if (dias <= 3) {
      notas.add(
          "Nas sessões de corpo inteiro, deixe pelo menos um dia de intervalo ao escolher quando treinar. A programação não marca segunda, terça ou qualquer outro dia.");
    }
    Map<String, Double> direto = new LinkedHashMap<>();
    Map<String, Double> indireto = new LinkedHashMap<>();
    for (Sessao sessao : sessoes) {
      direto.putAll(somar(direto, CoberturaMuscular.seriesDiretasPorMusculo(sessao.exercicios)));
      indireto.putAll(somar(indireto, indiretas(sessao.exercicios)));
    }
    return new Programa(
        dias,
        minutos,
        origemDias,
        origemMinutos,
        cfg.modo,
        cfg.rank,
        estrategia,
        rotulo(estrategia),
        chave(cfg.modo, cfg.rank, dias, minutos, seed),
        sessoes,
        direto,
        indireto,
        notas);
  }

  /**
   * Consultar a semana não cria ficha. Gravar só cria o que ainda não existe com a mesma chave.
   * Atualizar mexe apenas em sessões ainda não realizadas.
   */
  public static AcaoPersistencia decidir(Map<String, Boolean> salvas, List<String> codigos, boolean atualizar) {
    List<String> criar = new ArrayList<>();
    List<String> atualizarCodigos = new ArrayList<>();
    for (String codigo : codigos) {
      if (!salvas.containsKey(codigo)) {
        criar.add(codigo);
      } else if (atualizar && !Boolean.TRUE.equals(salvas.get(codigo))) {
        atualizarCodigos.add(codigo);
      }
    }
    return new AcaoPersistencia(criar, atualizarCodigos);
  }

  public static String chave(String modo, int rank, int dias, int minutos, int seed) {
    return modo + "|" + rank + "|" + dias + "|" + minutos + "|" + seed;
  }

  public static String assinatura(Programa programa) {
    StringBuilder texto = new StringBuilder();
    texto.append(programa.estrategia).append('|').append(programa.dias).append('|').append(programa.minutos).append('\n');
    for (Sessao sessao : programa.sessoes) {
      texto.append(sessao.codigo).append('|').append(sessao.grupamento).append('|').append(sessao.variante).append('\n');
      for (Map<String, Object> item : sessao.exercicios) {
        texto.append(item.get("exercicioId"))
            .append('|')
            .append(item.get("series"))
            .append('|')
            .append(item.get("repeticoes"))
            .append('|')
            .append(item.get("descansoSegundos"))
            .append('|')
            .append(item.get("rirAlvo"))
            .append('\n');
      }
    }
    return texto.toString();
  }

  private static Map<String, Double> somar(Map<String, Double> base, Map<String, Double> extra) {
    for (Map.Entry<String, Double> entrada : extra.entrySet()) {
      base.merge(entrada.getKey(), entrada.getValue(), Double::sum);
    }
    return base;
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Double> indiretas(List<Map<String, Object>> itens) {
    Map<String, Double> resultado = new LinkedHashMap<>();
    for (Map<String, Object> item : itens) {
      Object lista = item.get("secundariosCodigos");
      if (!(lista instanceof List)) {
        continue;
      }
      int series = SessionPlanner.numero(item.get("series"));
      for (Object codigo : (List<Object>) lista) {
        resultado.merge(String.valueOf(codigo), series * 0.5, Double::sum);
      }
    }
    return resultado;
  }

  private static void limitarVolume(List<Sessao> sessoes, int rank, List<String> notas) {
    int indice = Math.max(0, Math.min(2, rank - 1));
    int tetoGrande = TETO_GRANDE[indice];
    int tetoPequeno = TETO_PEQUENO[indice];
    boolean mudou = true;
    int guarda = 0;
    while (mudou && guarda++ < 100) {
      mudou = false;
      Map<String, Integer> semanal = new LinkedHashMap<>();
      for (Sessao sessao : sessoes) {
        for (Map.Entry<String, Double> entrada : CoberturaMuscular.seriesDiretasPorMusculo(sessao.exercicios).entrySet()) {
          String bucket = SessionPlanner.bucket(entrada.getKey());
          if (bucket != null) {
            semanal.merge(bucket, entrada.getValue().intValue(), Integer::sum);
          }
        }
      }
      for (Map.Entry<String, Integer> entrada : semanal.entrySet()) {
        int teto = GRANDES.contains(entrada.getKey()) ? tetoGrande : tetoPequeno;
        if (entrada.getValue() <= teto) {
          continue;
        }
        if (reduzir(sessoes, entrada.getKey())) {
          mudou = true;
          break;
        }
        notas.add(
            "O volume direto de "
                + entrada.getKey()
                + " ficou em "
                + entrada.getValue()
                + " séries na semana. O teto desta etapa é "
                + teto
                + ", e reduzir mais retiraria o exercício.");
        break;
      }
    }
    for (int i = 0; i < sessoes.size(); i++) {
      Sessao atual = sessoes.get(i);
      int segundos = SessionPlanner.segundosTotais(atual.exercicios, atual.minutos);
      List<String> problemas =
          SessionPlanner.validar(atual.grupamento, atual.exercicios, atual.minutos, rank);
      if (segundos != atual.segundos || !problemas.equals(atual.problemas)) {
        sessoes.set(
            i,
            new Sessao(
                atual.codigo,
                atual.ordem,
                atual.nome,
                atual.grupamento,
                atual.variante,
                atual.foco,
                atual.relacao,
                atual.minutos,
                atual.exercicios,
                segundos,
                atual.grupos,
                problemas,
                atual.observacoes));
      }
    }
  }

  private static boolean reduzir(List<Sessao> sessoes, String bucket) {
    for (int i = sessoes.size() - 1; i >= 0; i--) {
      Map<String, Object> acessorio = null;
      Map<String, Object> principal = null;
      for (Map<String, Object> item : sessoes.get(i).exercicios) {
        if (!bucket.equals(SessionPlanner.bucket(String.valueOf(item.get("musculoPrincipalCodigo"))))) {
          continue;
        }
        if ("principal".equals(item.get("papel"))) {
          principal = item;
        } else if (acessorio == null
            || SessionPlanner.numero(item.get("series")) > SessionPlanner.numero(acessorio.get("series"))) {
          acessorio = item;
        }
      }
      Map<String, Object> escolhido =
          acessorio != null && SessionPlanner.numero(acessorio.get("series")) > 2
              ? acessorio
              : principal != null && SessionPlanner.numero(principal.get("series")) > 2 ? principal : null;
      if (escolhido != null) {
        escolhido.put("series", SessionPlanner.numero(escolhido.get("series")) - 1);
        return true;
      }
    }
    return false;
  }

  private static String rotulo(String estrategia) {
    switch (estrategia) {
      case "full_body":
        return "Corpo inteiro";
      case "full_body_ab":
        return "Corpo inteiro em duas sessões";
      case "full_body_rotacao":
        return "Corpo inteiro com rodízio de padrões";
      case "superior_inferior":
        return "Superior e inferior";
      case "cinco_dias":
        return "Inferior, superior e ênfases de empurrar e puxar";
      case "push_pull_legs":
        return "Empurrar, puxar e pernas, duas vezes";
      default:
        return "Programa semanal";
    }
  }

  private static List<Modelo> modelos(int dias) {
    switch (dias) {
      case 1:
        return Collections.singletonList(
            new Modelo(
                "FULL_BODY",
                0,
                "corpo",
                "Corpo inteiro",
                "full_body",
                "Única sessão da semana: joelho, quadril, empurrar e puxar."));
      case 2:
        return Arrays.asList(
            new Modelo(
                "FULL_BODY",
                0,
                "corpo",
                "Corpo inteiro",
                "full_body_ab",
                "Primeira passagem pelos padrões principais."),
            new Modelo(
                "FULL_BODY",
                1,
                "corpo",
                "Corpo inteiro",
                "full_body_ab",
                "Repete os padrões da sessão 1 com outros exercícios."));
      case 3:
        return Arrays.asList(
            new Modelo(
                "FULL_BODY",
                0,
                "corpo",
                "Corpo inteiro",
                "full_body_rotacao",
                "Ênfase em supino reto e remada."),
            new Modelo(
                "FULL_BODY",
                1,
                "corpo",
                "Corpo inteiro",
                "full_body_rotacao",
                "Ênfase em supino inclinado e puxada, sem repetir os exercícios da sessão 1."),
            new Modelo(
                "FULL_BODY",
                2,
                "corpo",
                "Corpo inteiro",
                "full_body_rotacao",
                "O joelho desta sessão é unilateral, para usar afundo ou búlgaro sem repetir o agachamento bilateral."));
      case 4:
        return Arrays.asList(
            new Modelo(
                "SUPERIOR",
                0,
                "superior",
                "Superior",
                "superior_inferior",
                "Empurrar e puxar. A próxima sessão é de pernas."),
            new Modelo(
                "PERNAS",
                0,
                "inferior",
                "Inferior",
                "superior_inferior",
                "Joelho e quadril, separados do superior da sessão anterior."),
            new Modelo(
                "SUPERIOR",
                1,
                "superior",
                "Superior",
                "superior_inferior",
                "Segunda passagem de superior, com inclinado e remada, depois de um dia de pernas."),
            new Modelo(
                "PERNAS",
                1,
                "inferior",
                "Inferior",
                "superior_inferior",
                "Segunda passagem de pernas. O acessório de joelho pode ser afundo ou búlgaro."));
      case 5:
        return Arrays.asList(
            new Modelo(
                "PERNAS",
                0,
                "inferior",
                "Inferior",
                "cinco_dias",
                "Começa pela perna para não encostar duas sessões de tronco."),
            new Modelo(
                "SUPERIOR",
                0,
                "superior",
                "Superior",
                "cinco_dias",
                "Empurrar e puxar juntos, depois do inferior."),
            new Modelo(
                "PERNAS",
                1,
                "inferior",
                "Inferior",
                "cinco_dias",
                "Segunda perna, com o superior no meio. Não fica colada na primeira."),
            new Modelo(
                "PEITO_TRICEPS",
                0,
                "empurra",
                "Empurrar",
                "cinco_dias",
                "Segunda exposição de peito, separada do superior por uma sessão de pernas."),
            new Modelo(
                "COSTAS_BICEPS",
                0,
                "puxa",
                "Puxar",
                "cinco_dias",
                "Segunda exposição de costas, depois do empurrar e longe do superior."));
      default:
        return Arrays.asList(
            new Modelo("PEITO_TRICEPS", 0, "empurra", "Empurrar", "push_pull_legs", "Primeiro empurrar da semana."),
            new Modelo("COSTAS_BICEPS", 0, "puxa", "Puxar", "push_pull_legs", "Puxar logo depois do empurrar, não depois de outro puxar."),
            new Modelo("PERNAS", 0, "inferior", "Inferior", "push_pull_legs", "Pernas depois do tronco."),
            new Modelo(
                "PEITO_TRICEPS",
                1,
                "empurra",
                "Empurrar",
                "push_pull_legs",
                "Segundo empurrar, três sessões depois do primeiro e com outros exercícios."),
            new Modelo(
                "COSTAS_BICEPS",
                1,
                "puxa",
                "Puxar",
                "push_pull_legs",
                "Segundo puxar, separado do primeiro por pernas e empurrar."),
            new Modelo(
                "PERNAS",
                1,
                "inferior",
                "Inferior",
                "push_pull_legs",
                "Segunda perna da semana, não consecutiva à primeira."));
    }
  }

  private static final class Modelo {
    final String grupamento;
    final int variante;
    final String foco;
    final String nome;
    final String estrategia;
    final String relacao;

    Modelo(String grupamento, int variante, String foco, String nome, String estrategia, String relacao) {
      this.grupamento = grupamento;
      this.variante = variante;
      this.foco = foco;
      this.nome = nome;
      this.estrategia = estrategia;
      this.relacao = relacao;
    }
  }
}
