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
public class ResumeUploadResponseDTO {

    private Long resumeId;
    private String fileName;
    private String fileType;
    private long fileSize;
    private int extractedTextLength;

    @Builder.Default
    private List<String> detectedSkills = new ArrayList<>();

    private int totalSkillsFound;
    private CandidateInfoDTO candidateInfo;
    private String previewText;
    private String message;
}
