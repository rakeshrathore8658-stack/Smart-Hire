package com.smarthire.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HrPersonalNotificationPreferencesRequestDTO {

    private List<HrPersonalNotificationPreferenceDTO> preferences;
}
