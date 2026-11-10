package com.resumeanalyzer.dto;

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
public class BulkUploadResponseDTO {

    private Long jobId;
    private String jobTitle;
    private int totalFiles;
    private int successful;
    private int failed;

    @Builder.Default
    private List<Map<String, Object>> processedCandidates = new ArrayList<>();

    @Builder.Default
    private List<Map<String, String>> errors = new ArrayList<>();

    private String message;
}
