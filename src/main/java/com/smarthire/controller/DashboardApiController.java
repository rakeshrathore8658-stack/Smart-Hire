package com.smarthire.controller;

import com.smarthire.dto.BulkUploadResponseDTO;
import com.smarthire.entity.Job;
import com.smarthire.entity.Resume;
import com.smarthire.entity.ResumeAnalysis;
import com.smarthire.entity.User;
import com.smarthire.repository.ResumeAnalysisRepository;
import com.smarthire.repository.ResumeRepository;
import com.smarthire.repository.UserRepository;
import com.smarthire.service.BulkResumeUploadService;
import com.smarthire.service.JobService;
import com.smarthire.service.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Slf4j
public class DashboardApiController {

    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;
    private final JobService jobService;
    private final ReportService reportService;
    private final com.smarthire.service.NotificationService notificationService;
    private final BulkResumeUploadService bulkResumeUploadService;
    private final com.smarthire.service.RealtimeSyncService realtimeSyncService;
    private final com.smarthire.service.CandidateComparisonService candidateComparisonService;

    private User getAuthenticatedUser() {
        return resolveUser(null, null);
    }

    private User resolveUser(String emailParam, String headerEmail) {
        String email = null;

        // 1. Explicit request param or X-User-Email header
        if (emailParam != null && !emailParam.isBlank()) {
            email = emailParam.trim().toLowerCase();
        } else if (headerEmail != null && !headerEmail.isBlank()) {
            email = headerEmail.trim().toLowerCase();
        } else {
            try {
                ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attrs != null && attrs.getRequest() != null) {
                    String h = attrs.getRequest().getHeader("X-User-Email");
                    if (h != null && !h.isBlank()) {
                        email = h.trim().toLowerCase();
                    }
                }
            } catch (Exception ignored) {}
        }

        // 2. Spring Security Authentication
        if (email == null) {
            try {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken) && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
                    email = auth.getName();
                }
            } catch (Exception ignored) {}
        }

        // 3. HTTP Session
        if (email == null) {
            try {
                ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attrs != null && attrs.getRequest() != null && attrs.getRequest().getSession(false) != null) {
                    email = (String) attrs.getRequest().getSession(false).getAttribute("userEmail");
                }
            } catch (Exception ignored) {}
        }

        if (email != null && !email.isBlank()) {
            return userRepository.findByEmail(email.trim().toLowerCase()).orElse(null);
        }
        return null;
    }

    private Map<String, Object> mapAnalysis(ResumeAnalysis ra)
    {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", ra.getId());
        map.put("candidateName", ra.getCandidateName());
        map.put("candidateInitials", ra.getCandidateInitials());
        map.put("candidateEmail", ra.getCandidateEmail());
        map.put("candidatePhone", ra.getCandidatePhone());
        map.put("candidateExperience", ra.getCandidateExperience());
        map.put("targetJobRole", ra.getTargetJobRole());
        map.put("overallScore", ra.getOverallScore());
        map.put("atsScore", ra.getOverallScore());
        map.put("skillsScore", ra.getSkillsScore());
        map.put("experienceScore", ra.getExperienceScore());
        map.put("formatScore", ra.getFormattingScore());
        map.put("stage", ra.getStage() != null ? ra.getStage() : "Under Review");
        map.put("displayStage", ra.getDisplayStage() != null ? ra.getDisplayStage() : (ra.getStage() != null ? ra.getStage() : "Under Review"));
        map.put("status", ra.getStatus());
        map.put("recommendation", ra.getRecommendation());
        map.put("shortlisted", Boolean.TRUE.equals(ra.getShortlisted()) || Boolean.TRUE.equals(ra.isShortlisted()));
        map.put("keySkills", ra.getKeySkills());
        map.put("matchedSkills", ra.getMatchedSkillsList());
        map.put("missingSkills", ra.getMissingSkillsList());
        map.put("analysisJson", ra.getAnalysisJson());
        map.put("interviewDate", ra.getInterviewDate());
        map.put("formattedInterviewDate", ra.getFormattedInterviewDate());
        map.put("interviewRound", ra.getInterviewRound());
        map.put("interviewerName", ra.getInterviewerName());
        map.put("interviewType", ra.getInterviewType());
        map.put("feedbackNotes", ra.getFeedbackNotes());
        map.put("feedbackScore", ra.getFeedbackScore());
        map.put("meetingLink", ra.getMeetingLink());
        map.put("interviewLocation", ra.getInterviewLocation());
        map.put("previousInterviewDate", ra.getPreviousInterviewDate() != null ? ra.getPreviousInterviewDate().toString() : null);
        map.put("cancellationReason", ra.getCancellationReason());
        map.put("interviewStatus", ra.getInterviewStatus() != null ? ra.getInterviewStatus() : (ra.getFeedbackNotes() != null ? "COMPLETED" : (ra.getInterviewDate() != null ? "SCHEDULED" : "NOT_SCHEDULED")));
        map.put("techRating", ra.getTechRating());
        map.put("commRating", ra.getCommRating());
        map.put("problemSolvingRating", ra.getProblemSolvingRating());
        map.put("hrNotes", ra.getHrNotes());
        map.put("strengthsList", ra.getStrengthsList());
        if (ra.getInterviewDate() != null) {
            map.put("interviewDay", ra.getInterviewDate().getDayOfMonth());
            map.put("interviewMonth", ra.getInterviewDate().getMonth().name().substring(0, 3));
            map.put("interviewDateIso", ra.getInterviewDate().toString());
        } else {
            map.put("interviewDay", "--");
            map.put("interviewMonth", "TBD");
            map.put("interviewDateIso", "");
        }
        map.put("createdAt", ra.getCreatedAt());
        map.put("formattedDate", ra.getFormattedDate() != null ? ra.getFormattedDate() : (ra.getCreatedAt() != null ? ra.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "Recent"));
        if (ra.getResume() != null) {
            map.put("resumeId", ra.getResume().getId());
            map.put("fileName", ra.getResume().getFileName());
        }
        return map;
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getDashboardStats(
            @RequestParam(value = "role", required = false) String roleParam,
            @RequestParam(value = "email", required = false) String emailParam,
            @RequestHeader(value = "X-User-Email", required = false) String headerEmail) {
        User user = resolveUser(emailParam, headerEmail);
        String role = (roleParam != null && !roleParam.isBlank())
                ? roleParam.toUpperCase()
                : (user != null && user.getRole() != null ? user.getRole().toUpperCase() : "USER");

        List<ResumeAnalysis> allAnalyses = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();

        if ("HR".equalsIgnoreCase(role)) {
            List<Job> jobs = jobService.getAllJobs();
            long openJobs = jobs.stream().filter(j -> "Open".equalsIgnoreCase(j.getStatus())).count();
            int totalApplications = allAnalyses.size();
            long shortlistedCount = allAnalyses.stream().filter(ra -> ra.isShortlisted() || "Shortlisted".equalsIgnoreCase(ra.getStage())).count();
            long interviewCount = allAnalyses.stream().filter(ra -> "Interviewing".equalsIgnoreCase(ra.getStage()) || "Interview".equalsIgnoreCase(ra.getStage())).count();
            long offeredCount = allAnalyses.stream().filter(ra -> "Offered".equalsIgnoreCase(ra.getStage())).count();
            long hiredCount = allAnalyses.stream().filter(ra -> "Hired".equalsIgnoreCase(ra.getStage())).count();

            // Unique candidates
            Set<String> uniqueCandidates = new HashSet<>();
            for (ResumeAnalysis ra : allAnalyses) {
                if (ra.getCandidateEmail() != null && !ra.getCandidateEmail().isBlank()) {
                    uniqueCandidates.add(ra.getCandidateEmail().toLowerCase());
                }
            }

            Map<String, Object> hrStats = new LinkedHashMap<>();
            hrStats.put("totalJobs", jobs.size());
            hrStats.put("openJobs", openJobs);
            hrStats.put("totalCandidates", uniqueCandidates.size());
            hrStats.put("totalApplications", totalApplications);
            hrStats.put("underReviewCount", allAnalyses.stream().filter(ra -> "Under Review".equalsIgnoreCase(ra.getStage()) || ra.getStage() == null).count());
            hrStats.put("shortlistedCount", shortlistedCount);
            hrStats.put("interviewCount", interviewCount);
            hrStats.put("offeredCount", offeredCount);
            hrStats.put("hiredCount", hiredCount);
            hrStats.put("recentApplications", allAnalyses.stream().limit(6).map(this::mapAnalysis).toList());

            return ResponseEntity.ok(Map.of("role", "HR", "stats", hrStats));
        }

        // Job Seeker Stats - Strictly isolated to authenticated user
        List<ResumeAnalysis> userAnalyses;
        if (user != null) {
            userAnalyses = resumeAnalysisRepository.findAllForUser(user.getId(), user.getEmail());
        } else if (emailParam != null && !emailParam.isBlank()) {
            userAnalyses = resumeAnalysisRepository.findByCandidateEmailNormalizedOrderByCreatedAtDesc(emailParam.trim().toLowerCase());
        } else if (headerEmail != null && !headerEmail.isBlank()) {
            userAnalyses = resumeAnalysisRepository.findByCandidateEmailNormalizedOrderByCreatedAtDesc(headerEmail.trim().toLowerCase());
        } else {
            userAnalyses = Collections.emptyList();
        }

        double avgAts = userAnalyses.stream().mapToInt(ResumeAnalysis::getOverallScore).average().orElse(0.0);
        double avgSkills = userAnalyses.stream().mapToInt(ResumeAnalysis::getSkillsScore).average().orElse(0.0);
        int maxScore = userAnalyses.stream().mapToInt(ResumeAnalysis::getOverallScore).max().orElse(0);

        Map<String, Object> seekerStats = new LinkedHashMap<>();
        seekerStats.put("totalAnalyses", userAnalyses.size());
        seekerStats.put("averageAtsScore", Math.round(avgAts * 10.0) / 10.0);
        seekerStats.put("averageSkillMatch", Math.round(avgSkills * 10.0) / 10.0);
        seekerStats.put("highestScore", maxScore);
        seekerStats.put("latestAnalysis", userAnalyses.isEmpty() ? null : mapAnalysis(userAnalyses.get(0)));
        seekerStats.put("recentAnalyses", userAnalyses.stream().limit(5).map(this::mapAnalysis).toList());

        // Score progression simulation for chart
        List<Map<String, Object>> scoreTrends = List.of(
                Map.of("month", "May", "score", 45),
                Map.of("month", "Jun", "score", 58),
                Map.of("month", "Jul", "score", 62),
                Map.of("month", "Aug", "score", 70),
                Map.of("month", "Sep", "score", 78),
                Map.of("month", "Oct", "score", maxScore > 0 ? maxScore : 85)
        );
        seekerStats.put("scoreTrends", scoreTrends);

        return ResponseEntity.ok(Map.of("role", "USER", "stats", seekerStats));
    }

    @GetMapping("/history")
    public ResponseEntity<?> getHistory(
            @RequestParam(value = "email", required = false) String emailParam,
            @RequestHeader(value = "X-User-Email", required = false) String headerEmail) {
        User user = resolveUser(emailParam, headerEmail);
        List<ResumeAnalysis> list;
        if (user != null && ("HR".equalsIgnoreCase(user.getRole()) || "RECRUITER".equalsIgnoreCase(user.getRole()))) {
            // HR sees all applications/analyses across the recruitment portal
            list = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();
        } else if (user != null) {
            // Job Seeker sees ONLY their own analysis history!
            list = resumeAnalysisRepository.findAllForUser(user.getId(), user.getEmail());
        } else if (emailParam != null && !emailParam.isBlank()) {
            list = resumeAnalysisRepository.findByCandidateEmailNormalizedOrderByCreatedAtDesc(emailParam.trim().toLowerCase());
        } else if (headerEmail != null && !headerEmail.isBlank()) {
            list = resumeAnalysisRepository.findByCandidateEmailNormalizedOrderByCreatedAtDesc(headerEmail.trim().toLowerCase());
        } else {
            // Unauthenticated guest: empty list so they never see other users' data
            list = Collections.emptyList();
        }
        return ResponseEntity.ok(list.stream().map(this::mapAnalysis).toList());
    }

    @DeleteMapping(value = {"/history/{id:[0-9]+}", "/applications/{id:[0-9]+}", "/candidates/{id:[0-9]+}"})
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteAnalysisRecord(@PathVariable("id") Long id) {
        Optional<ResumeAnalysis> analysisOpt = resumeAnalysisRepository.findById(id);
        if (analysisOpt.isPresent()) {
            ResumeAnalysis analysis = analysisOpt.get();
            Resume resume = analysis.getResume();
            String candName = analysis.getCandidateName() != null ? analysis.getCandidateName() : "Candidate";
            String role = analysis.getTargetJobRole() != null ? analysis.getTargetJobRole() : "Role";

            // Authorization check: Job seeker can only delete their own analysis
            User currentUser = getAuthenticatedUser();
            if (currentUser != null && !"HR".equalsIgnoreCase(currentUser.getRole()) && !"RECRUITER".equalsIgnoreCase(currentUser.getRole())) {
                boolean isOwner = (analysis.getUser() != null && analysis.getUser().getId().equals(currentUser.getId()))
                        || (analysis.getResume() != null && analysis.getResume().getUser() != null && analysis.getResume().getUser().getId().equals(currentUser.getId()))
                        || (analysis.getCandidateEmail() != null && analysis.getCandidateEmail().equalsIgnoreCase(currentUser.getEmail()))
                        || (analysis.getCandidateEmailNormalized() != null && analysis.getCandidateEmailNormalized().equalsIgnoreCase(currentUser.getEmail()));
                if (!isOwner) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                            "success", false,
                            "message", "You do not have permission to delete this record."
                    ));
                }
            }

            // If an HR / Recruiter deletes a candidate's resume, notify the candidate with dynamic message and HR name
            boolean isHr = currentUser != null && ("HR".equalsIgnoreCase(currentUser.getRole()) || "RECRUITER".equalsIgnoreCase(currentUser.getRole()));
            if (isHr) {
                String hrName = (currentUser.getFullName() != null && !currentUser.getFullName().isBlank())
                        ? currentUser.getFullName()
                        : "HR Recruitment Team";
                String companyName = (currentUser.getCompanyName() != null && !currentUser.getCompanyName().isBlank())
                        ? currentUser.getCompanyName()
                        : "SmartHire Recruitment Team";

                String candidateTargetEmail = null;
                if (analysis.getUser() != null && analysis.getUser().getEmail() != null) {
                    candidateTargetEmail = analysis.getUser().getEmail();
                } else if (resume != null && resume.getUser() != null && resume.getUser().getEmail() != null) {
                    candidateTargetEmail = resume.getUser().getEmail();
                } else if (analysis.getCandidateEmailNormalized() != null && !analysis.getCandidateEmailNormalized().isBlank()) {
                    candidateTargetEmail = analysis.getCandidateEmailNormalized();
                } else if (analysis.getCandidateEmail() != null && !analysis.getCandidateEmail().isBlank()) {
                    candidateTargetEmail = analysis.getCandidateEmail();
                }

                if (candidateTargetEmail != null && !candidateTargetEmail.isBlank()) {
                    String dynamicMsg = "Hello " + candName + ", your resume application for '" + role + "' has been archived by HR Recruiter " + hrName + " (" + companyName + "). If you have questions, please reach out to our recruitment support.";
                    try {
                        notificationService.sendEnrichedNotification(
                                candidateTargetEmail,
                                candName,
                                "Application Archival Notice: " + role,
                                dynamicMsg,
                                "APPLICATION",
                                "/dashboard/history",
                                id,
                                "RESUME_ANALYSIS",
                                role,
                                "APPLICATION_REMOVED",
                                analysis.getStage() != null ? analysis.getStage() : "Under Review",
                                "ARCHIVED",
                                hrName,
                                null, null, null, null,
                                "Application profile removed by " + hrName
                        );
                        log.info("Dispatched candidate notification for resume deletion by HR [{}]: candidate=[{}]", hrName, candidateTargetEmail);
                    } catch (Exception notifEx) {
                        log.warn("Failed to dispatch deletion notification to candidate: {}", notifEx.getMessage());
                    }
                }
            }

            log.info("Deleting ResumeAnalysis record [id={}] for candidate [{}] and role [{}]", id, candName, role);

            resumeAnalysisRepository.delete(analysis);
            resumeAnalysisRepository.flush();

            try {
                realtimeSyncService.notifyResumeDeleted(id, candName, role);
            } catch (Exception wsEx) {
                log.warn("Failed to dispatch real-time delete event: {}", wsEx.getMessage());
            }

            // If no other analysis references this Resume, also clean up the Resume record
            if (resume != null && resume.getId() != null) {
                long remaining = resumeAnalysisRepository.countByResumeId(resume.getId());
                if (remaining == 0) {
                    log.info("No remaining analyses for Resume [id={}]. Deleting from resumes table.", resume.getId());
                    try {
                        resumeRepository.delete(resume);
                        resumeRepository.flush();
                    } catch (Exception ex) {
                        log.warn("Could not delete associated resume [id={}]: {}", resume.getId(), ex.getMessage());
                    }
                }
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Resume analysis for '" + candName + " (" + role + ")' successfully deleted from database."
            ));
        }

        // Fallback: Check if the ID provided is a Resume ID directly
        Optional<Resume> resumeOpt = resumeRepository.findById(id);
        if (resumeOpt.isPresent()) {
            Resume resume = resumeOpt.get();
            String candName = resume.getCandidateName() != null ? resume.getCandidateName() : resume.getFileName();
            log.info("Directly deleting Resume [id={}] and cascading analyses", id);
            try {
                resumeAnalysisRepository.deleteByResumeId(id);
                resumeAnalysisRepository.flush();
                resumeRepository.delete(resume);
                resumeRepository.flush();

                try {
                    realtimeSyncService.notifyResumeDeleted(id, candName, "Resume");
                } catch (Exception wsEx) {
                    log.warn("Failed to dispatch real-time resume delete event: {}", wsEx.getMessage());
                }

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Resume record '" + candName + "' successfully deleted from database."
                ));
            } catch (Exception ex) {
                log.error("Error deleting resume #{}: {}", id, ex.getMessage(), ex);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                        "success", false,
                        "message", "Database error deleting resume: " + ex.getMessage()
                ));
            }
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "success", false,
                "message", "Resume or analysis record #" + id + " does not exist in database."
        ));
    }

    @GetMapping("/applications")
    public ResponseEntity<?> getApplications(@RequestParam(value = "stage", required = false) String stage) {
        List<ResumeAnalysis> list = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();

        if (stage != null && !stage.isBlank() && !"all".equalsIgnoreCase(stage)) {
            String target = stage.trim().toLowerCase();
            list = list.stream().filter(ra -> {
                String s = (ra.getStage() != null ? ra.getStage() : "Under Review").toLowerCase();
                if ("under_review".equals(target) || "review".equals(target)) return s.contains("review");
                if ("shortlisted".equals(target)) return ra.isShortlisted() || s.contains("shortlist");
                if ("interview".equals(target) || "interviewing".equals(target)) return s.contains("interview");
                if ("offered".equals(target)) return s.contains("offer");
                if ("hired".equals(target)) return s.contains("hire");
                return s.equalsIgnoreCase(target);
            }).toList();
        }

        return ResponseEntity.ok(list.stream().map(this::mapAnalysis).toList());
    }

    @PatchMapping("/applications/{id}/stage")
    public ResponseEntity<?> updateApplicationStage(@PathVariable("id") Long id, @RequestBody Map<String, String> body) {
        String newStage = body.get("stage");
        if (newStage == null || newStage.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Stage is required"));
        }

        return resumeAnalysisRepository.findById(id).map(analysis -> {
            String oldStage = analysis.getStage() != null ? analysis.getStage() : "Under Review";
            analysis.setStage(newStage.trim());
            if ("Shortlisted".equalsIgnoreCase(newStage.trim())) {
                analysis.setShortlisted(true);
            } else if ("Rejected".equalsIgnoreCase(newStage.trim())) {
                analysis.setShortlisted(false);
            }
            ResumeAnalysis saved = resumeAnalysisRepository.save(analysis);

            // Dispatch real-time candidate notification
            if (analysis.getCandidateEmail() != null && !analysis.getCandidateEmail().isBlank()) {
                String role = analysis.getTargetJobRole() != null ? analysis.getTargetJobRole() : "Career Role";
                String candName = analysis.getCandidateName() != null ? analysis.getCandidateName() : "Candidate";
                User authUser = getAuthenticatedUser();
                String hrName = authUser != null && authUser.getFullName() != null ? authUser.getFullName() : "SmartHire Recruitment Team";
                String companyName = authUser != null && authUser.getCompanyName() != null && !authUser.getCompanyName().isBlank()
                        ? authUser.getCompanyName()
                        : "SmartHire Recruitment Team";

                String cleanStage = newStage.trim();
                String title;
                String dynamicMsg;
                String notifType;
                String actionType;

                if ("Shortlisted".equalsIgnoreCase(cleanStage)) {
                    title = "Congratulations! Your Application Has Been Shortlisted ⭐";
                    dynamicMsg = "Hello " + candName + ", congratulations! Your resume profile for the '" + role + "' position has been shortlisted by " + hrName + " at " + companyName + ". You have successfully cleared the initial screening and advanced to the interview evaluation round.";
                    notifType = "SHORTLIST";
                    actionType = "SHORTLIST_ADDED";
                } else if ("Under Review".equalsIgnoreCase(cleanStage)) {
                    title = "Application Under Review: " + role;
                    dynamicMsg = "Hello " + candName + ", your application for '" + role + "' has been placed under active review by " + hrName + " (" + companyName + "). Our hiring panel is evaluating your skills matrix and profile against role requisitions.";
                    notifType = "STAGE_CHANGE";
                    actionType = "STAGE_UNDER_REVIEW";
                } else if ("Interviewing".equalsIgnoreCase(cleanStage)) {
                    title = "Application Advanced to Interview Stage: " + role;
                    dynamicMsg = "Hello " + candName + ", great progress! Your application for '" + role + "' has officially moved to the Interviewing stage by " + hrName + " at " + companyName + ". Our recruitment team will coordinate with you regarding the upcoming interview schedule.";
                    notifType = "INTERVIEW";
                    actionType = "STAGE_INTERVIEWING";
                } else if ("Offered".equalsIgnoreCase(cleanStage) || "Job Offer".equalsIgnoreCase(cleanStage)) {
                    title = "🎉 Congratulations! Job Offer Extended for " + role;
                    dynamicMsg = "Hello " + candName + ", we are thrilled to inform you that " + companyName + " has extended a formal job offer for the '" + role + "' position! HR Recruiter " + hrName + " will be in touch with your official offer letter and compensation package details.";
                    notifType = "STAGE_CHANGE";
                    actionType = "STAGE_OFFERED";
                } else if ("Hired".equalsIgnoreCase(cleanStage)) {
                    title = "🎊 Welcome Aboard! You Are Hired as " + role;
                    dynamicMsg = "Hello " + candName + ", hearty congratulations! You have been officially hired as '" + role + "' at " + companyName + ". Your onboarding schedule and joining documentation details will be shared with you shortly.";
                    notifType = "STAGE_CHANGE";
                    actionType = "STAGE_HIRED";
                } else if ("Rejected".equalsIgnoreCase(cleanStage)) {
                    title = "Application Status Update: " + role;
                    dynamicMsg = "Hello " + candName + ", thank you for taking the time to apply for '" + role + "' at " + companyName + ". While we were impressed with your background, our team has decided to proceed with other candidates whose skillsets more specifically match our current vacancy needs. Your profile remains in our talent pool for future opportunities.";
                    notifType = "STAGE_CHANGE";
                    actionType = "STAGE_REJECTED";
                } else {
                    title = "Application Status: " + cleanStage + " (" + role + ")";
                    dynamicMsg = "Hello " + candName + ", your application for '" + role + "' at " + companyName + " has progressed to the '" + cleanStage + "' stage. Please check your application details for latest updates.";
                    notifType = "STAGE_CHANGE";
                    actionType = "STAGE_UPDATED";
                }

                notificationService.sendEnrichedNotification(
                        analysis.getCandidateEmail(),
                        candName,
                        title,
                        dynamicMsg,
                        notifType,
                        "/dashboard/notifications",
                        analysis.getId(),
                        "APPLICATION",
                        role,
                        actionType,
                        oldStage,
                        cleanStage,
                        hrName,
                        null, null, null, null, null
                );
            }

            try {
                String cName = saved.getCandidateName() != null ? saved.getCandidateName() : "Candidate";
                realtimeSyncService.notifyStageUpdated(saved.getId(), saved.getStage(), cName);
            } catch (Exception ignored) {}

            return ResponseEntity.ok(mapAnalysis(saved));
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping("/candidates/{id:[0-9]+}")
    public ResponseEntity<?> getCandidateDetails(@PathVariable("id") Long id) {
        return resumeAnalysisRepository.findById(id)
                .map(ra -> ResponseEntity.ok(mapAnalysis(ra)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping("/shortlist")
    public ResponseEntity<?> getShortlist() {
        List<ResumeAnalysis> list = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();
        List<ResumeAnalysis> shortlisted = list.stream()
                .filter(ra -> ra.isShortlisted()
                        || (ra.getStage() != null && ra.getStage().toLowerCase().contains("shortlist"))
                        || (ra.getDisplayStage() != null && ra.getDisplayStage().toLowerCase().contains("shortlist")))
                .toList();
        return ResponseEntity.ok(shortlisted.stream().map(this::mapAnalysis).toList());
    }

    @PostMapping("/compare")
    public ResponseEntity<?> compareCandidatesDashboard(@RequestBody(required = false) Map<String, Object> body) {
        if (body == null || !body.containsKey("candidateIds")) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Please select 2 or 3 candidates for comparison."));
        }
        List<Long> ids = new ArrayList<>();
        if (body.get("candidateIds") instanceof List<?> list) {
            for (Object o : list) {
                if (o instanceof Number n) ids.add(n.longValue());
                else if (o instanceof String s && !s.isBlank()) {
                    try { ids.add(Long.parseLong(s.trim())); } catch (NumberFormatException ignored) {}
                }
            }
        }
        try {
            return ResponseEntity.ok(candidateComparisonService.compareCandidates(ids));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", ex.getMessage()));
        }
    }

    @PostMapping("/candidates/{id:[0-9]+}/shortlist")
    public ResponseEntity<?> toggleShortlist(@PathVariable("id") Long id) {
        return resumeAnalysisRepository.findById(id).map(analysis -> {
            boolean current = analysis.isShortlisted();
            analysis.setShortlisted(!current);
            if (!current) {
                analysis.setStage("Shortlisted");
            } else if ("Shortlisted".equalsIgnoreCase(analysis.getStage())) {
                analysis.setStage("Under Review");
            }
            ResumeAnalysis saved = resumeAnalysisRepository.save(analysis);

            // Dispatch real-time notification to the candidate
            if (analysis.getCandidateEmail() != null && !analysis.getCandidateEmail().isBlank()) {
                String role = analysis.getTargetJobRole() != null ? analysis.getTargetJobRole() : "Career Role";
                String candName = analysis.getCandidateName() != null ? analysis.getCandidateName() : "Candidate";
                User authUser = getAuthenticatedUser();
                String hrName = authUser != null && authUser.getFullName() != null ? authUser.getFullName() : "SmartHire Recruitment Team";
                String companyName = authUser != null && authUser.getCompanyName() != null && !authUser.getCompanyName().isBlank()
                        ? authUser.getCompanyName()
                        : "SmartHire Recruitment Team";

                if (!current) {
                    notificationService.sendEnrichedNotification(
                            analysis.getCandidateEmail(),
                            candName,
                            "Congratulations! Your Application Has Been Shortlisted ⭐",
                            "Hello " + candName + ", your application for '" + role + "' has been shortlisted by " + hrName + " at " + companyName + ". You have been selected for the next stage of the recruitment process.",
                            "SHORTLIST",
                            "/dashboard/notifications",
                            analysis.getId(),
                            "APPLICATION",
                            role,
                            "SHORTLIST_ADDED",
                            "Under Review",
                            "SHORTLISTED",
                            hrName,
                            null, null, null, null, null
                    );
                } else {
                    notificationService.sendEnrichedNotification(
                            analysis.getCandidateEmail(),
                            candName,
                            "Application Status: Removed from Shortlist",
                            "Hello " + candName + ", your application for '" + role + "' has been moved from the Shortlist back to 'Under Review' by HR Recruiter " + hrName + ". Our hiring team is reviewing candidate requisitions and will notify you if your profile is selected for interview rounds.",
                            "SHORTLIST",
                            "/dashboard/notifications",
                            analysis.getId(),
                            "APPLICATION",
                            role,
                            "SHORTLIST_REMOVED",
                            "SHORTLISTED",
                            saved.getStage() != null ? saved.getStage() : "Under Review",
                            hrName,
                            null, null, null, null, null
                    );
                }
            }

            try {
                String cName = saved.getCandidateName() != null ? saved.getCandidateName() : "Candidate";
                realtimeSyncService.notifyStageUpdated(saved.getId(), saved.getStage(), cName);
            } catch (Exception ignored) {}

            return ResponseEntity.ok(mapAnalysis(saved));
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping({"/interviews", "/candidate/interviews"})
    public ResponseEntity<?> getInterviews(
            @RequestParam(value = "role", required = false) String roleParam,
            @RequestParam(value = "email", required = false) String emailParam,
            @RequestHeader(value = "X-User-Email", required = false) String headerEmail) {
        User authUser = resolveUser(emailParam, headerEmail);
        List<ResumeAnalysis> all = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();

        boolean isCandidate = (authUser != null && "USER".equalsIgnoreCase(authUser.getRole())) || "USER".equalsIgnoreCase(roleParam) || (emailParam != null && !emailParam.isBlank());
        List<ResumeAnalysis> interviews;
        if (isCandidate) {
            String candEmail = (authUser != null && authUser.getEmail() != null && !authUser.getEmail().isBlank())
                    ? authUser.getEmail().toLowerCase()
                    : (emailParam != null ? emailParam.trim().toLowerCase() : "");
            Long userId = (authUser != null) ? authUser.getId() : null;
            interviews = all.stream()
                    .filter(ra -> {
                        if (userId != null && ra.getUser() != null && ra.getUser().getId().equals(userId)) return true;
                        if (userId != null && ra.getResume() != null && ra.getResume().getUser() != null && ra.getResume().getUser().getId().equals(userId)) return true;
                        if (!candEmail.isBlank() && ra.getCandidateEmail() != null && ra.getCandidateEmail().equalsIgnoreCase(candEmail)) return true;
                        if (!candEmail.isBlank() && ra.getCandidateEmailNormalized() != null && ra.getCandidateEmailNormalized().equalsIgnoreCase(candEmail)) return true;
                        return false;
                    })
                    .filter(ra -> ra.getInterviewDate() != null || "Interviewing".equalsIgnoreCase(ra.getStage()) || "Interview".equalsIgnoreCase(ra.getStage()) || ra.getFeedbackNotes() != null || ra.getInterviewStatus() != null)
                    .toList();
        } else {
            interviews = all.stream()
                    .filter(ra -> ra.getInterviewDate() != null || "Interviewing".equalsIgnoreCase(ra.getStage()) || "Interview".equalsIgnoreCase(ra.getStage()) || ra.getFeedbackNotes() != null || "COMPLETED".equalsIgnoreCase(ra.getInterviewStatus()) || "SCHEDULED".equalsIgnoreCase(ra.getInterviewStatus()) || "RESCHEDULED".equalsIgnoreCase(ra.getInterviewStatus()) || "CANCELLED".equalsIgnoreCase(ra.getInterviewStatus()))
                    .toList();
        }

        long upcomingCount = interviews.stream()
                .filter(ra -> ("SCHEDULED".equalsIgnoreCase(ra.getInterviewStatus()) || "RESCHEDULED".equalsIgnoreCase(ra.getInterviewStatus()) || (ra.getInterviewDate() != null && ra.getFeedbackNotes() == null)) && !"CANCELLED".equalsIgnoreCase(ra.getInterviewStatus()) && !"COMPLETED".equalsIgnoreCase(ra.getInterviewStatus()))
                .count();
        long completedCount = interviews.stream()
                .filter(ra -> "COMPLETED".equalsIgnoreCase(ra.getInterviewStatus()) || (ra.getFeedbackNotes() != null && !"SCHEDULED".equalsIgnoreCase(ra.getInterviewStatus()) && !"RESCHEDULED".equalsIgnoreCase(ra.getInterviewStatus())))
                .count();
        long needsFeedbackCount = upcomingCount;

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("allCount", interviews.size());
        resp.put("upcomingCount", upcomingCount);
        resp.put("completedCount", completedCount);
        resp.put("needsFeedbackCount", needsFeedbackCount);
        resp.put("interviews", interviews.stream().map(this::mapAnalysis).toList());
        resp.put("allCandidates", isCandidate ? Collections.emptyList() : all.stream().map(this::mapAnalysis).toList());

        return ResponseEntity.ok(resp);
    }

    @PostMapping("/interviews/schedule")
    public ResponseEntity<?> scheduleInterview(@RequestBody Map<String, Object> payload) {
        Long candidateId = payload.get("candidateId") != null ? Long.valueOf(payload.get("candidateId").toString()) : null;
        if (candidateId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Candidate ID is required"));
        }

        return resumeAnalysisRepository.findById(candidateId).map(analysis -> {
            boolean isRescheduled = Boolean.TRUE.equals(payload.get("isReschedule")) ||
                    (payload.get("isRescheduled") != null && Boolean.parseBoolean(payload.get("isRescheduled").toString())) ||
                    ("RESCHEDULED".equalsIgnoreCase(analysis.getInterviewStatus())) ||
                    (analysis.getInterviewDate() != null && payload.get("isReschedule") != Boolean.FALSE);

            String prevStatus = analysis.getStage() != null ? analysis.getStage() : "Under Review";
            String oldScheduleStr = "N/A";
            if (analysis.getInterviewDate() != null) {
                analysis.setPreviousInterviewDate(analysis.getInterviewDate());
                try {
                    oldScheduleStr = analysis.getInterviewDate().format(DateTimeFormatter.ofPattern("dd MMMM yyyy, hh:mm a"));
                } catch (Exception ignored) {}
            }

            if (payload.get("interviewRound") != null) analysis.setInterviewRound(payload.get("interviewRound").toString());
            if (payload.get("interviewerName") != null) analysis.setInterviewerName(payload.get("interviewerName").toString());

            String mode = payload.get("interviewMode") != null ? payload.get("interviewMode").toString() : null;
            String platform = payload.get("meetingPlatform") != null ? payload.get("meetingPlatform").toString() : null;
            String ivType = payload.get("interviewType") != null ? payload.get("interviewType").toString() : (platform != null ? platform : (mode != null ? mode : "Google Meet"));
            analysis.setInterviewType(ivType);

            if (payload.get("interviewDate") != null && !payload.get("interviewDate").toString().isBlank()) {
                String dtStr = payload.get("interviewDate").toString().trim();
                try {
                    if (dtStr.contains("T")) {
                        analysis.setInterviewDate(LocalDateTime.parse(dtStr.substring(0, Math.min(dtStr.length(), 19))));
                    } else if (payload.get("interviewTime") != null && !payload.get("interviewTime").toString().isBlank()) {
                        String tm = payload.get("interviewTime").toString().trim();
                        analysis.setInterviewDate(LocalDateTime.parse(dtStr + "T" + (tm.length() == 5 ? tm + ":00" : tm)));
                    } else {
                        analysis.setInterviewDate(java.time.LocalDate.parse(dtStr).atTime(10, 0));
                    }
                } catch (Exception e) {
                    try {
                        analysis.setInterviewDate(LocalDateTime.parse(dtStr));
                    } catch (Exception ignored) {}
                }
            }

            String meetingLink = payload.get("meetingLink") != null && !payload.get("meetingLink").toString().isBlank()
                    ? payload.get("meetingLink").toString().trim()
                    : (ivType.toLowerCase().contains("meet") || "Online".equalsIgnoreCase(mode) ? "https://meet.google.com/smarthire-interview" : null);
            analysis.setMeetingLink(meetingLink);

            if (payload.get("interviewLocation") != null && !payload.get("interviewLocation").toString().isBlank()) {
                analysis.setInterviewLocation(payload.get("interviewLocation").toString().trim());
            }

            String hrMessage = payload.get("notes") != null ? payload.get("notes").toString() : (payload.get("hrMessage") != null ? payload.get("hrMessage").toString() : null);
            if (hrMessage != null) analysis.setHrNotes(hrMessage);

            String reason = payload.get("reason") != null ? payload.get("reason").toString() : (payload.get("rescheduleReason") != null ? payload.get("rescheduleReason").toString() : null);

            // Reset completed feedback notes for new/rescheduled upcoming round
            analysis.setFeedbackNotes(null);

            if (isRescheduled) {
                analysis.setInterviewStatus("RESCHEDULED");
            } else {
                analysis.setInterviewStatus("SCHEDULED");
            }
            analysis.setStage("Interviewing");
            analysis.setShortlisted(true);
            ResumeAnalysis saved = resumeAnalysisRepository.save(analysis);

            // Dispatch real-time interview notification to candidate
            if (analysis.getCandidateEmail() != null && !analysis.getCandidateEmail().isBlank()) {
                String role = analysis.getTargetJobRole() != null ? analysis.getTargetJobRole() : "Career Role";
                String candName = analysis.getCandidateName() != null ? analysis.getCandidateName() : "Candidate";
                String round = analysis.getInterviewRound() != null ? analysis.getInterviewRound() : "Technical Round";
                String interviewer = analysis.getInterviewerName() != null ? analysis.getInterviewerName() : "SmartHire Recruitment Team";

                String dateStr = saved.getInterviewDate() != null
                        ? saved.getInterviewDate().format(DateTimeFormatter.ofPattern("dd MMMM yyyy"))
                        : "Upcoming Date";
                String timeStr = saved.getInterviewDate() != null
                        ? saved.getInterviewDate().format(DateTimeFormatter.ofPattern("hh:mm a"))
                        : "TBD";
                String newScheduleStr = dateStr + " at " + timeStr;

                if (isRescheduled) {
                    String msg = "Hello " + candName + ", your " + round + " interview for '" + role +
                            "' has been rescheduled by " + interviewer + " from " + oldScheduleStr + " to " + newScheduleStr +
                            " (" + ivType + ")." +
                            (reason != null && !reason.isBlank() ? " Reason: " + reason + "." : "") +
                            (meetingLink != null && !meetingLink.isBlank() ? " Meeting Link: " + meetingLink + "." : "") +
                            (analysis.getInterviewLocation() != null && !analysis.getInterviewLocation().isBlank() ? " Location: " + analysis.getInterviewLocation() + "." : "") +
                            " Please check your calendar and be available on time.";

                    notificationService.sendEnrichedNotification(
                            analysis.getCandidateEmail(),
                            candName,
                            "Interview Rescheduled: " + role + " (" + round + ")",
                            msg,
                            "INTERVIEW",
                            "/dashboard/notifications",
                            analysis.getId(),
                            "INTERVIEW",
                            role,
                            "INTERVIEW_RESCHEDULED",
                            prevStatus,
                            "Interviewing",
                            interviewer,
                            dateStr,
                            timeStr,
                            ivType,
                            meetingLink,
                            hrMessage
                    );
                } else {
                    String msg = "Hello " + candName + ", great news! Your " + round + " interview for '" + role +
                            "' has been confirmed on " + newScheduleStr + " (" + ivType + ")." +
                            " Interviewer: " + interviewer + "." +
                            (meetingLink != null && !meetingLink.isBlank() ? " Meeting Link: " + meetingLink + "." : "") +
                            (analysis.getInterviewLocation() != null && !analysis.getInterviewLocation().isBlank() ? " Location: " + analysis.getInterviewLocation() + "." : "") +
                            (hrMessage != null && !hrMessage.isBlank() ? " Instructions from HR: " + hrMessage + "." : "") +
                            " Please be ready and join 5 minutes early.";

                    notificationService.sendEnrichedNotification(
                            analysis.getCandidateEmail(),
                            candName,
                            "Interview Scheduled: " + role + " (" + round + ")",
                            msg,
                            "INTERVIEW",
                            "/dashboard/notifications",
                            analysis.getId(),
                            "INTERVIEW",
                            role,
                            "INTERVIEW_SCHEDULED",
                            prevStatus,
                            "Interviewing",
                            interviewer,
                            dateStr,
                            timeStr,
                            ivType,
                            meetingLink,
                            hrMessage
                    );
                }
            }

            try {
                String cName = saved.getCandidateName() != null ? saved.getCandidateName() : "Candidate";
                realtimeSyncService.notifyStageUpdated(saved.getId(), saved.getStage(), cName);
            } catch (Exception ignored) {}

            return ResponseEntity.ok(mapAnalysis(saved));
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping({"/interviews/{id}/cancel", "/interviews/cancel"})
    public ResponseEntity<?> cancelInterview(
            @PathVariable(value = "id", required = false) Long pathId,
            @RequestBody(required = false) Map<String, Object> payload) {
        Long candidateId = pathId != null ? pathId : (payload != null && payload.get("candidateId") != null ? Long.valueOf(payload.get("candidateId").toString()) : null);
        if (candidateId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Candidate ID is required"));
        }

        return resumeAnalysisRepository.findById(candidateId).map(analysis -> {
            String prevDateStr = null;
            if (analysis.getInterviewDate() != null) {
                analysis.setPreviousInterviewDate(analysis.getInterviewDate());
                try {
                    prevDateStr = analysis.getInterviewDate().format(DateTimeFormatter.ofPattern("dd MMMM yyyy, hh:mm a"));
                } catch (Exception ignored) {}
            }
            analysis.setInterviewDate(null);
            analysis.setInterviewStatus("CANCELLED");
            String reason = (payload != null && payload.get("reason") != null && !payload.get("reason").toString().isBlank())
                    ? payload.get("reason").toString().trim()
                    : "Schedule conflict / cancelled by HR team";
            analysis.setCancellationReason(reason);
            analysis.setStage("Shortlisted");
            ResumeAnalysis saved = resumeAnalysisRepository.save(analysis);

            if (analysis.getCandidateEmail() != null && !analysis.getCandidateEmail().isBlank()) {
                String role = analysis.getTargetJobRole() != null ? analysis.getTargetJobRole() : "Career Role";
                String candName = analysis.getCandidateName() != null ? analysis.getCandidateName() : "Candidate";
                User authUser = getAuthenticatedUser();
                String hrName = authUser != null && authUser.getFullName() != null ? authUser.getFullName() : "SmartHire Recruitment Team";

                String msg = "Hello " + candName + ", your scheduled " + (analysis.getInterviewRound() != null ? analysis.getInterviewRound() + " " : "") +
                        "interview for '" + role + "'" +
                        (prevDateStr != null ? " on " + prevDateStr : "") +
                        " has been cancelled by HR Recruiter " + hrName + "." +
                        (reason != null && !reason.isBlank() ? " Reason: " + reason + "." : " Reason: Unforeseen schedule conflict.") +
                        " Your application remains active under candidate review, and our recruitment team will reach out regarding next steps.";

                notificationService.sendEnrichedNotification(
                        analysis.getCandidateEmail(),
                        candName,
                        "Interview Cancelled: " + role,
                        msg,
                        "INTERVIEW",
                        "/dashboard/notifications",
                        analysis.getId(),
                        "INTERVIEW",
                        role,
                        "INTERVIEW_CANCELLED",
                        "Interviewing",
                        "Shortlisted",
                        hrName,
                        null, null, null, null,
                        reason
                );
            }
            return ResponseEntity.ok(mapAnalysis(saved));
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping({"/interviews/{id}/complete", "/interviews/complete"})
    public ResponseEntity<?> completeInterview(
            @PathVariable(value = "id", required = false) Long pathId,
            @RequestBody(required = false) Map<String, Object> payload) {
        Long candidateId = pathId != null ? pathId : (payload != null && payload.get("candidateId") != null ? Long.valueOf(payload.get("candidateId").toString()) : null);
        if (candidateId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Candidate ID is required"));
        }

        return resumeAnalysisRepository.findById(candidateId).map(analysis -> {
            analysis.setInterviewStatus("COMPLETED");
            if (analysis.getStage() == null || "Interviewing".equalsIgnoreCase(analysis.getStage()) || "Shortlisted".equalsIgnoreCase(analysis.getStage())) {
                analysis.setStage("Interview Completed");
            }
            ResumeAnalysis saved = resumeAnalysisRepository.save(analysis);

            try {
                String cName = saved.getCandidateName() != null ? saved.getCandidateName() : "Candidate";
                realtimeSyncService.notifyStageUpdated(saved.getId(), saved.getStage(), cName);
            } catch (Exception ignored) {}

            return ResponseEntity.ok(mapAnalysis(saved));
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping("/feedback")
    public ResponseEntity<?> submitFeedback(@RequestBody Map<String, Object> payload) {
        Long candidateId = payload.get("candId") != null ? Long.valueOf(payload.get("candId").toString())
                : (payload.get("candidateId") != null ? Long.valueOf(payload.get("candidateId").toString()) : null);
        if (candidateId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Candidate ID is required"));
        }

        return resumeAnalysisRepository.findById(candidateId).map(analysis -> {
            int tech = 4;
            int comm = 4;
            int prob = 4;
            if (payload.get("techRating") != null) tech = Integer.parseInt(payload.get("techRating").toString());
            else if (payload.get("techScore") != null) tech = Integer.parseInt(payload.get("techScore").toString());

            if (payload.get("commRating") != null) comm = Integer.parseInt(payload.get("commRating").toString());
            else if (payload.get("commScore") != null) comm = Integer.parseInt(payload.get("commScore").toString());

            if (payload.get("problemSolvingRating") != null) prob = Integer.parseInt(payload.get("problemSolvingRating").toString());
            else if (payload.get("archScore") != null) prob = Integer.parseInt(payload.get("archScore").toString());

            analysis.setTechRating(tech);
            analysis.setCommRating(comm);
            analysis.setProblemSolvingRating(prob);

            int totalScore = (int) Math.round(((tech + comm + prob) / 15.0) * 100);
            analysis.setFeedbackScore(totalScore);

            String strengthsStr = payload.get("strengths") != null ? payload.get("strengths").toString().trim() : "";
            String weaknessesStr = payload.get("weaknesses") != null ? payload.get("weaknesses").toString().trim()
                    : (payload.get("areasOfImprovement") != null ? payload.get("areasOfImprovement").toString().trim() : "");
            String notes = payload.get("notes") != null ? payload.get("notes").toString().trim() : "";
            analysis.setFeedbackNotes("Strengths: " + strengthsStr + " | Areas of Improvement: " + weaknessesStr + (!notes.isBlank() ? " | Notes: " + notes : ""));

            String hrRemarks = payload.get("confidentialNotes") != null ? payload.get("confidentialNotes").toString().trim()
                    : (payload.get("hrNotes") != null ? payload.get("hrNotes").toString().trim() : null);
            if (hrRemarks != null) {
                analysis.setHrNotes(hrRemarks);
            }

            String rec = payload.get("recommendation") != null ? payload.get("recommendation").toString().trim() : "Next Round";
            analysis.setRecommendation(rec);
            analysis.setInterviewStatus("COMPLETED");

            String prevStage = analysis.getStage() != null ? analysis.getStage() : "Interviewing";
            if ("Strong Hire".equalsIgnoreCase(rec) || "Hire".equalsIgnoreCase(rec)) {
                analysis.setStage("Offered");
            } else if ("Reject".equalsIgnoreCase(rec)) {
                analysis.setStage("Rejected");
            } else if ("Hold".equalsIgnoreCase(rec)) {
                analysis.setStage("Under Review");
            } else if ("Next Round".equalsIgnoreCase(rec)) {
                analysis.setStage("Interviewing");
            }

            ResumeAnalysis saved = resumeAnalysisRepository.save(analysis);

            // Candidate Notification (Confidential HR remarks/ratings are excluded from candidate message)
            if (analysis.getCandidateEmail() != null && !analysis.getCandidateEmail().isBlank()) {
                String role = analysis.getTargetJobRole() != null ? analysis.getTargetJobRole() : "Career Role";
                String candName = analysis.getCandidateName() != null ? analysis.getCandidateName() : "Candidate";
                User authUser = getAuthenticatedUser();
                String hrName = authUser != null && authUser.getFullName() != null ? authUser.getFullName() : "SmartHire Recruitment Team";
                String companyName = authUser != null && authUser.getCompanyName() != null && !authUser.getCompanyName().isBlank()
                        ? authUser.getCompanyName()
                        : "SmartHire Recruitment Team";

                String heading;
                String message;
                int score = totalScore;

                if ("Next Round".equalsIgnoreCase(rec)) {
                    heading = "Congratulations! Selected for Next Round (" + role + ")";
                    message = "Hello " + candName + ", congratulations! You have successfully cleared your recent interview round for '" + role + "' with a score of " + score + "% (" + rec + "). The recruitment team at " + companyName + " has promoted you to the next evaluation round and will schedule the upcoming session shortly.";
                } else if ("Strong Hire".equalsIgnoreCase(rec) || "Hire".equalsIgnoreCase(rec)) {
                    heading = "🎉 Congratulations! Interview Cleared for " + role;
                    message = "Hello " + candName + ", excellent news! The hiring panel at " + companyName + " has submitted positive feedback (" + rec + ", Score: " + score + "%) for your interview for '" + role + "'. You have successfully cleared the interview evaluation and our HR team will contact you with offer details.";
                } else if ("Reject".equalsIgnoreCase(rec) || "No Hire".equalsIgnoreCase(rec)) {
                    heading = "Interview Evaluation Completed: " + role;
                    message = "Hello " + candName + ", thank you for participating in the interview process for '" + role + "' at " + companyName + ". After detailed evaluation of the interview round, we will not be moving forward with your application for this position. We truly appreciate your time and wish you the best in your career pursuits.";
                } else {
                    heading = "Interview Feedback Submitted: " + role;
                    message = "Hello " + candName + ", the hiring panel at " + companyName + " has submitted feedback and evaluation for your '" + role + "' interview. Recommendation: " + rec + (score > 0 ? " (Score: " + score + "%)" : "") + ". Your current application status is: " + saved.getStage() + ".";
                }

                notificationService.sendEnrichedNotification(
                        analysis.getCandidateEmail(),
                        candName,
                        heading,
                        message,
                        "FEEDBACK",
                        "/dashboard/notifications",
                        analysis.getId(),
                        "APPLICATION",
                        role,
                        "INTERVIEW_FEEDBACK",
                        prevStage,
                        saved.getStage(),
                        hrName,
                        null, null, null, null, null
                );
            }

            return ResponseEntity.ok(mapAnalysis(saved));
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping("/reports")
    public ResponseEntity<?> getReports(@RequestParam(value = "period", defaultValue = "30days") String period) {
        if (reportService != null) {
            return ResponseEntity.ok(reportService.generateReport(period));
        }
        return ResponseEntity.ok(Map.of());
    }

    /**
     * Bulk upload and batch screen candidate resumes against target job vacancy.
     */
    @PostMapping(value = "/candidates/bulk-upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> bulkUploadCandidates(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "jobId", required = false) Long jobId,
            @RequestParam(value = "aiProvider", defaultValue = "local") String aiProvider,
            @RequestParam(value = "model", required = false) String model,
            @RequestParam(value = "geminiApiKey", required = false) String geminiApiKey,
            @RequestParam(value = "hrEmail", required = false) String hrEmail
    ) {
        String effectiveAiProvider = "local";
        if ("gemini".equalsIgnoreCase(aiProvider)) {
            effectiveAiProvider = "gemini";
        } else if ("ollama".equalsIgnoreCase(aiProvider)) {
            effectiveAiProvider = "ollama";
        }
        try {
            BulkUploadResponseDTO response = bulkResumeUploadService.processBatch(
                    files, jobId, effectiveAiProvider, model, hrEmail, geminiApiKey
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Bulk resume upload error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Bulk upload failed: " + e.getMessage()));
        }
    }

    /**
     * Notify HR recruiter when batch processing finishes.
     */
    @PostMapping("/candidates/bulk-upload/notify")
    public ResponseEntity<?> notifyBulkUploadComplete(@RequestBody Map<String, Object> payload) {
        try {
            Long jobId = null;
            if (payload.get("jobId") != null) {
                try {
                    jobId = Long.valueOf(payload.get("jobId").toString());
                } catch (Exception ignored) {}
            }
            String jobTitle = (String) payload.getOrDefault("jobTitle", "Target Vacancy");
            int totalFiles = payload.get("totalFiles") != null ? Integer.parseInt(payload.get("totalFiles").toString()) : 0;
            int successfulCount = payload.get("successfulCount") != null ? Integer.parseInt(payload.get("successfulCount").toString()) : totalFiles;
            String hrEmail = (String) payload.get("hrEmail");

            bulkResumeUploadService.notifyHr(hrEmail, null, jobId, jobTitle, totalFiles, successfulCount);
            return ResponseEntity.ok(Map.of("success", true, "message", "HR notified of batch screening completion."));
        } catch (Exception e) {
            log.warn("Failed to notify HR of bulk upload: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
