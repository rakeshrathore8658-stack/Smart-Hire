package com.smarthire;

import com.smarthire.entity.ResumeAnalysis;
import com.smarthire.repository.ResumeAnalysisRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

@ExtendWith(MockitoExtension.class)
class ResumeAnalyzerApplicationTests {

    @Mock
    private ResumeAnalysisRepository resumeAnalysisRepository;

    @Test
    void contextLoads() {
        Assertions.assertNotNull(resumeAnalysisRepository);
    }

    @Test
    void testResumeAnalysisFetchWithNullShortlistedField() {
        ResumeAnalysis mockRa = ResumeAnalysis.builder()
                .id(1L)
                .shortlisted(null)
                .targetJobRole("Java Developer")
                .createdAt(LocalDateTime.now())
                .build();

        Mockito.when(resumeAnalysisRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(mockRa));
        Mockito.when(resumeAnalysisRepository.findByShortlistedTrueOrderByCreatedAtDesc()).thenReturn(List.of(mockRa));

        List<ResumeAnalysis> list = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();
        Assertions.assertNotNull(list);
        for (ResumeAnalysis ra : list) {
            Assertions.assertNotNull(ra.getId());
            boolean sl = ra.isShortlisted();
            Assertions.assertFalse(sl);
            Assertions.assertNotNull(ra.getFormattedDate());
            Assertions.assertNotNull(ra.getResumeFileName());
        }

        List<ResumeAnalysis> shortlisted = resumeAnalysisRepository.findByShortlistedTrueOrderByCreatedAtDesc();
        Assertions.assertNotNull(shortlisted);
    }

}
