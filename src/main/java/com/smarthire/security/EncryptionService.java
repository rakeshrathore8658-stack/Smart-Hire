package com.smarthire.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Enterprise-grade AES-256-GCM authenticated encryption service.
 * Used for encrypting and decrypting sensitive credentials at rest,
 * such as HR Gmail App Passwords.
 */
@Service
@Slf4j
public class EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int TAG_LENGTH_BIT = 128;
    private static final int IV_LENGTH_BYTE = 12;

    private final SecretKey secretKey;
    private final SecureRandom secureRandom;

    public EncryptionService(@Value("${app.encryption.secret:${APP_ENCRYPTION_SECRET:SmartHire_Production_Secret_Key_2026_Secure_GCM!}}") String secret) {
        this.secureRandom = new SecureRandom();
        try {
            // Derive a consistent 256-bit key using SHA-256
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = digest.digest(secret.getBytes(StandardCharsets.UTF_8));
            this.secretKey = new SecretKeySpec(keyBytes, "AES");
            log.info("EncryptionService initialized with AES-256-GCM authenticated encryption.");
        } catch (Exception e) {
            log.error("Failed to initialize EncryptionService key derivation", e);
            throw new IllegalStateException("Failed to initialize EncryptionService", e);
        }
    }

    /**
     * Encrypts plaintext string using AES-256-GCM with a fresh random IV.
     * Returns Base64-encoded string containing [IV (12 bytes) + CipherText + AuthTag (16 bytes)].
     */
    public String encrypt(String plainText) {
        if (plainText == null || plainText.isBlank()) {
            return plainText;
        }

        try {
            byte[] iv = new byte[IV_LENGTH_BYTE];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            // Prefix IV to cipherText
            ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + cipherText.length);
            byteBuffer.put(iv);
            byteBuffer.put(cipherText);

            return Base64.getEncoder().encodeToString(byteBuffer.array());
        } catch (Exception ex) {
            log.error("Error encrypting sensitive data: {}", ex.getMessage());
            throw new RuntimeException("Encryption failure", ex);
        }
    }

    /**
     * Decrypts Base64-encoded string containing [IV + CipherText + AuthTag] using AES-256-GCM.
     */
    public String decrypt(String encryptedText) {
        if (encryptedText == null || encryptedText.isBlank()) {
            return encryptedText;
        }

        try {
            byte[] decoded = Base64.getDecoder().decode(encryptedText.trim());
            if (decoded.length < IV_LENGTH_BYTE) {
                // If it's not valid GCM format, return as is (for legacy unencrypted data compatibility)
                return encryptedText;
            }

            ByteBuffer byteBuffer = ByteBuffer.wrap(decoded);
            byte[] iv = new byte[IV_LENGTH_BYTE];
            byteBuffer.get(iv);

            byte[] cipherText = new byte[byteBuffer.remaining()];
            byteBuffer.get(cipherText);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

            byte[] plainTextBytes = cipher.doFinal(cipherText);
            return new String(plainTextBytes, StandardCharsets.UTF_8);

        } catch (Exception ex) {
            log.warn("AES-GCM decryption failed (might be legacy unencrypted or corrupted text): {}", ex.getMessage());
            // Fallback for legacy plain text compatibility
            return encryptedText;
        }
    }
}
