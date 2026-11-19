package com.smarthire.service;

import com.smarthire.entity.Department;
import com.smarthire.entity.Job;
import com.smarthire.repository.DepartmentRepository;
import com.smarthire.repository.JobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final DepartmentRepository departmentRepository;
    private final com.smarthire.repository.ResumeAnalysisRepository resumeAnalysisRepository;
    private final com.smarthire.repository.JobQuestionRepository jobQuestionRepository;
    private final com.smarthire.repository.HrDeletedDepartmentRepository hrDeletedDepartmentRepository;

    public JobService(JobRepository jobRepository,
                      DepartmentRepository departmentRepository,
                      com.smarthire.repository.ResumeAnalysisRepository resumeAnalysisRepository,
                      com.smarthire.repository.JobQuestionRepository jobQuestionRepository,
                      com.smarthire.repository.HrDeletedDepartmentRepository hrDeletedDepartmentRepository) {
        this.jobRepository = jobRepository;
        this.departmentRepository = departmentRepository;
        this.resumeAnalysisRepository = resumeAnalysisRepository;
        this.jobQuestionRepository = jobQuestionRepository;
        this.hrDeletedDepartmentRepository = hrDeletedDepartmentRepository;
    }

    public List<Job> getAllJobs() {
        return jobRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<Job> getJobsForUser(com.smarthire.entity.User user) {
        if (user != null && ("HR".equalsIgnoreCase(user.getRole()) || "RECRUITER".equalsIgnoreCase(user.getRole()))) {
            return jobRepository.findByRecruiterIdOrderByCreatedAtDesc(user.getId());
        }
        return jobRepository.findByStatusOrderByCreatedAtDesc("Open");
    }

    public List<Job> getJobsByRecruiter(Long recruiterId) {
        if (recruiterId == null) {
            return jobRepository.findAllByOrderByCreatedAtDesc();
        }
        return jobRepository.findByRecruiterIdOrderByCreatedAtDesc(recruiterId);
    }

    public Optional<Job> getJobById(Long id) {
        return jobRepository.findById(id);
    }

    public Optional<Job> getJobByIdAndRecruiter(Long id, Long recruiterId) {
        if (recruiterId == null) return jobRepository.findById(id);
        return jobRepository.findById(id).filter(j -> j.getRecruiter() == null || recruiterId.equals(j.getRecruiter().getId()));
    }

    @Transactional
    public Job saveJob(Job job) {
        if (job.getDepartment() != null && !job.getDepartment().isBlank()) {
            ensureDepartmentExists(job.getDepartment());
        }
        return jobRepository.save(job);
    }

    @Transactional
    public Job saveJob(Job job, com.smarthire.entity.User recruiter) {
        if (recruiter != null) {
            if (job.getRecruiter() == null) {
                job.setRecruiter(recruiter);
            }
            if ((job.getCompanyName() == null || job.getCompanyName().isBlank() || "SmartHire Technologies".equalsIgnoreCase(job.getCompanyName()))
                    && recruiter.getCompanyName() != null && !recruiter.getCompanyName().isBlank()) {
                job.setCompanyName(recruiter.getCompanyName().trim());
            }
        }
        return saveJob(job);
    }

    @Transactional
    public void deleteJob(Long id) {
        jobRepository.deleteById(id);
    }

    private static final List<String> SYSTEM_DEFAULT_DEPTS = List.of(
            "Engineering",
            "Product & Design",
            "Data Science & Analytics",
            "DevOps & Cloud Infrastructure",
            "Sales & Marketing"
    );

    @Transactional
    public List<String> getAllDepartments() {
        return getAllDepartments(null);
    }

    @Transactional
    public List<String> getAllDepartments(com.smarthire.entity.User user) {
        Set<String> resultSet = new LinkedHashSet<>(SYSTEM_DEFAULT_DEPTS);

        boolean isHr = user != null && ("HR".equalsIgnoreCase(user.getRole()) || "RECRUITER".equalsIgnoreCase(user.getRole()));

        if (isHr) {
            // 1. Load custom departments explicitly created by this HR
            try {
                List<Department> savedDepts = departmentRepository.findByRecruiterIdOrderByNameAsc(user.getId());
                for (Department d : savedDepts) {
                    if (d.getName() != null && !d.getName().isBlank()) {
                        resultSet.add(d.getName().trim());
                    }
                }
            } catch (Exception ignored) {}

            // 2. Load distinct departments actually present in this HR's jobs
            try {
                List<String> hrJobDepts = jobRepository.findDistinctDepartmentsByRecruiterId(user.getId());
                for (String jd : hrJobDepts) {
                    if (jd != null && !jd.isBlank()) {
                        resultSet.add(jd.trim());
                    }
                }
            } catch (Exception ignored) {}

            // 3. Exclude any departments that this HR has deleted
            try {
                List<String> deletedNames = hrDeletedDepartmentRepository.findDeletedDepartmentNamesByRecruiterId(user.getId());
                if (deletedNames != null && !deletedNames.isEmpty()) {
                    Set<String> deletedSet = new HashSet<>(deletedNames);
                    resultSet.removeIf(d -> deletedSet.contains(d.toLowerCase()));
                }
            } catch (Exception ignored) {}
        } else {
            // For Job Seeker or unauthenticated: load distinct departments across all published jobs
            try {
                List<String> jobDepts = jobRepository.findDistinctDepartments();
                for (String jd : jobDepts) {
                    if (jd != null && !jd.isBlank()) {
                        resultSet.add(jd.trim());
                    }
                }
            } catch (Exception ignored) {}
        }

        List<String> sorted = new ArrayList<>(resultSet);
        sorted.sort(String.CASE_INSENSITIVE_ORDER);
        return sorted;
    }

    @Transactional
    public List<String> getCustomDepartments(com.smarthire.entity.User user) {
        if (user == null) return Collections.emptyList();
        Set<String> customSet = new LinkedHashSet<>();
        try {
            List<Department> savedDepts = departmentRepository.findByRecruiterIdOrderByNameAsc(user.getId());
            for (Department d : savedDepts) {
                if (d.getName() != null && !d.getName().isBlank()) {
                    String clean = d.getName().trim();
                    if (SYSTEM_DEFAULT_DEPTS.stream().noneMatch(sd -> sd.equalsIgnoreCase(clean))) {
                        customSet.add(clean);
                    }
                }
            }
        } catch (Exception ignored) {}
        try {
            List<String> deletedNames = hrDeletedDepartmentRepository.findDeletedDepartmentNamesByRecruiterId(user.getId());
            if (deletedNames != null && !deletedNames.isEmpty()) {
                Set<String> deletedSet = new HashSet<>(deletedNames);
                customSet.removeIf(d -> deletedSet.contains(d.toLowerCase()));
            }
        } catch (Exception ignored) {}
        List<String> sorted = new ArrayList<>(customSet);
        sorted.sort(String.CASE_INSENSITIVE_ORDER);
        return sorted;
    }

    @Transactional
    public Department addDepartment(String name) {
        return addDepartment(name, null);
    }

    @Transactional
    public Department addDepartment(String name, com.smarthire.entity.User recruiter) {
        if (name == null || name.trim().isBlank()) {
            throw new IllegalArgumentException("Department name cannot be empty");
        }
        String cleanName = name.trim();
        Long recruiterId = recruiter != null ? recruiter.getId() : null;

        if (recruiterId != null) {
            try {
                hrDeletedDepartmentRepository.unmarkDepartmentDeleted(recruiterId, cleanName);
            } catch (Exception ignored) {}

            Optional<Department> existing = departmentRepository.findByNameIgnoreCaseAndRecruiterId(cleanName, recruiterId);
            if (existing.isPresent()) {
                return existing.get();
            }
            return departmentRepository.save(Department.builder()
                    .name(cleanName)
                    .recruiter(recruiter)
                    .isSystemDefault(false)
                    .build());
        } else {
            return departmentRepository.findByNameIgnoreCase(cleanName)
                    .orElseGet(() -> departmentRepository.save(Department.builder()
                            .name(cleanName)
                            .isSystemDefault(true)
                            .build()));
        }
    }

    @Transactional
    public Map<String, Object> deleteDepartment(String name, com.smarthire.entity.User recruiter) {
        if (name == null || name.trim().isBlank()) {
            throw new IllegalArgumentException("Department name is required");
        }
        if (recruiter == null) {
            throw new org.springframework.security.access.AccessDeniedException("Authentication required to delete department");
        }

        String cleanName = name.trim();

        // 1. Find jobs created by this HR in this department
        List<Job> hrJobs = jobRepository.findByRecruiterIdAndDepartmentIgnoreCase(recruiter.getId(), cleanName);

        // 2. Check if candidates have applied to any of these jobs
        long appliedCandidates = 0;
        List<Long> jobIds = hrJobs.stream().map(Job::getId).toList();
        if (!jobIds.isEmpty()) {
            appliedCandidates = resumeAnalysisRepository.countByJobIdIn(jobIds);
        }
        for (Job job : hrJobs) {
            int appCount = job.getApplicantsCount();
            if (appCount > appliedCandidates) {
                appliedCandidates = appCount;
            }
        }

        if (appliedCandidates > 0) {
            throw new IllegalStateException("Cannot delete department '" + cleanName + "': " + appliedCandidates +
                    " candidate(s) have applied to job requisitions under this department. Deletion is blocked for active candidate records.");
        }

        // 3. If 0 candidates applied: delete vacant jobs and custom department for this recruiter
        int deletedJobsCount = 0;
        for (Job job : hrJobs) {
            jobQuestionRepository.deleteByJobId(job.getId());
            jobRepository.delete(job);
            deletedJobsCount++;
        }

        try {
            departmentRepository.deleteByNameIgnoreCaseAndRecruiterId(cleanName, recruiter.getId());
        } catch (Exception ignored) {}

        // 4. Mark as deleted for this specific recruiter so it never appears again in their list
        try {
            if (!hrDeletedDepartmentRepository.isDepartmentDeletedByRecruiter(recruiter.getId(), cleanName)) {
                hrDeletedDepartmentRepository.save(com.smarthire.entity.HrDeletedDepartment.builder()
                        .recruiterId(recruiter.getId())
                        .departmentName(cleanName)
                        .build());
            }
        } catch (Exception ignored) {}

        return Map.of(
                "success", true,
                "department", cleanName,
                "deletedJobsCount", deletedJobsCount,
                "message", "Department '" + cleanName + "' deleted successfully" +
                        (deletedJobsCount > 0 ? " along with " + deletedJobsCount + " vacant job requisition(s)." : ".")
        );
    }

    @Transactional
    public void ensureDepartmentExists(String name) {
        if (name == null || name.trim().isBlank()) return;
        String cleanName = name.trim();
        try {
            if (!departmentRepository.existsByNameIgnoreCase(cleanName)) {
                departmentRepository.save(Department.builder().name(cleanName).isSystemDefault(true).build());
            }
        } catch (Exception ignored) {
        }
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
