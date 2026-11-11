package com.smarthire.controller;

import com.smarthire.entity.User;
import com.smarthire.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping({"/api/user/onboarding", "/api/settings/onboarding"})
@RequiredArgsConstructor
@Slf4j
public class OnboardingApiController {

    private final UserRepository userRepository;

    private User getAuthenticatedUser() {
        String email = null;
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken) && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
                email = auth.getName();
            }
        } catch (Exception ignored) {}

        if (email == null) {
            try {
                ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attrs != null && attrs.getRequest() != null && attrs.getRequest().getSession(false) != null) {
                    email = (String) attrs.getRequest().getSession(false).getAttribute("userEmail");
                }
            } catch (Exception ignored) {}
        }

        if (email != null && !email.isBlank()) {
            return userRepository.findByEmail(email.trim().toLowerCase()).orElse(null);
        }
        return null;
    }

    @GetMapping
    public ResponseEntity<?> getOnboardingStatus() {
        User user = getAuthenticatedUser();
        if (user == null) {
            // Return safe anonymous default
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "tourCompleted", false,
                    "tourSkipped", false,
                    "tourSeen", false,
                    "tourLastStep", 0,
                    "userRole", "GUEST"
            ));
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("tourCompleted", user.isTourCompleted());
        resp.put("tourSkipped", user.isTourSkipped());
        resp.put("tourSeen", user.isTourSeen());
        resp.put("tourLastStep", user.getTourLastStep());
        resp.put("userRole", user.getRole());
        resp.put("userId", user.getId());

        return ResponseEntity.ok(resp);
    }

    @PutMapping
    public ResponseEntity<?> updateOnboardingStatusPut(@RequestBody(required = false) Map<String, Object> payload) {
        return handleUpdate(payload);
    }

    @PostMapping
    public ResponseEntity<?> updateOnboardingStatusPost(@RequestBody(required = false) Map<String, Object> payload) {
        return handleUpdate(payload);
    }

    private ResponseEntity<?> handleUpdate(Map<String, Object> payload) {
        User user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("success", false, "message", "User not authenticated"));
        }

        if (payload != null) {
            if (payload.containsKey("tourCompleted")) {
                user.setTourCompleted(Boolean.TRUE.equals(payload.get("tourCompleted")));
            }
            if (payload.containsKey("tourSkipped")) {
                user.setTourSkipped(Boolean.TRUE.equals(payload.get("tourSkipped")));
            }
            if (payload.containsKey("tourSeen")) {
                user.setTourSeen(Boolean.TRUE.equals(payload.get("tourSeen")));
            }
            if (payload.containsKey("tourLastStep") && payload.get("tourLastStep") instanceof Number num) {
                user.setTourLastStep(num.intValue());
            }
            userRepository.save(user);
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("message", "Onboarding preferences updated successfully");
        resp.put("tourCompleted", user.isTourCompleted());
        resp.put("tourSkipped", user.isTourSkipped());
        resp.put("tourSeen", user.isTourSeen());
        resp.put("tourLastStep", user.getTourLastStep());
        resp.put("userRole", user.getRole());

        return ResponseEntity.ok(resp);
    }

    @PostMapping("/reset")
    public ResponseEntity<?> resetOnboarding() {
        User user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("success", false, "message", "User not authenticated"));
        }

        user.setTourCompleted(false);
        user.setTourSkipped(false);
        user.setTourSeen(false);
        user.setTourLastStep(0);
        userRepository.save(user);

        log.info("Reset onboarding walkthrough status for user: {}", user.getEmail());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Onboarding tour progress reset successfully. User will see the guided walkthrough on next visit.",
                "tourCompleted", false,
                "tourSkipped", false,
                "tourSeen", false,
                "tourLastStep", 0
        ));
    }
}
