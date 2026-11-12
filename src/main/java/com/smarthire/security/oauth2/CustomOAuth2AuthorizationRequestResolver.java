package com.smarthire.security.oauth2;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Intercepts the initial Google OAuth2 authorization redirect (/oauth2/authorization/google)
 * to capture and persist the requested user role (e.g. HR vs USER) and originating frontend
 * into the HTTP session and request parameters so role context is never lost across redirects.
 */
@Slf4j
public class CustomOAuth2AuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    private final DefaultOAuth2AuthorizationRequestResolver defaultResolver;

    public CustomOAuth2AuthorizationRequestResolver(ClientRegistrationRepository clientRegistrationRepository) {
        this.defaultResolver = new DefaultOAuth2AuthorizationRequestResolver(
                clientRegistrationRepository,
                "/oauth2/authorization"
        );
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        OAuth2AuthorizationRequest authorizationRequest = defaultResolver.resolve(request);
        return customize(request, authorizationRequest);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        OAuth2AuthorizationRequest authorizationRequest = defaultResolver.resolve(request, clientRegistrationId);
        return customize(request, authorizationRequest);
    }

    private OAuth2AuthorizationRequest customize(HttpServletRequest request, OAuth2AuthorizationRequest authorizationRequest) {
        if (authorizationRequest == null) {
            return null;
        }

        // 1. Resolve requested role ('HR' or 'USER')
        String role = request.getParameter("role");
        if ((role == null || role.isBlank()) && request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if ("smarthire_oauth_role".equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
                    role = c.getValue().trim().toUpperCase();
                    break;
                }
            }
        }

        if (role == null || role.isBlank()) {
            role = "USER";
        }
        role = role.trim().toUpperCase();
        if ("RECRUITER".equals(role)) role = "HR";

        // 2. Resolve frontend origin
        String origin = request.getParameter("origin");
        if (origin == null || origin.isBlank()) {
            origin = request.getParameter("redirect_uri");
        }
        if (origin == null || origin.isBlank()) {
            String referer = request.getHeader("Referer");
            if (referer != null && referer.contains("vercel.app")) {
                origin = "https://resume-analyzer-sigma-nine.vercel.app";
            }
        }

        // 3. Save into server-side HTTP Session
        HttpSession session = request.getSession(true);
        session.setAttribute("oauth2_requested_role", role);
        if (origin != null && !origin.isBlank()) {
            session.setAttribute("oauth2_requested_origin", origin.trim());
        }

        log.info("Initiating Google OAuth2 authorization: requestedRole='{}', origin='{}'", role, origin);

        // 4. Attach role & origin to OAuth2AuthorizationRequest additionalParameters
        Map<String, Object> additionalParameters = new LinkedHashMap<>(authorizationRequest.getAdditionalParameters());
        additionalParameters.put("role", role);
        if (origin != null && !origin.isBlank()) {
            additionalParameters.put("origin", origin.trim());
        }

        return OAuth2AuthorizationRequest.from(authorizationRequest)
                .additionalParameters(additionalParameters)
                .build();
    }
}
