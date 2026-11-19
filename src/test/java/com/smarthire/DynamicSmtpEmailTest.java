package com.smarthire;

import com.smarthire.security.EncryptionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class DynamicSmtpEmailTest {

    private static final String TEST_KEY = "smarthire-test-secret-key-32chrs";

    @Test
    @DisplayName("Should successfully encrypt and decrypt Google App Password with AES-256-GCM")
    void testAesGcmEncryptionDecryption() {
        EncryptionService service = new EncryptionService(TEST_KEY);
        String originalSecret = "abcd efgh ijkl mnop";

        String ciphertext = service.encrypt(originalSecret);
        assertNotNull(ciphertext);
        assertNotEquals(originalSecret, ciphertext);

        String decrypted = service.decrypt(ciphertext);
        assertEquals(originalSecret, decrypted);
    }

    @Test
    @DisplayName("Should generate unique ciphertext for same plaintext due to random 12-byte IV")
    void testUniqueIvPerEncryption() {
        EncryptionService service = new EncryptionService(TEST_KEY);
        String plaintext = "my-secret-gmail-app-password-1234";

        String cipher1 = service.encrypt(plaintext);
        String cipher2 = service.encrypt(plaintext);

        assertNotEquals(cipher1, cipher2);
        assertEquals(plaintext, service.decrypt(cipher1));
        assertEquals(plaintext, service.decrypt(cipher2));
    }

    @Test
    @DisplayName("Should handle null and empty inputs safely")
    void testNullAndEmptyHandling() {
        EncryptionService service = new EncryptionService(TEST_KEY);

        assertNull(service.encrypt(null));
        assertEquals("", service.encrypt(""));
        assertNull(service.decrypt(null));
        assertEquals("", service.decrypt(""));
    }

    @Test
    @DisplayName("Should detect tampering and prevent decryption of altered ciphertext")
    void testTamperedCiphertextFails() {
        EncryptionService service = new EncryptionService(TEST_KEY);
        String plaintext = "sensitive-token";
        String ciphertext = service.encrypt(plaintext);

        // Tamper with one character
        char[] chars = ciphertext.toCharArray();
        chars[chars.length - 2] = (chars[chars.length - 2] == 'A') ? 'B' : 'A';
        String tampered = new String(chars);

        // AES-GCM authentication tag mismatch prevents decrypting back to plaintext
        String decrypted = service.decrypt(tampered);
        assertNotEquals(plaintext, decrypted);
    }
}
