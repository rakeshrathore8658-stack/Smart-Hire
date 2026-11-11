package com.smarthire.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.config.AIConfiguration;
import com.smarthire.dto.AIProviderInfoDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIProviderHealthService {

    private final AIConfiguration aiConfig;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    public Map<String, Object> getProvidersHealth() {
        List<AIProviderInfoDTO> providers = new ArrayList<>();

        // 1. Local Rule-Based Deterministic Engine
        providers.add(AIProviderInfoDTO.builder()
                .id("local")
                .name("Local Rule-Based Analysis")
                .type("DETERMINISTIC")
                .status("AVAILABLE")
                .statusMessage("Rule-Based Deterministic Engine (Offline, Non-Generative)")
                .available(true)
                .models(List.of("Rule-Based Local Engine v2.0"))
                .defaultModel("Rule-Based Local Engine v2.0")
                .build());

        // 2. Local Ollama LLM
        AIProviderInfoDTO ollamaInfo = checkOllamaHealth();
        providers.add(ollamaInfo);

        // 3. Google Gemini Cloud LLM
        AIProviderInfoDTO geminiInfo = checkGeminiHealth();
        providers.add(geminiInfo);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "UP");
        response.put("defaultProvider", aiConfig.getProvider());
        response.put("providers", providers);
        return response;
    }

    private AIProviderInfoDTO checkOllamaHealth() {
        String baseUrl = aiConfig.getOllama().getBaseUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "http://localhost:11434";
        }
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }

        try {
            URI uri = URI.create(baseUrl + "/api/tags");
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(uri)
                    .timeout(Duration.ofSeconds(2))
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(resp.body());
                JsonNode modelsNode = root.path("models");
                List<String> installed = new ArrayList<>();
                if (modelsNode.isArray()) {
                    for (JsonNode m : modelsNode) {
                        String name = m.path("name").asText();
                        if (name != null && !name.isBlank()) {
                            installed.add(name);
                        }
                    }
                }

                if (!installed.isEmpty()) {
                    return AIProviderInfoDTO.builder()
                            .id("ollama")
                            .name("Local Ollama AI")
                            .type("LOCAL_LLM")
                            .status("CONNECTED")
                            .statusMessage("Ollama Server Connected (" + installed.size() + " model(s) available)")
                            .available(true)
                            .serverUrl(baseUrl)
                            .models(installed)
                            .defaultModel(installed.contains("codellama:latest") ? "codellama:latest" : installed.get(0))
                            .build();
                } else {
                    return AIProviderInfoDTO.builder()
                            .id("ollama")
                            .name("Local Ollama AI")
                            .type("LOCAL_LLM")
                            .status("NO_MODELS")
                            .statusMessage("Ollama connected, but no models installed. Run: ollama pull codellama")
                            .available(false)
                            .serverUrl(baseUrl)
                            .models(List.of("codellama", "llama3", "mistral"))
                            .defaultModel("codellama")
                            .build();
                }
            }
        } catch (Exception e) {
            log.debug("Ollama health check unreachable at {}: {}", baseUrl, e.getMessage());
        }

        return AIProviderInfoDTO.builder()
                .id("ollama")
                .name("Local Ollama AI")
                .type("LOCAL_LLM")
                .status("SERVER_OFFLINE")
                .statusMessage("Ollama server not running at " + baseUrl)
                .available(false)
                .serverUrl(baseUrl)
                .models(List.of("codellama", "llama3", "mistral"))
                .defaultModel("codellama")
                .build();
    }

    private AIProviderInfoDTO checkGeminiHealth() {
        String key = aiConfig.getGemini().getApiKey();
        boolean hasKey = key != null && !key.isBlank() && !key.contains("${");
        String configuredModel = "auto";
        List<String> models = List.of("auto");

        if (hasKey) {
            return AIProviderInfoDTO.builder()
                    .id("gemini")
                    .name("Google Gemini AI")
                    .type("CLOUD_LLM")
                    .status("CONNECTED")
                    .statusMessage("API Key configured on server")
                    .available(true)
                    .models(models)
                    .defaultModel(configuredModel)
                    .build();
        } else {
            return AIProviderInfoDTO.builder()
                    .id("gemini")
                    .name("Google Gemini AI")
                    .type("CLOUD_LLM")
                    .status("API_KEY_MISSING")
                    .statusMessage("GEMINI_API_KEY environment variable not configured on server")
                    .available(false)
                    .models(models)
                    .defaultModel(configuredModel)
                    .build();
        }
    }
}
