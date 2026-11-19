package com.smarthire.repository;

import com.smarthire.entity.HrNotificationPreference;
import com.smarthire.entity.NotificationEventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HrNotificationPreferenceRepository extends JpaRepository<HrNotificationPreference, Long> {

    List<HrNotificationPreference> findByHrUserId(Long hrUserId);

    Optional<HrNotificationPreference> findByHrUserIdAndEventType(Long hrUserId, NotificationEventType eventType);

    void deleteByHrUserId(Long hrUserId);
}
