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
public class CandidateFormSubmissionDTO {

    private Long applicationId;
    private Long jobId;

    @Builder.Default
    private List<QuestionResponseItem> responses = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionResponseItem {
        private Long questionId;
        private String answerText;
    }
}
