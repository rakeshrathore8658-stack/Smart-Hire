package com.smarthire.repository;

import com.smarthire.entity.CandidateFormResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandidateFormResponseRepository extends JpaRepository<CandidateFormResponse, Long> {

    @Query("SELECT cfr FROM CandidateFormResponse cfr WHERE cfr.applicationId = :applicationId ORDER BY cfr.id ASC")
    List<CandidateFormResponse> findByApplicationIdOrderByIdAsc(@Param("applicationId") Long applicationId);

    @Query("SELECT cfr FROM CandidateFormResponse cfr WHERE cfr.applicationId = :applicationId AND cfr.question.id = :questionId")
    List<CandidateFormResponse> findByApplicationIdAndQuestionId(@Param("applicationId") Long applicationId, @Param("questionId") Long questionId);

    @Modifying
    @Query("DELETE FROM CandidateFormResponse cfr WHERE cfr.applicationId = :applicationId")
    void deleteByApplicationId(@Param("applicationId") Long applicationId);
}
