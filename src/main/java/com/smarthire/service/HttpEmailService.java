package com.smarthire.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class HttpEmailService {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Send email via Brevo REST API over HTTPS (Port 443).
     * Works 100% on Render Free Tier with zero outbound port restrictions.
     */
    public boolean sendViaBrevo(
            String apiKey,
            String senderEmail,
            String senderName,
            String recipientEmail,
            String recipientName,
            String subject,
            String bodyHtml
    ) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalArgumentException("Brevo API key is required.");
        }
        if (senderEmail == null || senderEmail.isBlank() || recipientEmail == null || recipientEmail.isBlank()) {
            throw new IllegalArgumentException("Both sender and recipient email addresses are required.");
        }

        try {
            String cleanApiKey = apiKey.trim()
                    .replaceAll("^\"|\"$", "")
                    .replaceAll("^'|'$", "")
                    .replaceAll("(?i)^api[-_]?key:\\s*", "")
                    .replaceAll("\\s+", "")
                    .trim();

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("sender", Map.of(
                    "name", (senderName != null && !senderName.isBlank()) ? senderName.trim() : "SmartHire Recruiter",
                    "email", senderEmail.trim()
            ));
            payload.put("to", List.of(Map.of(
                    "email", recipientEmail.trim(),
                    "name", (recipientName != null && !recipientName.isBlank()) ? recipientName.trim() : "Recipient"
            )));
            payload.put("subject", subject != null ? subject.trim() : "SmartHire Notification");
            payload.put("htmlContent", bodyHtml != null ? bodyHtml : "");

            String jsonPayload = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                    .timeout(Duration.ofSeconds(15))
                    .header("api-key", cleanApiKey)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            int status = response.statusCode();

            if (status >= 200 && status < 300) {
                log.info("Brevo HTTP API: Email successfully delivered to [{}] (Status: {})", recipientEmail, status);
                return true;
            } else {
                String body = response.body() != null ? response.body().trim() : "";
                log.error("Brevo HTTP API delivery failed (Status {}): {}", status, body);
                if (status == 401) {
                    throw new RuntimeException("Brevo API Key rejected (HTTP 401 Unauthorized): " + (body.isEmpty() ? "Key not recognized by Brevo." : body) + " — Please ensure you copied the key from Brevo ➔ 'API Keys' tab (starts with xkeysib-) and that your account is active.");
                } else if (status == 400 && body.contains("sender")) {
                    throw new RuntimeException("Brevo rejected sender email '" + senderEmail + "'. Please add and verify this email address under 'Senders' in your Brevo dashboard.");
                } else {
                    throw new RuntimeException("Brevo email failed (" + status + "): " + body);
                }
            }
        } catch (RuntimeException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Brevo HTTP API exception: ", ex);
            throw new RuntimeException("Brevo API connection error: " + ex.getMessage(), ex);
        }
    }

    /**
     * Send email via Resend REST API over HTTPS (Port 443).
     */
    public boolean sendViaResend(
            String apiKey,
            String senderEmail,
            String senderName,
            String recipientEmail,
            String subject,
            String bodyHtml
    ) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalArgumentException("Resend API key is required.");
        }

        try {
            String fromDisplay = (senderName != null && !senderName.isBlank()) ? senderName.trim() : "SmartHire";
            String fromHeader = fromDisplay + " <" + senderEmail.trim() + ">";

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("from", fromHeader);
            payload.put("to", List.of(recipientEmail.trim()));
            payload.put("subject", subject != null ? subject.trim() : "SmartHire Notification");
            payload.put("html", bodyHtml != null ? bodyHtml : "");

            String jsonPayload = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + apiKey.trim())
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            int status = response.statusCode();

            if (status >= 200 && status < 300) {
                log.info("Resend HTTP API: Email successfully delivered to [{}] (Status: {})", recipientEmail, status);
                return true;
            } else {
                log.error("Resend HTTP API delivery failed (Status {}): {}", status, response.body());
                if (status == 401 || status == 403) {
                    throw new RuntimeException("Resend API key unauthorized or domain unverified. Check Resend dashboard: " + response.body());
                } else {
                    throw new RuntimeException("Resend email failed (" + status + "): " + response.body());
                }
            }
        } catch (RuntimeException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Resend HTTP API exception: ", ex);
            throw new RuntimeException("Resend API connection error: " + ex.getMessage(), ex);
        }
    }
}
