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
public class CandidateInfoDTO {

    private String name;
    private String email;
    private String phoneNumber;
    private String location;
    private String professionalSummary;
    private String totalExperience;

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
}
