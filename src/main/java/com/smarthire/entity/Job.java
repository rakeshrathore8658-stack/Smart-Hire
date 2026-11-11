package com.smarthire.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Entity
@Table(name = "jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(length = 100)
    private String department;

    @Column(name = "employment_type", length = 50)
    @Builder.Default
    private String employmentType = "Full-time";

    @Builder.Default
    private Integer openings = 1;

    @Column(name = "min_experience")
    @Builder.Default
    private Integer minExperience = 0;

    @Column(name = "max_experience")
    @Builder.Default
    private Integer maxExperience = 10;

    @Column(length = 100)
    @Builder.Default
    private String location = "Remote / Hybrid";

    @Column(name = "salary_range", length = 100)
    @Builder.Default
    private String salaryRange = "Competitive";

    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(name = "required_skills", columnDefinition = "TEXT")
    private String requiredSkills;

    @Column(length = 30)
    @Builder.Default
    private String status = "Open";

    @Column(name = "applicants_count")
    @Builder.Default
    private Integer applicantsCount = 0;

    @Column(name = "shortlisted_count")
    @Builder.Default
    private Integer shortlistedCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public int getOpenings() {
        return openings != null ? openings : 1;
    }

    public int getMinExperience() {
        return minExperience != null ? minExperience : 0;
    }

    public int getMaxExperience() {
        return maxExperience != null ? maxExperience : 10;
    }

    public int getApplicantsCount() {
        return applicantsCount != null ? applicantsCount : 0;
    }

    public int getShortlistedCount() {
        return shortlistedCount != null ? shortlistedCount : 0;
    }

    public String getFormattedDate() {
        if (createdAt == null) return "Recent";
        try {
            return createdAt.format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy"));
        } catch (Exception e) {
            return "Recent";
        }
    }

    public List<String> getSkillsList() {
        if (requiredSkills == null || requiredSkills.isBlank()) {
            return List.of("Problem Solving", "Collaboration", "Domain Knowledge");
        }
        return Arrays.stream(requiredSkills.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    public String getDomainCode() {
        String dept = (department != null) ? department.toLowerCase() : "";
        String t = (title != null) ? title.toLowerCase() : "";
        if (dept.contains("data") || dept.contains("ai") || dept.contains("analytics") || t.contains("data") || t.contains("ai") || t.contains("nlp") || t.contains("ml") || t.contains("analyst") || t.contains("analytics")) {
            return "data";
        }
        if (dept.contains("cloud") || dept.contains("infra") || dept.contains("devops") || t.contains("cloud") || t.contains("devops") || t.contains("aws") || t.contains("azure") || t.contains("kubernetes") || t.contains("architect")) {
            return "cloud";
        }
        if (dept.contains("product") || dept.contains("business") || dept.contains("management") || t.contains("product") || t.contains("business") || t.contains("manager") || t.contains("executive")) {
            return "business";
        }
        if (dept.contains("market") || dept.contains("design") || t.contains("design") || t.contains("ui") || t.contains("ux") || t.contains("marketing")) {
            return "marketing";
        }
        return "software";
    }

    public String getDomainLabel() {
        return switch (getDomainCode()) {
            case "data" -> "Data & AI";
            case "cloud" -> "Cloud & Infrastructure";
            case "business" -> "Product & Business";
            case "marketing" -> "Marketing & Design";
            default -> "Software Engineering";
        };
    }

    public String getIconClass() {
        String t = (title != null) ? title.toLowerCase() : "";
        if (t.contains("java") || t.contains("spring")) return "bi-cup-hot-fill";
        if (t.contains("mern") || t.contains("react") || t.contains("node") || t.contains("full stack") || t.contains("frontend") || t.contains("web")) return "bi-lightning-charge-fill";
        if (t.contains("cloud") || t.contains("devops") || t.contains("aws") || t.contains("infra")) return "bi-cloud-check-fill";
        if (t.contains("data") || t.contains("ai") || t.contains("analyst") || t.contains("nlp") || t.contains("ml") || t.contains("scientist")) return "bi-bar-chart-fill";
        if (t.contains("product") || t.contains("business") || t.contains("manager")) return "bi-briefcase-fill";
        if (t.contains("design") || t.contains("ui") || t.contains("ux")) return "bi-palette-fill";
        return "bi-briefcase-fill";
    }

    public String getIconColor() {
        return switch (getDomainCode()) {
            case "data" -> "#2A9D8F";
            case "cloud" -> "#0284c7";
            case "business" -> "#E76F51";
            case "marketing" -> "#8338EC";
            default -> "#FF7900";
        };
    }

    public String getTargetAtsScore() {
        if (minExperience != null && minExperience >= 5) {
            return "85%+";
        } else if (minExperience != null && minExperience >= 3) {
            return "80%+";
        }
        return "75%+";
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null || status.isBlank()) {
            status = "Open";
        }
        if (employmentType == null || employmentType.isBlank()) {
            employmentType = "Full-time";
        }
        if (openings == null) openings = 1;
        if (minExperience == null) minExperience = 0;
        if (maxExperience == null) maxExperience = 10;
        if (applicantsCount == null) applicantsCount = 0;
        if (shortlistedCount == null) shortlistedCount = 0;
    }
}
