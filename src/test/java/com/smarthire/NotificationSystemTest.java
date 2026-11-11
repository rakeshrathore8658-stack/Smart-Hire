package com.smarthire;

import com.smarthire.entity.Notification;
import com.smarthire.repository.NotificationRepository;
import com.smarthire.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;

class NotificationSystemTest {

    private NotificationRepository notificationRepository;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationRepository = Mockito.mock(NotificationRepository.class);
        notificationService = new NotificationService(notificationRepository);
        Mockito.when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(invocation -> {
                    Notification n = invocation.getArgument(0);
                    if (n.getId() == null) {
                        n.setId(10L);
                    }
                    return n;
                });
    }

    @Test
    @DisplayName("1. Send notification persists notification with normalized email and defaults")
    void testSendNotification_Success() {
        Mockito.when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(invocation -> {
                    Notification n = invocation.getArgument(0);
                    n.setId(10L);
                    return n;
                });

        Notification notif = notificationService.sendNotification(
                "  RakeshRathore8658@GMAIL.COM  ",
                "Rakesh Rathore",
                "Application Stage Updated: Shortlisted",
                "Your application for Java Developer has been moved to Shortlisted stage.",
                "STAGE_CHANGE",
                "/dashboard/analyzerhistory"
        );

        assertNotNull(notif);
        assertEquals(10L, notif.getId());
        assertEquals("rakeshrathore8658@gmail.com", notif.getUserEmail());
        assertEquals("Application Stage Updated: Shortlisted", notif.getTitle());
        assertEquals("STAGE_CHANGE", notif.getType());
        assertFalse(notif.isRead());
    }

    @Test
    @DisplayName("2. HR Action Interview Schedule dispatches valid INTERVIEW notification")
    void testInterviewScheduledNotification() {
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);

        notificationService.sendNotification(
                "alex.morgan@email.com",
                "Alex Morgan",
                "Interview Scheduled 📅 (Technical Round 1)",
                "Interview confirmed on 04 Nov 2026, 11:00 AM via Google Meet.",
                "INTERVIEW",
                "/dashboard/notifications"
        );

        Mockito.verify(notificationRepository).save(captor.capture());
        Notification saved = captor.getValue();

        assertEquals("alex.morgan@email.com", saved.getUserEmail());
        assertEquals("INTERVIEW", saved.getType());
        assertEquals("bi-calendar2-week", saved.getIconClass());
        assertTrue(saved.getIconStyle().contains("0, 0.15") || saved.getIconStyle().contains("0284c7") || saved.getIconStyle().contains("14, 165"));
        assertFalse(saved.isRead());
    }

    @Test
    @DisplayName("3. HR Shortlist Action dispatches SHORTLIST notification with stars icon")
    void testShortlistNotification() {
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);

        notificationService.sendNotification(
                "alex.morgan@email.com",
                "Alex Morgan",
                "You have been Shortlisted! ⭐",
                "Congratulations! Your profile has been shortlisted for Full Stack Developer.",
                "SHORTLIST",
                "/dashboard/analyzerhistory"
        );

        Mockito.verify(notificationRepository).save(captor.capture());
        Notification saved = captor.getValue();

        assertEquals("SHORTLIST", saved.getType());
        assertEquals("bi-stars", saved.getIconClass());
    }

    @Test
    @DisplayName("4. Unread count and Mark All as Read flow")
    void testUnreadCountAndMarkAllRead() {
        Mockito.when(notificationRepository.countByUserEmailIgnoreCaseAndIsReadFalse("alex.morgan@email.com"))
                .thenReturn(3L);

        long unread = notificationService.getUnreadCount("alex.morgan@email.com");
        assertEquals(3L, unread);

        notificationService.markAllRead("alex.morgan@email.com");
        Mockito.verify(notificationRepository).markAllAsReadForEmail("alex.morgan@email.com");
    }

    @Test
    @DisplayName("5. Notification relative time ago formatting")
    void testTimeAgoFormatting() {
        Notification nNow = Notification.builder()
                .createdAt(LocalDateTime.now().minusSeconds(15))
                .build();
        assertEquals("Just now", nNow.getTimeAgo());

        Notification nMins = Notification.builder()
                .createdAt(LocalDateTime.now().minusMinutes(25))
                .build();
        assertEquals("25 mins ago", nMins.getTimeAgo());

        Notification nHours = Notification.builder()
                .createdAt(LocalDateTime.now().minusHours(3))
                .build();
        assertEquals("3 hours ago", nHours.getTimeAgo());

        Notification nDays = Notification.builder()
                .createdAt(LocalDateTime.now().minusDays(2))
                .build();
        assertEquals("2 days ago", nDays.getTimeAgo());
    }
}
