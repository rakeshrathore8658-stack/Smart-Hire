package com.smarthire.controller;

import com.smarthire.dto.ATSAnalysisDTO;
import com.smarthire.dto.CandidateInfoDTO;
import com.smarthire.dto.ResumeAnalyzeRequestDTO;
import com.smarthire.entity.Resume;
import com.smarthire.entity.ResumeAnalysis;
import com.smarthire.entity.User;
import com.smarthire.repository.ResumeAnalysisRepository;
import com.smarthire.repository.ResumeRepository;
import com.smarthire.repository.UserRepository;
import com.smarthire.service.CandidateNormalizationUtils;
import com.smarthire.service.ResumeAnalysisService;
import com.smarthire.service.ResumeExtractionService;
import com.smarthire.service.ResumeNormalizationService;
import com.smarthire.service.ResumeParserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/analysis")
@RequiredArgsConstructor
@Slf4j
public class AnalysisController {

    private final ResumeAnalysisService resumeAnalysisService;
    private final ResumeParserService resumeParserService;
    private final ResumeNormalizationService resumeNormalizationService;
    private final ResumeExtractionService resumeExtractionService;
    private final ResumeRepository resumeRepository;
    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final UserRepository userRepository;
    private final com.smarthire.service.RealtimeSyncService realtimeSyncService;
    private final com.smarthire.service.NotificationService notificationService;

    private User getAuthenticatedUser() {
        return resolveUser(null, null);
    }

    private User resolveUser(String emailParam, String headerEmail) {
        String email = null;
        if (emailParam != null && !emailParam.isBlank()) {
            email = emailParam.trim().toLowerCase();
        } else if (headerEmail != null && !headerEmail.isBlank()) {
            email = headerEmail.trim().toLowerCase();
        } else {
            try {
                ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attrs != null && attrs.getRequest() != null) {
                    String h = attrs.getRequest().getHeader("X-User-Email");
                    if (h != null && !h.isBlank()) {
                        email = h.trim().toLowerCase();
                    }
                }
            } catch (Exception ignored) {}
        }

        if (email == null) {
            try {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated() && !(auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
                    email = auth.getName();
                }
            } catch (Exception ignored) {}
        }

        if (email == null) {
            try {
                ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attrs != null && attrs.getRequest() != null && attrs.getRequest().getSession(false) != null) {
                    email = (String) attrs.getRequest().getSession(false).getAttribute("userEmail");
                }
            } catch (Exception ignored) {}
        }

        if (email != null && !email.isBlank()) {
            return userRepository.findByEmail(email.trim().toLowerCase()).orElse(null);
        }
        return null;
    }

    /**
     * Executes AI ATS analysis from JSON request body.
     */
    @Transactional
    @PostMapping(value = {"/analyze", "/api/resume/analyze"}, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> analyzeResumeJson(@RequestBody ResumeAnalyzeRequestDTO request) {
        if (request == null || request.getResumeId() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", 400,
                    "error", "Bad Request",
                    "message", "resumeId is required to execute analysis via JSON."
            ));
        }

        String targetRole = request.getTargetJobRole();
        if ("Other".equalsIgnoreCase(targetRole) && request.getCustomJobRole() != null && !request.getCustomJobRole().isBlank()) {
            targetRole = request.getCustomJobRole();
        }

        try {
            ATSAnalysisDTO result = resumeAnalysisService.analyzeResume(
                    request.getResumeId(),
                    targetRole,
                    request.getJobDescription(),
                    request.getAiProvider(),
                    request.getModel(),
                    request.getGeminiApiKey()
            );

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            log.warn("Analysis request argument error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "status", 400,
                    "error", "Bad Request",
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Analysis execution error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", 500,
                    "error", "Internal Server Error",
                    "message", "Resume analysis failed: " + e.getMessage()
            ));
        }
    }

    /**
     * Executes AI ATS analysis from Multipart form data (file upload + job parameters).
     */
    @Transactional
    @PostMapping(value = {"/analyze", "/api/resume/analyze"}, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> analyzeResumeMultipart(
            @RequestParam(value = "resumeFile", required = false) MultipartFile resumeFile,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "resumeId", required = false) Long resumeId,
            @RequestParam(value = "jobRole", required = false) String jobRole,
            @RequestParam(value = "targetJobRole", required = false) String targetJobRole,
            @RequestParam(value = "customJobRole", required = false) String customJobRole,
            @RequestParam(value = "jobDescription", required = false) String jobDescription,
            @RequestParam(value = "aiProvider", required = false) String aiProvider,
            @RequestParam(value = "model", required = false) String model,
            @RequestParam(value = "geminiApiKey", required = false) String geminiApiKey,
            @RequestParam(value = "email", required = false) String emailParam,
            @RequestHeader(value = "X-User-Email", required = false) String headerEmail
    ) {
        MultipartFile uploadFile = (resumeFile != null && !resumeFile.isEmpty()) ? resumeFile : file;

        String effectiveRole = (jobRole != null && !jobRole.isBlank()) ? jobRole : targetJobRole;
        if ("Other".equalsIgnoreCase(effectiveRole) && customJobRole != null && !customJobRole.isBlank()) {
            effectiveRole = customJobRole;
        }

        Long targetResumeId = resumeId;

        // If file is supplied, parse, normalize, extract, and persist resume
        if (uploadFile != null && !uploadFile.isEmpty()) {
            try {
                String rawText = resumeParserService.extractText(uploadFile);
                String normalizedText = resumeNormalizationService.normalizeText(rawText);

                if (!resumeNormalizationService.isValidResumeText(normalizedText)) {
                    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(Map.of(
                            "status", 422,
                            "error", "Unprocessable Entity",
                            "message", "No readable text found in resume. Please ensure file contains selectable text and is not an empty or scanned document."
                    ));
                }

                CandidateInfoDTO candidateInfo = resumeExtractionService.extractCandidateInfo(normalizedText);
                String structuredJson = resumeExtractionService.toJson(candidateInfo);

                String normEmail = CandidateNormalizationUtils.normalizeEmail(candidateInfo.getEmail());
                String normPhone = CandidateNormalizationUtils.normalizePhone(candidateInfo.getPhoneNumber());
                String candName = CandidateNormalizationUtils.normalizeName(candidateInfo.getName());

                User currentUser = resolveUser(emailParam, headerEmail);

                Optional<Resume> existingResumeOpt = Optional.empty();
                if (currentUser != null) {
                    // Strictly isolate to the current user's resumes
                    if (normEmail != null) {
                        existingResumeOpt = resumeRepository.findFirstByUserIdAndCandidateEmailNormalizedOrderByCreatedAtDesc(currentUser.getId(), normEmail);
                    }
                    if (existingResumeOpt.isEmpty() && normPhone != null) {
                        existingResumeOpt = resumeRepository.findFirstByUserIdAndCandidatePhoneNormalizedOrderByCreatedAtDesc(currentUser.getId(), normPhone);
                    }
                    if (existingResumeOpt.isEmpty() && uploadFile.getSize() > 0) {
                        existingResumeOpt = resumeRepository.findFirstByUserIdAndFileNameAndFileSizeOrderByCreatedAtDesc(currentUser.getId(), uploadFile.getOriginalFilename(), uploadFile.getSize());
                    }
                    if (existingResumeOpt.isEmpty() && candName != null && !candName.isBlank() && !candName.equalsIgnoreCase("Candidate")) {
                        existingResumeOpt = resumeRepository.findFirstByUserIdAndCandidateNameIgnoreCaseOrderByCreatedAtDesc(currentUser.getId(), candName);
                    }
                } else {
                    // Unauthenticated / guest scan
                    if (normEmail != null) {
                        existingResumeOpt = resumeRepository.findFirstByCandidateEmailNormalizedOrderByCreatedAtDesc(normEmail);
                    }
                    if (existingResumeOpt.isEmpty() && normPhone != null) {
                        existingResumeOpt = resumeRepository.findFirstByCandidatePhoneNormalizedOrderByCreatedAtDesc(normPhone);
                    }
                    if (existingResumeOpt.isEmpty() && uploadFile.getSize() > 0) {
                        existingResumeOpt = resumeRepository.findFirstByFileNameAndFileSizeOrderByCreatedAtDesc(uploadFile.getOriginalFilename(), uploadFile.getSize());
                    }
                    if (existingResumeOpt.isEmpty() && candName != null && !candName.isBlank() && !candName.equalsIgnoreCase("Candidate")) {
                        existingResumeOpt = resumeRepository.findFirstByCandidateNameIgnoreCaseOrderByCreatedAtDesc(candName);
                    }
                }

                boolean isDuplicateCandidate = existingResumeOpt.isPresent();
                boolean contentDifferenceDetected = true;
                Optional<ResumeAnalysis> existingAnalysisOpt = Optional.empty();

                if (isDuplicateCandidate) {
                    Resume existing = existingResumeOpt.get();
                    String oldText = existing.getNormalizedText() != null ? existing.getNormalizedText().trim() : "";
                    String newText = normalizedText != null ? normalizedText.trim() : "";

                    boolean textIdentical = !oldText.isEmpty() && oldText.equals(newText);
                    String normRole = CandidateNormalizationUtils.normalizeRole(effectiveRole);

                    if (currentUser != null) {
                        existingAnalysisOpt = resumeAnalysisRepository.findFirstByUserIdAndTargetJobRoleNormalized(currentUser.getId(), normRole);
                    }
                    if (existingAnalysisOpt.isEmpty() && normEmail != null) {
                        existingAnalysisOpt = resumeAnalysisRepository.findFirstByCandidateEmailNormalizedAndTargetJobRoleNormalized(normEmail, normRole);
                    }
                    if (existingAnalysisOpt.isEmpty() && normPhone != null) {
                        existingAnalysisOpt = resumeAnalysisRepository.findFirstByCandidatePhoneNormalizedAndTargetJobRoleNormalized(normPhone, normRole);
                    }
                    if (existingAnalysisOpt.isEmpty() && existing.getId() != null) {
                        existingAnalysisOpt = resumeAnalysisRepository.findFirstByResumeIdAndTargetJobRole(existing.getId(), effectiveRole);
                    }

                    if (textIdentical && existingAnalysisOpt.isPresent()) {
                        String oldDesc = existingAnalysisOpt.get().getJobDescription() != null ? existingAnalysisOpt.get().getJobDescription().trim() : "";
                        String newDesc = jobDescription != null ? jobDescription.trim() : "";
                        if (oldDesc.equals(newDesc)) {
                            contentDifferenceDetected = false;
                        }
                    }
                }

                // If identical duplicate with NO differences detected, skip redundant DB write
                if (!contentDifferenceDetected && existingAnalysisOpt.isPresent()) {
                    log.info("Identical resume content detected for candidate [{}]. Returning existing ATS analysis without redundant DB write.",
                            normEmail != null ? normEmail : candName);
                    ATSAnalysisDTO cachedDto = resumeAnalysisService.toDTO(existingAnalysisOpt.get());
                    cachedDto.setDuplicateDetected(true);
                    cachedDto.setContentModified(false);
                    cachedDto.setDifferenceSummary("Exact match: No content differences detected compared to previous scan. Retrieved existing analysis.");
                    return ResponseEntity.ok(cachedDto);
                }

                Resume resumeToSave;
                if (existingResumeOpt.isPresent()) {
                    resumeToSave = existingResumeOpt.get();
                    resumeToSave.setFileName(uploadFile.getOriginalFilename());
                    resumeToSave.setFileType(uploadFile.getContentType());
                    resumeToSave.setFileSize(uploadFile.getSize());
                    resumeToSave.setOriginalText(rawText);
                    resumeToSave.setNormalizedText(normalizedText);
                    resumeToSave.setStructuredJson(structuredJson);
                    resumeToSave.setCandidateName(candName);
                    resumeToSave.setCandidateEmail(candidateInfo.getEmail());
                    resumeToSave.setCandidateEmailNormalized(normEmail);
                    resumeToSave.setCandidatePhone(candidateInfo.getPhoneNumber());
                    resumeToSave.setCandidatePhoneNormalized(normPhone);
                    resumeToSave.setUpdatedAt(java.time.LocalDateTime.now());
                } else {
                    resumeToSave = Resume.builder()
                            .fileName(uploadFile.getOriginalFilename())
                            .fileType(uploadFile.getContentType())
                            .fileSize(uploadFile.getSize())
                            .originalText(rawText)
                            .normalizedText(normalizedText)
                            .structuredJson(structuredJson)
                            .candidateName(candName)
                            .candidateEmail(candidateInfo.getEmail())
                            .candidateEmailNormalized(normEmail)
                            .candidatePhone(candidateInfo.getPhoneNumber())
                            .candidatePhoneNormalized(normPhone)
                            .createdAt(java.time.LocalDateTime.now())
                            .build();
                }

                // Associate user if authenticated
                if (currentUser != null) {
                    resumeToSave.setUser(currentUser);
                }

                Resume savedResume = resumeRepository.save(resumeToSave);
                targetResumeId = savedResume.getId();

            } catch (Exception e) {
                log.error("Failed to parse and store uploaded resume file", e);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                        "status", 500,
                        "error", "Resume Processing Failed",
                        "message", "Failed to extract text from resume: " + e.getMessage()
                ));
            }
        }

        if (targetResumeId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", 400,
                    "error", "Bad Request",
                    "message", "A resume file or valid resumeId must be provided for analysis."
            ));
        }

        try {
            User currentUser = resolveUser(emailParam, headerEmail);

            ATSAnalysisDTO result = resumeAnalysisService.analyzeResume(
                    targetResumeId,
                    effectiveRole,
                    jobDescription,
                    aiProvider,
                    model,
                    geminiApiKey
            );

            result.setDuplicateDetected(false);
            result.setContentModified(true);
            result.setDifferenceSummary("Resume modifications detected and evaluated successfully.");

            // 1. Real-time WebSocket sync broadcast for HR Dashboard only
            try {
                realtimeSyncService.notifyResumeAnalyzed(
                        result.getId(),
                        result.getCandidateName(),
                        result.getTargetJobRole(),
                        result.getOverallScore(),
                        result.getResumeFileName()
                );
            } catch (Exception wsEx) {
                log.warn("Failed to dispatch real-time analysis sync: {}", wsEx.getMessage());
            }

            // 2. Targeted Notifications:
            // Notify ALL HR and RECRUITER users in the database
            try {
                List<User> hrUsers = userRepository.findByRoleIn(java.util.List.of("HR", "RECRUITER"));
                for (User hr : hrUsers) {
                    if (hr.getEmail() != null && !hr.getEmail().isBlank()) {
                        notificationService.sendEnrichedNotification(
                                hr.getEmail(),
                                result.getCandidateName(),
                                "New Candidate Scan: " + result.getCandidateName() + " (" + result.getOverallScore() + "%)",
                                "Candidate " + result.getCandidateName() + " evaluated against role '" + result.getTargetJobRole() + "' with ATS Score " + result.getOverallScore() + "%.",
                                "APPLICATION",
                                "/dashboard/candidates",
                                result.getId(),
                                "RESUME_ANALYSIS",
                                result.getTargetJobRole(),
                                "NEW_SCAN",
                                null,
                                "Under Review",
                                result.getCandidateName(),
                                null, null, null, null, null
                        );
                    }
                }
            } catch (Exception notifEx) {
                log.warn("Failed to dispatch HR notification for new scan: {}", notifEx.getMessage());
            }

            // 3. Notify ONLY the scanning user (confirmation) - Never to other job seekers!
            try {
                String scanningUserEmail = (currentUser != null) ? currentUser.getEmail() : result.getCandidateEmail();
                if (scanningUserEmail != null && !scanningUserEmail.isBlank()) {
                    String recipientName = (currentUser != null && currentUser.getFullName() != null)
                            ? currentUser.getFullName()
                            : result.getCandidateName();
                    notificationService.sendEnrichedNotification(
                            scanningUserEmail,
                            recipientName,
                            "Resume Scan Complete (" + result.getOverallScore() + "% Score)",
                            "Your resume evaluation for " + result.getTargetJobRole() + " is ready with ATS match score " + result.getOverallScore() + "%.",
                            "ANALYSIS",
                            "/dashboard/analyzerhistory",
                            result.getId(),
                            "RESUME_ANALYSIS",
                            result.getTargetJobRole(),
                            "ANALYSIS_COMPLETE",
                            null,
                            "Completed",
                            "SmartHire AI",
                            null, null, null, null, null
                    );
                }
            } catch (Exception notifEx) {
                log.warn("Failed to dispatch candidate scan confirmation: {}", notifEx.getMessage());
            }

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            log.warn("Analysis request argument error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "status", 400,
                    "error", "Bad Request",
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Analysis execution error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", 500,
                    "error", "Internal Server Error",
                    "message", "Resume analysis failed: " + e.getMessage()
            ));
        }
    }

    /**
     * Retrieve previously executed analysis by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getAnalysisById(@PathVariable("id") Long id) {
        try {
            Optional<ResumeAnalysis> entityOpt = resumeAnalysisRepository.findById(id);
            if (entityOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                        "status", 404,
                        "error", "Not Found",
                        "message", "Analysis record not found for ID: " + id
                ));
            }

            ResumeAnalysis entity = entityOpt.get();
            User currentUser = getAuthenticatedUser();

            // Authorization check: HR can view all, Job Seeker can only view their own
            if (currentUser != null && !"HR".equalsIgnoreCase(currentUser.getRole()) && !"RECRUITER".equalsIgnoreCase(currentUser.getRole())) {
                boolean isOwner = (entity.getUser() != null && entity.getUser().getId().equals(currentUser.getId()))
                        || (entity.getResume() != null && entity.getResume().getUser() != null && entity.getResume().getUser().getId().equals(currentUser.getId()))
                        || (entity.getCandidateEmail() != null && entity.getCandidateEmail().equalsIgnoreCase(currentUser.getEmail()))
                        || (entity.getCandidateEmailNormalized() != null && entity.getCandidateEmailNormalized().equalsIgnoreCase(currentUser.getEmail()));

                if (!isOwner) {
                    log.warn("Access denied: User [{}] attempted to access analysis [{}] belonging to candidate [{}]",
                            currentUser.getEmail(), id, entity.getCandidateEmail());
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                            "status", 403,
                            "error", "Forbidden",
                            "message", "You do not have permission to view this analysis report."
                    ));
                }
            }

            ATSAnalysisDTO analysis = resumeAnalysisService.toDTO(entity);
            return ResponseEntity.ok(analysis);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", 500,
                    "error", "Internal Server Error",
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Re-runs analysis on an existing resume.
     */
    @PostMapping(value = "/reanalyze", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> reanalyzeResumeJson(@RequestBody ResumeAnalyzeRequestDTO request) {
        return analyzeResumeJson(request);
    }

    /**
     * Delete resume analysis record by ID, cascading removal of orphaned parent Resume.
     */
    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteAnalysis(@PathVariable("id") Long id) {
        return resumeAnalysisRepository.findById(id).map(analysis -> {
            // Authorization check: Job seeker can only delete their own analysis
            User currentUser = getAuthenticatedUser();
            if (currentUser != null && !"HR".equalsIgnoreCase(currentUser.getRole()) && !"RECRUITER".equalsIgnoreCase(currentUser.getRole())) {
                boolean isOwner = (analysis.getUser() != null && analysis.getUser().getId().equals(currentUser.getId()))
                        || (analysis.getResume() != null && analysis.getResume().getUser() != null && analysis.getResume().getUser().getId().equals(currentUser.getId()))
                        || (analysis.getCandidateEmail() != null && analysis.getCandidateEmail().equalsIgnoreCase(currentUser.getEmail()))
                        || (analysis.getCandidateEmailNormalized() != null && analysis.getCandidateEmailNormalized().equalsIgnoreCase(currentUser.getEmail()));

                if (!isOwner) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                            "status", 403,
                            "error", "Forbidden",
                            "message", "You do not have permission to delete this analysis."
                    ));
                }
            }

            Resume resume = analysis.getResume();
            String candName = analysis.getCandidateName() != null ? analysis.getCandidateName() : "Candidate";
            String role = analysis.getTargetJobRole() != null ? analysis.getTargetJobRole() : "Role";

            // If an HR / Recruiter deletes a candidate's resume, notify the candidate with dynamic message and HR name
            boolean isHr = currentUser != null && ("HR".equalsIgnoreCase(currentUser.getRole()) || "RECRUITER".equalsIgnoreCase(currentUser.getRole()));
            String hrName = (currentUser != null && currentUser.getFullName() != null && !currentUser.getFullName().isBlank())
                    ? currentUser.getFullName()
                    : "HR Recruiter";

            if (isHr) {
                String candidateTargetEmail = null;
                if (analysis.getUser() != null && analysis.getUser().getEmail() != null) {
                    candidateTargetEmail = analysis.getUser().getEmail();
                } else if (resume != null && resume.getUser() != null && resume.getUser().getEmail() != null) {
                    candidateTargetEmail = resume.getUser().getEmail();
                } else if (analysis.getCandidateEmailNormalized() != null && !analysis.getCandidateEmailNormalized().isBlank()) {
                    candidateTargetEmail = analysis.getCandidateEmailNormalized();
                } else if (analysis.getCandidateEmail() != null && !analysis.getCandidateEmail().isBlank()) {
                    candidateTargetEmail = analysis.getCandidateEmail();
                }

                if (candidateTargetEmail != null && !candidateTargetEmail.isBlank()) {
                    String dynamicMsg = "Hello " + candName + ", your application for '" + role + "' has been removed from active recruitment review by HR Recruiter " + hrName + " and placed in recently deleted. If you have questions regarding your application, please reach out to our recruitment team.";
                    try {
                        notificationService.sendEnrichedNotification(
                                candidateTargetEmail,
                                candName,
                                "Application Removed from Active Review: " + role,
                                dynamicMsg,
                                "APPLICATION",
                                "/dashboard/history",
                                id,
                                "RESUME_ANALYSIS",
                                role,
                                "APPLICATION_REMOVED",
                                analysis.getStage() != null ? analysis.getStage() : "Under Review",
                                "RECENTLY_DELETED",
                                hrName,
                                null,
                                null,
                                null,
                                null,
                                "Application profile moved to recently deleted by " + hrName
                        );
                        log.info("Dispatched candidate notification for resume deletion by HR [{}]: candidate=[{}]", hrName, candidateTargetEmail);
                    } catch (Exception notifEx) {
                        log.warn("Failed to dispatch deletion notification to candidate: {}", notifEx.getMessage());
                    }
                }

                log.info("Moving ResumeAnalysis record [id={}] for [{}] - [{}] to Recently Deleted by HR [{}]", id, candName, role, hrName);
                analysis.setIsArchived(true);
                analysis.setArchivedAt(java.time.LocalDateTime.now());
                analysis.setStage("Archived");
                resumeAnalysisRepository.save(analysis);

                try {
                    realtimeSyncService.broadcastEvent("CANDIDATE_ARCHIVED", "DELETE", Map.of(
                            "id", id,
                            "candidateName", candName,
                            "targetJobRole", role,
                            "stage", "Archived"
                    ));
                } catch (Exception wsEx) {
                    log.warn("Failed to dispatch real-time archive sync: {}", wsEx.getMessage());
                }

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "archived", true,
                        "message", "Candidate '" + candName + "' successfully moved to Recently Deleted."
                ));
            } else {
                log.info("Hiding ResumeAnalysis record [id={}] from jobseeker history for [{}]", id, candName);
                analysis.setDeletedByJobseeker(true);
                resumeAnalysisRepository.save(analysis);

                try {
                    realtimeSyncService.notifyResumeDeleted(id, candName, role);
                } catch (Exception wsEx) {
                    log.warn("Failed to dispatch real-time delete sync: {}", wsEx.getMessage());
                }

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Resume record removed from your personal analysis history."
                ));
            }
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "success", false,
                "message", "Resume analysis record #" + id + " does not exist in database."
        )));
    }
}
