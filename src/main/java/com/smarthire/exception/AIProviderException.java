package com.smarthire.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when an AI provider (Gemini, Ollama) fails to process a prompt or returns an error.
 */
@ResponseStatus(HttpStatus.BAD_GATEWAY)
public class AIProviderException extends RuntimeException {

    public AIProviderException(String message) {
        super(message);
    }

    public AIProviderException(String message, Throwable cause) {
        super(message, cause);
    }
}
