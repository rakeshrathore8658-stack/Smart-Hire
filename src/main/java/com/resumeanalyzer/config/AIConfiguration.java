package com.resumeanalyzer.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "ai")
@Data
public class AIConfiguration {

    /**
     * Primary AI Provider: "local", "gemini", or "ollama"
     */
    private String provider = "local";

    private OllamaProperties ollama = new OllamaProperties();
    private GeminiProperties gemini = new GeminiProperties();

    @Data
    public static class OllamaProperties {
        private String baseUrl = "http://localhost:11434";
        private String model = "codellama";
        private int timeoutSeconds = 60;
    }

    @Data
    public static class GeminiProperties {
        private String apiKey = "";
        private String model = "gemini-2.5-flash";
        private int timeoutSeconds = 45;
    }
}
