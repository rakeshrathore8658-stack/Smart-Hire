package com.smarthire.security.oauth2;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Handles post-OAuth2 authentication failures:
 * Redirects back to the login page with a descriptive error message.
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
        String encodedError = URLEncoder.encode(errorMsg, StandardCharsets.UTF_8);

        String targetUrl = targetOrigin + "/login?oauth_error=" + encodedError;
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    private String resolveFrontendOrigin(HttpServletRequest request) {
        String referer = request.getHeader("Referer");
        if (referer != null && !referer.isBlank()) {
            try {
                java.net.URI uri = java.net.URI.create(referer);
                String refOrigin = uri.getScheme() + "://" + uri.getAuthority();
                if (refOrigin.contains("localhost:5173") || refOrigin.contains("vercel.app")) {
                    return refOrigin;
                }
            } catch (Exception ignored) {}
        }

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
}
