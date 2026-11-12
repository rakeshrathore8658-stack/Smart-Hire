package com.smarthire.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_users_email",
                        columnNames = "email"
                )
        }
)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(name = "phone_number", length = 30)
    private String phoneNumber;

    // Store the encoded password, never the plain-text password.
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "role", nullable = false, length = 20)
    private String role = "USER";

    @Column(name = "google_id", length = 100)
    private String googleId;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "career_role", length = 50)
    private String careerRole;

    @Column(name = "company_name", length = 100)
    private String companyName;

    @Column(length = 150)
    private String location;

    @Column(length = 200)
    private String headline;

    @Column(name = "terms_accepted", nullable = false)
    private Boolean termsAccepted = true;

    @Column(name = "theme_preference", length = 20)
    private String themePreference = "light";

    @Column(name = "notif_resume_scan")
    private Boolean notifResumeScan = true;

    @Column(name = "notif_job_insights")
    private Boolean notifJobInsights = true;

    @Column(name = "notif_interview_updates")
    private Boolean notifInterviewUpdates = true;

    @Column(name = "tour_completed")
    private Boolean tourCompleted = false;

    @Column(name = "tour_skipped")
    private Boolean tourSkipped = false;

    @Column(name = "tour_seen")
    private Boolean tourSeen = false;

    @Column(name = "tour_last_step")
    private Integer tourLastStep = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public User() {
    }

    public User(String fullName, String email, String phoneNumber, String passwordHash, String role, String careerRole, String companyName) {
        this.fullName = fullName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.passwordHash = passwordHash;
        this.role = (role != null && !role.isBlank()) ? role.toUpperCase() : "USER";
        this.careerRole = careerRole;
        this.companyName = companyName;
        this.termsAccepted = true;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (role == null || role.isBlank()) {
            role = "USER";
        }
        if (careerRole == null || careerRole.isBlank()) {
            careerRole = "HR".equalsIgnoreCase(role) ? "HR / Recruiter" : "General";
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = (role != null && !role.isBlank()) ? role.toUpperCase() : "USER";
    }

    public String getCareerRole() {
        return careerRole;
    }

    public void setCareerRole(String careerRole) {
        this.careerRole = careerRole;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getHeadline() {
        return headline;
    }

    public void setHeadline(String headline) {
        this.headline = headline;
    }

    public boolean isTermsAccepted() {
        return Boolean.TRUE.equals(termsAccepted);
    }

    public void setTermsAccepted(Boolean termsAccepted) {
        this.termsAccepted = (termsAccepted != null) ? termsAccepted : true;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getThemePreference() {
        return (themePreference != null && !themePreference.isBlank()) ? themePreference : "light";
    }

    public void setThemePreference(String themePreference) {
        this.themePreference = ("dark".equalsIgnoreCase(themePreference)) ? "dark" : "light";
    }

    public boolean isNotifResumeScan() {
        return notifResumeScan == null || notifResumeScan;
    }

    public void setNotifResumeScan(Boolean notifResumeScan) {
        this.notifResumeScan = (notifResumeScan != null) ? notifResumeScan : false;
    }

    public boolean isNotifJobInsights() {
        return notifJobInsights == null || notifJobInsights;
    }

    public void setNotifJobInsights(Boolean notifJobInsights) {
        this.notifJobInsights = (notifJobInsights != null) ? notifJobInsights : false;
    }

    public boolean isNotifInterviewUpdates() {
        return notifInterviewUpdates == null || notifInterviewUpdates;
    }

    public void setNotifInterviewUpdates(Boolean notifInterviewUpdates) {
        this.notifInterviewUpdates = (notifInterviewUpdates != null) ? notifInterviewUpdates : false;
    }

    public boolean isTourCompleted() {
        return Boolean.TRUE.equals(tourCompleted);
    }

    public void setTourCompleted(Boolean tourCompleted) {
        this.tourCompleted = (tourCompleted != null) ? tourCompleted : false;
    }

    public boolean isTourSkipped() {
        return Boolean.TRUE.equals(tourSkipped);
    }

    public void setTourSkipped(Boolean tourSkipped) {
        this.tourSkipped = (tourSkipped != null) ? tourSkipped : false;
    }

    public boolean isTourSeen() {
        return Boolean.TRUE.equals(tourSeen) || Boolean.TRUE.equals(tourCompleted) || Boolean.TRUE.equals(tourSkipped);
    }

    public void setTourSeen(Boolean tourSeen) {
        this.tourSeen = (tourSeen != null) ? tourSeen : false;
    }

    public int getTourLastStep() {
        return (tourLastStep != null) ? tourLastStep : 0;
    }

    public void setTourLastStep(Integer tourLastStep) {
        this.tourLastStep = (tourLastStep != null) ? tourLastStep : 0;
    }

    public String getGoogleId() {
        return googleId;
    }

    public void setGoogleId(String googleId) {
        this.googleId = googleId;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }
}
