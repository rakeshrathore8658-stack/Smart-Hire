package com.smarthire.security.oauth2;

import com.smarthire.entity.User;
import com.smarthire.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Service to process the authenticated OAuth2User from Google,
 * map to SmartHire database User entity, and assign proper roles.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final AuthService authService;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        try {
            return processOAuth2User(userRequest, oAuth2User);
        } catch (OAuth2AuthenticationException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to process Google OAuth2 user: {}", ex.getMessage(), ex);
            String msg = ex.getMessage() != null ? ex.getMessage() : "Google authentication encountered an issue.";
            String errorCode = (msg.toLowerCase().contains("role") || msg.toLowerCase().contains("portal"))
                    ? "portal_mismatch" : "oauth2_processing_error";
            throw new OAuth2AuthenticationException(new OAuth2Error(errorCode, msg, null), ex);
        }
    }

    private OAuth2User processOAuth2User(OAuth2UserRequest userRequest, OAuth2User oAuth2User) {
        OAuth2UserInfo userInfo = new OAuth2UserInfo(oAuth2User.getAttributes());

        if (userInfo.getEmail() == null || userInfo.getEmail().isBlank()) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("missing_email", "Email not provided by Google OAuth2 provider.", null)
            );
        }

        // Determine requested role from HTTP request parameter, session or cookie
        String requestedRole = resolveRequestedRole();

        User user = authService.loginOrRegisterWithGoogle(
                userInfo.getEmail(),
                userInfo.getName(),
                requestedRole,
                userInfo.getId(),
                userInfo.getImageUrl()
        );

        return new CustomOAuth2User(user, oAuth2User.getAttributes());
    }

    private String resolveRequestedRole() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();

            // 1. Check HTTP session (populated by CustomOAuth2AuthorizationRequestResolver)
            HttpSession session = request.getSession(false);
            if (session != null && session.getAttribute("oauth2_requested_role") != null) {
                String role = (String) session.getAttribute("oauth2_requested_role");
                if (role != null && !role.isBlank()) {
                    return role.trim().toUpperCase();
                }
            }

            // 2. Check query parameter
            String roleParam = request.getParameter("role");
            if (roleParam != null && !roleParam.isBlank()) {
                return roleParam.trim().toUpperCase();
            }

            // 3. Check cookies
            Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                for (Cookie cookie : cookies) {
                    if ("smarthire_oauth_role".equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                        return cookie.getValue().trim().toUpperCase();
                    }
                }
            }
        }
        return "USER";
    }
}
