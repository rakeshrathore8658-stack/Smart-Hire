package com.smarthire.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateCompareRequestDTO {

    @NotNull(message = "Candidate IDs list cannot be null")
    @NotEmpty(message = "Please select at least 2 candidates for comparison.")
    @Size(min = 2, max = 3, message = "Candidate comparison strictly requires between 2 and 3 candidates.")
    private List<Long> candidateIds;
}
