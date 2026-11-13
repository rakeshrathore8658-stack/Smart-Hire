package com.smarthire.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Ensures required database schema alterations (such as avatar_url TEXT
 * and google_id VARCHAR(255)) are applied automatically upon application startup.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseSchemaUpdater implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            log.info("Checking and upgrading database columns for Google OAuth compatibility...");
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT");
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN google_id TYPE VARCHAR(255)");
            log.info("Database schema check completed: avatar_url is TEXT, google_id is VARCHAR(255).");
        } catch (Exception e) {
            log.info("Database schema update note: {}", e.getMessage());
        }
    }
}
