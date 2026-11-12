package com.smarthire.repository;

import com.smarthire.entity.ResumeAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResumeAnalysisRepository extends JpaRepository<ResumeAnalysis, Long> {

    List<ResumeAnalysis> findByResumeIdOrderByCreatedAtDesc(Long resumeId);

    Optional<ResumeAnalysis> findTopByResumeIdOrderByCreatedAtDesc(Long resumeId);

    List<ResumeAnalysis> findTop10ByOrderByCreatedAtDesc();

    List<ResumeAnalysis> findAllByOrderByCreatedAtDesc();

    List<ResumeAnalysis> findByShortlistedTrueOrderByCreatedAtDesc();

    List<ResumeAnalysis> findByStageOrderByCreatedAtDesc(String stage);

    List<ResumeAnalysis> findTop5ByOrderByOverallScoreDesc();

    Optional<ResumeAnalysis> findFirstByCandidateEmailNormalizedAndTargetJobRoleNormalized(
            String candidateEmailNormalized, String targetJobRoleNormalized);

    Optional<ResumeAnalysis> findFirstByCandidatePhoneNormalizedAndTargetJobRoleNormalized(
            String candidatePhoneNormalized, String targetJobRoleNormalized);

    Optional<ResumeAnalysis> findFirstByUserIdAndTargetJobRoleNormalized(
            Long userId, String targetJobRoleNormalized);

    Optional<ResumeAnalysis> findFirstByResumeIdAndTargetJobRole(Long resumeId, String targetJobRole);

    List<ResumeAnalysis> findByCandidateEmailNormalizedOrderByCreatedAtDesc(String candidateEmailNormalized);

    List<ResumeAnalysis> findByCandidateEmailNormalized(String candidateEmailNormalized);

    long countByResumeId(Long resumeId);

    List<ResumeAnalysis> findByUserIdOrderByCreatedAtDesc(Long userId);

    @org.springframework.data.jpa.repository.Query("SELECT ra FROM ResumeAnalysis ra " +
            "WHERE (:userId IS NOT NULL AND ((ra.user IS NOT NULL AND ra.user.id = :userId) " +
            "   OR (ra.resume IS NOT NULL AND ra.resume.user IS NOT NULL AND ra.resume.user.id = :userId))) " +
            "   OR (:email IS NOT NULL AND :email <> '' AND (LOWER(ra.candidateEmailNormalized) = LOWER(:email) " +
            "       OR LOWER(ra.candidateEmail) = LOWER(:email))) " +
            "ORDER BY ra.createdAt DESC")
    List<ResumeAnalysis> findAllForUser(@org.springframework.data.repository.query.Param("userId") Long userId,
                                        @org.springframework.data.repository.query.Param("email") String email);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(ra) FROM ResumeAnalysis ra " +
            "WHERE (:userId IS NOT NULL AND ((ra.user IS NOT NULL AND ra.user.id = :userId) " +
            "   OR (ra.resume IS NOT NULL AND ra.resume.user IS NOT NULL AND ra.resume.user.id = :userId))) " +
            "   OR (:email IS NOT NULL AND :email <> '' AND (LOWER(ra.candidateEmailNormalized) = LOWER(:email) " +
            "       OR LOWER(ra.candidateEmail) = LOWER(:email)))")
    long countForUser(@org.springframework.data.repository.query.Param("userId") Long userId,
                      @org.springframework.data.repository.query.Param("email") String email);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM ResumeAnalysis ra WHERE ra.resume.id = :resumeId")
    void deleteByResumeId(@org.springframework.data.repository.query.Param("resumeId") Long resumeId);
}
