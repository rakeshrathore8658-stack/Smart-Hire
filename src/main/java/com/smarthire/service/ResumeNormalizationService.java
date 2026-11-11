package com.smarthire.service;

import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

/**
 * Service to clean and normalize resume text extracted from various document formats
 * (PDF, DOC, DOCX, TXT) while preserving critical structure, sections, and tokens.
 */
@Service
public class ResumeNormalizationService {

    private static final Pattern MULTI_NEWLINES = Pattern.compile("(\r?\n){3,}");
    private static final Pattern MULTI_SPACES = Pattern.compile("[ \t\f]+");
    private static final Pattern BULLET_POINTS = Pattern.compile("^[ \\t]*[•\\*\\-\\–\\—\\▪\\►\\▸\\⁃\\·]\\s*", Pattern.MULTILINE);
    private static final Pattern NON_PRINTABLE = Pattern.compile("[\\p{Cntrl}&&[^\r\n\t]]");
    private static final Pattern UNICODE_SPACES = Pattern.compile("[\\u00A0\\u2007\\u202F\\u200B-\\u200D\\uFEFF]");

    /**
     * Cleans, sanitizes, and normalizes raw text extracted from documents.
     *
     * @param rawText Extracted text from Apache Tika or PDFBox
     * @return Normalized, readable text
     */
    public String normalizeText(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            return "";
        }

        // 1. Replace non-standard unicode whitespace with standard spaces
        String cleaned = UNICODE_SPACES.matcher(rawText).replaceAll(" ");

        // 2. Remove non-printable control characters except line feeds and tabs
        cleaned = NON_PRINTABLE.matcher(cleaned).replaceAll("");

        // 3. Normalize bullet symbols into clean standard bullet points for readability
        cleaned = BULLET_POINTS.matcher(cleaned).replaceAll("- ");

        // 4. Collapse consecutive spaces and tabs
        cleaned = MULTI_SPACES.matcher(cleaned).replaceAll(" ");

        // 5. Trim lines and normalize linebreaks
        String[] lines = cleaned.split("\r?\n");
        StringBuilder sb = new StringBuilder();
        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty()) {
                sb.append(trimmed).append("\n");
            } else {
                sb.append("\n");
            }
        }

        // 6. Reduce excessive empty lines to max 2
        String result = MULTI_NEWLINES.matcher(sb.toString()).replaceAll("\n\n");

        return result.trim();
    }

    /**
     * Check if text is sufficient to be considered a valid resume.
     */
    public boolean isValidResumeText(String text) {
        if (text == null || text.trim().length() < 50) {
            return false;
        }
        // Must contain at least a few words
        String[] words = text.split("\\s+");
        return words.length >= 10;
    }
}
