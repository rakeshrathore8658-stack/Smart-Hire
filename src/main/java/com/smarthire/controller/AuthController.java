package com.smarthire.controller;

import com.smarthire.dto.RegisterRequest;
import com.smarthire.entity.User;
import com.smarthire.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Collections;
import java.util.Optional;

/**
 * Controller handling user authentication, role-based registration,
 * session establishment, and password reset flows.
 */
@Controller
public class AuthController {

    private final AuthService authService;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Safe HTTP 302 redirect helper returning ResponseEntity<Void> with Location header.
     * Avoids Tomcat / Servlet AbstractMethodError on sendRedirect while preventing
     * Spring MVC from falling back to default view name translation.
     */
    private ResponseEntity<Void> redirectTo(String targetUrl) {
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, targetUrl)
                .build();
    }

    private void establishUserSession(HttpServletRequest request, HttpServletResponse response, HttpSession session, User user, String activeRole) {
        if (session != null) {
            session.setMaxInactiveInterval(30 * 24 * 60 * 60); // 30 days session persistence
            session.setAttribute("userRole", activeRole);
            session.setAttribute("userName", user.getFullName());
            session.setAttribute("userEmail", user.getEmail());
            session.setAttribute("phoneNumber", user.getPhoneNumber());
            session.setAttribute("theme", (user.getThemePreference() != null && !user.getThemePreference().isBlank()) ? user.getThemePreference() : "light");
            if (user.getCompanyName() != null) {
                session.setAttribute("companyName", user.getCompanyName());
            }
            if (user.getCareerRole() != null) {
                session.setAttribute("careerRole", user.getCareerRole());
            }
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

    // ==========================================
    // 1. LOGIN FLOW
    // ==========================================

    @GetMapping("/login")
    public String showLoginPage(
            HttpServletRequest request,
            @RequestParam(value = "role", required = false) String role,
            @RequestParam(value = "error", required = false) String error,
            @RequestParam(value = "logout", required = false) String logout,
            @RequestParam(value = "reset", required = false) String reset,
            Model model) {

        if (request != null) {
            request.getSession(true);
        }

        String targetRole = (role != null && !role.isBlank()) ? role.trim().toUpperCase() : "USER";
        model.addAttribute("selectedRole", targetRole);

        return "login";
    }

    @PostMapping("/login")
    public ResponseEntity<Void> handleLogin(
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "password", required = false) String password,
            @RequestParam(value = "role", defaultValue = "USER") String selectedRole,
            HttpServletRequest request,
            HttpServletResponse response,
            HttpSession session,
            RedirectAttributes redirectAttributes) {

        if (selectedRole != null && selectedRole.contains(",")) {
            String[] parts = selectedRole.split(",");
            selectedRole = parts[parts.length - 1].trim();
        }
        if (username != null && username.contains(",")) {
            String[] parts = username.split(",");
            username = parts[parts.length - 1].trim();
        }

        String email = (username != null) ? username.trim().toLowerCase() : "";
        String activeRole = "HR".equalsIgnoreCase(selectedRole) ? "HR" : "USER";

        if (email.isBlank() || password == null || password.isBlank()) {
            return redirectTo("/login?error=invalid_credentials&role=" + activeRole + "&username=" + email);
        }

        // 1. Authenticate against database
        Optional<User> userOpt = authService.authenticate(email, password);

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            // STRICT ROLE / PORTAL VALIDATION
            String dbRole = (user.getRole() != null && !user.getRole().isBlank())
                    ? user.getRole().trim().toUpperCase()
                    : "USER";
            if ("RECRUITER".equals(dbRole)) dbRole = "HR";

            if (!dbRole.equalsIgnoreCase(activeRole)) {
                // Portal mismatch: User registered as HR trying to log into Job Seeker, or vice-versa
                return redirectTo("/login?error=portal_mismatch&role=" + activeRole + "&username=" + email);
            }

            // Authentication succeeded and portal role matches!
            establishUserSession(request, response, session, user, activeRole);
            return redirectTo("/dashboard");
        }

        // 2. If password check failed, check if account exists by email
        Optional<User> existingUser = authService.findByEmail(email);
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            String dbRole = (user.getRole() != null && !user.getRole().isBlank())
                    ? user.getRole().trim().toUpperCase()
                    : "USER";
            if ("RECRUITER".equals(dbRole)) dbRole = "HR";

            if (!dbRole.equalsIgnoreCase(activeRole)) {
                return redirectTo("/login?error=portal_mismatch&role=" + activeRole + "&username=" + email);
            }

            return redirectTo("/login?error=invalid_credentials&role=" + activeRole + "&username=" + email);
        }

        // 3. Account not found
        return redirectTo("/login?error=user_not_found&role=" + activeRole + "&username=" + email);
    }

    // ==========================================
    // 2. REGISTRATION FLOW
    // ==========================================

    @GetMapping("/register")
    public String showRegisterPage(
            HttpServletRequest request,
            @RequestParam(value = "role", required = false) String role,
            Model model) {

        if (request != null) {
            request.getSession(true);
        }

        String targetRole = (role != null && !role.isBlank()) ? role.trim().toUpperCase() : "USER";
        model.addAttribute("selectedRole", targetRole);
        model.addAttribute("registerRequest", new RegisterRequest());

        return "register";
    }

    @PostMapping("/register")
    public Object handleRegister(
            @ModelAttribute("registerRequest") RegisterRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response,
            HttpSession session,
            Model model) {

        // Validate basic parameters
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            model.addAttribute("errorMessage", "Email address is required.");
            return "register";
        }

        if (request.getPassword() == null || request.getPassword().length() < 8) {
            model.addAttribute("errorMessage", "Password must be at least 8 characters long.");
            return "register";
        }

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            model.addAttribute("errorMessage", "Password and Confirm Password do not match.");
            return "register";
        }

        try {
            User registeredUser = authService.register(request);
            establishUserSession(httpRequest, response, session, registeredUser, registeredUser.getRole());
            return redirectTo("/dashboard");

        } catch (IllegalArgumentException e) {
            model.addAttribute("errorMessage", e.getMessage());
            model.addAttribute("selectedRole", request.getRole());
            return "register";
        } catch (Exception e) {
            model.addAttribute("errorMessage", "Registration failed: " + e.getMessage());
            model.addAttribute("selectedRole", request.getRole());
            return "register";
        }
    }

    // ==========================================
    // 3. FORGOT PASSWORD FLOW
    // ==========================================

    @GetMapping("/forgot-password")
    public String showForgotPasswordPage(HttpServletRequest request, Model model) {
        if (request != null) {
            request.getSession(true);
        }
        return "forgot-password";
    }

    @PostMapping("/forgot-password")
    public Object handleForgotPassword(
            @RequestParam("email") String email,
            @RequestParam("newPassword") String newPassword,
            @RequestParam("confirmPassword") String confirmPassword,
            HttpServletResponse response,
            Model model) {

        if (email == null || email.isBlank()) {
            model.addAttribute("errorMessage", "Please provide your registered email address.");
            return "forgot-password";
        }

        if (newPassword == null || newPassword.length() < 8) {
            model.addAttribute("errorMessage", "New password must be at least 8 characters long.");
            return "forgot-password";
        }

        if (!newPassword.equals(confirmPassword)) {
            model.addAttribute("errorMessage", "Password and Confirm Password do not match.");
            return "forgot-password";
        }

        boolean resetSuccess = authService.resetPassword(email.trim().toLowerCase(), newPassword);

        if (!resetSuccess) {
            model.addAttribute("errorMessage", "No registered account found with email: " + email);
            return "forgot-password";
        }

        // Successfully updated password -> redirect to login with confirmation
        return redirectTo("/login?reset=true");
    }

    // ==========================================
    // 4. LOGOUT FLOW (GET & POST)
    // ==========================================

    @GetMapping("/logout")
    public ResponseEntity<Void> handleGetLogout(HttpServletRequest request) {
        HttpSession session = (request != null) ? request.getSession(false) : null;
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return redirectTo("/login?logout=true");
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> handlePostLogout(HttpServletRequest request) {
        HttpSession session = (request != null) ? request.getSession(false) : null;
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return redirectTo("/login?logout=true");
    }
}
