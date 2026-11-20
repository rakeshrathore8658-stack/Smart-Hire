package com.smarthire;

import com.smarthire.controller.AuthApiController;
import com.smarthire.entity.User;
import com.smarthire.repository.UserRepository;
import com.smarthire.security.jwt.JwtUtil;
import com.smarthire.service.AuthService;
import com.smarthire.service.SystemEmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class PasswordResetSecurityTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private SystemEmailService systemEmailService;
    private JwtUtil jwtUtil;

    private AuthService authService;
    private AuthApiController authApiController;

    private User testUser;
    private final String testEmail = "registered_hr@example.com";

    @BeforeEach
    void setUp() {
        userRepository = Mockito.mock(UserRepository.class);
        passwordEncoder = Mockito.mock(PasswordEncoder.class);
        systemEmailService = Mockito.mock(SystemEmailService.class);
        jwtUtil = Mockito.mock(JwtUtil.class);

        authService = new AuthService(userRepository, passwordEncoder, systemEmailService);
        authApiController = new AuthApiController(authService, userRepository, jwtUtil);

        testUser = new User();
        testUser.setId(101L);
        testUser.setEmail(testEmail);
        testUser.setFullName("Registered HR User");
        testUser.setPasswordHash("hashed_old_pwd");
        testUser.setRole("HR");
        testUser.setEmailVerified(true);
        testUser.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("1. Unregistered email is rejected with 404 and NO email is sent")
    void testUnregisteredEmailRejected() {
        String unregisteredEmail = "unregistered_person@example.com";
        when(userRepository.findByEmail(unregisteredEmail)).thenReturn(Optional.empty());

        ResponseEntity<?> response = authApiController.forgotPassword(Map.of("email", unregisteredEmail));

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals(false, body.get("success"));
        assertEquals(false, body.get("registered"));
        assertTrue(body.get("message").toString().contains("No account registered with this email address"));

        // Verify that systemEmailService was NEVER invoked
        verify(systemEmailService, never()).sendPasswordResetEmail(any(), any());
    }

    @Test
    @DisplayName("2. Registered user generates 30-minute token and sends email")
    void testRegisteredUserGenerates30MinToken() {
        when(userRepository.findByEmail(testEmail)).thenReturn(Optional.of(testUser));
        when(userRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(systemEmailService.sendPasswordResetEmail(any(), any())).thenReturn(true);

        ResponseEntity<?> response = authApiController.forgotPassword(Map.of("email", testEmail));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertEquals(true, body.get("success"));
        assertEquals(true, body.get("registered"));
        assertTrue(body.get("message").toString().contains("30 minutes"));

        // Verify token saved with 30-minute expiry
        assertNotNull(testUser.getResetPasswordToken());
        assertNotNull(testUser.getResetPasswordTokenExpiry());

        LocalDateTime nowUtc = LocalDateTime.now(ZoneOffset.UTC);
        // Expiry should be roughly 30 minutes ahead
        assertTrue(testUser.getResetPasswordTokenExpiry().isAfter(nowUtc.plusMinutes(28)));
        assertTrue(testUser.getResetPasswordTokenExpiry().isBefore(nowUtc.plusMinutes(31)));

        verify(systemEmailService).sendPasswordResetEmail(eq(testUser), eq(testUser.getResetPasswordToken()));
    }

    @Test
    @DisplayName("3. Token validation accepts active token and rejects expired/used token")
    void testTokenValidationFlow() {
        String token = UUID.randomUUID().toString();
        testUser.setResetPasswordToken(token);
        testUser.setResetPasswordTokenExpiry(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(30));

        when(userRepository.findByResetPasswordToken(token)).thenReturn(Optional.of(testUser));

        // Active token validation
        ResponseEntity<?> validResp = authApiController.validateResetToken(token);
        assertEquals(HttpStatus.OK, validResp.getStatusCode());
        Map<?, ?> validBody = (Map<?, ?>) validResp.getBody();
        assertNotNull(validBody);
        assertEquals(true, validBody.get("valid"));
        assertEquals("VALID", validBody.get("reason"));

        // Expired token (> 30 mins ago)
        String expiredToken = UUID.randomUUID().toString();
        testUser.setResetPasswordToken(expiredToken);
        testUser.setResetPasswordTokenExpiry(LocalDateTime.now(ZoneOffset.UTC).minusMinutes(5));
        when(userRepository.findByResetPasswordToken(expiredToken)).thenReturn(Optional.of(testUser));

        ResponseEntity<?> expiredResp = authApiController.validateResetToken(expiredToken);
        assertEquals(HttpStatus.GONE, expiredResp.getStatusCode());
        Map<?, ?> expiredBody = (Map<?, ?>) expiredResp.getBody();
        assertNotNull(expiredBody);
        assertEquals(false, expiredBody.get("valid"));
        assertEquals("EXPIRED", expiredBody.get("reason"));

        // After expiry check, token should be cleared
        assertNull(testUser.getResetPasswordToken());
        assertNull(testUser.getResetPasswordTokenExpiry());

        // Token that does not exist or was already used
        String missingToken = UUID.randomUUID().toString();
        when(userRepository.findByResetPasswordToken(missingToken)).thenReturn(Optional.empty());

        ResponseEntity<?> missingResp = authApiController.validateResetToken(missingToken);
        assertEquals(HttpStatus.NOT_FOUND, missingResp.getStatusCode());
        Map<?, ?> missingBody = (Map<?, ?>) missingResp.getBody();
        assertNotNull(missingBody);
        assertEquals(false, missingBody.get("valid"));
        assertEquals("INVALID_OR_USED", missingBody.get("reason"));
    }

    @Test
    @DisplayName("4. Resetting password invalidates token immediately and prevents reuse")
    void testPasswordResetInvalidatesTokenPermanently() {
        String token = UUID.randomUUID().toString();
        testUser.setResetPasswordToken(token);
        testUser.setResetPasswordTokenExpiry(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(30));

        when(userRepository.findByResetPasswordToken(token)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.encode("NewSecret123!")).thenReturn("bcrypt_new_secret");

        // Reset password with token
        ResponseEntity<?> resetResp = authApiController.resetPassword(Map.of(
                "token", token,
                "newPassword", "NewSecret123!",
                "confirmPassword", "NewSecret123!"
        ));

        assertEquals(HttpStatus.OK, resetResp.getStatusCode());
        assertEquals("bcrypt_new_secret", testUser.getPasswordHash());

        // Token must be null in user entity
        assertNull(testUser.getResetPasswordToken());
        assertNull(testUser.getResetPasswordTokenExpiry());

        // Now simulate findByResetPasswordToken returning empty because token is cleared
        when(userRepository.findByResetPasswordToken(token)).thenReturn(Optional.empty());

        // Attempting to validate or use the same token again MUST be rejected
        ResponseEntity<?> secondValidation = authApiController.validateResetToken(token);
        assertEquals(HttpStatus.NOT_FOUND, secondValidation.getStatusCode());

        ResponseEntity<?> secondReset = authApiController.resetPassword(Map.of(
                "token", token,
                "newPassword", "AnotherPassword789!",
                "confirmPassword", "AnotherPassword789!"
        ));
        assertEquals(HttpStatus.BAD_REQUEST, secondReset.getStatusCode());
    }
}
