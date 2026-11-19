package com.smarthire.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.entity.*;
import com.smarthire.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Enterprise Background Worker for the Centralized Notification Queue.
 * Processes automated dynamic SMTP emails and in-app notifications with
 * exponential backoff, safe concurrency, and full audit logging.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationQueueWorker {

    private final NotificationQueueRepository queueRepository;
    private final NotificationDeliveryLogRepository deliveryLogRepository;
    private final NotificationRepository notificationRepository;
    private final HrEmailSettingRepository hrEmailSettingRepository;
    private final NotificationPreferenceService preferenceService;
    private final DynamicEmailService dynamicEmailService;
    private final NotificationTemplateService templateService;
    private final RealtimeSyncService realtimeSyncService;
    private final ObjectMapper objectMapper;

    @Scheduled(fixedDelay = 8000, initialDelay = 10000)
    public void processQueue() {
        try {
            List<NotificationQueue> claimable = queueRepository.findClaimableItems(LocalDateTime.now(), PageRequest.of(0, 25));
            if (claimable == null || claimable.isEmpty()) {
                return;
            }

            for (NotificationQueue item : claimable) {
                try {
                    processSingleQueueItem(item);
                } catch (Exception ex) {
                    log.error("Unhandled error processing notification queue item [{}]: {}", item.getId(), ex.getMessage());
                }
            }
        } catch (Throwable ex) {
            log.warn("NotificationQueueWorker: Database temporarily unavailable or reconnecting ({}). Will retry next cycle.", ex.getMessage());
        }
    }

    @Transactional
    public void processSingleQueueItem(NotificationQueue item) {
        if ("SENT".equalsIgnoreCase(item.getStatus())
                || "FAILED".equalsIgnoreCase(item.getStatus())
                || "DISABLED".equalsIgnoreCase(item.getStatus())) {
            return;
        }

        // Re-check HR preferences to guarantee real-time toggle freshness
        Long hrUserId = item.getHrUserId();
        NotificationEventType eventType = item.getEventType();

        if ("IN_APP".equalsIgnoreCase(item.getChannel())) {
            boolean inAppAllowed = preferenceService.isInAppEnabled(hrUserId, eventType);
            if (!inAppAllowed) {
                log.info("Queue item [{}] suppressed: HR [{}] disabled IN_APP for event [{}]", item.getId(), hrUserId, eventType);
                item.setStatus("DISABLED");
                item.setErrorMessage("In-app notification suppressed per current HR preference");
                item.setProcessedAt(LocalDateTime.now());
                queueRepository.save(item);
                logDelivery(item, "DISABLED", 1, "Suppressed by updated HR preference");
                return;
            }

            processInAppDelivery(item);
            return;
        }

        if ("EMAIL".equalsIgnoreCase(item.getChannel())) {
            boolean emailAllowed = preferenceService.isEmailEnabled(hrUserId, eventType);
            if (!emailAllowed) {
                log.info("Queue item [{}] suppressed: HR [{}] disabled EMAIL for event [{}]", item.getId(), hrUserId, eventType);
                item.setStatus("DISABLED");
                item.setErrorMessage("Email delivery suppressed per current HR preference");
                item.setProcessedAt(LocalDateTime.now());
                queueRepository.save(item);
                logDelivery(item, "DISABLED", 1, "Suppressed by updated HR preference");
                return;
            }

            processEmailDelivery(item);
            return;
        }

        // Unknown channel
        item.setStatus("DISABLED");
        item.setProcessedAt(LocalDateTime.now());
        queueRepository.save(item);
    }

    private void processInAppDelivery(NotificationQueue item) {
        String recipientEmail = item.getRecipientEmail().trim().toLowerCase();
        String title = (item.getSubject() != null && !item.getSubject().isBlank())
                ? item.getSubject()
                : "Recruitment Notification";

        // Parse human-readable message from content or payload
        String message = title;
        Map<String, Object> payload = deserializePayload(item.getPayloadJson());
        String role = (String) payload.getOrDefault("jobTitle", "Job Opening");
        String company = (String) payload.getOrDefault("companyName", "SmartHire Technologies");
        String candName = (String) payload.getOrDefault("candidateName", item.getRecipientName());

        switch (item.getEventType()) {
            case CANDIDATE_SHORTLISTED ->
                    message = "Congratulations " + candName + "! Your application for " + role + " at " + company + " has been shortlisted.";
            case REMOVED_FROM_SHORTLIST ->
                    message = "Your application for " + role + " at " + company + " has been removed from the shortlist and moved to general review.";
            case CANDIDATE_REJECTED ->
                    message = "Thank you for applying to " + role + " at " + company + ". Your application status has been updated.";
            case INTERVIEW_SCHEDULED -> {
                String d = (String) payload.getOrDefault("interviewDate", "");
                String t = (String) payload.getOrDefault("interviewTime", "");
                message = "An interview has been scheduled for " + role + " on " + d + " " + t + ".";
            }
            case INTERVIEW_CANCELLED ->
                    message = "Your scheduled interview session for " + role + " has been cancelled.";
            case INTERVIEW_FEEDBACK ->
                    message = "Interview evaluation feedback and notes have been published for " + role + ".";
            case CANDIDATE_HIRED ->
                    message = "Congratulations " + candName + "! You have been selected and marked hired for " + role + " at " + company + "!";
            default ->
                    message = "Update on your recruitment status for " + role + ".";
        }

        String actionUrl = (item.getApplicationId() != null)
                ? "/dashboard/applications/" + item.getApplicationId()
                : "/dashboard/notifications";

        Notification notification = Notification.builder()
                .userEmail(recipientEmail)
                .candidateName(candName)
                .title(title)
                .message(message)
                .type(item.getEventType().name())
                .actionUrl(actionUrl)
                .relatedEntityId(item.getApplicationId())
                .relatedEntityType("APPLICATION")
                .jobTitle(role)
                .actionType(item.getEventType().name())
                .recipientUserId(item.getRecipientUserId())
                .hrUserId(item.getHrUserId())
                .jobId(item.getJobId())
                .applicationId(item.getApplicationId())
                .eventType(item.getEventType().name())
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        Notification saved = notificationRepository.save(notification);

        try {
            realtimeSyncService.broadcastNotification(saved);
        } catch (Exception ex) {
            log.debug("Realtime websocket broadcast note: {}", ex.getMessage());
        }

        item.setStatus("SENT");
        item.setProcessedAt(LocalDateTime.now());
        item.setErrorMessage(null);
        queueRepository.save(item);

        logDelivery(item, "SUCCESS", 1, "Delivered to in-app notification center");
        log.info("NotificationQueue: IN_APP successfully delivered for item [{}] to [{}]", item.getId(), recipientEmail);
    }

    private void processEmailDelivery(NotificationQueue item) {
        Long hrUserId = item.getHrUserId();
        Optional<HrEmailSetting> settingOpt = hrEmailSettingRepository.findByHrUserIdAndIsActiveTrue(hrUserId);
        if (settingOpt.isEmpty()) {
            log.warn("NotificationQueue: No active SMTP credentials for HR User ID [{}]", hrUserId);
            handleDeliveryFailure(item, "No active SMTP credentials configured for HR recruiter ID " + hrUserId);
            return;
        }

        HrEmailSetting hrSetting = settingOpt.get();
        if (hrSetting.getAppPassword() == null || hrSetting.getAppPassword().isBlank()) {
            handleDeliveryFailure(item, "App password missing or empty for HR recruiter ID " + hrUserId);
            return;
        }

        String recipientEmail = item.getRecipientEmail().trim().toLowerCase();
        Map<String, Object> payload = deserializePayload(item.getPayloadJson());

        String subject = (item.getSubject() != null && !item.getSubject().isBlank())
                ? item.getSubject()
                : templateService.getSubject(item.getEventType(), payload);

        String body = (item.getContent() != null && !item.getContent().isBlank())
                ? item.getContent()
                : templateService.renderHtml(item.getEventType(), payload);

        try {
            boolean sent = dynamicEmailService.sendEmailFromHr(
                    hrUserId,
                    recipientEmail,
                    item.getRecipientName(),
                    item.getApplicationId(),
                    item.getEventType(),
                    subject,
                    body,
                    false
            );
            if (sent) {
                item.setStatus("SENT");
                item.setProcessedAt(LocalDateTime.now());
                item.setErrorMessage(null);
                queueRepository.save(item);

                logDelivery(item, "SUCCESS", item.getRetryCount() + 1, "Delivered via dynamic SMTP (" + hrSetting.getSenderEmail() + ")");
                log.info("NotificationQueue: EMAIL successfully sent for item [{}] to [{}] via [{}]",
                        item.getId(), recipientEmail, hrSetting.getSenderEmail());
            } else {
                handleDeliveryFailure(item, "DynamicEmailService returned false (SMTP handshake/auth rejected)");
            }
        } catch (Exception ex) {
            handleDeliveryFailure(item, ex.getMessage());
        }
    }

    private void handleDeliveryFailure(NotificationQueue item, String errorMsg) {
        int currentRetries = item.getRetryCount() + 1;
        item.setRetryCount(currentRetries);
        item.setErrorMessage(errorMsg);

        if (currentRetries >= item.getMaxRetries()) {
            item.setStatus("FAILED");
            item.setProcessedAt(LocalDateTime.now());
            log.error("NotificationQueue: PERMANENT FAILURE for item [{}] after {} retries: {}",
                    item.getId(), currentRetries, errorMsg);
            logDelivery(item, "FAILED", currentRetries, errorMsg);
        } else {
            item.setStatus("RETRY_PENDING");
            long delaySeconds = (long) Math.pow(2, currentRetries) * 15L; // 30s, 60s, 120s exponential backoff
            item.setNextRetryAt(LocalDateTime.now().plusSeconds(delaySeconds));
            log.warn("NotificationQueue: Delivery failed (retry {}/{}). Next retry in {}s for item [{}]: {}",
                    currentRetries, item.getMaxRetries(), delaySeconds, item.getId(), errorMsg);
            logDelivery(item, "RETRY_PENDING", currentRetries, errorMsg);
        }

        queueRepository.save(item);
    }

    private void logDelivery(NotificationQueue item, String status, int attempt, String details) {
        try {
            deliveryLogRepository.save(NotificationDeliveryLog.builder()
                    .queueId(item.getId())
                    .hrUserId(item.getHrUserId())
                    .recipientEmail(item.getRecipientEmail())
                    .eventType(item.getEventType())
                    .channel(item.getChannel())
                    .status(status)
                    .attemptNumber(attempt)
                    .details(details)
                    .createdAt(LocalDateTime.now())
                    .build());
        } catch (Exception ex) {
            log.warn("Could not save delivery log: {}", ex.getMessage());
        }
    }

    private Map<String, Object> deserializePayload(String json) {
        if (json == null || json.isBlank()) return new HashMap<>();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return new HashMap<>();
        }
    }
}
