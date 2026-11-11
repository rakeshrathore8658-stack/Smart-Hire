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
public class CandidateCompareResponseDTO {
    private boolean success;
    private String message;
    private int totalCompared;
    private String targetJobRole;
    private Long highestScoreCandidateId;
    private Integer highestScore;

    @Builder.Default
    private List<CandidateCompareItemDTO> candidates = new ArrayList<>();

    @Builder.Default
    private List<String> commonSkills = new ArrayList<>();

    @Builder.Default
    private List<String> allSkills = new ArrayList<>();

    @Builder.Default
    private List<String> summaryHighlights = new ArrayList<>();

    private Map<String, Object> comparisonMetrics;
}
