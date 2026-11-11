package com.smarthire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateCompareItemDTO {
    private Long id;
    private Long resumeId;
    private String candidateName;
    private String candidateInitials;
    private String candidateEmail;
    private String candidatePhone;
    private String candidateLocation;
    private String candidateSummary;
    private String targetJobRole;
    private Integer overallScore;
    private Integer atsScore;
    private String matchLevel;
    private Boolean isHighestScore;

    // Detailed score breakdown
    private Integer skillsScore;
    private Integer experienceScore;
    private Integer projectsScore;
    private Integer educationScore;
    private Integer formattingScore;
    private Integer keywordScore;
    private Integer contentQualityScore;
    private Map<String, Integer> categoryScores;

    // Experience
    private String totalExperience;
    private Double experienceYears;

    // Categorized Skills
    @Builder.Default
    private List<String> technicalSkills = new ArrayList<>();
    @Builder.Default
    private List<String> programmingLanguages = new ArrayList<>();
    @Builder.Default
    private List<String> frameworks = new ArrayList<>();
    @Builder.Default
    private List<String> databases = new ArrayList<>();
    @Builder.Default
    private List<String> tools = new ArrayList<>();
    @Builder.Default
    private List<String> matchedSkills = new ArrayList<>();
    @Builder.Default
    private List<MissingSkillDTO> missingSkills = new ArrayList<>();
    @Builder.Default
    private List<String> uniqueSkills = new ArrayList<>(); // Skills unique to this candidate among compared set

    // Credentials & History
    @Builder.Default
    private List<String> workExperience = new ArrayList<>();
    @Builder.Default
    private List<String> companyNames = new ArrayList<>();
    @Builder.Default
    private List<String> projects = new ArrayList<>();
    @Builder.Default
    private List<String> education = new ArrayList<>();
    @Builder.Default
    private List<String> certifications = new ArrayList<>();
    @Builder.Default
    private List<String> achievements = new ArrayList<>();

    // Resume Document Info
    private String resumeFileName;
    private String resumeFileType;
    private Long resumeFileSize;
    private String resumeUploadDate;

    // Pipeline & Interview Status
    private String stage;
    private String displayStage;
    private Boolean shortlisted;
    private String status;
    private String interviewStatus;
    private String interviewDate;
    private String formattedInterviewDate;
    private String interviewRound;
    private String interviewerName;
    private String interviewType;
    private String meetingLink;
    private String interviewLocation;
    private Integer techRating;
    private Integer commRating;
    private Integer problemSolvingRating;
    private String feedbackNotes;
    private Integer feedbackScore;

    // Strengths & Recommendations
    @Builder.Default
    private List<String> strengths = new ArrayList<>();
    @Builder.Default
    private List<String> recommendations = new ArrayList<>();
}
