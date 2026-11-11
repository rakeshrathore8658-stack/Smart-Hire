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
public class SkillsAnalysisDTO {

    @Builder.Default
    private List<String> matchedSkills = new ArrayList<>();

    @Builder.Default
    private List<MissingSkillDTO> missingSkills = new ArrayList<>();

    @Builder.Default
    private List<String> partialSkills = new ArrayList<>();
}
