package com.smarthire.security;

import com.smarthire.entity.User;
import com.smarthire.repository.UserRepository;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static Optional<UserPrincipal> getCurrentPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            return Optional.of(userPrincipal);
        }
        return Optional.empty();
    }

    public static Long getCurrentUserId() {
        return getCurrentPrincipal().map(UserPrincipal::getId).orElse(null);
    }

    public static String getCurrentUserEmail() {
        return getCurrentPrincipal().map(UserPrincipal::getEmail).orElseGet(() -> {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken) && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
                return auth.getName();
            }
            try {
                org.springframework.web.context.request.ServletRequestAttributes attrs =
                        (org.springframework.web.context.request.ServletRequestAttributes)
                                org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
                if (attrs != null && attrs.getRequest() != null) {
                    String headerEmail = attrs.getRequest().getHeader("X-User-Email");
                    if (headerEmail != null && !headerEmail.isBlank()) {
                        return headerEmail.trim().toLowerCase();
                    }
                    if (attrs.getRequest().getSession(false) != null) {
                        String sessionEmail = (String) attrs.getRequest().getSession(false).getAttribute("userEmail");
                        if (sessionEmail != null && !sessionEmail.isBlank()) {
                            return sessionEmail.trim().toLowerCase();
                        }
                    }
                }
            } catch (Exception ignored) {}
            return null;
        });
    }

    public static String getCurrentUserRole() {
        return getCurrentPrincipal().map(UserPrincipal::getRole).orElseGet(() -> {
            try {
                org.springframework.web.context.request.ServletRequestAttributes attrs =
                        (org.springframework.web.context.request.ServletRequestAttributes)
                                org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
                if (attrs != null && attrs.getRequest() != null && attrs.getRequest().getSession(false) != null) {
                    String role = (String) attrs.getRequest().getSession(false).getAttribute("userRole");
                    if (role != null && !role.isBlank()) {
                        return role.trim().toUpperCase();
                    }
                }
            } catch (Exception ignored) {}
            return "USER";
        });
    }

    public static boolean isHr() {
        return "HR".equalsIgnoreCase(getCurrentUserRole()) || "RECRUITER".equalsIgnoreCase(getCurrentUserRole());
    }

    public static boolean isJobSeeker() {
        return !isHr();
    }

    public static Optional<User> getCurrentUser(UserRepository userRepository) {
        Long userId = getCurrentUserId();
        if (userId != null) {
            return userRepository.findById(userId);
        }
        String email = getCurrentUserEmail();
        if (email != null && !email.isBlank()) {
            return userRepository.findByEmail(email.trim().toLowerCase());
        }
        return Optional.empty();
    }
}
