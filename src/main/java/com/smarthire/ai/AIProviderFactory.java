package com.smarthire.ai;

import com.smarthire.config.AIConfiguration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AIProviderFactory {

    private final AIConfiguration aiConfig;
    private final GeminiAIProvider geminiProvider;
    private final OllamaAIProvider ollamaProvider;
    private final LocalDeterministicAIProvider localProvider;

    /**
     * Resolves the primary configured AI provider, falling back to Local Deterministic engine
     * if external AI is not configured or unavailable.
     */
    public AIProvider getProvider() {
        return getProvider(aiConfig.getProvider(), null);
    }

    public AIProvider getProvider(String providerName) {
        return getProvider(providerName, null);
    }

    /**
     * Resolves requested AI provider by name with failover to Local Deterministic provider,
     * taking into account an optional runtime API key override.
     */
    public AIProvider getProvider(String providerName, String apiKeyOverride) {
        if (providerName == null || providerName.isBlank()) {
            providerName = aiConfig.getProvider();
        }

        String name = providerName.trim().toLowerCase();
        log.info("Resolving AI Provider for name: {}", name);

        switch (name) {
            case "gemini":
                if (geminiProvider.isAvailable(apiKeyOverride)) {
                    return geminiProvider;
                }
                log.warn("Gemini AI is requested but unavailable (missing API key or network). Falling back to Local Deterministic Engine.");
                return localProvider;

            case "ollama":
                if (ollamaProvider.isAvailable()) {
                    return ollamaProvider;
                }
                log.warn("Ollama AI is requested but unavailable. Falling back to Local Deterministic Engine.");
                return localProvider;

            case "local":
            default:
                return localProvider;
        }
    }
}
