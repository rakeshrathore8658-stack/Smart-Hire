package com.smarthire.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.entity.*;
import com.smarthire.repository.NotificationOutboxRepository;
import com.smarthire.repository.NotificationRepository;
import com.smarthire.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationOutboxService {

    private final NotificationOutboxRepository outboxRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceService preferenceService;
    private final UserRepository userRepository;
    private final RealtimeSyncService realtimeSyncService;
    private final ObjectMapper objectMapper;

    /**
     * Schedules a notification event using the Transactional Outbox Pattern.
     * Enforces HR preferences, HR data isolation, and duplicate prevention.
     */
    @Transactional
    public Map<String, Object> scheduleEvent(
            NotificationEventType eventType,
            Long hrUserId,
            Long recipientUserId,
            String recipientEmail,
            Long applicationId,
            Long jobId,
            Map<String, Object> data
    ) {
        if (eventType == null || hrUserId == null) {
            log.warn("Cannot schedule notification outbox: eventType or hrUserId is null.");
            return Map.of("scheduled", false, "reason", "Missing parameters");
        }

        // Clean recipient email
        String cleanEmail = (recipientEmail != null) ? recipientEmail.trim().toLowerCase() : "";

        // If recipientUserId is not supplied, look up by email
        if (recipientUserId == null && !cleanEmail.isBlank()) {
            recipientUserId = userRepository.findByEmail(cleanEmail)
                    .map(User::getId)
                    .orElse(null);
        }

        // Ensure data map contains standard attributes
        Map<String, Object> payload = (data != null) ? new HashMap<>(data) : new HashMap<>();
        payload.putIfAbsent("eventType", eventType.name());
        payload.putIfAbsent("applicationId", applicationId);
        payload.putIfAbsent("jobId", jobId);
        payload.putIfAbsent("hrUserId", hrUserId);
        payload.putIfAbsent("recipientEmail", cleanEmail);

        String payloadJson = "{}";
        try {
            payloadJson = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize notification payload JSON: {}", e.getMessage());
        }

        // Generate deterministic event ID to prevent duplicate deliveries for the same event
        String eventId = generateEventId(eventType, hrUserId, applicationId, cleanEmail);

        boolean emailEnabled = preferenceService.isEmailEnabled(hrUserId, eventType);
        boolean inAppEnabled = preferenceService.isInAppEnabled(hrUserId, eventType);

        boolean emailQueued = false;
        boolean inAppQueued = false;

        // 1. Process IN-APP Channel
        if (inAppEnabled) {
            Optional<NotificationOutbox> existingInApp = outboxRepository.findByEventIdAndChannel(eventId, "IN_APP");
            if (existingInApp.isEmpty()) {
                NotificationOutbox outboxInApp = NotificationOutbox.builder()
                        .eventId(eventId)
                        .hrUserId(hrUserId)
                        .recipientUserId(recipientUserId)
                        .recipientEmail(cleanEmail)
                        .applicationId(applicationId)
                        .eventType(eventType)
                        .channel("IN_APP")
                        .payloadJson(payloadJson)
                        .deliveryStatus("SENT")
                        .retryCount(0)
                        .createdAt(LocalDateTime.now())
                        .processedAt(LocalDateTime.now())
                        .build();

                outboxRepository.save(outboxInApp);

                // Create persistent in-app Notification record
                saveInAppNotification(eventType, hrUserId, recipientUserId, cleanEmail, applicationId, jobId, payload);
                inAppQueued = true;
            } else {
                log.info("Duplicate in-app notification event detected and deduplicated: {}", eventId);
            }
        } else {
            log.info("In-App notification disabled by HR User ID [{}] for event [{}]", hrUserId, eventType);
        }

        // 2. Process EMAIL Channel
        if (emailEnabled && !cleanEmail.isBlank()) {
            Optional<NotificationOutbox> existingEmail = outboxRepository.findByEventIdAndChannel(eventId, "EMAIL");
            if (existingEmail.isEmpty()) {
                NotificationOutbox outboxEmail = NotificationOutbox.builder()
                        .eventId(eventId)
                        .hrUserId(hrUserId)
                        .recipientUserId(recipientUserId)
                        .recipientEmail(cleanEmail)
                        .applicationId(applicationId)
                        .eventType(eventType)
                        .channel("EMAIL")
                        .payloadJson(payloadJson)
                        .deliveryStatus("PENDING")
                        .retryCount(0)
                        .createdAt(LocalDateTime.now())
                        .build();

                outboxRepository.save(outboxEmail);
                emailQueued = true;
            } else {
                log.info("Duplicate email notification event detected and deduplicated: {}", eventId);
            }
        } else if (!emailEnabled) {
            log.info("Email notification disabled by HR User ID [{}] for event [{}]", hrUserId, eventType);
        }

        return Map.of(
                "eventId", eventId,
                "eventType", eventType.name(),
                "emailQueued", emailQueued,
                "inAppQueued", inAppQueued
        );
    }

    private void saveInAppNotification(
            NotificationEventType eventType,
            Long hrUserId,
            Long recipientUserId,
            String recipientEmail,
            Long applicationId,
            Long jobId,
            Map<String, Object> payload
    ) {
        if (recipientEmail == null || recipientEmail.isBlank()) return;

        String candidateName = (String) payload.getOrDefault("candidateName", "Candidate");
        String jobTitle = (String) payload.getOrDefault("jobTitle", "Job Opening");
        String companyName = (String) payload.getOrDefault("companyName", "SmartHire Technologies");

        String title;
        String message;
        String actionUrl = (applicationId != null) ? "/dashboard/applications/" + applicationId : "/dashboard/jobroles";

        switch (eventType) {
            case CANDIDATE_SHORTLISTED -> {
                title = "Application Shortlisted";
                message = "Congratulations " + candidateName + "! Your application for " + jobTitle + " at " + companyName + " has been shortlisted.";
            }
            case REMOVED_FROM_SHORTLIST -> {
                title = "Removed from Shortlist";
                message = "Your application for " + jobTitle + " at " + companyName + " has been removed from the shortlist and moved to general review.";
            }
            case CANDIDATE_REJECTED -> {
                title = "Application Status Update";
                message = "Thank you for applying to " + jobTitle + " at " + companyName + ". The hiring team has updated your application status.";
            }
            case INTERVIEW_SCHEDULED -> {
                String date = (String) payload.getOrDefault("interviewDate", "");
                String time = (String) payload.getOrDefault("interviewTime", "");
                title = "Interview Scheduled";
                message = "An interview has been scheduled for " + jobTitle + " on " + date + " " + time + ".";
                actionUrl = "/dashboard/interviews";
            }
            case INTERVIEW_CANCELLED -> {
                title = "Interview Cancelled";
                message = "Your scheduled interview session for " + jobTitle + " has been cancelled.";
                actionUrl = "/dashboard/interviews";
            }
            case INTERVIEW_FEEDBACK -> {
                title = "Interview Feedback Published";
                message = "Interviewer evaluation notes and scorecards have been published for " + jobTitle + ".";
                actionUrl = "/dashboard/feedback";
            }
            case CANDIDATE_HIRED -> {
                title = "Offer of Employment";
                message = "Congratulations " + candidateName + "! You have been selected and marked hired for " + jobTitle + " at " + companyName + "!";
            }
            default -> {
                title = "Recruitment Notification";
                message = "Update on your application for " + jobTitle + " at " + companyName + ".";
            }
        }

        Notification notification = Notification.builder()
                .userEmail(recipientEmail.trim().toLowerCase())
                .candidateName(candidateName)
                .title(title)
                .message(message)
                .type(eventType.name())
                .actionUrl(actionUrl)
                .relatedEntityId(applicationId)
                .relatedEntityType("APPLICATION")
                .jobTitle(jobTitle)
                .actionType(eventType.name())
                .recipientUserId(recipientUserId)
                .hrUserId(hrUserId)
                .jobId(jobId)
                .applicationId(applicationId)
                .eventType(eventType.name())
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        Notification saved = notificationRepository.save(notification);

        // Realtime broadcast to candidate
        try {
            realtimeSyncService.broadcastNotification(saved);
        } catch (Exception ex) {
            log.warn("Realtime broadcast note: {}", ex.getMessage());
        }
    }

    private String generateEventId(NotificationEventType eventType, Long hrUserId, Long applicationId, String email) {
        // Generates unique event ID per action instance
        return eventType.name() + "_" + hrUserId + "_" + (applicationId != null ? applicationId : "0") + "_" + System.currentTimeMillis();
    }
}
