package com.smarthire.repository;

import com.smarthire.entity.HrEmailSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HrEmailSettingRepository extends JpaRepository<HrEmailSetting, Long> {

    Optional<HrEmailSetting> findFirstByHrUserIdOrderByIdDesc(Long hrUserId);

    Optional<HrEmailSetting> findByHrUserId(Long hrUserId);

    Optional<HrEmailSetting> findByHrUserIdAndIsActiveTrue(Long hrUserId);

    Optional<HrEmailSetting> findFirstByHrUserIdAndIsActiveTrueOrderByIdDesc(Long hrUserId);

    Optional<HrEmailSetting> findFirstByIsActiveTrueAndIsVerifiedTrueOrderByIdDesc();

    Optional<HrEmailSetting> findFirstByIsActiveTrueOrderByIdDesc();

    boolean existsByHrUserId(Long hrUserId);

    void deleteByHrUserId(Long hrUserId);
}
