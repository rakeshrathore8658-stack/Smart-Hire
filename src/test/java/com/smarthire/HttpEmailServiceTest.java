package com.smarthire;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.service.HttpEmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class HttpEmailServiceTest {

    private HttpEmailService httpEmailService;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        httpEmailService = new HttpEmailService(objectMapper);
    }

    @Test
    void testValidation_MissingApiKey() {
        assertThrows(IllegalArgumentException.class, () -> {
            httpEmailService.sendViaBrevo("", "sender@gmail.com", "HR", "cand@gmail.com", "Candidate", "Test", "<p>Hi</p>");
        });

        assertThrows(IllegalArgumentException.class, () -> {
            httpEmailService.sendViaResend(null, "sender@gmail.com", "HR", "cand@gmail.com", "Test", "<p>Hi</p>");
        });
    }

    @Test
    void testValidation_MissingEmails() {
        assertThrows(IllegalArgumentException.class, () -> {
            httpEmailService.sendViaBrevo("xkeysib-test-key", "", "HR", "cand@gmail.com", "Candidate", "Test", "<p>Hi</p>");
        });

        assertThrows(IllegalArgumentException.class, () -> {
            httpEmailService.sendViaBrevo("xkeysib-test-key", "sender@gmail.com", "HR", "", "Candidate", "Test", "<p>Hi</p>");
        });
    }
}
