package com.smarthire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeAnalyzeRequestDTO {

    private Long resumeId;
    private String targetJobRole;
    private String customJobRole;
    private String jobDescription;
    private String aiProvider; // "gemini", "ollama", "local"
    private String model;      // optional model name e.g. "codellama", "gemini-1.5-flash"
    private String geminiApiKey; // Optional user-provided Gemini API key
}
