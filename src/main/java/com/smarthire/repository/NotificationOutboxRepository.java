package com.smarthire.repository;

import com.smarthire.entity.NotificationOutbox;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationOutboxRepository extends JpaRepository<NotificationOutbox, Long> {

    Optional<NotificationOutbox> findByEventIdAndChannel(String eventId, String channel);

    @Query("SELECT o FROM NotificationOutbox o WHERE (o.deliveryStatus = 'PENDING' OR (o.deliveryStatus = 'RETRY_PENDING' AND (o.nextRetryAt IS NULL OR o.nextRetryAt <= :now))) AND o.retryCount < 5 ORDER BY o.createdAt ASC")
    List<NotificationOutbox> findPendingItems(@Param("now") LocalDateTime now);

    List<NotificationOutbox> findByHrUserId(Long hrUserId);

    List<NotificationOutbox> findByApplicationId(Long applicationId);
}
