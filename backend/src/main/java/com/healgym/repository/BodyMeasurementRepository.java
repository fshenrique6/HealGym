package com.healgym.repository;

import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Sorts;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Component;

@Component
public class BodyMeasurementRepository extends OwnedRepository {

  public BodyMeasurementRepository(Db db) {
    super(db.bodyMeasurements(), "BodyMeasurement");
  }

  public List<Document> listarRecentes(ObjectId userId, int limite) {
    List<Document> documents = new ArrayList<>();
    for (Document document :
        documents()
            .find(Filters.eq("user", userId))
            .sort(
                Sorts.orderBy(
                    Sorts.descending("dataMedicao"),
                    Sorts.descending("createdAt"),
                    Sorts.descending("_id")))
            .limit(limite)) {
      documents.add(document);
    }
    Collections.reverse(documents);
    return documents;
  }

  public long contar(ObjectId userId) {
    return documents().countDocuments(Filters.eq("user", userId));
  }
}
