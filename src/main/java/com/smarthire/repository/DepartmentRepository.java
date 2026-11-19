package com.smarthire.repository;

import com.smarthire.entity.Department;
import com.smarthire.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {

    Optional<Department> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);

    List<Department> findAllByOrderByNameAsc();

    Optional<Department> findByNameIgnoreCaseAndRecruiter(String name, User recruiter);

    @Query("SELECT d FROM Department d WHERE LOWER(d.name) = LOWER(:name) AND d.recruiter.id = :recruiterId")
    Optional<Department> findByNameIgnoreCaseAndRecruiterId(@Param("name") String name, @Param("recruiterId") Long recruiterId);

    @Query("SELECT d FROM Department d WHERE d.recruiter.id = :recruiterId ORDER BY d.name ASC")
    List<Department> findByRecruiterIdOrderByNameAsc(@Param("recruiterId") Long recruiterId);

    @Query("SELECT d FROM Department d WHERE d.isSystemDefault = true OR d.recruiter IS NULL OR d.recruiter.id = :recruiterId ORDER BY d.name ASC")
    List<Department> findAvailableForRecruiter(@Param("recruiterId") Long recruiterId);

    @Query("SELECT COUNT(d) > 0 FROM Department d WHERE LOWER(d.name) = LOWER(:name) AND d.recruiter.id = :recruiterId")
    boolean existsByNameIgnoreCaseAndRecruiterId(@Param("name") String name, @Param("recruiterId") Long recruiterId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Department d WHERE LOWER(d.name) = LOWER(:name) AND d.recruiter.id = :recruiterId")
    void deleteByNameIgnoreCaseAndRecruiterId(@Param("name") String name, @Param("recruiterId") Long recruiterId);
}
