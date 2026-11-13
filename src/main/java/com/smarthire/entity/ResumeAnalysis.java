package com.smarthire.entity;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.dto.ATSAnalysisDTO;
import com.smarthire.dto.CandidateInfoDTO;
import com.smarthire.dto.MissingSkillDTO;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(name = "resume_analyses",
       indexes = {
           @Index(name = "idx_analyses_phone_norm", columnList = "candidate_phone_normalized")
       },
       uniqueConstraints = {
           @UniqueConstraint(name = "uk_cand_role_norm", columnNames = {"candidate_email_normalized", "target_job_role_normalized"})
       })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "resume_id", nullable = false)
    private Resume resume;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    public String getResumeFileName() {
        try {
            return (resume != null && resume.getFileName() != null) ? resume.getFileName() : "resume.pdf";
        } catch (Exception e) {
            return "resume.pdf";
        }
    }

    public String getFormattedDate() {
        if (createdAt == null) return "Recent";
        try {
            return createdAt.format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy"));
        } catch (Exception e) {
            return "Recent";
        }
    }

    @Column(name = "target_job_role", length = 100)
    private String targetJobRole;

    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(name = "job_description", columnDefinition = "TEXT")
    private String jobDescription;

    @Column(name = "overall_score")
    @Builder.Default
    private Integer overallScore = 0;

    @Column(name = "skills_score")
    @Builder.Default
    private Integer skillsScore = 0;

    @Column(name = "experience_score")
    @Builder.Default
    private Integer experienceScore = 0;

    @Column(name = "projects_score")
    @Builder.Default
    private Integer projectsScore = 0;

    @Column(name = "education_score")
    @Builder.Default
    private Integer educationScore = 0;

    @Column(name = "keyword_score")
    @Builder.Default
    private Integer keywordScore = 0;

    @Column(name = "formatting_score")
    @Builder.Default
    private Integer formattingScore = 0;

    @Column(name = "content_quality_score")
    @Builder.Default
    private Integer contentQualityScore = 0;

    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(name = "analysis_json", columnDefinition = "TEXT")
    private String analysisJson;

    @Column(name = "ai_provider", length = 50)
    private String aiProvider;

    @Column(name = "is_shortlisted")
    @Builder.Default
    private Boolean shortlisted = false;

    @Column(length = 30)
    @Builder.Default
    private String status = "Completed";

    @Column(name = "stage", length = 50)
    @Builder.Default
    private String stage = "Under Review";

    @Column(name = "is_archived")
    @Builder.Default
    private Boolean isArchived = false;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

    @Column(name = "deleted_by_jobseeker")
    @Builder.Default
    private Boolean deletedByJobseeker = false;

    @Column(name = "interview_date")
    private LocalDateTime interviewDate;

    @Column(name = "interview_round", length = 100)
    private String interviewRound;

    @Column(name = "interviewer_name", length = 100)
    private String interviewerName;

    @Column(name = "interview_type", length = 100)
    private String interviewType;

    @Column(name = "meeting_link", length = 255)
    private String meetingLink;

    @Column(name = "interview_location", length = 255)
    private String interviewLocation;

    @Column(name = "previous_interview_date")
    private LocalDateTime previousInterviewDate;

    @Column(name = "cancellation_reason", length = 255)
    private String cancellationReason;

    @Column(name = "interview_status", length = 50)
    private String interviewStatus; // SCHEDULED, RESCHEDULED, COMPLETED, CANCELLED

    @Column(name = "tech_rating")
    private Integer techRating;

    @Column(name = "comm_rating")
    private Integer commRating;

    @Column(name = "problem_solving_rating")
    private Integer problemSolvingRating;

    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(name = "hr_notes", columnDefinition = "TEXT")
    private String hrNotes;

    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(columnDefinition = "TEXT")
    private String feedbackNotes;

    @Column(name = "recommendation", length = 50)
    private String recommendation;

    @Column(name = "feedback_score")
    private Integer feedbackScore;

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

    @Column(name = "target_job_role_normalized", length = 100)
    private String targetJobRoleNormalized;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @Transient
    private transient CandidateInfoDTO cachedCandidateInfo;

    public CandidateInfoDTO getCandidateInfo() {
        if (cachedCandidateInfo != null) return cachedCandidateInfo;
        try {
            if (resume != null && resume.getStructuredJson() != null && !resume.getStructuredJson().isBlank()) {
                ObjectMapper mapper = new ObjectMapper();
                cachedCandidateInfo = mapper.readValue(resume.getStructuredJson(), CandidateInfoDTO.class);
                return cachedCandidateInfo;
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @Transient
    private transient ATSAnalysisDTO cachedAnalysisDTO;

    public ATSAnalysisDTO getAnalysisDTO() {
        if (cachedAnalysisDTO != null) return cachedAnalysisDTO;
        try {
            if (analysisJson != null && !analysisJson.isBlank()) {
                ObjectMapper mapper = new ObjectMapper();
                cachedAnalysisDTO = mapper.readValue(analysisJson, ATSAnalysisDTO.class);
                return cachedAnalysisDTO;
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    public List<String> getMatchedSkillsList() {
        ATSAnalysisDTO dto = getAnalysisDTO();
        if (dto != null && dto.getSkillsAnalysis() != null && dto.getSkillsAnalysis().getMatchedSkills() != null && !dto.getSkillsAnalysis().getMatchedSkills().isEmpty()) {
            return dto.getSkillsAnalysis().getMatchedSkills();
        }
        return getKeySkills();
    }

    public List<MissingSkillDTO> getMissingSkillsList() {
        ATSAnalysisDTO dto = getAnalysisDTO();
        if (dto != null && dto.getSkillsAnalysis() != null && dto.getSkillsAnalysis().getMissingSkills() != null) {
            return dto.getSkillsAnalysis().getMissingSkills();
        }
        return Collections.emptyList();
    }

    public List<String> getStrengthsList() {
        ATSAnalysisDTO dto = getAnalysisDTO();
        if (dto != null && dto.getStrengths() != null && !dto.getStrengths().isEmpty()) {
            return dto.getStrengths();
        }
        return Collections.emptyList();
    }

    public List<String> getRecommendationsList() {
        ATSAnalysisDTO dto = getAnalysisDTO();
        if (dto != null && dto.getRecommendations() != null && !dto.getRecommendations().isEmpty()) {
            return dto.getRecommendations();
        }
        return Collections.emptyList();
    }

    public String getImprovedSummary() {
        ATSAnalysisDTO dto = getAnalysisDTO();
        if (dto != null && dto.getImprovedSummary() != null && !dto.getImprovedSummary().isBlank()) {
            return dto.getImprovedSummary();
        }
        return null;
    }

    public String getCandidateName() {
        if (candidateName != null && !candidateName.isBlank()) {
            return candidateName.trim();
        }
        CandidateInfoDTO info = getCandidateInfo();
        if (info != null && info.getName() != null && !info.getName().isBlank()) {
            return info.getName().trim();
        }
        if (resume != null && resume.getCandidateName() != null && !resume.getCandidateName().isBlank()) {
            return resume.getCandidateName().trim();
        }
        if (resume != null && resume.getUser() != null && resume.getUser().getFullName() != null) {
            return resume.getUser().getFullName().trim();
        }
        if (resume != null && resume.getFileName() != null) {
            String fn = resume.getFileName().replaceAll("(?i)\\.(pdf|docx?|txt)$", "").replace("_", " ").replace("-", " ").trim();
            if (!fn.isBlank()) {
                return Character.toUpperCase(fn.charAt(0)) + (fn.length() > 1 ? fn.substring(1) : "");
            }
        }
        return "Candidate";
    }

    public String getCandidateEmail() {
        if (candidateEmail != null && !candidateEmail.isBlank()) {
            return candidateEmail.trim();
        }
        CandidateInfoDTO info = getCandidateInfo();
        if (info != null && info.getEmail() != null && !info.getEmail().isBlank()) {
            return info.getEmail().trim();
        }
        if (resume != null && resume.getCandidateEmail() != null && !resume.getCandidateEmail().isBlank()) {
            return resume.getCandidateEmail().trim();
        }
        if (resume != null && resume.getUser() != null && resume.getUser().getEmail() != null) {
            return resume.getUser().getEmail().trim();
        }
        return "candidate@email.com";
    }

    public String getCandidatePhone() {
        if (candidatePhone != null && !candidatePhone.isBlank()) {
            return candidatePhone.trim();
        }
        CandidateInfoDTO info = getCandidateInfo();
        if (info != null && info.getPhoneNumber() != null && !info.getPhoneNumber().isBlank()) {
            return info.getPhoneNumber().trim();
        }
        if (resume != null && resume.getCandidatePhone() != null && !resume.getCandidatePhone().isBlank()) {
            return resume.getCandidatePhone().trim();
        }
        return "";
    }

    public String getCandidateInitials() {
        String name = getCandidateName();
        if (name == null || name.isBlank()) return "C";
        String[] parts = name.trim().split("\\s+");
        if (parts.length >= 2) {
            return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
        }
        return name.substring(0, Math.min(2, name.length())).toUpperCase();
    }

    public String getCandidateExperience() {
        CandidateInfoDTO info = getCandidateInfo();
        if (info != null && info.getTotalExperience() != null && !info.getTotalExperience().isBlank()) {
            return info.getTotalExperience();
        }
        int expScore = getExperienceScore();
        if (expScore >= 80) return "5+ yrs";
        if (expScore >= 60) return "3.5 yrs";
        if (expScore >= 40) return "2 yrs";
        return "1+ yrs";
    }

    public List<String> getKeySkills() {
        CandidateInfoDTO info = getCandidateInfo();
        if (info != null) {
            List<String> skills = new ArrayList<>();
            if (info.getTechnicalSkills() != null) skills.addAll(info.getTechnicalSkills());
            if (info.getProgrammingLanguages() != null) skills.addAll(info.getProgrammingLanguages());
            if (info.getFrameworks() != null) skills.addAll(info.getFrameworks());
            if (!skills.isEmpty()) {
                return skills.stream().distinct().limit(4).toList();
            }
        }
        if (targetJobRole != null && !targetJobRole.isBlank()) {
            return List.of(targetJobRole, "ATS Matched", "Screened");
        }
        return List.of("Java", "Spring Boot", "SQL", "Git");
    }

    public String getDisplayStage() {
        if (stage != null && !stage.isBlank()) return stage;
        if (isShortlisted()) return "Shortlisted";
        if (getOverallScore() >= 80) return "Interviewing";
        if (getOverallScore() >= 70) return "Under Review";
        return "Applied";
    }

    public String getFormattedInterviewDate() {
        if (interviewDate != null) {
            return interviewDate.format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
        }
        return "Not Scheduled Yet";
    }

    public String getInterviewDay() {
        if (interviewDate != null) {
            return String.format("%02d", interviewDate.getDayOfMonth());
        }
        return "--";
    }

    public String getInterviewMonth() {
        if (interviewDate != null) {
            return interviewDate.format(java.time.format.DateTimeFormatter.ofPattern("MMM")).toUpperCase();
        }
        return "TBD";
    }

    public String getInterviewDateIso() {
        if (interviewDate != null) {
            return interviewDate.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));
        }
        return "";
    }

    public String getCandidateLocation() {
        CandidateInfoDTO info = getCandidateInfo();
        if (info != null && info.getLocation() != null && !info.getLocation().isBlank()) {
            return info.getLocation().trim();
        }
        return "Indore, MP (Hybrid/Remote)";
    }

    public String getCandidateSummary() {
        CandidateInfoDTO info = getCandidateInfo();
        if (info != null && info.getProfessionalSummary() != null && !info.getProfessionalSummary().isBlank()) {
            return info.getProfessionalSummary().trim();
        }
        return "Experienced developer specializing in Java, Spring Boot, REST APIs, and modern database architectures.";
    }

    public List<String> getWorkExperienceList() {
        CandidateInfoDTO info = getCandidateInfo();
        if (info != null && info.getWorkExperience() != null && !info.getWorkExperience().isEmpty()) {
            return info.getWorkExperience();
        }
        return Collections.emptyList();
    }

    public List<String> getProjectsList() {
        CandidateInfoDTO info = getCandidateInfo();
        if (info != null && info.getProjects() != null && !info.getProjects().isEmpty()) {
            return info.getProjects();
        }
        return Collections.emptyList();
    }

    public List<String> getEducationList() {
        CandidateInfoDTO info = getCandidateInfo();
        if (info != null && info.getEducation() != null && !info.getEducation().isEmpty()) {
            return info.getEducation();
        }
        return Collections.emptyList();
    }

    public List<String> getCertificationsList() {
        CandidateInfoDTO info = getCandidateInfo();
        if (info != null && info.getCertifications() != null && !info.getCertifications().isEmpty()) {
            return info.getCertifications();
        }
        return Collections.emptyList();
    }

    public int getOverallScore() {
        return overallScore != null ? overallScore : 0;
    }

    public int getSkillsScore() {
        return skillsScore != null ? skillsScore : 0;
    }

    public int getExperienceScore() {
        return experienceScore != null ? experienceScore : 0;
    }

    public int getProjectsScore() {
        return projectsScore != null ? projectsScore : 0;
    }

    public int getEducationScore() {
        return educationScore != null ? educationScore : 0;
    }

    public int getKeywordScore() {
        return keywordScore != null ? keywordScore : 0;
    }

    public int getFormattingScore() {
        return formattingScore != null ? formattingScore : 0;
    }

    public int getContentQualityScore() {
        return contentQualityScore != null ? contentQualityScore : 0;
    }

    public boolean isShortlisted() {
        return Boolean.TRUE.equals(shortlisted);
    }

    public void setShortlisted(Boolean shortlisted) {
        this.shortlisted = (shortlisted != null) ? shortlisted : false;
    }

    public boolean isArchived() {
        return Boolean.TRUE.equals(isArchived) || "Archived".equalsIgnoreCase(stage);
    }

    public void setArchived(Boolean archived) {
        this.isArchived = (archived != null) ? archived : false;
        if (Boolean.TRUE.equals(archived)) {
            this.stage = "Archived";
            if (this.archivedAt == null) {
                this.archivedAt = LocalDateTime.now();
            }
        } else if ("Archived".equalsIgnoreCase(this.stage)) {
            this.stage = "Under Review";
            this.archivedAt = null;
        }
    }

    public String getStatus() {
        return (status != null && !status.isBlank()) ? status : "Completed";
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (user == null && resume != null && resume.getUser() != null) {
            user = resume.getUser();
        }
        if (overallScore == null) overallScore = 0;
        if (skillsScore == null) skillsScore = 0;
        if (experienceScore == null) experienceScore = 0;
        if (projectsScore == null) projectsScore = 0;
        if (educationScore == null) educationScore = 0;
        if (keywordScore == null) keywordScore = 0;
        if (formattingScore == null) formattingScore = 0;
        if (contentQualityScore == null) contentQualityScore = 0;
        if (shortlisted == null) shortlisted = false;
        if (status == null || status.isBlank()) status = "Completed";
        if (stage == null || stage.isBlank()) stage = "Under Review";
        if (targetJobRoleNormalized == null && targetJobRole != null) {
            targetJobRoleNormalized = com.smarthire.service.CandidateNormalizationUtils.normalizeRole(targetJobRole);
        }
        if (candidateEmailNormalized == null && candidateEmail != null) {
            candidateEmailNormalized = com.smarthire.service.CandidateNormalizationUtils.normalizeEmail(candidateEmail);
        }
        if (candidatePhoneNormalized == null && candidatePhone != null) {
            candidatePhoneNormalized = com.smarthire.service.CandidateNormalizationUtils.normalizePhone(candidatePhone);
        }
    }
}
