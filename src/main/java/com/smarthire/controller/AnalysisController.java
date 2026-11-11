package com.smarthire.controller;

import com.smarthire.dto.ATSAnalysisDTO;
import com.smarthire.dto.CandidateInfoDTO;
import com.smarthire.dto.ResumeAnalyzeRequestDTO;
import com.smarthire.entity.Resume;
import com.smarthire.entity.ResumeAnalysis;
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
            @RequestParam(value = "geminiApiKey", required = false) String geminiApiKey
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

                Optional<Resume> existingResumeOpt = Optional.empty();
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

                boolean isDuplicateCandidate = existingResumeOpt.isPresent();
                boolean contentDifferenceDetected = true;
                Optional<ResumeAnalysis> existingAnalysisOpt = Optional.empty();

                if (isDuplicateCandidate) {
                    Resume existing = existingResumeOpt.get();
                    String oldText = existing.getNormalizedText() != null ? existing.getNormalizedText().trim() : "";
                    String newText = normalizedText != null ? normalizedText.trim() : "";

                    boolean textIdentical = !oldText.isEmpty() && oldText.equals(newText);
                    String normRole = CandidateNormalizationUtils.normalizeRole(effectiveRole);

                    if (normEmail != null) {
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
                try {
                    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                    if (auth != null && auth.getName() != null && !auth.getName().equalsIgnoreCase("anonymousUser")) {
                        userRepository.findByEmail(auth.getName()).ifPresent(resumeToSave::setUser);
                    }
                } catch (Exception ignored) {
                }

                if (resumeToSave.getUser() == null) {
                    try {
                        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                        if (attrs != null && attrs.getRequest() != null && attrs.getRequest().getSession(false) != null) {
                            String email = (String) attrs.getRequest().getSession(false).getAttribute("userEmail");
                            if (email != null && !email.isBlank()) {
                                userRepository.findByEmail(email).ifPresent(resumeToSave::setUser);
                            }
                        }
                    } catch (Exception ignored) {
                    }
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

            // Real-time WebSocket sync broadcast
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
            ATSAnalysisDTO analysis = resumeAnalysisService.getAnalysis(id);
            return ResponseEntity.ok(analysis);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", 404,
                    "error", "Not Found",
                    "message", e.getMessage()
            ));
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
            Resume resume = analysis.getResume();
            String candName = analysis.getCandidateName() != null ? analysis.getCandidateName() : "Candidate";
            String role = analysis.getTargetJobRole() != null ? analysis.getTargetJobRole() : "Role";
            log.info("Deleting ResumeAnalysis record [id={}] for [{}] - [{}]", id, candName, role);

            resumeAnalysisRepository.delete(analysis);
            resumeAnalysisRepository.flush();

            // Real-time WebSocket sync broadcast
            try {
                realtimeSyncService.notifyResumeDeleted(id, candName, role);
            } catch (Exception wsEx) {
                log.warn("Failed to dispatch real-time delete sync: {}", wsEx.getMessage());
            }

            if (resume != null && resume.getId() != null) {
                long remaining = resumeAnalysisRepository.countByResumeId(resume.getId());
                if (remaining == 0) {
                    try {
                        resumeRepository.delete(resume);
                        resumeRepository.flush();
                        log.info("Cascaded delete to parent Resume [id={}]", resume.getId());
                    } catch (Exception ex) {
                        log.warn("Could not delete associated resume [id={}]: {}", resume.getId(), ex.getMessage());
                    }
                }
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Resume analysis for '" + candName + "' successfully deleted from database."
            ));
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "success", false,
                "message", "Resume analysis record #" + id + " does not exist in database."
        )));
    }
}
