package com.healgym.controller;

import com.healgym.util.Js;
import com.healgym.util.Json;
import java.util.Date;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RootController extends BaseController {

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
    return ok(Json.obj("message", "API Health OK", "timestamp", Js.iso(new Date())));
  }
}
