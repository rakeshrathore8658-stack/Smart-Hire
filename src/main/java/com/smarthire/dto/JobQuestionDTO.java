package com.smarthire.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.entity.JobQuestion;
import com.smarthire.entity.QuestionType;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobQuestionDTO {

    private Long id;
    private Long jobId;
    private String questionText;
    private String questionType; // TEXT, MULTIPLE_CHOICE
    private List<String> options;

    @JsonProperty("required")
    @com.fasterxml.jackson.annotation.JsonAlias({"isRequired", "required"})
    private Boolean isRequired;

    private Integer orderIndex;

    @com.fasterxml.jackson.annotation.JsonIgnore
    public Boolean getRequired() {
        return isRequired != null ? isRequired : true;
    }

    @com.fasterxml.jackson.annotation.JsonIgnore
    public Boolean isRequired() {
        return isRequired != null ? isRequired : true;
    }

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static JobQuestionDTO fromEntity(JobQuestion question) {
        if (question == null) return null;

        List<String> opts = new ArrayList<>();
        if (question.getOptionsJson() != null && !question.getOptionsJson().isBlank()) {
            try {
                opts = MAPPER.readValue(question.getOptionsJson(), new TypeReference<List<String>>() {});
            } catch (Exception ignored) {
                for (String part : question.getOptionsJson().split(",")) {
                    if (!part.trim().isEmpty()) opts.add(part.trim());
                }
            }
        }

        return JobQuestionDTO.builder()
                .id(question.getId())
                .jobId(question.getJobId() != null ? question.getJobId() : (question.getJob() != null ? question.getJob().getId() : null))
                .questionText(question.getQuestionText())
                .questionType(question.getQuestionType() != null ? question.getQuestionType().name() : QuestionType.TEXT.name())
                .options(opts)
                .isRequired(question.getIsRequired() != null ? question.getIsRequired() : true)
                .orderIndex(question.getOrderIndex() != null ? question.getOrderIndex() : 0)
                .build();
    }
}
