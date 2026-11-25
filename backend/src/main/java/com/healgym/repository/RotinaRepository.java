package com.healgym.repository;

import com.healgym.service.rotina.RotinaArmazem;
import com.mongodb.ErrorCategory;
import com.mongodb.MongoWriteException;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import com.mongodb.client.model.Sorts;
import com.mongodb.client.model.Updates;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class RotinaRepository implements RotinaArmazem {

  private final MongoCollection<Document> rotinas;
  private final MongoCollection<Document> treinos;
  private final MongoCollection<Document> execucoes;

  @Autowired
  public RotinaRepository(Db db) {
    this(db.rotinas(), db.workouts(), db.executions());
  }

  public RotinaRepository(
      MongoCollection<Document> rotinas,
      MongoCollection<Document> treinos,
      MongoCollection<Document> execucoes) {
    this.rotinas = rotinas;
    this.treinos = treinos;
    this.execucoes = execucoes;
  }

  /**
   * Índices que garantem uma versão por número e no máximo um treino aberto por sessão da rotina.
   * O índice dos treinos é parcial: treinos antigos (sem {@code rotinaId}) e concluídos ficam fora.
   */
  public void ensureIndexes() {
    rotinas.createIndex(
        Indexes.compoundIndex(Indexes.ascending("user"), Indexes.descending("versao")),
        new IndexOptions().unique(true));
    treinos.createIndex(
        Indexes.compoundIndex(
            Indexes.ascending("user"), Indexes.ascending("rotinaId"), Indexes.ascending("rotinaCodigo")),
        new IndexOptions()
            .unique(true)
            .name("rotina_sessao_aberta")
            .partialFilterExpression(
                Filters.and(Filters.exists("rotinaId", true), Filters.eq("realizado", false))));
    treinos.createIndex(
        Indexes.compoundIndex(Indexes.ascending("user"), Indexes.ascending("rotinaId")));
    treinos.createIndex(
        Indexes.ascending("sequenciaAberta"),
        new IndexOptions()
            .unique(true)
            .name("uma_execucao_sequencial_por_usuario")
            .partialFilterExpression(Filters.exists("sequenciaAberta", true)));
    treinos.createIndex(
        Indexes.compoundIndex(Indexes.ascending("user"), Indexes.ascending("chaveIdempotencia")),
        new IndexOptions()
            .unique(true)
            .name("treino_avulso_idempotente")
            .partialFilterExpression(Filters.exists("chaveIdempotencia", true)));
  }

  private static boolean duplicado(MongoWriteException e) {
    return e.getError().getCategory() == ErrorCategory.DUPLICATE_KEY;
  }

  private static Bson dono(ObjectId usuario, ObjectId rotina) {
    return Filters.and(Filters.eq("user", usuario), Filters.eq("rotinaId", rotina));
  }

  @Override
  public Document ativa(ObjectId usuario) {
    return rotinas.find(Filters.eq("user", usuario)).sort(Sorts.descending("versao")).first();
  }

  @Override
  public Document rotina(ObjectId usuario, ObjectId id) {
    return rotinas.find(Filters.and(Filters.eq("_id", id), Filters.eq("user", usuario))).first();
  }

  @Override
  public boolean inserirRotina(Document rotina) {
    try {
      rotinas.insertOne(rotina);
      return true;
    } catch (MongoWriteException e) {
      if (duplicado(e)) {
        return false;
      }
      throw e;
    }
  }

  @Override
  public void substituirAnteriores(ObjectId usuario, int versaoAtual, Date quando) {
    rotinas.updateMany(
        Filters.and(
            Filters.eq("user", usuario),
            Filters.lt("versao", versaoAtual),
            Filters.eq("status", "ativa")),
        Updates.combine(
            Updates.set("status", "substituida"),
            Updates.set("substituidaEm", quando),
            Updates.set("updatedAt", quando)));
  }

  @Override
  public boolean atualizarRotina(
      ObjectId usuario, ObjectId id, int revisaoEsperada, Document campos) {
    List<Bson> alteracoes = new ArrayList<>();
    for (Map.Entry<String, Object> campo : campos.entrySet()) {
      alteracoes.add(Updates.set(campo.getKey(), campo.getValue()));
    }
    alteracoes.add(Updates.inc("revisao", 1));
    return rotinas
            .updateOne(
                Filters.and(
                    Filters.eq("_id", id),
                    Filters.eq("user", usuario),
                    Filters.eq("revisao", revisaoEsperada)),
                Updates.combine(alteracoes))
            .getMatchedCount()
        == 1;
  }

  @Override
  public List<Document> instancias(ObjectId usuario, ObjectId rotinaId) {
    List<Document> lista = new ArrayList<>();
    for (Document treino : treinos.find(dono(usuario, rotinaId)).sort(Sorts.ascending("createdAt"))) {
      lista.add(treino);
    }
    return lista;
  }

  @Override
  public List<Document> doPrograma(ObjectId usuario, String chave) {
    List<Document> lista = new ArrayList<>();
    for (Document treino :
        treinos
            .find(Filters.and(Filters.eq("user", usuario), Filters.eq("programaChave", chave)))
            .sort(Sorts.ascending("programaOrdem", "createdAt"))) {
      lista.add(treino);
    }
    return lista;
  }

  @Override
  public Document instanciaAberta(ObjectId usuario, ObjectId rotinaId, String codigo) {
    return treinos
        .find(
            Filters.and(
                dono(usuario, rotinaId),
                Filters.eq("rotinaCodigo", codigo),
                Filters.eq("realizado", false)))
        .first();
  }

  @Override
  public boolean inserirInstancia(Document treino) {
    try {
      treinos.insertOne(treino);
      return true;
    } catch (MongoWriteException e) {
      if (duplicado(e)) {
        return false;
      }
      throw e;
    }
  }

  @Override
  public boolean reivindicarExecucao(ObjectId usuario, ObjectId treinoId) {
    Document ocupante = treinos.find(Filters.eq("sequenciaAberta", usuario)).first();
    if (ocupante != null) {
      if (treinoId.equals(ocupante.getObjectId("_id"))) {
        return true;
      }
      if (!Boolean.TRUE.equals(ocupante.get("realizado"))) {
        return false;
      }
      treinos.updateOne(Filters.eq("_id", ocupante.getObjectId("_id")), Updates.unset("sequenciaAberta"));
    }
    try {
      treinos.updateOne(
          Filters.and(
              Filters.eq("_id", treinoId),
              Filters.eq("user", usuario),
              Filters.exists("sequenciaAberta", false)),
          Updates.set("sequenciaAberta", usuario));
    } catch (MongoWriteException e) {
      if (duplicado(e)) {
        return false;
      }
      throw e;
    }
    Document atual =
        treinos.find(Filters.and(Filters.eq("_id", treinoId), Filters.eq("user", usuario))).first();
    return atual != null && usuario.equals(atual.get("sequenciaAberta"));
  }

  @Override
  public void liberarExecucao(ObjectId usuario, ObjectId treinoId) {
    treinos.updateOne(
        Filters.and(
            Filters.eq("_id", treinoId),
            Filters.eq("user", usuario),
            Filters.eq("sequenciaAberta", usuario)),
        Updates.unset("sequenciaAberta"));
  }

  @Override
  public ObjectId execucaoReservada(ObjectId usuario) {
    Document ocupante = treinos.find(Filters.eq("sequenciaAberta", usuario)).first();
    if (ocupante == null || Boolean.TRUE.equals(ocupante.get("realizado"))) {
      return null;
    }
    return ocupante.getObjectId("_id");
  }

  @Override
  public List<Document> sequenciaisAbertas(ObjectId usuario) {
    List<Document> lista = new ArrayList<>();
    for (Document treino :
        treinos.find(
            Filters.and(
                Filters.eq("user", usuario),
                Filters.ne("realizado", true),
                Filters.or(Filters.exists("rotinaId", true), Filters.exists("programaChave", true))))) {
      if ((treino.get("rotinaId") instanceof ObjectId && treino.get("rotinaCodigo") instanceof String)
          || (treino.get("programaChave") instanceof String
              && treino.get("programaCodigo") instanceof String
              && treino.get("programaOrdem") instanceof Number)) {
        lista.add(treino);
      }
    }
    return lista;
  }

  @Override
  public Map<ObjectId, Document> execucoes(ObjectId usuario, Collection<ObjectId> treinosIds) {
    Map<ObjectId, Document> mapa = new LinkedHashMap<>();
    if (treinosIds == null || treinosIds.isEmpty()) {
      return mapa;
    }
    for (Document execucao :
        execucoes.find(Filters.and(Filters.eq("user", usuario), Filters.in("workout", treinosIds)))) {
      mapa.put(execucao.getObjectId("workout"), execucao);
    }
    return mapa;
  }

  @Override
  public long concluidosDesde(ObjectId usuario, Date desde) {
    return treinos.countDocuments(
        Filters.and(
            Filters.eq("user", usuario),
            Filters.eq("realizado", true),
            Filters.gte("dataRealizacao", desde)));
  }

  @Override
  public long concluidosVerificados(ObjectId usuario, Date desde) {
    List<ObjectId> ids = new ArrayList<>();
    for (Document treino :
        treinos.find(
            Filters.and(
                Filters.eq("user", usuario),
                Filters.eq("realizado", true),
                Filters.gte("dataRealizacao", desde)))) {
      if (treino.get("_id") instanceof ObjectId) {
        ids.add(treino.getObjectId("_id"));
      }
    }
    if (ids.isEmpty()) {
      return 0;
    }
    return execucoes
        .distinct(
            "workout",
            Filters.and(
                Filters.eq("user", usuario),
                Filters.in("workout", ids),
                Filters.eq("exercicios.series.concluida", true)),
            ObjectId.class)
        .into(new ArrayList<>())
        .size();
  }
}
