package com.healgym.repository;

import com.healgym.config.Env;
import com.mongodb.ConnectionString;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import jakarta.annotation.PreDestroy;
import org.bson.Document;
import org.springframework.stereotype.Component;

@Component
public class Db {

  private final MongoClient client;
  private final MongoDatabase database;

  public Db() {
    String uri = Env.orDefault("MONGODB_URI", "mongodb://mongodb:27017/healgym");
    ConnectionString connectionString = new ConnectionString(uri);
    this.client = MongoClients.create(connectionString);
    String databaseName = connectionString.getDatabase();
    this.database = client.getDatabase(databaseName == null ? "test" : databaseName);
  }

  public MongoCollection<Document> users() {
    return database.getCollection("users");
  }

  public MongoCollection<Document> diets() {
    return database.getCollection("diets");
  }

  public MongoCollection<Document> workouts() {
    return database.getCollection("workouts");
  }

  public MongoCollection<Document> executions() {
    return database.getCollection("workout_executions");
  }

  public void ping() {
    database.runCommand(new Document("ping", 1));
  }

  public void ensureIndexes() {
    try {
      users().createIndex(Indexes.ascending("email"), new IndexOptions().unique(true));
      users().createIndex(Indexes.descending("createdAt"));
      diets().createIndex(Indexes.compoundIndex(Indexes.ascending("user"), Indexes.descending("createdAt")));
      workouts()
          .createIndex(
              Indexes.compoundIndex(Indexes.ascending("user"), Indexes.descending("createdAt")));
      new ExecutionRepository(executions()).ensureIndexes();
    } catch (RuntimeException e) {
      System.err.println("Erro ao criar índices: " + e.getMessage());
    }
  }

  @PreDestroy
  public void close() {
    client.close();
  }
}
