package com.smarthire.repository;

import com.smarthire.entity.HrPersonalNotificationPreference;
import com.smarthire.entity.NotificationEventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HrPersonalNotificationPreferenceRepository extends JpaRepository<HrPersonalNotificationPreference, Long> {

    List<HrPersonalNotificationPreference> findByHrUserId(Long hrUserId);

    Optional<HrPersonalNotificationPreference> findByHrUserIdAndEventType(Long hrUserId, NotificationEventType eventType);

    void deleteByHrUserId(Long hrUserId);
}
