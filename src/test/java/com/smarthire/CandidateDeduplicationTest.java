package com.smarthire;

import com.smarthire.dto.ATSAnalysisDTO;
import com.smarthire.dto.CandidateInfoDTO;
import com.smarthire.entity.Resume;
import com.smarthire.entity.ResumeAnalysis;
import com.smarthire.repository.ResumeAnalysisRepository;
import com.smarthire.repository.ResumeRepository;
import com.smarthire.service.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateDeduplicationTest {

    @Mock
    private ResumeRepository resumeRepository;

    @Mock
    private ResumeAnalysisRepository resumeAnalysisRepository;

    @Mock
    private ResumeExtractionService resumeExtractionService;

    @Mock
    private DynamicPromptBuilderService promptBuilderService;

    @Mock
    private com.smarthire.ai.AIProviderFactory aiProviderFactory;

    @Mock
    private com.smarthire.ai.LocalDeterministicAIProvider localAIProvider;

    @Mock
    private ATSScoringService atsScoringService;

    @Mock
    private JobMatchingService jobMatchingService;

    @Mock
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @InjectMocks
    private ResumeAnalysisService resumeAnalysisService;

    @Test
    @DisplayName("Email normalization correctly handles mixed case, whitespace, and nulls")
    void testEmailNormalization() {
        assertEquals("rakeshrathore@gmail.com", CandidateNormalizationUtils.normalizeEmail("  RakeshRathore@GMAIL.com  "));
        assertEquals("jayant420acc@gmail.com", CandidateNormalizationUtils.normalizeEmail("JAYANT420ACC@GMAIL.COM"));
        assertNull(CandidateNormalizationUtils.normalizeEmail(null));
        assertNull(CandidateNormalizationUtils.normalizeEmail("   "));
        assertNull(CandidateNormalizationUtils.normalizeEmail("not-an-email"));
    }

    @Test
    @DisplayName("Phone normalization extracts digits and strips country codes")
    void testPhoneNormalization() {
        assertEquals("9770459413", CandidateNormalizationUtils.normalizePhone("+91 9770459413"));
        assertEquals("9977401822", CandidateNormalizationUtils.normalizePhone("+91-9977-401822"));
        assertEquals("9770459413", CandidateNormalizationUtils.normalizePhone("09770459413"));
        assertEquals("9770459413", CandidateNormalizationUtils.normalizePhone("(977) 045-9413"));
        assertNull(CandidateNormalizationUtils.normalizePhone(null));
        assertNull(CandidateNormalizationUtils.normalizePhone("123")); // too short
    }

    @Test
    @DisplayName("Job role normalization standardizes case and whitespace")
    void testJobRoleNormalization() {
        assertEquals("spring boot developer", CandidateNormalizationUtils.normalizeRole("  Spring   Boot  Developer  "));
        assertEquals("full stack developer", CandidateNormalizationUtils.normalizeRole("Full Stack Developer"));
        assertEquals("general requisition", CandidateNormalizationUtils.normalizeRole(null));
        assertEquals("general requisition", CandidateNormalizationUtils.normalizeRole("   "));
    }

    @Test
    @DisplayName("Repeated resume upload updates existing analysis and preserves stage and interview data")
    void testRepeatedAnalysisUpdatesExistingRecord() {
        Long resumeId = 2L;
        String role = "Spring Boot Developer";
        String normalizedRole = "spring boot developer";
        String email = "rakeshrathore8658@gmail.com";

        Resume mockResume = Resume.builder()
                .id(resumeId)
                .fileName("rakesh_resume_v2.pdf")
                .normalizedText("Rakesh Rathore Spring Boot Developer")
                .candidateEmail(email)
                .candidateEmailNormalized(email)
                .build();

        CandidateInfoDTO candInfo = CandidateInfoDTO.builder()
                .name("Rakesh Rathore")
                .email(email)
                .phoneNumber("9770459413")
                .build();

        // Existing analysis already shortlisted with an interview scheduled
        ResumeAnalysis existingAnalysis = ResumeAnalysis.builder()
                .id(100L)
                .targetJobRole(role)
                .targetJobRoleNormalized(normalizedRole)
                .candidateEmail(email)
                .candidateEmailNormalized(email)
                .overallScore(71)
                .stage("Interviewing")
                .shortlisted(true)
                .interviewRound("Round 2 - Architecture")
                .interviewerName("Sarah Jenkins")
                .interviewDate(LocalDateTime.now().plusDays(1))
                .build();

        when(resumeRepository.findById(resumeId)).thenReturn(Optional.of(mockResume));
        when(resumeExtractionService.extractCandidateInfo(any())).thenReturn(candInfo);
        when(jobMatchingService.getRequiredSkillsForRole(any())).thenReturn(List.of("Java", "Spring Boot"));
        when(jobMatchingService.analyzeSkills(any(), any())).thenReturn(
                com.smarthire.dto.SkillsAnalysisDTO.builder()
                        .matchedSkills(List.of("Java", "Spring Boot"))
                        .missingSkills(List.of())
                        .build()
        );
        when(atsScoringService.calculateOverallScore(any())).thenReturn(85);
        when(atsScoringService.resolveMatchLevel(anyInt())).thenReturn("Strong Match");
        when(promptBuilderService.buildPrompt(any(), any(), any(), any(), any())).thenReturn("prompt");

        com.smarthire.ai.AIProvider mockProvider = mock(com.smarthire.ai.AIProvider.class);
        when(mockProvider.getProviderName()).thenReturn("mock-ai");
        when(mockProvider.analyze(any(), any(), any())).thenReturn("{}");
        when(aiProviderFactory.getProvider(any(), any())).thenReturn(mockProvider);

        when(resumeAnalysisRepository.findFirstByCandidateEmailNormalizedAndTargetJobRoleNormalized(email, normalizedRole))
                .thenReturn(Optional.of(existingAnalysis));
        when(resumeAnalysisRepository.save(any(ResumeAnalysis.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ATSAnalysisDTO result = resumeAnalysisService.analyzeResume(resumeId, role, "Job Description", "gemini");

        assertNotNull(result);
        assertEquals(100L, existingAnalysis.getId());
        // Verify stage and interview data were PRESERVED
        assertEquals("Interviewing", existingAnalysis.getStage());
        assertTrue(existingAnalysis.isShortlisted());
        assertEquals("Round 2 - Architecture", existingAnalysis.getInterviewRound());
        assertEquals("Sarah Jenkins", existingAnalysis.getInterviewerName());
        assertNotNull(existingAnalysis.getInterviewDate());

        // Verify repository save was called on existing record, NOT a new row
        verify(resumeAnalysisRepository, times(1)).save(existingAnalysis);
    }

    @Test
    @DisplayName("Different candidates with identical names are NOT merged")
    void testDifferentCandidatesSameNameNotMerged() {
        String name = "John Smith";
        String email1 = "john.smith.dev@gmail.com";
        String email2 = "john.smith.finance@gmail.com";

        assertNotEquals(
                CandidateNormalizationUtils.normalizeEmail(email1),
                CandidateNormalizationUtils.normalizeEmail(email2)
        );
    }
}
