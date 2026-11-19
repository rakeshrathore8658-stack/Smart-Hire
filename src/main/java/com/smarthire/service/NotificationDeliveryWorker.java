package com.smarthire.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.entity.HrEmailSetting;
import com.smarthire.entity.NotificationOutbox;
import com.smarthire.repository.HrEmailSettingRepository;
import com.smarthire.repository.NotificationOutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Background worker executing the Transactional Outbox Pattern for email deliveries.
 * Decouples HR operations from network latency, manages retries with exponential backoff,
 * and tracks delivery status.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationDeliveryWorker {

    private final NotificationOutboxRepository outboxRepository;
    private final HrEmailSettingRepository hrEmailSettingRepository;
    private final DynamicEmailService dynamicEmailService;
    private final NotificationTemplateService templateService;
    private final ObjectMapper objectMapper;

    private static final int MAX_RETRIES = 3;

    @Scheduled(fixedDelay = 8000, initialDelay = 10000)
    public void processOutbox() {
        try {
            List<NotificationOutbox> pendingList = outboxRepository.findPendingItems(LocalDateTime.now());
            if (pendingList == null || pendingList.isEmpty()) {
                return;
            }

            for (NotificationOutbox item : pendingList) {
                try {
                    processSingleItem(item);
                } catch (Exception ex) {
                    log.error("Unhandled error processing outbox item [{}]: {}", item.getId(), ex.getMessage());
                }
            }
        } catch (Throwable ex) {
            log.warn("NotificationDeliveryWorker: Database temporarily unavailable or reconnecting ({}). Will retry next cycle.", ex.getMessage());
        }
    }

    @Transactional
    public void processSingleItem(NotificationOutbox item) {
        if ("SENT".equalsIgnoreCase(item.getDeliveryStatus()) || "FAILED".equalsIgnoreCase(item.getDeliveryStatus())) {
            return;
        }

        if ("IN_APP".equalsIgnoreCase(item.getChannel())) {
            item.setDeliveryStatus("SENT");
            item.setProcessedAt(LocalDateTime.now());
            outboxRepository.save(item);
            return;
        }

        if (!"EMAIL".equalsIgnoreCase(item.getChannel())) {
            item.setDeliveryStatus("DISABLED");
            item.setProcessedAt(LocalDateTime.now());
            outboxRepository.save(item);
            return;
        }

        // Verify HR SMTP settings
        Long hrUserId = item.getHrUserId();
        Optional<HrEmailSetting> settingOpt = hrEmailSettingRepository.findByHrUserIdAndIsActiveTrue(hrUserId);
        if (settingOpt.isEmpty()) {
            log.info("Outbox email delivery paused: No active HrEmailSetting for HR User ID [{}]", hrUserId);
            item.setDeliveryStatus("FAILED");
            item.setLastError("No active SMTP credentials configured for HR recruiter ID " + hrUserId);
            item.setProcessedAt(LocalDateTime.now());
            outboxRepository.save(item);
            return;
        }

        HrEmailSetting hrSetting = settingOpt.get();
        if (hrSetting.getAppPassword() == null || hrSetting.getAppPassword().isBlank()) {
            item.setDeliveryStatus("FAILED");
            item.setLastError("App password not configured for HR recruiter ID " + hrUserId);
            item.setProcessedAt(LocalDateTime.now());
            outboxRepository.save(item);
            return;
        }

        // Deserialize variables from payload JSON
        Map<String, Object> variables = new HashMap<>();
        try {
            if (item.getPayloadJson() != null && !item.getPayloadJson().isBlank()) {
                variables = objectMapper.readValue(item.getPayloadJson(), new TypeReference<Map<String, Object>>() {});
            }
        } catch (Exception e) {
            log.warn("Could not deserialize outbox payload JSON [{}]: {}", item.getId(), e.getMessage());
        }

        // Add HR details to template variables
        variables.putIfAbsent("hrEmail", hrSetting.getSenderEmail());
        variables.putIfAbsent("hrName", (hrSetting.getSenderName() != null && !hrSetting.getSenderName().isBlank())
                ? hrSetting.getSenderName()
                : "SmartHire Recruiter");

        // Render HTML and Subject
        String subject = templateService.getSubject(item.getEventType(), variables);
        String htmlBody = templateService.renderHtml(item.getEventType(), variables);

        try {
            boolean sent = dynamicEmailService.sendEmailFromHr(hrUserId, item.getRecipientEmail(), subject, htmlBody);
            if (sent) {
                item.setDeliveryStatus("SENT");
                item.setProcessedAt(LocalDateTime.now());
                item.setLastError(null);
                outboxRepository.save(item);
                log.info("Outbox email delivery SUCCESS for item ID [{}] to [{}]", item.getId(), item.getRecipientEmail());
            } else {
                handleDeliveryFailure(item, "DynamicEmailService returned false (SMTP failed or refused)");
            }
        } catch (Exception ex) {
            handleDeliveryFailure(item, ex.getMessage());
        }
    }

    private void handleDeliveryFailure(NotificationOutbox item, String errorMsg) {
        int currentRetries = item.getRetryCount() + 1;
        item.setRetryCount(currentRetries);
        item.setLastError(errorMsg);

        if (currentRetries >= MAX_RETRIES) {
            item.setDeliveryStatus("FAILED");
            item.setProcessedAt(LocalDateTime.now());
            log.error("Outbox email delivery PERMANENTLY FAILED after {} retries for item [{}]: {}",
                    currentRetries, item.getId(), errorMsg);
        } else {
            item.setDeliveryStatus("RETRY_PENDING");
            long delaySeconds = (long) Math.pow(2, currentRetries) * 10L; // 20s, 40s, 80s exponential backoff
            item.setNextRetryAt(LocalDateTime.now().plusSeconds(delaySeconds));
            log.warn("Outbox email delivery failed (retry {}/{}). Next retry in {}s for item [{}]: {}",
                    currentRetries, MAX_RETRIES, delaySeconds, item.getId(), errorMsg);
        }

        outboxRepository.save(item);
    }
}
