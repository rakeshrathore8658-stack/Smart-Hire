package com.smarthire.service;

import com.smarthire.entity.HrEmailSetting;
import com.smarthire.entity.NotificationDeliveryLog;
import com.smarthire.entity.NotificationEventType;
import com.smarthire.entity.NotificationQueue;
import com.smarthire.entity.User;
import com.smarthire.repository.HrEmailSettingRepository;
import com.smarthire.repository.NotificationDeliveryLogRepository;
import com.smarthire.repository.NotificationQueueRepository;
import com.smarthire.repository.UserRepository;
import com.smarthire.security.EncryptionService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Properties;

@Service
@RequiredArgsConstructor
@Slf4j
public class DynamicEmailService {

    private final HrEmailSettingRepository hrEmailSettingRepository;
    private final EncryptionService encryptionService;
    private final NotificationQueueRepository queueRepository;
    private final NotificationDeliveryLogRepository deliveryLogRepository;
    private final UserRepository userRepository;

    /**
     * Programmatically creates a JavaMailSenderImpl instance at runtime
     * using the specific HR recruiter's decrypted Gmail credentials.
     */
    public JavaMailSenderImpl createMailSender(String senderEmail, String appPassword) {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost("smtp.gmail.com");
        mailSender.setPort(587);
        mailSender.setUsername(senderEmail.trim());

        // Strip whitespace from 16-character Google App Password
        mailSender.setPassword(appPassword.trim().replaceAll("\\s+", ""));

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");

        return mailSender;
    }

    /**
     * Tests and verifies HR's Gmail SMTP configuration by sending a verification email to self.
     * Encrypts and persists verified state upon success.
     */
    public boolean testSmtpConnection(String senderEmail, String rawAppPassword, String senderName) {
        if (senderEmail == null || senderEmail.isBlank() || rawAppPassword == null || rawAppPassword.isBlank()) {
            throw new IllegalArgumentException("Both sender Gmail address and 16-digit App Password are required.");
        }

        JavaMailSenderImpl mailSender = createMailSender(senderEmail, rawAppPassword);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String fromName = (senderName != null && !senderName.isBlank()) ? senderName.trim() : "SmartHire Notifications";
            helper.setFrom(senderEmail.trim(), fromName);
            helper.setTo(senderEmail.trim());
            helper.setSubject("SmartHire - Gmail SMTP Notification Test");

            String testBody = buildHtmlCard(
                    "SMTP Connection Verified Successfully!",
                    "This test email confirms that your Gmail SMTP credentials are valid and active. SmartHire will now use your Gmail account (" + senderEmail.trim() + ") to send real-time candidate interview invitations, status updates, and shortlist notifications.",
                    null,
                    "Verified & Active",
                    fromName
            );

            helper.setText(testBody, true);
            mailSender.send(message);
            log.info("Successfully verified SMTP connection for HR email: {}", senderEmail);
            return true;

        } catch (MailAuthenticationException ex) {
            log.error("Authentication failed for HR SMTP [{}]: {}", senderEmail, ex.getMessage());
            throw new RuntimeException("Gmail SMTP authentication failed. Please verify that 2-Step Verification is active on your Google Account and you generated a valid 16-character 'App Password'.");
        } catch (MessagingException | UnsupportedEncodingException ex) {
            log.error("SMTP error for HR email [{}]: {}", senderEmail, ex.getMessage());
            throw new RuntimeException("Failed to establish secure SMTP connection with Gmail: " + ex.getMessage());
        } catch (Exception ex) {
            log.error("Unexpected error during SMTP test for [{}]: {}", senderEmail, ex.getMessage());
            throw new RuntimeException("SMTP test failed: " + ex.getMessage());
        }
    }

    /**
     * Sends an email dynamically using the job's recruiter credentials.
     * Overloaded method defaults to recording the email into the HR recruiter's history.
     */
    public boolean sendEmailFromHr(Long hrUserId, String toEmail, String subject, String bodyHtml) {
        return sendEmailFromHr(hrUserId, toEmail, null, null, null, subject, bodyHtml, true);
    }

    /**
     * Sends an email dynamically and conditionally records it into the HR recruiter's history.
     */
    public boolean sendEmailFromHr(
            Long hrUserId,
            String toEmail,
            String candName,
            Long applicationId,
            NotificationEventType eventType,
            String subject,
            String bodyHtml,
            boolean recordHistory
    ) {
        if (hrUserId == null || toEmail == null || toEmail.isBlank()) {
            log.warn("Cannot send email: hrUserId or recipient email missing");
            return false;
        }

        String cleanEmail = toEmail.trim().toLowerCase();
        String safeSubject = (subject != null && !subject.isBlank()) ? subject.trim() : "SmartHire Recruitment Update";
        String safeBody = (bodyHtml != null && !bodyHtml.isBlank()) ? bodyHtml : "<p>You have a new update regarding your recruitment application.</p>";
        NotificationEventType effectiveEvent = (eventType != null) ? eventType : NotificationEventType.INTERVIEW_SCHEDULED;
        String cleanCandName = (candName != null && !candName.isBlank()) ? candName.trim() : "Candidate";

        Optional<HrEmailSetting> settingOpt = hrEmailSettingRepository.findFirstByHrUserIdAndIsActiveTrueOrderByIdDesc(hrUserId);
        if (settingOpt.isEmpty()) {
            log.info("No active HrEmailSetting configured for HR User ID [{}]. Skipping custom SMTP notification.", hrUserId);
            if (recordHistory) {
                recordDirectEmailHistory(hrUserId, cleanEmail, cleanCandName, applicationId, effectiveEvent, safeSubject, safeBody, false, "No active HR SMTP credentials configured");
            }
            return false;
        }

        HrEmailSetting setting = settingOpt.get();
        if (setting.getAppPassword() == null || setting.getAppPassword().isBlank()) {
            log.warn("HR email setting for user [{}] has no password configured", hrUserId);
            if (recordHistory) {
                recordDirectEmailHistory(hrUserId, cleanEmail, cleanCandName, applicationId, effectiveEvent, safeSubject, safeBody, false, "HR SMTP App Password missing");
            }
            return false;
        }

        // Decrypt password using AES-256-GCM
        String decryptedPassword = encryptionService.decrypt(setting.getAppPassword());

        try {
            JavaMailSenderImpl mailSender = createMailSender(setting.getSenderEmail(), decryptedPassword);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String senderName = (setting.getSenderName() != null && !setting.getSenderName().isBlank())
                    ? setting.getSenderName().trim()
                    : "SmartHire Hiring Team";

            helper.setFrom(setting.getSenderEmail().trim(), senderName);
            helper.setTo(cleanEmail);
            helper.setSubject(safeSubject);
            helper.setText(safeBody, true);

            mailSender.send(message);
            log.info("Email sent from HR [{}] to candidate [{}] - Subject: '{}'", setting.getSenderEmail(), cleanEmail, safeSubject);

            if (recordHistory) {
                recordDirectEmailHistory(hrUserId, cleanEmail, cleanCandName, applicationId, effectiveEvent, safeSubject, safeBody, true, "Delivered via dynamic SMTP (" + setting.getSenderEmail() + ")");
            }
            return true;

        } catch (Exception ex) {
            log.error("Failed to send dynamic email from HR [{}] to [{}]: {}", setting.getSenderEmail(), cleanEmail, ex.getMessage());
            if (recordHistory) {
                recordDirectEmailHistory(hrUserId, cleanEmail, cleanCandName, applicationId, effectiveEvent, safeSubject, safeBody, false, ex.getMessage());
            }
            return false;
        }
    }

    /**
     * Persists a direct email record into NotificationQueue and NotificationDeliveryLog
     * strictly mapped to the initiating HR recruiter.
     */
    private void recordDirectEmailHistory(
            Long hrUserId,
            String recipientEmail,
            String recipientName,
            Long applicationId,
            NotificationEventType eventType,
            String subject,
            String bodyHtml,
            boolean success,
            String details
    ) {
        try {
            Long candidateUserId = null;
            if (userRepository != null) {
                candidateUserId = userRepository.findByEmail(recipientEmail)
                        .map(User::getId)
                        .orElse(null);
            }

            String eventId = eventType.name() + "_" + hrUserId + "_" + (applicationId != null ? applicationId : "0") + "_" + System.currentTimeMillis();

            NotificationQueue queueItem = NotificationQueue.builder()
                    .eventId(eventId)
                    .hrUserId(hrUserId)
                    .recipientUserId(candidateUserId)
                    .recipientEmail(recipientEmail)
                    .recipientName(recipientName)
                    .recipientType("CANDIDATE")
                    .applicationId(applicationId)
                    .eventType(eventType)
                    .channel("EMAIL")
                    .subject(subject)
                    .content(bodyHtml)
                    .status(success ? "SENT" : "FAILED")
                    .retryCount(0)
                    .maxRetries(1)
                    .errorMessage(success ? null : details)
                    .createdAt(LocalDateTime.now())
                    .processedAt(LocalDateTime.now())
                    .build();

            NotificationQueue savedQueue = queueRepository.save(queueItem);

            NotificationDeliveryLog deliveryLog = NotificationDeliveryLog.builder()
                    .queueId(savedQueue.getId())
                    .hrUserId(hrUserId)
                    .recipientEmail(recipientEmail)
                    .eventType(eventType)
                    .channel("EMAIL")
                    .status(success ? "SUCCESS" : "FAILURE")
                    .attemptNumber(1)
                    .details(details)
                    .createdAt(LocalDateTime.now())
                    .build();

            deliveryLogRepository.save(deliveryLog);
            log.info("Direct email recorded into history for HR [{}] -> [{}] (status: {})", hrUserId, recipientEmail, success ? "SENT" : "FAILED");
        } catch (Exception recEx) {
            log.warn("Could not record direct email history: {}", recEx.getMessage());
        }
    }

    // ==========================================
    // NOTIFICATION EVENT TEMPLATES (Feature 2.3)
    // ==========================================

    public boolean sendApplicationReceived(Long hrUserId, String candName, String candEmail, String jobTitle, String companyName, double atsScore) {
        String subject = "Application Received: " + jobTitle + " at " + companyName;
        String body = buildHtmlCard(
                "Application Received",
                "Hello " + candName + ",<br><br>Thank you for applying for the <strong>" + jobTitle + "</strong> position at <strong>" + companyName + "</strong>. We have received your application and resume. Our automated screening has analyzed your profile against industry benchmarks (ATS Score: <strong>" + String.format("%.1f", atsScore) + "%</strong>).<br><br>Our recruitment team is reviewing your profile and will update you soon.",
                "View Application",
                "Application ID Registered",
                companyName
        );
        return sendEmailFromHr(hrUserId, candEmail, candName, null, NotificationEventType.NEW_APPLICATION_RECEIVED, subject, body, true);
    }

    public boolean sendCandidateShortlisted(Long hrUserId, String candName, String candEmail, String jobTitle, String companyName) {
        String subject = "Congratulations! You have been Shortlisted for " + jobTitle;
        String body = buildHtmlCard(
                "You are Shortlisted!",
                "Hello " + candName + ",<br><br>Great news! After reviewing your resume and technical qualifications, our hiring team has <strong>shortlisted</strong> you for the <strong>" + jobTitle + "</strong> opening at <strong>" + companyName + "</strong>.<br><br>We will reach out shortly with details regarding the upcoming interview rounds.",
                "Candidate Portal",
                "Status: Shortlisted",
                companyName
        );
        return sendEmailFromHr(hrUserId, candEmail, candName, null, NotificationEventType.CANDIDATE_SHORTLISTED, subject, body, true);
    }

    public boolean sendInterviewScheduled(Long hrUserId, String candName, String candEmail, String jobTitle, String companyName, String interviewDate, String meetingLink) {
        String subject = "Interview Scheduled: " + jobTitle + " at " + companyName;
        String linkHtml = (meetingLink != null && !meetingLink.isBlank())
                ? "<br><strong>Meeting Link:</strong> <a href='" + meetingLink + "' target='_blank'>" + meetingLink + "</a>"
                : "";
        String body = buildHtmlCard(
                "Interview Invitation",
                "Hello " + candName + ",<br><br>We are pleased to invite you for an interview for the <strong>" + jobTitle + "</strong> role at <strong>" + companyName + "</strong>.<br><br><strong>Interview Date & Time:</strong> " + interviewDate + linkHtml + "<br><br>Please be prepared 5 minutes prior to the scheduled time.",
                "Join / View Interview",
                "Interview Scheduled",
                companyName
        );
        return sendEmailFromHr(hrUserId, candEmail, candName, null, NotificationEventType.INTERVIEW_SCHEDULED, subject, body, true);
    }

    public boolean sendInterviewRescheduled(Long hrUserId, String candName, String candEmail, String jobTitle, String companyName, String newDate, String meetingLink) {
        String subject = "Interview Rescheduled: " + jobTitle + " at " + companyName;
        String linkHtml = (meetingLink != null && !meetingLink.isBlank())
                ? "<br><strong>Updated Meeting Link:</strong> <a href='" + meetingLink + "' target='_blank'>" + meetingLink + "</a>"
                : "";
        String body = buildHtmlCard(
                "Interview Rescheduled",
                "Hello " + candName + ",<br><br>Please note that your interview for <strong>" + jobTitle + "</strong> has been rescheduled.<br><br><strong>New Date & Time:</strong> " + newDate + linkHtml + "<br><br>We apologize for any inconvenience.",
                "View Details",
                "Rescheduled",
                companyName
        );
        return sendEmailFromHr(hrUserId, candEmail, candName, null, NotificationEventType.INTERVIEW_SCHEDULED, subject, body, true);
    }

    public boolean sendCandidateRejected(Long hrUserId, String candName, String candEmail, String jobTitle, String companyName) {
        String subject = "Update regarding your application for " + jobTitle;
        String body = buildHtmlCard(
                "Application Status Update",
                "Hello " + candName + ",<br><br>Thank you for taking the time to speak with us and for your interest in the <strong>" + jobTitle + "</strong> role at <strong>" + companyName + "</strong>.<br><br>While your skills are impressive, we have decided to proceed with other candidates whose experience more closely matches our immediate technical needs.<br><br>We wish you every success in your ongoing job search.",
                null,
                "Application Concluded",
                companyName
        );
        return sendEmailFromHr(hrUserId, candEmail, candName, null, NotificationEventType.CANDIDATE_REJECTED, subject, body, true);
    }

    public boolean sendInformationRequested(Long hrUserId, String candName, String candEmail, String jobTitle, String companyName, String detailsRequested) {
        String subject = "Additional Information Requested: " + jobTitle;
        String body = buildHtmlCard(
                "Information Required",
                "Hello " + candName + ",<br><br>Our recruitment team for <strong>" + jobTitle + "</strong> at <strong>" + companyName + "</strong> requires additional information to proceed with your application:<br><br><blockquote>" + detailsRequested + "</blockquote><br>Please reply to this email or update your profile in the candidate portal.",
                "Update Profile",
                "Action Required",
                companyName
        );
        return sendEmailFromHr(hrUserId, candEmail, candName, null, NotificationEventType.INTERVIEW_FEEDBACK, subject, body, true);
    }

    public boolean sendCustomNotification(Long hrUserId, String candName, String candEmail, String subject, String messageText, String companyName) {
        String body = buildHtmlCard(
                subject,
                "Hello " + candName + ",<br><br>" + messageText.replace("\n", "<br>"),
                null,
                "Notification",
                companyName
        );
        return sendEmailFromHr(hrUserId, candEmail, candName, null, NotificationEventType.INTERVIEW_SCHEDULED, subject, body, true);
    }

    private String buildHtmlCard(String title, String messageHtml, String buttonText, String badge, String senderName) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>" +
                "<body style='font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 30px;'>" +
                "<div style='max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);'>" +
                "  <div style='background: linear-gradient(135deg, #FF7900 0%, #EA580C 100%); padding: 24px; color: #ffffff;'>" +
                "    <div style='font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; margin-bottom: 6px;'>SmartHire Recruitment</div>" +
                "    <h1 style='margin: 0; font-size: 20px; font-weight: 800;'>" + title + "</h1>" +
                "  </div>" +
                "  <div style='padding: 28px; color: #1e293b; line-height: 1.6; font-size: 15px;'>" +
                messageHtml +
                (buttonText != null ? "<div style='margin-top: 24px;'><span style='display: inline-block; padding: 10px 20px; background-color: #FF7900; color: #ffffff; font-weight: 700; font-size: 14px; border-radius: 6px; text-decoration: none;'>" + buttonText + "</span></div>" : "") +
                "  </div>" +
                "  <div style='padding: 18px 28px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; align-items: center;'>" +
                "    <span>Sent by <strong>" + (senderName != null ? senderName : "SmartHire") + "</strong> via SmartHire ATS</span>" +
                (badge != null ? "<span style='padding: 2px 8px; border-radius: 4px; background: #e2e8f0; font-weight: 700; font-size: 11px; color: #475569;'>" + badge + "</span>" : "") +
                "  </div>" +
                "</div>" +
                "</body></html>";
    }
}
