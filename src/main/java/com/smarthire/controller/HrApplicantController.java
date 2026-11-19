package com.smarthire.controller;

import com.smarthire.dto.ApplicantDetailDTO;
import com.smarthire.entity.*;
import com.smarthire.repository.*;
import com.smarthire.security.SecurityUtils;
import com.smarthire.service.DynamicEmailService;
import com.smarthire.service.JobScreeningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/hr/applications")
@RequiredArgsConstructor
@Slf4j
public class HrApplicantController {

    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final CandidateFormResponseRepository candidateFormResponseRepository;
    private final UserRepository userRepository;
    private final JobScreeningService jobScreeningService;
    private final DynamicEmailService dynamicEmailService;
    private final com.smarthire.service.NotificationOutboxService notificationOutboxService;
    private final com.smarthire.service.NotificationQueueService notificationQueueService;

    private User getAuthenticatedHr() {
        User user = SecurityUtils.getCurrentUser(userRepository).orElse(null);
        if (user == null) {
            try {
                org.springframework.web.context.request.ServletRequestAttributes attrs =
                        (org.springframework.web.context.request.ServletRequestAttributes)
                                org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
                if (attrs != null && attrs.getRequest() != null) {
                    String h = attrs.getRequest().getHeader("X-User-Email");
                    if (h != null && !h.isBlank()) {
                        user = userRepository.findByEmail(h.trim().toLowerCase()).orElse(null);
                    }
                }
            } catch (Exception ignored) {}
        }
        return user;
    }

    /**
     * GET /api/hr/applications/{applicationId}
     * Returns complete applicant details, ATS score, Cloudinary resume link, and screening questionnaire responses.
     */
    @GetMapping("/{applicationId}")
    public ResponseEntity<?> getApplicantDetails(@PathVariable("applicationId") Long applicationId) {
        User hr = getAuthenticatedHr();
        if (hr == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "message", "Unauthorized. Only HR recruiters can access applicant details."
            ));
        }

        Optional<ResumeAnalysis> analysisOpt = resumeAnalysisRepository.findById(applicationId);
        if (analysisOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "message", "Applicant record not found with ID: " + applicationId
            ));
        }

        ResumeAnalysis analysis = analysisOpt.get();

        // RBAC Isolation: Verify that the authenticated HR is authorized to view this applicant
        if (analysis.getRecruiterId() != null && !analysis.getRecruiterId().equals(hr.getId())) {
            // Check if job recruiter matches
            if (analysis.getJob() != null && analysis.getJob().getRecruiter() != null
                    && !analysis.getJob().getRecruiter().getId().equals(hr.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "message", "Access denied: This applicant belongs to a job requisition managed by another recruiter."
                ));
            }
        }

        // Candidate Summary
        Long candUserId = (analysis.getUser() != null) ? analysis.getUser().getId() : null;
        ApplicantDetailDTO.CandidateSummary candSummary = ApplicantDetailDTO.CandidateSummary.builder()
                .id(candUserId)
                .name(analysis.getCandidateName())
                .email(analysis.getCandidateEmail())
                .phoneNumber(analysis.getCandidatePhone())
                .location(analysis.getCandidateLocation())
                .experience(analysis.getCandidateExperience())
                .build();

        // Job Summary
        Job job = analysis.getJob();
        ApplicantDetailDTO.JobSummary jobSummary = ApplicantDetailDTO.JobSummary.builder()
                .id(job != null ? job.getId() : null)
                .title(job != null ? job.getTitle() : analysis.getTargetJobRole())
                .department(job != null ? job.getDepartment() : "Engineering")
                .companyName(job != null ? job.getCompanyName() : "SmartHire Technologies")
                .location(job != null ? job.getLocation() : "Remote / Hybrid")
                .build();

        // ATS Summary
        double score = analysis.getOverallScore();
        ApplicantDetailDTO.AtsSummary atsSummary = ApplicantDetailDTO.AtsSummary.builder()
                .score(score)
                .overallScore(analysis.getOverallScore())
                .skillsScore(analysis.getSkillsScore())
                .experienceScore(analysis.getExperienceScore())
                .formattingScore(analysis.getFormattingScore())
                .eligible(score >= 60.0)
                .analyzedAt(analysis.getCreatedAt())
                .matchedSkills(analysis.getMatchedSkillsList())
                .missingSkills(analysis.getMissingSkillsStringList())
                .build();

        // Resume Summary (Cloudinary URL)
        Resume resume = analysis.getResume();
        String resumeUrl = analysis.getResumeUrl();
        String resumePublicId = analysis.getResumePublicId();
        String fileName = (resume != null && resume.getFileName() != null) ? resume.getFileName() : analysis.getResumeFileName();
        String contentType = (resume != null && resume.getFileType() != null) ? resume.getFileType() : "application/pdf";
        Long fileSize = (resume != null) ? resume.getFileSize() : 0L;

        ApplicantDetailDTO.ResumeSummary resumeSummary = ApplicantDetailDTO.ResumeSummary.builder()
                .id(resume != null ? resume.getId() : null)
                .resumeUrl(resumeUrl != null ? resumeUrl : "")
                .resumePublicId(resumePublicId)
                .fileName(fileName)
                .contentType(contentType)
                .fileSize(fileSize)
                .uploadedAt(analysis.getCreatedAt())
                .build();

        // Screening Questionnaire Summary
        List<CandidateFormResponse> responses = candidateFormResponseRepository.findByApplicationIdOrderByIdAsc(applicationId);
        List<ApplicantDetailDTO.QuestionAnswerItem> responseItems = new ArrayList<>();
        for (CandidateFormResponse cfr : responses) {
            String qText = (cfr.getQuestion() != null) ? cfr.getQuestion().getQuestionText() : "Question";
            String qType = (cfr.getQuestion() != null && cfr.getQuestion().getQuestionType() != null) ? cfr.getQuestion().getQuestionType().name() : "TEXT";
            boolean required = cfr.getQuestion() == null || Boolean.TRUE.equals(cfr.getQuestion().getIsRequired());

            responseItems.add(ApplicantDetailDTO.QuestionAnswerItem.builder()
                    .questionId(cfr.getQuestion() != null ? cfr.getQuestion().getId() : null)
                    .question(qText)
                    .questionType(qType)
                    .answer(cfr.getAnswerText())
                    .required(required)
                    .build());
        }

        ApplicantDetailDTO.ScreeningSummary screeningSummary = ApplicantDetailDTO.ScreeningSummary.builder()
                .submitted(!responses.isEmpty() || "Screening Completed".equalsIgnoreCase(analysis.getStage()))
                .responses(responseItems)
                .build();

        String status = analysis.getStage() != null ? analysis.getStage() : "Under Review";
        String appSource = analysis.getEffectiveApplicationSource();

        ApplicantDetailDTO dto = ApplicantDetailDTO.builder()
                .applicationId(analysis.getId())
                .candidate(candSummary)
                .job(jobSummary)
                .ats(atsSummary)
                .resume(resumeSummary)
                .screening(screeningSummary)
                .applicationStatus(status)
                .applicationSource(appSource)
                .sourceLabel("JOB_SEEKER".equalsIgnoreCase(appSource) ? "Job Seeker Portal" : "HR Recruiter Scan")
                .build();

        return ResponseEntity.ok(dto);
    }

    /**
     * POST /api/hr/applications/{applicationId}/status
     * Updates candidate stage and dispatches dynamic HR Gmail notifications.
     */
    @PostMapping("/{applicationId}/status")
    public ResponseEntity<?> updateApplicantStatus(
            @PathVariable("applicationId") Long applicationId,
            @RequestBody Map<String, Object> payload
    ) {
        User hr = getAuthenticatedHr();

        Optional<ResumeAnalysis> analysisOpt = resumeAnalysisRepository.findById(applicationId);
        if (analysisOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Applicant not found"));
        }

        ResumeAnalysis analysis = analysisOpt.get();
        String newStage = payload != null ? (String) payload.get("stage") : null;
        if (newStage == null || newStage.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Stage is required."));
        }

        boolean wasShortlisted = Boolean.TRUE.equals(analysis.getShortlisted()) || Boolean.TRUE.equals(analysis.isShortlisted());
        boolean isShortlistedParam = payload != null && (
                Boolean.TRUE.equals(payload.get("shortlisted")) ||
                "true".equalsIgnoreCase(String.valueOf(payload.get("shortlisted")))
        );
        boolean isExplicitUnshortlist = payload != null && (
                Boolean.FALSE.equals(payload.get("shortlisted")) ||
                "false".equalsIgnoreCase(String.valueOf(payload.get("shortlisted")))
        );

        analysis.setStage(newStage);
        if ("Shortlisted".equalsIgnoreCase(newStage) || isShortlistedParam) {
            analysis.setShortlisted(true);
        } else if ("Rejected".equalsIgnoreCase(newStage) || isExplicitUnshortlist || ("Under Review".equalsIgnoreCase(newStage) && wasShortlisted)) {
            analysis.setShortlisted(false);
        }

        ResumeAnalysis saved = resumeAnalysisRepository.save(analysis);

        // Dispatch automated candidate notification through Transactional Outbox (Module 2)
        if (analysis.getCandidateEmail() != null && !analysis.getCandidateEmail().isBlank()) {
            String comp = (analysis.getJob() != null && analysis.getJob().getCompanyName() != null)
                    ? analysis.getJob().getCompanyName()
                    : "SmartHire Technologies";
            String role = (analysis.getTargetJobRole() != null) ? analysis.getTargetJobRole() : "Role";

            Long effectiveHrId = (hr != null) ? hr.getId() : (analysis.getRecruiterId() != null ? analysis.getRecruiterId() : (analysis.getJob() != null && analysis.getJob().getRecruiter() != null ? analysis.getJob().getRecruiter().getId() : 1L));
            String hrName = (hr != null && hr.getFullName() != null) ? hr.getFullName() : "SmartHire Recruiter";
            String hrEmail = (hr != null && hr.getEmail() != null) ? hr.getEmail() : "";

            Map<String, Object> outboxData = new HashMap<>();
            outboxData.put("candidateName", analysis.getCandidateName());
            outboxData.put("candidateEmail", analysis.getCandidateEmail());
            outboxData.put("jobTitle", role);
            outboxData.put("companyName", comp);
            outboxData.put("atsScore", String.valueOf(analysis.getOverallScore()));
            outboxData.put("hrName", hrName);
            outboxData.put("hrEmail", hrEmail);

            NotificationEventType eventType = null;
            if ("Shortlisted".equalsIgnoreCase(newStage) || (isShortlistedParam && !wasShortlisted)) {
                eventType = NotificationEventType.CANDIDATE_SHORTLISTED;
            } else if (wasShortlisted && (isExplicitUnshortlist || "Under Review".equalsIgnoreCase(newStage))) {
                eventType = NotificationEventType.REMOVED_FROM_SHORTLIST;
            } else if ("Rejected".equalsIgnoreCase(newStage)) {
                eventType = NotificationEventType.CANDIDATE_REJECTED;
            } else if ("Interview Scheduled".equalsIgnoreCase(newStage) || "Interviewing".equalsIgnoreCase(newStage)) {
                eventType = NotificationEventType.INTERVIEW_SCHEDULED;
            } else if ("Hired".equalsIgnoreCase(newStage)) {
                eventType = NotificationEventType.CANDIDATE_HIRED;
            }

            if (eventType != null) {
                notificationQueueService.enqueueCandidateEvent(
                        eventType,
                        effectiveHrId,
                        (analysis.getUser() != null) ? analysis.getUser().getId() : null,
                        analysis.getCandidateEmail(),
                        analysis.getCandidateName(),
                        analysis.getId(),
                        analysis.getJobId(),
                        outboxData
                );
            }
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "applicationId", applicationId,
                "stage", saved.getStage(),
                "shortlisted", saved.isShortlisted(),
                "message", "Application status updated to '" + saved.getStage() + "' successfully."
        ));
    }
}
