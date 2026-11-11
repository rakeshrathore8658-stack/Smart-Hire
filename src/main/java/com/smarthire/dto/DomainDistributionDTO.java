package com.smarthire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DomainDistributionDTO {
    private String domainName;
    private int candidatesCount;
    private double percentage;
    private String barClass;
}
