package com.smarthire.entity;

/**
 * Standardized notification event types supported across
 * HR preferences, in-app notifications, and automated email delivery.
 */
public enum NotificationEventType {

    CANDIDATE_SHORTLISTED,

    REMOVED_FROM_SHORTLIST,

    CANDIDATE_REJECTED,

    INTERVIEW_SCHEDULED,

    INTERVIEW_CANCELLED,

    INTERVIEW_FEEDBACK,

    CANDIDATE_HIRED,

    // HR Personal Notification Events
    NEW_APPLICATION_RECEIVED,

    RESUME_SCAN_COMPLETED,

    INTERVIEW_CONFIRMED
}
