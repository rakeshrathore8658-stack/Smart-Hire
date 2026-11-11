package com.smarthire.service;

import com.smarthire.entity.Job;
import com.smarthire.repository.JobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class JobService {

    private final JobRepository jobRepository;

    public JobService(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    public List<Job> getAllJobs() {
        ensureDefaultJobs();
        return jobRepository.findAllByOrderByCreatedAtDesc();
    }

    public Optional<Job> getJobById(Long id) {
        return jobRepository.findById(id);
    }

    @Transactional
    public Job saveJob(Job job) {
        return jobRepository.save(job);
    }

    @Transactional
    public void deleteJob(Long id) {
        jobRepository.deleteById(id);
    }

    @Transactional
    public void ensureDefaultJobs() {
        if (jobRepository.count() == 0) {
            jobRepository.save(Job.builder()
                    .title("Senior Java Developer")
                    .department("Engineering")
                    .employmentType("Full-time")
                    .openings(3)
                    .minExperience(4)
                    .maxExperience(8)
                    .location("Remote / Hybrid")
                    .salaryRange("₹18,00,000 - ₹28,00,000")
                    .description("Design, develop, and maintain high-throughput distributed microservices using Java 21, Spring Boot, MySQL, and Kafka.")
                    .requiredSkills("Java, Spring Boot, Microservices, REST APIs, MySQL, Hibernate/JPA, Git, Docker, Kubernetes")
                    .status("Open")
                    .applicantsCount(0)
                    .shortlistedCount(0)
                    .build());

            jobRepository.save(Job.builder()
                    .title("Full Stack Spring & React Engineer")
                    .department("Engineering")
                    .employmentType("Full-time")
                    .openings(2)
                    .minExperience(3)
                    .maxExperience(6)
                    .location("Indore / Bangalore / Remote")
                    .salaryRange("₹14,00,000 - ₹22,00,000")
                    .description("Build end-to-end cloud applications with reactive Spring Boot backends and interactive React / TypeScript interfaces.")
                    .requiredSkills("Java, Spring Boot, React, TypeScript, JavaScript, HTML5, CSS3, REST APIs, PostgreSQL")
                    .status("Open")
                    .applicantsCount(0)
                    .shortlistedCount(0)
                    .build());

            jobRepository.save(Job.builder()
                    .title("Cloud & DevOps Architect")
                    .department("Infrastructure")
                    .employmentType("Full-time")
                    .openings(1)
                    .minExperience(5)
                    .maxExperience(10)
                    .location("Hybrid / Pune")
                    .salaryRange("₹22,00,000 - ₹35,00,000")
                    .description("Lead AWS and Kubernetes cloud infrastructure, automate CI/CD pipelines, monitor metrics, and enhance security compliance.")
                    .requiredSkills("AWS, Kubernetes, Docker, Terraform, CI/CD, Linux, Python, Helm, Prometheus")
                    .status("Open")
                    .applicantsCount(0)
                    .shortlistedCount(0)
                    .build());

            jobRepository.save(Job.builder()
                    .title("AI & NLP Engineer")
                    .department("Data")
                    .employmentType("Full-time")
                    .openings(2)
                    .minExperience(2)
                    .maxExperience(5)
                    .location("Remote")
                    .salaryRange("₹16,00,000 - ₹25,00,000")
                    .description("Develop LLM and NLP evaluation pipelines, prompt engineering workflows, and machine learning models for intelligent resume analysis.")
                    .requiredSkills("Python, PyTorch, LangChain, NLP, Transformers, FastAPI, Docker, REST APIs")
                    .status("Open")
                    .applicantsCount(0)
                    .shortlistedCount(0)
                    .build());
        }
    }
}
