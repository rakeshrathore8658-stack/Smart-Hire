package com.resumeanalyzer.service;

import com.resumeanalyzer.dto.CandidateCompareRequestDTO;
import com.resumeanalyzer.dto.CandidateCompareResponseDTO;

import java.util.List;

public interface CandidateComparisonService {

    /**
     * Compare 2 to 3 candidate profiles side by side based on actual database evaluations.
     *
     * @param request Contains candidateIds list (size between 2 and 3)
     * @return Complete structured comparison DTO with category scores, skills matrix, and metrics.
     */
    CandidateCompareResponseDTO compareCandidates(CandidateCompareRequestDTO request);

    /**
     * Overload for direct candidate ID list invocation.
     */
    CandidateCompareResponseDTO compareCandidates(List<Long> candidateIds);
}
