package com.healgym.service.rotina;

import com.healgym.service.ExerciseDatabase;
import com.healgym.service.SessionPlanner;
import java.util.Map;

/**
 * Parâmetros de cada exercício. As faixas seguem heurísticas usuais de musculação:
 *
 * <ul>
 *   <li>o exercício principal da sessão usa a faixa mais baixa do objetivo, descanso maior e séries
 *       de aproximação;
 *   <li>compostos complementares ficam no meio da faixa; isoladores, no topo;
 *   <li>perfis conservadores (iniciante ou capacidade reduzida) ficam mais longe da falha (RIR 2-3)
 *       e não recebem faixas de 4-6 repetições.
 * </ul>
 */
final class Prescricao {

  static final String PRINCIPAL = "principal";
  static final String COMPOSTO = "composto";
  static final String ISOLADO = "isolado";
  static final String CORE = "core";

  private Prescricao() {}

  static String papel(ExerciseDatabase.Exercise exercicio, boolean principal) {
    if ("core".equals(exercicio.padrao)) {
      return CORE;
    }
    if (exercicio.composto) {
      return principal ? PRINCIPAL : COMPOSTO;
    }
    return ISOLADO;
  }

  static String papelRotulo(String papel) {
    switch (papel) {
      case PRINCIPAL:
        return "Principal";
      case COMPOSTO:
        return "Composto";
      case CORE:
        return "Core";
      default:
        return "Complementar";
    }
  }

  static int seriesPadrao(String papel, PerfilInterpretado p) {
    switch (papel) {
      case PRINCIPAL:
        if ("forca".equals(p.objetivo) && p.capacidade >= 2) {
          return 4;
        }
        return p.capacidade == 3 ? 4 : 3;
      case COMPOSTO:
        return p.capacidade == 1 ? 2 : 3;
      case ISOLADO:
        return p.capacidade == 3 ? 3 : 2;
      default:
        return 2;
    }
  }

  static int seriesMaximas(String papel, PerfilInterpretado p) {
    switch (papel) {
      case PRINCIPAL:
        return "forca".equals(p.objetivo) && p.capacidade >= 2 ? 5 : p.capacidade == 1 ? 3 : 4;
      case COMPOSTO:
        return p.capacidade == 1 ? 3 : 4;
      case ISOLADO:
        return p.capacidade == 1 ? 3 : 4;
      default:
        return 3;
    }
  }

  static String repeticoes(ExerciseDatabase.Exercise e, String papel, PerfilInterpretado p) {
    boolean avancaFaixa = p.nivelTecnico >= 2 && p.capacidade >= 2;
    switch (p.objetivo) {
      case "forca":
        if (PRINCIPAL.equals(papel)) {
          return avancaFaixa && cargaEstavel(e) ? "4-6" : "6-8";
        }
        if (COMPOSTO.equals(papel)) {
          return p.nivelTecnico >= 2 ? "6-8" : "8-10";
        }
        return "8-12";
      case "resistencia":
        return ISOLADO.equals(papel) ? "15-20" : "12-15";
      default:
        if (PRINCIPAL.equals(papel)) {
          return avancaFaixa ? "6-10" : "8-12";
        }
        if (COMPOSTO.equals(papel)) {
          return "8-12";
        }
        return topoAlto(e) ? "12-15" : "10-12";
    }
  }

  /** Barra ou máquina, bilateral: permite faixas baixas de repetição com segurança. */
  static boolean cargaEstavel(ExerciseDatabase.Exercise e) {
    return !e.unilateral && (e.equipamento.contains("barra") || e.equipamento.contains("maquina"));
  }

  static boolean topoAlto(ExerciseDatabase.Exercise e) {
    return "elevacao_lateral".equals(e.padrao)
        || "deltoide_posterior".equals(e.padrao)
        || "panturrilha".equals(e.padrao);
  }

  static int descanso(ExerciseDatabase.Exercise e, String papel, PerfilInterpretado p) {
    if (CORE.equals(papel)) {
      return "resistencia".equals(p.objetivo) ? 30 : 45;
    }
    switch (p.objetivo) {
      case "forca":
        if (PRINCIPAL.equals(papel)) {
          return p.nivelTecnico >= 2 && p.capacidade >= 2 ? 180 : 150;
        }
        return COMPOSTO.equals(papel) ? 120 : 75;
      case "resistencia":
        if (PRINCIPAL.equals(papel)) {
          return 75;
        }
        return COMPOSTO.equals(papel) ? 60 : 45;
      default:
        if (PRINCIPAL.equals(papel)) {
          return p.capacidade == 1 ? 90 : 120;
        }
        if (COMPOSTO.equals(papel)) {
          return 90;
        }
        boolean pernas =
            "extensao_joelho".equals(e.padrao)
                || "flexao_joelho".equals(e.padrao)
                || "gluteo".equals(e.padrao);
        return pernas && p.capacidade >= 2 ? 75 : 60;
    }
  }

  static String rir(String papel, PerfilInterpretado p) {
    if (CORE.equals(papel)) {
      return null;
    }
    if (p.conservador()) {
      return "2-3";
    }
    if ("forca".equals(p.objetivo)) {
      return ISOLADO.equals(papel) ? "1-2" : "2-3";
    }
    if ("resistencia".equals(p.objetivo)) {
      return "1-2";
    }
    return PRINCIPAL.equals(papel) ? "1-3" : "1-2";
  }

  static int aproximacao(ExerciseDatabase.Exercise e, String papel, PerfilInterpretado p) {
    if (!e.composto) {
      return 0;
    }
    if (PRINCIPAL.equals(papel)) {
      if ("forca".equals(p.objetivo) && p.nivelTecnico >= 2) {
        return 3;
      }
      return p.nivelTecnico == 1 ? 1 : 2;
    }
    return e.equipamento.contains("barra") ? 1 : 0;
  }

  /** Item completo, com o mesmo formato dos treinos já gravados. */
  static Map<String, Object> item(
      ExerciseDatabase.Exercise e, String papel, int series, PerfilInterpretado p) {
    Map<String, Object> item =
        SessionPlanner.prescrever(
            e, p.nivelTecnico, p.objetivo, PRINCIPAL.equals(papel), "normal", null);
    int descanso = descanso(e, papel, p);
    item.put("papel", papel);
    item.put("papelRotulo", papelRotulo(papel));
    item.put("series", series);
    if (!CORE.equals(papel)) {
      item.put("repeticoes", repeticoes(e, papel, p));
    }
    item.put("descanso", descanso + "s");
    item.put("descansoSegundos", descanso);
    item.put("seriesAproximacao", aproximacao(e, papel, p));
    String rir = rir(papel, p);
    if (rir == null) {
      item.remove("rirAlvo");
    } else {
      item.put("rirAlvo", rir);
    }
    return item;
  }
}
