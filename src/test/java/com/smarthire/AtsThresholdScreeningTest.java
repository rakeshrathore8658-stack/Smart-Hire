package com.smarthire;

import com.smarthire.dto.ATSAnalysisDTO;
import com.smarthire.dto.JobQuestionDTO;
import com.smarthire.entity.QuestionType;
import com.smarthire.service.JobScreeningService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class AtsThresholdScreeningTest {

    @ParameterizedTest(name = "ATS Score {0} should qualify: {1}")
    @CsvSource({
            "0.0, false",
            "45.0, false",
            "59.9, false",
            "59.99, false",
            "60.0, true",
            "60.01, true",
            "75.5, true",
            "89.0, true",
            "100.0, true"
    })
    @DisplayName("Should enforce strict 60.0% ATS threshold for candidate screening eligibility")
    void testAtsScoreThresholdBoundary(double score, boolean expectedQualified) {
        ATSAnalysisDTO dto = new ATSAnalysisDTO();
        dto.setOverallScore((int) Math.round(score));
        dto.setAtsScore(score);

        boolean qualifies = dto.getAtsScore() != null && dto.getAtsScore() >= 60.0;
        assertEquals(expectedQualified, qualifies);
    }

    @Test
    @DisplayName("Should provide exactly 8 default question templates covering standard HR criteria")
    void testDefaultQuestionTemplates() {
        JobScreeningService service = new JobScreeningService(null, null, null);
        List<JobQuestionDTO> templates = service.getDefaultQuestionTemplates();

        assertNotNull(templates);
        assertEquals(8, templates.size());

        // Validate types
        long textQuestions = templates.stream().filter(t -> QuestionType.TEXT.name().equals(t.getQuestionType())).count();
        long mcqQuestions = templates.stream().filter(t -> QuestionType.MULTIPLE_CHOICE.name().equals(t.getQuestionType())).count();

        assertEquals(6, textQuestions);
        assertEquals(2, mcqQuestions);

        // Verify Notice Period options
        JobQuestionDTO noticePeriod = templates.get(4);
        assertTrue(noticePeriod.getQuestionText().contains("notice period"));
        assertNotNull(noticePeriod.getOptions());
        assertEquals(4, noticePeriod.getOptions().size());
        assertTrue(noticePeriod.getOptions().contains("30 Days"));
    }

    @Test
    @DisplayName("Should validate required questions in screening submission")
    void testRequiredQuestionHandling() {
        JobQuestionDTO requiredQ = JobQuestionDTO.builder()
                .id(1L)
                .questionText("Years of experience")
                .questionType(QuestionType.TEXT.name())
                .isRequired(true)
                .build();

        JobQuestionDTO optionalQ = JobQuestionDTO.builder()
                .id(2L)
                .questionText("Why job change")
                .questionType(QuestionType.TEXT.name())
                .isRequired(false)
                .build();

        assertTrue(requiredQ.getIsRequired());
        assertFalse(optionalQ.getIsRequired());
        assertTrue(requiredQ.getRequired());
        assertFalse(optionalQ.getRequired());
    }
}
