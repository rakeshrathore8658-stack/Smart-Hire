package com.smarthire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequisitionSummaryDTO {
    private Long jobId;
    private String title;
    private String department;
    private int totalApplications;
    private int shortlisted;
    private int interviews;
    private int hired;
    private int avgMatchScore;
    private int progressPercentage;
    private String barClass;
}
