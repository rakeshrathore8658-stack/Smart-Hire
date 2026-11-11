package com.smarthire.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.dto.CandidateInfoDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResumeExtractionService {

    private final SkillsExtractionService skillsExtractionService;
    private final ObjectMapper objectMapper;

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
    );

    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "(?:\\+?\\d{1,3}[-.\\s]?)?(?:\\(?\\d{2,5}\\)?[-.\\s]?)?\\d{3,5}[-.\\s]?\\d{3,5}"
    );

    private static final Pattern EXP_YEARS_PATTERN = Pattern.compile(
            "(\\d+(?:\\.\\d+)?)\\s*\\+?\\s*(?:years?|yrs?)(?:\\s+of\\s+experience)?",
            Pattern.CASE_INSENSITIVE
    );

    private static final Set<String> COMMON_LANGUAGES = Set.of(
            "Java", "Python", "JavaScript", "TypeScript", "C", "C++", "C#", "Go", "Golang", "Rust", "PHP", "Ruby", "Swift", "Kotlin", "SQL"
    );

    private static final Set<String> COMMON_FRAMEWORKS = Set.of(
            "Spring Boot", "Spring Framework", "Spring MVC", "Hibernate", "JPA", "React", "React.js", "Angular",
            "Vue", "Vue.js", "Next.js", "Express.js", "Node.js", "Django", "Flask", "FastAPI", "Tailwind CSS", "Bootstrap"
    );

    private static final Set<String> COMMON_DATABASES = Set.of(
            "MySQL", "PostgreSQL", "MongoDB", "Redis", "Oracle", "DynamoDB", "Cassandra", "Elasticsearch", "SQLite"
    );

    private static final Set<String> COMMON_TOOLS = Set.of(
            "Git", "GitHub", "GitLab", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD", "Jenkins",
            "Maven", "Gradle", "Postman", "Jira", "Linux", "VS Code", "IntelliJ IDEA"
    );

    /**
     * Extracts structured candidate profile data from normalized resume text.
     */
    public CandidateInfoDTO extractCandidateInfo(String normalizedText) {
        if (normalizedText == null || normalizedText.isBlank()) {
            return new CandidateInfoDTO();
        }

        CandidateInfoDTO dto = new CandidateInfoDTO();

        // 1. Contact Information
        dto.setEmail(extractEmail(normalizedText));
        dto.setPhoneNumber(extractPhone(normalizedText));
        dto.setName(extractName(normalizedText, dto.getEmail(), dto.getPhoneNumber()));
        dto.setLocation(extractLocation(normalizedText));

        // 2. Summary
        dto.setProfessionalSummary(extractSection(normalizedText, List.of("summary", "professional summary", "about me", "profile", "objective")));

        // 3. Experience calculation
        dto.setTotalExperience(extractExperienceYears(normalizedText));

        // 4. Skills extraction and categorized breakdown
        List<String> allSkills = skillsExtractionService.extractSkills(normalizedText);
        dto.setTechnicalSkills(allSkills);

        List<String> languages = new ArrayList<>();
        List<String> frameworks = new ArrayList<>();
        List<String> databases = new ArrayList<>();
        List<String> tools = new ArrayList<>();

        for (String skill : allSkills) {
            if (COMMON_LANGUAGES.contains(skill)) {
                languages.add(skill);
            } else if (COMMON_FRAMEWORKS.contains(skill)) {
                frameworks.add(skill);
            } else if (COMMON_DATABASES.contains(skill)) {
                databases.add(skill);
            } else if (COMMON_TOOLS.contains(skill)) {
                tools.add(skill);
            }
        }

        dto.setProgrammingLanguages(languages);
        dto.setFrameworks(frameworks);
        dto.setDatabases(databases);
        dto.setTools(tools);

        // 5. Sections: Projects, Education, Certifications, Experience
        dto.setProjects(extractListSection(normalizedText, List.of("projects", "key projects", "academic projects", "personal projects")));
        dto.setEducation(extractListSection(normalizedText, List.of("education", "academic history", "academics", "qualifications")));
        dto.setCertifications(extractListSection(normalizedText, List.of("certifications", "licenses & certifications", "courses")));
        dto.setWorkExperience(extractListSection(normalizedText, List.of("experience", "work experience", "employment history", "professional experience")));
        dto.setAchievements(extractListSection(normalizedText, List.of("achievements", "honors & awards", "accomplishments")));

        return dto;
    }

    /**
     * Converts CandidateInfoDTO to structured JSON string.
     */
    public String toJson(CandidateInfoDTO candidateInfo) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(candidateInfo);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize CandidateInfoDTO to JSON", e);
            return "{}";
        }
    }

    private String extractEmail(String text) {
        Matcher matcher = EMAIL_PATTERN.matcher(text);
        if (matcher.find()) {
            return matcher.group();
        }
        return null;
    }

    private String extractPhone(String text) {
        Matcher matcher = PHONE_PATTERN.matcher(text);
        while (matcher.find()) {
            String candidate = matcher.group().trim();
            // Filter out numbers that are too short to be phone numbers
            String digitsOnly = candidate.replaceAll("\\D", "");
            if (digitsOnly.length() >= 10 && digitsOnly.length() <= 13) {
                return candidate;
            }
        }
        return null;
    }

    private String extractName(String text, String email, String phone) {
        String[] lines = text.split("\r?\n");
        for (int i = 0; i < Math.min(6, lines.length); i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;
            if (email != null && line.contains(email)) continue;
            if (phone != null && line.contains(phone)) continue;
            if (line.toLowerCase().contains("resume") || line.toLowerCase().contains("curriculum vitae")) continue;
            if (line.toLowerCase().contains("http") || line.toLowerCase().contains("linkedin") || line.toLowerCase().contains("github")) continue;
            // Names typically have 2-4 words and no digits or symbols
            if (line.matches("^[A-Za-z\\s.]{2,40}$") && line.split("\\s+").length <= 4) {
                return line;
            }
        }
        return null;
    }

    private String extractLocation(String text) {
        Pattern pattern = Pattern.compile("(?i)(?:Location|Address|City)\\s*[:\\-]\\s*([A-Za-z0-9,\\s]{3,40})");
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }

    private String extractExperienceYears(String text) {
        Matcher matcher = EXP_YEARS_PATTERN.matcher(text);
        if (matcher.find()) {
            return matcher.group(1) + "+ Years";
        }
        // Fallback: estimate based on keywords
        if (text.toLowerCase().contains("fresher") || text.toLowerCase().contains("entry level") || text.toLowerCase().contains("intern")) {
            return "Entry Level / Fresher";
        }
        return "1-3 Years";
    }

    private String extractSection(String text, List<String> sectionHeaders) {
        String[] lines = text.split("\r?\n");
        boolean inSection = false;
        StringBuilder content = new StringBuilder();

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;

            String lower = trimmed.toLowerCase();
            boolean isHeader = false;
            for (String header : sectionHeaders) {
                if (lower.equals(header) || lower.startsWith(header + ":") || lower.startsWith(header + " -")) {
                    isHeader = true;
                    inSection = true;
                    break;
                }
            }

            if (isHeader) continue;

            if (inSection) {
                // If we reach another likely header line, stop
                if (trimmed.length() < 30 && trimmed.toUpperCase().equals(trimmed) && trimmed.matches("^[A-Z\\s]{3,}$")) {
                    break;
                }
                if (trimmed.endsWith(":") && trimmed.length() < 35) {
                    break;
                }
                content.append(trimmed).append(" ");
                if (content.length() > 500) break;
            }
        }

        String result = content.toString().trim();
        return result.isEmpty() ? null : result;
    }

    private List<String> extractListSection(String text, List<String> sectionHeaders) {
        List<String> items = new ArrayList<>();
        String[] lines = text.split("\r?\n");
        boolean inSection = false;

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;

            String lower = trimmed.toLowerCase();
            boolean isHeader = false;
            for (String header : sectionHeaders) {
                if (lower.equals(header) || lower.startsWith(header + ":") || lower.startsWith(header + " -")) {
                    isHeader = true;
                    inSection = true;
                    break;
                }
            }

            if (isHeader) continue;

            if (inSection) {
                if (trimmed.length() < 30 && trimmed.toUpperCase().equals(trimmed) && trimmed.matches("^[A-Z\\s]{3,}$")) {
                    break;
                }
                if (trimmed.endsWith(":") && trimmed.length() < 35 && !trimmed.startsWith("-")) {
                    break;
                }
                // Bullet or item
                if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                    items.add(trimmed.substring(2).trim());
                } else if (trimmed.length() > 5 && items.size() < 10) {
                    items.add(trimmed);
                }
            }
        }
        return items;
    }
}
