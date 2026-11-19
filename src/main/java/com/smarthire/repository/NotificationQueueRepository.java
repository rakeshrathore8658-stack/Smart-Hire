package com.smarthire.repository;

import com.smarthire.entity.NotificationQueue;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationQueueRepository extends JpaRepository<NotificationQueue, Long> {

    Optional<NotificationQueue> findByEventIdAndChannel(String eventId, String channel);

    @Query("SELECT q FROM NotificationQueue q " +
           "WHERE q.status = 'PENDING' " +
           "   OR (q.status = 'RETRY_PENDING' AND (q.nextRetryAt IS NULL OR q.nextRetryAt <= :now)) " +
           "ORDER BY q.createdAt ASC")
    List<NotificationQueue> findClaimableItems(@Param("now") LocalDateTime now, Pageable pageable);

    @Query("SELECT q FROM NotificationQueue q " +
           "WHERE q.status = 'PENDING' " +
           "   OR (q.status = 'RETRY_PENDING' AND (q.nextRetryAt IS NULL OR q.nextRetryAt <= :now)) " +
           "ORDER BY q.createdAt ASC")
    List<NotificationQueue> findPendingItems(@Param("now") LocalDateTime now);

    List<NotificationQueue> findByHrUserIdOrderByCreatedAtDesc(Long hrUserId);

    List<NotificationQueue> findByRecipientEmailOrderByCreatedAtDesc(String recipientEmail);

    long countByStatus(String status);
}
