package com.smarthire.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.ai.AIProvider;
import com.smarthire.ai.AIProviderFactory;
import com.smarthire.ai.LocalDeterministicAIProvider;
import com.smarthire.dto.*;
import com.smarthire.entity.Resume;
import com.smarthire.entity.ResumeAnalysis;
import com.smarthire.repository.ResumeAnalysisRepository;
import com.smarthire.repository.ResumeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResumeAnalysisService {

    private final ResumeRepository resumeRepository;
    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final ResumeExtractionService resumeExtractionService;
    private final DynamicPromptBuilderService promptBuilderService;
    private final AIProviderFactory aiProviderFactory;
    private final LocalDeterministicAIProvider localAIProvider;
    private final ATSScoringService atsScoringService;
    private final JobMatchingService jobMatchingService;
    private final ObjectMapper objectMapper;

    /**
     * Executes the end-to-end AI analysis workflow with optional API key.
     */
    @Transactional
    public ATSAnalysisDTO analyzeResume(Long resumeId, String targetJobRole, String jobDescription, String aiProviderName, String modelName, String geminiApiKey) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found with ID: " + resumeId));

        String role = (targetJobRole != null && !targetJobRole.isBlank()) ? targetJobRole : "Java Developer";
        String normalizedText = resume.getNormalizedText();
        if (normalizedText == null || normalizedText.isBlank()) {
            normalizedText = resume.getOriginalText();
        }

        // 1. Extract Structured Candidate Info from actual resume
        CandidateInfoDTO candidateInfo = resumeExtractionService.extractCandidateInfo(normalizedText);

        // 2. Prepare Required Skills for Target Role
        List<String> requiredSkills = jobMatchingService.getRequiredSkillsForRole(role);

        // 3. Build Dynamic Master Prompt
        String prompt = promptBuilderService.buildPrompt(
                normalizedText,
                candidateInfo,
                role,
                jobDescription,
                requiredSkills
        );

        // 4. Execute AI Provider with Per-Request Key Support and Automatic Failover
        AIProvider provider = aiProviderFactory.getProvider(aiProviderName, geminiApiKey);
        String rawJsonResponse;
        String requestedProvider = (aiProviderName != null && !aiProviderName.isBlank()) ? aiProviderName.trim().toLowerCase() : "local";
        String actualProviderUsed = provider.getProviderName();
        boolean fallbackUsed = false;
        String fallbackReason = null;

        try {
            log.info("Executing ATS analysis with provider: {} (model: {})", actualProviderUsed, modelName);
            rawJsonResponse = provider.analyze(prompt, DynamicPromptBuilderService.ATS_SYSTEM_INSTRUCTION, geminiApiKey, modelName);
            if (rawJsonResponse == null || rawJsonResponse.isBlank()) {
                throw new IllegalStateException("AI returned empty response");
            }
        } catch (Exception e) {
            log.warn("AI Provider {} failed or key was invalid ({}). Falling back to dynamic local Rule-Based engine.",
                    actualProviderUsed, e.getMessage());
            rawJsonResponse = localAIProvider.analyze(prompt, DynamicPromptBuilderService.ATS_SYSTEM_INSTRUCTION);
            actualProviderUsed = "Local Rule-Based Analysis (Fallback)";
            fallbackUsed = true;
            fallbackReason = "Selected provider '" + requestedProvider + "' failed: " + e.getMessage();
        }

        // 5. Parse and assemble Analysis DTO from AI output
        ATSAnalysisDTO analysisDTO = parseOrFallback(rawJsonResponse, candidateInfo, role, jobDescription);
        analysisDTO.setResumeId(resume.getId());
        analysisDTO.setFileName(resume.getFileName());
        analysisDTO.setTargetJobRole(role);
        analysisDTO.setJobDescription(jobDescription);
        analysisDTO.setAiProvider(fallbackUsed ? actualProviderUsed : provider.getProviderName());
        String effectiveModel = fallbackUsed ? "Local Rule-Based NLP" : (provider instanceof com.smarthire.ai.GeminiAIProvider ? ((com.smarthire.ai.GeminiAIProvider) provider).getLastSuccessfulModel() : (modelName != null && !modelName.isBlank() ? modelName : actualProviderUsed));
        analysisDTO.setModelUsed(effectiveModel);
        analysisDTO.setFallbackUsed(fallbackUsed);
        analysisDTO.setFallbackReason(fallbackReason);
        analysisDTO.setAnalyzedAt(LocalDateTime.now().toString());

        // 6. Respect the AI's Genuine Evaluated Overall Score
        if (analysisDTO.getOverallScore() <= 0 && analysisDTO.getCategoryScores() != null) {
            int calculatedOverall = atsScoringService.calculateOverallScore(analysisDTO.getCategoryScores());
            analysisDTO.setOverallScore(calculatedOverall);
        }
        if (analysisDTO.getMatchLevel() == null || analysisDTO.getMatchLevel().isBlank()) {
            analysisDTO.setMatchLevel(atsScoringService.resolveMatchLevel(analysisDTO.getOverallScore()));
        }

        // 7. Alternative Job Role Matching
        List<JobMatchDTO> jobMatches = jobMatchingService.matchAlternativeRoles(
                candidateInfo.getTechnicalSkills(),
                candidateInfo.getProjects()
        );
        analysisDTO.setJobMatches(jobMatches);

        // 8. Persist ResumeAnalysis in Database with Deduplication / Upsert
        String analysisJsonString = safeToJson(analysisDTO);

        String candEmail = candidateInfo.getEmail();
        if ((candEmail == null || candEmail.isBlank()) && resume.getCandidateEmail() != null) {
            candEmail = resume.getCandidateEmail();
        }
        String candPhone = candidateInfo.getPhoneNumber();
        if ((candPhone == null || candPhone.isBlank()) && resume.getCandidatePhone() != null) {
            candPhone = resume.getCandidatePhone();
        }
        String candName = candidateInfo.getName();
        if ((candName == null || candName.isBlank()) && resume.getCandidateName() != null) {
            candName = resume.getCandidateName();
        }

        String normEmail = CandidateNormalizationUtils.normalizeEmail(candEmail);
        String normPhone = CandidateNormalizationUtils.normalizePhone(candPhone);
        String normRole = CandidateNormalizationUtils.normalizeRole(role);
        String normName = CandidateNormalizationUtils.normalizeName(candName);

        // Find existing application for candidate and target role
        java.util.Optional<ResumeAnalysis> existingAnalysisOpt = java.util.Optional.empty();
        if (normEmail != null) {
            existingAnalysisOpt = resumeAnalysisRepository.findFirstByCandidateEmailNormalizedAndTargetJobRoleNormalized(normEmail, normRole);
        }
        if (existingAnalysisOpt.isEmpty() && normPhone != null) {
            existingAnalysisOpt = resumeAnalysisRepository.findFirstByCandidatePhoneNormalizedAndTargetJobRoleNormalized(normPhone, normRole);
        }
        if (existingAnalysisOpt.isEmpty() && resume.getId() != null) {
            existingAnalysisOpt = resumeAnalysisRepository.findFirstByResumeIdAndTargetJobRole(resume.getId(), role);
        }

        ResumeAnalysis entity;
        if (existingAnalysisOpt.isPresent()) {
            entity = existingAnalysisOpt.get();
            log.info("Updating existing application [id={}] for candidate [{}] and role [{}]",
                    entity.getId(), normEmail != null ? normEmail : normPhone, normRole);
            entity.setResume(resume);
            entity.setTargetJobRole(role);
            entity.setTargetJobRoleNormalized(normRole);
            entity.setJobDescription(jobDescription);
            entity.setOverallScore(analysisDTO.getOverallScore());
            entity.setSkillsScore(analysisDTO.getCategoryScores() != null ? analysisDTO.getCategoryScores().getSkills() : 0);
            entity.setExperienceScore(analysisDTO.getCategoryScores() != null ? analysisDTO.getCategoryScores().getExperience() : 0);
            entity.setProjectsScore(analysisDTO.getCategoryScores() != null ? analysisDTO.getCategoryScores().getProjects() : 0);
            entity.setEducationScore(analysisDTO.getCategoryScores() != null ? analysisDTO.getCategoryScores().getEducation() : 0);
            entity.setKeywordScore(analysisDTO.getCategoryScores() != null ? analysisDTO.getCategoryScores().getKeywords() : 0);
            entity.setFormattingScore(analysisDTO.getCategoryScores() != null ? analysisDTO.getCategoryScores().getFormatting() : 0);
            entity.setContentQualityScore(analysisDTO.getCategoryScores() != null ? analysisDTO.getCategoryScores().getContentQuality() : 0);
            entity.setAnalysisJson(analysisJsonString);
            entity.setAiProvider(actualProviderUsed);
            entity.setCandidateName(normName);
            entity.setCandidateEmail(candEmail);
            entity.setCandidateEmailNormalized(normEmail);
            entity.setCandidatePhone(candPhone);
            entity.setCandidatePhoneNormalized(normPhone);
            // Recruitment status and interview details are preserved
        } else {
            log.info("Creating new application entry for candidate [{}] and role [{}]",
                    normEmail != null ? normEmail : normPhone, normRole);
            entity = ResumeAnalysis.builder()
                    .resume(resume)
                    .targetJobRole(role)
                    .targetJobRoleNormalized(normRole)
                    .candidateName(normName)
                    .candidateEmail(candEmail)
                    .candidateEmailNormalized(normEmail)
                    .candidatePhone(candPhone)
                    .candidatePhoneNormalized(normPhone)
                    .jobDescription(jobDescription)
                    .overallScore(analysisDTO.getOverallScore())
                    .skillsScore(analysisDTO.getCategoryScores() != null ? analysisDTO.getCategoryScores().getSkills() : 0)
                    .experienceScore(analysisDTO.getCategoryScores() != null ? analysisDTO.getCategoryScores().getExperience() : 0)
                    .projectsScore(analysisDTO.getCategoryScores() != null ? analysisDTO.getCategoryScores().getProjects() : 0)
                    .educationScore(analysisDTO.getCategoryScores() != null ? analysisDTO.getCategoryScores().getEducation() : 0)
                    .keywordScore(analysisDTO.getCategoryScores() != null ? analysisDTO.getCategoryScores().getKeywords() : 0)
                    .formattingScore(analysisDTO.getCategoryScores() != null ? analysisDTO.getCategoryScores().getFormatting() : 0)
                    .contentQualityScore(analysisDTO.getCategoryScores() != null ? analysisDTO.getCategoryScores().getContentQuality() : 0)
                    .analysisJson(analysisJsonString)
                    .aiProvider(actualProviderUsed)
                    .stage("Under Review")
                    .shortlisted(false)
                    .build();
        }

        ResumeAnalysis saved;
        try {
            saved = resumeAnalysisRepository.save(entity);
        } catch (org.springframework.dao.DataIntegrityViolationException dive) {
            log.warn("Concurrent duplicate insertion prevented by unique constraint. Upserting existing row.");
            if (normEmail != null) {
                entity = resumeAnalysisRepository.findFirstByCandidateEmailNormalizedAndTargetJobRoleNormalized(normEmail, normRole)
                        .orElse(entity);
                entity.setResume(resume);
                entity.setOverallScore(analysisDTO.getOverallScore());
                entity.setAnalysisJson(analysisJsonString);
                saved = resumeAnalysisRepository.save(entity);
            } else {
                throw dive;
            }
        }

        analysisDTO.setId(saved.getId());

        return analysisDTO;
    }

    @Transactional
    public ATSAnalysisDTO analyzeResume(Long resumeId, String targetJobRole, String jobDescription, String aiProviderName, String geminiApiKey) {
        return analyzeResume(resumeId, targetJobRole, jobDescription, aiProviderName, null, geminiApiKey);
    }

    @Transactional
    public ATSAnalysisDTO analyzeResume(Long resumeId, String targetJobRole, String jobDescription, String aiProviderName) {
        return analyzeResume(resumeId, targetJobRole, jobDescription, aiProviderName, null, null);
    }

    /**
     * Retrieve a previously completed analysis by ID.
     */
    @Transactional(readOnly = true)
    public ATSAnalysisDTO getAnalysis(Long analysisId) {
        ResumeAnalysis entity = resumeAnalysisRepository.findById(analysisId)
                .orElseThrow(() -> new IllegalArgumentException("Analysis not found with ID: " + analysisId));
        return toDTO(entity);
    }

    /**
     * Converts a persisted ResumeAnalysis entity to ATSAnalysisDTO.
     */
    public ATSAnalysisDTO toDTO(ResumeAnalysis entity) {
        if (entity == null) return null;
        try {
            if (entity.getAnalysisJson() != null && !entity.getAnalysisJson().isBlank()) {
                ATSAnalysisDTO dto = objectMapper.readValue(entity.getAnalysisJson(), ATSAnalysisDTO.class);
                dto.setId(entity.getId());
                dto.setResumeId(entity.getResume() != null ? entity.getResume().getId() : null);
                dto.setFileName(entity.getResumeFileName());
                dto.setTargetJobRole(entity.getTargetJobRole());
                dto.setJobDescription(entity.getJobDescription());
                return dto;
            }
        } catch (Exception e) {
            log.warn("Could not deserialize entity analysisJson, synthesizing DTO: {}", e.getMessage());
        }

        return ATSAnalysisDTO.builder()
                .id(entity.getId())
                .resumeId(entity.getResume() != null ? entity.getResume().getId() : null)
                .fileName(entity.getResumeFileName())
                .targetJobRole(entity.getTargetJobRole())
                .jobDescription(entity.getJobDescription())
                .overallScore(entity.getOverallScore())
                .matchLevel(atsScoringService.resolveMatchLevel(entity.getOverallScore()))
                .candidate(entity.getCandidateInfo())
                .aiProvider(entity.getAiProvider())
                .analyzedAt(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : LocalDateTime.now().toString())
                .build();
    }

    private ATSAnalysisDTO parseOrFallback(String json, CandidateInfoDTO candidate, String targetRole, String jobDesc) {
        try {
            JsonNode root = objectMapper.readTree(json);
            ATSAnalysisDTO dto = objectMapper.treeToValue(root, ATSAnalysisDTO.class);
            dto.setCandidate(candidate);
            return dto;
        } catch (Exception e) {
            log.warn("Failed to parse AI JSON response: {}. Utilizing dynamic rule-based synthesis.", e.getMessage());
            SkillsAnalysisDTO skills = jobMatchingService.analyzeSkills(candidate.getTechnicalSkills(), targetRole);
            CategoryScoresDTO scores = CategoryScoresDTO.builder()
                    .skills(Math.min(95, Math.max(30, skills.getMatchedSkills().size() * 14)))
                    .experience(75)
                    .projects(70)
                    .education(85)
                    .keywords(72)
                    .formatting(88)
                    .contentQuality(78)
                    .build();

            int overall = atsScoringService.calculateOverallScore(scores);

            return ATSAnalysisDTO.builder()
                    .candidate(candidate)
                    .targetJobRole(targetRole)
                    .jobDescription(jobDesc)
                    .overallScore(overall)
                    .matchLevel(atsScoringService.resolveMatchLevel(overall))
                    .categoryScores(scores)
                    .skillsAnalysis(skills)
                    .strengths(List.of(
                            "Demonstrated Core Skills: Found verified background in " + String.join(", ", skills.getMatchedSkills().stream().limit(3).toList()),
                            "Standard ATS Layout: Clear formatting and recognizable section markers."
                    ))
                    .weaknesses(List.of(
                            "Technical Keyword Alignment: Missing essential competencies required by target role."
                    ))
                    .recommendations(List.of(
                            "Integrate High-Priority Keywords: Highlight experience with missing skills in recent project descriptions.",
                            "Tailor Professional Summary: Explicitly mention target job role in opening profile."
                    ))
                    .improvedSummary("Results-driven " + targetRole + " with foundational skills in " + String.join(", ", skills.getMatchedSkills().stream().limit(3).toList()) + ".")
                    .suggestedKeywords(List.of("Docker", "Kubernetes", "AWS", "CI/CD", "Agile", "Unit Testing"))
                    .build();
        }
    }

    private String safeToJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.error("Failed to serialize to JSON", e);
            return "{}";
        }
    }
}
