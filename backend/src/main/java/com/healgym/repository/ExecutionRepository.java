package com.healgym.repository;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import com.mongodb.client.model.ReplaceOptions;
import com.mongodb.client.model.Sorts;
import java.util.ArrayList;
import java.util.List;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ExecutionRepository {

  private final MongoCollection<Document> collection;

  @Autowired
  public ExecutionRepository(Db db) {
    this(db.executions());
  }

  public ExecutionRepository(MongoCollection<Document> collection) {
    this.collection = collection;
  }

  public void ensureIndexes() {
    collection.createIndex(
        Indexes.compoundIndex(Indexes.ascending("user"), Indexes.ascending("workout")),
        new IndexOptions().unique(true));
    collection.createIndex(
        Indexes.compoundIndex(Indexes.ascending("user"), Indexes.descending("updatedAt")));
  }

  private static Bson dono(ObjectId user, ObjectId workout) {
    return Filters.and(Filters.eq("user", user), Filters.eq("workout", workout));
  }

  public Document find(ObjectId user, ObjectId workout) {
    return collection.find(dono(user, workout)).first();
  }

  public Document save(Document execucao) {
    ObjectId user = execucao.getObjectId("user");
    ObjectId workout = execucao.getObjectId("workout");
    if (user == null || workout == null) {
      throw new IllegalArgumentException("Execução sem usuário ou treino");
    }
    if (execucao.get("_id") == null) {
      Document existente = find(user, workout);
      execucao.put("_id", existente == null ? new ObjectId() : existente.getObjectId("_id"));
    }
    collection.replaceOne(dono(user, workout), execucao, new ReplaceOptions().upsert(true));
    return execucao;
  }

  public List<Document> recentes(ObjectId user, ObjectId excluir, int limite) {
    Bson filtro =
        excluir == null
            ? Filters.eq("user", user)
            : Filters.and(Filters.eq("user", user), Filters.ne("workout", excluir));
    List<Document> resultado = new ArrayList<>();
    for (Document documento :
        collection.find(filtro).sort(Sorts.descending("updatedAt")).limit(limite)) {
      resultado.add(documento);
    }
    return resultado;
  }

  public long count(ObjectId user, ObjectId workout) {
    return collection.countDocuments(dono(user, workout));
  }

  public void deleteByWorkout(ObjectId user, ObjectId workout) {
    collection.deleteMany(dono(user, workout));
  }

  public void deleteAllByUser(ObjectId user) {
    collection.deleteMany(Filters.eq("user", user));
  }
}
