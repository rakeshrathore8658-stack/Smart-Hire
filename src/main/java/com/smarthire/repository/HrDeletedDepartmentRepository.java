package com.smarthire.repository;

import com.smarthire.entity.HrDeletedDepartment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface HrDeletedDepartmentRepository extends JpaRepository<HrDeletedDepartment, Long> {

    @Query("SELECT LOWER(h.departmentName) FROM HrDeletedDepartment h WHERE h.recruiterId = :recruiterId")
    List<String> findDeletedDepartmentNamesByRecruiterId(@Param("recruiterId") Long recruiterId);

    @Query("SELECT COUNT(h) > 0 FROM HrDeletedDepartment h WHERE h.recruiterId = :recruiterId AND LOWER(h.departmentName) = LOWER(:departmentName)")
    boolean isDepartmentDeletedByRecruiter(@Param("recruiterId") Long recruiterId, @Param("departmentName") String departmentName);

    @Modifying
    @Transactional
    @Query("DELETE FROM HrDeletedDepartment h WHERE h.recruiterId = :recruiterId AND LOWER(h.departmentName) = LOWER(:departmentName)")
    void unmarkDepartmentDeleted(@Param("recruiterId") Long recruiterId, @Param("departmentName") String departmentName);
}
