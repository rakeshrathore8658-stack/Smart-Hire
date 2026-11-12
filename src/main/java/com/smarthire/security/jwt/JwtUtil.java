package com.smarthire.security.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Standard RFC 7519 compliant HS256 JWT Token Generator and Validator.
 * Pure Java implementation using javax.crypto with zero external library conflicts.
 */
@Component
@Slf4j
public class JwtUtil {

    private static final String HMAC_ALGO = "HmacSHA256";
    private static final long EXPIRATION_MS = 30L * 24 * 60 * 60 * 1000; // 30 days validity

    @Value("${jwt.secret:${JWT_SECRET:SmartHireSecureJwtSecretKeyForOAuth2Authentication20261112}}")
    private String secretKey;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String generateToken(User user) {
        try {
            long now = System.currentTimeMillis();
            long exp = now + EXPIRATION_MS;

            // 1. Header
            Map<String, Object> header = new LinkedHashMap<>();
            header.put("alg", "HS256");
            header.put("typ", "JWT");
            String headerJson = objectMapper.writeValueAsString(header);
            String encodedHeader = Base64.getUrlEncoder().withoutPadding().encodeToString(headerJson.getBytes(StandardCharsets.UTF_8));

            // 2. Payload
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("sub", user.getEmail());
            payload.put("id", user.getId());
            payload.put("name", user.getFullName());
            payload.put("email", user.getEmail());
            payload.put("role", user.getRole() != null ? user.getRole().toUpperCase() : "USER");
            payload.put("iat", now / 1000);
            payload.put("exp", exp / 1000);
            String payloadJson = objectMapper.writeValueAsString(payload);
            String encodedPayload = Base64.getUrlEncoder().withoutPadding().encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));

            // 3. Signature
            String dataToSign = encodedHeader + "." + encodedPayload;
            String signature = sign(dataToSign, secretKey);

            return dataToSign + "." + signature;
        } catch (Exception e) {
            log.error("Failed to generate JWT: {}", e.getMessage());
            return "smarthire_token_" + user.getId() + "_" + System.currentTimeMillis();
        }
    }

    public boolean validateToken(String token) {
        try {
            if (token == null || token.isBlank()) return false;
            String[] parts = token.split("\\.");
            if (parts.length != 3) return false;

            String dataToSign = parts[0] + "." + parts[1];
            String expectedSignature = sign(dataToSign, secretKey);
            if (!expectedSignature.equals(parts[2])) {
                return false;
            }

            // Verify expiration
            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            Map<?, ?> payload = objectMapper.readValue(payloadJson, Map.class);
            if (payload.containsKey("exp")) {
                long exp = ((Number) payload.get("exp")).longValue();
                if (System.currentTimeMillis() / 1000 > exp) {
                    return false;
                }
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String extractEmail(String token) {
        try {
            if (token == null || token.isBlank()) return null;
            String clean = token.startsWith("Bearer ") ? token.substring(7) : token;
            String[] parts = clean.split("\\.");
            if (parts.length >= 2) {
                String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
                Map<?, ?> payload = objectMapper.readValue(payloadJson, Map.class);
                return (String) payload.get("email");
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String sign(String data, String key) throws Exception {
        Mac mac = Mac.getInstance(HMAC_ALGO);
        SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), HMAC_ALGO);
        mac.init(secretKeySpec);
        byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
    }
}
