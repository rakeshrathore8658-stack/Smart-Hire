package com.smarthire.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.dto.CandidateFormSubmissionDTO;
import com.smarthire.entity.*;
import com.smarthire.repository.*;
import com.smarthire.security.SecurityUtils;
import com.smarthire.service.DynamicEmailService;
import com.smarthire.service.JobScreeningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
@Slf4j
public class CandidateScreeningController {

    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final JobQuestionRepository jobQuestionRepository;
    private final JobScreeningService jobScreeningService;
    private final UserRepository userRepository;
    private final DynamicEmailService dynamicEmailService;
    private final com.smarthire.service.NotificationPreferenceService preferenceService;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * POST /api/applications/{applicationId}/screening-responses
     * Submits candidate responses to the dynamic screening questionnaire.
     * Enforces strict server-side validation:
     * - Application exists
     * - Candidate ownership
     * - ATS score >= 60.0%
     * - Questions belong to the application's job
     * - Required questions answered
     * - Multiple-choice options validated
     */
    @PostMapping("/{applicationId}/screening-responses")
    @Transactional
    public ResponseEntity<?> submitScreeningResponses(
            @PathVariable("applicationId") Long applicationId,
            @RequestBody CandidateFormSubmissionDTO payload
    ) {
        if (applicationId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Application ID is required."));
        }

        Optional<ResumeAnalysis> analysisOpt = resumeAnalysisRepository.findById(applicationId);
        if (analysisOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", 404,
                    "message", "Application not found with ID: " + applicationId
            ));
        }

        ResumeAnalysis analysis = analysisOpt.get();

        // 1. Authenticated ownership validation
        User currentUser = SecurityUtils.getCurrentUser(userRepository).orElse(null);
        if (currentUser != null && "USER".equalsIgnoreCase(currentUser.getRole())) {
            // Verify ownership: user ID or normalized email
            boolean matchesUserId = (analysis.getUser() != null && analysis.getUser().getId().equals(currentUser.getId()));
            boolean matchesEmail = (analysis.getCandidateEmail() != null && analysis.getCandidateEmail().equalsIgnoreCase(currentUser.getEmail()));
            if (!matchesUserId && !matchesEmail) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "status", 403,
                        "message", "Access denied: You cannot submit screening responses for another candidate's application."
                ));
            }
        }

        // 2. CRITICAL ATS THRESHOLD RULE: Exactly >= 60.0% qualifies
        double atsScore = analysis.getOverallScore();
        if (atsScore < 60.0) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(Map.of(
                    "status", 422,
                    "eligible", false,
                    "atsScore", atsScore,
                    "message", "Application is not eligible for screening. The ATS score (" + atsScore + "%) is below the required 60% threshold."
            ));
        }

        // 3. Validate responses payload
        if (payload == null || payload.getResponses() == null || payload.getResponses().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No question responses provided in submission."));
        }

        List<CandidateFormSubmissionDTO.QuestionResponseItem> responseItems = payload.getResponses();

        // 4. Check for duplicate question IDs in payload
        Set<Long> seenQuestionIds = new HashSet<>();
        for (CandidateFormSubmissionDTO.QuestionResponseItem item : responseItems) {
            if (item.getQuestionId() == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Question ID cannot be null."));
            }
            if (!seenQuestionIds.add(item.getQuestionId())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Duplicate response found for question ID: " + item.getQuestionId()
                ));
            }
        }

        // 5. Retrieve target job and its official questions
        Long jobId = analysis.getJobId();
        if (jobId == null && analysis.getJob() != null) {
            jobId = analysis.getJob().getId();
        }

        List<JobQuestion> jobQuestions = (jobId != null)
                ? jobQuestionRepository.findByJobIdOrderByOrderIndexAsc(jobId)
                : Collections.emptyList();

        Map<Long, JobQuestion> jobQuestionMap = new HashMap<>();
        for (JobQuestion jq : jobQuestions) {
            jobQuestionMap.put(jq.getId(), jq);
        }

        // If job has official screening questions configured, validate them strictly
        if (!jobQuestionMap.isEmpty()) {
            for (CandidateFormSubmissionDTO.QuestionResponseItem item : responseItems) {
                JobQuestion question = jobQuestionMap.get(item.getQuestionId());
                if (question == null) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "message", "Question ID " + item.getQuestionId() + " does not belong to the job associated with this application."
                    ));
                }

                String answer = item.getAnswerText() != null ? item.getAnswerText().trim() : "";

                // Check required questions
                if (Boolean.TRUE.equals(question.getIsRequired()) && answer.isBlank()) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "message", "Required question '" + question.getQuestionText() + "' must be answered."
                    ));
                }

                // Check multiple-choice options validation
                if (question.getQuestionType() == QuestionType.MULTIPLE_CHOICE && !answer.isBlank()) {
                    List<String> validOptions = getParsedOptions(question.getOptionsJson());
                    if (!validOptions.isEmpty()) {
                        boolean optionMatches = validOptions.stream()
                                .anyMatch(opt -> opt.trim().equalsIgnoreCase(answer));
                        if (!optionMatches) {
                            return ResponseEntity.badRequest().body(Map.of(
                                    "message", "Invalid answer '" + answer + "' for question '" + question.getQuestionText() +
                                            "'. Expected one of: " + validOptions
                            ));
                        }
                    }
                }
            }

            // Check if any REQUIRED question from the job was completely omitted
            for (JobQuestion jq : jobQuestions) {
                if (Boolean.TRUE.equals(jq.getIsRequired())) {
                    boolean answered = responseItems.stream().anyMatch(r ->
                            jq.getId().equals(r.getQuestionId()) && r.getAnswerText() != null && !r.getAnswerText().trim().isBlank()
                    );
                    if (!answered) {
                        return ResponseEntity.badRequest().body(Map.of(
                                "message", "Missing answer for required question: '" + jq.getQuestionText() + "'"
                        ));
                    }
                }
            }
        }

        // 6. Persist responses atomically
        List<CandidateFormResponse> savedResponses = jobScreeningService.saveCandidateResponses(applicationId, responseItems);

        // 7. Update application lifecycle stage to SCREENING_COMPLETED
        analysis.setStage("Screening Completed");
        analysis.setApplicationSource("JOB_SEEKER");
        resumeAnalysisRepository.save(analysis);

        // 8. Option 2: Trigger dynamic HR email notification ONLY for real Job Seekers (Never on HR Testing/Scans)
        // Also strictly respects HR's candidate notification preference for NEW_APPLICATION_RECEIVED
        try {
            boolean isHrActor = currentUser != null && (
                    "HR".equalsIgnoreCase(currentUser.getRole()) ||
                    "RECRUITER".equalsIgnoreCase(currentUser.getRole()) ||
                    (currentUser.getRole() != null && currentUser.getRole().toUpperCase().contains("HR")) ||
                    (currentUser.getRole() != null && currentUser.getRole().toUpperCase().contains("RECRUITER"))
            );
            boolean isHrScan = isHrActor || (analysis.getRecruiterId() != null && analysis.getUser() == null && currentUser != null && currentUser.getId().equals(analysis.getRecruiterId()));

            if (isHrScan) {
                log.info("Option 2 Active: Skipping 'Application Received' email. Submission was executed during HR scan / testing.");
            } else {
                Long hrUserId = analysis.getRecruiterId();
                if (hrUserId == null && analysis.getJob() != null && analysis.getJob().getRecruiter() != null) {
                    hrUserId = analysis.getJob().getRecruiter().getId();
                }

                if (hrUserId != null) {
                    boolean emailEnabled = preferenceService.isEmailEnabled(hrUserId, NotificationEventType.NEW_APPLICATION_RECEIVED);
                    if (!emailEnabled) {
                        log.info("HR Recruiter [ID: {}] has disabled 'Application Received' email notifications in Candidate Preferences. Notification suppressed.", hrUserId);
                    } else {
                        String comp = (analysis.getJob() != null && analysis.getJob().getCompanyName() != null)
                                ? analysis.getJob().getCompanyName()
                                : "SmartHire Technologies";
                        dynamicEmailService.sendApplicationReceived(
                                hrUserId,
                                analysis.getCandidateName(),
                                analysis.getCandidateEmail(),
                                analysis.getTargetJobRole(),
                                comp,
                                atsScore
                        );
                        log.info("Dispatched 'Application Received' confirmation email to candidate [{}] for role [{}]",
                                analysis.getCandidateEmail(), analysis.getTargetJobRole());
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Dynamic HR notification skipped after screening submission: {}", ex.getMessage());
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "applicationId", applicationId,
                "responsesSaved", savedResponses.size(),
                "status", "SCREENING_COMPLETED",
                "message", "Screening responses submitted successfully. Your application is under review!"
        ));
    }

    private List<String> getParsedOptions(String optionsJson) {
        if (optionsJson == null || optionsJson.isBlank()) return Collections.emptyList();
        try {
            return MAPPER.readValue(optionsJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Arrays.stream(optionsJson.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }
    }
}
