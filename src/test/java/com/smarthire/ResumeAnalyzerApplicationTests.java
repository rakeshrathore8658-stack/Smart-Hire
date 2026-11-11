package com.smarthire;

import com.smarthire.entity.ResumeAnalysis;
import com.smarthire.repository.ResumeAnalysisRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

@SpringBootTest
class ResumeAnalyzerApplicationTests {

    @Autowired
    private ResumeAnalysisRepository resumeAnalysisRepository;

    @Test
    void contextLoads() {
    }

    @Test
    void testResumeAnalysisFetchWithNullShortlistedField() {
        List<ResumeAnalysis> list = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();
        Assertions.assertNotNull(list);
        for (ResumeAnalysis ra : list) {
            Assertions.assertNotNull(ra.getId());
            boolean sl = ra.isShortlisted();
            Assertions.assertNotNull(ra.getFormattedDate());
            Assertions.assertNotNull(ra.getResumeFileName());
        }

        List<ResumeAnalysis> shortlisted = resumeAnalysisRepository.findByShortlistedTrueOrderByCreatedAtDesc();
        Assertions.assertNotNull(shortlisted);
    }

}
