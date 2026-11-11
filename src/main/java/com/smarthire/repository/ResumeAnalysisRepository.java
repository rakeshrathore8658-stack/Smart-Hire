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

    Optional<ResumeAnalysis> findFirstByResumeIdAndTargetJobRole(Long resumeId, String targetJobRole);

    List<ResumeAnalysis> findByCandidateEmailNormalizedOrderByCreatedAtDesc(String candidateEmailNormalized);

    List<ResumeAnalysis> findByCandidateEmailNormalized(String candidateEmailNormalized);

    long countByResumeId(Long resumeId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM ResumeAnalysis ra WHERE ra.resume.id = :resumeId")
    void deleteByResumeId(@org.springframework.data.repository.query.Param("resumeId") Long resumeId);
}
