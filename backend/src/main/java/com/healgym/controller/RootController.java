package com.healgym.controller;

import com.healgym.repository.Db;
import com.healgym.util.Js;
import com.healgym.util.Json;
import java.util.Date;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RootController extends BaseController {

  private final Db db;

  public RootController(Db db) {
    this.db = db;
  }

  @GetMapping("/")
  public ResponseEntity<Object> root() {
    return ok(
        Json.obj(
            "message",
            "HealGym Backend is ALIVE!",
            "timestamp",
            Js.iso(new Date()),
            "status",
            "working"));
  }

  @GetMapping("/api/health")
  public ResponseEntity<Object> health() {
    boolean mongoOk = mongoDisponivel();
    return json(
        mongoOk ? 200 : 503,
        Json.obj(
            "message", mongoOk ? "API Health OK" : "API Health DEGRADED",
            "database", mongoOk ? "up" : "down",
            "timestamp", Js.iso(new Date())));
    //return ok(Json.obj("message", "API Health OK", "timestamp", Js.iso(new Date())));
  }

  private boolean mongoDisponivel() {
    try {
      CompletableFuture.runAsync(db::ping).get(3, TimeUnit.SECONDS);
      return true;
    } catch (Exception e) {
      return false;
    }
  }
}
