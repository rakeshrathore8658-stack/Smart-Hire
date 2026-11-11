package com.smarthire.service;

import com.smarthire.dto.CategoryScoresDTO;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Service;

@Service
@ConfigurationProperties(prefix = "ats.weights")
@Data
@Slf4j
public class ATSScoringService {

    // Configurable weighted percentages (sum = 100)
    private double skillsWeight = 0.30;
    private double experienceWeight = 0.20;
    private double projectsWeight = 0.15;
    private double educationWeight = 0.10;
    private double keywordsWeight = 0.10;
    private double formattingWeight = 0.10;
    private double contentQualityWeight = 0.05;

    /**
     * Calculates deterministic, transparent weighted overall score (0-100).
     */
    public int calculateOverallScore(CategoryScoresDTO scores) {
        if (scores == null) {
            return 50;
        }

        double weightedTotal = (clamp(scores.getSkills()) * skillsWeight)
                + (clamp(scores.getExperience()) * experienceWeight)
                + (clamp(scores.getProjects()) * projectsWeight)
                + (clamp(scores.getEducation()) * educationWeight)
                + (clamp(scores.getKeywords()) * keywordsWeight)
                + (clamp(scores.getFormatting()) * formattingWeight)
                + (clamp(scores.getContentQuality()) * contentQualityWeight);

        int finalScore = (int) Math.round(weightedTotal);
        return Math.max(0, Math.min(100, finalScore));
    }

    /**
     * Determines descriptive assessment pill.
     */
    public String resolveMatchLevel(int overallScore) {
        if (overallScore >= 75) {
            return "Strong Match";
        } else if (overallScore >= 50) {
            return "Moderate Match";
        } else {
            return "Needs Optimization";
        }
    }

    private int clamp(int val) {
        return Math.max(0, Math.min(100, val));
    }
}
