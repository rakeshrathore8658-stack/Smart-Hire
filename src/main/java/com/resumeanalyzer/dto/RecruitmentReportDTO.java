package com.resumeanalyzer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecruitmentReportDTO {
    private int totalResumesScreened;
    private int newResumesThisMonth;
    private double shortlistConversionRate;
    private int shortlistedCount;
    private double interviewToOfferRate;
    private int offersCount;
    private int interviewsCount;
    private int avgTimeToHireDays;
    private String timeToHireSubtext;

    // Funnel metrics
    private int funnelApplied;
    private double funnelAppliedPct;
    private int funnel70Plus;
    private double funnel70PlusPct;
    private int funnelShortlisted;
    private double funnelShortlistedPct;
    private int funnelInterviews;
    private double funnelInterviewsPct;
    private int funnelOffers;
    private double funnelOffersPct;
    private int hiredCount;
    private int funnelHired;
    private double funnelHiredPct;

    // Breakdown tables & lists
    private List<RequisitionSummaryDTO> requisitionSummaries;
    private List<RequisitionSummaryDTO> applicantsByVacancy;
    private List<DomainDistributionDTO> domainDistribution;
}
