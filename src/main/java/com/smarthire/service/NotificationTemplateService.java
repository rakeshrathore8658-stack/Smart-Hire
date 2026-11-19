package com.smarthire.service;

import com.smarthire.entity.NotificationEventType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class NotificationTemplateService {

    private final Map<NotificationEventType, String> templateCache = new ConcurrentHashMap<>();

    private static final Map<NotificationEventType, String> TEMPLATE_FILE_MAP = Map.of(
            NotificationEventType.NEW_APPLICATION_RECEIVED, "new-application-received.html",
            NotificationEventType.CANDIDATE_SHORTLISTED, "candidate-shortlisted.html",
            NotificationEventType.REMOVED_FROM_SHORTLIST, "removed-from-shortlist.html",
            NotificationEventType.CANDIDATE_REJECTED, "candidate-rejected.html",
            NotificationEventType.INTERVIEW_SCHEDULED, "interview-scheduled.html",
            NotificationEventType.INTERVIEW_CANCELLED, "interview-cancelled.html",
            NotificationEventType.INTERVIEW_FEEDBACK, "interview-feedback.html",
            NotificationEventType.CANDIDATE_HIRED, "candidate-hired.html"
    );

    public String renderHtml(NotificationEventType eventType, Map<String, Object> variables) {
        String template = getTemplateContent(eventType);
        if (template == null || template.isBlank()) {
            return generateFallbackHtml(eventType, variables);
        }

        String rendered = template;
        if (variables != null) {
            for (Map.Entry<String, Object> entry : variables.entrySet()) {
                String key = "{{" + entry.getKey() + "}}";
                String val = (entry.getValue() != null) ? entry.getValue().toString() : "";
                rendered = rendered.replace(key, val);
            }
        }

        // Clean any leftover double-brace placeholders
        rendered = rendered.replaceAll("\\{\\{[a-zA-Z0-9_]+\\}\\}", "");
        return rendered;
    }

    public String getSubject(NotificationEventType eventType, Map<String, Object> variables) {
        String job = (variables != null && variables.get("jobTitle") != null) ? variables.get("jobTitle").toString() : "Job Application";
        String company = (variables != null && variables.get("companyName") != null) ? variables.get("companyName").toString() : "SmartHire";

        return switch (eventType) {
            case CANDIDATE_SHORTLISTED -> "Congratulations! You have been Shortlisted for " + job + " at " + company;
            case REMOVED_FROM_SHORTLIST -> "Application Update: Removed from Shortlist - " + job + " at " + company;
            case CANDIDATE_REJECTED -> "Update regarding your application for " + job + " at " + company;
            case INTERVIEW_SCHEDULED -> "Interview Scheduled: " + job + " at " + company;
            case INTERVIEW_CANCELLED -> "Interview Cancelled: " + job + " at " + company;
            case INTERVIEW_FEEDBACK -> "Interview Feedback Available: " + job + " at " + company;
            case CANDIDATE_HIRED -> "Offer of Employment: Welcome to " + company + " (" + job + ")";
            case NEW_APPLICATION_RECEIVED -> "New Application Received: " + job + " at " + company;
            case RESUME_SCAN_COMPLETED -> "Resume Analysis Completed: " + job;
            case INTERVIEW_CONFIRMED -> "Interview Confirmed by Candidate: " + job;
            default -> "SmartHire Recruitment Update: " + job + " at " + company;
        };
    }

    private String getTemplateContent(NotificationEventType eventType) {
        String fileName = TEMPLATE_FILE_MAP.get(eventType);
        if (fileName == null) return null;

        // Try reading directly from file system in dev workspace if present for instant hot updates
        try {
            java.io.File diskFile = new java.io.File("src/main/resources/templates/email/" + fileName);
            if (diskFile.exists() && diskFile.isFile()) {
                return java.nio.file.Files.readString(diskFile.toPath(), StandardCharsets.UTF_8);
            }
        } catch (Exception ignored) {
        }

        try {
            ClassPathResource resource = new ClassPathResource("templates/email/" + fileName);
            try (InputStream is = resource.getInputStream()) {
                return new String(is.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (Exception ex) {
            log.warn("Could not read template file 'templates/email/{}': {}", fileName, ex.getMessage());
            return null;
        }
    }

    private String generateFallbackHtml(NotificationEventType eventType, Map<String, Object> variables) {
        String cand = (variables != null && variables.get("candidateName") != null) ? variables.get("candidateName").toString() : "Candidate";
        String job = (variables != null && variables.get("jobTitle") != null) ? variables.get("jobTitle").toString() : "Role";
        String comp = (variables != null && variables.get("companyName") != null) ? variables.get("companyName").toString() : "SmartHire";

        return "<div style='font-family: sans-serif; padding: 20px;'>" +
                "<h2>SmartHire ATS Notification</h2>" +
                "<p>Hello " + cand + ",</p>" +
                "<p>Update for <strong>" + job + "</strong> at <strong>" + comp + "</strong>: " + eventType.name() + "</p>" +
                "</div>";
    }
}
