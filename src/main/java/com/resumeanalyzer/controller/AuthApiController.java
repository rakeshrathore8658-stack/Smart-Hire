package com.resumeanalyzer.controller;

import com.resumeanalyzer.dto.RegisterRequest;
import com.resumeanalyzer.entity.User;
import com.resumeanalyzer.repository.UserRepository;
import com.resumeanalyzer.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthApiController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    private Map<String, Object> mapUser(User user) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", user.getId());
        map.put("fullName", user.getFullName());
        map.put("email", user.getEmail());
        map.put("role", user.getRole() != null ? user.getRole().toUpperCase() : "USER");
        map.put("phoneNumber", user.getPhoneNumber());
        map.put("companyName", user.getCompanyName());
        map.put("careerRole", user.getCareerRole());
        map.put("themePreference", user.getThemePreference() != null ? user.getThemePreference() : "light");
        map.put("notifResumeScan", user.isNotifResumeScan());
        map.put("notifJobInsights", user.isNotifJobInsights());
        map.put("notifInterviewUpdates", user.isNotifInterviewUpdates());
        map.put("tourCompleted", user.isTourCompleted());
        map.put("tourSkipped", user.isTourSkipped());
        map.put("tourSeen", user.isTourSeen());
        map.put("tourLastStep", user.getTourLastStep());
        map.put("createdAt", user.getCreatedAt());
        return map;
    }

    private void establishSession(HttpServletRequest request, HttpServletResponse response, HttpSession session, User user, String activeRole) {
        if (session != null) {
            session.setMaxInactiveInterval(30 * 24 * 60 * 60);
            session.setAttribute("userRole", activeRole);
            session.setAttribute("userName", user.getFullName());
            session.setAttribute("userEmail", user.getEmail());
            session.setAttribute("phoneNumber", user.getPhoneNumber());
            session.setAttribute("theme", user.getThemePreference() != null ? user.getThemePreference() : "light");
            if (user.getCompanyName() != null) session.setAttribute("companyName", user.getCompanyName());
            if (user.getCareerRole() != null) session.setAttribute("careerRole", user.getCareerRole());
        }

        String authority = activeRole.startsWith("ROLE_") ? activeRole : "ROLE_" + activeRole;
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                user.getEmail(),
                "PROTECTED_CREDENTIALS",
                Collections.singletonList(new SimpleGrantedAuthority(authority))
        );

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        if (session != null) {
            session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        }
        if (request != null && response != null) {
            securityContextRepository.saveContext(context, request, response);
        }
    }

    @RequestMapping(value = "/login", method = {RequestMethod.POST, RequestMethod.OPTIONS})
    public ResponseEntity<?> login(
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest request,
            HttpServletResponse response,
            HttpSession session
    ) {
        // Handle preflight OPTIONS smoothly
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return ResponseEntity.ok().build();
        }

        if (body == null) {
            body = Collections.emptyMap();
        }
        String email = body.get("email") != null ? body.get("email").trim().toLowerCase() : "";
        if (email.isBlank() && body.get("username") != null) {
            email = body.get("username").trim().toLowerCase();
        }
        String password = body.get("password");
        String requestedRole = body.get("role") != null ? body.get("role").trim().toUpperCase() : "USER";
        if ("RECRUITER".equals(requestedRole)) requestedRole = "HR";

        if (email.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Email and password are required."
            ));
        }

        Optional<User> userOpt = authService.authenticate(email, password);
        if (userOpt.isEmpty()) {
            Optional<User> existing = authService.findByEmail(email);
            if (existing.isPresent()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "success", false,
                        "message", "Invalid email or password."
                ));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                        "success", false,
                        "message", "No account registered with this email address."
                ));
            }
        }

        User user = userOpt.get();
        String userDbRole = user.getRole() != null ? user.getRole().trim().toUpperCase() : "USER";
        if ("RECRUITER".equals(userDbRole)) userDbRole = "HR";

        if (!userDbRole.equalsIgnoreCase(requestedRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "Role mismatch: This account is registered as " + userDbRole + ", please select " + userDbRole + " portal."
            ));
        }

        establishSession(request, response, session, user, userDbRole);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Login successful",
                "user", mapUser(user)
        ));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestBody RegisterRequest registerRequest,
            HttpServletRequest request,
            HttpServletResponse response,
            HttpSession session
    ) {
        try {
            User registered = authService.register(registerRequest);
            String role = registered.getRole() != null ? registered.getRole().toUpperCase() : "USER";
            establishSession(request, response, session, registered, role);

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "success", true,
                    "message", "Account registered successfully",
                    "user", mapUser(registered)
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Error during registration", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Registration failed: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(HttpSession session) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = null;
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken) && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
            email = auth.getName();
        } else if (session != null && session.getAttribute("userEmail") != null) {
            email = (String) session.getAttribute("userEmail");
        }

        if (email == null || email.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "authenticated", false,
                    "message", "No active session."
            ));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim().toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "authenticated", false,
                    "message", "User not found."
            ));
        }

        User user = userOpt.get();
        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "user", mapUser(user)
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        HttpSession session = request != null ? request.getSession(false) : null;
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Logged out successfully"
        ));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String newPassword = body.get("newPassword");
        String confirmPassword = body.get("confirmPassword");

        if (email == null || email.isBlank() || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Email and new password are required."
            ));
        }

        if (confirmPassword != null && !newPassword.equals(confirmPassword)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Passwords do not match."
            ));
        }

        boolean reset = authService.resetPassword(email.trim().toLowerCase(), newPassword);
        if (reset) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Password reset successfully. You can now login with your new password."
            ));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "message", "No account registered with email: " + email
            ));
        }
    }
}
