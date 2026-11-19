package com.smarthire.repository;

import com.smarthire.entity.NotificationDeliveryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationDeliveryLogRepository extends JpaRepository<NotificationDeliveryLog, Long> {

    List<NotificationDeliveryLog> findByHrUserIdOrderByCreatedAtDesc(Long hrUserId);

    List<NotificationDeliveryLog> findByQueueIdOrderByCreatedAtDesc(Long queueId);
}
