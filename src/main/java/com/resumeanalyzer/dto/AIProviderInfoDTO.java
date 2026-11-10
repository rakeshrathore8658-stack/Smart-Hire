package com.resumeanalyzer.dto;

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
public class AIProviderInfoDTO {
    private String id;
    private String name;
    private String type; // DETERMINISTIC, LOCAL_LLM, CLOUD_LLM
    private String status; // AVAILABLE, CONNECTED, SERVER_OFFLINE, API_KEY_MISSING, NO_MODELS
    private String statusMessage;
    private boolean available;
    private String serverUrl;
    @Builder.Default
    private List<String> models = new ArrayList<>();
    private String defaultModel;
}
