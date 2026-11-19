package com.smarthire.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Enterprise Centralized Notification Queue entity.
 * Single source of truth for both automated dynamic SMTP emails and in-app notifications.
 */
@Entity
@Table(
        name = "notification_queue",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_queue_event_channel", columnNames = {"event_id", "channel"})
        },
        indexes = {
                @Index(name = "idx_queue_status_retry", columnList = "status, next_retry_at"),
                @Index(name = "idx_queue_hr_user", columnList = "hr_user_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationQueue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, length = 120)
    private String eventId;

    @Column(name = "hr_user_id", nullable = false)
    private Long hrUserId;

    @Column(name = "recipient_user_id")
    private Long recipientUserId;

    @Column(name = "recipient_email", nullable = false, length = 255)
    private String recipientEmail;

    @Column(name = "recipient_name", length = 255)
    private String recipientName;

    @Column(name = "recipient_type", nullable = false, length = 32)
    @Builder.Default
    private String recipientType = "CANDIDATE"; // CANDIDATE or HR

    @Column(name = "application_id")
    private Long applicationId;

    @Column(name = "job_id")
    private Long jobId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 100)
    private NotificationEventType eventType;

    @Column(name = "channel", nullable = false, length = 32)
    private String channel; // EMAIL or IN_APP

    @Column(name = "subject", length = 255)
    private String subject;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "payload_json", columnDefinition = "TEXT")
    private String payloadJson;

    @Column(name = "status", nullable = false, length = 32)
    @Builder.Default
    private String status = "PENDING"; // PENDING, PROCESSING, SENT, FAILED, RETRY_PENDING, DISABLED

    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    @Column(name = "max_retries")
    @Builder.Default
    private Integer maxRetries = 4;

    @Column(name = "next_retry_at")
    private LocalDateTime nextRetryAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = "PENDING";
        }
        if (recipientType == null) {
            recipientType = "CANDIDATE";
        }
        if (maxRetries == null) {
            maxRetries = 4;
        }
        if (retryCount == null) {
            retryCount = 0;
        }
    }
}
