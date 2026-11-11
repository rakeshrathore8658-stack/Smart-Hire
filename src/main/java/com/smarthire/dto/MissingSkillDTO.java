package com.smarthire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MissingSkillDTO {
    private String skill;
    private String priority; // HIGH, MEDIUM, LOW
    private String reason;
}
