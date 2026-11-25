package com.healgym.service.rotina;

import com.healgym.service.ExerciseDatabase;
import com.healgym.service.SessionPlanner;
import java.util.List;
import java.util.Map;

/**
 * Séries leves da rotina nova. Não substituem as séries de trabalho e não entram no volume.
 *
 * <p>A sessão comum começa com uma série leve. Composto pesado (teto da faixa até 8 repetições)
 * recebe ao menos duas quando a sessão tem 75 minutos ou mais. Abaixo disso, a rampa extra só
 * permanece se couber no tempo. O limite de 75 minutos é uma heurística de encaixe, não uma regra
 * fisiológica.
 */
public final class AquecimentoSessao {

  static final int MINUTOS_RAMPA = 75;

  private AquecimentoSessao() {}

  public static void aplicar(List<Map<String, Object>> itens, int minutos, PerfilInterpretado perfil) {
    if (itens == null || itens.isEmpty() || perfil == null) {
      return;
    }
    String regiao = null;
    int[] desejado = new int[itens.size()];
    for (int i = 0; i < itens.size(); i++) {
      Map<String, Object> item = itens.get(i);
      desejado[i] = desejado(item, i, regiao, perfil);
      item.put("seriesAproximacao", desejado[i]);
      ExerciseDatabase.Exercise exercicio =
          ExerciseDatabase.porId(String.valueOf(item.get("exercicioId")));
      if (exercicio != null && exercicio.composto && exercicio.grupo != null) {
        regiao = exercicio.grupo;
      }
    }
    while (SessionPlanner.segundosTotais(itens, minutos) > minutos * 60L) {
      int indice = redutivel(itens, desejado, minutos);
      if (indice < 0) {
        break;
      }
      Map<String, Object> item = itens.get(indice);
      item.put("seriesAproximacao", MontadorSessao.numero(item.get("seriesAproximacao")) - 1);
    }
  }

  private static int desejado(
      Map<String, Object> item, int indice, String regiaoAnterior, PerfilInterpretado perfil) {
    ExerciseDatabase.Exercise exercicio =
        ExerciseDatabase.porId(String.valueOf(item.get("exercicioId")));
    String papel = String.valueOf(item.get("papel"));
    int prescrito =
        exercicio == null
            ? MontadorSessao.numero(item.get("seriesAproximacao"))
            : Prescricao.aproximacao(exercicio, papel, perfil);
    int topo = topo(String.valueOf(item.get("repeticoes")));
    int minimo = prescrito;
    if (indice == 0) {
      minimo = Math.max(minimo, 1);
    }
    boolean pesado = exercicio != null && exercicio.composto && topo > 0 && topo <= 8;
    if (pesado) {
      minimo = Math.max(minimo, 2);
    }
    if (pesado
        && regiaoAnterior != null
        && exercicio.grupo != null
        && !regiaoAnterior.equals(exercicio.grupo)) {
      minimo = Math.max(minimo, 1);
    }
    return minimo;
  }

  private static int redutivel(List<Map<String, Object>> itens, int[] desejado, int minutos) {
    for (int i = itens.size() - 1; i >= 0; i--) {
      int atual = MontadorSessao.numero(itens.get(i).get("seriesAproximacao"));
      int piso = minutos >= MINUTOS_RAMPA ? desejado[i] : i == 0 ? Math.min(desejado[i], 1) : 0;
      if (atual > piso) {
        return i;
      }
    }
    return -1;
  }

  private static int topo(String repeticoes) {
    String digitos = "";
    int maior = 0;
    String texto = repeticoes == null ? "" : repeticoes;
    for (int i = 0; i <= texto.length(); i++) {
      char c = i == texto.length() ? ' ' : texto.charAt(i);
      if (c >= '0' && c <= '9') {
        digitos += c;
      } else if (!digitos.isEmpty()) {
        maior = Math.max(maior, Integer.parseInt(digitos));
        digitos = "";
      }
    }
    return maior;
  }
}
