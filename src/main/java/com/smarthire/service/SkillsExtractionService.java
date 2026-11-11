package com.smarthire.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class SkillsExtractionService {

    private final List<String> skillDatabase = List.of(
            // Programming Languages
            "Java", "JavaScript", "TypeScript", "Python", "C", "C++", "C#", "Go", "Golang", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala",

            // Java & Backend Frameworks
            "Core Java", "Advanced Java", "Spring Boot", "Spring Framework", "Spring MVC", "Spring Security",
            "Servlets", "JSP", "JDBC", "JPA", "Hibernate", "REST API", "REST APIs", "Microservices",
            "Quarkus", "Micronaut", "Node.js", "Express.js", "Django", "Flask", "FastAPI", "ASP.NET", ".NET Core",

            // Frontend & Web Technologies
            "HTML", "HTML5", "CSS", "CSS3", "Sass", "Tailwind CSS", "Bootstrap", "React", "React.js",
            "Next.js", "Angular", "Vue", "Vue.js", "Redux", "Webpack", "Vite", "GraphQL", "jQuery",

            // Databases & Caching
            "MySQL", "PostgreSQL", "MongoDB", "SQL", "SQLite", "Redis", "Oracle", "DynamoDB", "Cassandra", "Elasticsearch",

            // Data Structures, Algorithms & Principles
            "OOP", "Object-Oriented Programming", "Collections", "Collection Framework", "Exception Handling",
            "Multithreading", "Data Structures and Algorithms", "DSA", "System Design", "Design Patterns", "Clean Code", "TDD",

            // Data Science, Machine Learning & AI
            "Data Science", "Machine Learning", "Deep Learning", "Artificial Intelligence", "AI", "NLP",
            "Computer Vision", "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "Pandas", "NumPy", "SciPy",
            "Matplotlib", "Seaborn", "OpenCV", "LLM", "Large Language Models", "Generative AI", "RAG",
            "Prompt Engineering", "Groq AI API", "OpenAI",

            // Data Analytics & Business Intelligence
            "Data Analysis", "Data Analyst", "Business Intelligence", "BI", "Tableau", "Power BI", "Excel",
            "Advanced Excel", "Google Analytics", "ETL", "Snowflake", "Databricks", "BigQuery", "Apache Spark", "Hadoop",

            // Cloud & DevOps
            "Docker", "Kubernetes", "AWS", "Amazon Web Services", "Azure", "Google Cloud Platform", "GCP",
            "CI/CD", "Jenkins", "GitHub Actions", "GitLab CI", "Terraform", "Ansible", "Linux", "Bash", "Shell Scripting", "Nginx", "Apache",

            // QA & Testing
            "QA", "Quality Assurance", "Manual Testing", "Automation Testing", "Selenium", "Cypress",
            "Playwright", "JUnit", "TestNG", "Mockito", "Postman", "JMeter", "API Testing", "Regression Testing", "Test Automation",

            // Cybersecurity
            "Cybersecurity", "Information Security", "Network Security", "Penetration Testing", "Ethical Hacking",
            "SIEM", "SOC", "Firewalls", "Vulnerability Assessment", "OWASP", "ISO 27001", "CISSP", "CompTIA Security+",

            // Product & Project Management
            "Agile", "Scrum", "Kanban", "JIRA", "Confluence", "Product Management", "Project Management",
            "PMP", "PRINCE2", "Sprint Planning", "Roadmapping", "Stakeholder Management", "User Stories", "SDLC",

            // Business Analysis
            "Business Analysis", "Requirements Gathering", "BPMN", "Gap Analysis", "Wireframing", "Use Cases", "Functional Specifications",

            // UI/UX Design
            "UI/UX", "UI Design", "UX Design", "Figma", "Adobe XD", "Sketch", "User Research", "Wireframing",
            "Prototyping", "Usability Testing", "Design Systems", "Information Architecture",

            // Digital Marketing & Social Media
            "Digital Marketing", "SEO", "Search Engine Optimization", "SEM", "Google Ads", "Content Marketing",
            "Social Media Marketing", "Email Marketing", "Copywriting", "Brand Strategy", "Meta Ads", "HubSpot",

            // HR, Recruiting & Sales
            "Talent Acquisition", "Technical Recruiting", "Sourcing", "ATS", "Interviewing", "Onboarding",
            "Employee Relations", "HR Operations", "Payroll", "Performance Management",
            "B2B Sales", "Lead Generation", "Cold Calling", "CRM", "Salesforce", "Account Management", "Negotiation",

            // Developer Tools & Version Control
            "Git", "GitHub", "GitLab", "Bitbucket", "Maven", "Gradle", "VS Code", "IntelliJ IDEA"
    );

    public List<String> extractSkills(String resumeText) {
        List<String> foundSkills = new ArrayList<>();

        if (resumeText == null || resumeText.isBlank()) {
            return foundSkills;
        }

        String text = resumeText.toLowerCase(Locale.ROOT);

        for (String skill : skillDatabase) {
            String keyword = skill.toLowerCase(Locale.ROOT);

            // Match words accurately with boundary check
            String regex = "(?<![a-z0-9])" + Pattern.quote(keyword) + "(?![a-z0-9])";

            if (Pattern.compile(regex).matcher(text).find()) {
                foundSkills.add(skill);
            }
        }

        return foundSkills;
    }
}
