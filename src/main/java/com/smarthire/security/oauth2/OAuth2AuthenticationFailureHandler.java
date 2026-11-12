package com.smarthire.security.oauth2;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Handles post-OAuth2 authentication failures:
 * Redirects back to the frontend login page with a descriptive error message.
 */
@Component
@Slf4j
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${cors.allowed-origins:}")
    private String customAllowedOrigins;

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception
    ) throws IOException, ServletException {

        log.warn("Google OAuth2 authentication failed: {}", exception.getMessage());

        String targetOrigin = resolveFrontendOrigin(request);
        String errorMsg = exception.getMessage() != null ? exception.getMessage() : "Google authentication failed. Please try again.";
        if (exception.getCause() != null && exception.getCause().getMessage() != null && !exception.getCause().getMessage().isBlank()) {
            errorMsg = exception.getCause().getMessage();
        }

        String encodedError = URLEncoder.encode(errorMsg, StandardCharsets.UTF_8);

        // Retrieve requested role from session if available
        String role = "USER";
        jakarta.servlet.http.HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("oauth2_requested_role") != null) {
            role = (String) session.getAttribute("oauth2_requested_role");
        }

        String targetUrl = targetOrigin + "/login?role=" + role + "&oauth_error=" + encodedError;

        log.info("Redirecting failed OAuth2 authentication to frontend: '{}'", targetUrl);

        response.setStatus(HttpServletResponse.SC_FOUND);
        response.setHeader(org.springframework.http.HttpHeaders.LOCATION, targetUrl);
    }

    private String resolveFrontendOrigin(HttpServletRequest request) {
        // 1. Check if frontend set smarthire_oauth_origin cookie
        if (request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if ("smarthire_oauth_origin".equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
                    try {
                        String decoded = URLDecoder.decode(c.getValue(), StandardCharsets.UTF_8).trim().replaceAll("/+$", "");
                        if (isValidOrigin(decoded)) {
                            return decoded;
                        }
                    } catch (Exception ignored) {}
                }
            }
        }

        // 2. Check query or saved parameter redirect_uri / origin
        String paramOrigin = request.getParameter("origin");
        if (paramOrigin == null || paramOrigin.isBlank()) {
            paramOrigin = request.getParameter("redirect_uri");
        }
        if (paramOrigin != null && !paramOrigin.isBlank() && isValidOrigin(paramOrigin)) {
            return paramOrigin.trim().replaceAll("/+$", "");
        }

        // 3. Check Referer header
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

        // 4. If running in production (Render or any non-localhost host), ALWAYS default to Vercel production frontend
        String host = request.getHeader("Host");
        String serverName = request.getServerName();
        if ((serverName != null && !serverName.equals("localhost") && !serverName.equals("127.0.0.1"))
                || (host != null && host.contains("onrender.com"))) {
            return "https://resume-analyzer-sigma-nine.vercel.app";
        }

        // 5. Custom allowed origins check
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
