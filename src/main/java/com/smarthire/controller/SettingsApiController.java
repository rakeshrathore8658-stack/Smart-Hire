package com.smarthire.controller;

import com.smarthire.entity.User;
import com.smarthire.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@Slf4j
public class SettingsApiController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

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
    public ResponseEntity<?> getSettings() {
        User user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User not logged in"));
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", user.getId());
        data.put("fullName", user.getFullName());
        data.put("email", user.getEmail());
        data.put("role", user.getRole());
        data.put("phoneNumber", user.getPhoneNumber());
        data.put("companyName", user.getCompanyName());
        data.put("careerRole", user.getCareerRole());
        data.put("themePreference", user.getThemePreference() != null ? user.getThemePreference() : "light");
        data.put("notifResumeScan", user.isNotifResumeScan());
        data.put("notifJobInsights", user.isNotifJobInsights());
        data.put("notifInterviewUpdates", user.isNotifInterviewUpdates());

        return ResponseEntity.ok(data);
    }

    @PostMapping("/preferences")
    public ResponseEntity<?> updatePreferences(@RequestBody Map<String, Object> body, HttpSession session) {
        User user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User not logged in"));
        }

        if (body.containsKey("themeChoice")) {
            String theme = (String) body.get("themeChoice");
            user.setThemePreference("dark".equalsIgnoreCase(theme) ? "dark" : "light");
            if (session != null) session.setAttribute("theme", user.getThemePreference());
        }

        if (body.containsKey("notifResumeScan")) {
            user.setNotifResumeScan(Boolean.TRUE.equals(body.get("notifResumeScan")));
        }
        if (body.containsKey("notifJobInsights")) {
            user.setNotifJobInsights(Boolean.TRUE.equals(body.get("notifJobInsights")));
        }
        if (body.containsKey("notifInterviewUpdates")) {
            user.setNotifInterviewUpdates(Boolean.TRUE.equals(body.get("notifInterviewUpdates")));
        }

        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Preferences saved successfully",
                "themePreference", user.getThemePreference(),
                "notifResumeScan", user.isNotifResumeScan(),
                "notifJobInsights", user.isNotifJobInsights(),
                "notifInterviewUpdates", user.isNotifInterviewUpdates()
        ));
    }

    @PostMapping("/theme")
    public ResponseEntity<?> updateTheme(@RequestParam(value = "theme", required = false) String paramTheme,
                                         @RequestBody(required = false) Map<String, String> body,
                                         HttpSession session) {
        String theme = (paramTheme != null) ? paramTheme : (body != null ? body.get("theme") : null);
        if (theme == null || (!theme.equalsIgnoreCase("dark") && !theme.equalsIgnoreCase("light"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Theme must be 'light' or 'dark'"));
        }

        String validTheme = theme.equalsIgnoreCase("dark") ? "dark" : "light";
        User user = getAuthenticatedUser();
        if (user != null) {
            user.setThemePreference(validTheme);
            userRepository.save(user);
        }
        if (session != null) {
            session.setAttribute("theme", validTheme);
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "theme", validTheme
        ));
    }

    @PostMapping("/password")
    public ResponseEntity<?> updatePassword(@RequestBody Map<String, String> body) {
        User user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User not logged in"));
        }

        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");
        String confirmPassword = body.get("confirmPassword");

        if (currentPassword == null || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Current and new password are required."));
        }

        if (confirmPassword != null && !newPassword.equals(confirmPassword)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "New password and confirmation do not match."));
        }

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Incorrect current password."));
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true, "message", "Password updated successfully."));
    }

    @PostMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> body, HttpSession session) {
        User user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User not logged in"));
        }

        if (body.get("fullName") != null && !body.get("fullName").isBlank()) {
            user.setFullName(body.get("fullName").trim());
            if (session != null) session.setAttribute("userName", user.getFullName());
        }
        if (body.get("phoneNumber") != null) {
            user.setPhoneNumber(body.get("phoneNumber").trim());
            if (session != null) session.setAttribute("phoneNumber", user.getPhoneNumber());
        }
        if (body.get("companyName") != null) {
            user.setCompanyName(body.get("companyName").trim());
            if (session != null) session.setAttribute("companyName", user.getCompanyName());
        }
        if (body.get("careerRole") != null) {
            user.setCareerRole(body.get("careerRole").trim());
            if (session != null) session.setAttribute("careerRole", user.getCareerRole());
        }

        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Profile updated successfully.",
                "user", Map.of(
                        "fullName", user.getFullName(),
                        "email", user.getEmail(),
                        "phoneNumber", user.getPhoneNumber() != null ? user.getPhoneNumber() : "",
                        "companyName", user.getCompanyName() != null ? user.getCompanyName() : "",
                        "careerRole", user.getCareerRole() != null ? user.getCareerRole() : ""
                )
        ));
    }
}
