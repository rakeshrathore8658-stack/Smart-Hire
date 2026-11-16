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
        String rawResume = sanitize(resumeText != null ? resumeText : "");
        // Compact resume text representation to keep token ingestion fast (<1.5s on CPU)
        String safeResume = rawResume.length() > 2500 ? rawResume.substring(0, 2500) + "... [Truncated for speed]" : rawResume;

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
        if (safeJobDesc.length() > 1000) {
            safeJobDesc = safeJobDesc.substring(0, 1000) + "...";
        }
        String safeRequiredSkills = (requiredSkills != null && !requiredSkills.isEmpty())
                ? String.join(", ", requiredSkills)
                : "Standard core competencies for " + safeRole;

        return """
                =========================
                RESUME EVIDENCE SUMMARY:
                =========================
                %s

                - Extracted Skills: %s
                - Experience: %s
                - Education: %s
                - Projects: %s
                - Certifications: %s

                =========================
                TARGET ROLE SPECIFICATION:
                =========================
                - Role: %s
                - Required Skills: %s
                - Description: %s

                =========================
                EVALUATION INSTRUCTIONS:
                =========================
                Perform a deep, advanced ATS scoring analysis of this resume against the target role.
                Be realistic and evidence-based.
                Keep all explanations and bullets concise (1 sentence each).
                Output ONLY a single valid JSON object following this exact schema:

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
                    "matchedSkills": ["skill1", "skill2"],
                    "missingSkills": [
                      {"skill": "missing1", "priority": "HIGH", "reason": "Essential for role architecture"},
                      {"skill": "missing2", "priority": "MEDIUM", "reason": "Recommended for workflow"}
                    ],
                    "partialSkills": ["skill3"]
                  },
                  "strengths": [
                    "Solid hands-on foundation in core required technologies",
                    "Demonstrated practical application in relevant projects",
                    "Clear structured technical skill taxonomy"
                  ],
                  "weaknesses": [
                    "Missing exposure to cloud deployment tools like AWS or Docker",
                    "Limited measurable performance metrics in experience bullets"
                  ],
                  "recommendations": [
                    "Incorporate missing core keywords into project descriptions",
                    "Quantify project achievements with percentages or user numbers",
                    "Highlight cloud or CI/CD pipelines relevant to modern development"
                  ],
                  "improvedSummary": "Dedicated software professional with hands-on expertise in backend services, database design, and REST APIs. Proven capability to engineer maintainable solutions and optimize application workflows.",
                  "suggestedKeywords": ["Microservices", "Docker", "AWS", "REST APIs", "CI/CD"],
                  "sectionAnalysis": [
                    "Contact Info: Complete and readable",
                    "Skills: High relevance to target role",
                    "Experience: Demonstrated hands-on responsibilities",
                    "Education: Aligned degree credentials"
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
