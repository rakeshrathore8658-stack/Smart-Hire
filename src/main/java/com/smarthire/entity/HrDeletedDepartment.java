package com.smarthire.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "hr_deleted_departments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HrDeletedDepartment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recruiter_id", nullable = false)
    private Long recruiterId;

    @Column(name = "department_name", nullable = false, length = 120)
    private String departmentName;

    @Column(name = "deleted_at")
    @Builder.Default
    private LocalDateTime deletedAt = LocalDateTime.now();
}
