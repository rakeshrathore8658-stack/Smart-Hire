package com.smarthire.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class HrNotificationPreferencesRequestDTO {

    private List<HrNotificationPreferenceDTO> preferences;
}
