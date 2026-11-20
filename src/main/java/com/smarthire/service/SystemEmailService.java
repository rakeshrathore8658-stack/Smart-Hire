package com.smarthire.service;

import com.smarthire.entity.HrEmailSetting;
import com.smarthire.entity.User;
import com.smarthire.repository.HrEmailSettingRepository;
import com.smarthire.security.EncryptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemEmailService {

    private final HttpEmailService httpEmailService;
    private final ObjectProvider<HrEmailSettingRepository> hrEmailSettingRepository;
    private final ObjectProvider<EncryptionService> encryptionService;

    @Value("${system.brevo.api.key:${SYSTEM_BREVO_API_KEY:${BREVO_API_KEY:}}}")
    private String brevoApiKey;

    @Value("${system.resend.api.key:${SYSTEM_RESEND_API_KEY:${RESEND_API_KEY:}}}")
    private String resendApiKey;

    @Value("${system.sender.email:${SYSTEM_SENDER_EMAIL:rakeshrathore0724@gmail.com}}")
    private String senderEmail;

    @Value("${system.sender.name:${SYSTEM_SENDER_NAME:SmartHire Platform}}")
    private String senderName;

    @Value("${app.frontend.url:${APP_FRONTEND_URL:https://resume-analyzer-sigma-nine.vercel.app}}")
    private String frontendUrl;

    public record EffectiveConfig(
            String provider,     // "BREVO" | "RESEND"
            String apiKey,
            String senderEmail,
            String senderName,
            String source        // "RENDER_ENV" | "DATABASE_FALLBACK"
    ) {}

    public record EmailSendResult(boolean isSuccess, String message) {}

    /**
     * Intelligently resolves the active email credentials.
     * Priority:
     * 1. Render Environment Variables (BREVO_API_KEY, RESEND_API_KEY, etc.)
     * 2. Database Fallback (active verified row from hr_email_settings table)
     */
    public EffectiveConfig resolveEffectiveConfig() {
        // --- 1. Check Render Environment Variables ---
        String envBrevo = getEnvOrProperty(brevoApiKey, "SYSTEM_BREVO_API_KEY", "BREVO_API_KEY");
        String envResend = getEnvOrProperty(resendApiKey, "SYSTEM_RESEND_API_KEY", "RESEND_API_KEY");
        String envGeneric = getEnvOrProperty(null, "SYSTEM_EMAIL_API_KEY", "EMAIL_API_KEY", "MAIL_API_KEY");

        String selectedKey = null;
        String provider = "BREVO";

        if (envBrevo != null && !envBrevo.isBlank()) {
            selectedKey = envBrevo.trim();
            provider = selectedKey.startsWith("re_") ? "RESEND" : "BREVO";
        } else if (envResend != null && !envResend.isBlank()) {
            selectedKey = envResend.trim();
            provider = "RESEND";
        } else if (envGeneric != null && !envGeneric.isBlank()) {
            selectedKey = envGeneric.trim();
            provider = selectedKey.startsWith("re_") ? "RESEND" : "BREVO";
        }

        if (selectedKey != null && !selectedKey.isBlank()) {
            return new EffectiveConfig(
                    provider,
                    selectedKey,
                    getEffectiveSenderEmail(),
                    getEffectiveSenderName(),
                    "RENDER_ENV"
            );
        }

        // --- 2. Fallback to Database Settings (hr_email_settings) ---
        HrEmailSettingRepository repo = hrEmailSettingRepository.getIfAvailable();
        EncryptionService enc = encryptionService.getIfAvailable();

        if (repo != null && enc != null) {
            try {
                Optional<HrEmailSetting> settingOpt = repo.findFirstByIsActiveTrueAndIsVerifiedTrueOrderByIdDesc();
                if (settingOpt.isEmpty()) {
                    settingOpt = repo.findFirstByIsActiveTrueOrderByIdDesc();
                }

                if (settingOpt.isPresent()) {
                    HrEmailSetting setting = settingOpt.get();
                    String rawPassword = setting.getAppPassword();
                    String decryptedKey = enc.decrypt(rawPassword);

                    if (decryptedKey != null && !decryptedKey.isBlank()) {
                        String dbProvider = setting.getProviderType();
                        String resolvedProvider = "BREVO";
                        if ("RESEND_API".equalsIgnoreCase(dbProvider) || decryptedKey.trim().startsWith("re_")) {
                            resolvedProvider = "RESEND";
                        } else if ("BREVO_API".equalsIgnoreCase(dbProvider) || decryptedKey.trim().startsWith("xkeysib-")) {
                            resolvedProvider = "BREVO";
                        } else if (decryptedKey.trim().startsWith("re_")) {
                            resolvedProvider = "RESEND";
                        }

                        String resolvedSender = (setting.getSenderEmail() != null && !setting.getSenderEmail().isBlank())
                                ? setting.getSenderEmail().trim()
                                : getEffectiveSenderEmail();

                        String resolvedName = (setting.getSenderName() != null && !setting.getSenderName().isBlank())
                                ? setting.getSenderName().trim()
                                : getEffectiveSenderName();

                        log.info("SystemEmailService: Using database fallback email credentials (Provider: {}, Sender: {})",
                                resolvedProvider, resolvedSender);

                        return new EffectiveConfig(
                                resolvedProvider,
                                decryptedKey.trim(),
                                resolvedSender,
                                resolvedName,
                                "DATABASE_FALLBACK"
                        );
                    }
                }
            } catch (Exception ex) {
                log.warn("SystemEmailService: Error checking database fallback credentials: {}", ex.getMessage());
            }
        }

        return null;
    }

    private String getEnvOrProperty(String propValue, String... envNames) {
        if (propValue != null && !propValue.isBlank()) {
            return propValue.trim();
        }
        for (String env : envNames) {
            String val = System.getenv(env);
            if (val != null && !val.isBlank()) {
                return val.trim();
            }
        }
        return null;
    }

    public String getEffectiveSenderEmail() {
        if (senderEmail != null && !senderEmail.isBlank()) return senderEmail.trim();
        String envSender = System.getenv("SYSTEM_SENDER_EMAIL");
        return (envSender != null && !envSender.isBlank()) ? envSender.trim() : "rakeshrathore0724@gmail.com";
    }

    public String getEffectiveSenderName() {
        if (senderName != null && !senderName.isBlank()) return senderName.trim();
        String envName = System.getenv("SYSTEM_SENDER_NAME");
        return (envName != null && !envName.isBlank()) ? envName.trim() : "SmartHire Platform";
    }

    public String getEffectiveFrontendUrl() {
        String base = (frontendUrl != null && !frontendUrl.isBlank()) ? frontendUrl.trim() : "https://resume-analyzer-sigma-nine.vercel.app";
        String envUrl = System.getenv("APP_FRONTEND_URL");
        if (envUrl != null && !envUrl.isBlank()) base = envUrl.trim();
        if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        return base;
    }

    /**
     * Dispatches an HTML email using the resolved provider (Brevo or Resend).
     */
    public boolean dispatchEmail(String recipientEmail, String recipientName, String subject, String htmlContent) {
        EffectiveConfig config = resolveEffectiveConfig();
        if (config == null || config.apiKey() == null || config.apiKey().isBlank()) {
            throw new IllegalStateException("Email delivery service is not configured. Please add BREVO_API_KEY in Render environment variables or verify email in Settings.");
        }

        log.info("SystemEmailService: Dispatching email to [{}] via {} (Source: {}, Sender: {})",
                recipientEmail, config.provider(), config.source(), config.senderEmail());

        if ("RESEND".equalsIgnoreCase(config.provider())) {
            return httpEmailService.sendViaResend(
                    config.apiKey(),
                    config.senderEmail(),
                    config.senderName(),
                    recipientEmail,
                    subject,
                    htmlContent
            );
        } else {
            return httpEmailService.sendViaBrevo(
                    config.apiKey(),
                    config.senderEmail(),
                    config.senderName(),
                    recipientEmail,
                    recipientName,
                    subject,
                    htmlContent
            );
        }
    }

    /**
     * Sends an email verification link to newly registered HR recruiters or Job Seekers.
     */
    public EmailSendResult sendVerificationEmail(User user, String token) {
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            return new EmailSendResult(false, "User email is missing.");
        }

        EffectiveConfig config = resolveEffectiveConfig();
        if (config == null) {
            String warning = "Email credentials not found. Please set BREVO_API_KEY in Render Environment Variables or configure Email Settings in Dashboard.";
            log.warn("SystemEmailService: {} Skipping verification email for [{}]", warning, user.getEmail());
            return new EmailSendResult(false, warning);
        }

        String recipientEmail = user.getEmail().trim().toLowerCase();
        String recipientName = user.getFullName() != null && !user.getFullName().isBlank() ? user.getFullName().trim() : "SmartHire Member";
        String verifyUrl = getEffectiveFrontendUrl() + "/verify-email?token=" + token;

        String subject = "Verify Your SmartHire Account - " + recipientName;
        String html = buildVerificationEmailHtml(recipientName, verifyUrl, user.getRole());

        try {
            boolean sent = dispatchEmail(recipientEmail, recipientName, subject, html);
            if (sent) {
                log.info("SystemEmailService: Successfully delivered verification email to [{}]", recipientEmail);
                return new EmailSendResult(true, "Verification email delivered to " + recipientEmail);
            } else {
                return new EmailSendResult(false, "Delivery failed via " + config.provider());
            }
        } catch (Exception ex) {
            log.error("SystemEmailService: Failed to deliver verification email to [{}]: {}", recipientEmail, ex.getMessage());
            return new EmailSendResult(false, ex.getMessage());
        }
    }

    /**
     * Sends a secure password reset link to an HR recruiter or Job Seeker.
     */
    public EmailSendResult sendPasswordResetEmail(User user, String token) {
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            return new EmailSendResult(false, "User email is missing.");
        }

        EffectiveConfig config = resolveEffectiveConfig();
        if (config == null) {
            String warning = "Email credentials not found. Please set BREVO_API_KEY in Render Environment Variables.";
            log.warn("SystemEmailService: {} Skipping password reset email for [{}]", warning, user.getEmail());
            return new EmailSendResult(false, warning);
        }

        String recipientEmail = user.getEmail().trim().toLowerCase();
        String recipientName = user.getFullName() != null && !user.getFullName().isBlank() ? user.getFullName().trim() : "SmartHire Member";
        String resetUrl = getEffectiveFrontendUrl() + "/reset-password?token=" + token;

        String subject = "Reset Your SmartHire Account Password";
        String html = buildPasswordResetEmailHtml(recipientName, resetUrl);

        try {
            boolean sent = dispatchEmail(recipientEmail, recipientName, subject, html);
            if (sent) {
                log.info("SystemEmailService: Successfully delivered password reset email to [{}]", recipientEmail);
                return new EmailSendResult(true, "Password reset email delivered to " + recipientEmail);
            } else {
                return new EmailSendResult(false, "Delivery failed via " + config.provider());
            }
        } catch (Exception ex) {
            log.error("SystemEmailService: Failed to deliver password reset email to [{}]: {}", recipientEmail, ex.getMessage());
            return new EmailSendResult(false, ex.getMessage());
        }
    }

    private String buildVerificationEmailHtml(String name, String verifyUrl, String role) {
        String portalLabel = "HR".equalsIgnoreCase(role) ? "Recruiter & Talent Portal" : "Job Seeker Career Portal";
        return """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Verify Your SmartHire Account</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="table-layout: fixed; background-color: #f8fafc; padding: 40px 15px;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 580px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                      
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #203B60 0%%, #0f172a 100%%); padding: 32px 36px; text-align: left;">
                          <div style="font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                            <span style="color: #FF7900;">///</span> SmartHire<span style="color: #FF7900;">.</span>
                          </div>
                          <div style="color: #94a3b8; font-size: 13px; font-weight: 600; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Account Activation &amp; Email Verification
                          </div>
                        </td>
                      </tr>

                      <!-- Body Content -->
                      <tr>
                        <td style="padding: 36px 36px 28px 36px;">
                          <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 700;">
                            Welcome to SmartHire, %s! 👋
                          </h2>
                          <p style="margin: 0 0 16px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                            Thank you for creating your <strong>%s</strong> account on SmartHire.
                            To activate your workspace and start using all recruitment tools, please verify your email address below.
                          </p>
                          
                          <!-- CTA Button -->
                          <div style="text-align: center; margin: 32px 0;">
                            <a href="%s" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #FF7900 0%%, #EA580C 100%%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 121, 0, 0.35);">
                              Verify My Email Address
                            </a>
                          </div>

                          <p style="margin: 0 0 12px 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                            Or paste this URL directly in your browser:
                          </p>
                          <div style="background-color: #f1f5f9; padding: 10px 14px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px; color: #2563eb; margin-bottom: 24px;">
                            %s
                          </div>

                          <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                            ⏱️ <strong>This verification link expires in 24 hours.</strong> If you did not create a SmartHire account, you can safely ignore this email.
                          </div>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 36px; text-align: center; color: #94a3b8; font-size: 12px;">
                          &copy; 2026 SmartHire. AI-Powered Recruitment &amp; ATS Platform.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(name, portalLabel, verifyUrl, verifyUrl);
    }

    private String buildPasswordResetEmailHtml(String name, String resetUrl) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset Your SmartHire Password</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="table-layout: fixed; background-color: #f8fafc; padding: 40px 15px;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 580px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                      
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #203B60 0%%, #0f172a 100%%); padding: 32px 36px; text-align: left;">
                          <div style="font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                            <span style="color: #FF7900;">///</span> SmartHire<span style="color: #FF7900;">.</span>
                          </div>
                          <div style="color: #94a3b8; font-size: 13px; font-weight: 600; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Password Reset Request
                          </div>
                        </td>
                      </tr>

                      <!-- Body Content -->
                      <tr>
                        <td style="padding: 36px 36px 28px 36px;">
                          <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 700;">
                            Password Reset Request
                          </h2>
                          <p style="margin: 0 0 18px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                            Hello %s, we received a request to reset your SmartHire account password. Click the button below to select a new secure password.
                          </p>
                          
                          <!-- CTA Button -->
                          <div style="text-align: center; margin: 32px 0;">
                            <a href="%s" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%%, #1d4ed8 100%%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
                              Reset My Password
                            </a>
                          </div>

                          <p style="margin: 0 0 12px 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                            Or paste this link into your browser:
                          </p>
                          <div style="background-color: #f1f5f9; padding: 10px 14px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px; color: #2563eb; margin-bottom: 24px;">
                            %s
                          </div>

                          <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                            ⏱️ <strong>This secure reset link is valid for 30 minutes and can only be used once.</strong> Once your password is updated, this link is immediately deactivated. If you did not request a password reset, no action is needed — your account remains safe and protected.
                          </div>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 36px; text-align: center; color: #94a3b8; font-size: 12px;">
                          &copy; 2026 SmartHire. AI-Powered Recruitment &amp; ATS Platform.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(name, resetUrl, resetUrl);
    }
}
