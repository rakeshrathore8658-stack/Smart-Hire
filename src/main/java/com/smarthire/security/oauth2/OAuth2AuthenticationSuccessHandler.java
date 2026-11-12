package com.smarthire.security.oauth2;

import com.smarthire.entity.User;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

/**
 * Handles post-OAuth2 authentication success:
 * Establishes server session, persists SecurityContext, and redirects
 * the user to their role-appropriate SmartHire dashboard.
 */
@Component
@Slf4j
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${cors.allowed-origins:}")
    private String customAllowedOrigins;

    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {

        if (authentication.getPrincipal() instanceof CustomOAuth2User customOAuth2User) {
            User user = customOAuth2User.getUser();
            String activeRole = user.getRole() != null ? user.getRole().toUpperCase() : "USER";
            if ("RECRUITER".equals(activeRole)) activeRole = "HR";

            HttpSession session = request.getSession(true);
            session.setMaxInactiveInterval(30 * 24 * 60 * 60);
            session.setAttribute("userRole", activeRole);
            session.setAttribute("userName", user.getFullName());
            session.setAttribute("userEmail", user.getEmail());
            session.setAttribute("phoneNumber", user.getPhoneNumber());
            session.setAttribute("theme", user.getThemePreference() != null ? user.getThemePreference() : "light");
            if (user.getCompanyName() != null) session.setAttribute("companyName", user.getCompanyName());
            if (user.getCareerRole() != null) session.setAttribute("careerRole", user.getCareerRole());

            String authority = activeRole.startsWith("ROLE_") ? activeRole : "ROLE_" + activeRole;
            UsernamePasswordAuthenticationToken springAuth = new UsernamePasswordAuthenticationToken(
                    user.getEmail(),
                    "PROTECTED_OAUTH2_CREDENTIALS",
                    Collections.singletonList(new SimpleGrantedAuthority(authority))
            );

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(springAuth);
            SecurityContextHolder.setContext(context);
            session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
            securityContextRepository.saveContext(context, request, response);

            // Set browser cookies so frontend immediately has authenticated credentials
            jakarta.servlet.http.Cookie emailCookie = new jakarta.servlet.http.Cookie("smarthire_user_email", user.getEmail());
            emailCookie.setPath("/");
            emailCookie.setMaxAge(30 * 24 * 60 * 60);
            emailCookie.setHttpOnly(false);
            response.addCookie(emailCookie);

            jakarta.servlet.http.Cookie roleCookie = new jakarta.servlet.http.Cookie("smarthire_user_role", activeRole);
            roleCookie.setPath("/");
            roleCookie.setMaxAge(30 * 24 * 60 * 60);
            roleCookie.setHttpOnly(false);
            response.addCookie(roleCookie);

            // Determine frontend target origin (Local Vite or Vercel in production)
            String targetOrigin = resolveFrontendOrigin(request);

            String encodedEmail = URLEncoder.encode(user.getEmail(), StandardCharsets.UTF_8);
            String encodedName = URLEncoder.encode(user.getFullName() != null ? user.getFullName() : "", StandardCharsets.UTF_8);

            // Redirect DIRECTLY to role dashboard (Candidate / Recruiter)
            String targetPath = "HR".equalsIgnoreCase(activeRole) ? "/dashboard/hr" : "/dashboard";
            String targetUrl = targetOrigin + targetPath + "?oauth=success&email=" + encodedEmail
                    + "&role=" + activeRole
                    + "&name=" + encodedName;

            log.info("Google OAuth2 login successful for user '{}' with role '{}'. Redirecting directly to dashboard: '{}'",
                    user.getEmail(), activeRole, targetUrl);

            getRedirectStrategy().sendRedirect(request, response, targetUrl);
            return;
        }

        super.onAuthenticationSuccess(request, response, authentication);
    }

    private String resolveFrontendOrigin(HttpServletRequest request) {
        // 1. If Origin header is present in allowed list, use it
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank() && isValidOrigin(origin)) {
            return origin.replaceAll("/+$", "");
        }

        // 2. Check Referer header
        String referer = request.getHeader("Referer");
        if (referer != null && !referer.isBlank()) {
            try {
                java.net.URI uri = java.net.URI.create(referer);
                String refOrigin = uri.getScheme() + "://" + uri.getAuthority();
                if (isValidOrigin(refOrigin)) {
                    return refOrigin;
                }
            } catch (Exception ignored) {}
        }

        // 3. Fallback to production Vercel if configured or default local frontend
        if (customAllowedOrigins != null && !customAllowedOrigins.isBlank()) {
            for (String allowed : customAllowedOrigins.split(",")) {
                String clean = allowed.trim().replaceAll("/+$", "");
                if (clean.contains("vercel.app")) {
                    return clean;
                }
            }
        }

        return frontendUrl != null ? frontendUrl.replaceAll("/+$", "") : "http://localhost:5173";
    }

    private boolean isValidOrigin(String o) {
        if (o == null) return false;
        return o.contains("localhost:5173") || o.contains("127.0.0.1:5173") || o.contains("vercel.app");
    }
}
