package com.smarthire.repository;

import com.smarthire.entity.JobQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobQuestionRepository extends JpaRepository<JobQuestion, Long> {

    @Query("SELECT jq FROM JobQuestion jq WHERE jq.job.id = :jobId ORDER BY jq.orderIndex ASC, jq.id ASC")
    List<JobQuestion> findByJobIdOrderByOrderIndexAsc(@Param("jobId") Long jobId);

    @Modifying
    @Query("DELETE FROM JobQuestion jq WHERE jq.job.id = :jobId")
    void deleteByJobId(@Param("jobId") Long jobId);
}
