package com.smarthire.controller;

import com.smarthire.entity.Job;
import com.smarthire.entity.ResumeAnalysis;
import com.smarthire.entity.User;
import com.smarthire.repository.ResumeAnalysisRepository;
import com.smarthire.repository.UserRepository;
import com.smarthire.security.SecurityUtils;
import com.smarthire.service.JobService;
import com.smarthire.service.NotificationService;
import com.smarthire.service.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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
        try {
            User currentUser = SecurityUtils.getCurrentUser(userRepository).orElse(null);
            boolean isHr = currentUser != null && ("HR".equalsIgnoreCase(currentUser.getRole()) || "RECRUITER".equalsIgnoreCase(currentUser.getRole()));

            List<Job> jobs;
            List<ResumeAnalysis> relevantAnalyses;

            if (isHr) {
                // HR only views and manages their own job requisitions (and seed jobs)
                jobs = jobService.getJobsByRecruiter(currentUser.getId());
                relevantAnalyses = resumeAnalysisRepository.findByRecruiterIdOrderByCreatedAtDesc(currentUser.getId());
            } else {
                // Candidates and Guests view open job opportunities
                jobs = jobService.getJobsForUser(currentUser);
                relevantAnalyses = (currentUser != null)
                        ? resumeAnalysisRepository.findAllForUser(currentUser.getId(), currentUser.getEmail())
                        : Collections.emptyList();
            }

            for (Job job : jobs) {
                String title = (job.getTitle() != null) ? job.getTitle() : "";
                List<ResumeAnalysis> matching = relevantAnalyses.stream()
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
        } catch (Exception ex) {
            log.error("Error in getAllJobs: ", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "message", "Failed to retrieve job listings: " + ex.getMessage()
            ));
        }
    }

    @GetMapping("/departments")
    public ResponseEntity<?> getDepartments() {
        List<String> depts = jobService.getAllDepartments();
        return ResponseEntity.ok(Map.of("departments", depts, "total", depts.size()));
    }

    @PostMapping("/departments")
    public ResponseEntity<?> addDepartment(@RequestBody Map<String, String> payload) {
        String name = payload != null ? payload.get("name") : null;
        if (name == null || name.trim().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Department name is required"));
        }
        com.smarthire.entity.Department saved = jobService.addDepartment(name.trim());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", saved.getId() != null ? saved.getId() : 0,
                "department", saved.getName(),
                "message", "Department created successfully"
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getJobById(@PathVariable("id") Long id) {
        User currentUser = SecurityUtils.getCurrentUser(userRepository).orElse(null);
        boolean isHr = currentUser != null && ("HR".equalsIgnoreCase(currentUser.getRole()) || "RECRUITER".equalsIgnoreCase(currentUser.getRole()));

        Optional<Job> jobOpt = jobService.getJobById(id);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        Job job = jobOpt.get();
        if (isHr && job.getRecruiter() != null && currentUser != null && !job.getRecruiter().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message", "Access denied: You do not have permission to view or manage jobs created by another recruiter."
            ));
        }

        return ResponseEntity.ok(job);
    }

    @PostMapping
    public ResponseEntity<?> createJob(@RequestBody Job job) {
        if (job.getTitle() == null || job.getTitle().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Job title is required"));
        }
        if (job.getStatus() == null || job.getStatus().isBlank()) {
            job.setStatus("Open");
        }

        User currentUser = SecurityUtils.getCurrentUser(userRepository).orElse(null);
        if (currentUser != null) {
            job.setRecruiter(currentUser);
        }

        Job saved = jobService.saveJob(job, currentUser);

        // Notify job seekers about new job opening (event dispatched asynchronously)
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
                        "/dashboard/jobroles",
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
        User currentUser = SecurityUtils.getCurrentUser(userRepository).orElse(null);
        boolean isHr = currentUser != null && ("HR".equalsIgnoreCase(currentUser.getRole()) || "RECRUITER".equalsIgnoreCase(currentUser.getRole()));

        Optional<Job> existingOpt = jobService.getJobById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        Job existing = existingOpt.get();

        // RBAC: HR A cannot edit jobs owned by HR B
        if (isHr && existing.getRecruiter() != null && currentUser != null && !existing.getRecruiter().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message", "Access denied: You cannot modify a job requisition created by another recruiter."
            ));
        }

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

        // Asynchronously notify matching applicant candidates about job details update
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
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteJob(@PathVariable("id") Long id) {
        User currentUser = SecurityUtils.getCurrentUser(userRepository).orElse(null);
        boolean isHr = currentUser != null && ("HR".equalsIgnoreCase(currentUser.getRole()) || "RECRUITER".equalsIgnoreCase(currentUser.getRole()));

        Optional<Job> existingOpt = jobService.getJobById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Job requisition not found"));
        }

        Job existing = existingOpt.get();

        // RBAC: HR A cannot delete jobs owned by HR B
        if (isHr && existing.getRecruiter() != null && currentUser != null && !existing.getRecruiter().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message", "Access denied: You cannot delete a job requisition created by another recruiter."
            ));
        }

        jobService.deleteJob(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Job deleted successfully"));
    }
}
