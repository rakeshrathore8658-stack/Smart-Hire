package com.smarthire;

import com.smarthire.service.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;

public class CloudinaryStorageTest {

    private FileStorageService fileStorageService;

    @BeforeEach
    void setUp() {
        // Instantiate without live Cloudinary bean to test local validation and fallback safety
        fileStorageService = new FileStorageService(null);
    }

    @Test
    @DisplayName("Should accept valid PDF file with magic bytes %PDF-")
    void testValidPdfValidation() {
        byte[] pdfBytes = "%PDF-1.7 header content and text stream".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "resume.pdf", "application/pdf", pdfBytes);

        assertDoesNotThrow(() -> {
            FileStorageService.UploadResult info = fileStorageService.uploadResumeFile(file);
            assertNotNull(info);
            assertTrue(info.getSecureUrl().contains("resume.pdf"));
        });
    }

    @Test
    @DisplayName("Should accept valid DOCX file with ZIP magic bytes PK\\x03\\x04")
    void testValidDocxValidation() {
        byte[] docxBytes = new byte[]{0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00};
        MockMultipartFile file = new MockMultipartFile("file", "cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docxBytes);

        assertDoesNotThrow(() -> {
            FileStorageService.UploadResult info = fileStorageService.uploadResumeFile(file);
            assertNotNull(info);
            assertTrue(info.getSecureUrl().contains("cv.docx"));
        });
    }

    @Test
    @DisplayName("Should reject spoofed executable disguised as PDF")
    void testSpoofedExecutableRejection() {
        byte[] exeBytes = "MZ executable binary data header disguised".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "exploit.pdf", "application/pdf", exeBytes);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            fileStorageService.uploadResumeFile(file);
        });
        assertTrue(ex.getMessage().contains("signature"));
    }

    @Test
    @DisplayName("Should reject empty or zero-byte file")
    void testEmptyFileRejection() {
        MockMultipartFile file = new MockMultipartFile("file", "empty.pdf", "application/pdf", new byte[0]);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            fileStorageService.uploadResumeFile(file);
        });
        assertTrue(ex.getMessage().contains("empty"));
    }

    @Test
    @DisplayName("Should reject files exceeding 10MB limit")
    void testFileSizeExceededRejection() {
        byte[] largeBytes = new byte[11 * 1024 * 1024]; // 11MB
        // set valid PDF header at the beginning
        byte[] header = "%PDF-".getBytes();
        System.arraycopy(header, 0, largeBytes, 0, header.length);

        MockMultipartFile file = new MockMultipartFile("file", "giant_resume.pdf", "application/pdf", largeBytes);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            fileStorageService.uploadResumeFile(file);
        });
        assertTrue(ex.getMessage().contains("10MB"));
    }

    @Test
    @DisplayName("Should reject unsupported extensions (e.g. .exe, .sh, .txt)")
    void testUnsupportedExtensionRejection() {
        byte[] textBytes = "Plain text notes".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "notes.txt", "text/plain", textBytes);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            fileStorageService.uploadResumeFile(file);
        });
        assertTrue(ex.getMessage().contains("Only PDF, DOCX, and DOC"));
    }
}
