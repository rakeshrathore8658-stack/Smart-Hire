package com.smarthire.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
@Slf4j
public class CloudinaryConfig {

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    @Bean
    public Cloudinary cloudinary() {
        String resolvedCloudName = (cloudName != null && !cloudName.isBlank()) ? cloudName.trim() : System.getenv("CLOUDINARY_CLOUD_NAME");
        String resolvedApiKey = (apiKey != null && !apiKey.isBlank()) ? apiKey.trim() : System.getenv("CLOUDINARY_API_KEY");
        String resolvedApiSecret = (apiSecret != null && !apiSecret.isBlank()) ? apiSecret.trim() : System.getenv("CLOUDINARY_API_SECRET");
        String resolvedUrl = System.getenv("CLOUDINARY_URL");

        if (resolvedUrl != null && !resolvedUrl.isBlank()) {
            try {
                log.info("Cloudinary client bean initialized successfully via CLOUDINARY_URL environment variable.");
                return new Cloudinary(resolvedUrl.trim());
            } catch (Exception ex) {
                log.warn("Failed to initialize Cloudinary via CLOUDINARY_URL: {}", ex.getMessage());
            }
        }

        if (resolvedCloudName == null || resolvedCloudName.isBlank() || resolvedApiKey == null || resolvedApiKey.isBlank()) {
            log.info("Cloudinary credentials not fully configured in environment. Cloudinary upload will operate in fallback mode.");
            return new Cloudinary();
        }

        Map<String, Object> config = new HashMap<>();
        config.put("cloud_name", resolvedCloudName.trim());
        config.put("api_key", resolvedApiKey.trim());
        config.put("api_secret", resolvedApiSecret != null ? resolvedApiSecret.trim() : "");
        config.put("secure", true);

        log.info("Cloudinary client bean initialized successfully for cloud_name: {}", resolvedCloudName.trim());
        return new Cloudinary(config);
    }
}
