package com.smarthire.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDispatchEvent {

    private String userEmail;
    private String candidateName;
    private String title;
    private String message;
    private String type; // INTERVIEW, SHORTLIST, STAGE_CHANGE, FEEDBACK, ANALYSIS, JOB_POSTING
    private String actionUrl;
    private Long relatedEntityId;
    private String relatedEntityType;
    private String jobTitle;
    private String actionType;
    private String previousStatus;
    private String currentStatus;
    private String updatedBy;
    private String interviewDate;
    private String interviewTime;
    private String interviewMode;
    private String meetingLink;
    private String hrMessage;
}
