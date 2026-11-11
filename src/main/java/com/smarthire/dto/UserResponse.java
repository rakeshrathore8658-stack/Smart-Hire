package com.smarthire.dto;

import java.time.LocalDateTime;

public class UserResponse {

    private Long id;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String role;
    private String careerRole;
    private String companyName;
    private LocalDateTime createdAt;

    public UserResponse() {
    }

    public UserResponse(
            Long id,
            String fullName,
            String email,
            String careerRole,
            LocalDateTime createdAt) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.careerRole = careerRole;
        this.createdAt = createdAt;
    }

    public UserResponse(
            Long id,
            String fullName,
            String email,
            String phoneNumber,
            String role,
            String careerRole,
            String companyName,
            LocalDateTime createdAt) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.role = role;
        this.careerRole = careerRole;
        this.companyName = companyName;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public String getRole() {
        return role;
    }

    public String getCareerRole() {
        return careerRole;
    }

    public String getCompanyName() {
        return companyName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
