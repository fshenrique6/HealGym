package com.healgym.repository;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer implements ApplicationRunner {

  private final Db db;
  private final Environment environment;

  public DatabaseInitializer(Db db, Environment environment) {
    this.db = db;
    this.environment = environment;
  }

  @Override
  public void run(ApplicationArguments args) {
    System.out.println("🚀 Server running on port " + environment.getProperty("server.port"));

    Thread thread =
        new Thread(
            () -> {
              try {
                db.ping();
                db.ensureIndexes();
                System.out.println("✅ MongoDB conectado com sucesso");
              } catch (Exception e) {
                System.err.println("❌ Erro ao conectar ao MongoDB: " + e.getMessage());
                System.exit(1);
              }
            },
            "mongo-connect");
    thread.setDaemon(true);
    thread.start();
  }
}
