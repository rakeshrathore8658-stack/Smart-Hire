package com.smarthire.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.smarthire.entity.NotificationEventType;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class HrNotificationPreferenceDTO {

    private NotificationEventType eventType;

    private String eventLabel;

    private String description;

    @Builder.Default
    private Boolean emailEnabled = true;

    @Builder.Default
    private Boolean inAppEnabled = true;
}
