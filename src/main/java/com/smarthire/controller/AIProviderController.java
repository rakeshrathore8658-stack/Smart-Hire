package com.smarthire.controller;

import com.smarthire.service.AIProviderHealthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/ai", "/api/ai/providers"})
@RequiredArgsConstructor
public class AIProviderController {

    private final AIProviderHealthService healthService;

    @GetMapping({"", "/health", "/models"})
    public ResponseEntity<?> getProvidersHealth() {
        return ResponseEntity.ok(healthService.getProvidersHealth());
    }
}
