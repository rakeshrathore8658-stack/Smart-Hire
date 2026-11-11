package com.smarthire.repository;

import com.smarthire.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {

    List<Job> findAllByOrderByCreatedAtDesc();

    List<Job> findByStatusOrderByCreatedAtDesc(String status);

    List<Job> findByDepartmentIgnoreCase(String department);
}
