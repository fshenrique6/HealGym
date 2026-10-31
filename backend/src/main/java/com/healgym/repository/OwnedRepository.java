package com.healgym.repository;

import com.healgym.web.CastException;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.ReplaceOptions;
import com.mongodb.client.model.Sorts;
import java.util.ArrayList;
import java.util.List;
import org.bson.Document;
import org.bson.types.ObjectId;

public class OwnedRepository {

  private final MongoCollection<Document> collection;
  private final String model;

  protected MongoCollection<Document> documents() {
    return collection;
  }

  public OwnedRepository(MongoCollection<Document> collection, String model) {
    this.collection = collection;
    this.model = model;
  }

  public Document insert(Document document) {
    collection.insertOne(document);
    return document;
  }

  public Document replace(Document document) {
    collection.replaceOne(
        Filters.eq("_id", document.getObjectId("_id")), document, new ReplaceOptions().upsert(true));
    return document;
  }

  public List<Document> findByUser(ObjectId userId, int limit) {
    List<Document> documents = new ArrayList<>();
    for (Document document :
        collection.find(Filters.eq("user", userId)).sort(Sorts.descending("createdAt")).limit(limit)) {
      documents.add(document);
    }
    return documents;
  }

  public Document findOwned(String id, ObjectId userId) {
    ObjectId objectId = cast(id);
    return collection
        .find(Filters.and(Filters.eq("_id", objectId), Filters.eq("user", userId)))
        .first();
  }

  public Document deleteOwned(String id, ObjectId userId) {
    ObjectId objectId = cast(id);
    return collection.findOneAndDelete(
        Filters.and(Filters.eq("_id", objectId), Filters.eq("user", userId)));
  }

  public void deleteDocument(ObjectId id) {
    collection.deleteOne(Filters.eq("_id", id));
  }

  public void deleteAllByUser(ObjectId userId) {
    collection.deleteMany(Filters.eq("user", userId));
  }

  private ObjectId cast(String id) {
    if (id == null || !ObjectId.isValid(id)) {
      throw CastException.objectId(id, model);
    }
    return new ObjectId(id);
  }
}

