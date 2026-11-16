package com.smarthire.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "notification_preferences",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_notif_pref_user_id", columnNames = "user_id"),
                @UniqueConstraint(name = "uk_notif_pref_email", columnNames = "user_email")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "user_email", nullable = false, length = 254)
    private String userEmail;

    @Column(name = "resume_scan_alerts")
    @Builder.Default
    private boolean resumeScanAlerts = true;

    @Column(name = "job_role_insights")
    @Builder.Default
    private boolean jobRoleInsights = true;

    @Column(name = "interview_updates")
    @Builder.Default
    private boolean interviewUpdates = true;

    @Column(name = "application_status_alerts")
    @Builder.Default
    private boolean applicationStatusAlerts = true;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onPersistOrUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.userEmail != null) {
            this.userEmail = this.userEmail.trim().toLowerCase();
        }
    }
}
