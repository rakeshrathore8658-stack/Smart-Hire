package com.smarthire.repository;

import com.smarthire.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {

    List<Job> findAllByOrderByCreatedAtDesc();

    List<Job> findByStatusOrderByCreatedAtDesc(String status);

    List<Job> findByDepartmentIgnoreCase(String department);

    @Query("SELECT j FROM Job j WHERE j.recruiter.id = :recruiterId ORDER BY j.createdAt DESC")
    List<Job> findByRecruiterIdOrderByCreatedAtDesc(@Param("recruiterId") Long recruiterId);

    @Query("SELECT j FROM Job j WHERE j.recruiter.id = :recruiterId AND LOWER(j.status) = LOWER(:status) ORDER BY j.createdAt DESC")
    List<Job> findByRecruiterIdAndStatusOrderByCreatedAtDesc(@Param("recruiterId") Long recruiterId, @Param("status") String status);

    @Query("SELECT j FROM Job j WHERE j.id = :id AND j.recruiter.id = :recruiterId")
    Optional<Job> findByIdAndRecruiterId(@Param("id") Long id, @Param("recruiterId") Long recruiterId);

    @Query("SELECT COUNT(j) > 0 FROM Job j WHERE j.id = :id AND j.recruiter.id = :recruiterId")
    boolean existsByIdAndRecruiterId(@Param("id") Long id, @Param("recruiterId") Long recruiterId);

    @Query("SELECT COUNT(j) FROM Job j WHERE j.recruiter.id = :recruiterId")
    long countByRecruiterId(@Param("recruiterId") Long recruiterId);

    @Query("SELECT COUNT(j) FROM Job j WHERE j.recruiter.id = :recruiterId AND LOWER(j.status) = LOWER(:status)")
    long countByRecruiterIdAndStatusIgnoreCase(@Param("recruiterId") Long recruiterId, @Param("status") String status);

    @Query("SELECT j FROM Job j LEFT JOIN j.recruiter r WHERE r IS NULL OR r.id = :recruiterId ORDER BY j.createdAt DESC")
    List<Job> findByRecruiterIdOrUnassignedOrderByCreatedAtDesc(@Param("recruiterId") Long recruiterId);

    @Query("SELECT DISTINCT j.department FROM Job j WHERE j.department IS NOT NULL AND TRIM(j.department) != '' ORDER BY j.department ASC")
    List<String> findDistinctDepartments();

    @Query("SELECT j FROM Job j WHERE j.recruiter.id = :recruiterId AND LOWER(j.department) = LOWER(:department)")
    List<Job> findByRecruiterIdAndDepartmentIgnoreCase(@Param("recruiterId") Long recruiterId, @Param("department") String department);

    @Query("SELECT DISTINCT j.department FROM Job j WHERE j.recruiter.id = :recruiterId AND j.department IS NOT NULL AND TRIM(j.department) != '' ORDER BY j.department ASC")
    List<String> findDistinctDepartmentsByRecruiterId(@Param("recruiterId") Long recruiterId);
}
