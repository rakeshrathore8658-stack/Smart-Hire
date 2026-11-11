package com.smarthire.service;

import java.util.Locale;

/**
 * Utility for normalizing candidate identity attributes (email, phone, job role, name)
 * to ensure robust duplicate candidate detection and pipeline deduplication.
 */
public final class CandidateNormalizationUtils {

    private CandidateNormalizationUtils() {
    }

    /**
     * Normalizes an email address: trims whitespace, converts to lowercase.
     * Returns null if input is null, empty, or lacks an '@' symbol.
     */
    public static String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim().toLowerCase(Locale.ROOT);
        if (trimmed.isEmpty() || !trimmed.contains("@")) {
            return null;
        }
        return trimmed;
    }

    /**
     * Normalizes a phone number: extracts only digits and strips standard leading
     * international country codes (e.g., +91 for India, leading 0s) to yield
     * a canonical subscriber number for reliable comparison.
     */
    public static String normalizePhone(String phone) {
        if (phone == null) {
            return null;
        }
        String digits = phone.replaceAll("\\D", "");
        if (digits.isEmpty()) {
            return null;
        }

        // Standard Indian Mobile (12 digits starting with 91 -> 10 digits)
        if (digits.length() == 12 && digits.startsWith("91")) {
            digits = digits.substring(2);
        } else if (digits.length() == 11 && digits.startsWith("0")) {
            digits = digits.substring(1);
        } else if (digits.length() == 11 && digits.startsWith("1")) {
            // US/Canada (11 digits starting with 1 -> 10 digits)
            digits = digits.substring(1);
        }

        // Must have at least 7 digits to be considered a viable phone number
        if (digits.length() < 7) {
            return null;
        }
        return digits;
    }

    /**
     * Normalizes a target job role for requisition-level matching.
     * Trims whitespace, converts to lowercase, and collapses consecutive spaces.
     */
    public static String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "general requisition";
        }
        String normalized = role.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
        return normalized.isEmpty() ? "general requisition" : normalized;
    }

    /**
     * Normalizes a candidate name: trims whitespace and collapses multi-spaces.
     */
    public static String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            return "Candidate";
        }
        return name.trim().replaceAll("\\s+", " ");
    }
}
