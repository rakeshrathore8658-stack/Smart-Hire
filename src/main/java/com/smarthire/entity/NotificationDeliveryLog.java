package com.smarthire.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Historical delivery audit log for every notification attempt (Email or In-App).
 */
@Entity
@Table(
        name = "notification_delivery_logs",
        indexes = {
                @Index(name = "idx_delivery_logs_hr_created", columnList = "hr_user_id, created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDeliveryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "queue_id")
    private Long queueId;

    @Column(name = "hr_user_id")
    private Long hrUserId;

    @Column(name = "recipient_email", length = 255)
    private String recipientEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", length = 100)
    private NotificationEventType eventType;

    @Column(name = "channel", length = 32)
    private String channel;

    @Column(name = "status", length = 32)
    private String status; // SUCCESS, FAILURE, DISABLED

    @Column(name = "attempt_number")
    @Builder.Default
    private int attemptNumber = 1;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
