package com.healgym.service;

import com.healgym.util.Js;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class MealPlanGenerator {

  public static final Map<String, Map<String, Object>> FOOD_DATABASE = new LinkedHashMap<>();

  static {
    FOOD_DATABASE.put("arroz_branco", food(168878, "Arroz Branco Cozido", "carboidrato", "g"));
    FOOD_DATABASE.put("feijao", food(173735, "Feijão Cozido", "carboidrato", "g"));
    FOOD_DATABASE.put("frango_peito", food(171477, "Peito de Frango Grelhado", "proteina", "g"));
    FOOD_DATABASE.put("ovo", food(173424, "Ovo Cozido", "proteina", "unidade"));
    FOOD_DATABASE.put("azeite", food(171413, "Azeite de Oliva Extra Virgem", "gordura", "ml"));
  }

  private static final String[] NUTRIENT_KEYS = {
    "proteinas", "carboidratos", "gorduras", "fibras", "sodio", "acucares", "calcio", "ferro",
    "magnesio", "fosforo", "potassio", "zinco", "vitaminaA", "vitaminaC", "vitaminaD",
    "vitaminaE", "vitaminaB12", "folato", "gorduraSaturada", "colesterol"
  };

  private static final Map<String, Object> FRANGO =
      nutrition(31, 0, 3.6, 0, 74, 0, 15, 1.0, 29, 220, 256, 1.0, 9, 0, 0.1, 0.3, 0.3, 4, 1.0, 85);
  private static final Map<String, Object> ARROZ =
      nutrition(2.7, 28, 0.3, 0.4, 1, 0.1, 10, 0.2, 12, 43, 35, 0.5, 0, 0, 0, 0.1, 0, 3, 0.1, 0);
  private static final Map<String, Object> FEIJAO =
      nutrition(9, 23, 0.5, 9, 2, 0.3, 46, 2.1, 45, 140, 391, 1.0, 0, 1.2, 0, 0.2, 0, 90, 0.1, 0);
  private static final Map<String, Object> OVO =
      nutrition(6, 0.6, 5, 0, 71, 0.6, 28, 0.9, 6, 99, 69, 0.6, 80, 0, 1.1, 0.5, 0.6, 24, 1.6, 186);
  private static final Map<String, Object> AZEITE =
      nutrition(0, 0, 100, 0, 2, 0, 1, 0.4, 0, 0, 1, 0, 0, 0, 0, 14.4, 0, 0, 13.8, 0);

  private static final String[] MEAL_NAMES = {
    "Café da Manhã", "Almoço", "Lanche da Tarde", "Jantar"
  };

  private MealPlanGenerator() {}

  private static Map<String, Object> food(int fdcId, String nome, String categoria, String unidade) {
    Map<String, Object> map = new LinkedHashMap<>();
    map.put("fdcId", fdcId);
    map.put("nome", nome);
    map.put("categoria", categoria);
    map.put("unidade", unidade);
    return map;
  }

  private static Map<String, Object> nutrition(double... values) {
    Map<String, Object> map = new LinkedHashMap<>();
    for (int i = 0; i < NUTRIENT_KEYS.length; i++) {
      map.put(NUTRIENT_KEYS[i], values[i]);
    }
    return map;
  }

  private static Map<String, Object> zeroNutrition() {
    return nutrition(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }

  private static Map<String, Object> aliment(
      String id, String nome, double porcao, String unidade, Map<String, Object> nutrition) {
    Map<String, Object> map = new LinkedHashMap<>();
    map.put("id", id);
    map.put("nome", nome);
    map.put("porcao", porcao);
    map.put("unidade", unidade);
    map.put("nutrition", nutrition);
    return map;
  }

  private static Map<String, Object> supplement(
      String id, String nome, double porcao, String unidade, Map<String, Object> nutrition) {
    Map<String, Object> map = aliment(id, nome, porcao, unidade, nutrition);
    map.put("isSuplemento", true);
    return map;
  }

  private static String foodName(String key) {
    return (String) FOOD_DATABASE.get(key).get("nome");
  }

  private static final class Distribution {
    final double frango;
    final double arroz;
    final double feijao;
    final double ovo;
    final double azeite;

    Distribution(double frango, double arroz, double feijao, double ovo, double azeite) {
      this.frango = frango;
      this.arroz = arroz;
      this.feijao = feijao;
      this.ovo = ovo;
      this.azeite = azeite;
    }
  }

  public static String normalizeHorario(Object value) {
    if (value == null || (value instanceof String && ((String) value).isEmpty())) {
      return null;
    }
    String text = Js.trim(Js.toStr(value));
    java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("^(\\d{1,2}):(\\d{2})").matcher(text);
    if (!matcher.find()) {
      return null;
    }
    int hh = Integer.parseInt(matcher.group(1));
    int mm = Integer.parseInt(matcher.group(2));
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      return null;
    }
    return String.format("%02d:%02d", hh, mm);
  }

  public static List<String> resolveHorarios(double refeicoesPorDia, Object horariosBody) {
    List<String> result = new ArrayList<>();
    for (int i = 0; i < refeicoesPorDia; i++) {
      Object fromUser = null;
      if (horariosBody instanceof List) {
        List<?> list = (List<?>) horariosBody;
        fromUser = i < list.size() ? list.get(i) : null;
      }
      String parsed = normalizeHorario(fromUser);
      if (parsed != null) {
        result.add(parsed);
      } else {
        result.add(String.format("%02d:00", 7 + i * 3));
      }
    }
    return result;
  }

  public static List<Map<String, Object>> generate(
      double targetProtein,
      double targetCarbs,
      double targetFat,
      double refeicoesPorDia,
      List<String> horariosResolvidos) {
    List<Map<String, Object>> mealPlan = new ArrayList<>();

    int ovosTotal = 6;
    double proteinaOvos = ovosTotal * 6;
    double carboOvos = ovosTotal * 0.6;
    double gorduraOvos = ovosTotal * 5;

    double carboRestante = targetCarbs - carboOvos;
    double carboArroz = carboRestante * 0.55;
    double carboFeijao = carboRestante * 0.45;
    double arrozGramas = (carboArroz / 28) * 100;
    double feijaoGramas = (carboFeijao / 23) * 100;

    double proteinaArroz = (arrozGramas / 100) * 2.7;
    double proteinaFeijao = (feijaoGramas / 100) * 9;
    double gorduraArroz = (arrozGramas / 100) * 0.3;
    double gorduraFeijao = (feijaoGramas / 100) * 0.5;

    double proteinaRestante = targetProtein - proteinaOvos - proteinaArroz - proteinaFeijao;
    double frangoGramas = (proteinaRestante / 31) * 100;
    double gorduraFrango = (frangoGramas / 100) * 3.6;

    double gorduraAcumulada = gorduraOvos + gorduraFrango + gorduraArroz + gorduraFeijao;
    double gorduraRestante = targetFat - gorduraAcumulada;
    double azeiteML = (gorduraRestante / 100) * 100;

    arrozGramas = Js.round(arrozGramas);
    feijaoGramas = Js.round(feijaoGramas);
    frangoGramas = Js.round(frangoGramas);
    azeiteML = Js.round(azeiteML);

    double arrozPorRefeicao = Math.floor(arrozGramas / 4);
    double feijaoPorRefeicao = Math.floor(feijaoGramas / 4);
    double azeitePorRefeicao = Math.floor(azeiteML / 4);
    double frangoPorRefeicao = Math.floor(frangoGramas / 2);

    double restoArroz = arrozGramas - arrozPorRefeicao * 4;
    double restoFeijao = feijaoGramas - feijaoPorRefeicao * 4;
    double restoAzeite = azeiteML - azeitePorRefeicao * 4;
    double restoFrango = frangoGramas - frangoPorRefeicao * 2;

    Distribution[] distribuicao = {
      new Distribution(0, arrozPorRefeicao, feijaoPorRefeicao, 3, azeitePorRefeicao),
      new Distribution(frangoPorRefeicao, arrozPorRefeicao, feijaoPorRefeicao, 0, azeitePorRefeicao),
      new Distribution(0, arrozPorRefeicao, feijaoPorRefeicao, 3, azeitePorRefeicao),
      new Distribution(
          frangoPorRefeicao + restoFrango,
          arrozPorRefeicao + restoArroz,
          feijaoPorRefeicao + restoFeijao,
          0,
          azeitePorRefeicao + restoAzeite)
    };

    for (int i = 0; i < refeicoesPorDia; i++) {
      if (i >= MEAL_NAMES.length) {
        throw new IllegalStateException("Cannot read properties of undefined (reading 'arroz')");
      }

      String nomeRefeicao = MEAL_NAMES[i];
      Distribution dist = distribuicao[i];

      Map<String, Object> meal = new LinkedHashMap<>();
      meal.put("nome", nomeRefeicao);
      meal.put(
          "horario",
          i < horariosResolvidos.size() && !horariosResolvidos.get(i).isEmpty()
              ? horariosResolvidos.get(i)
              : String.format("%02d:00", 7 + i * 3));
      List<Map<String, Object>> alimentos = new ArrayList<>();
      meal.put("alimentos", alimentos);

      if (dist.arroz > 0) {
        alimentos.add(aliment("arroz_branco", foodName("arroz_branco"), dist.arroz, "g", ARROZ));
      }

      if (dist.feijao > 0) {
        alimentos.add(aliment("feijao", foodName("feijao"), dist.feijao, "g", FEIJAO));
      }

      if (dist.azeite > 0) {
        alimentos.add(aliment("azeite", foodName("azeite"), dist.azeite, "ml", AZEITE));
      }

      if (dist.ovo > 0) {
        alimentos.add(aliment("ovo", foodName("ovo"), dist.ovo, "unidade", OVO));
      }

      if (dist.frango > 0) {
        alimentos.add(aliment("frango_peito", foodName("frango_peito"), dist.frango, "g", FRANGO));
      }

      if (nomeRefeicao.equals("Café da Manhã")) {
        alimentos.add(supplement("creatina_growth", "Creatina Growth", 3, "g", zeroNutrition()));
        alimentos.add(
            supplement(
                "multivitaminico_growth", "Multivitamínico Growth", 1, "cápsula", zeroNutrition()));
        alimentos.add(supplement("omega3_growth", "Ômega-3 Growth", 2, "cápsulas", zeroNutrition()));

        Map<String, Object> calcioVitD = zeroNutrition();
        calcioVitD.put("calcio", 600.0);
        calcioVitD.put("vitaminaD", 10.0);
        alimentos.add(
            supplement("calcio_vitd_growth", "Cálcio + Vitamina D Growth", 1, "cápsula", calcioVitD));
      }

      if (nomeRefeicao.equals("Jantar")) {
        Map<String, Object> zma = zeroNutrition();
        zma.put("magnesio", 450.0);
        zma.put("zinco", 30.0);
        alimentos.add(supplement("zma_growth", "ZMA Growth", 2, "cápsulas", zma));
      }

      mealPlan.add(meal);
    }

    return mealPlan;
  }
}
