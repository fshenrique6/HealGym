package com.healgym.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healgym.config.Env;
import com.healgym.util.Json;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class EmailService {

  public static class Result {
    public final boolean success;
    public final String messageId;
    public final boolean devMode;

    public Result(boolean success, String messageId, boolean devMode) {
      this.success = success;
      this.messageId = messageId;
      this.devMode = devMode;
    }
  }

  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final String apiKey;
  private final String emailFrom;
  private final boolean initialized;
  private final HttpClient client = HttpClient.newHttpClient();

  public EmailService() {
    this.apiKey = Env.get("RESEND_API_KEY");
    this.emailFrom = Env.get("RESEND_FROM");
    this.initialized =
        apiKey != null && !apiKey.isEmpty() && emailFrom != null && !emailFrom.isEmpty();
  }

  private static String frontendBaseUrl() {
    String url = Env.get("FRONTEND_URL");
    if (url == null || url.isEmpty()) {
      if ("production".equals(Env.get("NODE_ENV"))) {
        throw new IllegalStateException("FRONTEND_URL deve ser configurado em produção.");
      }
      url = "http://localhost:3000";
    }
    return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
  }

  private static boolean isDevelopment() {
    return "development".equals(Env.get("NODE_ENV"));
  }

  public Result sendPasswordResetEmail(String email, String resetToken) {
    String resetUrl = frontendBaseUrl() + "/reset-password/" + resetToken;

    if (!initialized) {
      if (!isDevelopment()) {
        throw new IllegalStateException("Serviço de e-mail não configurado.");
      }

      System.err.println("[DESENVOLVIMENTO] Link para testar a recuperação de senha: " + resetUrl);

      return new Result(true, "dev-mode-" + System.currentTimeMillis(), true);
    }

    String id =
        send(
            email,
            "Recuperação de Senha - HealGym",
            passwordResetTemplate(resetUrl),
            "Você solicitou a recuperação de senha do HealGym. Acesse: "
                + resetUrl
                + ". O link expira em 15 minutos.",
            "Falha ao enviar e-mail de recuperação.",
            "Erro ao enviar e-mail de recuperação:");

    return new Result(true, id, false);
  }

  public Result sendEmailChangeCode(String email, String code) {
    if (email == null || code == null) {
      throw new IllegalStateException("Falha ao enviar e-mail de alteração.");
    }

    if (!initialized) {
      throw new IllegalStateException("Serviço de e-mail não configurado.");
    }

    String id =
        send(
            email,
            "Alteração de e-mail - HealGym",
            emailChangeTemplate(code),
            "HealGym: foi solicitada a alteração do e-mail da sua conta. Código: "
                + code
                + ". Ele expira em 10 minutos. Se você não solicitou esta alteração, ignore este e-mail.",
            "Falha ao enviar e-mail de alteração.",
            "Erro ao enviar e-mail de alteração:");

    return new Result(true, id, false);
  }

  public Result sendAccountDeletionEmail(String email, String confirmationToken) {
    String confirmationUrl = frontendBaseUrl() + "/confirm-delete/" + confirmationToken;

    if (!initialized) {
      if (!isDevelopment()) {
        throw new IllegalStateException("Serviço de e-mail não configurado.");
      }

      System.err.println(
          "[DESENVOLVIMENTO] Link para testar a exclusão de conta: " + confirmationUrl);

      return new Result(true, "dev-mode-" + System.currentTimeMillis(), true);
    }

    String id =
        send(
            email,
            "Confirmação de Exclusão de Conta - HealGym",
            accountDeletionTemplate(confirmationUrl),
            "Você solicitou a exclusão permanente da sua conta no HealGym. Para confirmar, acesse: "
                + confirmationUrl
                + ". Este link expira em 30 minutos. Se você não solicitou esta exclusão, ignore este e-mail.",
            "Falha ao enviar e-mail de exclusão.",
            "Erro ao enviar e-mail de exclusão:");

    return new Result(true, id, false);
  }

  private String send(
      String to,
      String subject,
      String html,
      String text,
      String failureMessage,
      String logPrefix) {
    try {
      Map<String, Object> payload =
          Json.obj("from", emailFrom, "to", to, "subject", subject, "html", html, "text", text);

      HttpRequest request =
          HttpRequest.newBuilder(URI.create("https://api.resend.com/emails"))
              .header("Authorization", "Bearer " + apiKey)
              .header("Content-Type", "application/json")
              .header("User-Agent", "resend-java")
              .POST(
                  HttpRequest.BodyPublishers.ofString(
                      MAPPER.writeValueAsString(payload), StandardCharsets.UTF_8))
              .build();

      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() >= 400) {
        System.err.println(logPrefix + " " + response.body());
        throw new IllegalStateException(failureMessage);
      }

      JsonNode node = MAPPER.readTree(response.body());
      return node.hasNonNull("id") ? node.get("id").asText() : null;
    } catch (IllegalStateException e) {
      throw e;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      System.err.println(logPrefix + " " + e);
      throw new IllegalStateException(failureMessage);
    } catch (Exception e) {
      System.err.println(logPrefix + " " + e);
      throw new IllegalStateException(failureMessage);
    }
  }

  private String passwordResetTemplate(String resetUrl) {
    return "\n"
        + "      <!DOCTYPE html>\n"
        + "      <html lang=\"pt-BR\">\n"
        + "        <head>\n"
        + "          <meta charset=\"utf-8\">\n"
        + "          <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"
        + "          <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n"
        + "          <title>Redefinição de senha - HealGym</title>\n"
        + "          <!--[if mso]>\n"
        + "          <noscript>\n"
        + "            <xml>\n"
        + "              <o:OfficeDocumentSettings>\n"
        + "                <o:PixelsPerInch>96</o:PixelsPerInch>\n"
        + "              </o:OfficeDocumentSettings>\n"
        + "            </xml>\n"
        + "          </noscript>\n"
        + "          <![endif]-->\n"
        + "          <style>\n"
        + "            @media only screen and (max-width: 600px) {\n"
        + "              .email-wrapper { padding: 24px 12px !important; }\n"
        + "              .email-card { padding: 28px 20px !important; }\n"
        + "              .email-logo { font-size: 22px !important; letter-spacing: 3px !important; }\n"
        + "              .email-title { font-size: 20px !important; letter-spacing: 1px !important; }\n"
        + "              .email-button { padding: 14px 24px !important; font-size: 14px !important; }\n"
        + "            }\n"
        + "            .email-button-cell,\n"
        + "            .email-button {\n"
        + "              transition: background-color 200ms ease, box-shadow 200ms ease;\n"
        + "            }\n"
        + "            .email-button-cell:hover {\n"
        + "              background-color: #D4B56E !important;\n"
        + "              background-image: linear-gradient(45deg,#D4B56E 0%,#E8CF96 50%,#D4B56E 100%) !important;\n"
        + "              box-shadow: 0 6px 20px rgba(0,0,0,0.45), 0 0 12px rgba(198,169,100,0.28) !important;\n"
        + "            }\n"
        + "            a.email-button:hover {\n"
        + "              background-color: #D4B56E !important;\n"
        + "            }\n"
        + "          </style>\n"
        + "        </head>\n"
        + "        <body style=\"margin:0;padding:0;background-color:#0A0A0A;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;\">\n"
        + "          <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"background-color:#0A0A0A;background-image:linear-gradient(135deg,#000000 0%,#0A0A0A 50%,#1A1A1A 100%);\">\n"
        + "            <tr>\n"
        + "              <td align=\"center\" class=\"email-wrapper\" style=\"padding:40px 16px;\">\n"
        + "                <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"max-width:560px;\">\n"
        + "                  <tr>\n"
        + "                    <td align=\"center\" style=\"padding:0 0 28px 0;\">\n"
        + "                      <span class=\"email-logo\" style=\"font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:600;letter-spacing:6px;color:#C6A964;text-transform:uppercase;text-decoration:underline;text-decoration-color:#8D8C8C;text-underline-offset:6px;\">HealGym</span>\n"
        + "                    </td>\n"
        + "                  </tr>\n"
        + "                  <tr>\n"
        + "                    <td class=\"email-card\" style=\"background-color:#111111;border:1px solid #2E2A1E;border-radius:2px;padding:40px 32px;\">\n"
        + "                      <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\">\n"
        + "                        <tr>\n"
        + "                          <td align=\"center\" style=\"padding:0 0 20px 0;\">\n"
        + "                            <h1 class=\"email-title\" style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:24px;font-weight:600;letter-spacing:2px;color:#C6A964;text-transform:uppercase;line-height:1.3;\">Redefinição de senha</h1>\n"
        + "                          </td>\n"
        + "                        </tr>\n"
        + "                        <tr>\n"
        + "                          <td align=\"center\" style=\"padding:0 0 28px 0;\">\n"
        + "                            <p style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13.5px;line-height:1.8;letter-spacing:0.3px;color:#E0E0E0;\">Recebemos uma solicitação para redefinir a senha da sua conta no HealGym.</p>\n"
        + "                          </td>\n"
        + "                        </tr>\n"
        + "                        <tr>\n"
        + "                          <td align=\"center\" style=\"padding:0 0 28px 0;\">\n"
        + "                            <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n"
        + "                              <tr>\n"
        + "                                <td align=\"center\" bgcolor=\"#C6A964\" class=\"email-button-cell\" style=\"background-color:#C6A964;background-image:linear-gradient(45deg,#C6A964 0%,#E2C385 50%,#C6A964 100%);border-radius:2px;box-shadow:0 4px 15px rgba(0,0,0,0.3);\">\n"
        + "                                  <a href=\""
        + resetUrl
        + "\" class=\"email-button\" style=\"display:inline-block;padding:15px 40px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;letter-spacing:2px;color:#0A0A0A;text-decoration:none;text-transform:uppercase;\">Redefinir senha</a>\n"
        + "                                </td>\n"
        + "                              </tr>\n"
        + "                            </table>\n"
        + "                          </td>\n"
        + "                        </tr>\n"
        + "                        <tr>\n"
        + "                          <td align=\"center\" style=\"padding:0 0 20px 0;\">\n"
        + "                            <p style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.8;letter-spacing:0.3px;color:#E0E0E0;\">Este link expira em 15 minutos e só pode ser usado uma vez.</p>\n"
        + "                          </td>\n"
        + "                        </tr>\n"
        + "                        <tr>\n"
        + "                          <td align=\"center\" style=\"padding:0 0 8px 0;\">\n"
        + "                            <p style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;font-style:italic;line-height:1.6;color:#B3B3B3;\">Se você não solicitou esta alteração, ignore este e-mail.</p>\n"
        + "                          </td>\n"
        + "                        </tr>\n"
        + "                      </table>\n"
        + "                    </td>\n"
        + "                  </tr>\n"
        + "                  <tr>\n"
        + "                    <td align=\"center\" style=\"padding:28px 8px 0 8px;\">\n"
        + "                      <p style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:12px;letter-spacing:3px;color:#8A8A8A;text-transform:uppercase;\">HealGym</p>\n"
        + "                    </td>\n"
        + "                  </tr>\n"
        + "                </table>\n"
        + "              </td>\n"
        + "            </tr>\n"
        + "          </table>\n"
        + "        </body>\n"
        + "      </html>\n"
        + "    ";
  }

  private String emailChangeTemplate(String code) {
    return "\n"
        + "      <!DOCTYPE html>\n"
        + "      <html lang=\"pt-BR\">\n"
        + "        <head>\n"
        + "          <meta charset=\"utf-8\">\n"
        + "          <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"
        + "          <title>Alteração de e-mail - HealGym</title>\n"
        + "        </head>\n"
        + "        <body style=\"margin:0;padding:0;background-color:#0A0A0A;\">\n"
        + "          <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"background-color:#0A0A0A;\">\n"
        + "            <tr>\n"
        + "              <td align=\"center\" style=\"padding:40px 16px;\">\n"
        + "                <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"max-width:560px;\">\n"
        + "                  <tr>\n"
        + "                    <td align=\"center\" style=\"padding:0 0 28px 0;\">\n"
        + "                      <span style=\"font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:600;letter-spacing:6px;color:#C6A964;text-transform:uppercase;text-decoration:underline;text-decoration-color:#8D8C8C;text-underline-offset:6px;\">HealGym</span>\n"
        + "                    </td>\n"
        + "                  </tr>\n"
        + "                  <tr>\n"
        + "                    <td style=\"background-color:#111111;border:1px solid #2E2A1E;border-radius:2px;padding:40px 32px;\">\n"
        + "                      <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\">\n"
        + "                        <tr>\n"
        + "                          <td align=\"center\" style=\"padding:0 0 20px 0;\">\n"
        + "                            <h1 style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:24px;font-weight:600;letter-spacing:2px;color:#C6A964;text-transform:uppercase;line-height:1.3;\">Alteração de e-mail</h1>\n"
        + "                          </td>\n"
        + "                        </tr>\n"
        + "                        <tr>\n"
        + "                          <td align=\"center\" style=\"padding:0 0 28px 0;\">\n"
        + "                            <p style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13.5px;line-height:1.8;letter-spacing:0.3px;color:#E0E0E0;\">Recebemos uma solicitação para alterar o e-mail da sua conta no HealGym.</p>\n"
        + "                          </td>\n"
        + "                        </tr>\n"
        + "                        <tr>\n"
        + "                          <td align=\"center\" style=\"padding:0 0 28px 0;\">\n"
        + "                            <p style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:600;letter-spacing:8px;color:#C6A964;\">"
        + code
        + "</p>\n"
        + "                          </td>\n"
        + "                        </tr>\n"
        + "                        <tr>\n"
        + "                          <td align=\"center\" style=\"padding:0 0 20px 0;\">\n"
        + "                            <p style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.8;letter-spacing:0.3px;color:#E0E0E0;\">Este código expira em 10 minutos e só pode ser usado uma vez.</p>\n"
        + "                          </td>\n"
        + "                        </tr>\n"
        + "                        <tr>\n"
        + "                          <td align=\"center\">\n"
        + "                            <p style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;font-style:italic;line-height:1.6;color:#B3B3B3;\">Se você não solicitou esta alteração, ignore este e-mail.</p>\n"
        + "                          </td>\n"
        + "                        </tr>\n"
        + "                      </table>\n"
        + "                    </td>\n"
        + "                  </tr>\n"
        + "                  <tr>\n"
        + "                    <td align=\"center\" style=\"padding:28px 8px 0 8px;\">\n"
        + "                      <p style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:12px;letter-spacing:3px;color:#8A8A8A;text-transform:uppercase;\">HealGym</p>\n"
        + "                    </td>\n"
        + "                  </tr>\n"
        + "                </table>\n"
        + "              </td>\n"
        + "            </tr>\n"
        + "          </table>\n"
        + "        </body>\n"
        + "      </html>\n";
  }

  private String accountDeletionTemplate(String confirmationUrl) {
    return "\n"
        + "      <!DOCTYPE html>\n"
        + "      <html lang=\"pt-BR\">\n"
        + "        <head>\n"
        + "          <meta charset=\"utf-8\">\n"
        + "          <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"
        + "          <title>Confirmação de exclusão de conta - HealGym</title>\n"
        + "        </head>\n"
        + "        <body style=\"margin:0;padding:0;background-color:#0A0A0A;\">\n"
        + "          <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" bgcolor=\"#0A0A0A\" style=\"background-color:#0A0A0A;\">\n"
        + "            <tr>\n"
        + "              <td align=\"center\" style=\"padding:40px 16px;\">\n"
        + "                <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"max-width:560px;\">\n"
        + "                  <tr>\n"
        + "                    <td align=\"center\" style=\"padding:0 0 28px 0;\">\n"
        + "                      <span style=\"font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:600;letter-spacing:6px;color:#C6A964;text-transform:uppercase;text-decoration:underline;text-decoration-color:#8D8C8C;text-underline-offset:6px;\">HealGym</span>\n"
        + "                    </td>\n"
        + "                  </tr>\n"
        + "                  <tr>\n"
        + "                    <td bgcolor=\"#111111\" style=\"background-color:#111111;border:1px solid #2E2A1E;border-radius:2px;padding:40px 32px;\">\n"
        + "                      <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\">\n"
        + "                        <tr>\n"
        + "                          <td align=\"center\" style=\"padding:0 0 20px 0;\">\n"
        + "                            <h1 style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:22px;font-weight:600;letter-spacing:2px;color:#C6A964;text-transform:uppercase;line-height:1.3;\">Confirmação de<br>exclusão de conta</h1>\n"
        + "                          </td>\n"
        + "                        </tr>\n"
        + "                        <tr>\n"
        + "                          <td align=\"center\" style=\"padding:0 0 28px 0;\">\n"
        + "                            <p style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13.5px;line-height:1.8;letter-spacing:0.3px;color:#E0E0E0;\">Você solicitou a exclusão <span style=\"color:#C6A964;\">permanente</span> da sua conta.</p>\n"
        + "                          </td>\n"
        + "                        </tr>\n"
        + "                        <tr>\n"
        + "                          <td align=\"center\" style=\"padding:0 0 28px 0;\">\n"
        + "                            <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">\n"
        + "                              <tr>\n"
        + "                                <td align=\"center\" bgcolor=\"#8C2F2F\" style=\"background-color:#8C2F2F;border-radius:2px;\">\n"
        + "                                  <a href=\""
        + confirmationUrl
        + "\" style=\"display:inline-block;padding:15px 40px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;letter-spacing:2px;color:#FFFFFF;text-decoration:none;text-transform:uppercase;\">Confirmar exclusão</a>\n"
        + "                                </td>\n"
        + "                              </tr>\n"
        + "                            </table>\n"
        + "                          </td>\n"
        + "                        </tr>\n"
        + "                        <tr>\n"
        + "                          <td align=\"center\" style=\"padding:0 0 20px 0;\">\n"
        + "                            <p style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.8;letter-spacing:0.3px;color:#E0E0E0;\">Este link expira em 30 minutos.</p>\n"
        + "                          </td>\n"
        + "                        </tr>\n"
        + "                        <tr>\n"
        + "                          <td align=\"center\">\n"
        + "                            <p style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;font-style:italic;line-height:1.6;color:#B3B3B3;\">Se você não solicitou esta exclusão, ignore este e-mail.</p>\n"
        + "                          </td>\n"
        + "                        </tr>\n"
        + "                      </table>\n"
        + "                    </td>\n"
        + "                  </tr>\n"
        + "                  <tr>\n"
        + "                    <td align=\"center\" style=\"padding:28px 8px 0 8px;\">\n"
        + "                      <p style=\"margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:12px;letter-spacing:3px;color:#8A8A8A;text-transform:uppercase;\">HealGym</p>\n"
        + "                    </td>\n"
        + "                  </tr>\n"
        + "                </table>\n"
        + "              </td>\n"
        + "            </tr>\n"
        + "          </table>\n"
        + "        </body>\n"
        + "      </html>\n";
  }
}
