package com.smarthire.security.oauth2;

import com.smarthire.entity.User;
import com.smarthire.security.jwt.JwtUtil;
import com.smarthire.service.AuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
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
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Map;

/**
 * Handles post-OAuth2 authentication success:
 * Establishes server session, persists SecurityContext, generates application JWT token,
 * and redirects the user to their role-appropriate SmartHire dashboard with token & user details.
 */
@Component
@Slf4j
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${cors.allowed-origins:}")
    private String customAllowedOrigins;

    private final JwtUtil jwtUtil;
    private final AuthService authService;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    public OAuth2AuthenticationSuccessHandler(JwtUtil jwtUtil, AuthService authService) {
        this.jwtUtil = jwtUtil;
        this.authService = authService;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {

        User user = null;
        Object principal = authentication.getPrincipal();

        if (principal instanceof CustomOAuth2User customOAuth2User) {
            user = customOAuth2User.getUser();
        } else if (principal instanceof OAuth2User oauth2User) {
            Map<String, Object> attrs = oauth2User.getAttributes();
            String email = (String) attrs.get("email");
            String name = (String) attrs.get("name");
            String picture = (String) attrs.get("picture");
            String sub = (String) attrs.get("sub");
            if (email != null && !email.isBlank()) {
                String role = resolveRequestedRole(request);
                user = authService.loginOrRegisterWithGoogle(email, name, role, sub, picture);
            }
        }

        if (user != null) {
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

            // Generate application JWT token for client-side storage & authorization
            String jwtToken = jwtUtil.generateToken(user);

            // Set browser cookies so frontend immediately has authenticated credentials
            Cookie emailCookie = new Cookie("smarthire_user_email", user.getEmail());
            emailCookie.setPath("/");
            emailCookie.setMaxAge(30 * 24 * 60 * 60);
            emailCookie.setHttpOnly(false);
            response.addCookie(emailCookie);

            Cookie roleCookie = new Cookie("smarthire_user_role", activeRole);
            roleCookie.setPath("/");
            roleCookie.setMaxAge(30 * 24 * 60 * 60);
            roleCookie.setHttpOnly(false);
            response.addCookie(roleCookie);

            Cookie tokenCookie = new Cookie("token", jwtToken);
            tokenCookie.setPath("/");
            tokenCookie.setMaxAge(30 * 24 * 60 * 60);
            tokenCookie.setHttpOnly(false);
            response.addCookie(tokenCookie);

            Cookie stCookie = new Cookie("smarthire_token", jwtToken);
            stCookie.setPath("/");
            stCookie.setMaxAge(30 * 24 * 60 * 60);
            stCookie.setHttpOnly(false);
            response.addCookie(stCookie);

            // Determine frontend target origin (Local Vite or Vercel in production)
            String targetOrigin = resolveFrontendOrigin(request);

            String encodedToken = URLEncoder.encode(jwtToken, StandardCharsets.UTF_8);
            String encodedEmail = URLEncoder.encode(user.getEmail(), StandardCharsets.UTF_8);
            String encodedName = URLEncoder.encode(user.getFullName() != null ? user.getFullName() : "", StandardCharsets.UTF_8);

            // Redirect DIRECTLY to role dashboard (Candidate / Recruiter) with JWT token
            String targetPath = "HR".equalsIgnoreCase(activeRole) ? "/dashboard/hr" : "/dashboard";
            boolean isNewUser = !user.isTourSeen() && !user.isTourCompleted();
            String targetUrl = targetOrigin + targetPath + "?oauth=success"
                    + "&token=" + encodedToken
                    + "&email=" + encodedEmail
                    + "&role=" + activeRole
                    + "&name=" + encodedName
                    + "&new_user=" + isNewUser;

            log.info("Google OAuth2 login successful for user '{}' with role '{}'. Redirecting directly to dashboard: '{}'",
                    user.getEmail(), activeRole, targetUrl);

            response.setStatus(HttpServletResponse.SC_FOUND);
            response.setHeader(org.springframework.http.HttpHeaders.LOCATION, targetUrl);
            return;
        }

        // Fallback: Redirect to frontend login with error instead of port 8080 Whitelabel
        String targetOrigin = resolveFrontendOrigin(request);
        String targetUrl = targetOrigin + "/login?error=" + URLEncoder.encode("Authentication failed. Please try again.", StandardCharsets.UTF_8);
        response.setStatus(HttpServletResponse.SC_FOUND);
        response.setHeader(org.springframework.http.HttpHeaders.LOCATION, targetUrl);
    }

    private String resolveRequestedRole(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("oauth2_requested_role") != null) {
            String role = (String) session.getAttribute("oauth2_requested_role");
            if (role != null && !role.isBlank()) return role.trim().toUpperCase();
        }
        String roleParam = request.getParameter("role");
        if (roleParam != null && !roleParam.isBlank()) {
            return roleParam.trim().toUpperCase();
        }
        if (request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if ("smarthire_oauth_role".equals(c.getName()) && c.getValue() != null) {
                    return c.getValue().trim().toUpperCase();
                }
            }
        }
        return "USER";
    }

    public String resolveFrontendOrigin(HttpServletRequest request) {
        // 0. Check session
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("oauth2_requested_origin") != null) {
            String orig = (String) session.getAttribute("oauth2_requested_origin");
            if (orig != null && !orig.isBlank() && isValidOrigin(orig)) {
                return orig.trim().replaceAll("/+$", "");
            }
        }

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

        // 3. If Origin header is present in allowed list, use it
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank() && isValidOrigin(origin)) {
            return origin.replaceAll("/+$", "");
        }

        // 4. Check Referer header
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

        // 5. If running in production (Render or any non-localhost host), ALWAYS default to Vercel production frontend
        String host = request.getHeader("Host");
        String serverName = request.getServerName();
        if ((serverName != null && !serverName.equals("localhost") && !serverName.equals("127.0.0.1"))
                || (host != null && host.contains("onrender.com"))) {
            return "https://resume-analyzer-sigma-nine.vercel.app";
        }

        // 6. Custom allowed origins check
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
