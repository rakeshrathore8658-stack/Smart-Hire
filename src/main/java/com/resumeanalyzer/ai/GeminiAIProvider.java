package com.resumeanalyzer.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resumeanalyzer.config.AIConfiguration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GeminiAIProvider implements AIProvider {

    private static final Logger log = LoggerFactory.getLogger(GeminiAIProvider.class);

    private final AIConfiguration config;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    // Cache of active models per API key: Map<apiKey, CachedModelList>
    private final Map<String, CachedModelList> modelCache = new ConcurrentHashMap<>();

    private static class CachedModelList {
        final List<String> models;
        final long createdAt;

        CachedModelList(List<String> models) {
            this.models = models;
            this.createdAt = System.currentTimeMillis();
        }

        boolean isValid() {
            return (System.currentTimeMillis() - createdAt) < 600_000; // 10 minutes cache
        }
    }

    public GeminiAIProvider(AIConfiguration config, ObjectMapper objectMapper) {
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
        String apiKey = (apiKeyOverride != null && !apiKeyOverride.isBlank())
                ? apiKeyOverride.trim()
                : config.getGemini().getApiKey();

        if (apiKey == null || apiKey.isBlank() || apiKey.contains("${")) {
            throw new IllegalStateException("Gemini API key is not configured. Please provide a valid Gemini API key in the UI or set GEMINI_API_KEY environment variable.");
        }

        // Dynamically discover active models for this API key so 404 is completely avoided
        String targetModel = resolveActiveModel(modelOverride, apiKey);
        log.info("Resolved Gemini model to execute: '{}' (requested: '{}')", targetModel, modelOverride);

        try {
            // 1. System Instruction
            Map<String, Object> requestPayload = new HashMap<>();
            if (systemInstruction != null && !systemInstruction.isBlank()) {
                Map<String, Object> sysInstr = new HashMap<>();
                List<Map<String, String>> sysParts = new ArrayList<>();
                sysParts.add(Map.of("text", systemInstruction));
                sysInstr.put("parts", sysParts);
                requestPayload.put("systemInstruction", sysInstr);
            }

            // 2. User Content Prompt
            List<Map<String, Object>> contents = new ArrayList<>();
            Map<String, Object> contentMap = new HashMap<>();
            contentMap.put("role", "user");
            List<Map<String, String>> userParts = new ArrayList<>();
            userParts.add(Map.of("text", prompt));
            contentMap.put("parts", userParts);
            contents.add(contentMap);
            requestPayload.put("contents", contents);

            // 3. Generation Config (force JSON mode)
            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("responseMimeType", "application/json");
            generationConfig.put("temperature", 0.2);
            requestPayload.put("generationConfig", generationConfig);

            String requestBodyJson = objectMapper.writeValueAsString(requestPayload);

            // Build candidate URLs with v1beta and v1, prioritizing resolved target model
            List<String> candidateUrls = new ArrayList<>();
            candidateUrls.add("https://generativelanguage.googleapis.com/v1beta/models/" + targetModel + ":generateContent?key=" + apiKey);
            candidateUrls.add("https://generativelanguage.googleapis.com/v1/models/" + targetModel + ":generateContent?key=" + apiKey);

            // Fallback models in case primary resolved target encounters unexpected 404
            String[] fallbacks = {"gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-2.5-pro", "gemini-1.5-pro"};
            for (String fb : fallbacks) {
                if (!fb.equalsIgnoreCase(targetModel)) {
                    candidateUrls.add("https://generativelanguage.googleapis.com/v1beta/models/" + fb + ":generateContent?key=" + apiKey);
                    candidateUrls.add("https://generativelanguage.googleapis.com/v1/models/" + fb + ":generateContent?key=" + apiKey);
                }
            }

            HttpResponse<String> primaryResponse = null;
            HttpResponse<String> lastResponse = null;
            Exception lastException = null;

            for (String targetUrl : candidateUrls) {
                try {
                    URI uri = URI.create(targetUrl);
                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(uri)
                            .header("Content-Type", "application/json")
                            .header("x-goog-api-key", apiKey)
                            .timeout(Duration.ofSeconds(config.getGemini().getTimeoutSeconds()))
                            .POST(HttpRequest.BodyPublishers.ofString(requestBodyJson))
                            .build();

                    log.info("Sending resume analysis request to Gemini URL: {}", targetUrl.replaceAll("key=[^&]+", "key=REDACTED"));
                    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                    if (primaryResponse == null) {
                        primaryResponse = response;
                    }
                    lastResponse = response;

                    if (response.statusCode() == 200) {
                        JsonNode root = objectMapper.readTree(response.body());
                        JsonNode candidates = root.path("candidates");
                        if (candidates.isArray() && !candidates.isEmpty()) {
                            JsonNode textNode = candidates.get(0).path("content").path("parts").get(0).path("text");
                            String rawText = textNode.asText();
                            return cleanMarkdownCodeBlocks(rawText);
                        }
                        throw new RuntimeException("Unexpected Gemini response structure: " + response.body());
                    } else if (response.statusCode() == 404) {
                        log.warn("Gemini endpoint 404 for {}. Trying next fallback candidate...", targetUrl.replaceAll("key=[^&]+", "key=REDACTED"));
                        continue;
                    } else {
                        // 400, 401, 403, 429 error -> fail fast with Google's clear message
                        log.warn("Gemini API error (Status {}): {}", response.statusCode(), response.body());
                        throw new RuntimeException("Gemini API error " + response.statusCode() + ": " + response.body());
                    }
                } catch (RuntimeException re) {
                    if (re.getMessage() != null && re.getMessage().contains("Gemini API error")) {
                        throw re;
                    }
                    lastException = re;
                } catch (Exception e) {
                    lastException = e;
                }
            }

            HttpResponse<String> errResp = (primaryResponse != null) ? primaryResponse : lastResponse;
            if (errResp != null) {
                log.warn("All candidate Gemini endpoints failed. Status: {}, Body: {}", errResp.statusCode(), errResp.body());
                throw new RuntimeException("Gemini API error " + errResp.statusCode() + ": " + errResp.body());
            }

            throw new RuntimeException("Gemini execution failed: " + (lastException != null ? lastException.getMessage() : "Unknown error"), lastException);

        } catch (RuntimeException re) {
            log.warn("Gemini execution failed: {}", re.getMessage());
            throw re;
        } catch (Exception e) {
            log.warn("Gemini execution failed: {}", e.getMessage());
            throw new RuntimeException("Gemini execution failed: " + e.getMessage(), e);
        }
    }

    /**
     * Queries Google's ModelService.ListModels endpoint to fetch all active models supporting generateContent
     * for this specific API key. Prevents 404 errors caused by deprecated model strings.
     */
    private String resolveActiveModel(String requestedModel, String apiKey) {
        String cleanRequested = (requestedModel != null && !requestedModel.isBlank())
                ? (requestedModel.startsWith("models/") ? requestedModel.substring(7).trim() : requestedModel.trim())
                : null;

        List<String> activeModels = getActiveContentModels(apiKey);

        if (!activeModels.isEmpty()) {
            // 1. If requested model is found in active models, use it directly
            if (cleanRequested != null) {
                for (String m : activeModels) {
                    if (m.equalsIgnoreCase(cleanRequested)) {
                        return m;
                    }
                }
            }

            // 2. Select preferred modern active model
            String[] preferredOrder = {
                    "gemini-2.5-flash",
                    "gemini-2.0-flash",
                    "gemini-1.5-flash-latest",
                    "gemini-1.5-flash",
                    "gemini-2.5-pro",
                    "gemini-1.5-pro"
            };

            for (String pref : preferredOrder) {
                for (String m : activeModels) {
                    if (m.equalsIgnoreCase(pref)) {
                        return m;
                    }
                }
            }

            // 3. Fallback to any model containing "flash"
            for (String m : activeModels) {
                if (m.toLowerCase().contains("flash")) {
                    return m;
                }
            }

            // 4. Fallback to first available model
            return activeModels.get(0);
        }

        // If ListModels could not be retrieved, fall back to clean requested or default
        if (cleanRequested != null && !cleanRequested.isBlank()) {
            return cleanRequested;
        }
        String configModel = config.getGemini().getModel();
        return (configModel != null && !configModel.isBlank()) ? configModel : "gemini-2.5-flash";
    }

    private List<String> getActiveContentModels(String apiKey) {
        CachedModelList cached = modelCache.get(apiKey);
        if (cached != null && cached.isValid()) {
            return cached.models;
        }

        List<String> result = new ArrayList<>();
        try {
            String listUrl = "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(listUrl))
                    .header("x-goog-api-key", apiKey)
                    .timeout(Duration.ofSeconds(6))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode modelsNode = root.path("models");
                if (modelsNode.isArray()) {
                    for (JsonNode m : modelsNode) {
                        JsonNode methods = m.path("supportedGenerationMethods");
                        boolean supportsGenerate = false;
                        if (methods.isArray()) {
                            for (JsonNode method : methods) {
                                if ("generateContent".equalsIgnoreCase(method.asText())) {
                                    supportsGenerate = true;
                                    break;
                                }
                            }
                        }
                        if (supportsGenerate) {
                            String name = m.path("name").asText();
                            if (name.startsWith("models/")) {
                                name = name.substring(7);
                            }
                            result.add(name);
                        }
                    }
                }
                log.info("Retrieved {} active Gemini content models from Google API for current key: {}", result.size(), result);
                modelCache.put(apiKey, new CachedModelList(result));
            } else {
                log.warn("Gemini ListModels returned status {}: {}", response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("Unable to query Gemini ModelService.ListModels: {}", e.getMessage());
        }

        return result;
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
        return "gemini (" + config.getGemini().getModel() + ")";
    }

    @Override
    public boolean isAvailable() {
        return isAvailable(null);
    }

    @Override
    public boolean isAvailable(String apiKeyOverride) {
        String key = (apiKeyOverride != null && !apiKeyOverride.isBlank())
                ? apiKeyOverride.trim()
                : config.getGemini().getApiKey();
        return key != null && !key.isBlank() && !key.contains("${");
    }
}
