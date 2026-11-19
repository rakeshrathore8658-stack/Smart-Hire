package com.smarthire.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class HrEmailSettingDTO {

    private Long id;
    private Long hrUserId;
    private String senderEmail;

    /**
     * Write-only: Jackson will deserialize this on incoming POST/PUT requests,
     * but will NEVER serialize or return it in API responses.
     */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String appPassword;

    private String senderName;
    private Boolean isVerified;
    private LocalDateTime lastTestedAt;

    @Builder.Default
    private Boolean configured = false;

    @Builder.Default
    private Boolean active = false;

    public String getMaskedPassword() {
        return Boolean.TRUE.equals(configured) ? "••••••••••••••••" : "";
    }
}
