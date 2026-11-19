package com.smarthire.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Transactional outbox entity for reliable background notification dispatch.
 * Decouples HR applicant actions from external SMTP network latency and ensures retries.
 */
@Entity
@Table(
        name = "notification_outbox",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_event_channel", columnNames = {"event_id", "channel"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationOutbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", length = 100)
    private String eventId;

    @Column(name = "hr_user_id", nullable = false)
    private Long hrUserId;

    @Column(name = "recipient_user_id")
    private Long recipientUserId;

    @Column(name = "recipient_email", length = 255)
    private String recipientEmail;

    @Column(name = "application_id")
    private Long applicationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 100)
    private NotificationEventType eventType;

    @Column(name = "channel", nullable = false, length = 32)
    private String channel; // "EMAIL" or "IN_APP"

    @Column(name = "payload_json", columnDefinition = "TEXT")
    private String payloadJson;

    @Column(name = "delivery_status", nullable = false, length = 32)
    @Builder.Default
    private String deliveryStatus = "PENDING"; // PENDING, PROCESSING, SENT, FAILED, RETRY_PENDING, DISABLED

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private int retryCount = 0;

    @Column(name = "next_retry_at")
    private LocalDateTime nextRetryAt;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (deliveryStatus == null) {
            deliveryStatus = "PENDING";
        }
    }
}
