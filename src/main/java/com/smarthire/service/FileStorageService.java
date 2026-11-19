package com.smarthire.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final Cloudinary cloudinary;

    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    private static final String CLOUDINARY_FOLDER = "smart-hire/resumes";

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UploadResult {
        private boolean success;
        private String secureUrl;
        private String publicId;
        private String fileName;
        private Long fileSize;
        private String contentType;
        private String message;
    }

    /**
     * Checks if Cloudinary client has active credentials configured.
     */
    public boolean isConfigured() {
        return cloudinary != null && cloudinary.config != null
                && cloudinary.config.cloudName != null && !cloudinary.config.cloudName.isBlank()
                && cloudinary.config.apiKey != null && !cloudinary.config.apiKey.isBlank();
    }

    /**
     * Validates file size and format (including actual magic bytes) before upload.
     */
    public void validateResumeFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No resume file uploaded or file is empty.");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds the 10MB maximum limit. Uploaded size: " + (file.getSize() / 1024 / 1024) + "MB");
        }

        String originalName = file.getOriginalFilename();
        String lowerName = (originalName != null) ? originalName.toLowerCase() : "";

        boolean hasValidExtension = lowerName.endsWith(".pdf") || lowerName.endsWith(".docx") || lowerName.endsWith(".doc");
        if (!hasValidExtension) {
            throw new IllegalArgumentException("Unsupported resume format. Only PDF, DOCX, and DOC documents are accepted.");
        }

        // Verify actual binary content (magic bytes) to avoid spoofed extensions
        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[8];
            int read = is.read(header);
            if (read >= 4) {
                boolean isPdf = header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46; // %PDF
                boolean isZipDocx = header[0] == 0x50 && header[1] == 0x4B && header[2] == 0x03 && header[3] == 0x04; // PK..
                boolean isLegacyDoc = (read >= 8) && (header[0] == (byte) 0xD0 && header[1] == (byte) 0xCF && header[2] == 0x11 && header[3] == (byte) 0xE0);

                if (!isPdf && !isZipDocx && !isLegacyDoc) {
                    log.warn("Uploaded file [{}] failed binary magic bytes check", originalName);
                    throw new IllegalArgumentException("The uploaded file does not match a valid PDF or Word document signature.");
                }
            }
        } catch (IOException e) {
            log.error("Failed to inspect file magic bytes for [{}]", originalName, e);
            throw new IllegalArgumentException("Unable to inspect uploaded file content: " + e.getMessage());
        }
    }

    /**
     * Uploads candidate resume file to Cloudinary and returns a structured UploadResult.
     */
    public UploadResult uploadResumeFile(MultipartFile file) {
        validateResumeFile(file);

        String originalName = file.getOriginalFilename();
        String contentType = file.getContentType();
        long fileSize = file.getSize();

        if (!isConfigured()) {
            log.info("Cloudinary credentials not active. Operating in simulated local URL mode for: {}", originalName);
            String syntheticId = "local_" + UUID.randomUUID().toString().substring(0, 8);
            return UploadResult.builder()
                    .success(true)
                    .publicId(syntheticId)
                    .secureUrl("/api/resumes/raw/" + syntheticId + "/" + originalName)
                    .fileName(originalName)
                    .fileSize(fileSize)
                    .contentType(contentType)
                    .message("Resume parsed (operating in local fallback mode)")
                    .build();
        }

        try {
            String cleanName = (originalName != null)
                    ? originalName.replaceAll("[^a-zA-Z0-9.-]", "_")
                    : "resume";

            String publicId = cleanName.replaceAll("\\.[^.]+$", "") + "_" + UUID.randomUUID().toString().substring(0, 8);

            Map<String, Object> params = ObjectUtils.asMap(
                    "folder", CLOUDINARY_FOLDER,
                    "public_id", publicId,
                    "resource_type", "auto",
                    "access_mode", "public",
                    "type", "upload",
                    "use_filename", true,
                    "unique_filename", true,
                    "overwrite", false
            );

            log.info("Uploading resume [{}] to Cloudinary folder [{}]...", originalName, CLOUDINARY_FOLDER);
            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = (Map<String, Object>) cloudinary.uploader().upload(file.getBytes(), params);

            if (uploadResult != null) {
                String secureUrl = (String) uploadResult.get("secure_url");
                String returnedPublicId = (String) uploadResult.get("public_id");

                if (secureUrl == null) {
                    secureUrl = (String) uploadResult.get("url");
                }

                log.info("Resume successfully uploaded to Cloudinary: {}", secureUrl);
                return UploadResult.builder()
                        .success(true)
                        .secureUrl(secureUrl)
                        .publicId(returnedPublicId != null ? returnedPublicId : publicId)
                        .fileName(originalName)
                        .fileSize(fileSize)
                        .contentType(contentType)
                        .message("Resume uploaded successfully")
                        .build();
            }

            throw new RuntimeException("Empty response received from Cloudinary uploader");

        } catch (Exception ex) {
            log.error("Cloudinary upload failed for [{}]: {}", originalName, ex.getMessage());
            throw new RuntimeException("Failed to upload resume to Cloudinary: " + ex.getMessage(), ex);
        }
    }

    /**
     * Backward-compatible helper method returning just the secure URL string.
     */
    public String uploadResume(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        try {
            UploadResult res = uploadResumeFile(file);
            return res != null ? res.getSecureUrl() : null;
        } catch (Exception e) {
            log.warn("Cloudinary upload error in legacy helper: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Deletes a resume asset from Cloudinary by its public ID.
     */
    public boolean deleteResume(String publicId) {
        if (publicId == null || publicId.isBlank() || !isConfigured()) {
            return false;
        }
        try {
            Map<?, ?> result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.info("Cloudinary delete result for [{}]: {}", publicId, result);
            return "ok".equalsIgnoreCase(String.valueOf(result.get("result")));
        } catch (Exception ex) {
            log.error("Failed to delete Cloudinary asset [{}]: {}", publicId, ex.getMessage());
            return false;
        }
    }
}
