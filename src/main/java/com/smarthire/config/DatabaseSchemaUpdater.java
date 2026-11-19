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
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role_switch_count INT DEFAULT 0");
            log.info("Database schema check completed: avatar_url is TEXT, google_id is VARCHAR(255), role_switch_count is INT.");
        } catch (Exception e) {
            log.info("Database schema update note (users): {}", e.getMessage());
        }

        try {
            log.info("Checking and upgrading schema for Cloudinary resume storage & dynamic screening forms...");
            jdbcTemplate.execute("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS resume_url VARCHAR(500)");
            jdbcTemplate.execute("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS resume_public_id VARCHAR(250)");

            jdbcTemplate.execute("ALTER TABLE resume_analyses ADD COLUMN IF NOT EXISTS resume_url VARCHAR(500)");
            jdbcTemplate.execute("ALTER TABLE resume_analyses ADD COLUMN IF NOT EXISTS resume_public_id VARCHAR(250)");
            jdbcTemplate.execute("ALTER TABLE resume_analyses ADD COLUMN IF NOT EXISTS recruiter_id BIGINT");
            jdbcTemplate.execute("ALTER TABLE resume_analyses ADD COLUMN IF NOT EXISTS job_id BIGINT");

            jdbcTemplate.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS screening_enabled BOOLEAN DEFAULT FALSE");
            jdbcTemplate.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ats_threshold INT DEFAULT 60");

            jdbcTemplate.execute("ALTER TABLE departments ADD COLUMN IF NOT EXISTS recruiter_id BIGINT");
            jdbcTemplate.execute("ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_system_default BOOLEAN DEFAULT FALSE");
            try {
                jdbcTemplate.execute("ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_key");
                jdbcTemplate.execute("ALTER TABLE departments DROP CONSTRAINT IF EXISTS uk_departments_name");
            } catch (Exception ignored) {}

            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS hr_deleted_departments (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "recruiter_id BIGINT NOT NULL, " +
                    "department_name VARCHAR(120) NOT NULL, " +
                    "deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
                    ")");

            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS job_questions (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "job_id BIGINT, " +
                    "question_text TEXT NOT NULL, " +
                    "question_type VARCHAR(32) NOT NULL, " +
                    "options_json TEXT, " +
                    "is_required BOOLEAN DEFAULT TRUE, " +
                    "order_index INT DEFAULT 0, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
                    ")");

            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS candidate_form_responses (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "application_id BIGINT NOT NULL, " +
                    "question_id BIGINT, " +
                    "answer_text TEXT, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
                    ")");

            // 1. HR Dynamic SMTP Email Settings
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS hr_email_settings (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "hr_user_id BIGINT NOT NULL, " +
                    "sender_email VARCHAR(255) NOT NULL, " +
                    "app_password VARCHAR(500) NOT NULL, " +
                    "sender_name VARCHAR(150), " +
                    "provider_type VARCHAR(50) DEFAULT 'GMAIL_SMTP', " +
                    "is_active BOOLEAN DEFAULT TRUE, " +
                    "is_verified BOOLEAN DEFAULT FALSE, " +
                    "last_tested_at TIMESTAMP, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "CONSTRAINT uq_hr_email_settings_user UNIQUE (hr_user_id)" +
                    ")");
            jdbcTemplate.execute("ALTER TABLE hr_email_settings ADD COLUMN IF NOT EXISTS provider_type VARCHAR(50) DEFAULT 'GMAIL_SMTP'");

            // 2. HR Candidate-Facing Notification Preferences
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS hr_notification_preferences (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "hr_user_id BIGINT NOT NULL, " +
                    "event_type VARCHAR(100) NOT NULL, " +
                    "email_enabled BOOLEAN NOT NULL DEFAULT TRUE, " +
                    "in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE, " +
                    "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, " +
                    "CONSTRAINT uq_hr_event UNIQUE (hr_user_id, event_type)" +
                    ")");

            // 3. HR Personal In-App & Email Notification Preferences
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS hr_personal_notification_preferences (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "hr_user_id BIGINT NOT NULL, " +
                    "event_type VARCHAR(100) NOT NULL, " +
                    "in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE, " +
                    "email_enabled BOOLEAN NOT NULL DEFAULT TRUE, " +
                    "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, " +
                    "CONSTRAINT uq_hr_personal_event UNIQUE (hr_user_id, event_type)" +
                    ")");

            // 4. Centralized Enterprise Notification Queue
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS notification_queue (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "event_id VARCHAR(120) NOT NULL, " +
                    "hr_user_id BIGINT NOT NULL, " +
                    "recipient_user_id BIGINT, " +
                    "recipient_email VARCHAR(255) NOT NULL, " +
                    "recipient_name VARCHAR(255), " +
                    "recipient_type VARCHAR(32) NOT NULL DEFAULT 'CANDIDATE', " +
                    "application_id BIGINT, " +
                    "job_id BIGINT, " +
                    "event_type VARCHAR(100) NOT NULL, " +
                    "channel VARCHAR(32) NOT NULL, " +
                    "subject VARCHAR(255), " +
                    "content TEXT, " +
                    "payload_json TEXT, " +
                    "status VARCHAR(32) NOT NULL DEFAULT 'PENDING', " +
                    "retry_count INT NOT NULL DEFAULT 0, " +
                    "max_retries INT NOT NULL DEFAULT 4, " +
                    "next_retry_at TIMESTAMP WITH TIME ZONE, " +
                    "error_message TEXT, " +
                    "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, " +
                    "processed_at TIMESTAMP WITH TIME ZONE, " +
                    "CONSTRAINT uq_queue_event_channel UNIQUE (event_id, channel)" +
                    ")");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_notif_queue_status_retry ON notification_queue(status, next_retry_at)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_notif_queue_hr_user ON notification_queue(hr_user_id)");

            // 5. Notification Delivery Audit Log
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS notification_delivery_logs (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "queue_id BIGINT, " +
                    "hr_user_id BIGINT, " +
                    "recipient_email VARCHAR(255), " +
                    "event_type VARCHAR(100), " +
                    "channel VARCHAR(32), " +
                    "status VARCHAR(32), " +
                    "attempt_number INT DEFAULT 1, " +
                    "details TEXT, " +
                    "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP" +
                    ")");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_notif_logs_hr ON notification_delivery_logs(hr_user_id, created_at)");

            // Keep notification_outbox for seamless legacy backwards compatibility
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS notification_outbox (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "event_id VARCHAR(100), " +
                    "hr_user_id BIGINT NOT NULL, " +
                    "recipient_user_id BIGINT, " +
                    "recipient_email VARCHAR(255), " +
                    "application_id BIGINT, " +
                    "event_type VARCHAR(100) NOT NULL, " +
                    "channel VARCHAR(32) NOT NULL, " +
                    "payload_json TEXT, " +
                    "delivery_status VARCHAR(32) NOT NULL DEFAULT 'PENDING', " +
                    "retry_count INT NOT NULL DEFAULT 0, " +
                    "next_retry_at TIMESTAMP WITH TIME ZONE, " +
                    "last_error TEXT, " +
                    "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, " +
                    "processed_at TIMESTAMP WITH TIME ZONE, " +
                    "CONSTRAINT uq_event_channel UNIQUE (event_id, channel)" +
                    ")");

            jdbcTemplate.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_user_id BIGINT");
            jdbcTemplate.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS hr_user_id BIGINT");
            jdbcTemplate.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS job_id BIGINT");
            jdbcTemplate.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS application_id BIGINT");
            jdbcTemplate.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_type VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP");

            log.info("Database schema check completed for Cloudinary, screening forms, HR SMTP, outbox and notification preferences.");
        } catch (Exception e) {
            log.info("Database schema check note (features): {}", e.getMessage());
        }
    }
}
