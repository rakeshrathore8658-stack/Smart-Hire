package com.smarthire.controller;

import com.smarthire.entity.Job;
import com.smarthire.entity.ResumeAnalysis;
import com.smarthire.entity.User;
import com.smarthire.repository.ResumeAnalysisRepository;
import com.smarthire.repository.UserRepository;
import com.smarthire.service.JobService;
import com.smarthire.service.NotificationService;
import com.smarthire.service.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
@Slf4j
public class JobApiController {

    private final JobService jobService;
    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<?> getAllJobs() {
        List<Job> jobs = jobService.getAllJobs();
        List<ResumeAnalysis> allAnalyses = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();

        for (Job job : jobs) {
            String title = (job.getTitle() != null) ? job.getTitle() : "";
            List<ResumeAnalysis> matching = allAnalyses.stream()
                    .filter(ra -> ReportService.isJobMatching(title, ra.getTargetJobRole()))
                    .toList();
            job.setApplicantsCount(matching.size());
            int shortlisted = (int) matching.stream()
                    .filter(ra -> ra.isShortlisted() || "Shortlisted".equalsIgnoreCase(ra.getStage()))
                    .count();
            job.setShortlistedCount(shortlisted);
        }

        return ResponseEntity.ok(Map.of(
                "total", jobs.size(),
                "openCount", jobs.stream().filter(j -> "Open".equalsIgnoreCase(j.getStatus())).count(),
                "jobs", jobs
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getJobById(@PathVariable("id") Long id) {
        return jobService.getJobById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping
    public ResponseEntity<?> createJob(@RequestBody Job job) {
        if (job.getTitle() == null || job.getTitle().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Job title is required"));
        }
        if (job.getStatus() == null || job.getStatus().isBlank()) {
            job.setStatus("Open");
        }
        Job saved = jobService.saveJob(job);

        // Notify job seekers about new job opening
        try {
            List<User> jobSeekers = userRepository.findAll().stream()
                    .filter(u -> "USER".equalsIgnoreCase(u.getRole()))
                    .toList();
            for (User seeker : jobSeekers) {
                String seekerName = seeker.getFullName() != null ? seeker.getFullName() : "Candidate";
                notificationService.sendEnrichedNotification(
                        seeker.getEmail(),
                        seekerName,
                        "New Job Opportunity Available",
                        "Hello " + seekerName + ", a new job opportunity for " + saved.getTitle() + " is now available. Check the job details and apply if interested.",
                        "JOB_POSTING",
                        "/dashboard/notifications",
                        saved.getId(),
                        "JOB",
                        saved.getTitle(),
                        "JOB_PUBLISHED",
                        null,
                        saved.getStatus(),
                        saved.getDepartment() != null ? saved.getDepartment() + " Hiring Team" : "SmartHire Recruitment",
                        null, null, null, null, null
                );
            }
        } catch (Exception ex) {
            log.warn("Job creation notification broadcast error: {}", ex.getMessage());
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateJob(@PathVariable("id") Long id, @RequestBody Job job) {
        return jobService.getJobById(id).map(existing -> {
            existing.setTitle(job.getTitle() != null ? job.getTitle() : existing.getTitle());
            existing.setDepartment(job.getDepartment() != null ? job.getDepartment() : existing.getDepartment());
            existing.setEmploymentType(job.getEmploymentType() != null ? job.getEmploymentType() : existing.getEmploymentType());
            existing.setOpenings(job.getOpenings() > 0 ? job.getOpenings() : existing.getOpenings());
            existing.setMinExperience(job.getMinExperience());
            existing.setMaxExperience(job.getMaxExperience());
            existing.setLocation(job.getLocation() != null ? job.getLocation() : existing.getLocation());
            existing.setSalaryRange(job.getSalaryRange() != null ? job.getSalaryRange() : existing.getSalaryRange());
            existing.setDescription(job.getDescription() != null ? job.getDescription() : existing.getDescription());
            existing.setRequiredSkills(job.getRequiredSkills() != null ? job.getRequiredSkills() : existing.getRequiredSkills());
            if (job.getStatus() != null && !job.getStatus().isBlank()) {
                existing.setStatus(job.getStatus());
            }
            Job updated = jobService.saveJob(existing);

            // Notify matching applicant candidates about job details update
            try {
                List<ResumeAnalysis> applicants = resumeAnalysisRepository.findAll().stream()
                        .filter(ra -> ReportService.isJobMatching(updated.getTitle(), ra.getTargetJobRole()))
                        .toList();
                for (ResumeAnalysis ra : applicants) {
                    if (ra.getCandidateEmail() != null && !ra.getCandidateEmail().isBlank()) {
                        notificationService.sendNotification(
                                ra.getCandidateEmail(),
                                ra.getCandidateName(),
                                "Job Update: " + updated.getTitle(),
                                "Requisition specifications for " + updated.getTitle() + " were updated by the recruiting team.",
                                "JOB_POSTING",
                                "/dashboard/jobroles"
                        );
                    }
                }
            } catch (Exception ex) {
                log.warn("Job update notification error: {}", ex.getMessage());
            }

            return ResponseEntity.ok(updated);
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteJob(@PathVariable("id") Long id) {
        jobService.getJobById(id).ifPresent(j -> {
            try {
                List<ResumeAnalysis> applicants = resumeAnalysisRepository.findAll().stream()
                        .filter(ra -> ReportService.isJobMatching(j.getTitle(), ra.getTargetJobRole()))
                        .toList();
                for (ResumeAnalysis ra : applicants) {
                    if (ra.getCandidateEmail() != null && !ra.getCandidateEmail().isBlank()) {
                        notificationService.sendNotification(
                                ra.getCandidateEmail(),
                                ra.getCandidateName(),
                                "Requisition Closed: " + j.getTitle(),
                                "The hiring requisition for " + j.getTitle() + " has been closed.",
                                "JOB_POSTING",
                                "/dashboard/jobroles"
                        );
                    }
                }
            } catch (Exception ex) {
                log.warn("Job deletion notification error: {}", ex.getMessage());
            }
        });

        jobService.deleteJob(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Job deleted successfully"));
    }
}
