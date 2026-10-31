package com.healgym.controller;

import com.healgym.model.User;
import com.healgym.repository.BodyMeasurementRepository;
import com.healgym.security.AuthService;
import com.healgym.util.Js;
import com.healgym.util.Json;
import com.healgym.web.ApiException;
import com.healgym.web.CastException;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/body-measurements")
public class BodyMeasurementController extends BaseController {

  private static final int LIMITE = 1000;
  private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
  private static final LocalDate DATA_MINIMA = LocalDate.of(1900, 1, 1);

  private static final Medida[] MEDIDAS = {
    new Medida("cintura", 40, 200),
    new Medida("quadril", 50, 200),
    new Medida("peito", 50, 200),
    new Medida("braco", 15, 70),
    new Medida("coxa", 25, 120),
    new Medida("abdomen", 40, 200),
    new Medida("panturrilha", 15, 70),
  };

  private final BodyMeasurementRepository medicoes;
  private final AuthService auth;

  public BodyMeasurementController(BodyMeasurementRepository medicoes, AuthService auth) {
    this.medicoes = medicoes;
    this.auth = auth;
  }

  @GetMapping
  public ResponseEntity<Object> listar(HttpServletRequest request) {
    User user = auth.authenticate(request);
    try {
      List<Document> found = medicoes.listarRecentes(user.getId(), LIMITE);
      List<Object> items = new ArrayList<>();
      for (Document document : found) {
        items.add(apresentar(document));
      }
      Map<String, Object> payload = Json.obj("medicoes", items);
      if (found.size() == LIMITE && medicoes.contar(user.getId()) > found.size()) {
        payload.put("truncado", true);
      }
      return ok(payload);
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao listar medidas corporais: " + e);
      throw internalError();
    }
  }

  @PostMapping
  public ResponseEntity<Object> criar(HttpServletRequest request) {
    User user = auth.authenticate(request);
    try {
      Document document = ler(body(request), user.getId(), new Date());
      medicoes.insert(document);
      return ok(Json.obj("medicao", apresentar(document)));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao salvar medida corporal: " + e);
      throw internalError();
    }
  }

  @PutMapping("/{id}")
  public ResponseEntity<Object> atualizar(@PathVariable("id") String id, HttpServletRequest request) {
    User user = auth.authenticate(request);
    try {
      Document atual = buscar(id, user.getId());
      if (atual == null) {
        throw error(404, "Medição não encontrada");
      }
      Date criada = atual.getDate("createdAt");
      Document novo = ler(body(request), user.getId(), criada == null ? new Date() : criada);
      novo.put("_id", atual.getObjectId("_id"));
      medicoes.replace(novo);
      return ok(Json.obj("medicao", apresentar(novo)));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao atualizar medida corporal: " + e);
      throw internalError();
    }
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Object> excluir(@PathVariable("id") String id, HttpServletRequest request) {
    User user = auth.authenticate(request);
    try {
      Document removida;
      try {
        removida = medicoes.deleteOwned(id, user.getId());
      } catch (CastException e) {
        removida = null;
      }
      if (removida == null) {
        throw error(404, "Medição não encontrada");
      }
      return ok(Json.obj("message", "Medição excluída"));
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      System.err.println("Erro ao excluir medida corporal: " + e);
      throw internalError();
    }
  }

  private Document buscar(String id, ObjectId userId) {
    try {
      return medicoes.findOwned(id, userId);
    } catch (CastException e) {
      return null;
    }
  }

  private Document ler(Map<String, Object> body, ObjectId userId, Date criadaEm) {
    List<String> erros = new ArrayList<>();
    String data = lerData(body.get("data"), erros);
    Document document = new Document();
    int preenchidas = 0;
    for (Medida medida : MEDIDAS) {
      if (!body.containsKey(medida.campo)) {
        continue;
      }
      Object bruto = body.get(medida.campo);
      if (bruto == null) {
        continue;
      }
      if (bruto instanceof String && Js.trim((String) bruto).isEmpty()) {
        continue;
      }
      Double valor = lerNumero(bruto, medida, erros);
      if (valor != null) {
        document.put(medida.campo, valor);
        preenchidas++;
      }
    }
    if (erros.isEmpty() && preenchidas == 0) {
      erros.add("Informe ao menos uma medida.");
    }
    if (!erros.isEmpty()) {
      throw new ApiException(400, Json.obj("error", String.join(" ", erros)));
    }
    document.put("user", userId);
    document.put("dataMedicao", data);
    document.put("createdAt", criadaEm);
    document.put("updatedAt", new Date());
    return document;
  }

  private String lerData(Object bruto, List<String> erros) {
    String texto = bruto instanceof String ? Js.trim((String) bruto) : "";
    if (!texto.matches("\\d{4}-\\d{2}-\\d{2}")) {
      erros.add("Informe a data da medição.");
      return null;
    }
    LocalDate data;
    try {
      data = LocalDate.parse(texto);
    } catch (DateTimeParseException e) {
      erros.add("Data da medição inválida.");
      return null;
    }
    if (data.isBefore(DATA_MINIMA)) {
      erros.add("A data da medição é antiga demais.");
      return null;
    }
    LocalDate hoje;
    try {
      hoje = LocalDate.now(FUSO);
    } catch (DateTimeException e) {
      hoje = LocalDate.now(ZoneId.of("UTC"));
    }
    if (data.isAfter(hoje)) {
      erros.add("A data da medição não pode ser futura.");
      return null;
    }
    return data.toString();
  }

  private Double lerNumero(Object bruto, Medida medida, List<String> erros) {
    BigDecimal numero;
    try {
      if (bruto instanceof String) {
        String texto = Js.trim((String) bruto).replace(',', '.');
        numero = new BigDecimal(texto);
      } else if (bruto instanceof Integer || bruto instanceof Long) {
        numero = BigDecimal.valueOf(((Number) bruto).longValue());
      } else if (bruto instanceof Number) {
        double valor = ((Number) bruto).doubleValue();
        if (Double.isNaN(valor) || Double.isInfinite(valor)) {
          erros.add(medida.campo + " deve ser um número.");
          return null;
        }
        numero = BigDecimal.valueOf(valor);
      } else {
        erros.add(medida.campo + " deve ser um número.");
        return null;
      }
    } catch (NumberFormatException e) {
      erros.add(medida.campo + " deve ser um número.");
      return null;
    }

    BigDecimal normal = numero.stripTrailingZeros();
    if (normal.scale() < 0) {
      normal = normal.setScale(0);
    }
    if (normal.scale() > 1) {
      erros.add(rotulo(medida.campo) + " aceita no máximo uma casa decimal.");
      return null;
    }
    double valor = normal.doubleValue();
    if (valor <= 0) {
      erros.add(rotulo(medida.campo) + " deve ser maior que zero.");
      return null;
    }
    if (valor < medida.minimo || valor > medida.maximo) {
      erros.add(
          rotulo(medida.campo)
              + " deve ficar entre "
              + formatarLimite(medida.minimo)
              + " e "
              + formatarLimite(medida.maximo)
              + " cm.");
      return null;
    }
    return valor;
  }

  private Map<String, Object> apresentar(Document document) {
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("id", document.getObjectId("_id").toHexString());
    item.put("data", document.getString("dataMedicao"));
    for (Medida medida : MEDIDAS) {
      Object valor = document.get(medida.campo);
      if (valor != null) {
        item.put(medida.campo, valor);
      }
    }
    if (document.getDate("createdAt") != null) {
      item.put("createdAt", document.getDate("createdAt"));
    }
    if (document.getDate("updatedAt") != null) {
      item.put("updatedAt", document.getDate("updatedAt"));
    }
    return item;
  }

  private static String rotulo(String campo) {
    return switch (campo) {
      case "cintura" -> "Cintura";
      case "quadril" -> "Quadril";
      case "peito" -> "Peito";
      case "braco" -> "Braço";
      case "coxa" -> "Coxa";
      case "abdomen" -> "Abdômen";
      case "panturrilha" -> "Panturrilha";
      default -> campo;
    };
  }

  private static String formatarLimite(double valor) {
    if (valor == Math.rint(valor)) {
      return String.valueOf((long) valor);
    }
    return String.valueOf(valor).replace('.', ',');
  }

  private static final class Medida {
    private final String campo;
    private final double minimo;
    private final double maximo;

    private Medida(String campo, double minimo, double maximo) {
      this.campo = campo;
      this.minimo = minimo;
      this.maximo = maximo;
    }
  }
}
