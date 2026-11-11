package com.smarthire.controller;

import com.smarthire.entity.Notification;
import com.smarthire.service.NotificationService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;

    private String getActiveUserEmail() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null && attrs.getRequest() != null && attrs.getRequest().getSession(false) != null) {
                HttpSession session = attrs.getRequest().getSession(false);
                String email = (String) session.getAttribute("userEmail");
                if (email != null && !email.isBlank()) {
                    return email.trim().toLowerCase();
                }
            }
        } catch (Exception ignored) {
        }

        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null && !auth.getName().equalsIgnoreCase("anonymousUser")) {
                return auth.getName().trim().toLowerCase();
            }
        } catch (Exception ignored) {
        }

        return "";
    }

    private String resolveUserEmail(String emailParam, String headerEmail) {
        if (emailParam != null && !emailParam.isBlank()) {
            return emailParam.trim().toLowerCase();
        }
        if (headerEmail != null && !headerEmail.isBlank()) {
            return headerEmail.trim().toLowerCase();
        }
        return getActiveUserEmail();
    }

    @GetMapping
    public ResponseEntity<?> getUserNotifications(
            @RequestParam(value = "email", required = false) String emailParam,
            @RequestHeader(value = "X-User-Email", required = false) String headerEmail) {
        String email = resolveUserEmail(emailParam, headerEmail);
        List<Notification> list = notificationService.getNotificationsForUser(email);
        long unread = notificationService.getUnreadCount(email);
        return ResponseEntity.ok(Map.of(
                "userEmail", email,
                "unreadCount", unread,
                "totalCount", list.size(),
                "notifications", list
        ));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(
            @RequestParam(value = "email", required = false) String emailParam,
            @RequestHeader(value = "X-User-Email", required = false) String headerEmail) {
        String email = resolveUserEmail(emailParam, headerEmail);
        long unread = notificationService.getUnreadCount(email);
        return ResponseEntity.ok(Map.of("unreadCount", unread));
    }

    @GetMapping("/unread")
    public ResponseEntity<?> getUnreadNotifications(
            @RequestParam(value = "email", required = false) String emailParam,
            @RequestHeader(value = "X-User-Email", required = false) String headerEmail) {
        String email = resolveUserEmail(emailParam, headerEmail);
        List<Notification> list = notificationService.getUnreadNotifications(email);
        return ResponseEntity.ok(Map.of(
                "unreadCount", list.size(),
                "notifications", list
        ));
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<?> markAllAsReadPost(
            @RequestParam(value = "email", required = false) String emailParam,
            @RequestHeader(value = "X-User-Email", required = false) String headerEmail) {
        String email = resolveUserEmail(emailParam, headerEmail);
        notificationService.markAllRead(email);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "All notifications marked as read."
        ));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<?> markAllAsReadPatch(
            @RequestParam(value = "email", required = false) String emailParam,
            @RequestHeader(value = "X-User-Email", required = false) String headerEmail) {
        return markAllAsReadPost(emailParam, headerEmail);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getNotificationById(
            @PathVariable("id") Long id,
            @RequestParam(value = "email", required = false) String emailParam,
            @RequestHeader(value = "X-User-Email", required = false) String headerEmail) {
        String email = resolveUserEmail(emailParam, headerEmail);
        return notificationService.getNotificationById(id).map(notif -> {
            // Validate ownership: candidate cannot access other candidate's notifications
            if (email != null && !email.isBlank() && notif.getUserEmail() != null
                    && !notif.getUserEmail().equalsIgnoreCase(email)) {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                boolean isHr = auth != null && auth.getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equalsIgnoreCase("ROLE_HR") || a.getAuthority().equalsIgnoreCase("HR"));
                if (!isHr) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("message", "Access denied: You cannot view notifications belonging to other candidates."));
                }
            }

            // Auto-mark as read on viewing details if currently unread
            if (!notif.isRead()) {
                notificationService.markAsRead(id);
                notif.setRead(true);
            }

            return ResponseEntity.ok(notif);
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markAsReadPost(@PathVariable("id") Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "notificationId", id,
                "message", "Notification marked as read."
        ));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markAsReadPatch(@PathVariable("id") Long id) {
        return markAsReadPost(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable("id") Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "notificationId", id,
                "message", "Notification deleted successfully."
        ));
    }
}
