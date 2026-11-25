package com.healgym.service.rotina;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Escolhe a estrutura semanal pela viabilidade, não só pelos dias livres.
 *
 * <p>O número de sessões é o menor entre os dias disponíveis e o que a capacidade atual comporta
 * (3 para quem está começando ou voltando, 4 ou 5 para quem treina com regularidade, 6 para
 * experientes regulares). Entre as estruturas viáveis para esse número, a primeira da lista é a
 * recomendada; as demais ficam como alternativas explícitas.
 */
final class EstrategiaSemanal {

  static final class Estrutura {
    final String codigo;
    final String rotulo;
    final String descricao;
    final List<String> modelos;

    Estrutura(String codigo, String rotulo, String descricao, String... modelos) {
      this.codigo = codigo;
      this.rotulo = rotulo;
      this.descricao = descricao;
      this.modelos = Collections.unmodifiableList(Arrays.asList(modelos));
    }

    Map<String, Object> toMap() {
      Map<String, Object> mapa = new LinkedHashMap<>();
      mapa.put("codigo", codigo);
      mapa.put("rotulo", rotulo);
      mapa.put("descricao", descricao);
      mapa.put("sessoes", modelos.size());
      return mapa;
    }
  }

  static final Map<String, Estrutura> ESTRUTURAS = new LinkedHashMap<>();

  static {
    registrar(
        new Estrutura(
            "full_body_1", "Corpo inteiro", "1 sessão por semana com todos os grupos", "FB_UNICO"));
    registrar(
        new Estrutura(
            "full_body_2",
            "Corpo inteiro A e B",
            "2 sessões alternadas, cada uma com todos os grupos",
            "FB_A",
            "FB_B"));
    registrar(
        new Estrutura(
            "full_body_3",
            "Corpo inteiro A, B e C",
            "3 sessões de corpo inteiro com exercícios diferentes",
            "FB_A",
            "FB_B",
            "FB_C"));
    registrar(
        new Estrutura(
            "hibrido_3",
            "Superior, inferior e corpo inteiro",
            "Superior e inferior em dias separados, mais uma sessão de corpo inteiro",
            "SUP_A",
            "INF_A",
            "FB_C"));
    registrar(
        new Estrutura(
            "ppl_3",
            "Empurrar, puxar e pernas",
            "Uma sessão para cada função: empurrar, puxar e pernas",
            "PUSH_A",
            "PULL_A",
            "LEG_A"));
    registrar(
        new Estrutura(
            "superior_inferior_4",
            "Superior e inferior",
            "Superior e inferior alternados, duas vezes cada",
            "SUP_A",
            "INF_A",
            "SUP_B",
            "INF_B"));
    registrar(
        new Estrutura(
            "superior_inferior_ppl_5",
            "Superior e inferior + empurrar, puxar e pernas",
            "Superior e inferior seguidos de empurrar, puxar e pernas",
            "SUP_A",
            "INF_A",
            "PUSH_B",
            "PULL_B",
            "LEG_B"));
    registrar(
        new Estrutura(
            "ppl_6",
            "Empurrar, puxar e pernas (2×)",
            "Empurrar, puxar e pernas, duas vezes na semana",
            "PUSH_A",
            "PULL_A",
            "LEG_A",
            "PUSH_B",
            "PULL_B",
            "LEG_B"));
    registrar(
        new Estrutura(
            "superior_inferior_6",
            "Superior e inferior (3×)",
            "Superior e inferior alternados, três vezes cada",
            "SUP_A",
            "INF_A",
            "SUP_B",
            "INF_B",
            "SUP_C",
            "INF_C"));
  }

  private EstrategiaSemanal() {}

  private static void registrar(Estrutura estrutura) {
    ESTRUTURAS.put(estrutura.codigo, estrutura);
  }

  static int sessoes(PerfilInterpretado perfil) {
    return Math.max(1, Math.min(perfil.dias, perfil.maxSessoes));
  }

  static List<Estrutura> viaveis(PerfilInterpretado perfil, int sessoes) {
    List<String> codigos;
    switch (sessoes) {
      case 1:
        codigos = Arrays.asList("full_body_1");
        break;
      case 2:
        codigos = Arrays.asList("full_body_2");
        break;
      case 3:
        if (perfil.conservador()) {
          codigos = Arrays.asList("full_body_3");
        } else if (perfil.minutos >= 60) {
          // ppl_3 treina cada grupo grande uma vez, e o teto da sessão fica abaixo do mínimo
          // semanal. Continua registrada para programações já salvas, mas não é oferecida.
          codigos = Arrays.asList("hibrido_3", "full_body_3");
        } else {
          codigos = Arrays.asList("full_body_3", "hibrido_3");
        }
        break;
      case 4:
        codigos = Arrays.asList("superior_inferior_4");
        break;
      case 5:
        codigos = Arrays.asList("superior_inferior_ppl_5");
        break;
      default:
        codigos = Arrays.asList("ppl_6", "superior_inferior_6");
        break;
    }
    List<Estrutura> lista = new ArrayList<>();
    for (String codigo : codigos) {
      lista.add(ESTRUTURAS.get(codigo));
    }
    return lista;
  }

  /** Justificativa da estrutura, coerente com as regras usadas na escolha. */
  static String porque(Estrutura estrutura, PerfilInterpretado perfil) {
    switch (estrutura.codigo) {
      case "full_body_1":
        return "Com um treino por semana, o corpo inteiro trabalha todos os músculos. Se puder, um segundo dia ajuda a evoluir.";
      case "full_body_2":
        return "Dois treinos de corpo inteiro, com exercícios diferentes entre A e B. Os grupos trabalhados aparecem duas vezes na semana, no exercício principal ou junto com outro movimento.";
      case "full_body_3":
        return perfil.conservador()
            ? "Três treinos de corpo inteiro, com poucas séries por vez, para aprender os movimentos e recuperar entre os dias."
            : "Três treinos de corpo inteiro deixam os grupos trabalhados em movimento três vezes na semana, no exercício principal ou junto com outro movimento.";
      case "hibrido_3":
        return "Um treino de superiores, um de inferiores e um de corpo inteiro, para equilibrar esforço e recuperação.";
      case "ppl_3":
        return "Um treino para empurrar, um para puxar e um para as pernas. Cada parte do corpo tem o seu dia.";
      case "superior_inferior_4":
        return "Superiores e inferiores alternados, para um descansar enquanto o outro trabalha.";
      case "superior_inferior_ppl_5":
        return "A semana começa com superiores e inferiores e segue com empurrar, puxar e pernas, sem repetir os mesmos músculos em dias seguidos.";
      case "ppl_6":
        return "Empurrar, puxar e pernas duas vezes na semana, com espaço para recuperar entre os treinos parecidos.";
      case "superior_inferior_6":
        return "Superiores e inferiores alternados ao longo da semana, para equilibrar esforço e recuperação.";
      default:
        return estrutura.descricao + ".";
    }
  }
}
