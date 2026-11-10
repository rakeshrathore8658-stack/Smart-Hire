package com.resumeanalyzer.service;

import com.resumeanalyzer.entity.Notification;
import com.resumeanalyzer.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Dispatch, persist, and push real-time notification to a candidate / user.
     */
    @Transactional
    public Notification sendNotification(
            String userEmail,
            String candidateName,
            String title,
            String message,
            String type,
            String actionUrl) {

        return sendEnrichedNotification(
                userEmail,
                candidateName,
                title,
                message,
                type,
                actionUrl,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }

    /**
     * Dispatch enriched real-time notification with full metadata context.
     */
    @Transactional
    public Notification sendEnrichedNotification(
            String userEmail,
            String candidateName,
            String title,
            String message,
            String type,
            String actionUrl,
            Long relatedEntityId,
            String relatedEntityType,
            String jobTitle,
            String actionType,
            String previousStatus,
            String currentStatus,
            String updatedBy,
            String interviewDate,
            String interviewTime,
            String interviewMode,
            String meetingLink,
            String hrMessage) {

        if (userEmail == null || userEmail.isBlank()) {
            log.warn("Cannot send notification: userEmail is null or empty. Title: {}", title);
            return null;
        }

        String normalizedEmail = userEmail.trim().toLowerCase();

        Notification notification = Notification.builder()
                .userEmail(normalizedEmail)
                .candidateName(candidateName)
                .title(title)
                .message(message)
                .type(type != null ? type : "SYSTEM")
                .actionUrl(actionUrl != null ? actionUrl : "/dashboard")
                .relatedEntityId(relatedEntityId)
                .relatedEntityType(relatedEntityType)
                .jobTitle(jobTitle)
                .actionType(actionType)
                .previousStatus(previousStatus)
                .currentStatus(currentStatus)
                .updatedBy(updatedBy)
                .interviewDate(interviewDate)
                .interviewTime(interviewTime)
                .interviewMode(interviewMode)
                .meetingLink(meetingLink)
                .hrMessage(hrMessage)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        Notification saved = notificationRepository.save(notification);
        Long savedId = saved != null ? saved.getId() : null;
        log.info("Notification dispatched [id={}] to user [{}] type=[{}]: {}",
                savedId, normalizedEmail, type, title);

        // Real-time WebSocket push
        if (messagingTemplate != null) {
            try {
                // Topic subscription pattern: /topic/notifications/{email}
                messagingTemplate.convertAndSend("/topic/notifications/" + normalizedEmail, saved);
                // User-directed queue pattern: /user/{email}/queue/notifications
                messagingTemplate.convertAndSendToUser(normalizedEmail, "/queue/notifications", saved);
                log.debug("Real-time WebSocket notification pushed to: {}", normalizedEmail);
            } catch (Exception wsEx) {
                log.warn("WebSocket notification push failed for [{}]: {}", normalizedEmail, wsEx.getMessage());
            }
        }

        return saved != null ? saved : notification;
    }

    /**
     * Broadcast notification to multiple users (e.g. new job created).
     */
    @Transactional
    public void broadcastNotification(
            List<String> userEmails,
            String title,
            String message,
            String type,
            String actionUrl) {

        if (userEmails == null || userEmails.isEmpty()) return;

        for (String email : userEmails) {
            sendNotification(email, null, title, message, type, actionUrl);
        }
    }

    /**
     * Retrieve all notifications for a specific user email.
     */
    @Transactional(readOnly = true)
    public List<Notification> getNotificationsForUser(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            return Collections.emptyList();
        }
        return notificationRepository.findByUserEmailIgnoreCaseOrderByCreatedAtDesc(userEmail.trim());
    }

    /**
     * Retrieve unread notifications for a user.
     */
    @Transactional(readOnly = true)
    public List<Notification> getUnreadNotifications(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            return Collections.emptyList();
        }
        return notificationRepository.findByUserEmailIgnoreCaseAndIsReadFalseOrderByCreatedAtDesc(userEmail.trim());
    }

    /**
     * Retrieve top recent notifications for header dropdown.
     */
    @Transactional(readOnly = true)
    public List<Notification> getRecentNotifications(String userEmail, int limit) {
        if (userEmail == null || userEmail.isBlank()) {
            return Collections.emptyList();
        }
        List<Notification> notifs = notificationRepository.findTop5ByUserEmailIgnoreCaseOrderByCreatedAtDesc(userEmail.trim());
        if (notifs.size() > limit) {
            return notifs.subList(0, limit);
        }
        return notifs;
    }

    /**
     * Count unread notifications for badge counter.
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            return 0;
        }
        return notificationRepository.countByUserEmailIgnoreCaseAndIsReadFalse(userEmail.trim());
    }

    /**
     * Mark all notifications as read for a user.
     */
    @Transactional
    public void markAllRead(String userEmail) {
        if (userEmail != null && !userEmail.isBlank()) {
            notificationRepository.markAllAsReadForEmail(userEmail.trim().toLowerCase());
            log.info("Marked all notifications as read for user: {}", userEmail);
        }
    }

    /**
     * Mark a single notification as read by ID.
     */
    @Transactional
    public void markAsRead(Long notificationId) {
        if (notificationId != null) {
            notificationRepository.markAsReadById(notificationId);
        }
    }

    /**
     * Retrieve a single notification by ID.
     */
    @Transactional(readOnly = true)
    public java.util.Optional<Notification> getNotificationById(Long notificationId) {
        if (notificationId == null) {
            return java.util.Optional.empty();
        }
        return notificationRepository.findById(notificationId);
    }

    /**
     * Delete a notification by ID.
     */
    @Transactional
    public void deleteNotification(Long notificationId) {
        if (notificationId != null) {
            notificationRepository.deleteById(notificationId);
        }
    }
}
