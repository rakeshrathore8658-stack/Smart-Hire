package com.smarthire.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "departments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recruiter_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User recruiter;

    @Column(name = "recruiter_id", insertable = false, updatable = false)
    private Long recruiterId;

    @Column(name = "is_system_default")
    @Builder.Default
    private Boolean isSystemDefault = false;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getRecruiterId() {
        if (recruiter != null) return recruiter.getId();
        return recruiterId;
    }
}
