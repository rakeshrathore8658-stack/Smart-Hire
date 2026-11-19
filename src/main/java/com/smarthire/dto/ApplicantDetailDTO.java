package com.smarthire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicantDetailDTO {

    private Long applicationId;
    private CandidateSummary candidate;
    private JobSummary job;
    private AtsSummary ats;
    private ResumeSummary resume;
    private ScreeningSummary screening;
    private String applicationStatus;
    private String applicationSource;
    private String sourceLabel;

    // Flat top-level compatibility getters for versatile frontend consumption
    @com.fasterxml.jackson.annotation.JsonProperty("id")
    public Long getId() { return applicationId; }

    @com.fasterxml.jackson.annotation.JsonProperty("candidateName")
    public String getCandidateName() { return candidate != null ? candidate.getName() : null; }

    @com.fasterxml.jackson.annotation.JsonProperty("candidateEmail")
    public String getCandidateEmail() { return candidate != null ? candidate.getEmail() : null; }

    @com.fasterxml.jackson.annotation.JsonProperty("candidatePhone")
    public String getCandidatePhone() { return candidate != null ? candidate.getPhoneNumber() : null; }

    @com.fasterxml.jackson.annotation.JsonProperty("candidateLocation")
    public String getCandidateLocation() { return candidate != null ? candidate.getLocation() : null; }

    @com.fasterxml.jackson.annotation.JsonProperty("candidateExperience")
    public String getCandidateExperience() { return candidate != null ? candidate.getExperience() : null; }

    @com.fasterxml.jackson.annotation.JsonProperty("targetJobRole")
    public String getTargetJobRole() { return job != null ? job.getTitle() : null; }

    @com.fasterxml.jackson.annotation.JsonProperty("atsScore")
    public Double getAtsScore() { return ats != null ? ats.getScore() : 0.0; }

    @com.fasterxml.jackson.annotation.JsonProperty("overallScore")
    public Integer getOverallScore() { return ats != null ? ats.getOverallScore() : 0; }

    @com.fasterxml.jackson.annotation.JsonProperty("skillsScore")
    public Integer getSkillsScore() { return ats != null ? ats.getSkillsScore() : 0; }

    @com.fasterxml.jackson.annotation.JsonProperty("experienceScore")
    public Integer getExperienceScore() { return ats != null ? ats.getExperienceScore() : 0; }

    @com.fasterxml.jackson.annotation.JsonProperty("formattingScore")
    public Integer getFormattingScore() { return ats != null ? ats.getFormattingScore() : 0; }

    @com.fasterxml.jackson.annotation.JsonProperty("resumeUrl")
    public String getResumeUrl() { return resume != null ? resume.getResumeUrl() : null; }

    @com.fasterxml.jackson.annotation.JsonProperty("resumeFileName")
    public String getResumeFileName() { return resume != null ? resume.getFileName() : null; }

    @com.fasterxml.jackson.annotation.JsonProperty("stage")
    public String getStage() { return applicationStatus; }

    @com.fasterxml.jackson.annotation.JsonProperty("screeningCompleted")
    public boolean isScreeningCompleted() { return screening != null && screening.isSubmitted(); }

    @com.fasterxml.jackson.annotation.JsonProperty("screeningResponses")
    public List<QuestionAnswerItem> getScreeningResponses() { return screening != null && screening.getResponses() != null ? screening.getResponses() : java.util.Collections.emptyList(); }

    @com.fasterxml.jackson.annotation.JsonProperty("matchedSkills")
    public List<String> getMatchedSkills() { return ats != null && ats.getMatchedSkills() != null ? ats.getMatchedSkills() : java.util.Collections.emptyList(); }

    @com.fasterxml.jackson.annotation.JsonProperty("missingSkills")
    public List<String> getMissingSkills() { return ats != null && ats.getMissingSkills() != null ? ats.getMissingSkills() : java.util.Collections.emptyList(); }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CandidateSummary {
        private Long id;
        private String name;
        private String email;
        private String phoneNumber;
        private String location;
        private String experience;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JobSummary {
        private Long id;
        private String title;
        private String department;
        private String companyName;
        private String location;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AtsSummary {
        private double score;
        private int overallScore;
        private int skillsScore;
        private int experienceScore;
        private int formattingScore;
        private boolean eligible;
        private LocalDateTime analyzedAt;
        private List<String> matchedSkills;
        private List<String> missingSkills;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResumeSummary {
        private Long id;
        private String resumeUrl;
        private String resumePublicId;
        private String fileName;
        private String contentType;
        private Long fileSize;
        private LocalDateTime uploadedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScreeningSummary {
        private boolean submitted;
        @Builder.Default
        private List<QuestionAnswerItem> responses = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionAnswerItem {
        private Long questionId;
        private String question;
        private String questionType;
        private String answer;
        private boolean required;
    }
}
