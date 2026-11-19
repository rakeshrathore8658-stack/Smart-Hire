package com.smarthire.controller;

import com.smarthire.entity.Resume;
import com.smarthire.entity.User;
import com.smarthire.repository.ResumeRepository;
import com.smarthire.repository.UserRepository;
import com.smarthire.security.SecurityUtils;
import com.smarthire.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/resumes")
@RequiredArgsConstructor
@Slf4j
public class ResumeFileController {

    private final FileStorageService fileStorageService;
    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;

    /**
     * Uploads resume file to Cloudinary and saves metadata.
     * Accessible by authenticated candidates or during application submission.
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadResume(
            @RequestParam(value = "resume", required = false) MultipartFile resumeParam,
            @RequestParam(value = "file", required = false) MultipartFile fileParam
    ) {
        MultipartFile uploadFile = (resumeParam != null && !resumeParam.isEmpty()) ? resumeParam : fileParam;
        if (uploadFile == null || uploadFile.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Resume file is required."
            ));
        }

        try {
            FileStorageService.UploadResult result = fileStorageService.uploadResumeFile(uploadFile);

            User currentUser = SecurityUtils.getCurrentUser(userRepository).orElse(null);

            // Persist a Resume record with Cloudinary URL
            Resume resume = Resume.builder()
                    .fileName(result.getFileName())
                    .fileType(result.getContentType())
                    .fileSize(result.getFileSize())
                    .resumeUrl(result.getSecureUrl())
                    .resumePublicId(result.getPublicId())
                    .createdAt(LocalDateTime.now())
                    .user(currentUser)
                    .build();

            Resume saved = resumeRepository.save(resume);

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "success", true,
                    "resumeId", saved.getId(),
                    "resumeUrl", result.getSecureUrl(),
                    "fileName", result.getFileName(),
                    "message", "Resume uploaded successfully"
            ));

        } catch (IllegalArgumentException ex) {
            log.warn("Resume upload validation failed: {}", ex.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", ex.getMessage()
            ));
        } catch (Exception ex) {
            log.error("Resume upload error: ", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Failed to upload resume: " + ex.getMessage()
            ));
        }
    }

    /**
     * Authorized resume metadata retrieval or view redirection by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getResumeMetadata(
            @PathVariable("id") Long id,
            @RequestHeader(value = "Accept", required = false) String acceptHeader
    ) {
        Optional<Resume> resumeOpt = resumeRepository.findById(id);
        if (resumeOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "message", "Resume not found with ID: " + id
            ));
        }

        Resume resume = resumeOpt.get();
        User currentUser = SecurityUtils.getCurrentUser(userRepository).orElse(null);

        // Security check: Candidate can view their own resume; HR can view resumes associated with applications
        if (currentUser != null && "USER".equalsIgnoreCase(currentUser.getRole())) {
            if (resume.getUser() != null && !resume.getUser().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "success", false,
                        "message", "Access denied: You cannot view resumes uploaded by another candidate."
                ));
            }
        }

        // If accessed directly from browser address bar (HTML request) and resumeUrl exists, redirect directly
        if (acceptHeader != null && (acceptHeader.contains("text/html") || acceptHeader.contains("application/pdf"))) {
            if (resume.getResumeUrl() != null && !resume.getResumeUrl().isBlank()) {
                return ResponseEntity.status(HttpStatus.FOUND)
                        .location(java.net.URI.create(resume.getResumeUrl()))
                        .build();
            }
        }

        return ResponseEntity.ok(Map.of(
                "id", resume.getId(),
                "fileName", resume.getFileName() != null ? resume.getFileName() : "Resume.pdf",
                "fileSize", resume.getFileSize() != null ? resume.getFileSize() : 0,
                "contentType", resume.getFileType() != null ? resume.getFileType() : "application/pdf",
                "resumeUrl", resume.getResumeUrl() != null ? resume.getResumeUrl() : "",
                "uploadedAt", resume.getCreatedAt() != null ? resume.getCreatedAt() : LocalDateTime.now()
        ));
    }

    /**
     * Direct view/download URL: redirects browser immediately to the Cloudinary asset.
     */
    @GetMapping({"/{id}/view", "/{id}/download"})
    public ResponseEntity<?> viewResumeDocument(@PathVariable("id") Long id) {
        Optional<Resume> resumeOpt = resumeRepository.findById(id);
        if (resumeOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "message", "Resume not found with ID: " + id
            ));
        }

        Resume resume = resumeOpt.get();
        if (resume.getResumeUrl() != null && !resume.getResumeUrl().isBlank()) {
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(java.net.URI.create(resume.getResumeUrl()))
                    .build();
        }

        return ResponseEntity.ok(Map.of(
                "id", resume.getId(),
                "fileName", resume.getFileName() != null ? resume.getFileName() : "Resume.pdf",
                "message", "Cloudinary URL not generated for this legacy record."
        ));
    }
}
