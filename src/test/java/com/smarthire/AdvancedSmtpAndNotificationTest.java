package com.smarthire;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.dto.HrNotificationPreferenceDTO;
import com.smarthire.entity.*;
import com.smarthire.repository.HrEmailSettingRepository;
import com.smarthire.repository.HrNotificationPreferenceRepository;
import com.smarthire.repository.NotificationOutboxRepository;
import com.smarthire.repository.NotificationRepository;
import com.smarthire.repository.UserRepository;
import com.smarthire.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class AdvancedSmtpAndNotificationTest {

    private HrNotificationPreferenceRepository preferenceRepository;
    private com.smarthire.repository.HrPersonalNotificationPreferenceRepository personalPreferenceRepository;
    private NotificationOutboxRepository outboxRepository;
    private NotificationRepository notificationRepository;
    private UserRepository userRepository;
    private HrEmailSettingRepository hrEmailSettingRepository;
    private RealtimeSyncService realtimeSyncService;
    private DynamicEmailService dynamicEmailService;
    private com.smarthire.repository.NotificationQueueRepository queueRepository;
    private com.smarthire.repository.NotificationDeliveryLogRepository deliveryLogRepository;

    private NotificationPreferenceService preferenceService;
    private NotificationTemplateService templateService;
    private NotificationOutboxService outboxService;
    private NotificationDeliveryWorker deliveryWorker;
    private NotificationQueueService queueService;
    private NotificationQueueWorker queueWorker;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        preferenceRepository = mock(HrNotificationPreferenceRepository.class);
        personalPreferenceRepository = mock(com.smarthire.repository.HrPersonalNotificationPreferenceRepository.class);
        outboxRepository = mock(NotificationOutboxRepository.class);
        notificationRepository = mock(NotificationRepository.class);
        userRepository = mock(UserRepository.class);
        hrEmailSettingRepository = mock(HrEmailSettingRepository.class);
        realtimeSyncService = mock(RealtimeSyncService.class);
        dynamicEmailService = mock(DynamicEmailService.class);
        queueRepository = mock(com.smarthire.repository.NotificationQueueRepository.class);
        deliveryLogRepository = mock(com.smarthire.repository.NotificationDeliveryLogRepository.class);
        objectMapper = new ObjectMapper();

        preferenceService = new NotificationPreferenceService(preferenceRepository, personalPreferenceRepository);
        templateService = new NotificationTemplateService();
        outboxService = new NotificationOutboxService(
                outboxRepository,
                notificationRepository,
                preferenceService,
                userRepository,
                realtimeSyncService,
                objectMapper
        );

        deliveryWorker = new NotificationDeliveryWorker(
                outboxRepository,
                hrEmailSettingRepository,
                dynamicEmailService,
                templateService,
                objectMapper
        );

        queueService = new NotificationQueueService(
                queueRepository,
                deliveryLogRepository,
                preferenceService,
                templateService,
                userRepository,
                objectMapper
        );

        queueWorker = new NotificationQueueWorker(
                queueRepository,
                deliveryLogRepository,
                notificationRepository,
                hrEmailSettingRepository,
                preferenceService,
                dynamicEmailService,
                templateService,
                realtimeSyncService,
                objectMapper
        );
    }

    @Test
    @DisplayName("TEST 7: HR Isolation - HR A preferences must never affect HR B")
    void testHrDataIsolation() {
        Long hrA = 101L;
        Long hrB = 202L;

        // HR A: Shortlist email enabled, Rejection email disabled
        HrNotificationPreference hrAPrefShortlist = HrNotificationPreference.builder()
                .hrUserId(hrA)
                .eventType(NotificationEventType.CANDIDATE_SHORTLISTED)
                .emailEnabled(true)
                .inAppEnabled(true)
                .build();
        HrNotificationPreference hrAPrefReject = HrNotificationPreference.builder()
                .hrUserId(hrA)
                .eventType(NotificationEventType.CANDIDATE_REJECTED)
                .emailEnabled(false)
                .inAppEnabled(true)
                .build();

        // HR B: Shortlist email disabled, Rejection email enabled
        HrNotificationPreference hrBPrefShortlist = HrNotificationPreference.builder()
                .hrUserId(hrB)
                .eventType(NotificationEventType.CANDIDATE_SHORTLISTED)
                .emailEnabled(false)
                .inAppEnabled(true)
                .build();
        HrNotificationPreference hrBPrefReject = HrNotificationPreference.builder()
                .hrUserId(hrB)
                .eventType(NotificationEventType.CANDIDATE_REJECTED)
                .emailEnabled(true)
                .inAppEnabled(true)
                .build();

        when(preferenceRepository.findByHrUserIdAndEventType(hrA, NotificationEventType.CANDIDATE_SHORTLISTED))
                .thenReturn(Optional.of(hrAPrefShortlist));
        when(preferenceRepository.findByHrUserIdAndEventType(hrA, NotificationEventType.CANDIDATE_REJECTED))
                .thenReturn(Optional.of(hrAPrefReject));

        when(preferenceRepository.findByHrUserIdAndEventType(hrB, NotificationEventType.CANDIDATE_SHORTLISTED))
                .thenReturn(Optional.of(hrBPrefShortlist));
        when(preferenceRepository.findByHrUserIdAndEventType(hrB, NotificationEventType.CANDIDATE_REJECTED))
                .thenReturn(Optional.of(hrBPrefReject));

        // Verify HR A
        assertTrue(preferenceService.isEmailEnabled(hrA, NotificationEventType.CANDIDATE_SHORTLISTED));
        assertFalse(preferenceService.isEmailEnabled(hrA, NotificationEventType.CANDIDATE_REJECTED));

        // Verify HR B (completely isolated)
        assertFalse(preferenceService.isEmailEnabled(hrB, NotificationEventType.CANDIDATE_SHORTLISTED));
        assertTrue(preferenceService.isEmailEnabled(hrB, NotificationEventType.CANDIDATE_REJECTED));
    }

    @Test
    @DisplayName("TEST 2: Shortlisting - Outbox queues email and in-app when preferences enabled")
    void testShortlistingOutboxQueue() {
        Long hrId = 1L;
        when(preferenceRepository.findByHrUserIdAndEventType(eq(hrId), any())).thenReturn(Optional.empty()); // defaults to true
        when(outboxRepository.findByEventIdAndChannel(anyString(), anyString())).thenReturn(Optional.empty());

        Map<String, Object> data = Map.of(
                "candidateName", "Rakesh Rathore",
                "jobTitle", "Senior Java Developer",
                "companyName", "Information Tech"
        );

        Map<String, Object> result = outboxService.scheduleEvent(
                NotificationEventType.CANDIDATE_SHORTLISTED,
                hrId,
                55L,
                "rakesh@example.com",
                28L,
                10L,
                data
        );

        assertTrue((Boolean) result.get("emailQueued"));
        assertTrue((Boolean) result.get("inAppQueued"));
        verify(outboxRepository, times(2)).save(any(NotificationOutbox.class));
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    @DisplayName("TEST 3: Rejection - When email disabled, only in-app outbox is created")
    void testRejectionEmailDisabled() {
        Long hrId = 2L;
        HrNotificationPreference pref = HrNotificationPreference.builder()
                .hrUserId(hrId)
                .eventType(NotificationEventType.CANDIDATE_REJECTED)
                .emailEnabled(false)
                .inAppEnabled(true)
                .build();

        when(preferenceRepository.findByHrUserIdAndEventType(hrId, NotificationEventType.CANDIDATE_REJECTED))
                .thenReturn(Optional.of(pref));
        when(outboxRepository.findByEventIdAndChannel(anyString(), anyString())).thenReturn(Optional.empty());

        Map<String, Object> data = Map.of("candidateName", "John Doe");
        Map<String, Object> result = outboxService.scheduleEvent(
                NotificationEventType.CANDIDATE_REJECTED,
                hrId,
                66L,
                "john@example.com",
                29L,
                10L,
                data
        );

        assertFalse((Boolean) result.get("emailQueued"));
        assertTrue((Boolean) result.get("inAppQueued"));
        verify(outboxRepository, times(1)).save(any(NotificationOutbox.class));
    }

    @Test
    @DisplayName("TEST 8: SMTP Failure - Delivery worker records error and schedules exponential retry")
    void testSmtpFailureExponentialRetry() {
        Long hrId = 5L;
        HrEmailSetting setting = HrEmailSetting.builder()
                .hrUserId(hrId)
                .senderEmail("recruiter@gmail.com")
                .appPassword("encrypted-secret")
                .isActive(true)
                .build();

        when(hrEmailSettingRepository.findByHrUserIdAndIsActiveTrue(hrId)).thenReturn(Optional.of(setting));
        when(dynamicEmailService.sendEmailFromHr(anyLong(), anyString(), anyString(), anyString())).thenReturn(false);

        NotificationOutbox item = NotificationOutbox.builder()
                .id(999L)
                .hrUserId(hrId)
                .recipientEmail("applicant@gmail.com")
                .channel("EMAIL")
                .eventType(NotificationEventType.INTERVIEW_SCHEDULED)
                .deliveryStatus("PENDING")
                .retryCount(0)
                .payloadJson("{\"candidateName\":\"Test Candidate\"}")
                .createdAt(LocalDateTime.now())
                .build();

        deliveryWorker.processSingleItem(item);

        assertEquals("RETRY_PENDING", item.getDeliveryStatus());
        assertEquals(1, item.getRetryCount());
        assertNotNull(item.getNextRetryAt());
        assertNotNull(item.getLastError());
        verify(outboxRepository, atLeastOnce()).save(item);
    }

    @Test
    @DisplayName("TEST 8b: Max retries exceeded marks delivery as FAILED permanently")
    void testMaxRetriesFailed() {
        Long hrId = 5L;
        HrEmailSetting setting = HrEmailSetting.builder()
                .hrUserId(hrId)
                .senderEmail("recruiter@gmail.com")
                .appPassword("encrypted-secret")
                .isActive(true)
                .build();

        when(hrEmailSettingRepository.findByHrUserIdAndIsActiveTrue(hrId)).thenReturn(Optional.of(setting));
        when(dynamicEmailService.sendEmailFromHr(anyLong(), anyString(), anyString(), anyString())).thenReturn(false);

        NotificationOutbox item = NotificationOutbox.builder()
                .id(1000L)
                .hrUserId(hrId)
                .recipientEmail("applicant@gmail.com")
                .channel("EMAIL")
                .eventType(NotificationEventType.CANDIDATE_HIRED)
                .deliveryStatus("RETRY_PENDING")
                .retryCount(2) // 3rd attempt will fail
                .payloadJson("{\"candidateName\":\"Test Candidate\"}")
                .createdAt(LocalDateTime.now())
                .build();

        deliveryWorker.processSingleItem(item);

        assertEquals("FAILED", item.getDeliveryStatus());
        assertEquals(3, item.getRetryCount());
        assertNotNull(item.getProcessedAt());
    }

    @Test
    @DisplayName("TEST 9: Duplicate Prevention - Identical event and channel are deduplicated")
    void testDuplicatePrevention() {
        Long hrId = 1L;
        when(preferenceRepository.findByHrUserIdAndEventType(eq(hrId), any())).thenReturn(Optional.empty());

        // Simulate that outbox record already exists
        NotificationOutbox existing = NotificationOutbox.builder()
                .id(123L)
                .channel("EMAIL")
                .build();
        when(outboxRepository.findByEventIdAndChannel(anyString(), eq("EMAIL"))).thenReturn(Optional.of(existing));
        when(outboxRepository.findByEventIdAndChannel(anyString(), eq("IN_APP"))).thenReturn(Optional.of(existing));

        Map<String, Object> result = outboxService.scheduleEvent(
                NotificationEventType.INTERVIEW_FEEDBACK,
                hrId,
                12L,
                "cand@example.com",
                44L,
                11L,
                Map.of("notes", "Strong performance")
        );

        assertFalse((Boolean) result.get("emailQueued"));
        assertFalse((Boolean) result.get("inAppQueued"));
    }

    @Test
    @DisplayName("Email Template Rendering - All 7 Event Types render with dynamic variables")
    void testAll7TemplatesRender() {
        Map<String, Object> vars = new HashMap<>();
        vars.put("candidateName", "Rakesh Rathore");
        vars.put("jobTitle", "Senior Java Developer");
        vars.put("companyName", "Information Tech");
        vars.put("atsScore", "88.0");
        vars.put("interviewDate", "25 November 2026");
        vars.put("interviewTime", "11:00 AM");
        vars.put("interviewMode", "Google Meet");
        vars.put("meetingLink", "https://meet.google.com/test-meet");
        vars.put("feedback", "Excellent problem solving and architecture skills.");
        vars.put("hrName", "Rakesh HR");
        vars.put("hrEmail", "rakeshrathore0724@gmail.com");

        for (NotificationEventType type : NotificationPreferenceService.CANDIDATE_EVENTS) {
            String subject = templateService.getSubject(type, vars);
            String html = templateService.renderHtml(type, vars);

            assertNotNull(subject, "Subject should not be null for " + type);
            assertNotNull(html, "HTML body should not be null for " + type);
            assertTrue(html.contains("Rakesh Rathore"), "HTML should contain candidate name for " + type);
            assertFalse(html.contains("{{candidateName}}"), "Placeholder should be replaced for " + type);
        }
    }

    @Test
    @DisplayName("NotificationQueue: Enqueue both Email & In-App when both preferences are enabled")
    void testNotificationQueueEnqueueBothEnabled() {
        Long hrId = 1L;
        when(preferenceRepository.findByHrUserIdAndEventType(eq(hrId), any())).thenReturn(Optional.empty()); // defaults true
        when(queueRepository.findByEventIdAndChannel(anyString(), anyString())).thenReturn(Optional.empty());

        Map<String, Object> data = Map.of(
                "candidateName", "Rakesh Rathore",
                "jobTitle", "Senior Java Developer",
                "companyName", "Information Tech"
        );

        Map<String, Object> result = queueService.enqueueCandidateEvent(
                NotificationEventType.CANDIDATE_SHORTLISTED,
                hrId,
                55L,
                "rakesh@example.com",
                "Rakesh Rathore",
                28L,
                10L,
                data
        );

        assertTrue((Boolean) result.get("emailEnqueued"));
        assertTrue((Boolean) result.get("inAppEnqueued"));
        verify(queueRepository, times(2)).save(any(NotificationQueue.class));
    }

    @Test
    @DisplayName("NotificationQueue: Suppress In-App when HR disabled In-App notifications")
    void testNotificationQueueInAppDisabled() {
        Long hrId = 1L;
        HrNotificationPreference pref = HrNotificationPreference.builder()
                .hrUserId(hrId)
                .eventType(NotificationEventType.CANDIDATE_REJECTED)
                .emailEnabled(true)
                .inAppEnabled(false) // In-app is disabled!
                .build();
        when(preferenceRepository.findByHrUserIdAndEventType(hrId, NotificationEventType.CANDIDATE_REJECTED))
                .thenReturn(Optional.of(pref));
        when(queueRepository.findByEventIdAndChannel(anyString(), anyString())).thenReturn(Optional.empty());

        Map<String, Object> result = queueService.enqueueCandidateEvent(
                NotificationEventType.CANDIDATE_REJECTED,
                hrId,
                55L,
                "rakesh@example.com",
                "Rakesh Rathore",
                28L,
                10L,
                Map.of("candidateName", "Rakesh")
        );

        assertTrue((Boolean) result.get("emailEnqueued"));
        assertFalse((Boolean) result.get("inAppEnqueued"));
        // Disabled in-app audit log written
        verify(deliveryLogRepository, times(1)).save(any(NotificationDeliveryLog.class));
    }

    @Test
    @DisplayName("NotificationQueue: Suppress Email when HR disabled Email notifications")
    void testNotificationQueueEmailDisabled() {
        Long hrId = 1L;
        HrNotificationPreference pref = HrNotificationPreference.builder()
                .hrUserId(hrId)
                .eventType(NotificationEventType.INTERVIEW_SCHEDULED)
                .emailEnabled(false) // Email disabled!
                .inAppEnabled(true)
                .build();
        when(preferenceRepository.findByHrUserIdAndEventType(hrId, NotificationEventType.INTERVIEW_SCHEDULED))
                .thenReturn(Optional.of(pref));
        when(queueRepository.findByEventIdAndChannel(anyString(), anyString())).thenReturn(Optional.empty());

        Map<String, Object> result = queueService.enqueueCandidateEvent(
                NotificationEventType.INTERVIEW_SCHEDULED,
                hrId,
                55L,
                "rakesh@example.com",
                "Rakesh Rathore",
                28L,
                10L,
                Map.of("candidateName", "Rakesh")
        );

        assertFalse((Boolean) result.get("emailEnqueued"));
        assertTrue((Boolean) result.get("inAppEnqueued"));
        verify(deliveryLogRepository, times(1)).save(any(NotificationDeliveryLog.class));
    }

    @Test
    @DisplayName("NotificationQueueWorker: In-App delivery saves to notifications and broadcasts")
    void testQueueWorkerInAppDelivery() {
        Long hrId = 1L;
        when(preferenceRepository.findByHrUserIdAndEventType(eq(hrId), any())).thenReturn(Optional.empty());

        NotificationQueue item = NotificationQueue.builder()
                .id(101L)
                .hrUserId(hrId)
                .recipientEmail("rakesh@example.com")
                .recipientName("Rakesh Rathore")
                .channel("IN_APP")
                .eventType(NotificationEventType.CANDIDATE_SHORTLISTED)
                .subject("Shortlisted")
                .status("PENDING")
                .payloadJson("{\"candidateName\":\"Rakesh\",\"jobTitle\":\"Java Dev\",\"companyName\":\"IT SoftLab\"}")
                .createdAt(LocalDateTime.now())
                .build();

        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        queueWorker.processSingleQueueItem(item);

        assertEquals("SENT", item.getStatus());
        verify(notificationRepository, times(1)).save(any(Notification.class));
        verify(realtimeSyncService, times(1)).broadcastNotification(any(Notification.class));
        verify(deliveryLogRepository, times(1)).save(any(NotificationDeliveryLog.class));
    }

    @Test
    @DisplayName("NotificationQueueWorker: Dynamic SMTP sends email and logs delivery")
    void testQueueWorkerEmailDelivery() {
        Long hrId = 1L;
        when(preferenceRepository.findByHrUserIdAndEventType(eq(hrId), any())).thenReturn(Optional.empty());

        HrEmailSetting setting = HrEmailSetting.builder()
                .hrUserId(hrId)
                .senderEmail("recruiter@gmail.com")
                .appPassword("gcm-encrypted-pass")
                .isActive(true)
                .isVerified(true)
                .build();
        when(hrEmailSettingRepository.findByHrUserIdAndIsActiveTrue(hrId)).thenReturn(Optional.of(setting));
        when(dynamicEmailService.sendEmailFromHr(eq(hrId), anyString(), any(), any(), any(), anyString(), anyString(), anyBoolean())).thenReturn(true);
        when(dynamicEmailService.sendEmailFromHr(eq(hrId), anyString(), anyString(), anyString())).thenReturn(true);

        NotificationQueue item = NotificationQueue.builder()
                .id(102L)
                .hrUserId(hrId)
                .recipientEmail("candidate@gmail.com")
                .channel("EMAIL")
                .eventType(NotificationEventType.INTERVIEW_SCHEDULED)
                .subject("Interview Scheduled")
                .content("<p>Interview scheduled</p>")
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();

        queueWorker.processSingleQueueItem(item);

        assertEquals("SENT", item.getStatus());
        verify(dynamicEmailService, times(1)).sendEmailFromHr(eq(hrId), eq("candidate@gmail.com"), any(), any(), any(), anyString(), anyString(), anyBoolean());
        verify(deliveryLogRepository, times(1)).save(any(NotificationDeliveryLog.class));
    }
}
