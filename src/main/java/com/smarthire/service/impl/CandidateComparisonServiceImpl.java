package com.smarthire.service.impl;

import com.smarthire.dto.*;
import com.smarthire.entity.Resume;
import com.smarthire.entity.ResumeAnalysis;
import com.smarthire.repository.ResumeAnalysisRepository;
import com.smarthire.service.CandidateComparisonService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CandidateComparisonServiceImpl implements CandidateComparisonService {

    private final ResumeAnalysisRepository resumeAnalysisRepository;

    @Override
    @Transactional(readOnly = true)
    public CandidateCompareResponseDTO compareCandidates(CandidateCompareRequestDTO request) {
        if (request == null || request.getCandidateIds() == null) {
            throw new IllegalArgumentException("Comparison request or candidate IDs cannot be empty.");
        }
        return compareCandidates(request.getCandidateIds());
    }

    @Override
    @Transactional(readOnly = true)
    public CandidateCompareResponseDTO compareCandidates(List<Long> candidateIds) {
        if (candidateIds == null || candidateIds.isEmpty()) {
            throw new IllegalArgumentException("Please select at least 2 candidates for comparison.");
        }

        List<Long> cleanIds = candidateIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (cleanIds.size() < 2) {
            throw new IllegalArgumentException("At least 2 distinct candidates must be selected to generate a side-by-side comparison.");
        }

        if (cleanIds.size() > 3) {
            throw new IllegalArgumentException("Candidate comparison supports a maximum of 3 candidates simultaneously.");
        }

        log.info("Fetching and comparing candidate records for IDs: {}", cleanIds);
        List<ResumeAnalysis> records = resumeAnalysisRepository.findAllById(cleanIds);

        if (records.size() < cleanIds.size()) {
            Set<Long> foundIds = records.stream().map(ResumeAnalysis::getId).collect(Collectors.toSet());
            List<Long> missingIds = cleanIds.stream().filter(id -> !foundIds.contains(id)).toList();
            log.warn("Some candidate records were not found: missing={}", missingIds);
            if (records.size() < 2) {
                throw new IllegalArgumentException("Could not find sufficient candidate records in the database (missing IDs: " + missingIds + ").");
            }
        }

        // Maintain the exact ordering requested by caller
        Map<Long, ResumeAnalysis> recordMap = records.stream()
                .collect(Collectors.toMap(ResumeAnalysis::getId, r -> r));
        List<ResumeAnalysis> orderedRecords = cleanIds.stream()
                .map(recordMap::get)
                .filter(Objects::nonNull)
                .toList();

        // Build individual candidate comparison items
        List<CandidateCompareItemDTO> candidateItems = new ArrayList<>();
        String primaryTargetRole = null;

        for (ResumeAnalysis ra : orderedRecords) {
            if (primaryTargetRole == null && ra.getTargetJobRole() != null) {
                primaryTargetRole = ra.getTargetJobRole();
            }
            candidateItems.add(mapToCompareItem(ra));
        }

        if (primaryTargetRole == null) {
            primaryTargetRole = "General Requisition";
        }

        // 1. Identify Highest Score Candidate
        int maxScore = -1;
        Long highestScoreId = null;
        for (CandidateCompareItemDTO item : candidateItems) {
            int sc = item.getOverallScore() != null ? item.getOverallScore() : 0;
            if (sc > maxScore) {
                maxScore = sc;
                highestScoreId = item.getId();
            }
        }
        for (CandidateCompareItemDTO item : candidateItems) {
            item.setIsHighestScore(Objects.equals(item.getId(), highestScoreId));
        }

        // 2. Compute Common Skills & Unique Skills
        computeSkillsMatrix(candidateItems);

        // 3. Generate Smart Objective Comparative Highlights
        List<String> summaryHighlights = generateComparisonHighlights(candidateItems, primaryTargetRole);

        // 4. Assemble Comparison Metrics
        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("candidateCount", candidateItems.size());
        metrics.put("targetRequisition", primaryTargetRole);
        metrics.put("scoreSpread", computeScoreSpread(candidateItems));
        metrics.put("averageScore", computeAverageScore(candidateItems));

        return CandidateCompareResponseDTO.builder()
                .success(true)
                .message("Candidate comparison data retrieved successfully.")
                .totalCompared(candidateItems.size())
                .targetJobRole(primaryTargetRole)
                .highestScoreCandidateId(highestScoreId)
                .highestScore(maxScore >= 0 ? maxScore : 0)
                .candidates(candidateItems)
                .commonSkills(extractCommonSkillsList(candidateItems))
                .allSkills(extractAllUniqueSkills(candidateItems))
                .summaryHighlights(summaryHighlights)
                .comparisonMetrics(metrics)
                .build();
    }

    private CandidateCompareItemDTO mapToCompareItem(ResumeAnalysis ra) {
        CandidateInfoDTO info = ra.getCandidateInfo();
        ATSAnalysisDTO ats = ra.getAnalysisDTO();
        Resume resume = ra.getResume();

        List<String> techSkills = (info != null && info.getTechnicalSkills() != null && !info.getTechnicalSkills().isEmpty())
                ? new ArrayList<>(info.getTechnicalSkills())
                : new ArrayList<>(ra.getMatchedSkillsList());

        List<String> progLangs = (info != null && info.getProgrammingLanguages() != null)
                ? new ArrayList<>(info.getProgrammingLanguages())
                : Collections.emptyList();

        List<String> frameworks = (info != null && info.getFrameworks() != null)
                ? new ArrayList<>(info.getFrameworks())
                : Collections.emptyList();

        List<String> databases = (info != null && info.getDatabases() != null)
                ? new ArrayList<>(info.getDatabases())
                : Collections.emptyList();

        List<String> tools = (info != null && info.getTools() != null)
                ? new ArrayList<>(info.getTools())
                : Collections.emptyList();

        Map<String, Integer> categoryScores = new LinkedHashMap<>();
        categoryScores.put("Skills", ra.getSkillsScore());
        categoryScores.put("Experience", ra.getExperienceScore());
        categoryScores.put("Projects", ra.getProjectsScore());
        categoryScores.put("Education", ra.getEducationScore());
        categoryScores.put("Keywords", ra.getKeywordScore());
        categoryScores.put("Formatting", ra.getFormattingScore());

        String expStr = ra.getCandidateExperience();
        Double expYears = parseExperienceYears(expStr);

        return CandidateCompareItemDTO.builder()
                .id(ra.getId())
                .resumeId(resume != null ? resume.getId() : null)
                .candidateName(ra.getCandidateName())
                .candidateInitials(ra.getCandidateInitials())
                .candidateEmail(ra.getCandidateEmail())
                .candidatePhone(ra.getCandidatePhone())
                .candidateLocation(ra.getCandidateLocation())
                .candidateSummary(ra.getCandidateSummary())
                .targetJobRole(ra.getTargetJobRole() != null ? ra.getTargetJobRole() : "Candidate")
                .overallScore(ra.getOverallScore())
                .atsScore(ra.getOverallScore())
                .matchLevel(ats != null && ats.getMatchLevel() != null ? ats.getMatchLevel() : (ra.getOverallScore() >= 75 ? "Strong Match" : "Moderate Match"))
                .isHighestScore(false)
                .skillsScore(ra.getSkillsScore())
                .experienceScore(ra.getExperienceScore())
                .projectsScore(ra.getProjectsScore())
                .educationScore(ra.getEducationScore())
                .formattingScore(ra.getFormattingScore())
                .keywordScore(ra.getKeywordScore())
                .contentQualityScore(ra.getContentQualityScore())
                .categoryScores(categoryScores)
                .totalExperience(expStr)
                .experienceYears(expYears)
                .technicalSkills(techSkills)
                .programmingLanguages(progLangs)
                .frameworks(frameworks)
                .databases(databases)
                .tools(tools)
                .matchedSkills(ra.getMatchedSkillsList())
                .missingSkills(ra.getMissingSkillsList())
                .uniqueSkills(new ArrayList<>())
                .workExperience(ra.getWorkExperienceList())
                .companyNames(info != null && info.getCompanyNames() != null ? info.getCompanyNames() : Collections.emptyList())
                .projects(ra.getProjectsList())
                .education(ra.getEducationList())
                .certifications(ra.getCertificationsList())
                .achievements(info != null && info.getAchievements() != null ? info.getAchievements() : Collections.emptyList())
                .resumeFileName(resume != null ? resume.getFileName() : ra.getResumeFileName())
                .resumeFileType(resume != null && resume.getFileType() != null ? resume.getFileType() : "application/pdf")
                .resumeFileSize(resume != null ? resume.getFileSize() : null)
                .resumeUploadDate(ra.getFormattedDate())
                .stage(ra.getStage() != null ? ra.getStage() : "Under Review")
                .displayStage(ra.getDisplayStage())
                .shortlisted(ra.isShortlisted())
                .status(ra.getStatus())
                .interviewStatus(ra.getInterviewStatus() != null ? ra.getInterviewStatus() : (ra.getInterviewDate() != null ? "SCHEDULED" : "NOT_SCHEDULED"))
                .interviewDate(ra.getInterviewDate() != null ? ra.getInterviewDate().toString() : null)
                .formattedInterviewDate(ra.getFormattedInterviewDate())
                .interviewRound(ra.getInterviewRound())
                .interviewerName(ra.getInterviewerName())
                .interviewType(ra.getInterviewType())
                .meetingLink(ra.getMeetingLink())
                .interviewLocation(ra.getInterviewLocation())
                .techRating(ra.getTechRating())
                .commRating(ra.getCommRating())
                .problemSolvingRating(ra.getProblemSolvingRating())
                .feedbackNotes(ra.getFeedbackNotes())
                .feedbackScore(ra.getFeedbackScore())
                .strengths(ra.getStrengthsList())
                .recommendations(ra.getRecommendationsList())
                .build();
    }

    private void computeSkillsMatrix(List<CandidateCompareItemDTO> candidates) {
        if (candidates.size() < 2) return;

        // Collect all skills per candidate (case-insensitive keys with original presentation)
        List<Map<String, String>> candidateSkillMaps = new ArrayList<>();
        for (CandidateCompareItemDTO c : candidates) {
            Map<String, String> map = new LinkedHashMap<>();
            List<String> combined = new ArrayList<>();
            if (c.getTechnicalSkills() != null) combined.addAll(c.getTechnicalSkills());
            if (c.getProgrammingLanguages() != null) combined.addAll(c.getProgrammingLanguages());
            if (c.getFrameworks() != null) combined.addAll(c.getFrameworks());
            if (c.getDatabases() != null) combined.addAll(c.getDatabases());
            if (c.getTools() != null) combined.addAll(c.getTools());
            if (c.getMatchedSkills() != null) combined.addAll(c.getMatchedSkills());

            for (String s : combined) {
                if (s != null && !s.trim().isBlank()) {
                    map.put(s.trim().toLowerCase(), s.trim());
                }
            }
            candidateSkillMaps.add(map);
        }

        // Compute unique skills for each candidate (skills this candidate has that NO other candidate has)
        for (int i = 0; i < candidates.size(); i++) {
            Map<String, String> thisMap = candidateSkillMaps.get(i);
            Set<String> othersSkillKeys = new HashSet<>();
            for (int j = 0; j < candidates.size(); j++) {
                if (i != j) {
                    othersSkillKeys.addAll(candidateSkillMaps.get(j).keySet());
                }
            }

            List<String> unique = new ArrayList<>();
            for (Map.Entry<String, String> entry : thisMap.entrySet()) {
                if (!othersSkillKeys.contains(entry.getKey())) {
                    unique.add(entry.getValue());
                }
            }
            candidates.get(i).setUniqueSkills(unique);
        }
    }

    private List<String> extractCommonSkillsList(List<CandidateCompareItemDTO> candidates) {
        if (candidates.isEmpty()) return Collections.emptyList();
        Set<String> commonKeys = null;
        Map<String, String> displayMap = new LinkedHashMap<>();

        for (CandidateCompareItemDTO c : candidates) {
            Set<String> currentKeys = new HashSet<>();
            List<String> combined = new ArrayList<>();
            if (c.getTechnicalSkills() != null) combined.addAll(c.getTechnicalSkills());
            if (c.getMatchedSkills() != null) combined.addAll(c.getMatchedSkills());

            for (String s : combined) {
                if (s != null && !s.trim().isBlank()) {
                    String key = s.trim().toLowerCase();
                    currentKeys.add(key);
                    displayMap.putIfAbsent(key, s.trim());
                }
            }

            if (commonKeys == null) {
                commonKeys = new HashSet<>(currentKeys);
            } else {
                commonKeys.retainAll(currentKeys);
            }
        }

        if (commonKeys == null || commonKeys.isEmpty()) {
            return Collections.emptyList();
        }

        return commonKeys.stream()
                .map(displayMap::get)
                .filter(Objects::nonNull)
                .sorted()
                .toList();
    }

    private List<String> extractAllUniqueSkills(List<CandidateCompareItemDTO> candidates) {
        Set<String> all = new LinkedHashSet<>();
        for (CandidateCompareItemDTO c : candidates) {
            if (c.getTechnicalSkills() != null) all.addAll(c.getTechnicalSkills());
            if (c.getMatchedSkills() != null) all.addAll(c.getMatchedSkills());
        }
        return new ArrayList<>(all);
    }

    private List<String> generateComparisonHighlights(List<CandidateCompareItemDTO> candidates, String targetRole) {
        List<String> highlights = new ArrayList<>();
        if (candidates.isEmpty()) return highlights;

        // 1. Top ATS Score highlight
        CandidateCompareItemDTO topScore = candidates.stream()
                .max(Comparator.comparingInt(c -> c.getOverallScore() != null ? c.getOverallScore() : 0))
                .orElse(candidates.get(0));

        highlights.add(String.format("%s holds the highest overall ATS compatibility score at %d%% for %s.",
                topScore.getCandidateName(), topScore.getOverallScore(), targetRole));

        // 2. Common competencies highlight
        List<String> common = extractCommonSkillsList(candidates);
        if (!common.isEmpty()) {
            String sample = common.stream().limit(4).collect(Collectors.joining(", "));
            highlights.add(String.format("%d common competencies evidenced across all compared candidates (%s).",
                    common.size(), sample));
        }

        // 3. Experience comparison highlight
        candidates.stream()
                .max(Comparator.comparingDouble(c -> c.getExperienceYears() != null ? c.getExperienceYears() : 0.0))
                .ifPresent(topExp -> {
                    if (topExp.getExperienceYears() != null && topExp.getExperienceYears() > 0) {
                        highlights.add(String.format("%s offers the most seasoned industry tenure (%s).",
                                topExp.getCandidateName(), topExp.getTotalExperience()));
                    }
                });

        // 4. Unique strengths / skills highlight
        for (CandidateCompareItemDTO c : candidates) {
            if (c.getUniqueSkills() != null && !c.getUniqueSkills().isEmpty()) {
                String uniqueSample = c.getUniqueSkills().stream().limit(3).collect(Collectors.joining(", "));
                highlights.add(String.format("%s brings exclusive expertise in: %s.",
                        c.getCandidateName(), uniqueSample));
            }
        }

        return highlights;
    }

    private Double parseExperienceYears(String expStr) {
        if (expStr == null || expStr.isBlank()) return 0.0;
        try {
            Pattern p = Pattern.compile("(\\d+(?:\\.\\d+)?)");
            Matcher m = p.matcher(expStr);
            if (m.find()) {
                return Double.parseDouble(m.group(1));
            }
        } catch (Exception ignored) {}
        return 1.0;
    }

    private int computeScoreSpread(List<CandidateCompareItemDTO> candidates) {
        int min = 100, max = 0;
        for (CandidateCompareItemDTO c : candidates) {
            int score = c.getOverallScore() != null ? c.getOverallScore() : 0;
            if (score < min) min = score;
            if (score > max) max = score;
        }
        return Math.max(0, max - min);
    }

    private int computeAverageScore(List<CandidateCompareItemDTO> candidates) {
        if (candidates.isEmpty()) return 0;
        int sum = 0;
        for (CandidateCompareItemDTO c : candidates) {
            sum += (c.getOverallScore() != null ? c.getOverallScore() : 0);
        }
        return Math.round((float) sum / candidates.size());
    }
}
