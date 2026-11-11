package com.smarthire.service;

import com.smarthire.dto.ATSAnalysisDTO;
import com.smarthire.dto.BulkUploadResponseDTO;
import com.smarthire.dto.CandidateInfoDTO;
import com.smarthire.entity.Job;
import com.smarthire.entity.Resume;
import com.smarthire.entity.ResumeAnalysis;
import com.smarthire.entity.User;
import com.smarthire.repository.ResumeAnalysisRepository;
import com.smarthire.repository.ResumeRepository;
import com.smarthire.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class BulkResumeUploadService {

    private final JobService jobService;
    private final ResumeParserService resumeParserService;
    private final ResumeNormalizationService resumeNormalizationService;
    private final ResumeExtractionService resumeExtractionService;
    private final ResumeAnalysisService resumeAnalysisService;
    private final ResumeRepository resumeRepository;
    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final RealtimeSyncService realtimeSyncService;

    @org.springframework.transaction.annotation.Transactional
    public BulkUploadResponseDTO processBatch(
            MultipartFile[] files,
            Long jobId,
            String aiProvider,
            String model,
            String hrEmailOverride
    ) {
        if (files == null || files.length == 0) {
            throw new IllegalArgumentException("No resume files provided for bulk upload.");
        }

        Job job = null;
        if (jobId != null) {
            job = jobService.getJobById(jobId).orElse(null);
        }

        String targetRole = job != null ? job.getTitle() : "Software Professional";
        String targetJobDesc = job != null ? job.getDescription() : "";

        User authUser = getAuthenticatedUser();
        String hrEmail = (authUser != null && authUser.getEmail() != null)
                ? authUser.getEmail()
                : hrEmailOverride;
        String hrName = (authUser != null && authUser.getFullName() != null)
                ? authUser.getFullName()
                : "Recruiter";

        // Bulk resume scan STRICTLY enforces local AI models (100% offline, privacy & zero cloud quota limits)
        String effectiveProvider = "local";
        String effectiveModel = model;
        if ("ollama".equalsIgnoreCase(aiProvider)) {
            effectiveProvider = "ollama";
            if (effectiveModel == null || effectiveModel.isBlank()) {
                effectiveModel = "qwen3:4b";
            }
        }
        log.info("BulkResumeUploadService: Processing batch of {} resumes strictly via local AI provider: {} (model: {})",
                files.length, effectiveProvider, effectiveModel);

        List<Map<String, Object>> processedList = new ArrayList<>();
        List<Map<String, String>> errorList = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) continue;

            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "Resume";
            try {
                // Step 1: Extract Text
                String rawText = resumeParserService.extractText(file);
                String normalizedText = resumeNormalizationService.normalizeText(rawText);

                if (!resumeNormalizationService.isValidResumeText(normalizedText)) {
                    errorList.add(Map.of(
                            "fileName", originalName,
                            "reason", "No extractable or meaningful text found in resume."
                    ));
                    continue;
                }

                // Step 2: Extract Candidate Details
                CandidateInfoDTO candidateInfo = resumeExtractionService.extractCandidateInfo(normalizedText);
                String structuredJson = resumeExtractionService.toJson(candidateInfo);

                String normEmail = CandidateNormalizationUtils.normalizeEmail(candidateInfo.getEmail());
                String normPhone = CandidateNormalizationUtils.normalizePhone(candidateInfo.getPhoneNumber());
                String candName = CandidateNormalizationUtils.normalizeName(candidateInfo.getName());

                // Step 3: Robust Multi-Layer Deduplication & Difference Detection
                Optional<Resume> existingOpt = Optional.empty();
                if (normEmail != null) {
                    existingOpt = resumeRepository.findFirstByCandidateEmailNormalizedOrderByCreatedAtDesc(normEmail);
                }
                if (existingOpt.isEmpty() && normPhone != null) {
                    existingOpt = resumeRepository.findFirstByCandidatePhoneNormalizedOrderByCreatedAtDesc(normPhone);
                }
                if (existingOpt.isEmpty() && file.getSize() > 0) {
                    existingOpt = resumeRepository.findFirstByFileNameAndFileSizeOrderByCreatedAtDesc(originalName, file.getSize());
                }
                if (existingOpt.isEmpty() && candName != null && !candName.isBlank() && !candName.equalsIgnoreCase("Candidate")) {
                    existingOpt = resumeRepository.findFirstByCandidateNameIgnoreCaseOrderByCreatedAtDesc(candName);
                }

                boolean isDuplicate = existingOpt.isPresent();
                boolean contentChanged = true;
                Optional<ResumeAnalysis> existingAnalysisOpt = Optional.empty();

                if (isDuplicate) {
                    Resume existing = existingOpt.get();
                    String oldText = existing.getNormalizedText() != null ? existing.getNormalizedText().trim() : "";
                    String newText = normalizedText != null ? normalizedText.trim() : "";

                    boolean textIdentical = !oldText.isEmpty() && oldText.equals(newText);
                    String normRole = CandidateNormalizationUtils.normalizeRole(targetRole);

                    if (normEmail != null) {
                        existingAnalysisOpt = resumeAnalysisRepository.findFirstByCandidateEmailNormalizedAndTargetJobRoleNormalized(normEmail, normRole);
                    }
                    if (existingAnalysisOpt.isEmpty() && normPhone != null) {
                        existingAnalysisOpt = resumeAnalysisRepository.findFirstByCandidatePhoneNormalizedAndTargetJobRoleNormalized(normPhone, normRole);
                    }
                    if (existingAnalysisOpt.isEmpty() && existing.getId() != null) {
                        existingAnalysisOpt = resumeAnalysisRepository.findFirstByResumeIdAndTargetJobRole(existing.getId(), targetRole);
                    }

                    if (textIdentical && existingAnalysisOpt.isPresent()) {
                        contentChanged = false;
                    }
                }

                // If identical duplicate with NO differences detected, skip redundant DB mutation
                if (!contentChanged && existingAnalysisOpt.isPresent()) {
                    log.info("Bulk upload: File {} for candidate {} has identical content. Reusing existing analysis without DB mutation.",
                            originalName, candName);
                    ATSAnalysisDTO cached = resumeAnalysisService.toDTO(existingAnalysisOpt.get());
                    Map<String, Object> candidateMap = new LinkedHashMap<>();
                    candidateMap.put("analysisId", cached.getId());
                    candidateMap.put("candidateName", cached.getCandidateName());
                    candidateMap.put("candidateEmail", cached.getCandidateEmail());
                    candidateMap.put("overallScore", cached.getOverallScore());
                    candidateMap.put("matchLevel", cached.getMatchLevel());
                    candidateMap.put("fileName", originalName);
                    candidateMap.put("skills", cached.getMatchedSkillsList());
                    candidateMap.put("duplicateDetected", true);
                    candidateMap.put("contentModified", false);
                    processedList.add(candidateMap);
                    continue;
                }

                Resume resumeToSave;
                if (existingOpt.isPresent()) {
                    resumeToSave = existingOpt.get();
                    resumeToSave.setFileName(originalName);
                    resumeToSave.setFileType(file.getContentType());
                    resumeToSave.setFileSize(file.getSize());
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
                            .fileName(originalName)
                            .fileType(file.getContentType())
                            .fileSize(file.getSize())
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

                if (authUser != null && resumeToSave.getUser() == null) {
                    resumeToSave.setUser(authUser);
                }

                Resume savedResume = resumeRepository.save(resumeToSave);

                // Step 4: Run Deep ATS Evaluation strictly with local model
                ATSAnalysisDTO analysisResult = resumeAnalysisService.analyzeResume(
                        savedResume.getId(),
                        targetRole,
                        targetJobDesc,
                        effectiveProvider,
                        effectiveModel,
                        null
                );

                Map<String, Object> candidateMap = new LinkedHashMap<>();
                candidateMap.put("analysisId", analysisResult.getId());
                candidateMap.put("candidateName", analysisResult.getCandidateName());
                candidateMap.put("candidateEmail", analysisResult.getCandidateEmail());
                candidateMap.put("overallScore", analysisResult.getOverallScore());
                candidateMap.put("matchLevel", analysisResult.getMatchLevel());
                candidateMap.put("fileName", originalName);
                candidateMap.put("skills", analysisResult.getMatchedSkillsList());
                processedList.add(candidateMap);

            } catch (Exception ex) {
                log.error("Failed to process resume file: {}", originalName, ex);
                errorList.add(Map.of(
                        "fileName", originalName,
                        "reason", ex.getMessage() != null ? ex.getMessage() : "Parsing failed"
                ));
            }
        }

        // Step 5: Notify the HR Recruiter who initiated the bulk task
        notifyHr(hrEmail, hrName, job != null ? job.getId() : null, targetRole, files.length, processedList.size());

        try {
            realtimeSyncService.broadcastEvent("BULK_RESUMES_PROCESSED", "CREATE", Map.of(
                    "jobTitle", targetRole,
                    "totalProcessed", processedList.size(),
                    "totalFiles", files.length
            ));
        } catch (Exception ignored) {}

        return BulkUploadResponseDTO.builder()
                .jobId(job != null ? job.getId() : null)
                .jobTitle(targetRole)
                .totalFiles(files.length)
                .successful(processedList.size())
                .failed(errorList.size())
                .processedCandidates(processedList)
                .errors(errorList)
                .message(String.format("Batch screening complete. %d of %d resumes successfully evaluated.",
                        processedList.size(), files.length))
                .build();
    }

    public void notifyHr(String hrEmail, String hrName, Long jobId, String jobTitle, int totalFiles, int successfulCount) {
        if (hrEmail == null || hrEmail.isBlank()) return;

        try {
            String title = "Bulk Resume Screening Completed";
            String msg = String.format("Successfully parsed and evaluated %d of %d resumes for vacancy '%s'. Candidates have been added to the Candidate Pool.",
                    successfulCount, totalFiles, jobTitle);

            notificationService.sendEnrichedNotification(
                    hrEmail,
                    hrName != null ? hrName : "Recruiter",
                    title,
                    msg,
                    "BULK_UPLOAD",
                    "/dashboard/candidates",
                    jobId,
                    "JOB",
                    jobTitle,
                    "BULK_ANALYSIS_COMPLETED",
                    null,
                    "COMPLETED",
                    "SmartHire AI Screening Engine",
                    null, null, null, null, null
            );
            log.info("HR Bulk screening completion notification sent to: {}", hrEmail);
        } catch (Exception e) {
            log.warn("Could not dispatch bulk completion notification to HR: {}", e.getMessage());
        }
    }

    private User getAuthenticatedUser() {
        String email = null;
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken) && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
                email = auth.getName();
            }
        } catch (Exception ignored) {}

        if (email == null) {
            try {
                ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attrs != null && attrs.getRequest() != null && attrs.getRequest().getSession(false) != null) {
                    email = (String) attrs.getRequest().getSession(false).getAttribute("userEmail");
                }
            } catch (Exception ignored) {}
        }

        if (email != null && !email.isBlank()) {
            return userRepository.findByEmail(email).orElse(null);
        }
        return null;
    }
}
