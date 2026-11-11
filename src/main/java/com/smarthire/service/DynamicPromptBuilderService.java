package com.smarthire.service;

import com.smarthire.dto.CandidateInfoDTO;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DynamicPromptBuilderService {

    public static final String ATS_SYSTEM_INSTRUCTION = """
            You are an advanced AI Applicant Tracking System (ATS) evaluator, technical recruiter, and senior career analyst.
            Your task is to deeply, critically, and objectively evaluate the uploaded resume against the specified target job role.

            CRITICAL EVALUATION RULES:
            1. Calculate genuine, evidence-based scores (0-100) strictly derived from this specific resume's actual content.
            2. Never invent, guess, or hallucinate skills, companies, or projects not evidenced in the text.
            3. Do NOT output standard or static numbers. If a candidate lacks required skills or experience, award low scores (e.g. 25-50). If they are an outstanding match, award higher scores (e.g. 75-95).
            4. In 'skillsAnalysis.matchedSkills', ONLY include skills actually found in the candidate resume that align with the role.
            5. In 'skillsAnalysis.missingSkills', list important required competencies not detected in the resume text, prioritized as HIGH, MEDIUM, or LOW.
            6. Return ONLY valid, unescaped JSON matching the exact schema specified, without Markdown blocks or additional text.
            """;

    /**
     * Builds the dynamic prompt with strict variable injection and prompt-injection sanitization.
     */
    public String buildPrompt(
            String resumeText,
            CandidateInfoDTO candidateInfo,
            String targetJobRole,
            String jobDescription,
            List<String> requiredSkills
    ) {
        String safeResume = sanitize(resumeText != null ? resumeText : "");
        String safeSkills = candidateInfo != null && candidateInfo.getTechnicalSkills() != null && !candidateInfo.getTechnicalSkills().isEmpty()
                ? String.join(", ", candidateInfo.getTechnicalSkills()) : "None explicitly detected";
        String safeExp = candidateInfo != null && candidateInfo.getTotalExperience() != null
                ? candidateInfo.getTotalExperience() : "Not specified";
        String safeEdu = candidateInfo != null && candidateInfo.getEducation() != null && !candidateInfo.getEducation().isEmpty()
                ? String.join(" | ", candidateInfo.getEducation()) : "Not specified";
        String safeProjects = candidateInfo != null && candidateInfo.getProjects() != null && !candidateInfo.getProjects().isEmpty()
                ? String.join(" | ", candidateInfo.getProjects()) : "None explicitly listed";
        String safeCerts = candidateInfo != null && candidateInfo.getCertifications() != null && !candidateInfo.getCertifications().isEmpty()
                ? String.join(" | ", candidateInfo.getCertifications()) : "None listed";

        String safeRole = sanitize(targetJobRole != null && !targetJobRole.isBlank() ? targetJobRole : "Software Engineer");
        String safeJobDesc = sanitize(jobDescription != null && !jobDescription.isBlank() ? jobDescription : "Standard industry requirements for " + safeRole);
        String safeRequiredSkills = (requiredSkills != null && !requiredSkills.isEmpty())
                ? String.join(", ", requiredSkills)
                : "Standard core competencies for " + safeRole;

        return """
                =========================
                RESUME TEXT TO EVALUATE:
                =========================
                %s

                =========================
                PARSED CANDIDATE EVIDENCE:
                =========================
                - Detected Skills: %s
                - Experience Summary: %s
                - Academic Background: %s
                - Projects: %s
                - Certifications: %s

                =========================
                TARGET JOB SPECIFICATIONS:
                =========================
                - Target Role: %s
                - Required Competencies: %s
                - Job Description:
                %s

                =========================
                EVALUATION ASSIGNMENT:
                =========================
                Perform a rigorous ATS evaluation of this candidate for the target role.
                Calculate all scores objectively based on actual alignment.
                Output ONLY a single valid JSON object following this EXACT schema structure:

                {
                  "overallScore": 82,
                  "matchLevel": "Strong Match",
                  "categoryScores": {
                    "skills": 85,
                    "experience": 80,
                    "projects": 78,
                    "education": 88,
                    "keywords": 76,
                    "formatting": 90,
                    "contentQuality": 82
                  },
                  "skillsAnalysis": {
                    "matchedSkills": ["<list skills from resume that genuinely match target role>"],
                    "missingSkills": [
                      {"skill": "<missing required skill>", "priority": "HIGH", "reason": "<why needed>"},
                      {"skill": "<another missing skill>", "priority": "MEDIUM", "reason": "<why needed>"}
                    ],
                    "partialSkills": ["<skills with partial overlap>"]
                  },
                  "strengths": [
                    "<Real strength 1 from resume with evidence>",
                    "<Real strength 2 from resume with evidence>",
                    "<Real strength 3 from resume with evidence>"
                  ],
                  "weaknesses": [
                    "<Real weakness or gap 1 for this target role>",
                    "<Real weakness or gap 2 for this target role>"
                  ],
                  "recommendations": [
                    "<Actionable recommendation 1 to boost candidate ATS score>",
                    "<Actionable recommendation 2 regarding missing keywords or projects>",
                    "<Actionable recommendation 3 regarding summary or presentation>"
                  ],
                  "improvedSummary": "<AI-crafted concise 2-3 sentence executive professional summary for this candidate targeted at this role>",
                  "suggestedKeywords": ["<5 to 8 specific industry keywords candidate should integrate>"],
                  "sectionAnalysis": [
                    "Contact Info: Complete and readable",
                    "Skills Section: Specific assessment",
                    "Experience Section: Specific assessment",
                    "Education Section: Specific assessment"
                  ]
                }
                """.formatted(
                safeResume,
                safeSkills,
                safeExp,
                safeEdu,
                safeProjects,
                safeCerts,
                safeRole,
                safeRequiredSkills,
                safeJobDesc
        );
    }

    private String sanitize(String input) {
        if (input == null) return "";
        return input.replace("```", "").trim();
    }
}
