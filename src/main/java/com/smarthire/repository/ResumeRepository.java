package com.smarthire.repository;

import com.smarthire.entity.Resume;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResumeRepository extends JpaRepository<Resume, Long> {

    List<Resume> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Resume> findTop10ByOrderByCreatedAtDesc();

    Optional<Resume> findFirstByCandidateEmailNormalizedOrderByCreatedAtDesc(String candidateEmailNormalized);

    Optional<Resume> findFirstByCandidatePhoneNormalizedOrderByCreatedAtDesc(String candidatePhoneNormalized);

    Optional<Resume> findFirstByCandidateEmailNormalizedOrCandidatePhoneNormalizedOrderByCreatedAtDesc(
            String candidateEmailNormalized, String candidatePhoneNormalized);

    Optional<Resume> findFirstByFileNameAndFileSizeOrderByCreatedAtDesc(String fileName, Long fileSize);

    Optional<Resume> findFirstByFileNameOrderByCreatedAtDesc(String fileName);

    Optional<Resume> findFirstByCandidateNameIgnoreCaseOrderByCreatedAtDesc(String candidateName);

    Optional<Resume> findFirstByUserIdAndCandidateEmailNormalizedOrderByCreatedAtDesc(Long userId, String candidateEmailNormalized);

    Optional<Resume> findFirstByUserIdAndCandidatePhoneNormalizedOrderByCreatedAtDesc(Long userId, String candidatePhoneNormalized);

    Optional<Resume> findFirstByUserIdAndFileNameAndFileSizeOrderByCreatedAtDesc(Long userId, String fileName, Long fileSize);

    Optional<Resume> findFirstByUserIdAndCandidateNameIgnoreCaseOrderByCreatedAtDesc(Long userId, String candidateName);

    List<Resume> findByCandidateEmailNormalizedOrderByCreatedAtDesc(String candidateEmailNormalized);
}
