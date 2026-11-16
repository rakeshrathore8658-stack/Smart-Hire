package com.smarthire.repository;

import com.smarthire.entity.Resume;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResumeRepository extends JpaRepository<Resume, Long> {

    @Query("SELECT r FROM Resume r WHERE r.user.id = :userId ORDER BY r.createdAt DESC")
    List<Resume> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);

    @Query("SELECT r FROM Resume r WHERE r.recruiter.id = :recruiterId ORDER BY r.createdAt DESC")
    List<Resume> findByRecruiterIdOrderByCreatedAtDesc(@Param("recruiterId") Long recruiterId);

    @Query("SELECT r FROM Resume r WHERE r.id = :id AND r.recruiter.id = :recruiterId")
    Optional<Resume> findByIdAndRecruiterId(@Param("id") Long id, @Param("recruiterId") Long recruiterId);

    @Query("SELECT r FROM Resume r WHERE r.id = :id AND r.user.id = :userId")
    Optional<Resume> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    @Query("SELECT COUNT(r) FROM Resume r WHERE r.recruiter.id = :recruiterId")
    long countByRecruiterId(@Param("recruiterId") Long recruiterId);

    @Query("SELECT COUNT(r) FROM Resume r WHERE r.user.id = :userId")
    long countByUserId(@Param("userId") Long userId);

    List<Resume> findTop10ByOrderByCreatedAtDesc();

    Optional<Resume> findFirstByCandidateEmailNormalizedOrderByCreatedAtDesc(String candidateEmailNormalized);

    Optional<Resume> findFirstByCandidatePhoneNormalizedOrderByCreatedAtDesc(String candidatePhoneNormalized);

    Optional<Resume> findFirstByCandidateEmailNormalizedOrCandidatePhoneNormalizedOrderByCreatedAtDesc(
            String candidateEmailNormalized, String candidatePhoneNormalized);

    Optional<Resume> findFirstByFileNameAndFileSizeOrderByCreatedAtDesc(String fileName, Long fileSize);

    Optional<Resume> findFirstByFileNameOrderByCreatedAtDesc(String fileName);

    Optional<Resume> findFirstByCandidateNameIgnoreCaseOrderByCreatedAtDesc(String candidateName);

    @Query("SELECT r FROM Resume r WHERE r.user.id = :userId AND r.candidateEmailNormalized = :candidateEmailNormalized ORDER BY r.createdAt DESC")
    List<Resume> findByUserIdAndCandidateEmailNormalizedList(
            @Param("userId") Long userId,
            @Param("candidateEmailNormalized") String candidateEmailNormalized);

    default Optional<Resume> findFirstByUserIdAndCandidateEmailNormalizedOrderByCreatedAtDesc(Long userId, String candidateEmailNormalized) {
        List<Resume> list = findByUserIdAndCandidateEmailNormalizedList(userId, candidateEmailNormalized);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    @Query("SELECT r FROM Resume r WHERE r.user.id = :userId AND r.candidatePhoneNormalized = :candidatePhoneNormalized ORDER BY r.createdAt DESC")
    List<Resume> findByUserIdAndCandidatePhoneNormalizedList(
            @Param("userId") Long userId,
            @Param("candidatePhoneNormalized") String candidatePhoneNormalized);

    default Optional<Resume> findFirstByUserIdAndCandidatePhoneNormalizedOrderByCreatedAtDesc(Long userId, String candidatePhoneNormalized) {
        List<Resume> list = findByUserIdAndCandidatePhoneNormalizedList(userId, candidatePhoneNormalized);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    @Query("SELECT r FROM Resume r WHERE r.user.id = :userId AND r.fileName = :fileName AND r.fileSize = :fileSize ORDER BY r.createdAt DESC")
    List<Resume> findByUserIdAndFileNameAndFileSizeList(
            @Param("userId") Long userId,
            @Param("fileName") String fileName,
            @Param("fileSize") Long fileSize);

    default Optional<Resume> findFirstByUserIdAndFileNameAndFileSizeOrderByCreatedAtDesc(Long userId, String fileName, Long fileSize) {
        List<Resume> list = findByUserIdAndFileNameAndFileSizeList(userId, fileName, fileSize);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    @Query("SELECT r FROM Resume r WHERE r.user.id = :userId AND LOWER(r.candidateName) = LOWER(:candidateName) ORDER BY r.createdAt DESC")
    List<Resume> findByUserIdAndCandidateNameList(
            @Param("userId") Long userId,
            @Param("candidateName") String candidateName);

    default Optional<Resume> findFirstByUserIdAndCandidateNameIgnoreCaseOrderByCreatedAtDesc(Long userId, String candidateName) {
        List<Resume> list = findByUserIdAndCandidateNameList(userId, candidateName);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    List<Resume> findByCandidateEmailNormalizedOrderByCreatedAtDesc(String candidateEmailNormalized);
}
