package com.healgym.service.rotina;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicInteger;
import org.bson.Document;
import org.bson.types.ObjectId;

/**
 * Armazenamento em memória com as mesmas garantias dos índices do Mongo: versão única por
 * usuário, no máximo um treino aberto por sessão da rotina e atualização condicional pela revisão.
 * Devolve cópias, como o driver, e conta as gravações.
 */
final class ArmazemMemoria implements RotinaArmazem {

  private final List<Document> rotinas = new ArrayList<>();
  private final List<Document> treinos = new ArrayList<>();
  private final Map<ObjectId, Document> execucoes = new LinkedHashMap<>();
  private final Map<ObjectId, ObjectId> sequenciaAberta = new LinkedHashMap<>();
  final AtomicInteger escritas = new AtomicInteger();
  final AtomicInteger duplicatasRecusadas = new AtomicInteger();
  volatile long atrasoLeituraMs = 0;

  static Object copiar(Object valor) {
    if (valor instanceof Map) {
      Document copia = new Document();
      for (Map.Entry<?, ?> campo : ((Map<?, ?>) valor).entrySet()) {
        copia.put(String.valueOf(campo.getKey()), copiar(campo.getValue()));
      }
      return copia;
    }
    if (valor instanceof List) {
      List<Object> copia = new ArrayList<>();
      for (Object item : (List<?>) valor) {
        copia.add(copiar(item));
      }
      return copia;
    }
    if (valor instanceof Date) {
      return new Date(((Date) valor).getTime());
    }
    return valor;
  }

  private static Document copia(Document documento) {
    return documento == null ? null : (Document) copiar(documento);
  }

  private void pausar() {
    if (atrasoLeituraMs > 0) {
      try {
        Thread.sleep(atrasoLeituraMs);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
      }
    }
  }

  private static boolean aberta(Document treino) {
    return treino.containsKey("rotinaId") && Boolean.FALSE.equals(treino.get("realizado"));
  }

  @Override
  public Document ativa(ObjectId usuario) {
    Document resultado;
    synchronized (this) {
      Document maior = null;
      for (Document rotina : rotinas) {
        if (usuario.equals(rotina.get("user"))
            && (maior == null || rotina.getInteger("versao") > maior.getInteger("versao"))) {
          maior = rotina;
        }
      }
      resultado = copia(maior);
    }
    pausar();
    return resultado;
  }

  @Override
  public synchronized Document rotina(ObjectId usuario, ObjectId id) {
    for (Document rotina : rotinas) {
      if (id.equals(rotina.get("_id")) && usuario.equals(rotina.get("user"))) {
        return copia(rotina);
      }
    }
    return null;
  }

  @Override
  public synchronized boolean inserirRotina(Document rotina) {
    escritas.incrementAndGet();
    for (Document existente : rotinas) {
      if (existente.get("user").equals(rotina.get("user"))
          && existente.get("versao").equals(rotina.get("versao"))) {
        duplicatasRecusadas.incrementAndGet();
        return false;
      }
    }
    rotinas.add(copia(rotina));
    return true;
  }

  @Override
  public synchronized void substituirAnteriores(ObjectId usuario, int versaoAtual, Date quando) {
    escritas.incrementAndGet();
    for (Document rotina : rotinas) {
      if (usuario.equals(rotina.get("user"))
          && rotina.getInteger("versao") < versaoAtual
          && "ativa".equals(rotina.get("status"))) {
        rotina.put("status", "substituida");
        rotina.put("substituidaEm", quando);
        rotina.put("updatedAt", quando);
      }
    }
  }

  @Override
  public synchronized boolean atualizarRotina(
      ObjectId usuario, ObjectId id, int revisaoEsperada, Document campos) {
    escritas.incrementAndGet();
    for (Document rotina : rotinas) {
      if (id.equals(rotina.get("_id"))
          && usuario.equals(rotina.get("user"))
          && Objects.equals(rotina.get("revisao"), revisaoEsperada)) {
        for (Map.Entry<String, Object> campo : campos.entrySet()) {
          rotina.put(campo.getKey(), copiar(campo.getValue()));
        }
        rotina.put("revisao", revisaoEsperada + 1);
        return true;
      }
    }
    return false;
  }

  @Override
  public synchronized List<Document> instancias(ObjectId usuario, ObjectId rotinaId) {
    List<Document> lista = new ArrayList<>();
    for (Document treino : treinos) {
      if (usuario.equals(treino.get("user")) && rotinaId.equals(treino.get("rotinaId"))) {
        lista.add(copia(treino));
      }
    }
    return lista;
  }

  @Override
  public synchronized List<Document> doPrograma(ObjectId usuario, String chave) {
    List<Document> lista = new ArrayList<>();
    for (Document treino : treinos) {
      if (usuario.equals(treino.get("user")) && chave.equals(treino.get("programaChave"))) {
        lista.add(copia(treino));
      }
    }
    lista.sort(
        (a, b) -> {
          int ordem = Integer.compare(ordemDe(a), ordemDe(b));
          if (ordem != 0) {
            return ordem;
          }
          Date criadaA = a.get("createdAt") instanceof Date ? (Date) a.get("createdAt") : new Date(0);
          Date criadaB = b.get("createdAt") instanceof Date ? (Date) b.get("createdAt") : new Date(0);
          return criadaA.compareTo(criadaB);
        });
    return lista;
  }

  private static int ordemDe(Document treino) {
    Object ordem = treino.get("programaOrdem");
    return ordem instanceof Number ? ((Number) ordem).intValue() : Integer.MAX_VALUE;
  }

  @Override
  public Document instanciaAberta(ObjectId usuario, ObjectId rotinaId, String codigo) {
    Document resultado = null;
    synchronized (this) {
      for (Document treino : treinos) {
        if (usuario.equals(treino.get("user"))
            && rotinaId.equals(treino.get("rotinaId"))
            && codigo.equals(treino.get("rotinaCodigo"))
            && aberta(treino)) {
          resultado = copia(treino);
        }
      }
    }
    pausar();
    return resultado;
  }

  @Override
  public synchronized boolean inserirInstancia(Document treino) {
    escritas.incrementAndGet();
    if (aberta(treino)) {
      for (Document existente : treinos) {
        if (aberta(existente)
            && existente.get("user").equals(treino.get("user"))
            && existente.get("rotinaId").equals(treino.get("rotinaId"))
            && existente.get("rotinaCodigo").equals(treino.get("rotinaCodigo"))) {
          duplicatasRecusadas.incrementAndGet();
          return false;
        }
      }
    }
    treinos.add(copia(treino));
    return true;
  }

  @Override
  public synchronized boolean reivindicarExecucao(ObjectId usuario, ObjectId treinoId) {
    ObjectId atual = sequenciaAberta.get(usuario);
    if (atual != null && !atual.equals(treinoId)) {
      if (!concluido(atual)) {
        return false;
      }
      sequenciaAberta.remove(usuario);
    }
    sequenciaAberta.put(usuario, treinoId);
    return true;
  }

  @Override
  public synchronized void liberarExecucao(ObjectId usuario, ObjectId treinoId) {
    if (treinoId.equals(sequenciaAberta.get(usuario))) {
      sequenciaAberta.remove(usuario);
    }
  }

  @Override
  public synchronized ObjectId execucaoReservada(ObjectId usuario) {
    ObjectId atual = sequenciaAberta.get(usuario);
    if (atual == null || concluido(atual)) {
      return null;
    }
    return atual;
  }

  @Override
  public synchronized List<Document> sequenciaisAbertas(ObjectId usuario) {
    List<Document> lista = new ArrayList<>();
    for (Document treino : treinos) {
      if (usuario.equals(treino.get("user")) && !Boolean.TRUE.equals(treino.get("realizado")) && sequencial(treino)) {
        lista.add(copia(treino));
      }
    }
    return lista;
  }

  private boolean concluido(ObjectId treinoId) {
    for (Document treino : treinos) {
      if (treinoId.equals(treino.get("_id"))) {
        return Boolean.TRUE.equals(treino.get("realizado"));
      }
    }
    return false;
  }

  private static boolean sequencial(Document treino) {
    return (treino.get("rotinaId") instanceof ObjectId && treino.get("rotinaCodigo") instanceof String)
        || (treino.get("programaChave") instanceof String
            && treino.get("programaCodigo") instanceof String
            && treino.get("programaOrdem") instanceof Number);
  }

  @Override
  public synchronized Map<ObjectId, Document> execucoes(
      ObjectId usuario, Collection<ObjectId> treinosIds) {
    Map<ObjectId, Document> mapa = new LinkedHashMap<>();
    for (ObjectId id : treinosIds) {
      Document execucao = execucoes.get(id);
      if (execucao != null && usuario.equals(execucao.get("user"))) {
        mapa.put(id, copia(execucao));
      }
    }
    return mapa;
  }

  @Override
  public synchronized long concluidosDesde(ObjectId usuario, Date desde) {
    long total = 0;
    for (Document treino : treinos) {
      Object data = treino.get("dataRealizacao");
      if (usuario.equals(treino.get("user"))
          && Boolean.TRUE.equals(treino.get("realizado"))
          && data instanceof Date
          && !((Date) data).before(desde)) {
        total++;
      }
    }
    return total;
  }

  @Override
  public synchronized long concluidosVerificados(ObjectId usuario, Date desde) {
    long total = 0;
    for (Document treino : treinos) {
      Object data = treino.get("dataRealizacao");
      if (usuario.equals(treino.get("user"))
          && Boolean.TRUE.equals(treino.get("realizado"))
          && data instanceof Date
          && !((Date) data).before(desde)
          && temSerieConcluida(execucoes.get(treino.get("_id")))) {
        total++;
      }
    }
    return total;
  }

  private static boolean temSerieConcluida(Document execucao) {
    if (execucao == null) {
      return false;
    }
    Object exercicios = execucao.get("exercicios");
    if (!(exercicios instanceof List)) {
      return false;
    }
    for (Object exercicio : (List<?>) exercicios) {
      if (!(exercicio instanceof Map)) {
        continue;
      }
      Object series = ((Map<?, ?>) exercicio).get("series");
      if (!(series instanceof List)) {
        continue;
      }
      for (Object serie : (List<?>) series) {
        if (serie instanceof Map && Boolean.TRUE.equals(((Map<?, ?>) serie).get("concluida"))) {
          return true;
        }
      }
    }
    return false;
  }

  // ------------------------------------------------ auxiliares de teste (fora da interface)

  /** Mesmo efeito do endpoint de conclusão: marca como realizado, sem apagar nada. */
  synchronized void concluir(ObjectId treinoId, Date quando) {
    for (Document treino : treinos) {
      if (treinoId.equals(treino.get("_id"))) {
        treino.put("realizado", true);
        treino.put("dataRealizacao", quando);
        treino.put("updatedAt", quando);
      }
    }
  }

  synchronized void registrarExecucao(ObjectId usuario, ObjectId treinoId, Document execucao) {
    execucoes.put(treinoId, copia(execucao.append("user", usuario).append("workout", treinoId)));
  }

  /** Treino avulso antigo (sem rotina), como os criados pelo fluxo anterior. */
  synchronized Document inserirTreinoAvulso(ObjectId usuario, boolean realizado, Date data) {
    Document treino =
        new Document("_id", new ObjectId())
            .append("user", usuario)
            .append("realizado", realizado)
            .append("dataRealizacao", realizado ? data : null)
            .append("createdAt", data);
    treinos.add(treino);
    return treino;
  }

  synchronized List<Document> rotinasDe(ObjectId usuario) {
    List<Document> lista = new ArrayList<>();
    for (Document rotina : rotinas) {
      if (usuario.equals(rotina.get("user"))) {
        lista.add(copia(rotina));
      }
    }
    return lista;
  }

  synchronized void guardar(Document treino) {
    treinos.add(copia(treino));
  }

  synchronized List<Document> treinosDe(ObjectId usuario) {
    List<Document> lista = new ArrayList<>();
    for (Document treino : treinos) {
      if (usuario.equals(treino.get("user"))) {
        lista.add(copia(treino));
      }
    }
    return lista;
  }
}
