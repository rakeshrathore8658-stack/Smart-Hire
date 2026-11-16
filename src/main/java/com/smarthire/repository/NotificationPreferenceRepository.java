package com.smarthire.repository;

import com.smarthire.entity.NotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, Long> {

    @Query("SELECT np FROM NotificationPreference np WHERE np.user.id = :userId")
    Optional<NotificationPreference> findByUserId(@Param("userId") Long userId);

    Optional<NotificationPreference> findByUserEmailIgnoreCase(String userEmail);
}
