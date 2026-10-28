package com.healgym;

import com.healgym.config.Env;
import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class HealGymApplication {

  public static void main(String[] args) {
    Env.load();

    if (!Env.hasValue("JWT_SECRET")) {
      throw new IllegalStateException("JWT_SECRET deve ser configurado antes de iniciar o servidor.");
    }

    Map<String, Object> defaults = new HashMap<>();
    defaults.put("server.port", Env.orDefault("PORT", "5000"));
    defaults.put("server.address", "0.0.0.0");
    defaults.put("spring.main.banner-mode", "off");
    defaults.put("spring.mvc.throw-exception-if-no-handler-found", "true");
    defaults.put("spring.web.resources.add-mappings", "false");
    defaults.put("server.error.whitelabel.enabled", "false");
    defaults.put("server.tomcat.max-swallow-size", "-1");
    defaults.put(
        "spring.autoconfigure.exclude",
        "org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration");

    SpringApplication application = new SpringApplication(HealGymApplication.class);
    application.setDefaultProperties(defaults);
    application.run(args);
  }
}
