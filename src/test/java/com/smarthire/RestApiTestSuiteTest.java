package com.smarthire;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.controller.AnalysisController;
import com.smarthire.controller.JobMatchController;
import com.smarthire.controller.ResumeController;
import com.smarthire.dto.*;
import com.smarthire.entity.Resume;
import com.smarthire.repository.ResumeRepository;
import com.smarthire.repository.UserRepository;
import com.smarthire.service.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {ResumeController.class, AnalysisController.class, JobMatchController.class})
@AutoConfigureMockMvc(addFilters = false)
class RestApiTestSuiteTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private ResumeParserService resumeParserService;

    @MockitoBean
    private ResumeNormalizationService resumeNormalizationService;

    @MockitoBean
    private ResumeExtractionService resumeExtractionService;

    @MockitoBean
    private ResumeRepository resumeRepository;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private ResumeAnalysisService resumeAnalysisService;

    @MockitoBean
    private JobMatchingService jobMatchingService;

    @MockitoBean
    private SkillsExtractionService skillsExtractionService;

    @MockitoBean
    private com.smarthire.repository.ResumeAnalysisRepository resumeAnalysisRepository;

    @MockitoBean
    private RealtimeSyncService realtimeSyncService;

    @Test
    @DisplayName("API Test 1: Upload Resume with valid PDF succeeds (200 OK)")
    void testUploadResume_Success() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "john_doe_resume.pdf",
                "application/pdf",
                "John Doe Java Developer Spring Boot".getBytes()
        );

        Mockito.when(resumeParserService.extractText(any())).thenReturn("John Doe Java Developer Spring Boot with solid backend experience");
        Mockito.when(resumeNormalizationService.normalizeText(anyString())).thenReturn("John Doe Java Developer Spring Boot with solid backend experience");
        Mockito.when(resumeNormalizationService.isValidResumeText(anyString())).thenReturn(true);

        CandidateInfoDTO candidateInfo = new CandidateInfoDTO();
        candidateInfo.setName("John Doe");
        candidateInfo.setEmail("john.doe@example.com");
        candidateInfo.setPhoneNumber("+91 9876543210");
        Mockito.when(resumeExtractionService.extractCandidateInfo(anyString())).thenReturn(candidateInfo);
        Mockito.when(resumeExtractionService.toJson(any())).thenReturn("{\"name\":\"John Doe\"}");

        Resume savedResume = new Resume();
        savedResume.setId(101L);
        savedResume.setFileName("john_doe_resume.pdf");
        savedResume.setFileType("application/pdf");
        savedResume.setFileSize(file.getSize());
        savedResume.setCandidateName("John Doe");
        savedResume.setCandidateEmail("john.doe@example.com");
        savedResume.setOriginalText("John Doe Java Developer Spring Boot with solid backend experience");
        savedResume.setNormalizedText("John Doe Java Developer Spring Boot with solid backend experience");
        savedResume.setCreatedAt(LocalDateTime.now());
        Mockito.when(resumeRepository.save(any(Resume.class))).thenReturn(savedResume);

        mockMvc.perform(multipart("/api/resumes/upload").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resumeId").value(101))
                .andExpect(jsonPath("$.fileName").value("john_doe_resume.pdf"))
                .andExpect(jsonPath("$.candidateInfo.name").value("John Doe"))
                .andExpect(jsonPath("$.candidateInfo.email").value("john.doe@example.com"));
    }

    @Test
    @DisplayName("API Test 2: Upload Resume without file returns 400 Bad Request")
    void testUploadResume_Empty() throws Exception {
        mockMvc.perform(post("/api/resumes/upload"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Please select a resume file to upload."));
    }

    @Test
    @DisplayName("API Test 3: Analyze Resume via JSON payload returns 200 OK with ATS score metrics")
    void testAnalyzeResume_Success() throws Exception {
        ATSAnalysisDTO analysisDTO = new ATSAnalysisDTO();
        analysisDTO.setId(501L);
        analysisDTO.setResumeId(201L);
        analysisDTO.setOverallScore(88);
        analysisDTO.setTargetJobRole("Full Stack Developer");
        analysisDTO.setMatchLevel("Strong Match");

        CandidateInfoDTO candidateInfo = new CandidateInfoDTO();
        candidateInfo.setName("Jane Smith");
        candidateInfo.setEmail("jane.smith@example.com");
        analysisDTO.setCandidate(candidateInfo);

        analysisDTO.setCategoryScores(CategoryScoresDTO.builder()
                .skills(90)
                .experience(85)
                .projects(80)
                .education(90)
                .keywords(85)
                .formatting(95)
                .contentQuality(88)
                .build());

        Mockito.when(resumeAnalysisService.analyzeResume(
                Mockito.eq(201L),
                Mockito.eq("Full Stack Developer"),
                any(),
                any(),
                any(),
                any()
        )).thenReturn(analysisDTO);

        ResumeAnalyzeRequestDTO requestDTO = ResumeAnalyzeRequestDTO.builder()
                .resumeId(201L)
                .targetJobRole("Full Stack Developer")
                .build();

        mockMvc.perform(post("/api/analysis/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overallScore").value(88))
                .andExpect(jsonPath("$.targetJobRole").value("Full Stack Developer"))
                .andExpect(jsonPath("$.candidate.name").value("Jane Smith"))
                .andExpect(jsonPath("$.matchLevel").value("Strong Match"));
    }

    @Test
    @DisplayName("API Test 4: Get available job roles returns role catalog")
    void testGetJobRoles_Success() throws Exception {
        List<String> mockRoles = List.of("Java Developer", "Spring Boot Developer", "React Developer", "DevOps Engineer");
        Mockito.when(jobMatchingService.getAvailableRoles()).thenReturn(mockRoles);

        mockMvc.perform(get("/api/resume/job-roles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").value("Java Developer"))
                .andExpect(jsonPath("$[1]").value("Spring Boot Developer"))
                .andExpect(jsonPath("$[2]").value("React Developer"))
                .andExpect(jsonPath("$[3]").value("DevOps Engineer"));
    }

    @Test
    @DisplayName("API Test 5: Non-existent resume analysis returns 404 Not Found")
    void testGetAnalysis_NotFound() throws Exception {
        Mockito.when(resumeAnalysisService.getAnalysis(99999L))
                .thenThrow(new IllegalArgumentException("Analysis record not found for ID: 99999"));

        mockMvc.perform(get("/api/analysis/99999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Analysis record not found for ID: 99999"));
    }
}
