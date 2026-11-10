package com.resumeanalyzer.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class RealtimeSyncService {

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcast a real-time event across /topic/recruitment and /topic/notifications/all.
     * This notifies HR Dashboards, Candidate Pools, and Seeker History instantly without page refresh.
     */
    public void broadcastEvent(String eventType, String action, Map<String, Object> details) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("event", eventType);
        payload.put("action", action);
        payload.put("timestamp", LocalDateTime.now().toString());
        if (details != null) {
            payload.putAll(details);
        }

        if (messagingTemplate != null) {
            try {
                // Topic for all recruitment and candidate events
                messagingTemplate.convertAndSend("/topic/recruitment", (Object) payload);
                // Also publish to general notifications topic
                messagingTemplate.convertAndSend("/topic/notifications/all", (Object) payload);
                log.info("Real-time WebSocket event published: [{}] (action: {})", eventType, action);
            } catch (Exception ex) {
                log.warn("Failed to publish WebSocket sync event [{}]: {}", eventType, ex.getMessage());
            }
        } else {
            log.debug("SimpMessagingTemplate unavailable; skipping WebSocket broadcast for [{}]", eventType);
        }
    }

    public void notifyResumeAnalyzed(Long analysisId, String candidateName, String role, Integer score, String fileName) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("analysisId", analysisId);
        data.put("candidateName", candidateName != null ? candidateName : "Candidate");
        data.put("targetJobRole", role != null ? role : "Role");
        data.put("overallScore", score != null ? score : 0);
        data.put("fileName", fileName != null ? fileName : "resume.pdf");
        broadcastEvent("RESUME_ANALYZED", "CREATE", data);
    }

    public void notifyResumeDeleted(Long id, String candidateName, String role) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", id);
        data.put("candidateName", candidateName != null ? candidateName : "Candidate");
        data.put("targetJobRole", role != null ? role : "");
        broadcastEvent("RESUME_DELETED", "DELETE", data);
    }

    public void notifyStageUpdated(Long analysisId, String newStage, String candidateName) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("analysisId", analysisId);
        data.put("stage", newStage);
        data.put("candidateName", candidateName != null ? candidateName : "Candidate");
        broadcastEvent("STAGE_UPDATED", "UPDATE", data);
    }

    public void notifyInterviewScheduled(Long analysisId, String candidateName, String round, String interviewDate) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("analysisId", analysisId);
        data.put("candidateName", candidateName != null ? candidateName : "Candidate");
        data.put("interviewRound", round);
        data.put("interviewDate", interviewDate);
        broadcastEvent("INTERVIEW_SCHEDULED", "UPDATE", data);
    }
}
