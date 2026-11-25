package com.healgym.service.rotina;

import com.healgym.service.ExecucaoRegras;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.bson.types.ObjectId;

/**
 * Estado da rotina a partir dos treinos realmente registrados.
 *
 * <p>Uma sessão só conta como concluída quando o treino foi marcado como concluído; datas que
 * passam não mudam nada. O ciclo atual é o menor número de conclusões entre as sessões, mais um:
 * quando todas as sessões do ciclo são feitas, o próximo começa sozinho. A próxima sessão é a
 * primeira, na ordem da programação, que ainda não foi concluída neste ciclo.
 */
public final class CicloRotina {

  public static final String PLANEJADA = "planejada";
  public static final String EM_ANDAMENTO = "em_andamento";
  public static final String CONCLUIDA = "concluida";

  private CicloRotina() {}

  @SuppressWarnings("unchecked")
  static List<String> codigos(Document rotina) {
    List<String> codigos = new ArrayList<>();
    Object sessoes = rotina.get("sessoes");
    if (sessoes instanceof List) {
      for (Object sessao : (List<Object>) sessoes) {
        if (sessao instanceof Map && ((Map<String, Object>) sessao).get("codigo") instanceof String) {
          codigos.add((String) ((Map<String, Object>) sessao).get("codigo"));
        }
      }
    }
    return codigos;
  }

  public static Map<String, Object> calcular(
      Document rotina, List<Document> instancias, Map<ObjectId, Document> execucoes) {
    List<String> codigos = codigos(rotina);
    Map<String, Integer> concluidas = new LinkedHashMap<>();
    Map<String, Date> ultimaConclusao = new LinkedHashMap<>();
    Map<String, ObjectId> ultimoConcluido = new LinkedHashMap<>();
    Map<String, Document> abertas = new LinkedHashMap<>();
    for (String codigo : codigos) {
      concluidas.put(codigo, 0);
    }
    for (Document treino : instancias) {
      Object codigo = treino.get("rotinaCodigo");
      if (!(codigo instanceof String) || !concluidas.containsKey(codigo)) {
        continue;
      }
      if (Boolean.TRUE.equals(treino.get("realizado"))) {
        concluidas.merge((String) codigo, 1, Integer::sum);
        Date data = data(treino);
        Date anterior = ultimaConclusao.get(codigo);
        if (data != null && (anterior == null || data.after(anterior))) {
          ultimaConclusao.put((String) codigo, data);
          ultimoConcluido.put((String) codigo, treino.getObjectId("_id"));
        }
      } else {
        Document atual = abertas.get(codigo);
        if (atual == null || criado(treino).after(criado(atual))) {
          abertas.put((String) codigo, treino);
        }
      }
    }
    int ciclo = 1;
    if (!codigos.isEmpty()) {
      int menor = Integer.MAX_VALUE;
      for (int valor : concluidas.values()) {
        menor = Math.min(menor, valor);
      }
      ciclo = menor + 1;
    }
    List<Map<String, Object>> sessoes = new ArrayList<>();
    String proxima = null;
    int concluidasNoCiclo = 0;
    for (String codigo : codigos) {
      Document aberta = abertas.get(codigo);
      String status;
      if (concluidas.get(codigo) >= ciclo) {
        status = CONCLUIDA;
        concluidasNoCiclo++;
      } else if (aberta != null) {
        status = EM_ANDAMENTO;
      } else {
        status = PLANEJADA;
      }
      if (!CONCLUIDA.equals(status) && proxima == null) {
        proxima = codigo;
      }
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("codigo", codigo);
      item.put("status", status);
      item.put("concluidas", concluidas.get(codigo));
      item.put("ultimaConclusao", ultimaConclusao.get(codigo));
      item.put("ultimoConcluidoId", ultimoConcluido.get(codigo));
      if (aberta != null) {
        ObjectId id = aberta.getObjectId("_id");
        Document execucao = execucoes == null ? null : execucoes.get(id);
        item.put("treinoAbertoId", id);
        item.put("abertoDesde", criado(aberta));
        item.put("execucaoIniciada", ExecucaoRegras.iniciada(execucao));
      }
      sessoes.add(item);
    }
    Map<String, Object> estado = new LinkedHashMap<>();
    estado.put("ciclo", ciclo);
    estado.put("proxima", proxima);
    estado.put("concluidasNoCiclo", concluidasNoCiclo);
    estado.put("totalSessoes", codigos.size());
    estado.put("sessoes", sessoes);
    return estado;
  }

  private static Date data(Document treino) {
    Object data = treino.get("dataRealizacao");
    if (data instanceof Date) {
      return (Date) data;
    }
    Object atualizado = treino.get("updatedAt");
    return atualizado instanceof Date ? (Date) atualizado : null;
  }

  private static Date criado(Document treino) {
    Object criado = treino.get("createdAt");
    return criado instanceof Date ? (Date) criado : new Date(0);
  }

}
