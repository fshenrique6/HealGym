package com.healgym.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healgym.config.Env;
import com.healgym.util.Js;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class UsdaClient {

  private static final String BASE_URL = "https://api.nal.usda.gov/fdc/v1";
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private static final Map<Integer, String> NUTRIENT_MAP = new LinkedHashMap<>();

  static {
    NUTRIENT_MAP.put(1008, "calorias");
    NUTRIENT_MAP.put(1003, "proteinas");
    NUTRIENT_MAP.put(1005, "carboidratos");
    NUTRIENT_MAP.put(1004, "gorduras");
    NUTRIENT_MAP.put(1079, "fibras");
    NUTRIENT_MAP.put(1087, "calcio");
    NUTRIENT_MAP.put(1089, "ferro");
    NUTRIENT_MAP.put(1090, "magnesio");
    NUTRIENT_MAP.put(1091, "fosforo");
    NUTRIENT_MAP.put(1092, "potassio");
    NUTRIENT_MAP.put(1093, "sodio");
    NUTRIENT_MAP.put(1095, "zinco");
    NUTRIENT_MAP.put(1106, "vitaminaA");
    NUTRIENT_MAP.put(1162, "vitaminaC");
    NUTRIENT_MAP.put(1114, "vitaminaD");
    NUTRIENT_MAP.put(1109, "vitaminaE");
    NUTRIENT_MAP.put(1178, "vitaminaB12");
    NUTRIENT_MAP.put(1177, "folato");
    NUTRIENT_MAP.put(1258, "gorduraSaturada");
    NUTRIENT_MAP.put(1292, "gorduraMonoinsaturada");
    NUTRIENT_MAP.put(1293, "gorduraPoliinsaturada");
    NUTRIENT_MAP.put(1253, "colesterol");
  }

  private final HttpClient client = HttpClient.newHttpClient();
  private final Map<Integer, Map<String, Object>> cache = new ConcurrentHashMap<>();

  private static String apiKey() {
    return Env.orDefault("USDA_API_KEY", "DEMO_KEY");
  }

  public Map<String, Object> fetchNutritionData(int fdcId) {
    Map<String, Object> cached = cache.get(fdcId);
    if (cached != null) {
      return cached;
    }

    try {
      JsonNode foodData =
          get(BASE_URL + "/food/" + fdcId + "?api_key=" + encode(apiKey()));

      Map<String, Object> nutrients = new LinkedHashMap<>();

      JsonNode foodNutrients = foodData.get("foodNutrients");
      if (foodNutrients != null && foodNutrients.isArray()) {
        for (JsonNode nutrient : foodNutrients) {
          JsonNode nutrientInfo = nutrient.get("nutrient");
          JsonNode idNode = nutrientInfo == null ? null : nutrientInfo.get("id");
          if (idNode == null || !idNode.isNumber()) {
            continue;
          }
          String mappedName = NUTRIENT_MAP.get(idNode.asInt());
          if (mappedName != null) {
            JsonNode amount = nutrient.get("amount");
            double value = 0;
            if (amount != null && !amount.isNull()) {
              value =
                  amount.isNumber() ? amount.asDouble() : Js.parseFloat(amount.asText());
            }
            nutrients.put(mappedName, value);
          }
        }
      }

      Map<String, Object> nutritionData = new LinkedHashMap<>();
      if (foodData.hasNonNull("fdcId")) {
        nutritionData.put("fdcId", foodData.get("fdcId").numberValue());
      }
      if (foodData.hasNonNull("description")) {
        nutritionData.put("nome", foodData.get("description").asText());
      }
      nutritionData.putAll(nutrients);

      cache.put(fdcId, nutritionData);

      return nutritionData;
    } catch (Exception e) {
      System.err.println(
          "Erro ao buscar dados nutricionais do FDC ID " + fdcId + ": " + e.getMessage());
      throw new IllegalStateException("Não foi possível buscar informações nutricionais");
    }
  }

  public JsonNode search(String query, Object pageSize) throws Exception {
    return get(
        BASE_URL
            + "/foods/search?api_key="
            + encode(apiKey())
            + "&query="
            + encode(query)
            + "&pageSize="
            + encode(Js.toStr(pageSize)));
  }

  private JsonNode get(String url) throws Exception {
    HttpRequest request =
        HttpRequest.newBuilder(URI.create(url)).header("Accept", "application/json").GET().build();
    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
    if (response.statusCode() < 200 || response.statusCode() >= 300) {
      throw new IllegalStateException(
          "Request failed with status code " + response.statusCode());
    }
    return MAPPER.readTree(response.body());
  }

  private static String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8)
        .replace("%3A", ":")
        .replace("%24", "$")
        .replace("%2C", ",")
        .replace("%5B", "[")
        .replace("%5D", "]")
        .replace("%7E", "~")
        .replace("%21", "!")
        .replace("%27", "'")
        .replace("%28", "(")
        .replace("%29", ")");
  }
}
