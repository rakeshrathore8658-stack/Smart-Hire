package com.smarthire.controller;

import com.smarthire.dto.JobMatchDTO;
import com.smarthire.entity.Resume;
import com.smarthire.repository.ResumeRepository;
import com.smarthire.service.JobMatchingService;
import com.smarthire.service.SkillsExtractionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/resume")
@RequiredArgsConstructor
@Slf4j
public class JobMatchController {

    private final JobMatchingService jobMatchingService;
    private final ResumeRepository resumeRepository;
    private final SkillsExtractionService skillsExtractionService;

    /**
     * Get available target job roles catalog.
     */
    @GetMapping("/job-roles")
    public ResponseEntity<List<String>> getJobRoles() {
        return ResponseEntity.ok(jobMatchingService.getAvailableRoles());
    }

    /**
     * Matches resume against all available job roles.
     */
    @PostMapping("/match-jobs")
    public ResponseEntity<?> matchJobs(@RequestBody Map<String, Object> payload) {
        Long resumeId = null;
        if (payload.containsKey("resumeId") && payload.get("resumeId") != null) {
            resumeId = Long.valueOf(payload.get("resumeId").toString());
        }

        List<String> skills = new ArrayList<>();
        if (resumeId != null) {
            Resume resume = resumeRepository.findById(resumeId).orElse(null);
            if (resume != null) {
                String text = resume.getNormalizedText() != null ? resume.getNormalizedText() : resume.getOriginalText();
                skills = skillsExtractionService.extractSkills(text);
            }
        }

        if (skills.isEmpty() && payload.containsKey("skills")) {
            Object skillsObj = payload.get("skills");
            if (skillsObj instanceof List<?>) {
                for (Object s : (List<?>) skillsObj) {
                    if (s != null) skills.add(s.toString());
                }
            }
        }

        List<JobMatchDTO> matches = jobMatchingService.matchAlternativeRoles(skills, new ArrayList<>());
        return ResponseEntity.ok(matches);
    }
}
