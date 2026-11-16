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
    private volatile String lastSuccessfulModel = "gemini-auto";

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

    public GeminiAIProvider(AIConfiguration  config, ObjectMapper objectMapper) {
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
            throw new IllegalStateException("Gemini API key is not configured. Please enter your Gemini API key in the UI or set GEMINI_API_KEY environment variable.");
        }

        // Build fast candidate model list
        List<String> candidateModels = buildCandidateModelList(modelOverride, apiKey);
        log.info("Gemini candidate model sequence: {}", candidateModels);

        try {
            // 1. Build Payload
            Map<String, Object> requestPayload = new HashMap<>();
            if (systemInstruction != null && !systemInstruction.isBlank()) {
                Map<String, Object> sysInstr = new HashMap<>();
                List<Map<String, String>> sysParts = new ArrayList<>();
                sysParts.add(Map.of("text", systemInstruction));
                sysInstr.put("parts", sysParts);
                requestPayload.put("systemInstruction", sysInstr);
            }

            List<Map<String, Object>> contents = new ArrayList<>();
            Map<String, Object> contentMap = new HashMap<>();
            contentMap.put("role", "user");
            List<Map<String, String>> userParts = new ArrayList<>();
            userParts.add(Map.of("text", prompt));
            contentMap.put("parts", userParts);
            contents.add(contentMap);
            requestPayload.put("contents", contents);

            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("responseMimeType", "application/json");
            generationConfig.put("temperature", 0.1);
            requestPayload.put("generationConfig", generationConfig);

            String requestBodyJson = objectMapper.writeValueAsString(requestPayload);

            // 2. Iterate fast candidate models on standard v1beta endpoint (max 3 fast attempts)
            HttpResponse<String> lastErrorResponse = null;
            Exception lastException = null;
            int attempts = 0;

            for (String modelName : candidateModels) {
                if (attempts++ >= 3) break;
                String targetUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + apiKey;
                try {
                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create(targetUrl))
                            .header("Content-Type", "application/json")
                            .header("x-goog-api-key", apiKey)
                            .timeout(Duration.ofSeconds(12))
                            .POST(HttpRequest.BodyPublishers.ofString(requestBodyJson))
                            .build();

                    log.info("Contacting Gemini model: '{}' (attempt {}/3)...", modelName, attempts);
                    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                    if (response.statusCode() == 200) {
                        JsonNode root = objectMapper.readTree(response.body());
                        JsonNode candidates = root.path("candidates");
                        if (candidates.isArray() && !candidates.isEmpty()) {
                            JsonNode textNode = candidates.get(0).path("content").path("parts").get(0).path("text");
                            String rawText = textNode.asText();
                            this.lastSuccessfulModel = modelName;
                            log.info("SUCCESS: Received valid ATS analysis from Gemini model '{}'", modelName);
                            return cleanMarkdownCodeBlocks(rawText);
                        }
                    }

                    lastErrorResponse = response;
                    String body = response.body();

                    // If API key itself is invalid, no model will work; fail fast
                    if (response.statusCode() == 400 && body != null && body.contains("API_KEY_INVALID")) {
                        log.error("Gemini API key is invalid: {}", body);
                        throw new RuntimeException("Invalid Gemini API key provided. Please check your key at Google AI Studio.");
                    }

                    if (response.statusCode() == 403 && body != null && body.contains("PERMISSION_DENIED")) {
                        log.error("Gemini permission denied: {}", body);
                        throw new RuntimeException("Gemini permission denied: " + body);
                    }

                    log.warn("Gemini model '{}' returned status {} ({}). Trying next candidate...",
                            modelName, response.statusCode(), summarizeError(body));

                } catch (RuntimeException re) {
                    if (re.getMessage() != null && (re.getMessage().contains("Invalid Gemini API key") || re.getMessage().contains("permission denied"))) {
                        throw re;
                    }
                    lastException = re;
                } catch (Exception e) {
                    log.warn("Exception connecting to Gemini model '{}': {}. Trying next...", modelName, e.getMessage());
                    lastException = e;
                }
            }

            if (lastErrorResponse != null) {
                log.error("All Gemini models failed. Last status: {}, body: {}", lastErrorResponse.statusCode(), lastErrorResponse.body());
                throw new RuntimeException("Gemini API error " + lastErrorResponse.statusCode() + ": " + lastErrorResponse.body());
            }

            throw new RuntimeException("All Gemini models failed: " + (lastException != null ? lastException.getMessage() : "Unknown error"), lastException);

        } catch (RuntimeException re) {
            log.warn("Gemini execution failed: {}", re.getMessage());
            throw re;
        } catch (Exception e) {
            log.warn("Gemini execution failed: {}", e.getMessage());
            throw new RuntimeException("Gemini execution failed: " + e.getMessage(), e);
        }
    }

    /**
     * Builds an ordered list of candidate models:
     * 1. Explicit user request (if not "auto")
     * 2. Live models fetched from ListModels API for this key
     * 3. Comprehensive standard fallback models
     */
    private List<String> buildCandidateModelList(String requestedModel, String apiKey) {
        List<String> list = new ArrayList<>();

        // 1. If we already found a working model in this runtime, test it FIRST (0 retries)
        if (lastSuccessfulModel != null && !lastSuccessfulModel.isBlank() && !lastSuccessfulModel.contains("auto")) {
            list.add(lastSuccessfulModel);
        }

        // 2. Specific requested model
        if (requestedModel != null && !requestedModel.isBlank()
                && !requestedModel.equalsIgnoreCase("auto")
                && !requestedModel.equalsIgnoreCase("default")) {
            String clean = requestedModel.startsWith("models/") ? requestedModel.substring(7).trim() : requestedModel.trim();
            if (!list.contains(clean)) {
                list.add(clean);
            }
        }

        // 3. Ultra-fast standard production models (ordered by response latency)
        String[] standards = {
                "gemini-2.0-flash",
                "gemini-1.5-flash",
                "gemini-1.5-flash-8b",
                "gemini-1.5-pro"
        };

        for (String s : standards) {
            if (!list.contains(s)) {
                list.add(s);
            }
        }

        return list;
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
                log.info("Discovered {} active Gemini content models from Google for this key: {}", result.size(), result);
                modelCache.put(apiKey, new CachedModelList(result));
            }
        } catch (Exception e) {
            log.warn("Could not retrieve live models list from Google: {}", e.getMessage());
        }

        return result;
    }

    private String summarizeError(String body) {
        if (body == null || body.isBlank()) return "empty body";
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode msg = root.path("error").path("message");
            if (!msg.isMissingNode()) {
                return msg.asText();
            }
        } catch (Exception ignored) {}
        return body.length() > 100 ? body.substring(0, 100) + "..." : body;
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

    public String getLastSuccessfulModel() {
        return lastSuccessfulModel;
    }

    @Override
    public String getProviderName() {
        return "Google Gemini AI (" + lastSuccessfulModel + ")";
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
