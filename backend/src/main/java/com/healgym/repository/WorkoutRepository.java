package com.healgym.repository;

import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Sorts;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Component;

@Component
public class WorkoutRepository extends OwnedRepository {

  public WorkoutRepository(Db db) {
    super(db.workouts(), "Workout");
  }

  public List<Document> findRealizadosEntre(ObjectId userId, Date inicio, Date fim, int limite) {
    Bson semDataRealizacao =
        Filters.or(Filters.exists("dataRealizacao", false), Filters.eq("dataRealizacao", null));
    Bson periodo =
        Filters.or(
            Filters.and(Filters.gte("dataRealizacao", inicio), Filters.lt("dataRealizacao", fim)),
            Filters.and(semDataRealizacao, Filters.gte("createdAt", inicio), Filters.lt("createdAt", fim)));
    Bson filtro = Filters.and(Filters.eq("user", userId), Filters.eq("realizado", true), periodo);
    List<Document> encontrados = new ArrayList<>();
    for (Document document :
        documents().find(filtro).sort(Sorts.ascending("dataRealizacao", "createdAt")).limit(limite)) {
      encontrados.add(document);
    }
    return encontrados;
  }
}
