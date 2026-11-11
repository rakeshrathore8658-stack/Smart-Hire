package com.smarthire.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "resumes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Resume {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_type", length = 50)
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(name = "original_text", columnDefinition = "TEXT")
    private String originalText;

    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(name = "normalized_text", columnDefinition = "TEXT")
    private String normalizedText;

    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(name = "structured_json", columnDefinition = "TEXT")
    private String structuredJson;

    @Column(name = "candidate_name", length = 150)
    private String candidateName;

    @Column(name = "candidate_email", length = 150)
    private String candidateEmail;

    @Column(name = "candidate_email_normalized", length = 150)
    private String candidateEmailNormalized;

    @Column(name = "candidate_phone", length = 50)
    private String candidatePhone;

    @Column(name = "candidate_phone_normalized", length = 50)
    private String candidatePhoneNormalized;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
