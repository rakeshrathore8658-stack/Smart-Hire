package com.smarthire.service;

import com.smarthire.dto.JobMatchDTO;
import com.smarthire.dto.MissingSkillDTO;
import com.smarthire.dto.SkillsAnalysisDTO;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class JobMatchingService {

    // Standard benchmark catalog mapping each role to its required core skills and weights
    private final Map<String, List<String>> roleSkillsMap = new LinkedHashMap<>();

    public JobMatchingService() {
        initBenchmarkRoles();
    }

    private void initBenchmarkRoles() {
        roleSkillsMap.put("Java Developer", List.of("Java", "Core Java", "Spring Boot", "REST APIs", "MySQL", "Hibernate/JPA", "Git", "Maven"));
        roleSkillsMap.put("Spring Boot Developer", List.of("Java", "Spring Boot", "Spring Security", "Microservices", "REST APIs", "Hibernate", "MySQL", "Docker"));
        roleSkillsMap.put("Full Stack Developer", List.of("JavaScript", "TypeScript", "React", "Node.js", "Java", "Spring Boot", "HTML", "CSS", "MySQL", "Git"));
        roleSkillsMap.put("Frontend Developer", List.of("JavaScript", "TypeScript", "React", "HTML", "CSS", "Tailwind CSS", "Bootstrap", "Git", "Redux"));
        roleSkillsMap.put("Backend Developer", List.of("Java", "Spring Boot", "REST APIs", "MySQL", "PostgreSQL", "Docker", "Microservices", "Redis", "Git"));
        roleSkillsMap.put("Python Developer", List.of("Python", "Django", "Flask", "FastAPI", "PostgreSQL", "REST APIs", "Docker", "Git"));
        roleSkillsMap.put("Data Analyst", List.of("Python", "SQL", "Excel", "Tableau", "Power BI", "Pandas", "NumPy", "Data Analysis"));
        roleSkillsMap.put("Software Engineer", List.of("Java", "Python", "Data Structures and Algorithms", "OOP", "Git", "MySQL", "REST APIs", "Linux"));
        roleSkillsMap.put("DevOps Engineer", List.of("Docker", "Kubernetes", "AWS", "CI/CD", "Jenkins", "Linux", "Terraform", "Git"));
        roleSkillsMap.put("AI/ML Engineer", List.of("Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "NLP", "Pandas", "Scikit-learn"));
    }

    public List<String> getAvailableRoles() {
        return new ArrayList<>(roleSkillsMap.keySet());
    }

    public List<String> getRequiredSkillsForRole(String role) {
        if (role == null || role.isBlank()) {
            return roleSkillsMap.get("Software Engineer");
        }
        for (Map.Entry<String, List<String>> entry : roleSkillsMap.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(role.trim())) {
                return entry.getValue();
            }
        }
        // Fallback for custom role: synthesize standard skills
        return List.of("Problem Solving", "Git", "REST APIs", "SQL", "Team Collaboration");
    }

    /**
     * Performs skill analysis comparing candidate skills with target role requirements.
     */
    public SkillsAnalysisDTO analyzeSkills(List<String> candidateSkills, String targetRole) {
        List<String> required = getRequiredSkillsForRole(targetRole);
        Set<String> candidateSkillSet = candidateSkills.stream()
                .map(String::toLowerCase)
                .collect(Collectors.toSet());

        List<String> matched = new ArrayList<>();
        List<MissingSkillDTO> missing = new ArrayList<>();

        for (int i = 0; i < required.size(); i++) {
            String req = required.get(i);
            if (candidateSkillSet.contains(req.toLowerCase())) {
                matched.add(req);
            } else {
                String priority = (i < 2) ? "HIGH" : (i < 5 ? "MEDIUM" : "LOW");
                missing.add(new MissingSkillDTO(req, priority, "Recommended competency for " + targetRole));
            }
        }

        // Also check any extra candidate skills not in benchmark
        for (String cSkill : candidateSkills) {
            if (!matched.contains(cSkill) && required.stream().noneMatch(r -> r.equalsIgnoreCase(cSkill))) {
                // If it partially relates, add to matched
                matched.add(cSkill);
            }
        }

        return SkillsAnalysisDTO.builder()
                .matchedSkills(matched)
                .missingSkills(missing)
                .partialSkills(new ArrayList<>())
                .build();
    }

    /**
     * Matches resume against all standard roles to suggest top matching alternative careers.
     */
    public List<JobMatchDTO> matchAlternativeRoles(List<String> candidateSkills, List<String> projects) {
        List<JobMatchDTO> matches = new ArrayList<>();
        Set<String> candidateSkillSet = candidateSkills.stream()
                .map(String::toLowerCase)
                .collect(Collectors.toSet());

        for (Map.Entry<String, List<String>> entry : roleSkillsMap.entrySet()) {
            String role = entry.getKey();
            List<String> required = entry.getValue();

            List<String> matched = new ArrayList<>();
            List<String> missing = new ArrayList<>();

            for (String req : required) {
                if (candidateSkillSet.contains(req.toLowerCase())) {
                    matched.add(req);
                } else {
                    missing.add(req);
                }
            }

            int matchPct = (int) Math.round(((double) matched.size() / required.size()) * 100);
            String level = matchPct >= 75 ? "High" : (matchPct >= 50 ? "Medium" : "Low");

            matches.add(JobMatchDTO.builder()
                    .roleTitle(role)
                    .matchPercentage(matchPct)
                    .matchLevel(level)
                    .experienceCompatibility(matchPct >= 70 ? "Strong alignment with candidate background" : "Partial skill overlap")
                    .matchedSkills(matched)
                    .missingSkills(missing)
                    .relevantProjects(projects != null && !projects.isEmpty() ? List.of(projects.get(0)) : new ArrayList<>())
                    .build());
        }

        matches.sort((a, b) -> Integer.compare(b.getMatchPercentage(), a.getMatchPercentage()));
        return matches.stream().limit(5).collect(Collectors.toList());
    }
}
