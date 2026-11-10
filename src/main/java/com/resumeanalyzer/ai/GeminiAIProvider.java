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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class GeminiAIProvider implements AIProvider {

    private static final Logger log = LoggerFactory.getLogger(GeminiAIProvider.class);

    private final AIConfiguration config;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

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

        String model = (modelOverride != null && !modelOverride.isBlank())
                ? modelOverride.trim()
                : config.getGemini().getModel();

        if (model == null || model.isBlank() || model.contains("3.8")) {
            model = "gemini-1.5-flash";
        }

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

            // Build list of candidate endpoints (v1 GA first, then v1beta, plus model fallback aliases if 404)
            List<String> candidateUrls = new ArrayList<>();
            candidateUrls.add("https://generativelanguage.googleapis.com/v1/models/" + model + ":generateContent?key=" + apiKey);
            candidateUrls.add("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey);

            if ("gemini-1.5-flash".equalsIgnoreCase(model)) {
                candidateUrls.add("https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=" + apiKey);
                candidateUrls.add("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey);
                candidateUrls.add("https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=" + apiKey);
                candidateUrls.add("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + apiKey);
            } else if ("gemini-2.0-flash".equalsIgnoreCase(model)) {
                candidateUrls.add("https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + apiKey);
                candidateUrls.add("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey);
            }

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
                        log.warn("Gemini endpoint 404 (not found) for {}. Trying fallback endpoint...", targetUrl.replaceAll("key=[^&]+", "key=REDACTED"));
                        // Continue to try the next candidate endpoint/model
                        continue;
                    } else {
                        // Other error (400, 401, 403, 429) -> report immediately
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

            if (lastResponse != null) {
                log.warn("All candidate Gemini endpoints failed. Last response (Status {}): {}", lastResponse.statusCode(), lastResponse.body());
                throw new RuntimeException("Gemini API error " + lastResponse.statusCode() + ": " + lastResponse.body());
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
