package com.smarthire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ATSAnalysisDTO {

    private Long id;
    private Long resumeId;
    private String fileName;
    private String targetJobRole;
    private String jobDescription;

    private int overallScore;
    private String matchLevel; // Strong Match (>=75), Moderate Match (50-74), Needs Optimization (<50)

    private CandidateInfoDTO candidate;
    private SkillsAnalysisDTO skillsAnalysis;
    private CategoryScoresDTO categoryScores;

    @Builder.Default
    private List<JobMatchDTO> jobMatches = new ArrayList<>();

    @Builder.Default
    private List<String> strengths = new ArrayList<>();

    @Builder.Default
    private List<String> weaknesses = new ArrayList<>();

    @Builder.Default
    private List<String> recommendations = new ArrayList<>();

    private String improvedSummary;

    @Builder.Default
    private List<String> suggestedKeywords = new ArrayList<>();

    @Builder.Default
    private List<String> sectionAnalysis = new ArrayList<>();

    private String aiProvider;
    private String modelUsed;
    private boolean fallbackUsed;
    private String fallbackReason;
    private String analyzedAt;

    @Builder.Default
    private boolean duplicateDetected = false;

    @Builder.Default
    private boolean contentModified = true;

    private String differenceSummary;

    public List<String> getMatchedSkillsList() {
        if (skillsAnalysis != null && skillsAnalysis.getMatchedSkills() != null) {
            return skillsAnalysis.getMatchedSkills();
        }
        return new ArrayList<>();
    }

    public List<MissingSkillDTO> getMissingSkillsList() {
        if (skillsAnalysis != null && skillsAnalysis.getMissingSkills() != null) {
            return skillsAnalysis.getMissingSkills();
        }
        return new ArrayList<>();
    }

    public List<String> getStrengthsList() {
        return strengths != null ? strengths : new ArrayList<>();
    }

    public List<String> getRecommendationsList() {
        return recommendations != null ? recommendations : new ArrayList<>();
    }

    public String getCandidateName() {
        return (candidate != null && candidate.getName() != null) ? candidate.getName() : "Candidate";
    }

    public String getCandidateEmail() {
        return (candidate != null) ? candidate.getEmail() : null;
    }

    public String getResumeFileName() {
        return (fileName != null) ? fileName : "Resume.pdf";
    }

    public int getFormattingScore() {
        return categoryScores != null ? categoryScores.getFormatting() : 85;
    }

    public int getSkillsScore() {
        return categoryScores != null ? categoryScores.getSkills() : overallScore;
    }

    public int getExperienceScore() {
        return categoryScores != null ? categoryScores.getExperience() : 75;
    }

    public int getKeywordScore() {
        return categoryScores != null ? categoryScores.getKeywords() : 70;
    }
}
