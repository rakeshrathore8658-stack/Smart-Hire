package com.smarthire.service;

import com.smarthire.dto.RegisterRequest;
import com.smarthire.dto.UserResponse;
import com.smarthire.entity.User;
import com.smarthire.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @org.springframework.beans.factory.annotation.Autowired
    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Registers a new user (Job Seeker or HR Recruiter) with encrypted password.
     */
    @Transactional
    public User register(RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            User existing = userRepository.findByEmail(email).orElse(null);
            String existingRole = (existing != null && existing.getRole() != null) ? existing.getRole().toUpperCase() : "USER";
            if ("RECRUITER".equals(existingRole)) existingRole = "HR";
            String label = "HR".equalsIgnoreCase(existingRole) ? "HR / Recruiter" : "Job Seeker";
            throw new IllegalArgumentException("This email address is already registered as a " + label + ". Ek email se ek hi dashboard access ho sakta hai.");
        }

        if (request.getPassword() == null || !request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Password and confirm password do not match.");
        }

        String assignedRole = (request.getRole() != null && !request.getRole().isBlank())
                ? request.getRole().trim().toUpperCase()
                : "USER";

        User user = new User();
        user.setFullName(request.getFullName() != null ? request.getFullName().trim() : "SmartHire User");
        user.setEmail(email);
        user.setPhoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : null);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(assignedRole);
        user.setCareerRole(request.getCareerRole() != null && !request.getCareerRole().isBlank()
                ? request.getCareerRole().trim()
                : ("HR".equalsIgnoreCase(assignedRole) ? "HR / Recruiter" : "General"));
        user.setCompanyName(request.getCompanyName() != null ? request.getCompanyName().trim() : null);
        user.setTermsAccepted(true);
        user.setTourCompleted(false);
        user.setTourSkipped(false);
        user.setTourSeen(false);
        user.setTourLastStep(0);

        return userRepository.save(user);
    }

    /**
     * Converts a User entity to a safe UserResponse DTO.
     */
    public UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getRole(),
                user.getCareerRole(),
                user.getCompanyName(),
                user.getCreatedAt()
        );
    }

    /**
     * Finds a user by email address.
     */
    public Optional<User> findByEmail(String email) {
        if (email == null) return Optional.empty();
        return userRepository.findByEmail(email.trim().toLowerCase());
    }

    /**
     * Authenticates or automatically creates an account for Google Sign-In.
     * Follows strict account-matching rules:
     * 1. Matches by Google Subject ID (sub).
     * 2. Matches by verified email address.
     * 3. Preserves existing user roles and links Google profile.
     */
    @Transactional
    public User loginOrRegisterWithGoogle(String email, String fullName, String requestedRole, String googleId, String avatarUrl) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Google account email cannot be empty.");
        }
        String normalizedEmail = email.trim().toLowerCase();

        // 1. First check by Google Subject ID (sub)
        Optional<User> userOpt = Optional.empty();
        if (googleId != null && !googleId.isBlank()) {
            userOpt = userRepository.findByGoogleId(googleId.trim());
        }

        // 2. If not found by googleId, check by verified email
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmail(normalizedEmail);
        }

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String existingRole = user.getRole() != null ? user.getRole().trim().toUpperCase() : "USER";
            if ("RECRUITER".equals(existingRole)) existingRole = "HR";

            String targetRole = (requestedRole != null && !requestedRole.isBlank())
                    ? requestedRole.trim().toUpperCase()
                    : existingRole;
            if ("RECRUITER".equals(targetRole)) targetRole = "HR";

            if (!existingRole.equalsIgnoreCase(targetRole)) {
                String existingLabel = "HR".equalsIgnoreCase(existingRole) ? "HR / Recruiter" : "Job Seeker";
                String targetLabel = "HR".equalsIgnoreCase(targetRole) ? "HR / Recruiter" : "Job Seeker";
                throw new IllegalStateException("Ye email address (" + normalizedEmail + ") already "
                        + existingLabel + " portal ke liye registered hai. Ek email ke corresponding sirf or sirf ek dashboard ("
                        + existingLabel + ") me sign in kar sakte hain. Please "
                        + existingLabel + " portal se sign in karein.");
            }

            boolean needsSave = false;
            if (user.getGoogleId() == null && googleId != null && !googleId.isBlank()) {
                user.setGoogleId(googleId.trim());
                needsSave = true;
            }
            if (avatarUrl != null && !avatarUrl.isBlank()) {
                String safeAvatar = sanitizeAvatarUrl(avatarUrl);
                if (user.getAvatarUrl() == null || !user.getAvatarUrl().equals(safeAvatar)) {
                    user.setAvatarUrl(safeAvatar);
                    needsSave = true;
                }
            }
            if ((user.getFullName() == null || user.getFullName().isBlank() || "User Account".equalsIgnoreCase(user.getFullName()))
                    && fullName != null && !fullName.isBlank()) {
                user.setFullName(fullName.trim());
                needsSave = true;
            }
            if (needsSave) {
                try {
                    userRepository.save(user);
                } catch (Exception ex) {
                    log.warn("Notice: Failed to update user profile avatar during Google login, retrying safely: {}", ex.getMessage());
                    if (user.getAvatarUrl() != null) {
                        user.setAvatarUrl(null);
                        userRepository.save(user);
                    } else {
                        throw ex;
                    }
                }
            }
            return user;
        }

        // 3. New user: auto-register with requested role (default USER)
        String assignedRole = (requestedRole != null && !requestedRole.isBlank())
                ? requestedRole.trim().toUpperCase()
                : "USER";
        if ("RECRUITER".equalsIgnoreCase(assignedRole)) {
            assignedRole = "HR";
        }

        User newUser = new User();
        newUser.setFullName((fullName != null && !fullName.isBlank()) ? fullName.trim() : "Google User");
        newUser.setEmail(normalizedEmail);
        newUser.setGoogleId(googleId != null && !googleId.isBlank() ? googleId.trim() : null);
        newUser.setAvatarUrl(sanitizeAvatarUrl(avatarUrl));
        newUser.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
        newUser.setRole(assignedRole);
        newUser.setCareerRole("HR".equalsIgnoreCase(assignedRole) ? "HR / Recruiter" : "Job Seeker");
        newUser.setTermsAccepted(true);
        newUser.setTourCompleted(false);
        newUser.setTourSkipped(false);
        newUser.setTourSeen(false);
        newUser.setTourLastStep(0);
        newUser.setThemePreference("light");
        newUser.setNotifResumeScan(true);
        newUser.setNotifJobInsights(true);
        newUser.setNotifInterviewUpdates(true);
        newUser.setCreatedAt(java.time.LocalDateTime.now());

        try {
            return userRepository.save(newUser);
        } catch (Exception ex) {
            log.warn("Notice: Failed to persist new user with avatar, retrying safely without avatar: {}", ex.getMessage());
            if (newUser.getAvatarUrl() != null) {
                newUser.setAvatarUrl(null);
                return userRepository.save(newUser);
            }
            throw ex;
        }
    }

    private String sanitizeAvatarUrl(String url) {
        if (url == null || url.isBlank()) return null;
        String clean = url.trim();
        if (clean.length() > 2000) {
            return clean.substring(0, 2000);
        }
        return clean;
    }

    /**
     * Verifies user password credentials against the stored bcrypt hash.
     */
    public Optional<User> authenticate(String email, String rawPassword) {
        if (email == null || rawPassword == null) return Optional.empty();
        Optional<User> userOpt = findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
                return Optional.of(user);
            }
        }
        return Optional.empty();
    }

    /**
     * Resets password for an existing user account.
     */
    @Transactional
    public boolean resetPassword(String email, String newPassword) {
        if (email == null || newPassword == null || newPassword.isBlank()) {
            return false;
        }

        Optional<User> userOpt = findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setPasswordHash(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            return true;
        }
        return false;
    }

    /**
     * Demo user auto-seeding removed so new databases remain clean without default mock users.
     */
    @Transactional
    public void ensureDemoUsersExist() {
        // No-op: Do not auto-inject hardcoded demo users into the user's database
    }
}
