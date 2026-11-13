package com.smarthire.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;

import java.util.ArrayList;
import java.util.List;

/**
 * Spring Security OAuth2 Client Configuration:
 * Dynamically registers the Google OAuth2 Client using environment variables
 * GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
 * If credentials are not present at build/test time, initializes safely without crashing.
 */
@Configuration
public class OAuth2ClientConfig {

    @Value("${spring.security.oauth2.client.registration.google.client-id:${GOOGLE_CLIENT_ID:}}")
    private String googleClientId;

    @Value("${spring.security.oauth2.client.registration.google.client-secret:${GOOGLE_CLIENT_SECRET:}}")
    private String googleClientSecret;

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        List<ClientRegistration> registrations = new ArrayList<>();

        String clientId = googleClientId != null ? googleClientId.trim() : "";
        String clientSecret = googleClientSecret != null ? googleClientSecret.trim() : "";

        if (!clientId.isBlank() && !clientSecret.isBlank()) {
            registrations.add(
                    CommonOAuth2Provider.GOOGLE.getBuilder("google")
                            .clientId(clientId)
                            .clientSecret(clientSecret)
                            .scope("openid", "profile", "email")
                            .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                            .build()
            );
        } else {
            // Safe fallback registration for unit tests and local startup before env variables are populated
            registrations.add(
                    CommonOAuth2Provider.GOOGLE.getBuilder("google")
                            .clientId("placeholder-google-client-id")
                            .clientSecret("placeholder-google-client-secret")
                            .scope("openid", "profile", "email")
                            .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                            .build()
            );
        }

        return new InMemoryClientRegistrationRepository(registrations);
    }

}
