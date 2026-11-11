package com.smarthire.repository;

import com.smarthire.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserEmailIgnoreCaseOrderByCreatedAtDesc(String userEmail);

    List<Notification> findByUserEmailIgnoreCaseAndIsReadFalseOrderByCreatedAtDesc(String userEmail);

    List<Notification> findTop5ByUserEmailIgnoreCaseOrderByCreatedAtDesc(String userEmail);

    long countByUserEmailIgnoreCaseAndIsReadFalse(String userEmail);

    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true WHERE LOWER(n.userEmail) = LOWER(:email)")
    void markAllAsReadForEmail(@Param("email") String email);

    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.id = :id")
    void markAsReadById(@Param("id") Long id);
}
