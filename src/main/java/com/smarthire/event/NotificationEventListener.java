package com.smarthire.event;

import com.smarthire.entity.Notification;
import com.smarthire.entity.NotificationPreference;
import com.smarthire.entity.User;
import com.smarthire.repository.NotificationPreferenceRepository;
import com.smarthire.repository.NotificationRepository;
import com.smarthire.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {

    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceRepository notificationPreferenceRepository;
    private final UserRepository userRepository;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    @Async("notificationTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleNotificationEvent(NotificationDispatchEvent event) {
        if (event == null || event.getUserEmail() == null || event.getUserEmail().isBlank()) {
            return;
        }

        String recipientEmail = event.getUserEmail().trim().toLowerCase();
        String type = event.getType() != null ? event.getType().trim().toUpperCase() : "SYSTEM";

        // Defer all candidate recruitment workflow events to the enterprise NotificationQueue
        // This prevents duplicate and preference-bypassing in-app notifications
        if (type.contains("SHORTLIST") || type.contains("STAGE") || type.contains("INTERVIEW")
                || type.contains("FEEDBACK") || type.contains("HIRED") || type.contains("REJECT")) {
            log.debug("NotificationEventListener deferred [{}] event for [{}] to NotificationQueue", type, recipientEmail);
            return;
        }

        // Check user preferences before persisting or dispatching
        if (!isNotificationAllowedByPreference(recipientEmail, type)) {
            log.info("Notification of type [{}] suppressed for user [{}] per preference configuration.",
                    type, recipientEmail);
            return;
        }

        try {
            Notification notification = Notification.builder()
                    .userEmail(recipientEmail)
                    .candidateName(event.getCandidateName())
                    .title(event.getTitle())
                    .message(event.getMessage())
                    .type(type)
                    .actionUrl(event.getActionUrl() != null ? event.getActionUrl() : "/dashboard")
                    .relatedEntityId(event.getRelatedEntityId())
                    .relatedEntityType(event.getRelatedEntityType())
                    .jobTitle(event.getJobTitle())
                    .actionType(event.getActionType())
                    .previousStatus(event.getPreviousStatus())
                    .currentStatus(event.getCurrentStatus())
                    .updatedBy(event.getUpdatedBy())
                    .interviewDate(event.getInterviewDate())
                    .interviewTime(event.getInterviewTime())
                    .interviewMode(event.getInterviewMode())
                    .meetingLink(event.getMeetingLink())
                    .hrMessage(event.getHrMessage())
                    .isRead(false)
                    .createdAt(LocalDateTime.now(java.time.ZoneOffset.UTC))
                    .build();

            Notification saved = notificationRepository.save(notification);
            log.info("Asynchronously dispatched & saved notification [id={}] to [{}] - '{}'",
                    saved.getId(), recipientEmail, event.getTitle());

            // Real-time WebSocket push
            if (messagingTemplate != null) {
                try {
                    messagingTemplate.convertAndSendToUser(
                            recipientEmail,
                            "/queue/notifications",
                            saved
                    );
                    messagingTemplate.convertAndSend(
                            "/topic/notifications/" + recipientEmail,
                            saved
                    );
                } catch (Exception wsEx) {
                    log.debug("WebSocket push for notification skipped or socket disconnected: {}", wsEx.getMessage());
                }
            }
        } catch (Exception ex) {
            log.error("Failed to process async notification event for [{}]: {}", recipientEmail, ex.getMessage(), ex);
        }
    }

    private boolean isNotificationAllowedByPreference(String email, String type) {
        // 1. Check NotificationPreference table
        Optional<NotificationPreference> prefOpt = notificationPreferenceRepository.findByUserEmailIgnoreCase(email);
        if (prefOpt.isPresent()) {
            NotificationPreference pref = prefOpt.get();
            if (type.contains("ANALYSIS") || type.contains("SCAN") || type.contains("RESUME")) {
                if (!pref.isResumeScanAlerts()) return false;
            }
            if (type.contains("JOB") || type.contains("INSIGHT") || type.contains("REQUISITION")) {
                if (!pref.isJobRoleInsights()) return false;
            }
            if (type.contains("INTERVIEW")) {
                if (!pref.isInterviewUpdates()) return false;
            }
            if (type.contains("SHORTLIST") || type.contains("STAGE") || type.contains("APPLICATION") || type.contains("STATUS")) {
                if (!pref.isApplicationStatusAlerts()) return false;
            }
        }

        // 2. Also check User entity flags for double safety
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if ((type.contains("ANALYSIS") || type.contains("SCAN")) && Boolean.FALSE.equals(user.isNotifResumeScan())) {
                return false;
            }
            if ((type.contains("JOB") || type.contains("INSIGHT")) && Boolean.FALSE.equals(user.isNotifJobInsights())) {
                return false;
            }
            if (type.contains("INTERVIEW") && Boolean.FALSE.equals(user.isNotifInterviewUpdates())) {
                return false;
            }
        }

        return true;
    }
}
