package com.smarthire.service;

import com.smarthire.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemEmailService {

    private final HttpEmailService httpEmailService;

    @Value("${system.brevo.api.key:${SYSTEM_BREVO_API_KEY:${BREVO_API_KEY:}}}")
    private String brevoApiKey;

    @Value("${system.sender.email:${SYSTEM_SENDER_EMAIL:rakeshrathore0724@gmail.com}}")
    private String senderEmail;

    @Value("${system.sender.name:${SYSTEM_SENDER_NAME:SmartHire Platform}}")
    private String senderName;

    @Value("${app.frontend.url:${APP_FRONTEND_URL:https://resume-analyzer-sigma-nine.vercel.app}}")
    private String frontendUrl;

    public String getEffectiveApiKey() {
        if (brevoApiKey != null && !brevoApiKey.isBlank()) {
            return brevoApiKey.trim();
        }
        String envKey = System.getenv("SYSTEM_BREVO_API_KEY");
        if (envKey != null && !envKey.isBlank()) return envKey.trim();
        String fallback = System.getenv("BREVO_API_KEY");
        return fallback != null ? fallback.trim() : null;
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
     * Sends an email verification link to newly registered HR recruiters or Job Seekers.
     */
    public boolean sendVerificationEmail(User user, String token) {
        String apiKey = getEffectiveApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("System Brevo API Key not configured in Render environment (SYSTEM_BREVO_API_KEY / BREVO_API_KEY). Skipping verification email for [{}]", user.getEmail());
            return false;
        }

        String recipientEmail = user.getEmail().trim().toLowerCase();
        String recipientName = user.getFullName() != null && !user.getFullName().isBlank() ? user.getFullName().trim() : "SmartHire Member";
        String verifyUrl = getEffectiveFrontendUrl() + "/verify-email?token=" + token;

        String subject = "Verify Your SmartHire Account - " + recipientName;
        String html = buildVerificationEmailHtml(recipientName, verifyUrl, user.getRole());

        try {
            log.info("SystemEmailService: Sending registration verification email to [{}] via Port 443", recipientEmail);
            return httpEmailService.sendViaBrevo(
                    apiKey,
                    getEffectiveSenderEmail(),
                    getEffectiveSenderName(),
                    recipientEmail,
                    recipientName,
                    subject,
                    html
            );
        } catch (Exception ex) {
            log.error("SystemEmailService: Failed to deliver verification email to [{}]: {}", recipientEmail, ex.getMessage());
            return false;
        }
    }

    /**
     * Sends a secure password reset link to an HR recruiter or Job Seeker.
     */
    public boolean sendPasswordResetEmail(User user, String token) {
        String apiKey = getEffectiveApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("System Brevo API Key not configured in Render environment (SYSTEM_BREVO_API_KEY / BREVO_API_KEY). Skipping password reset email for [{}]", user.getEmail());
            return false;
        }

        String recipientEmail = user.getEmail().trim().toLowerCase();
        String recipientName = user.getFullName() != null && !user.getFullName().isBlank() ? user.getFullName().trim() : "SmartHire Member";
        String resetUrl = getEffectiveFrontendUrl() + "/reset-password?token=" + token;

        String subject = "Reset Your SmartHire Account Password";
        String html = buildPasswordResetEmailHtml(recipientName, resetUrl);

        try {
            log.info("SystemEmailService: Sending password reset email to [{}] via Port 443", recipientEmail);
            return httpEmailService.sendViaBrevo(
                    apiKey,
                    getEffectiveSenderEmail(),
                    getEffectiveSenderName(),
                    recipientEmail,
                    recipientName,
                    subject,
                    html
            );
        } catch (Exception ex) {
            log.error("SystemEmailService: Failed to deliver password reset email to [{}]: {}", recipientEmail, ex.getMessage());
            return false;
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
                            Account Security &amp; Identity Verification
                          </div>
                        </td>
                      </tr>

                      <!-- Body Content -->
                      <tr>
                        <td style="padding: 36px 36px 28px 36px;">
                          <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 700;">
                            Welcome to SmartHire, %s! 👋
                          </h2>
                          <p style="margin: 0 0 18px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                            Thank you for joining SmartHire (%s). To protect your account and unlock AI-powered resume analysis, candidate screening, and job benchmarks, please confirm your email address.
                          </p>
                          
                          <!-- CTA Button -->
                          <div style="text-align: center; margin: 32px 0;">
                            <a href="%s" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #FF7900 0%%, #EA580C 100%%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 8px; box-shadow: 0 4px 12px rgba(255, 121, 0, 0.35);">
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
                            🔒 <strong>This link is valid for 1 hour.</strong> If you did not request a password reset, no action is needed — your account remains safe and protected.
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
