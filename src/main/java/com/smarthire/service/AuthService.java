package com.smarthire.service;

import com.smarthire.dto.RegisterRequest;
import com.smarthire.dto.UserResponse;
import com.smarthire.entity.User;
import com.smarthire.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

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
            throw new IllegalArgumentException("An account with this email already exists: " + email);
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
     */
    @Transactional
    public User loginOrRegisterWithGoogle(String email, String fullName, String requestedRole, String googleId, String avatarUrl) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Google account email cannot be empty.");
        }
        String normalizedEmail = email.trim().toLowerCase();
        Optional<User> existingOpt = userRepository.findByEmail(normalizedEmail);

        if (existingOpt.isPresent()) {
            User user = existingOpt.get();
            if ((user.getFullName() == null || user.getFullName().isBlank() || "User Account".equalsIgnoreCase(user.getFullName()))
                    && fullName != null && !fullName.isBlank()) {
                user.setFullName(fullName.trim());
                userRepository.save(user);
            }
            return user;
        }

        // New user: auto-register with requested role
        String assignedRole = (requestedRole != null && !requestedRole.isBlank())
                ? requestedRole.trim().toUpperCase()
                : "USER";
        if ("RECRUITER".equalsIgnoreCase(assignedRole)) {
            assignedRole = "HR";
        }

        User newUser = new User();
        newUser.setFullName((fullName != null && !fullName.isBlank()) ? fullName.trim() : "Google User");
        newUser.setEmail(normalizedEmail);
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

        return userRepository.save(newUser);
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
