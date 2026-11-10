package com.resumeanalyzer.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_email", nullable = false, length = 254)
    private String userEmail;

    @Column(name = "candidate_name", length = 150)
    private String candidateName;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(length = 50)
    private String type; // INTERVIEW, SHORTLIST, STAGE_CHANGE, FEEDBACK, ANALYSIS, JOB_POSTING

    @Column(name = "action_url", length = 255)
    private String actionUrl;

    @Column(name = "related_entity_id")
    private Long relatedEntityId;

    @Column(name = "related_entity_type", length = 50)
    private String relatedEntityType; // APPLICATION, JOB, INTERVIEW

    @Column(name = "job_title", length = 150)
    private String jobTitle;

    @Column(name = "action_type", length = 50)
    private String actionType; // SHORTLIST_ADDED, SHORTLIST_REMOVED, STAGE_UPDATED, INTERVIEW_SCHEDULED, INTERVIEW_RESCHEDULED, INTERVIEW_CANCELLED, JOB_PUBLISHED

    @Column(name = "previous_status", length = 50)
    private String previousStatus;

    @Column(name = "current_status", length = 50)
    private String currentStatus;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "interview_date", length = 100)
    private String interviewDate;

    @Column(name = "interview_time", length = 50)
    private String interviewTime;

    @Column(name = "interview_mode", length = 50)
    private String interviewMode;

    @Column(name = "meeting_link", length = 255)
    private String meetingLink;

    @Column(name = "hr_message", columnDefinition = "TEXT")
    private String hrMessage;

    @Column(name = "is_read")
    @Builder.Default
    private boolean isRead = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public String getTimeAgo() {
        if (createdAt == null) return "Just now";
        try {
            Duration duration = Duration.between(createdAt, LocalDateTime.now());
            long seconds = duration.getSeconds();
            if (seconds < 60) return "Just now";
            long minutes = seconds / 60;
            if (minutes < 60) return minutes + " mins ago";
            long hours = minutes / 60;
            if (hours < 24) return hours + (hours == 1 ? " hour ago" : " hours ago");
            long days = hours / 24;
            if (days < 30) return days + (days == 1 ? " day ago" : " days ago");
            return createdAt.format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
        } catch (Exception e) {
            return "Recent";
        }
    }

    public String getIconClass() {
        if (type == null) return "bi-bell";
        return switch (type.toUpperCase()) {
            case "INTERVIEW" -> "bi-calendar2-week";
            case "SHORTLIST" -> "bi-stars";
            case "STAGE_CHANGE" -> "bi-arrow-right-circle";
            case "FEEDBACK" -> "bi-chat-left-quote";
            case "ANALYSIS" -> "bi-check2-circle";
            case "JOB_POSTING" -> "bi-briefcase";
            default -> "bi-bell";
        };
    }

    public String getIconStyle() {
        if (type == null) return "background: var(--primary-light); color: var(--primary);";
        return switch (type.toUpperCase()) {
            case "INTERVIEW" -> "background: rgba(14, 165, 233, 0.15); color: #0284c7;";
            case "SHORTLIST" -> "background: rgba(255, 121, 0, 0.15); color: #ff7900;";
            case "STAGE_CHANGE" -> "background: rgba(99, 102, 241, 0.15); color: #6366f1;";
            case "FEEDBACK" -> "background: rgba(234, 179, 8, 0.15); color: #ca8a04;";
            case "ANALYSIS" -> "background: rgba(16, 185, 129, 0.15); color: #10b981;";
            case "JOB_POSTING" -> "background: rgba(59, 130, 246, 0.15); color: #2563eb;";
            default -> "background: var(--primary-light); color: var(--primary);";
        };
    }
}
