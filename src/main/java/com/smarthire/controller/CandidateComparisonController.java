package com.smarthire.controller;

import com.smarthire.dto.CandidateCompareResponseDTO;
import com.smarthire.service.CandidateComparisonService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/candidates")
@RequiredArgsConstructor
@Slf4j
public class CandidateComparisonController {

    private final CandidateComparisonService candidateComparisonService;

    /**
     * Side-by-side Candidate Comparison API.
     * Accepts 2 or 3 candidate IDs in JSON payload:
     * { "candidateIds": [14, 16] }
     */
    @PostMapping(value = {"/compare", "/compare-candidates"}, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> compareCandidates(@RequestBody(required = false) Map<String, Object> body) {
        if (body == null || body.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Please select 2 or 3 candidates for comparison."
            ));
        }

        List<Long> candidateIds = new ArrayList<>();

        if (body.containsKey("candidateIds") && body.get("candidateIds") instanceof List<?> rawList) {
            for (Object item : rawList) {
                if (item instanceof Number num) {
                    candidateIds.add(num.longValue());
                } else if (item instanceof String str && !str.isBlank()) {
                    try {
                        candidateIds.add(Long.parseLong(str.trim()));
                    } catch (NumberFormatException ignored) {}
                }
            }
        }

        if (candidateIds.size() < 2) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Please select at least 2 candidates to generate comparison."
            ));
        }

        if (candidateIds.size() > 3) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Comparison supports a maximum of 3 candidates simultaneously."
            ));
        }

        try {
            CandidateCompareResponseDTO response = candidateComparisonService.compareCandidates(candidateIds);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            log.warn("Validation error during candidate comparison: {}", ex.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", ex.getMessage()
            ));
        } catch (Exception ex) {
            log.error("Internal error during candidate comparison", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "An unexpected error occurred while generating candidate comparison: " + ex.getMessage()
            ));
        }
    }

    /**
     * GET endpoint fallback: /api/candidates/compare?ids=14,16
     */
    @GetMapping(value = "/compare", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> compareCandidatesGet(@RequestParam("ids") List<Long> ids) {
        if (ids == null || ids.size() < 2) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Please provide at least 2 candidate IDs for comparison."
            ));
        }
        if (ids.size() > 3) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Maximum 3 candidates can be compared at one time."
            ));
        }
        try {
            CandidateCompareResponseDTO response = candidateComparisonService.compareCandidates(ids);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", ex.getMessage()));
        }
    }
}
