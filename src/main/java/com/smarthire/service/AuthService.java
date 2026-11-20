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
    private final SystemEmailService systemEmailService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.smarthire.repository.ResumeRepository resumeRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.smarthire.repository.ResumeAnalysisRepository resumeAnalysisRepository;

    @org.springframework.beans.factory.annotation.Autowired
    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, SystemEmailService systemEmailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.systemEmailService = systemEmailService;
    }

    /**
     * Link previously bulk-uploaded candidate resumes to a newly registered/signed-in Job Seeker.
     */
    public void linkExistingCandidateResumes(User user) {
        if (user == null || user.getEmail() == null || resumeRepository == null || resumeAnalysisRepository == null) return;
        String email = user.getEmail().trim().toLowerCase();

        try {
            var resumes = resumeRepository.findByCandidateEmailNormalizedOrderByCreatedAtDesc(email);
            for (var r : resumes) {
                if (r.getUser() == null || (r.getUser().getRole() != null && "HR".equalsIgnoreCase(r.getUser().getRole()))) {
                    r.setUser(user);
                    resumeRepository.save(r);
                }
            }

            var analyses = resumeAnalysisRepository.findByCandidateEmailNormalized(email);
            for (var ra : analyses) {
                if (ra.getUser() == null || (ra.getUser().getRole() != null && "HR".equalsIgnoreCase(ra.getUser().getRole()))) {
                    ra.setUser(user);
                    resumeAnalysisRepository.save(ra);
                }
            }
            log.info("Linked existing candidate records to Job Seeker [{}]: {} analyses", email, analyses.size());
        } catch (Exception ex) {
            log.warn("Could not link existing candidate records for [{}]: {}", email, ex.getMessage());
        }
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

        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            String cleanPhone = request.getPhoneNumber().trim().replaceAll("\\D", "");
            if (cleanPhone.length() != 10) {
                throw new IllegalArgumentException("Phone number must be exactly 10 digits (digits only).");
            }
            user.setPhoneNumber(cleanPhone);
        } else {
            user.setPhoneNumber(null);
        }

        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(assignedRole);
        user.setCareerRole(request.getCareerRole() != null && !request.getCareerRole().isBlank()
                ? request.getCareerRole().trim()
                : ("HR".equalsIgnoreCase(assignedRole) ? "HR / Recruiter" : "General"));
        user.setCompanyName(request.getCompanyName() != null ? request.getCompanyName().trim() : null);
        user.setTermsAccepted(true);
        user.setEmailVerified(false);
        String verificationToken = java.util.UUID.randomUUID().toString();
        user.setVerificationToken(verificationToken);
        user.setVerificationTokenExpiry(java.time.LocalDateTime.now().plusHours(24));
        user.setTourCompleted(false);
        user.setTourSkipped(false);
        user.setTourSeen(false);
        user.setTourLastStep(0);

        User saved = userRepository.save(user);
        if ("USER".equalsIgnoreCase(saved.getRole())) {
            linkExistingCandidateResumes(saved);
        }

        try {
            systemEmailService.sendVerificationEmail(saved, verificationToken);
        } catch (Exception ex) {
            log.error("Could not send registration verification email to [{}]: {}", saved.getEmail(), ex.getMessage());
        }

        return saved;
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

    public record TokenValidationResult(boolean isValid, String reason, String email, String message) {}

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
                throw new IllegalStateException("Role Mismatch: Ye email address (" + normalizedEmail + ") already "
                        + existingLabel + " portal ke liye registered hai. Ek email ke corresponding sirf or sirf ek dashboard ("
                        + existingLabel + ") me sign in kar sakte hain. Please '"
                        + existingLabel + "' portal select karke sign in karein.");
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
        newUser.setEmailVerified(true);
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

        User savedNewUser;
        try {
            savedNewUser = userRepository.save(newUser);
        } catch (Exception ex) {
            log.warn("Notice: Failed to persist new user with avatar, retrying safely without avatar: {}", ex.getMessage());
            if (newUser.getAvatarUrl() != null) {
                newUser.setAvatarUrl(null);
                savedNewUser = userRepository.save(newUser);
            } else {
                throw ex;
            }
        }
        if ("USER".equalsIgnoreCase(savedNewUser.getRole())) {
            linkExistingCandidateResumes(savedNewUser);
        }
        return savedNewUser;
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
     * Verifies user email with the given token.
     */
    @Transactional
    public boolean verifyEmailToken(String token) {
        if (token == null || token.isBlank()) return false;
        Optional<User> userOpt = userRepository.findByVerificationToken(token.trim());
        if (userOpt.isEmpty()) return false;
        User user = userOpt.get();
        if (user.getVerificationTokenExpiry() != null && user.getVerificationTokenExpiry().isBefore(java.time.LocalDateTime.now())) {
            log.warn("Email verification token expired for user [{}]", user.getEmail());
            return false;
        }
        user.setEmailVerified(true);
        // Single-use token: Immediately destroy token so link can NEVER be opened or used again
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);
        userRepository.saveAndFlush(user);
        log.info("Email verified successfully and verification token permanently destroyed for user [{}]", user.getEmail());
        return true;
    }

    /**
     * Resends email verification link for unverified users.
     */
    @Transactional
    public SystemEmailService.EmailSendResult resendVerificationEmail(String email) {
        if (email == null || email.isBlank()) {
            return new SystemEmailService.EmailSendResult(false, "Email address is required.");
        }
        Optional<User> userOpt = findByEmail(email.trim().toLowerCase());
        if (userOpt.isEmpty()) {
            return new SystemEmailService.EmailSendResult(false, "No account registered with " + email.trim());
        }
        User user = userOpt.get();
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return new SystemEmailService.EmailSendResult(true, "Your account is already verified! You can sign in directly.");
        }
        String token = java.util.UUID.randomUUID().toString();
        user.setVerificationToken(token);
        user.setVerificationTokenExpiry(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC).plusHours(24));
        userRepository.saveAndFlush(user);
        return systemEmailService.sendVerificationEmail(user, token);
    }

    /**
     * Generates password reset token and sends email.
     * Enforces a strict 30-minute validity window.
     */
    @Transactional
    public SystemEmailService.EmailSendResult initiatePasswordReset(String email) {
        if (email == null || email.isBlank()) {
            return new SystemEmailService.EmailSendResult(false, "Email address is required.");
        }
        Optional<User> userOpt = findByEmail(email.trim().toLowerCase());
        if (userOpt.isEmpty()) {
            log.warn("Forgot password requested for unregistered email: [{}]", email);
            return new SystemEmailService.EmailSendResult(false, "No account registered with this email address.");
        }
        User user = userOpt.get();
        String token = java.util.UUID.randomUUID().toString();
        user.setResetPasswordToken(token);
        // Strict 30-minute expiration window in UTC
        user.setResetPasswordTokenExpiry(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC).plusMinutes(30));
        userRepository.saveAndFlush(user);
        return systemEmailService.sendPasswordResetEmail(user, token);
    }

    /**
     * Validates whether a reset password token is valid, active (< 30 minutes), and has not been used.
     * Cleans up expired tokens automatically.
     */
    @Transactional
    public TokenValidationResult validateResetPasswordToken(String token) {
        if (token == null || token.isBlank()) {
            return new TokenValidationResult(false, "MISSING_TOKEN", null, "Password reset token is missing.");
        }
        Optional<User> userOpt = userRepository.findByResetPasswordToken(token.trim());
        if (userOpt.isEmpty()) {
            return new TokenValidationResult(
                    false,
                    "INVALID_OR_USED",
                    null,
                    "This password reset link is invalid or has already been used. Please request a new link."
            );
        }
        User user = userOpt.get();
        java.time.LocalDateTime expiry = user.getResetPasswordTokenExpiry();
        java.time.LocalDateTime nowUtc = java.time.LocalDateTime.now(java.time.ZoneOffset.UTC);

        if (expiry != null && expiry.isBefore(nowUtc)) {
            // Token has expired: clean it up from database immediately
            log.warn("Password reset token expired for user [{}] (expired at {}, current UTC {})",
                    user.getEmail(), expiry, nowUtc);
            user.setResetPasswordToken(null);
            user.setResetPasswordTokenExpiry(null);
            userRepository.saveAndFlush(user);
            return new TokenValidationResult(
                    false,
                    "EXPIRED",
                    null,
                    "This password reset link has expired (links are valid for 30 minutes). Please request a new link."
            );
        }
        return new TokenValidationResult(true, "VALID", user.getEmail(), "Token is valid.");
    }

    /**
     * Resets password using token.
     * Permanently invalidates the token so it cannot be reopened or reused.
     */
    @Transactional
    public boolean resetPasswordWithToken(String token, String newPassword) {
        if (token == null || token.isBlank() || newPassword == null || newPassword.isBlank()) return false;
        Optional<User> userOpt = userRepository.findByResetPasswordToken(token.trim());
        if (userOpt.isEmpty()) return false;
        User user = userOpt.get();
        java.time.LocalDateTime expiry = user.getResetPasswordTokenExpiry();
        java.time.LocalDateTime nowUtc = java.time.LocalDateTime.now(java.time.ZoneOffset.UTC);

        if (expiry != null && expiry.isBefore(nowUtc)) {
            log.warn("Attempted password reset with expired token for user [{}]", user.getEmail());
            user.setResetPasswordToken(null);
            user.setResetPasswordTokenExpiry(null);
            userRepository.saveAndFlush(user);
            return false;
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        // Single-use token: Immediately invalidate so the link CANNOT be opened or used again
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
        userRepository.saveAndFlush(user);
        log.info("Password successfully updated and reset token permanently invalidated for user [{}]", user.getEmail());
        return true;
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
