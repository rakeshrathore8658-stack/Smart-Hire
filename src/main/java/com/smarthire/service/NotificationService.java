package com.smarthire.service;

import com.smarthire.entity.Notification;
import com.smarthire.event.NotificationDispatchEvent;
import com.smarthire.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
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
    private final ApplicationEventPublisher eventPublisher;
    private final RealtimeSyncService realtimeSyncService;

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
     * Dispatch enriched real-time notification asynchronously via Spring ApplicationEvent.
     * Evaluates user notification preferences before persisting or pushing.
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

        NotificationDispatchEvent event = NotificationDispatchEvent.builder()
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
                .build();

        eventPublisher.publishEvent(event);
        log.debug("Published NotificationDispatchEvent for user [{}] with title: {}", normalizedEmail, title);

        return Notification.builder()
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
                .createdAt(LocalDateTime.now(java.time.ZoneOffset.UTC))
                .build();
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
     * Mark all notifications as read for a user and broadcast real-time sync event to HR dashboards.
     */
    @Transactional
    public void markAllRead(String userEmail) {
        if (userEmail != null && !userEmail.isBlank()) {
            String cleanEmail = userEmail.trim().toLowerCase();
            notificationRepository.markAllAsReadForEmail(cleanEmail);
            try {
                java.util.Map<String, Object> data = new java.util.LinkedHashMap<>();
                data.put("userEmail", cleanEmail);
                data.put("isRead", true);
                data.put("status", "READ");
                if (realtimeSyncService != null) {
                    realtimeSyncService.broadcastEvent("NOTIFICATION_READ", "UPDATE_ALL", data);
                }
            } catch (Exception ex) {
                log.warn("Failed to broadcast NOTIFICATION_READ event: {}", ex.getMessage());
            }
            log.info("Marked all notifications as read for user: {}", cleanEmail);
        }
    }

    /**
     * Mark a single notification as read by ID and broadcast real-time sync event to HR dashboards.
     */
    @Transactional
    public void markAsRead(Long notificationId) {
        if (notificationId != null) {
            notificationRepository.markAsReadById(notificationId);
            try {
                notificationRepository.findById(notificationId).ifPresent(notif -> {
                    java.util.Map<String, Object> data = new java.util.LinkedHashMap<>();
                    data.put("notificationId", notif.getId());
                    data.put("hrUserId", notif.getHrUserId());
                    data.put("userEmail", notif.getUserEmail());
                    data.put("candidateName", notif.getCandidateName());
                    data.put("isRead", true);
                    data.put("status", "READ");
                    if (realtimeSyncService != null) {
                        realtimeSyncService.broadcastEvent("NOTIFICATION_READ", "UPDATE", data);
                    }
                });
            } catch (Exception ex) {
                log.warn("Failed to broadcast NOTIFICATION_READ event: {}", ex.getMessage());
            }
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
