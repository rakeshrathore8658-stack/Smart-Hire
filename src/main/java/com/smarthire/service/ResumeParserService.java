package com.smarthire.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

@Service
@Slf4j
public class ResumeParserService {

    private final Tika tika = new Tika();

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList("pdf", "doc", "docx", "txt");
    private static final List<String> ALLOWED_MIME_TYPES = Arrays.asList(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "application/octet-stream" // some browsers send octet-stream for docx
    );

    /**
     * Validates file format, size, and extracts text accurately.
     */
    public String extractText(MultipartFile file) throws IOException, TikaException {
        validateFile(file);

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        byte[] fileBytes = file.getBytes();

        if (fileBytes.length == 0) {
            throw new IllegalArgumentException("The uploaded file is empty.");
        }

        String extractedText = "";

        // Specialized PDFBox parser for PDF to handle complex layouts and multi-page
        if (originalFilename.endsWith(".pdf")) {
            try {
                extractedText = extractPdfWithPdfBox(fileBytes);
            } catch (Exception e) {
                log.warn("PDFBox parsing encountered issue, falling back to Apache Tika: {}", e.getMessage());
            }
        }

        // Fallback to Apache Tika for DOC, DOCX, TXT, or if PDFBox produced empty text
        if (extractedText == null || extractedText.isBlank()) {
            try (InputStream is = new ByteArrayInputStream(fileBytes)) {
                extractedText = tika.parseToString(is);
            }
        }

        // Plain text fallback if needed
        if ((extractedText == null || extractedText.isBlank()) && originalFilename.endsWith(".txt")) {
            extractedText = new String(fileBytes, StandardCharsets.UTF_8);
        }

        if (extractedText == null || extractedText.isBlank()) {
            throw new IllegalArgumentException("Could not extract readable text from resume. Ensure the file contains text and is not an image-only scan.");
        }

        return extractedText;
    }

    /**
     * Uses Apache PDFBox for high-fidelity multi-page text and table extraction.
     */
    private String extractPdfWithPdfBox(byte[] pdfBytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            if (document.isEncrypted()) {
                log.warn("PDF is encrypted/password protected");
                throw new IllegalArgumentException("Uploaded PDF is password protected. Please provide an unencrypted resume.");
            }

            PDFTextStripper textStripper = new PDFTextStripper();
            textStripper.setSortByPosition(true); // Preserves tabular alignment
            textStripper.setLineSeparator("\n");
            return textStripper.getText(document);
        }
    }

    /**
     * Validates file size, non-empty, and supported extension.
     */
    public void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please select a resume file to upload.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds 10 MB limit.");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || !filename.contains(".")) {
            throw new IllegalArgumentException("Invalid file name. Extension is missing.");
        }

        String extension = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Unsupported file type ." + extension + ". Please upload PDF, DOC, DOCX, or TXT.");
        }

        String contentType = file.getContentType();
        if (contentType != null && !contentType.isBlank()) {
            boolean validMime = ALLOWED_MIME_TYPES.stream().anyMatch(m -> m.equalsIgnoreCase(contentType));
            if (!validMime) {
                log.warn("Uploaded file MIME type: {} for extension: {}", contentType, extension);
            }
        }
    }
}
