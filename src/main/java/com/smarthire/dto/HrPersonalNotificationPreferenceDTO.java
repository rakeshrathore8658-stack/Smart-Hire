package com.smarthire.dto;

import com.smarthire.entity.NotificationEventType;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HrPersonalNotificationPreferenceDTO {

    private NotificationEventType eventType;
    private String eventLabel;
    private String description;
    private Boolean emailEnabled;
    private Boolean inAppEnabled;
}
