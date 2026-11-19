package com.smarthire.controller;

import com.smarthire.dto.HrEmailSettingDTO;
import com.smarthire.entity.HrEmailSetting;
import com.smarthire.entity.User;
import com.smarthire.repository.HrEmailSettingRepository;
import com.smarthire.repository.UserRepository;
import com.smarthire.security.EncryptionService;
import com.smarthire.security.SecurityUtils;
import com.smarthire.service.DynamicEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/hr/email-settings")
@RequiredArgsConstructor
@Slf4j
public class HrEmailSettingsController {

    private final HrEmailSettingRepository hrEmailSettingRepository;
    private final DynamicEmailService dynamicEmailService;
    private final EncryptionService encryptionService;
    private final UserRepository userRepository;

    private User getAuthenticatedHr() {
        User user = SecurityUtils.getCurrentUser(userRepository).orElse(null);
        if (user == null || (!"HR".equalsIgnoreCase(user.getRole()) && !"RECRUITER".equalsIgnoreCase(user.getRole()))) {
            return null;
        }
        return user;
    }

    /**
     * GET /api/hr/email-settings
     * Returns configuration status WITHOUT exposing the Gmail App Password.
     */
    @GetMapping
    public ResponseEntity<?> getEmailSettings() {
        try {
            User hr = getAuthenticatedHr();
            if (hr == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "configured", false,
                        "message", "Unauthorized. Only HR recruiters can access email settings."
                ));
            }

            Optional<HrEmailSetting> settingOpt = hrEmailSettingRepository.findFirstByHrUserIdOrderByIdDesc(hr.getId());
            if (settingOpt.isEmpty() || !Boolean.TRUE.equals(settingOpt.get().getIsActive())) {
                Map<String, Object> emptyMap = new LinkedHashMap<>();
                emptyMap.put("configured", false);
                emptyMap.put("active", false);
                emptyMap.put("isVerified", false);
                emptyMap.put("senderEmail", "");
                emptyMap.put("senderName", (hr.getFullName() != null) ? hr.getFullName() : "");
                emptyMap.put("setting", null);
                return ResponseEntity.ok(emptyMap);
            }

            HrEmailSetting setting = settingOpt.get();
            Map<String, Object> responseMap = new LinkedHashMap<>();
            responseMap.put("configured", true);
            responseMap.put("active", Boolean.TRUE.equals(setting.getIsActive()));
            responseMap.put("isVerified", Boolean.TRUE.equals(setting.getIsVerified()));
            responseMap.put("senderEmail", setting.getSenderEmail() != null ? setting.getSenderEmail() : "");
            responseMap.put("senderName", setting.getSenderName() != null ? setting.getSenderName() : "");
            responseMap.put("providerType", setting.getProviderType() != null ? setting.getProviderType() : "GMAIL_SMTP");
            responseMap.put("lastTestedAt", setting.getLastTestedAt() != null ? setting.getLastTestedAt().toString() : "");
            responseMap.put("maskedPassword", "••••••••••••••••");
            responseMap.put("setting", new LinkedHashMap<>(responseMap));

            return ResponseEntity.ok(responseMap);
        } catch (Exception ex) {
            log.error("Error retrieving HR email settings: ", ex);
            Map<String, Object> fallback = new LinkedHashMap<>();
            fallback.put("configured", false);
            fallback.put("active", false);
            fallback.put("isVerified", false);
            fallback.put("senderEmail", "");
            fallback.put("senderName", "");
            fallback.put("setting", null);
            return ResponseEntity.ok(fallback);
        }
    }

    /**
     * POST /api/hr/email-settings
     * Saves or initializes HR's Gmail SMTP configuration with AES-256-GCM encryption.
     */
    @PostMapping
    public ResponseEntity<?> saveEmailSettings(@RequestBody HrEmailSettingDTO dto) {
        try {
            User hr = getAuthenticatedHr();
            if (hr == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "success", false,
                        "message", "Unauthorized access. Only HR recruiters can configure email settings."
                ));
            }

            if (dto == null || dto.getSenderEmail() == null || dto.getSenderEmail().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Sender email address is required."
                ));
            }

            String cleanEmail = dto.getSenderEmail().trim().toLowerCase();
            if (!cleanEmail.contains("@") || cleanEmail.length() < 5) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Please enter a valid email address (e.g. yourname@gmail.com)."
                ));
            }

            Optional<HrEmailSetting> existingOpt = hrEmailSettingRepository.findFirstByHrUserIdOrderByIdDesc(hr.getId());
            String encryptedPassword;
            String rawPassword = null;

            if (dto.getAppPassword() != null && !dto.getAppPassword().isBlank()) {
                rawPassword = dto.getAppPassword().trim().replaceAll("\\s+", "");
                if (rawPassword.length() < 8) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "success", false,
                            "message", "Please enter a valid 16-character Google App Password or HTTP API Key (Brevo / Resend)."
                    ));
                }
                encryptedPassword = encryptionService.encrypt(rawPassword);
            } else if (existingOpt.isPresent() && existingOpt.get().getAppPassword() != null) {
                // Keep existing encrypted credentials on update
                encryptedPassword = existingOpt.get().getAppPassword();
            } else {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "App Password or API Key is required."
                ));
            }

            HrEmailSetting setting = existingOpt.orElseGet(() -> HrEmailSetting.builder().hrUserId(hr.getId()).build());

            setting.setSenderEmail(cleanEmail);
            setting.setAppPassword(encryptedPassword);
            setting.setSenderName(dto.getSenderName() != null && !dto.getSenderName().isBlank()
                    ? dto.getSenderName().trim()
                    : (hr.getFullName() != null ? hr.getFullName() : "SmartHire Recruiter"));
            setting.setIsActive(true);

            String provider = dto.getProviderType() != null && !dto.getProviderType().isBlank()
                    ? dto.getProviderType().trim().toUpperCase()
                    : (rawPassword != null ? dynamicEmailService.resolveProvider(rawPassword) : setting.getProviderType());
            setting.setProviderType(provider != null ? provider : "GMAIL_SMTP");

            if (dto.getAppPassword() != null && !dto.getAppPassword().isBlank()) {
                setting.setIsVerified(false); // New credentials should be re-verified
            }

            HrEmailSetting saved = hrEmailSettingRepository.save(setting);
            log.info("Encrypted and saved AES-256-GCM email settings ({}) for HR user ID [{}] ({})",
                    saved.getProviderType(), hr.getId(), saved.getSenderEmail());

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("success", true);
            resp.put("configured", true);
            resp.put("active", true);
            resp.put("isVerified", Boolean.TRUE.equals(saved.getIsVerified()));
            resp.put("providerType", saved.getProviderType());
            resp.put("senderEmail", saved.getSenderEmail());
            resp.put("senderName", saved.getSenderName());
            resp.put("maskedPassword", "••••••••••••••••");
            resp.put("setting", new LinkedHashMap<>(resp));
            resp.put("message", "SMTP settings saved successfully! Click 'Test Connection' to verify with Gmail.");

            return ResponseEntity.ok(resp);

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", ex.getMessage()));
        } catch (Exception ex) {
            log.error("Error saving HR email settings: ", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", ex.getClass().getSimpleName(),
                    "message", "Failed to save email settings: " + (ex.getMessage() != null ? ex.getMessage() : ex.toString())
            ));
        }
    }

    /**
     * PUT /api/hr/email-settings
     * Updates existing HR SMTP settings.
     */
    @PutMapping
    public ResponseEntity<?> updateEmailSettings(@RequestBody HrEmailSettingDTO dto) {
        return saveEmailSettings(dto);
    }

    /**
     * POST /api/hr/email-settings/test
     * Sends a live verification email to the HR's configured Gmail address to test authentication.
     */
    @PostMapping("/test")
    public ResponseEntity<?> testEmailSettings(@RequestBody(required = false) HrEmailSettingDTO dto) {
        User hr = getAuthenticatedHr();
        if (hr == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("success", false, "message", "Unauthorized."));
        }

        String emailToTest = null;
        String rawPasswordToTest = null;
        String senderNameToTest = null;

        // If credentials supplied in request body, test them directly
        if (dto != null && dto.getSenderEmail() != null && !dto.getSenderEmail().isBlank()
                && dto.getAppPassword() != null && !dto.getAppPassword().isBlank()) {
            emailToTest = dto.getSenderEmail().trim();
            rawPasswordToTest = dto.getAppPassword().trim();
            senderNameToTest = dto.getSenderName() != null ? dto.getSenderName().trim() : hr.getFullName();
        } else {
            // Otherwise, retrieve and decrypt saved credentials from database
            Optional<HrEmailSetting> settingOpt = hrEmailSettingRepository.findFirstByHrUserIdOrderByIdDesc(hr.getId());
            if (settingOpt.isEmpty() || !Boolean.TRUE.equals(settingOpt.get().getIsActive())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "result", "CONFIGURATION_MISSING",
                        "message", "No active SMTP settings found. Please configure your Gmail and App Password first."
                ));
            }
            HrEmailSetting setting = settingOpt.get();
            emailToTest = setting.getSenderEmail();
            rawPasswordToTest = encryptionService.decrypt(setting.getAppPassword());
            senderNameToTest = setting.getSenderName() != null ? setting.getSenderName() : hr.getFullName();
        }

        if (rawPasswordToTest == null || rawPasswordToTest.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "result", "CREDENTIALS_EMPTY",
                    "message", "Gmail App Password is not set. Please re-enter your 16-character App Password."
            ));
        }

        try {
            boolean testSuccess = dynamicEmailService.testSmtpConnection(emailToTest, rawPasswordToTest, senderNameToTest);
            if (testSuccess) {
                // Mark verified in database
                hrEmailSettingRepository.findFirstByHrUserIdOrderByIdDesc(hr.getId()).ifPresent(s -> {
                    s.setIsVerified(true);
                    s.setLastTestedAt(LocalDateTime.now());
                    hrEmailSettingRepository.save(s);
                });

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "result", "SUCCESS",
                        "verified", true,
                        "message", "SMTP Connection verified successfully! A test email has been sent to " + emailToTest
                ));
            } else {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "result", "SMTP_ERROR",
                        "message", "SMTP verification failed. Check credentials and retry."
                ));
            }
        } catch (org.springframework.mail.MailAuthenticationException ex) {
            log.error("HR SMTP authentication failed for [{}]: {}", emailToTest, ex.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "result", "INVALID_CREDENTIALS",
                    "message", "Gmail SMTP authentication failed. Please verify that 2-Step Verification is active and you used a valid 16-character App Password."
            ));
        } catch (Exception ex) {
            log.error("HR SMTP test failed for [{}]: {}", emailToTest, ex.getMessage());
            String msg = ex.getMessage() != null ? ex.getMessage() : "Unknown error";
            String code = "SMTP_ERROR";
            if (msg.toLowerCase().contains("authentication") || msg.toLowerCase().contains("password") || msg.toLowerCase().contains("credential")) {
                code = "INVALID_CREDENTIALS";
            } else if (msg.toLowerCase().contains("timeout") || msg.toLowerCase().contains("connect") || msg.toLowerCase().contains("unreachable")) {
                code = "CONNECTION_FAILED";
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "result", code,
                    "message", msg
            ));
        }
    }

    /**
     * DELETE /api/hr/email-settings
     * Permanently deletes HR's custom SMTP configuration and resets status.
     */
    @DeleteMapping
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteEmailSettings() {
        User hr = getAuthenticatedHr();
        if (hr == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized."));
        }

        hrEmailSettingRepository.deleteByHrUserId(hr.getId());
        log.info("Permanently deleted SMTP configuration for HR user ID [{}]", hr.getId());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "configured", false,
                "active", false,
                "message", "Custom SMTP configuration deleted successfully. Reverted to unconfigured status."
        ));
    }
}
