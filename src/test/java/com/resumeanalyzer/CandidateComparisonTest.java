package com.resumeanalyzer;

import com.resumeanalyzer.dto.CandidateCompareRequestDTO;
import com.resumeanalyzer.dto.CandidateCompareResponseDTO;
import com.resumeanalyzer.entity.Resume;
import com.resumeanalyzer.entity.ResumeAnalysis;
import com.resumeanalyzer.repository.ResumeAnalysisRepository;
import com.resumeanalyzer.service.CandidateComparisonService;
import com.resumeanalyzer.service.impl.CandidateComparisonServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class CandidateComparisonTest {

    @Mock
    private ResumeAnalysisRepository resumeAnalysisRepository;

    @InjectMocks
    private CandidateComparisonServiceImpl candidateComparisonService;

    private ResumeAnalysis candidateA;
    private ResumeAnalysis candidateB;

    @BeforeEach
    void setUp() {
        Resume resumeA = Resume.builder()
                .id(101L)
                .fileName("CandidateA_Resume.pdf")
                .candidateName("Alice Walker")
                .candidateEmail("alice@example.com")
                .build();

        candidateA = ResumeAnalysis.builder()
                .id(1L)
                .resume(resumeA)
                .candidateName("Alice Walker")
                .candidateEmail("alice@example.com")
                .targetJobRole("Java Developer")
                .overallScore(88)
                .skillsScore(85)
                .experienceScore(80)
                .formattingScore(90)
                .stage("Shortlisted")
                .shortlisted(true)
                .analysisJson("{\"overallScore\":88,\"matchLevel\":\"Strong Match\",\"skillsAnalysis\":{\"matchedSkills\":[\"Java\",\"Spring Boot\",\"MySQL\",\"Docker\"],\"missingSkills\":[]}}")
                .build();

        Resume resumeB = Resume.builder()
                .id(102L)
                .fileName("CandidateB_Resume.pdf")
                .candidateName("Bob Miller")
                .candidateEmail("bob@example.com")
                .build();

        candidateB = ResumeAnalysis.builder()
                .id(2L)
                .resume(resumeB)
                .candidateName("Bob Miller")
                .candidateEmail("bob@example.com")
                .targetJobRole("Java Developer")
                .overallScore(78)
                .skillsScore(75)
                .experienceScore(70)
                .formattingScore(85)
                .stage("Shortlisted")
                .shortlisted(true)
                .analysisJson("{\"overallScore\":78,\"matchLevel\":\"Moderate Match\",\"skillsAnalysis\":{\"matchedSkills\":[\"Java\",\"Spring Boot\",\"PostgreSQL\",\"Kubernetes\"],\"missingSkills\":[]}}")
                .build();
    }

    @Test
    @DisplayName("Should successfully compare 2 valid candidates and compute shared and unique skills")
    void testCompareTwoCandidates() {
        when(resumeAnalysisRepository.findAllById(anyList())).thenReturn(List.of(candidateA, candidateB));

        CandidateCompareResponseDTO response = candidateComparisonService.compareCandidates(List.of(1L, 2L));

        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertEquals(2, response.getTotalCompared());
        assertEquals("Java Developer", response.getTargetJobRole());

        // Alice has 88, Bob has 78 -> Alice is highest
        assertEquals(1L, response.getHighestScoreCandidateId());
        assertEquals(88, response.getHighestScore());

        // Check common skills (Java, Spring Boot)
        assertFalse(response.getCommonSkills().isEmpty());
        assertTrue(response.getCommonSkills().stream().anyMatch(s -> s.equalsIgnoreCase("Java")));
        assertTrue(response.getCommonSkills().stream().anyMatch(s -> s.equalsIgnoreCase("Spring Boot")));

        // Check unique skills
        // Alice has Docker (Bob does not)
        var alice = response.getCandidates().get(0);
        assertTrue(alice.getIsHighestScore());
        assertTrue(alice.getUniqueSkills().stream().anyMatch(s -> s.equalsIgnoreCase("Docker")));

        // Bob has Kubernetes/PostgreSQL (Alice does not)
        var bob = response.getCandidates().get(1);
        assertFalse(bob.getIsHighestScore());
        assertTrue(bob.getUniqueSkills().stream().anyMatch(s -> s.equalsIgnoreCase("Kubernetes") || s.equalsIgnoreCase("PostgreSQL")));

        // Verify summary highlights generated
        assertFalse(response.getSummaryHighlights().isEmpty());
    }

    @Test
    @DisplayName("Should reject comparison with fewer than 2 candidates")
    void testRejectSingleCandidate() {
        assertThrows(IllegalArgumentException.class, () -> {
            candidateComparisonService.compareCandidates(List.of(1L));
        });
    }

    @Test
    @DisplayName("Should reject comparison with more than 3 candidates")
    void testRejectExceedingCandidateLimit() {
        assertThrows(IllegalArgumentException.class, () -> {
            candidateComparisonService.compareCandidates(List.of(1L, 2L, 3L, 4L));
        });
    }

    @Test
    @DisplayName("Should reject comparison when candidates do not exist in database")
    void testRejectMissingCandidates() {
        when(resumeAnalysisRepository.findAllById(anyList())).thenReturn(List.of(candidateA));

        assertThrows(IllegalArgumentException.class, () -> {
            candidateComparisonService.compareCandidates(List.of(1L, 999L));
        });
    }
}
