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
                    String bestModel = resolveBestFastOllamaModel(installed);
                    return AIProviderInfoDTO.builder()
                            .id("ollama")
                            .name("Local Ollama AI")
                            .type("LOCAL_LLM")
                            .status("CONNECTED")
                            .statusMessage("Ollama Server Connected (" + installed.size() + " model(s) available)")
                            .available(true)
                            .serverUrl(baseUrl)
                            .models(installed)
                            .defaultModel(bestModel)
                            .build();
                } else {
                    return AIProviderInfoDTO.builder()
                            .id("ollama")
                            .name("Local Ollama AI")
                            .type("LOCAL_LLM")
                            .status("NO_MODELS")
                            .statusMessage("Ollama connected, but no models installed. Run: ollama pull qwen3:4b")
                            .available(false)
                            .serverUrl(baseUrl)
                            .models(List.of("qwen3:4b", "llama3.2:3b", "codellama"))
                            .defaultModel("qwen3:4b")
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

    private String resolveBestFastOllamaModel(List<String> installed) {
        if (installed == null || installed.isEmpty()) return "qwen3:4b";
        String[] preferredFast = {
                "qwen3:4b", "qwen3", "qwen2.5:3b", "qwen2.5:1.5b", "llama3.2:3b", "llama3.2:1b",
                "llama3.2:latest", "phi3:mini", "gemma2:2b", "codellama:latest", "codellama"
        };
        for (String pref : preferredFast) {
            for (String inst : installed) {
                if (inst.equalsIgnoreCase(pref) || inst.toLowerCase().startsWith(pref.toLowerCase())) {
                    return inst;
                }
            }
        }
        return installed.get(0);
    }

    private AIProviderInfoDTO checkGeminiHealth() {
        String key = aiConfig.getGemini().getApiKey();
        boolean hasKey = key != null && !key.isBlank() && !key.contains("${");
        String configuredModel = "gemini-2.0-flash";
        List<String> models = List.of("gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "auto");

        if (hasKey) {
            return AIProviderInfoDTO.builder()
                    .id("gemini")
                    .name("Google Gemini AI")
                    .type("CLOUD_LLM")
                    .status("CONNECTED")
                    .statusMessage("API Key configured on server (High-Speed Flash inference)")
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
                    .statusMessage("Enter your Gemini API key in UI for instant 2-second cloud ATS analysis")
                    .available(false)
                    .models(models)
                    .defaultModel(configuredModel)
                    .build();
        }
    }
}
