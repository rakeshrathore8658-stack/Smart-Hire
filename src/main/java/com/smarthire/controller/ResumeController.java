package com.smarthire.controller;

import com.smarthire.dto.CandidateInfoDTO;
import com.smarthire.dto.ResumeUploadResponseDTO;
import com.smarthire.entity.Resume;
import com.smarthire.repository.ResumeAnalysisRepository;
import com.smarthire.repository.ResumeRepository;
import com.smarthire.repository.UserRepository;
import com.smarthire.service.ResumeExtractionService;
import com.smarthire.service.ResumeNormalizationService;
import com.smarthire.service.ResumeParserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping({"/api/resume", "/api/resumes"})
@RequiredArgsConstructor
@Slf4j
public class ResumeController {

    private final ResumeParserService resumeParserService;
    private final ResumeNormalizationService resumeNormalizationService;
    private final ResumeExtractionService resumeExtractionService;
    private final ResumeRepository resumeRepository;
    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final UserRepository userRepository;
    private final com.smarthire.service.RealtimeSyncService realtimeSyncService;

    /**
     * Upload and parse resume document (PDF, DOC, DOCX, TXT).
     */
    @org.springframework.transaction.annotation.Transactional
    @PostMapping("/upload")
    public ResponseEntity<?> uploadResume(
            @RequestParam(value = "file", required = false) MultipartFile fileParam,
            @RequestParam(value = "resumeFile", required = false) MultipartFile resumeFileParam
    ) {
        MultipartFile file = (fileParam != null) ? fileParam : resumeFileParam;

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", 400,
                    "error", "Bad Request",
                    "message", "Please select a resume file to upload."
            ));
        }

        try {
            // Step 1: Parse Text
            String rawText = resumeParserService.extractText(file);

            // Step 2: Normalize Text
            String normalizedText = resumeNormalizationService.normalizeText(rawText);
            if (!resumeNormalizationService.isValidResumeText(normalizedText)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "status", 400,
                        "error", "Invalid Document",
                        "message", "Uploaded document does not contain recognizable resume content or is empty."
                ));
            }

            // Step 3: Information Extraction
            CandidateInfoDTO candidateInfo = resumeExtractionService.extractCandidateInfo(normalizedText);

            // Check if resume with same normalized email/phone already exists
            String normEmail = com.smarthire.service.CandidateNormalizationUtils.normalizeEmail(candidateInfo.getEmail());
            String normPhone = com.smarthire.service.CandidateNormalizationUtils.normalizePhone(candidateInfo.getPhoneNumber());

            Optional<Resume> existingResumeOpt = Optional.empty();
            if (!normEmail.isBlank()) {
                existingResumeOpt = resumeRepository.findFirstByCandidateEmailNormalizedOrderByCreatedAtDesc(normEmail);
            }
            if (existingResumeOpt.isEmpty() && !normPhone.isBlank()) {
                existingResumeOpt = resumeRepository.findFirstByCandidatePhoneNormalizedOrderByCreatedAtDesc(normPhone);
            }

            String candName = (candidateInfo.getName() != null && !candidateInfo.getName().isBlank())
                    ? candidateInfo.getName().trim()
                    : file.getOriginalFilename().replaceAll("(?i)\\.(pdf|docx?|txt)$", "").replace("_", " ").trim();

            String structuredJson = resumeExtractionService.toJson(candidateInfo);

            Resume resumeToSave;
            if (existingResumeOpt.isPresent()) {
                resumeToSave = existingResumeOpt.get();
                resumeToSave.setFileName(file.getOriginalFilename());
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
                        .fileName(file.getOriginalFilename())
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

            // Associate current user if logged in
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

            String preview = normalizedText.length() > 600
                    ? normalizedText.substring(0, 600) + "..."
                    : normalizedText;

            ResumeUploadResponseDTO response = ResumeUploadResponseDTO.builder()
                    .resumeId(savedResume.getId())
                    .fileName(savedResume.getFileName())
                    .fileType(savedResume.getFileType())
                    .fileSize(savedResume.getFileSize() != null ? savedResume.getFileSize() : 0)
                    .extractedTextLength(normalizedText.length())
                    .detectedSkills(candidateInfo.getTechnicalSkills())
                    .totalSkillsFound(candidateInfo.getTechnicalSkills() != null ? candidateInfo.getTechnicalSkills().size() : 0)
                    .candidateInfo(candidateInfo)
                    .previewText(preview)
                    .message("Resume uploaded, normalized, and parsed successfully.")
                    .build();

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.warn("Validation error during resume upload: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "status", 400,
                    "error", "Validation Error",
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Internal error processing resume upload", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", 500,
                    "error", "Internal Server Error",
                    "message", "Resume parsing failed: " + e.getMessage()
            ));
        }
    }

    /**
     * Retrieve stored resume by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getResumeById(@PathVariable("id") Long id) {
        return resumeRepository.findById(id)
                .map(resume -> ResponseEntity.ok((Object) Map.of(
                        "id", resume.getId(),
                        "fileName", resume.getFileName(),
                        "fileType", resume.getFileType() != null ? resume.getFileType() : "application/pdf",
                        "fileSize", resume.getFileSize() != null ? resume.getFileSize() : 0,
                        "createdAt", resume.getCreatedAt(),
                        "normalizedText", resume.getNormalizedText() != null ? resume.getNormalizedText() : ""
                )))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                        "status", 404,
                        "error", "Not Found",
                        "message", "Resume with ID " + id + " does not exist."
                )));
    }

    /**
     * Delete resume by ID, cascading removal of associated analyses.
     */
    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteResume(@PathVariable("id") Long id) {
        return resumeRepository.findById(id).map(resume -> {
            log.info("Deleting Resume record [id={}] and all associated analyses", id);
            try {
                resumeAnalysisRepository.deleteByResumeId(id);
                resumeAnalysisRepository.flush();
                resumeRepository.delete(resume);
                resumeRepository.flush();

                try {
                    realtimeSyncService.notifyResumeDeleted(id, resume.getCandidateName(), "Resume");
                } catch (Exception wsEx) {
                    log.warn("Failed to dispatch real-time resume delete event: {}", wsEx.getMessage());
                }

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Resume #" + id + " and associated analyses successfully deleted from database."
                ));
            } catch (Exception ex) {
                log.error("Failed to delete resume #" + id + ": {}", ex.getMessage(), ex);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                        "success", false,
                        "message", "Database error deleting resume: " + ex.getMessage()
                ));
            }
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "success", false,
                "message", "Resume with ID " + id + " does not exist."
        )));
    }
}
