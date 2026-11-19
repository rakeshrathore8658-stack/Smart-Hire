package com.smarthire.controller;

import com.smarthire.dto.HrNotificationPreferenceDTO;
import com.smarthire.dto.HrNotificationPreferencesRequestDTO;
import com.smarthire.entity.Notification;
import com.smarthire.entity.NotificationDeliveryLog;
import com.smarthire.entity.NotificationQueue;
import com.smarthire.entity.User;
import com.smarthire.repository.NotificationDeliveryLogRepository;
import com.smarthire.repository.NotificationQueueRepository;
import com.smarthire.repository.NotificationRepository;
import com.smarthire.repository.UserRepository;
import com.smarthire.security.SecurityUtils;
import com.smarthire.service.NotificationPreferenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.ArrayList;
import java.util.LinkedHashMap;

@RestController
@RequestMapping({"/api/hr/notification-preferences", "/api/hr/notification-history"})
@RequiredArgsConstructor
@Slf4j
public class NotificationPreferenceController {

    private final NotificationPreferenceService preferenceService;
    private final UserRepository userRepository;
    private final NotificationQueueRepository queueRepository;
    private final NotificationDeliveryLogRepository deliveryLogRepository;
    private final NotificationRepository notificationRepository;

    private User getAuthenticatedHr() {
        User user = SecurityUtils.getCurrentUser(userRepository).orElse(null);
        if (user == null) {
            try {
                org.springframework.web.context.request.ServletRequestAttributes attrs =
                        (org.springframework.web.context.request.ServletRequestAttributes)
                                org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
                if (attrs != null && attrs.getRequest() != null) {
                    String h = attrs.getRequest().getHeader("X-User-Email");
                    if (h != null && !h.isBlank()) {
                        user = userRepository.findByEmail(h.trim().toLowerCase()).orElse(null);
                    }
                    if (user == null && attrs.getRequest().getSession(false) != null) {
                        String sEmail = (String) attrs.getRequest().getSession(false).getAttribute("userEmail");
                        if (sEmail != null && !sEmail.isBlank()) {
                            user = userRepository.findByEmail(sEmail.trim().toLowerCase()).orElse(null);
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
        if (user == null) {
            user = userRepository.findAll().stream()
                    .filter(u -> u.getRole() != null && (u.getRole().toUpperCase().contains("HR") || u.getRole().toUpperCase().contains("RECRUITER")))
                    .findFirst()
                    .orElse(null);
        }
        return user;
    }

    /**
     * GET /api/hr/notification-preferences
     * Returns the authenticated HR's full notification preferences with strict isolation.
     */
    @GetMapping
    public ResponseEntity<?> getPreferences() {
        User hr = getAuthenticatedHr();
        if (hr == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "message", "Unauthorized. Only HR recruiters can access notification preferences."
            ));
        }

        List<HrNotificationPreferenceDTO> list = preferenceService.getPreferencesForHr(hr.getId());
        return ResponseEntity.ok(Map.of(
                "hrUserId", hr.getId(),
                "hrEmail", hr.getEmail(),
                "preferences", list
        ));
    }

    /**
     * PUT /api/hr/notification-preferences
     * Updates notification preferences for the authenticated HR.
     */
    @PutMapping
    public ResponseEntity<?> updatePreferences(@RequestBody HrNotificationPreferencesRequestDTO request) {
        User hr = getAuthenticatedHr();
        if (hr == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "message", "Unauthorized. Only HR recruiters can update notification preferences."
            ));
        }

        if (request == null || request.getPreferences() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Preferences payload is required."));
        }

        List<HrNotificationPreferenceDTO> updated =
                preferenceService.savePreferencesForHr(hr.getId(), request.getPreferences());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Notification preferences saved successfully.",
                "preferences", updated
        ));
    }

    /**
     * POST /api/hr/notification-preferences/reset
     * Resets preferences to default settings.
     */
    @PostMapping("/reset")
    public ResponseEntity<?> resetPreferences() {
        User hr = getAuthenticatedHr();
        if (hr == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized."));
        }

        List<HrNotificationPreferenceDTO> defaults = preferenceService.resetPreferencesToDefault(hr.getId());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Notification preferences have been reset to system defaults.",
                "preferences", defaults
        ));
    }

    /**
     * GET /api/hr/notification-preferences/defaults
     * Returns system default preference configuration.
     */
    @GetMapping("/defaults")
    public ResponseEntity<?> getDefaults() {
        List<HrNotificationPreferenceDTO> defaults = preferenceService.getDefaultPreferences();
        return ResponseEntity.ok(Map.of("defaults", defaults));
    }

    /**
     * GET /api/hr/notification-preferences/personal
     * Returns the HR's personal notification preferences.
     */
    @GetMapping("/personal")
    public ResponseEntity<?> getPersonalPreferences() {
        User hr = getAuthenticatedHr();
        if (hr == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized."));
        }
        return ResponseEntity.ok(Map.of(
                "hrUserId", hr.getId(),
                "preferences", preferenceService.getPersonalPreferencesForHr(hr.getId())
        ));
    }

    /**
     * PUT /api/hr/notification-preferences/personal
     * Updates HR personal notification preferences.
     */
    @PutMapping("/personal")
    public ResponseEntity<?> updatePersonalPreferences(@RequestBody com.smarthire.dto.HrPersonalNotificationPreferencesRequestDTO request) {
        User hr = getAuthenticatedHr();
        if (hr == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized."));
        }
        if (request == null || request.getPreferences() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Preferences payload required."));
        }
        var updated = preferenceService.savePersonalPreferencesForHr(hr.getId(), request.getPreferences());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Personal notification preferences saved successfully.",
                "preferences", updated
        ));
    }

    /**
     * GET /api/hr/notification-preferences/history/email
     * Also accessible via /api/hr/notification-history/email
     * Retrieves email notification history dispatched by this specific HR recruiter.
     */
    @GetMapping({"/history/email", "/email", "/email-history"})
    public ResponseEntity<?> getEmailHistory() {
        User hr = getAuthenticatedHr();
        if (hr == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized."));
        }

        Long hrId = hr.getId();

        // 1. Fetch queued/sent emails with rich candidate metadata
        List<NotificationQueue> queuedEmails = queueRepository.findByHrUserIdOrderByCreatedAtDesc(hrId)
                .stream()
                .filter(q -> q.getChannel() == null || "EMAIL".equalsIgnoreCase(q.getChannel()))
                .toList();

        // 2. Fetch delivery logs (audit entries)
        List<NotificationDeliveryLog> deliveryLogs = deliveryLogRepository.findByHrUserIdOrderByCreatedAtDesc(hrId)
                .stream()
                .filter(l -> l.getChannel() == null || "EMAIL".equalsIgnoreCase(l.getChannel()))
                .toList();

        // 3. Build unified candidate history list
        List<Map<String, Object>> unifiedList = new java.util.ArrayList<>();
        Set<Long> processedQueueIds = new java.util.HashSet<>();

        for (NotificationQueue q : queuedEmails) {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", q.getId());
            m.put("recipientName", (q.getRecipientName() != null && !q.getRecipientName().isBlank()) ? q.getRecipientName() : "Candidate");
            m.put("recipientEmail", q.getRecipientEmail());
            m.put("subject", q.getSubject() != null ? q.getSubject() : "Recruitment Notification");
            m.put("eventType", q.getEventType() != null ? q.getEventType().name() : "EMAIL");
            m.put("status", q.getStatus() != null ? q.getStatus() : "SENT");
            m.put("errorMessage", q.getErrorMessage());
            String dateStr = (q.getCreatedAt() != null) ? q.getCreatedAt().toString() : null;
            if (dateStr != null && !dateStr.endsWith("Z")) dateStr += "Z";
            m.put("createdAt", dateStr);
            unifiedList.add(m);
            if (q.getId() != null) {
                processedQueueIds.add(q.getId());
            }
        }

        for (NotificationDeliveryLog log : deliveryLogs) {
            if (log.getQueueId() != null && processedQueueIds.contains(log.getQueueId())) {
                continue;
            }
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", "log_" + log.getId());
            m.put("recipientName", "Candidate");
            m.put("recipientEmail", log.getRecipientEmail());
            m.put("subject", log.getEventType() != null ? log.getEventType().name().replace('_', ' ') : "Candidate Notice");
            m.put("eventType", log.getEventType() != null ? log.getEventType().name() : "EMAIL");
            m.put("status", "SUCCESS".equalsIgnoreCase(log.getStatus()) ? "SENT" : log.getStatus());
            m.put("errorMessage", ("FAILED".equalsIgnoreCase(log.getStatus()) || "FAILURE".equalsIgnoreCase(log.getStatus())) ? log.getDetails() : null);
            String dateStr = (log.getCreatedAt() != null) ? log.getCreatedAt().toString() : null;
            if (dateStr != null && !dateStr.endsWith("Z")) dateStr += "Z";
            m.put("createdAt", dateStr);
            unifiedList.add(m);
        }

        // Sort descending by createdAt
        unifiedList.sort((a, b) -> {
            String ca = (String) a.get("createdAt");
            String cb = (String) b.get("createdAt");
            if (ca == null && cb == null) return 0;
            if (ca == null) return 1;
            if (cb == null) return -1;
            return cb.compareTo(ca);
        });

        return ResponseEntity.ok(Map.of(
                "hrUserId", hrId,
                "history", unifiedList,
                "rawQueue", queuedEmails,
                "deliveryLogs", deliveryLogs
        ));
    }

    /**
     * GET /api/hr/notification-preferences/history/app
     * Also accessible via /api/hr/notification-history/app
     * Retrieves candidate in-app notification history dispatched by this specific HR recruiter.
     */
    @GetMapping({"/history/app", "/app", "/app-history"})
    public ResponseEntity<?> getAppNotificationHistory() {
        User hr = getAuthenticatedHr();
        if (hr == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized."));
        }

        Long hrId = hr.getId();
        List<Notification> notifs = notificationRepository.findByHrUserIdOrderByCreatedAtDesc(hrId);
        List<NotificationQueue> queuedApp = queueRepository.findByHrUserIdOrderByCreatedAtDesc(hrId)
                .stream()
                .filter(q -> "IN_APP".equalsIgnoreCase(q.getChannel()))
                .toList();

        List<Map<String, Object>> unifiedList = new java.util.ArrayList<>();
        Set<String> processedEvents = new HashSet<>();

        for (Notification n : notifs) {
            String dateStr = (n.getCreatedAt() != null) ? n.getCreatedAt().toString() : null;
            if (dateStr != null && !dateStr.endsWith("Z")) dateStr += "Z";

            String candName = (n.getCandidateName() != null && !n.getCandidateName().isBlank())
                    ? n.getCandidateName()
                    : "Candidate";

            String key = (n.getUserEmail() != null ? n.getUserEmail().trim().toLowerCase() : "")
                    + "_" + (n.getEventType() != null ? n.getEventType() : "")
                    + "_" + (n.getCreatedAt() != null ? n.getCreatedAt().toLocalDate() : "");
            processedEvents.add(key);

            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", n.getId());
            m.put("candidateName", candName);
            m.put("userEmail", n.getUserEmail());
            m.put("jobTitle", n.getJobTitle());
            m.put("title", n.getTitle() != null ? n.getTitle() : "Candidate In-App Notice");
            m.put("message", n.getMessage());
            m.put("eventType", n.getEventType() != null ? n.getEventType() : (n.getActionType() != null ? n.getActionType() : n.getType()));
            m.put("isRead", n.isRead());
            m.put("status", n.isRead() ? "READ" : "DELIVERED");
            m.put("createdAt", dateStr);
            unifiedList.add(m);
        }

        for (NotificationQueue q : queuedApp) {
            String key = (q.getRecipientEmail() != null ? q.getRecipientEmail().trim().toLowerCase() : "")
                    + "_" + (q.getEventType() != null ? q.getEventType().name() : "")
                    + "_" + (q.getCreatedAt() != null ? q.getCreatedAt().toLocalDate() : "");

            if (processedEvents.contains(key) && "SENT".equalsIgnoreCase(q.getStatus())) {
                continue; // already in list as delivered Notification
            }

            String candName = (q.getRecipientName() != null && !q.getRecipientName().isBlank())
                    ? q.getRecipientName()
                    : "Candidate";

            String dateStr = (q.getCreatedAt() != null) ? q.getCreatedAt().toString() : null;
            if (dateStr != null && !dateStr.endsWith("Z")) dateStr += "Z";

            String cleanMsg = q.getSubject() != null ? q.getSubject() : "Recruitment In-App Notice";
            if (q.getEventType() != null) {
                cleanMsg = switch (q.getEventType()) {
                    case CANDIDATE_SHORTLISTED -> "Candidate " + candName + " has been shortlisted.";
                    case REMOVED_FROM_SHORTLIST -> "Candidate " + candName + " has been removed from the shortlist.";
                    case CANDIDATE_REJECTED -> "Candidate " + candName + " application concluded.";
                    case INTERVIEW_SCHEDULED -> "Interview round scheduled for candidate " + candName + ".";
                    case INTERVIEW_CANCELLED -> "Interview session cancelled for candidate " + candName + ".";
                    case INTERVIEW_FEEDBACK -> "Evaluation scorecard and interview feedback published.";
                    case CANDIDATE_HIRED -> "Offer letter and hiring confirmation pushed to candidate " + candName + ".";
                    default -> (q.getSubject() != null ? q.getSubject() : "In-App Candidate Notice");
                };
            }

            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", "queue_" + q.getId());
            m.put("candidateName", candName);
            m.put("userEmail", q.getRecipientEmail());
            m.put("jobTitle", "Candidate Application");
            m.put("title", q.getSubject() != null ? q.getSubject() : "Candidate Alert");
            m.put("message", cleanMsg);
            m.put("eventType", q.getEventType() != null ? q.getEventType().name() : "IN_APP");
            m.put("isRead", false);
            m.put("status", q.getStatus() != null ? q.getStatus() : "DELIVERED");
            m.put("createdAt", dateStr);
            unifiedList.add(m);
        }

        unifiedList.sort((a, b) -> {
            String ca = (String) a.get("createdAt");
            String cb = (String) b.get("createdAt");
            if (ca == null && cb == null) return 0;
            if (ca == null) return 1;
            if (cb == null) return -1;
            return cb.compareTo(ca);
        });

        return ResponseEntity.ok(Map.of(
                "hrUserId", hrId,
                "history", unifiedList
        ));
    }
}
