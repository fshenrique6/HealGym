package com.healgym.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.healgym.model.User;
import com.healgym.repository.DietRepository;
import com.healgym.security.AuthService;
import com.healgym.service.MealPlanGenerator;
import com.healgym.service.UsdaClient;
import com.healgym.util.Js;
import com.healgym.util.Json;
import com.healgym.web.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/nutrition")
public class NutritionController extends BaseController {

  private static final List<String> OBJETIVOS =
      Arrays.asList("emagrecimento", "ganho_peso", "manutencao");

  private static final List<String> NUTRITION_FIELDS =
      Arrays.asList(
          "fdcId", "nome", "calorias", "proteinas", "carboidratos", "gorduras", "fibras", "calcio",
          "ferro", "magnesio", "fosforo", "potassio", "sodio", "zinco", "vitaminaA", "vitaminaC",
          "vitaminaD", "vitaminaE", "vitaminaB12", "folato", "gorduraSaturada",
          "gorduraMonoinsaturada", "gorduraPoliinsaturada", "colesterol");

  private final AuthService auth;
  private final DietRepository diets;
  private final UsdaClient usda;

  public NutritionController(AuthService auth, DietRepository diets, UsdaClient usda) {
    this.auth = auth;
    this.diets = diets;
    this.usda = usda;
  }

  private ApiException failure(int status, String message) {
    return new ApiException(status, Json.obj("success", false, "message", message));
  }

  @GetMapping("/foods")
  public ResponseEntity<Object> foods(HttpServletRequest request) {
    auth.authenticate(request);

    try {
      List<Object> foodList = new ArrayList<>();
      for (Map.Entry<String, Map<String, Object>> entry :
          MealPlanGenerator.FOOD_DATABASE.entrySet()) {
        Map<String, Object> value = entry.getValue();
        foodList.add(
            Json.obj(
                "id",
                entry.getKey(),
                "nome",
                value.get("nome"),
                "categoria",
                value.get("categoria"),
                "unidade",
                value.get("unidade")));
      }

      return ok(Json.obj("success", true, "foods", foodList));
    } catch (Exception e) {
      System.err.println("Erro ao listar alimentos: " + e);
      throw failure(500, "Erro ao listar alimentos");
    }
  }

  @GetMapping("/food/{foodId}")
  public ResponseEntity<Object> food(@PathVariable("foodId") String foodId, HttpServletRequest request) {
    auth.authenticate(request);

    try {
      Map<String, Object> food = MealPlanGenerator.FOOD_DATABASE.get(foodId);

      if (food == null) {
        throw failure(404, "Alimento não encontrado");
      }

      Map<String, Object> nutritionData = usda.fetchNutritionData((Integer) food.get("fdcId"));

      Map<String, Object> result = new LinkedHashMap<>();
      result.put("id", foodId);
      result.putAll(food);
      result.put("nutrition", nutritionData);

      return ok(Json.obj("success", true, "food", result));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao buscar alimento: " + e);
      String message =
          e.getMessage() == null || e.getMessage().isEmpty()
              ? "Erro ao buscar informações nutricionais"
              : e.getMessage();
      throw failure(500, message);
    }
  }

  @PostMapping("/search")
  public ResponseEntity<Object> search(HttpServletRequest request) {
    auth.authenticate(request);

    try {
      Map<String, Object> body = body(request);
      Object query = body.get("query");
      Object pageSize = body.containsKey("pageSize") ? body.get("pageSize") : Integer.valueOf(10);

      if (!Js.truthy(query)) {
        throw failure(400, "Termo de busca é obrigatório");
      }

      JsonNode data = usda.search(Js.toStr(query), pageSize);

      List<Object> foods = new ArrayList<>();
      for (JsonNode item : data.get("foods")) {
        Map<String, Object> mapped = new LinkedHashMap<>();
        mapped.put("fdcId", item.hasNonNull("fdcId") ? item.get("fdcId").numberValue() : null);
        mapped.put("nome", item.hasNonNull("description") ? item.get("description").asText() : null);
        mapped.put("brandOwner", item.hasNonNull("brandOwner") ? item.get("brandOwner").asText() : null);
        mapped.put("dataType", item.hasNonNull("dataType") ? item.get("dataType").asText() : null);
        foods.add(mapped);
      }

      return ok(
          Json.obj(
              "success",
              true,
              "foods",
              foods,
              "totalResults",
              data.hasNonNull("totalHits") ? data.get("totalHits").numberValue() : null));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao buscar alimentos: " + e);
      throw failure(500, "Erro ao buscar alimentos");
    }
  }

  @PostMapping("/generate-diet")
  public ResponseEntity<Object> generateDiet(HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      Map<String, Object> body = body(request);
      Object targetCalories = body.get("targetCalories");
      Object objetivo = body.get("objetivo");
      Object weight = body.get("weight");
      Object refeicoesPorDia = body.containsKey("refeicoesPorDia") ? body.get("refeicoesPorDia") : Integer.valueOf(4);
      Object preferencias = body.containsKey("preferencias") ? body.get("preferencias") : new ArrayList<>();
      Object horarios = body.get("horarios");

      if (!Js.truthy(targetCalories) || !Js.truthy(objetivo) || !Js.truthy(weight)) {
        throw failure(400, "Calorias alvo, objetivo e peso são obrigatórios");
      }

      double calories = Js.toNumber(targetCalories);
      double weightValue = Js.toNumber(weight);

      double targetProtein = weightValue * 2;
      double targetFat = weightValue * 1;

      double caloriasProteina = targetProtein * 4;
      double caloriasGordura = targetFat * 9;
      double caloriasRestantes = calories - caloriasProteina - caloriasGordura;
      double targetCarbs = Math.max(0, caloriasRestantes / 4);

      double meals = Js.toNumber(refeicoesPorDia);
      List<String> horariosResolvidos = MealPlanGenerator.resolveHorarios(meals, horarios);

      List<Map<String, Object>> mealPlan =
          MealPlanGenerator.generate(
              targetProtein, targetCarbs, targetFat, meals, horariosResolvidos);

      if (!(objetivo instanceof String) || !OBJETIVOS.contains(objetivo)) {
        throw new IllegalArgumentException("Diet validation failed: objetivo");
      }
      for (double value : new double[] {calories, targetProtein, targetCarbs, targetFat}) {
        if (Double.isNaN(value)) {
          throw new IllegalArgumentException("Cast to Number failed");
        }
      }

      ObjectId dietId = new ObjectId();
      Document diet =
          new Document("_id", dietId)
              .append("user", user.getId())
              .append("objetivo", objetivo)
              .append("targetCalories", calories)
              .append("targetProtein", targetProtein)
              .append("targetCarbs", targetCarbs)
              .append("targetFat", targetFat)
              .append("mealPlan", toStoredMealPlan(mealPlan))
              .append("preferencias", castPreferencias(preferencias))
              .append("createdAt", new Date())
              .append("__v", 0);

      diets.insert(diet);

      return ok(
          Json.obj(
              "success",
              true,
              "diet",
              Json.obj(
                  "id",
                  dietId,
                  "objetivo",
                  objetivo,
                  "targets",
                  Json.obj(
                      "calorias", Js.round(calories),
                      "proteinas", Js.round(targetProtein),
                      "carboidratos", Js.round(targetCarbs),
                      "gorduras", Js.round(targetFat)),
                  "mealPlan",
                  mealPlan)));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao gerar dieta: " + e);
      throw failure(500, "Erro ao gerar dieta personalizada");
    }
  }

  @GetMapping("/my-diets")
  public ResponseEntity<Object> myDiets(HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      List<Document> found = diets.findByUser(user.getId(), 10);

      return ok(Json.obj("success", true, "diets", new ArrayList<Object>(found)));
    } catch (Exception e) {
      System.err.println("Erro ao buscar dietas: " + e);
      throw failure(500, "Erro ao buscar histórico de dietas");
    }
  }

  @GetMapping("/diet/{dietId}")
  public ResponseEntity<Object> diet(@PathVariable("dietId") String dietId, HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      Document diet = diets.findOwned(dietId, user.getId());

      if (diet == null) {
        throw failure(404, "Dieta não encontrada");
      }

      return ok(Json.obj("success", true, "diet", diet));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao buscar dieta: " + e);
      throw failure(500, "Erro ao buscar dieta");
    }
  }

  @DeleteMapping("/diet/{dietId}")
  public ResponseEntity<Object> deleteDiet(
      @PathVariable("dietId") String dietId, HttpServletRequest request) {
    User user = auth.authenticate(request);

    try {
      Document diet = diets.deleteOwned(dietId, user.getId());

      if (diet == null) {
        throw failure(404, "Dieta não encontrada");
      }

      return ok(Json.obj("success", true, "message", "Dieta excluída com sucesso"));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao excluir dieta: " + e);
      throw failure(500, "Erro ao excluir dieta");
    }
  }

  @SuppressWarnings("unchecked")
  private List<Document> toStoredMealPlan(List<Map<String, Object>> mealPlan) {
    List<Document> stored = new ArrayList<>();
    for (Map<String, Object> meal : mealPlan) {
      List<Document> alimentos = new ArrayList<>();
      for (Map<String, Object> aliment : (List<Map<String, Object>>) meal.get("alimentos")) {
        Document nutrition = new Document();
        Map<String, Object> source = (Map<String, Object>) aliment.get("nutrition");
        for (String field : NUTRITION_FIELDS) {
          if (source.containsKey(field)) {
            nutrition.put(field, source.get(field));
          }
        }

        alimentos.add(
            new Document("_id", new ObjectId())
                .append("id", aliment.get("id"))
                .append("nome", aliment.get("nome"))
                .append("porcao", aliment.get("porcao"))
                .append("unidade", aliment.get("unidade"))
                .append("nutrition", nutrition));
      }

      stored.add(
          new Document("_id", new ObjectId())
              .append("nome", meal.get("nome"))
              .append("horario", meal.get("horario"))
              .append("alimentos", alimentos));
    }
    return stored;
  }

  private List<String> castPreferencias(Object value) {
    List<String> result = new ArrayList<>();
    if (value instanceof List) {
      for (Object item : (List<?>) value) {
        if (item instanceof Map || item instanceof List) {
          throw new IllegalArgumentException("Cast to string failed");
        }
        result.add(Js.toStr(item));
      }
    } else if (value != null) {
      if (value instanceof Map) {
        throw new IllegalArgumentException("Cast to string failed");
      }
      result.add(Js.toStr(value));
    }
    return result;
  }
}
