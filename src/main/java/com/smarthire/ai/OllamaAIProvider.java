package com.smarthire.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.config.AIConfiguration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Component
public class OllamaAIProvider implements AIProvider {

    private static final Logger log = LoggerFactory.getLogger(OllamaAIProvider.class);

    private final AIConfiguration config;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public OllamaAIProvider(AIConfiguration config, ObjectMapper objectMapper) {
        this.config = config;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @Override
    public String analyze(String prompt, String systemInstruction) {
        return analyze(prompt, systemInstruction, null, null);
    }

    @Override
    public String analyze(String prompt, String systemInstruction, String apiKeyOverride) {
        return analyze(prompt, systemInstruction, apiKeyOverride, null);
    }

    @Override
    public String analyze(String prompt, String systemInstruction, String apiKeyOverride, String modelOverride) {
        try {
            String baseUrl = config.getOllama().getBaseUrl();
            if (baseUrl == null || baseUrl.isBlank()) {
                baseUrl = "http://localhost:11434";
            }
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }
            URI uri = URI.create(baseUrl + "/api/generate");

            String effectiveModel = (modelOverride != null && !modelOverride.isBlank())
                    ? modelOverride.trim()
                    : config.getOllama().getModel();

            if (effectiveModel == null || effectiveModel.isBlank()) {
                effectiveModel = "codellama";
            }

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", effectiveModel);
            requestBody.put("prompt", prompt);
            requestBody.put("system", systemInstruction);
            requestBody.put("format", "json");
            requestBody.put("stream", false);

            String jsonPayload = objectMapper.writeValueAsString(requestBody);
            int timeoutSec = Math.max(120, config.getOllama().getTimeoutSeconds());

            log.info("Sending resume analysis request to Ollama (model: {}, timeout: {}s)", effectiveModel, timeoutSec);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uri)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(timeoutSec))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                String rawText;
                if (root.has("response")) {
                    rawText = root.get("response").asText();
                } else {
                    rawText = response.body();
                }
                return cleanMarkdownCodeBlocks(rawText);
            } else {
                log.warn("Ollama returned status code {}: {}", response.statusCode(), response.body());
                throw new RuntimeException("Ollama error status " + response.statusCode() + ": " + response.body());
            }

        } catch (Exception e) {
            log.warn("Ollama invocation failed: {}", e.getMessage());
            throw new RuntimeException("Ollama processing failed: " + e.getMessage(), e);
        }
    }

    private String cleanMarkdownCodeBlocks(String text) {
        if (text == null) return "";
        String trimmed = text.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }

    @Override
    public String getProviderName() {
        return "ollama (" + config.getOllama().getModel() + ")";
    }

    @Override
    public boolean isAvailable() {
        try {
            String baseUrl = config.getOllama().getBaseUrl();
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }
            URI uri = URI.create(baseUrl + "/api/tags");
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uri)
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200;
        } catch (Exception e) {
            return false;
        }
    }
}
