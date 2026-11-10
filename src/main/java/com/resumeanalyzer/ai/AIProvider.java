package com.resumeanalyzer.ai;

public interface AIProvider {

    /**
     * Executes AI prompt with system instructions and returns strict JSON response.
     *
     * @param prompt            Constructed analysis prompt containing resume and role details
     * @param systemInstruction System role instructions (ATS analyzer persona)
     * @return Raw JSON response from AI provider
     */
    String analyze(String prompt, String systemInstruction);

    /**
     * Executes AI prompt with an optional API key override passed per-request.
     */
    default String analyze(String prompt, String systemInstruction, String apiKeyOverride) {
        return analyze(prompt, systemInstruction);
    }

    /**
     * Executes AI prompt with optional API key and model override passed per-request.
     */
    default String analyze(String prompt, String systemInstruction, String apiKeyOverride, String modelOverride) {
        return analyze(prompt, systemInstruction, apiKeyOverride);
    }

    /**
     * @return Friendly provider identifier ("gemini", "ollama", "local")
     */
    String getProviderName();

    /**
     * @return True if this provider is reachable and operational
     */
    boolean isAvailable();

    /**
     * @return True if this provider is available with the given API key override
     */
    default boolean isAvailable(String apiKeyOverride) {
        if (apiKeyOverride != null && !apiKeyOverride.isBlank()) {
            return true;
        }
        return isAvailable();
    }
}
