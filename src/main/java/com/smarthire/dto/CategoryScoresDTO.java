package com.smarthire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryScoresDTO {

    @Builder.Default
    private int skills = 80;

    @Builder.Default
    private int experience = 75;

    @Builder.Default
    private int projects = 75;

    @Builder.Default
    private int education = 80;

    @Builder.Default
    private int keywords = 75;

    @Builder.Default
    private int formatting = 85;

    @Builder.Default
    private int contentQuality = 80;
}
