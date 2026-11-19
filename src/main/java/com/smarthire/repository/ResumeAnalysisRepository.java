package com.smarthire.repository;

import com.smarthire.entity.ResumeAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("SELECT ra FROM ResumeAnalysis ra WHERE ra.user.id = :userId AND ra.targetJobRoleNormalized = :targetJobRoleNormalized ORDER BY ra.createdAt DESC")
    List<ResumeAnalysis> findByUserAndTargetJobRoleList(
            @Param("userId") Long userId,
            @Param("targetJobRoleNormalized") String targetJobRoleNormalized);

    default Optional<ResumeAnalysis> findFirstByUserIdAndTargetJobRoleNormalized(
            Long userId, String targetJobRoleNormalized) {
        List<ResumeAnalysis> list = findByUserAndTargetJobRoleList(userId, targetJobRoleNormalized);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    Optional<ResumeAnalysis> findFirstByResumeIdAndTargetJobRole(Long resumeId, String targetJobRole);

    List<ResumeAnalysis> findByCandidateEmailNormalizedOrderByCreatedAtDesc(String candidateEmailNormalized);

    List<ResumeAnalysis> findByCandidateEmailNormalized(String candidateEmailNormalized);

    long countByResumeId(Long resumeId);

    @Query("SELECT ra FROM ResumeAnalysis ra WHERE ra.user.id = :userId ORDER BY ra.createdAt DESC")
    List<ResumeAnalysis> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);

    @Query("SELECT ra FROM ResumeAnalysis ra WHERE ra.recruiter.id = :recruiterId ORDER BY ra.createdAt DESC")
    List<ResumeAnalysis> findByRecruiterIdOrderByCreatedAtDesc(@Param("recruiterId") Long recruiterId);

    @Query("SELECT ra FROM ResumeAnalysis ra WHERE ra.recruiter.id = :recruiterId AND (ra.shortlisted = true OR LOWER(ra.stage) = 'shortlisted') ORDER BY ra.createdAt DESC")
    List<ResumeAnalysis> findByRecruiterIdAndShortlistedTrueOrderByCreatedAtDesc(@Param("recruiterId") Long recruiterId);

    @Query("SELECT ra FROM ResumeAnalysis ra WHERE ra.id = :id AND ra.recruiter.id = :recruiterId")
    Optional<ResumeAnalysis> findByIdAndRecruiterId(@Param("id") Long id, @Param("recruiterId") Long recruiterId);

    @Query("SELECT ra FROM ResumeAnalysis ra WHERE ra.id = :id AND ra.user.id = :userId")
    Optional<ResumeAnalysis> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    @Query("SELECT ra FROM ResumeAnalysis ra WHERE ra.candidateEmailNormalized = :candidateEmailNormalized AND ra.targetJobRoleNormalized = :targetJobRoleNormalized AND ra.recruiter.id = :recruiterId ORDER BY ra.createdAt DESC")
    List<ResumeAnalysis> findByCandidateEmailAndRoleAndRecruiter(
            @Param("candidateEmailNormalized") String candidateEmailNormalized,
            @Param("targetJobRoleNormalized") String targetJobRoleNormalized,
            @Param("recruiterId") Long recruiterId);

    default Optional<ResumeAnalysis> findFirstByCandidateEmailNormalizedAndTargetJobRoleNormalizedAndRecruiterId(
            String candidateEmailNormalized, String targetJobRoleNormalized, Long recruiterId) {
        List<ResumeAnalysis> list = findByCandidateEmailAndRoleAndRecruiter(candidateEmailNormalized, targetJobRoleNormalized, recruiterId);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    @org.springframework.data.jpa.repository.Query("SELECT ra FROM ResumeAnalysis ra " +
            "WHERE (ra.recruiter IS NOT NULL AND ra.recruiter.id = :recruiterId) " +
            "  AND (ra.isArchived IS NULL OR ra.isArchived = false) " +
            "  AND (ra.stage IS NULL OR LOWER(ra.stage) <> 'archived') " +
            "ORDER BY ra.createdAt DESC")
    List<ResumeAnalysis> findActiveCandidatesByRecruiter(@org.springframework.data.repository.query.Param("recruiterId") Long recruiterId);

    @org.springframework.data.jpa.repository.Query("SELECT ra FROM ResumeAnalysis ra " +
            "WHERE (ra.recruiter IS NOT NULL AND ra.recruiter.id = :recruiterId) " +
            "  AND (ra.isArchived = true OR LOWER(ra.stage) = 'archived') " +
            "ORDER BY COALESCE(ra.archivedAt, ra.updatedAt, ra.createdAt) DESC")
    List<ResumeAnalysis> findArchivedCandidatesByRecruiter(@org.springframework.data.repository.query.Param("recruiterId") Long recruiterId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(ra) FROM ResumeAnalysis ra " +
            "WHERE (ra.recruiter IS NOT NULL AND ra.recruiter.id = :recruiterId) " +
            "  AND (ra.isArchived IS NULL OR ra.isArchived = false) " +
            "  AND (ra.stage IS NULL OR LOWER(ra.stage) <> 'archived')")
    long countActiveCandidatesByRecruiter(@org.springframework.data.repository.query.Param("recruiterId") Long recruiterId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(ra) FROM ResumeAnalysis ra WHERE ra.job IS NOT NULL AND ra.job.id = :jobId")
    long countByJobId(@org.springframework.data.repository.query.Param("jobId") Long jobId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(ra) FROM ResumeAnalysis ra WHERE ra.job IS NOT NULL AND ra.job.id IN :jobIds")
    long countByJobIdIn(@org.springframework.data.repository.query.Param("jobIds") List<Long> jobIds);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(ra) FROM ResumeAnalysis ra " +
            "WHERE (ra.recruiter IS NOT NULL AND ra.recruiter.id = :recruiterId) " +
            "  AND (ra.isArchived = true OR LOWER(ra.stage) = 'archived')")
    long countArchivedCandidatesByRecruiter(@org.springframework.data.repository.query.Param("recruiterId") Long recruiterId);

    @org.springframework.data.jpa.repository.Query("SELECT ra FROM ResumeAnalysis ra " +
            "WHERE (ra.deletedByJobseeker IS NULL OR ra.deletedByJobseeker = false) " +
            "  AND (" +
            "       (:email IS NOT NULL AND :email <> '' AND (LOWER(ra.candidateEmailNormalized) = LOWER(:email) OR LOWER(ra.candidateEmail) = LOWER(:email))) " +
            "       OR (:userId IS NOT NULL AND ra.user IS NOT NULL AND ra.user.id = :userId AND (ra.candidateEmail IS NULL OR ra.candidateEmail = '' OR LOWER(ra.candidateEmail) = LOWER(:email))) " +
            "      ) " +
            "ORDER BY ra.createdAt DESC")
    List<ResumeAnalysis> findAllForUser(@org.springframework.data.repository.query.Param("userId") Long userId,
                                        @org.springframework.data.repository.query.Param("email") String email);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(ra) FROM ResumeAnalysis ra " +
            "WHERE (ra.deletedByJobseeker IS NULL OR ra.deletedByJobseeker = false) " +
            "  AND (" +
            "       (:email IS NOT NULL AND :email <> '' AND (LOWER(ra.candidateEmailNormalized) = LOWER(:email) OR LOWER(ra.candidateEmail) = LOWER(:email))) " +
            "       OR (:userId IS NOT NULL AND ra.user IS NOT NULL AND ra.user.id = :userId AND (ra.candidateEmail IS NULL OR ra.candidateEmail = '' OR LOWER(ra.candidateEmail) = LOWER(:email))) " +
            "      )")
    long countForUser(@org.springframework.data.repository.query.Param("userId") Long userId,
                      @org.springframework.data.repository.query.Param("email") String email);

    @org.springframework.data.jpa.repository.Query("SELECT ra FROM ResumeAnalysis ra " +
            "WHERE ra.isArchived = true OR LOWER(ra.stage) = 'archived' " +
            "ORDER BY COALESCE(ra.archivedAt, ra.updatedAt, ra.createdAt) DESC")
    List<ResumeAnalysis> findArchivedCandidates();

    @org.springframework.data.jpa.repository.Query("SELECT ra FROM ResumeAnalysis ra " +
            "WHERE (ra.isArchived IS NULL OR ra.isArchived = false) AND (ra.stage IS NULL OR LOWER(ra.stage) <> 'archived') " +
            "ORDER BY ra.createdAt DESC")
    List<ResumeAnalysis> findActiveCandidates();

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(ra) FROM ResumeAnalysis ra " +
            "WHERE ra.isArchived = true OR LOWER(ra.stage) = 'archived'")
    long countArchivedCandidates();

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(ra) FROM ResumeAnalysis ra " +
            "WHERE (ra.isArchived IS NULL OR ra.isArchived = false) AND (ra.stage IS NULL OR LOWER(ra.stage) <> 'archived')")
    long countActiveCandidates();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM ResumeAnalysis ra WHERE ra.resume.id = :resumeId")
    void deleteByResumeId(@org.springframework.data.repository.query.Param("resumeId") Long resumeId);
}
