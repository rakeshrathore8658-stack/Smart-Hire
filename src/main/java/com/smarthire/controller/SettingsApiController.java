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
    private final com.smarthire.security.jwt.JwtUtil jwtUtil;

    private User getAuthenticatedUser() {
        String email = null;
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null && attrs.getRequest() != null) {
                jakarta.servlet.http.HttpServletRequest req = attrs.getRequest();

                // 1. Extract from X-User-Email custom header (explicit active account from frontend request)
                String h = req.getHeader("X-User-Email");
                if (h != null && !h.isBlank()) {
                    email = h.trim().toLowerCase();
                }

                // 2. Extract from Authorization Bearer JWT Token
                if (email == null || email.isBlank()) {
                    String authHeader = req.getHeader("Authorization");
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        String token = authHeader.substring(7).trim();
                        try {
                            if (jwtUtil.validateToken(token)) {
                                email = jwtUtil.extractEmail(token);
                            }
                        } catch (Exception ignored) {}
                    }
                }

                // 3. Extract from cookies
                if ((email == null || email.isBlank()) && req.getCookies() != null) {
                    for (jakarta.servlet.http.Cookie c : req.getCookies()) {
                        if ("smarthire_user_email".equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
                            email = c.getValue().trim().toLowerCase();
                            break;
                        }
                    }
                }

                // 4. Extract from Spring Security Authentication
                if (email == null || email.isBlank()) {
                    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                    if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken) && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
                        email = auth.getName();
                    }
                }

                // 5. Extract from Session
                if ((email == null || email.isBlank()) && req.getSession(false) != null) {
                    email = (String) req.getSession(false).getAttribute("userEmail");
                }
            }
        } catch (Exception ignored) {}

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
        data.put("location", user.getLocation() != null ? user.getLocation() : "");
        data.put("headline", user.getHeadline() != null ? user.getHeadline() : "");
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
        if (body.get("location") != null) {
            user.setLocation(body.get("location").trim());
        }
        if (body.get("headline") != null) {
            user.setHeadline(body.get("headline").trim());
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
                        "careerRole", user.getCareerRole() != null ? user.getCareerRole() : "",
                        "location", user.getLocation() != null ? user.getLocation() : "",
                        "headline", user.getHeadline() != null ? user.getHeadline() : ""
                )
        ));
    }

    /**
     * Production-ready self-service account role switcher.
     * Allows switching between Job Seeker (USER) and Recruiter (HR) portals.
     */
    @PostMapping("/switch-role")
    public ResponseEntity<?> switchRole(
            @RequestBody(required = false) Map<String, String> body,
            HttpSession session,
            jakarta.servlet.http.HttpServletResponse response) {

        String targetUserEmail = null;
        if (body != null && body.containsKey("email") && body.get("email") != null && !body.get("email").isBlank()) {
            targetUserEmail = body.get("email").trim().toLowerCase();
        }

        User user = null;
        if (targetUserEmail != null) {
            user = userRepository.findByEmail(targetUserEmail).orElse(null);
        }

        if (user == null) {
            user = getAuthenticatedUser();
        }

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "success", false,
                    "message", "Authentication required to switch account role."
            ));
        }

        log.info("Switching role strictly for target User ID: {}, Email: {}", user.getId(), user.getEmail());

        String currentRole = user.getRole() != null ? user.getRole().trim().toUpperCase() : "USER";
        if ("RECRUITER".equals(currentRole)) currentRole = "HR";

        String targetRole = (body != null && body.containsKey("targetRole") && body.get("targetRole") != null && !body.get("targetRole").isBlank())
                ? body.get("targetRole").trim().toUpperCase()
                : ("HR".equals(currentRole) ? "USER" : "HR");
        if ("RECRUITER".equals(targetRole)) targetRole = "HR";

        user.setRole(targetRole);
        if ("HR".equals(targetRole)) {
            user.setCareerRole("HR / Recruiter");
        } else {
            user.setCareerRole("Job Seeker");
        }

        userRepository.save(user);

        // Update SecurityContext with new ROLE authority
        org.springframework.security.core.authority.SimpleGrantedAuthority authority =
                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + targetRole);
        org.springframework.security.authentication.UsernamePasswordAuthenticationToken newAuth =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        user.getEmail(), null, java.util.Collections.singletonList(authority));
        SecurityContextHolder.getContext().setAuthentication(newAuth);

        // Update HTTP session
        if (session != null) {
            session.setAttribute("userRole", targetRole);
            session.setAttribute("careerRole", user.getCareerRole());
            session.setAttribute(
                    org.springframework.security.web.context.HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                    SecurityContextHolder.getContext()
            );
        }

        // Generate updated JWT token reflecting new role
        String newToken = jwtUtil.generateToken(user);

        // Update cookie if response is available
        if (response != null) {
            jakarta.servlet.http.Cookie roleCookie = new jakarta.servlet.http.Cookie("smarthire_user_role", targetRole);
            roleCookie.setPath("/");
            roleCookie.setMaxAge(30 * 24 * 60 * 60);
            response.addCookie(roleCookie);

            jakarta.servlet.http.Cookie tokenCookie = new jakarta.servlet.http.Cookie("token", newToken);
            tokenCookie.setPath("/");
            tokenCookie.setMaxAge(30 * 24 * 60 * 60);
            response.addCookie(tokenCookie);
        }

        String redirectUrl = "HR".equals(targetRole) ? "/dashboard/hr" : "/dashboard";

        log.info("User {} successfully switched role from {} to {}", user.getEmail(), currentRole, targetRole);

        Map<String, Object> userData = new LinkedHashMap<>();
        userData.put("id", user.getId());
        userData.put("fullName", user.getFullName());
        userData.put("email", user.getEmail());
        userData.put("role", targetRole);
        userData.put("careerRole", user.getCareerRole());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Account successfully switched to " + ("HR".equals(targetRole) ? "Recruiter / HR" : "Job Seeker") + " portal.",
                "targetRole", targetRole,
                "token", newToken,
                "redirectUrl", redirectUrl,
                "user", userData
        ));
    }
}
