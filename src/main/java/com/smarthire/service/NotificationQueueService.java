package com.smarthire.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.entity.*;
import com.smarthire.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Enterprise Centralized Notification Queue Service.
 * Evaluates HR settings, guarantees idempotent enqueuing, and separates Email vs In-App delivery tracks.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationQueueService {

    private final NotificationQueueRepository queueRepository;
    private final NotificationDeliveryLogRepository deliveryLogRepository;
    private final NotificationPreferenceService preferenceService;
    private final NotificationTemplateService templateService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    /**
     * Enqueues a candidate-facing notification event according to the HR's candidate notification preferences.
     */
    @Transactional
    public Map<String, Object> enqueueCandidateEvent(
            NotificationEventType eventType,
            Long hrUserId,
            Long candidateUserId,
            String candidateEmail,
            String candidateName,
            Long applicationId,
            Long jobId,
            Map<String, Object> data
    ) {
        if (eventType == null || hrUserId == null) {
            log.warn("Cannot enqueue notification: eventType or hrUserId is null.");
            return Map.of("enqueued", false, "reason", "Missing parameters");
        }

        String cleanEmail = (candidateEmail != null) ? candidateEmail.trim().toLowerCase() : "";
        String cleanName = (candidateName != null && !candidateName.isBlank()) ? candidateName.trim() : "Candidate";

        if (candidateUserId == null && !cleanEmail.isBlank()) {
            candidateUserId = userRepository.findByEmail(cleanEmail)
                    .map(User::getId)
                    .orElse(null);
        }

        Map<String, Object> payload = (data != null) ? new HashMap<>(data) : new HashMap<>();
        payload.putIfAbsent("eventType", eventType.name());
        payload.putIfAbsent("applicationId", applicationId);
        payload.putIfAbsent("jobId", jobId);
        payload.putIfAbsent("hrUserId", hrUserId);
        payload.putIfAbsent("candidateName", cleanName);
        payload.putIfAbsent("candidateEmail", cleanEmail);

        String payloadJson = "{}";
        try {
            payloadJson = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize notification queue payload JSON: {}", e.getMessage());
        }

        String eventId = generateEventId(eventType, hrUserId, applicationId, cleanEmail);

        // Evaluate HR's candidate notification preferences
        boolean emailEnabled = preferenceService.isEmailEnabled(hrUserId, eventType);
        boolean inAppEnabled = preferenceService.isInAppEnabled(hrUserId, eventType);

        String subject = templateService.getSubject(eventType, payload);
        String htmlBody = templateService.renderHtml(eventType, payload);

        boolean emailEnqueued = false;
        boolean inAppEnqueued = false;

        // 1. Enqueue EMAIL channel
        if (emailEnabled && !cleanEmail.isBlank()) {
            Optional<NotificationQueue> existingEmail = queueRepository.findByEventIdAndChannel(eventId, "EMAIL");
            if (existingEmail.isEmpty()) {
                NotificationQueue emailQueueItem = NotificationQueue.builder()
                        .eventId(eventId)
                        .hrUserId(hrUserId)
                        .recipientUserId(candidateUserId)
                        .recipientEmail(cleanEmail)
                        .recipientName(cleanName)
                        .recipientType("CANDIDATE")
                        .applicationId(applicationId)
                        .jobId(jobId)
                        .eventType(eventType)
                        .channel("EMAIL")
                        .subject(subject)
                        .content(htmlBody)
                        .payloadJson(payloadJson)
                        .status("PENDING")
                        .retryCount(0)
                        .maxRetries(4)
                        .createdAt(LocalDateTime.now())
                        .build();

                queueRepository.save(emailQueueItem);
                emailEnqueued = true;
                log.info("NotificationQueue: Enqueued EMAIL for HR [{}] -> Candidate [{}] (Event: {})",
                        hrUserId, cleanEmail, eventType);
            }
        } else if (!emailEnabled) {
            // Record disabled state in queue & audit log for transparency
            NotificationQueue disabledEmail = NotificationQueue.builder()
                    .eventId(eventId)
                    .hrUserId(hrUserId)
                    .recipientUserId(candidateUserId)
                    .recipientEmail(cleanEmail)
                    .recipientName(cleanName)
                    .recipientType("CANDIDATE")
                    .applicationId(applicationId)
                    .jobId(jobId)
                    .eventType(eventType)
                    .channel("EMAIL")
                    .subject(subject)
                    .content(htmlBody)
                    .payloadJson(payloadJson)
                    .status("DISABLED")
                    .errorMessage("Email delivery disabled by HR candidate notification preferences")
                    .createdAt(LocalDateTime.now())
                    .processedAt(LocalDateTime.now())
                    .build();
            queueRepository.save(disabledEmail);

            deliveryLogRepository.save(NotificationDeliveryLog.builder()
                    .queueId(disabledEmail.getId())
                    .hrUserId(hrUserId)
                    .recipientEmail(cleanEmail)
                    .eventType(eventType)
                    .channel("EMAIL")
                    .status("DISABLED")
                    .details("Suppressed by HR preference")
                    .createdAt(LocalDateTime.now())
                    .build());
            log.info("NotificationQueue: Suppressed EMAIL (HR [{}] disabled {})", hrUserId, eventType);
        }

        // 2. Enqueue IN_APP channel
        if (inAppEnabled && !cleanEmail.isBlank()) {
            Optional<NotificationQueue> existingInApp = queueRepository.findByEventIdAndChannel(eventId, "IN_APP");
            if (existingInApp.isEmpty()) {
                NotificationQueue inAppQueueItem = NotificationQueue.builder()
                        .eventId(eventId)
                        .hrUserId(hrUserId)
                        .recipientUserId(candidateUserId)
                        .recipientEmail(cleanEmail)
                        .recipientName(cleanName)
                        .recipientType("CANDIDATE")
                        .applicationId(applicationId)
                        .jobId(jobId)
                        .eventType(eventType)
                        .channel("IN_APP")
                        .subject(subject)
                        .content(htmlBody)
                        .payloadJson(payloadJson)
                        .status("PENDING")
                        .retryCount(0)
                        .maxRetries(2)
                        .createdAt(LocalDateTime.now())
                        .build();

                queueRepository.save(inAppQueueItem);
                inAppEnqueued = true;
                log.info("NotificationQueue: Enqueued IN_APP for HR [{}] -> Candidate [{}] (Event: {})",
                        hrUserId, cleanEmail, eventType);
            }
        } else if (!inAppEnabled) {
            NotificationQueue disabledInApp = NotificationQueue.builder()
                    .eventId(eventId)
                    .hrUserId(hrUserId)
                    .recipientUserId(candidateUserId)
                    .recipientEmail(cleanEmail)
                    .recipientName(cleanName)
                    .recipientType("CANDIDATE")
                    .applicationId(applicationId)
                    .jobId(jobId)
                    .eventType(eventType)
                    .channel("IN_APP")
                    .subject(subject)
                    .content(htmlBody)
                    .payloadJson(payloadJson)
                    .status("DISABLED")
                    .errorMessage("In-App notification disabled by HR candidate notification preferences")
                    .createdAt(LocalDateTime.now())
                    .processedAt(LocalDateTime.now())
                    .build();
            queueRepository.save(disabledInApp);

            deliveryLogRepository.save(NotificationDeliveryLog.builder()
                    .queueId(disabledInApp.getId())
                    .hrUserId(hrUserId)
                    .recipientEmail(cleanEmail)
                    .eventType(eventType)
                    .channel("IN_APP")
                    .status("DISABLED")
                    .details("Suppressed by HR preference")
                    .createdAt(LocalDateTime.now())
                    .build());
            log.info("NotificationQueue: Suppressed IN_APP (HR [{}] disabled {})", hrUserId, eventType);
        }

        return Map.of(
                "eventId", eventId,
                "eventType", eventType.name(),
                "emailEnqueued", emailEnqueued,
                "inAppEnqueued", inAppEnqueued
        );
    }

    private String generateEventId(NotificationEventType eventType, Long hrUserId, Long applicationId, String email) {
        return eventType.name() + "_" + hrUserId + "_" + (applicationId != null ? applicationId : "0") + "_" + System.currentTimeMillis();
    }
}
