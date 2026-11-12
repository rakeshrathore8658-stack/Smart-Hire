package com.smarthire.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.entity.Job;
import com.smarthire.entity.ResumeAnalysis;
import com.smarthire.entity.User;
import com.smarthire.repository.ResumeAnalysisRepository;
import com.smarthire.repository.UserRepository;
import com.smarthire.service.JobService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;

import com.smarthire.dto.ATSAnalysisDTO;
import com.smarthire.dto.CandidateInfoDTO;
import com.smarthire.dto.RecruitmentReportDTO;
import com.smarthire.entity.Notification;
import com.smarthire.entity.Resume;
import com.smarthire.repository.ResumeRepository;
import com.smarthire.service.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class PageController {

    private final JobService jobService;
    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ReportService reportService;
    private final ResumeParserService resumeParserService;
    private final ResumeNormalizationService resumeNormalizationService;
    private final ResumeExtractionService resumeExtractionService;
    private final ResumeRepository resumeRepository;
    private final ResumeAnalysisService resumeAnalysisService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PageController(
            JobService jobService,
            ResumeAnalysisRepository resumeAnalysisRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            ReportService reportService,
            ResumeParserService resumeParserService,
            ResumeNormalizationService resumeNormalizationService,
            ResumeExtractionService resumeExtractionService,
            ResumeRepository resumeRepository,
            ResumeAnalysisService resumeAnalysisService,
            NotificationService notificationService) {
        this.jobService = jobService;
        this.resumeAnalysisRepository = resumeAnalysisRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.reportService = reportService;
        this.resumeParserService = resumeParserService;
        this.resumeNormalizationService = resumeNormalizationService;
        this.resumeExtractionService = resumeExtractionService;
        this.resumeRepository = resumeRepository;
        this.resumeAnalysisService = resumeAnalysisService;
        this.notificationService = notificationService;
    }

    private HttpSession getSession()
    {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            return (attrs != null) ? attrs.getRequest().getSession(true) : null;
        } catch (Throwable t) {
            return null;
        }
    }

    private boolean isHr(HttpSession session) {
        String role = getSessionRole(session);
        return "HR".equalsIgnoreCase(role) || "RECRUITER".equalsIgnoreCase(role);
    }

    // ==========================================
    // PUBLIC HOME PAGE
    // ==========================================

    @GetMapping("/")
    public String home() {
        return "index";
    }

    // ==========================================
    // COMMON DASHBOARD PAGES
    // ==========================================

    @GetMapping("/dashboard")
    public String dashboard(
            @RequestParam(value = "role", required = false) String roleParam,
            Model model) {

        HttpSession session = getSession();
        String sessionRole = (session != null) ? (String) session.getAttribute("userRole") : null;

        String activeRole;
        if (sessionRole != null && !sessionRole.isBlank()) {
            activeRole = sessionRole.toUpperCase();
        } else if (roleParam != null && !roleParam.isBlank()) {
            activeRole = roleParam.toUpperCase();
            if (session != null) {
                session.setAttribute("userRole", activeRole);
            }
        } else {
            activeRole = "USER";
        }

        setupCommonModel(model, session, activeRole);

        // Populate dynamic data
        List<ResumeAnalysis> allAnalyses = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();
        List<Job> allJobs = jobService.getAllJobs();

        if ("HR".equalsIgnoreCase(activeRole) || "RECRUITER".equalsIgnoreCase(activeRole)) {
            int candidateCount = allAnalyses.size();
            int aiScreenedCount = (int) allAnalyses.stream().filter(a -> a.getOverallScore() >= 70).count();
            int shortlistedCount = (int) allAnalyses.stream().filter(a -> a.isShortlisted() || "Shortlisted".equalsIgnoreCase(a.getStage())).count();
            int awaitingReviewCount = (int) allAnalyses.stream().filter(a -> "Under Review".equalsIgnoreCase(a.getStage()) || a.getStage() == null).count();
            int interviewsCount = (int) allAnalyses.stream().filter(a -> "Interviewing".equalsIgnoreCase(a.getStage()) || a.getInterviewDate() != null).count();
            int offeredCount = (int) allAnalyses.stream().filter(a -> "Offered".equalsIgnoreCase(a.getStage()) || "Strong Hire".equalsIgnoreCase(a.getRecommendation())).count();
            int hiredCount = (int) allAnalyses.stream().filter(a -> "Hired".equalsIgnoreCase(a.getStage()) || "Hired".equalsIgnoreCase(a.getStatus())).count();

            model.addAttribute("recentJobs", allJobs.stream().limit(5).toList());
            model.addAttribute("totalJobsCount", allJobs.size());
            model.addAttribute("totalCandidatesCount", candidateCount);
            model.addAttribute("totalApplicationsCount", candidateCount);
            model.addAttribute("aiScreenedCount", aiScreenedCount);
            model.addAttribute("awaitingReviewCount", awaitingReviewCount);
            model.addAttribute("shortlistedCount", shortlistedCount);
            model.addAttribute("interviewsCount", interviewsCount);
            model.addAttribute("offeredCount", offeredCount);
            model.addAttribute("hiredCount", hiredCount);

            RecruitmentReportDTO report = (reportService != null) ? reportService.generateReport("30days") : null;
            model.addAttribute("report", report);

            List<ResumeAnalysis> topCandidates = resumeAnalysisRepository.findTop5ByOrderByOverallScoreDesc();
            if (topCandidates.isEmpty()) {
                topCandidates = allAnalyses.stream().limit(5).toList();
            }
            model.addAttribute("topCandidates", topCandidates);

            List<ResumeAnalysis> interviews = allAnalyses.stream()
                    .filter(a -> a.getInterviewDate() != null || "Interviewing".equalsIgnoreCase(a.getStage()))
                    .limit(5)
                    .toList();
            if (interviews.isEmpty()) {
                interviews = allAnalyses.stream().limit(3).toList();
            }
            model.addAttribute("upcomingInterviews", interviews);
        } else {
            String activeUserEmail = (String) model.getAttribute("userEmail");
            String normEmail = com.smarthire.service.CandidateNormalizationUtils.normalizeEmail(activeUserEmail);
            List<ResumeAnalysis> userAnalyses = new ArrayList<>();
            if (normEmail != null) {
                userAnalyses.addAll(resumeAnalysisRepository.findByCandidateEmailNormalizedOrderByCreatedAtDesc(normEmail));
            }
            if (activeUserEmail != null) {
                Optional<User> uOpt = userRepository.findByEmail(activeUserEmail.trim().toLowerCase());
                if (uOpt.isPresent()) {
                    List<Resume> userResumes = resumeRepository.findByUserIdOrderByCreatedAtDesc(uOpt.get().getId());
                    if (!userResumes.isEmpty()) {
                        Set<Long> resumeIds = new HashSet<>();
                        for (Resume r : userResumes) {
                            if (r.getId() != null) resumeIds.add(r.getId());
                        }
                        List<ResumeAnalysis> linked = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc().stream()
                                .filter(ra -> ra.getResume() != null && resumeIds.contains(ra.getResume().getId()))
                                .toList();
                        for (ResumeAnalysis ra : linked) {
                            if (userAnalyses.stream().noneMatch(c -> c.getId().equals(ra.getId()))) {
                                userAnalyses.add(ra);
                            }
                        }
                    }
                }
            }
            userAnalyses.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
            if (userAnalyses.isEmpty()) {
                userAnalyses = allAnalyses;
            }

            model.addAttribute("recentAnalyses", userAnalyses.stream().limit(5).toList());
            if (!userAnalyses.isEmpty()) {
                ResumeAnalysis latestAnalysis = userAnalyses.get(0);
                model.addAttribute("latestAnalysis", latestAnalysis);
                model.addAttribute("latestTargetRole", latestAnalysis.getTargetJobRole() != null ? latestAnalysis.getTargetJobRole() : "General");
                model.addAttribute("latestAnalysisDate", latestAnalysis.getFormattedDate() != null ? latestAnalysis.getFormattedDate() : "Recent");

                double avg = userAnalyses.stream().mapToInt(ResumeAnalysis::getOverallScore).average().orElse(0.0);
                double avgSkills = userAnalyses.stream().mapToInt(ResumeAnalysis::getSkillsScore).average().orElse(0.0);
                int maxScore = userAnalyses.stream().mapToInt(ResumeAnalysis::getOverallScore).max().orElse(0);

                model.addAttribute("totalAnalyses", userAnalyses.size());
                model.addAttribute("averageAtsScore", Math.round(avg * 10.0) / 10.0);
                model.addAttribute("averageSkillMatch", Math.round(avgSkills * 10.0) / 10.0);
                model.addAttribute("highestScore", maxScore);
            } else {
                model.addAttribute("latestAnalysis", null);
                model.addAttribute("latestTargetRole", "None");
                model.addAttribute("latestAnalysisDate", "No scans yet");
                model.addAttribute("totalAnalyses", 0);
                model.addAttribute("averageAtsScore", 0);
                model.addAttribute("averageSkillMatch", 0);
                model.addAttribute("highestScore", 0);
            }
        }

        return "dashboard/index";
    }

    @GetMapping("/dashboard/profile")
    public String profile(
            @RequestParam(value = "saved", required = false) String saved,
            Model model) {
        HttpSession session = getSession();
        String role = getSessionRole(session);
        setupCommonModel(model, session, role);

        String userEmail = (String) model.getAttribute("userEmail");
        if (userEmail == null && session != null) {
            userEmail = (String) session.getAttribute("userEmail");
        }
        User currentUser = null;
        if (userEmail != null && !userEmail.isBlank()) {
            currentUser = userRepository.findByEmail(userEmail.trim().toLowerCase()).orElse(null);
        }
        if (currentUser == null) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken) && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
                currentUser = userRepository.findByEmail(auth.getName().trim().toLowerCase()).orElse(null);
            }
        }
        if (currentUser != null) {
            model.addAttribute("userEntity", currentUser);
            model.addAttribute("userName", currentUser.getFullName());
            model.addAttribute("userEmail", currentUser.getEmail());
            model.addAttribute("userPhone", currentUser.getPhoneNumber());
            model.addAttribute("userCompany", currentUser.getCompanyName());
            model.addAttribute("userLocation", currentUser.getLocation());
            model.addAttribute("userHeadline", currentUser.getHeadline());
            model.addAttribute("careerRole", currentUser.getCareerRole());
        }

        // Resolve active resume and latest analysis dynamically
        Resume activeResume = null;
        ResumeAnalysis latestAnalysis = null;
        String normalizedEmail = (userEmail != null) ? userEmail.trim().toLowerCase() : "";

        if (currentUser != null && currentUser.getId() != null) {
            List<Resume> userResumes = resumeRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
            if (!userResumes.isEmpty()) {
                activeResume = userResumes.get(0);
            }
        }
        if (activeResume == null && !normalizedEmail.isBlank()) {
            Optional<Resume> resumeOpt = resumeRepository.findFirstByCandidateEmailNormalizedOrderByCreatedAtDesc(normalizedEmail);
            if (resumeOpt.isPresent()) {
                activeResume = resumeOpt.get();
            }
        }

        // If resume still null, fallback to candidate name matching
        String candidateName = (currentUser != null) ? currentUser.getFullName() : (session != null ? (String) session.getAttribute("userName") : null);
        if (activeResume == null && candidateName != null && !candidateName.isBlank()) {
            List<ResumeAnalysis> nameMatches = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc().stream()
                    .filter(ra -> candidateName.equalsIgnoreCase(ra.getCandidateName()))
                    .toList();
            if (!nameMatches.isEmpty()) {
                latestAnalysis = nameMatches.get(0);
                activeResume = latestAnalysis.getResume();
            }
        }

        if (activeResume != null) {
            model.addAttribute("activeResume", activeResume);
            if (latestAnalysis == null) {
                Optional<ResumeAnalysis> analysisOpt = resumeAnalysisRepository.findTopByResumeIdOrderByCreatedAtDesc(activeResume.getId());
                if (analysisOpt.isPresent()) {
                    latestAnalysis = analysisOpt.get();
                } else if (!normalizedEmail.isBlank()) {
                    List<ResumeAnalysis> analyses = resumeAnalysisRepository.findByCandidateEmailNormalizedOrderByCreatedAtDesc(normalizedEmail);
                    if (!analyses.isEmpty()) {
                        latestAnalysis = analyses.get(0);
                    }
                }
            }
        }

        if (latestAnalysis != null) {
            model.addAttribute("latestAnalysis", latestAnalysis);
            model.addAttribute("latestScore", latestAnalysis.getOverallScore());
            if (activeResume == null && latestAnalysis.getResume() != null) {
                activeResume = latestAnalysis.getResume();
                model.addAttribute("activeResume", activeResume);
            }
        }

        // Calculate dynamic profile completion strength (0 - 100%)
        int strength = 0;
        boolean basicInfoVerified = false;
        boolean phoneConfigured = false;
        boolean careerConfigured = false;
        boolean resumeAttached = (activeResume != null || latestAnalysis != null);

        String name = (currentUser != null) ? currentUser.getFullName() : (session != null ? (String) session.getAttribute("userName") : null);
        String email = (currentUser != null) ? currentUser.getEmail() : userEmail;
        String phone = (currentUser != null) ? currentUser.getPhoneNumber() : null;
        String headline = (currentUser != null) ? currentUser.getHeadline() : null;
        String careerRole = (currentUser != null) ? currentUser.getCareerRole() : null;

        if (name != null && !name.isBlank() && email != null && !email.isBlank()) {
            strength += 25;
            basicInfoVerified = true;
        }
        if (phone != null && !phone.isBlank()) {
            strength += 25;
            phoneConfigured = true;
        }
        if ((headline != null && !headline.isBlank()) || (careerRole != null && !careerRole.isBlank())) {
            strength += 25;
            careerConfigured = true;
        }
        if (resumeAttached) {
            strength += 25;
        }

        model.addAttribute("profileStrengthPct", strength);
        model.addAttribute("basicInfoVerified", basicInfoVerified);
        model.addAttribute("phoneConfigured", phoneConfigured);
        model.addAttribute("careerConfigured", careerConfigured);
        model.addAttribute("resumeAttached", resumeAttached);

        if (saved != null) {
            model.addAttribute("successMessage", "Profile details updated successfully.");
        }
        return "dashboard/profile";
    }

    @PostMapping("/dashboard/profile")
    public String updateProfile(
            @RequestParam("fullName") String fullName,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "location", required = false) String location,
            @RequestParam(value = "headline", required = false) String headline,
            @RequestParam(value = "careerRole", required = false) String careerRole,
            @RequestParam(value = "companyName", required = false) String companyName) {

        HttpSession session = getSession();
        String email = (session != null) ? (String) session.getAttribute("userEmail") : null;
        if (email == null || email.isBlank()) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken) && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
                email = auth.getName();
            }
        }

        if (email != null) {
            userRepository.findByEmail(email).ifPresent(user -> {
                if (fullName != null && !fullName.isBlank()) user.setFullName(fullName.trim());
                if (phone != null) user.setPhoneNumber(phone.trim());
                if (location != null) user.setLocation(location.trim());
                if (headline != null) user.setHeadline(headline.trim());
                if (careerRole != null && !careerRole.isBlank()) user.setCareerRole(careerRole.trim());
                if (companyName != null && !companyName.isBlank()) user.setCompanyName(companyName.trim());
                userRepository.save(user);

                if (session != null) {
                    session.setAttribute("userName", user.getFullName());
                    session.setAttribute("phoneNumber", user.getPhoneNumber());
                    if (user.getCompanyName() != null) session.setAttribute("companyName", user.getCompanyName());
                    if (user.getCareerRole() != null) session.setAttribute("careerRole", user.getCareerRole());
                }
            });
        }
        return "redirect:/dashboard/profile?saved=true";
    }

    @GetMapping("/dashboard/settings")
    public String settings(
            @RequestParam(value = "passwordUpdated", required = false) String passwordUpdated,
            @RequestParam(value = "saved", required = false) String saved,
            @RequestParam(value = "error", required = false) String error,
            Model model) {
        HttpSession session = getSession();
        String role = getSessionRole(session);
        setupCommonModel(model, session, role);

        if (saved != null) {
            model.addAttribute("successMessage", "Account settings & notification preferences saved successfully.");
        }
        if (passwordUpdated != null) {
            model.addAttribute("successMessage", "Your security password has been updated successfully.");
        }
        if (error != null) {
            if ("invalid_current_password".equals(error)) {
                model.addAttribute("errorMessage", "Current password does not match our records.");
            } else if ("mismatch".equals(error)) {
                model.addAttribute("errorMessage", "New password and Confirm Password do not match.");
            } else if ("short".equals(error)) {
                model.addAttribute("errorMessage", "Password must be at least 8 characters long.");
            }
        }
        return "dashboard/settings";
    }

    @PostMapping("/dashboard/settings/preferences")
    public String updatePreferences(
            @RequestParam(value = "themeChoice", defaultValue = "light") String themeChoice,
            @RequestParam(value = "notifResumeScan", required = false) Boolean notifResumeScan,
            @RequestParam(value = "notifJobInsights", required = false) Boolean notifJobInsights,
            @RequestParam(value = "notifInterviewUpdates", required = false) Boolean notifInterviewUpdates) {

        HttpSession session = getSession();
        String email = (session != null) ? (String) session.getAttribute("userEmail") : null;
        if (email == null || email.isBlank()) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken) && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
                email = auth.getName();
            }
        }

        if (email != null && !email.isBlank()) {
            userRepository.findByEmail(email.trim().toLowerCase()).ifPresent(user -> {
                user.setThemePreference("dark".equalsIgnoreCase(themeChoice) ? "dark" : "light");
                user.setNotifResumeScan(Boolean.TRUE.equals(notifResumeScan));
                user.setNotifJobInsights(Boolean.TRUE.equals(notifJobInsights));
                user.setNotifInterviewUpdates(Boolean.TRUE.equals(notifInterviewUpdates));
                userRepository.save(user);

                if (session != null) {
                    session.setAttribute("theme", user.getThemePreference());
                }
            });
        }

        return "redirect:/dashboard/settings?saved=true";
    }

    @PostMapping("/dashboard/settings/theme")
    @ResponseBody
    public org.springframework.http.ResponseEntity<?> updateThemeAjax(
            @RequestParam("theme") String theme) {
        String safeTheme = "dark".equalsIgnoreCase(theme) ? "dark" : "light";
        HttpSession session = getSession();
        if (session != null) {
            session.setAttribute("theme", safeTheme);
        }
        String email = (session != null) ? (String) session.getAttribute("userEmail") : null;
        if (email == null || email.isBlank()) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken) && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
                email = auth.getName();
            }
        }
        if (email != null && !email.isBlank()) {
            userRepository.findByEmail(email.trim().toLowerCase()).ifPresent(u -> {
                u.setThemePreference(safeTheme);
                userRepository.save(u);
            });
        }
        return org.springframework.http.ResponseEntity.ok(java.util.Map.of("success", true, "theme", safeTheme));
    }

    @PostMapping("/dashboard/settings/password")
    public String updatePassword(
            @RequestParam("currentPassword") String currentPassword,
            @RequestParam("newPassword") String newPassword,
            @RequestParam("confirmPassword") String confirmPassword) {

        HttpSession session = getSession();
        String email = (session != null) ? (String) session.getAttribute("userEmail") : null;
        if (email == null || email.isBlank()) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken) && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
                email = auth.getName();
            }
        }

        if (email == null) {
            return "redirect:/login";
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return "redirect:/dashboard/settings?error=user_not_found";
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            return "redirect:/dashboard/settings?error=invalid_current_password";
        }

        if (newPassword == null || newPassword.length() < 8) {
            return "redirect:/dashboard/settings?error=short";
        }

        if (!newPassword.equals(confirmPassword)) {
            return "redirect:/dashboard/settings?error=mismatch";
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return "redirect:/dashboard/settings?passwordUpdated=true";
    }

    @GetMapping("/dashboard/notifications")
    public String notifications(Model model) {
        HttpSession session = getSession();
        String role = getSessionRole(session);
        setupCommonModel(model, session, role);

        String activeEmail = (String) model.getAttribute("userEmail");
        List<Notification> notifs = (notificationService != null && activeEmail != null)
                ? notificationService.getNotificationsForUser(activeEmail)
                : Collections.emptyList();

        // If newly created user or no notifications yet, generate helpful initial notifications
        if (notifs.isEmpty() && notificationService != null && activeEmail != null) {
            String userName = (String) model.getAttribute("userName");
            notificationService.sendNotification(
                    activeEmail,
                    userName,
                    "Welcome to SmartHire Notification Center 🚀",
                    "You will receive live alerts here whenever HR reviews your resume, updates your application status, or schedules an interview.",
                    "SYSTEM",
                    "/dashboard"
            );
            notifs = notificationService.getNotificationsForUser(activeEmail);
        }

        long unreadCount = (notificationService != null && activeEmail != null)
                ? notificationService.getUnreadCount(activeEmail)
                : 0L;

        model.addAttribute("notifications", notifs);
        model.addAttribute("unreadCount", unreadCount);
        model.addAttribute("totalNotificationsCount", notifs.size());
        model.addAttribute("interviewsCount", notifs.stream().filter(n -> "INTERVIEW".equalsIgnoreCase(n.getType())).count());
        model.addAttribute("analysesCount", notifs.stream().filter(n -> "ANALYSIS".equalsIgnoreCase(n.getType())).count());

        return "dashboard/notifications";
    }

    @PostMapping("/dashboard/notifications/mark-read")
    public String markAllNotificationsRead() {
        HttpSession session = getSession();
        String email = (session != null) ? (String) session.getAttribute("userEmail") : null;
        if (email == null || email.isBlank()) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken) && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
                email = auth.getName();
            }
        }
        if (email != null && notificationService != null) {
            notificationService.markAllRead(email);
        }
        return "redirect:/dashboard/notifications";
    }

    @GetMapping("/dashboard/help")
    public String help(Model model) {
        HttpSession session = getSession();
        String role = getSessionRole(session);
        setupCommonModel(model, session, role);
        return "dashboard/help";
    }

    // ==========================================
    // NORMAL USER / JOB SEEKER WORKFLOW
    // (Restricted: HR users cannot access)
    // ==========================================

    @GetMapping("/dashboard/resumeanalyzer")
    public String resumeAnalyzer(
            @RequestParam(value = "id", required = false) Long analysisId,
            @RequestParam(value = "role", required = false) String roleParam,
            Model model) {
        HttpSession session = getSession();
        if (isHr(session)) {
            return "redirect:/dashboard?denied=hr_restricted";
        }
        setupCommonModel(model, session, "USER");
        model.addAttribute("pageTitle", "Resume Analyzer");

        ResumeAnalysis analysis = null;
        if (analysisId != null) {
            analysis = resumeAnalysisRepository.findById(analysisId).orElse(null);
        }

        if (analysis != null) {
            model.addAttribute("analysis", analysis);
            model.addAttribute("hasAnalysis", true);
        } else {
            model.addAttribute("hasAnalysis", false);
        }

        model.addAttribute("selectedRole", roleParam);
        model.addAttribute("availableJobs", jobService.getAllJobs());

        return "dashboard/user/smarthire";
    }

    public String resumeAnalyzer(Model model) {
        return resumeAnalyzer(null, null, model);
    }

    public String resumeAnalyzer(Long analysisId, Model model) {
        return resumeAnalyzer(analysisId, null, model);
    }

    @PostMapping("/dashboard/resumeanalyzer")
    public String handleResumeAnalyzerPost(
            @RequestParam(value = "resumeFile", required = false) MultipartFile file,
            @RequestParam(value = "jobRole", required = false) String jobRole,
            @RequestParam(value = "customJobRole", required = false) String customJobRole,
            @RequestParam(value = "jobDescription", required = false) String jobDescription,
            @RequestParam(value = "aiProvider", required = false, defaultValue = "local") String aiProvider,
            @RequestParam(value = "geminiApiKey", required = false) String geminiApiKey,
            RedirectAttributes redirectAttributes) {

        HttpSession session = getSession();
        if (isHr(session)) {
            return "redirect:/dashboard?denied=hr_restricted";
        }

        if (file == null || file.isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Please select a resume file to upload.");
            return "redirect:/dashboard/resumeanalyzer";
        }

        try {
            // Step 1: Extract Text & Normalize
            String rawText = resumeParserService.extractText(file);
            String normalizedText = resumeNormalizationService.normalizeText(rawText);
            if (!resumeNormalizationService.isValidResumeText(normalizedText)) {
                redirectAttributes.addFlashAttribute("errorMessage", "No readable text found in document. Please ensure it is not an image-only scan.");
                return "redirect:/dashboard/resumeanalyzer";
            }

            // Step 2: Extract Structured Information
            CandidateInfoDTO candidateInfo = resumeExtractionService.extractCandidateInfo(normalizedText);
            String structuredJson = resumeExtractionService.toJson(candidateInfo);

            String candEmail = candidateInfo.getEmail();
            String sessionEmail = (session != null) ? (String) session.getAttribute("userEmail") : null;
            if ((candEmail == null || candEmail.isBlank()) && sessionEmail != null) {
                candEmail = sessionEmail;
            }
            String normEmail = com.smarthire.service.CandidateNormalizationUtils.normalizeEmail(candEmail);
            String normPhone = com.smarthire.service.CandidateNormalizationUtils.normalizePhone(candidateInfo.getPhoneNumber());
            String candName = com.smarthire.service.CandidateNormalizationUtils.normalizeName(candidateInfo.getName());

            // Step 3: Persist Resume in DB with Deduplication (Upsert)
            java.util.Optional<Resume> existingResumeOpt = java.util.Optional.empty();
            if (normEmail != null) {
                existingResumeOpt = resumeRepository.findFirstByCandidateEmailNormalizedOrderByCreatedAtDesc(normEmail);
            }
            if (existingResumeOpt.isEmpty() && normPhone != null) {
                existingResumeOpt = resumeRepository.findFirstByCandidatePhoneNormalizedOrderByCreatedAtDesc(normPhone);
            }

            Resume resume;
            if (existingResumeOpt.isPresent()) {
                resume = existingResumeOpt.get();
                resume.setFileName(file.getOriginalFilename());
                resume.setFileType(file.getContentType());
                resume.setFileSize(file.getSize());
                resume.setOriginalText(rawText);
                resume.setNormalizedText(normalizedText);
                resume.setStructuredJson(structuredJson);
                resume.setCandidateName(candName);
                resume.setCandidateEmail(candEmail);
                resume.setCandidateEmailNormalized(normEmail);
                resume.setCandidatePhone(candidateInfo.getPhoneNumber());
                resume.setCandidatePhoneNormalized(normPhone);
            } else {
                resume = Resume.builder()
                        .fileName(file.getOriginalFilename())
                        .fileType(file.getContentType())
                        .fileSize(file.getSize())
                        .originalText(rawText)
                        .normalizedText(normalizedText)
                        .structuredJson(structuredJson)
                        .candidateName(candName)
                        .candidateEmail(candEmail)
                        .candidateEmailNormalized(normEmail)
                        .candidatePhone(candidateInfo.getPhoneNumber())
                        .candidatePhoneNormalized(normPhone)
                        .build();
            }

            // Link resume ownership to authenticated user
            String loggedInEmail = sessionEmail;
            if (loggedInEmail == null || loggedInEmail.isBlank()) {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken) && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
                    loggedInEmail = auth.getName();
                }
            }
            if (loggedInEmail != null && !loggedInEmail.isBlank()) {
                userRepository.findByEmail(loggedInEmail.trim().toLowerCase()).ifPresent(resume::setUser);
            }
            Resume savedResume = resumeRepository.save(resume);

            // Step 4: Resolve Target Role
            String targetRole = ("Other".equalsIgnoreCase(jobRole) && customJobRole != null && !customJobRole.isBlank())
                    ? customJobRole.trim()
                    : ((jobRole != null && !jobRole.isBlank()) ? jobRole.trim() : "Java Developer");

            // Step 5: Execute AI ATS Analysis
            ATSAnalysisDTO analysisResult = resumeAnalysisService.analyzeResume(
                    savedResume.getId(),
                    targetRole,
                    jobDescription,
                    aiProvider,
                    geminiApiKey
            );

            // Dispatch notification to authenticated user (never to candidate email or candidate name)
            if (notificationService != null) {
                String targetEmail = (loggedInEmail != null && !loggedInEmail.isBlank()) ? loggedInEmail : sessionEmail;
                if (targetEmail != null && !targetEmail.isBlank()) {
                    String recipientName = (session != null && session.getAttribute("userName") != null)
                            ? (String) session.getAttribute("userName")
                            : (resume.getUser() != null ? resume.getUser().getFullName() : "User");
                    notificationService.sendNotification(
                            targetEmail,
                            recipientName,
                            "Resume Scan Complete (" + analysisResult.getOverallScore() + "% Score)",
                            "Your resume achieved an ATS compatibility score of " + analysisResult.getOverallScore() + "% for target role: " + targetRole + ".",
                            "ANALYSIS",
                            "/dashboard/smarthire?id=" + analysisResult.getId()
                    );
                }
            }

            redirectAttributes.addFlashAttribute("successMessage", "Resume analyzed successfully! Result saved to ATS history.");
            return "redirect:/dashboard/smarthire?id=" + analysisResult.getId();

        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Analysis failed: " + e.getMessage());
            return "redirect:/dashboard/resumeanalyzer";
        }
    }

    @GetMapping("/dashboard/analyzerhistory")
    public String analyzerHistory(
            @RequestParam(value = "deleted", required = false) String deleted,
            Model model) {
        HttpSession session = getSession();
        if (isHr(session)) {
            return "redirect:/dashboard?denied=hr_restricted";
        }
        setupCommonModel(model, session, "USER");
        model.addAttribute("pageTitle", "Analyzer History");

        String activeEmail = (String) model.getAttribute("userEmail");
        User currentUser = (activeEmail != null && !activeEmail.isBlank())
                ? userRepository.findByEmail(activeEmail.trim().toLowerCase()).orElse(null)
                : null;
        List<ResumeAnalysis> analyses = (currentUser != null)
                ? resumeAnalysisRepository.findAllForUser(currentUser.getId(), currentUser.getEmail())
                : Collections.emptyList();
        model.addAttribute("analysesList", analyses);

        int totalScanned = analyses.size();
        int highestScore = analyses.stream().mapToInt(ResumeAnalysis::getOverallScore).max().orElse(0);
        double avgScore = analyses.stream().mapToInt(ResumeAnalysis::getOverallScore).average().orElse(0.0);

        // Find most targeted role
        String mostTargeted = analyses.stream()
                .map(ResumeAnalysis::getTargetJobRole)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse("—");

        model.addAttribute("totalScanned", totalScanned);
        model.addAttribute("highestScore", highestScore);
        model.addAttribute("avgScore", Math.round(avgScore * 10.0) / 10.0);
        model.addAttribute("mostTargetedRole", mostTargeted);

        if (deleted != null) {
            model.addAttribute("successMessage", "Analysis record removed from your history.");
        }

        return "dashboard/user/analyzerhistory";
    }

    @PostMapping("/dashboard/analyzerhistory/{id}/delete")
    public String deleteAnalysis(@PathVariable("id") String id) {
        try {
            long analysisId = Long.parseLong(id.replaceAll("\\D+", ""));
            resumeAnalysisRepository.deleteById(analysisId);
        } catch (Exception ignored) {
        }
        return "redirect:/dashboard/analyzerhistory?deleted=true";
    }

    @GetMapping("/dashboard/jobroles")
    public String jobRoles(Model model) {
        HttpSession session = getSession();
        String role = getSessionRole(session);
        setupCommonModel(model, session, role);
        model.addAttribute("pageTitle", "Job Roles & Career Profiles");

        // Provide all dynamic active jobs created by HR
        List<Job> allJobs = jobService.getAllJobs();
        model.addAttribute("availableJobs", allJobs);
        model.addAttribute("totalJobsCount", allJobs.size());
        return "dashboard/user/jobroles";
    }

    @GetMapping("/dashboard/resumeimprovement")
    public String resumeImprovement(
            @RequestParam(value = "id", required = false) Long analysisId,
            Model model) {
        HttpSession session = getSession();
        if (isHr(session)) {
            return "redirect:/dashboard?denied=hr_restricted";
        }
        setupCommonModel(model, session, "USER");
        model.addAttribute("pageTitle", "Resume Improvement");

        ResumeAnalysis analysis = null;
        if (analysisId != null) {
            analysis = resumeAnalysisRepository.findById(analysisId).orElse(null);
        } else {
            List<ResumeAnalysis> list = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();
            if (!list.isEmpty()) {
                analysis = list.get(0);
            }
        }

        model.addAttribute("analysis", analysis);
        model.addAttribute("latestAnalysis", analysis);

        return "dashboard/user/resumeimprovement";
    }

    @GetMapping("/dashboard/skillsgap")
    public String skillsGap(Model model) {
        HttpSession session = getSession();
        if (isHr(session)) {
            return "redirect:/dashboard?denied=hr_restricted";
        }
        setupCommonModel(model, session, "USER");
        model.addAttribute("pageTitle", "Skills Gap Analysis");

        List<ResumeAnalysis> list = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();
        if (!list.isEmpty()) {
            model.addAttribute("latestAnalysis", list.get(0));
        }
        return "dashboard/user/skillsgap";
    }

    // ==========================================
    // HR / RECRUITER WORKFLOW
    // (Restricted: Normal Users cannot access)
    // ==========================================

    @GetMapping({"/dashboard/jobs", "/dashboard/job"})
    public String hrJobs(
            @RequestParam(value = "created", required = false) String created,
            @RequestParam(value = "deleted", required = false) String deleted,
            Model model) {
        HttpSession session = getSession();
        if (!isHr(session)) {
            return "redirect:/dashboard?denied=seeker_restricted";
        }
        setupCommonModel(model, session, "HR");
        model.addAttribute("pageTitle", "Job Management");

        List<Job> jobs = jobService.getAllJobs();
        List<ResumeAnalysis> allAnalyses = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();

        for (Job job : jobs) {
            String title = (job.getTitle() != null) ? job.getTitle() : "";
            List<ResumeAnalysis> matching = allAnalyses.stream()
                    .filter(ra -> ReportService.isJobMatching(title, ra.getTargetJobRole()))
                    .toList();
            job.setApplicantsCount(matching.size());
            int shortlisted = (int) matching.stream()
                    .filter(ra -> ra.isShortlisted() || "Shortlisted".equalsIgnoreCase(ra.getStage()))
                    .count();
            job.setShortlistedCount(shortlisted);
        }

        model.addAttribute("jobsList", jobs);
        model.addAttribute("openJobsCount", jobs.stream().filter(j -> "Open".equalsIgnoreCase(j.getStatus())).count());

        if (created != null) {
            model.addAttribute("successMessage", "Job vacancy posted successfully.");
        }
        if (deleted != null) {
            model.addAttribute("successMessage", "Job requisition removed.");
        }
        return "dashboard/hr/jobs";
    }

    @PostMapping("/dashboard/jobs")
    public String createOrUpdateJob(
            @RequestParam(value = "id", required = false) Long id,
            @RequestParam("title") String title,
            @RequestParam(value = "department", defaultValue = "Engineering") String department,
            @RequestParam(value = "employmentType", defaultValue = "Full-time") String employmentType,
            @RequestParam(value = "openings", defaultValue = "1") int openings,
            @RequestParam(value = "minExperience", defaultValue = "2") int minExperience,
            @RequestParam(value = "maxExperience", defaultValue = "8") int maxExperience,
            @RequestParam(value = "location", defaultValue = "Remote / Hybrid") String location,
            @RequestParam(value = "salaryRange", defaultValue = "Competitive") String salaryRange,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "requiredSkills", required = false) String requiredSkills) {

        Job job;
        boolean isUpdate = false;
        if (id != null) {
            job = jobService.getJobById(id).orElse(new Job());
            isUpdate = (job.getId() != null);
        } else {
            job = new Job();
        }

        job.setTitle(title.trim());
        job.setDepartment(department.trim());
        job.setEmploymentType(employmentType.trim());
        job.setOpenings(openings);
        job.setMinExperience(minExperience);
        job.setMaxExperience(maxExperience);
        job.setLocation(location.trim());
        job.setSalaryRange(salaryRange != null && !salaryRange.isBlank() ? salaryRange.trim() : "Competitive");
        job.setDescription(description != null ? description.trim() : "");
        job.setRequiredSkills(requiredSkills != null ? requiredSkills.trim() : "");
        if (job.getStatus() == null || job.getStatus().isBlank()) {
            job.setStatus("Open");
        }

        jobService.saveJob(job);

        // Notify job seekers about new job opening (only for new creations)
        if (!isUpdate && notificationService != null) {
            try {
                userRepository.findAll().stream()
                        .filter(u -> !"HR".equalsIgnoreCase(u.getRole()))
                        .forEach(u -> notificationService.sendNotification(
                                u.getEmail(),
                                u.getFullName(),
                                "New Job Vacancy: " + title.trim() + " (" + department.trim() + ")",
                                "A new opening for " + title.trim() + " (" + employmentType.trim() + ", " + location.trim() + ") has been opened. Check your profile match!",
                                "JOB_POSTING",
                                "/dashboard/jobroles"
                        ));
            } catch (Exception ignored) {
            }
        }

        return "redirect:/dashboard/jobs?" + (isUpdate ? "updated=true" : "created=true");
    }

    @GetMapping({"/dashboard/jobs/{jobId}/edit", "/dashboard/job/{jobId}/edit"})
    public String editJobForm(@PathVariable("jobId") String jobId, Model model) {
        HttpSession session = getSession();
        if (!isHr(session)) {
            return "redirect:/dashboard?denied=seeker_restricted";
        }
        setupCommonModel(model, session, "HR");
        model.addAttribute("pageTitle", "Edit Job Vacancy");

        Job job = null;
        try {
            long id = Long.parseLong(jobId.replaceAll("\\D+", ""));
            job = jobService.getJobById(id).orElse(null);
        } catch (Exception ignored) {
        }
        model.addAttribute("job", job);
        model.addAttribute("isEdit", true);
        return "dashboard/hr/job-form";
    }

    @PostMapping("/dashboard/jobs/{jobId}/delete")
    public String deleteJob(@PathVariable("jobId") String jobId) {
        try {
            long id = Long.parseLong(jobId.replaceAll("\\D+", ""));
            jobService.deleteJob(id);
        } catch (Exception ignored) {
        }
        return "redirect:/dashboard/jobs?deleted=true";
    }

    @GetMapping({"/dashboard/jobs/create", "/dashboard/job/create"})
    public String createJobForm(Model model) {
        HttpSession session = getSession();
        if (!isHr(session)) {
            return "redirect:/dashboard?denied=seeker_restricted";
        }
        setupCommonModel(model, session, "HR");
        model.addAttribute("pageTitle", "Create Job");
        model.addAttribute("isEdit", false);
        model.addAttribute("job", new Job());
        return "dashboard/hr/job-form";
    }

    @GetMapping({"/dashboard/jobs/{jobId}", "/dashboard/job/{jobId}"})
    public String jobDetails(@PathVariable("jobId") String jobId, Model model) {
        HttpSession session = getSession();
        if (!isHr(session)) {
            return "redirect:/dashboard?denied=seeker_restricted";
        }
        setupCommonModel(model, session, "HR");
        model.addAttribute("pageTitle", "Job Details");
        model.addAttribute("jobId", jobId);

        Job job = null;
        try {
            long id = Long.parseLong(jobId.replaceAll("\\D+", ""));
            job = jobService.getJobById(id).orElse(null);
        } catch (Exception ignored) {
        }

        if (job == null) {
            List<Job> allJobs = jobService.getAllJobs();
            if (!allJobs.isEmpty()) {
                job = allJobs.get(0);
            }
        }
        model.addAttribute("job", job);

        String jobTitle = (job != null && job.getTitle() != null) ? job.getTitle() : "";
        List<ResumeAnalysis> allAnalyses = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();
        List<ResumeAnalysis> matchingAnalyses = allAnalyses.stream()
                .filter(ra -> ReportService.isJobMatching(jobTitle, ra.getTargetJobRole()))
                .toList();

        int jobTotalApplied = matchingAnalyses.size();
        int jobAiScreened = (int) matchingAnalyses.stream().filter(ra -> ra.getOverallScore() >= 70).count();
        int jobShortlisted = (int) matchingAnalyses.stream().filter(ra -> ra.isShortlisted() || "Shortlisted".equalsIgnoreCase(ra.getStage())).count();
        int jobInterviewing = (int) matchingAnalyses.stream().filter(ra -> "Interviewing".equalsIgnoreCase(ra.getStage()) || ra.getInterviewDate() != null).count();
        int jobOffered = (int) matchingAnalyses.stream().filter(ra -> "Offered".equalsIgnoreCase(ra.getStage()) || "Strong Hire".equalsIgnoreCase(ra.getRecommendation())).count();
        int jobHired = (int) matchingAnalyses.stream().filter(ra -> "Hired".equalsIgnoreCase(ra.getStage()) || "Hired".equalsIgnoreCase(ra.getStatus())).count();

        model.addAttribute("jobTotalApplied", jobTotalApplied);
        model.addAttribute("jobAiScreened", jobAiScreened);
        model.addAttribute("jobShortlisted", jobShortlisted);
        model.addAttribute("jobInterviewing", jobInterviewing);
        model.addAttribute("jobOffered", jobOffered);
        model.addAttribute("jobHired", jobHired);
        model.addAttribute("associatedCandidates", matchingAnalyses);

        List<String> requiredSkills = new ArrayList<>();
        if (job != null && job.getRequiredSkills() != null && !job.getRequiredSkills().isBlank()) {
            for (String s : job.getRequiredSkills().split(",")) {
                String trimmed = s.trim();
                if (!trimmed.isEmpty()) {
                    requiredSkills.add(trimmed);
                }
            }
        }
        if (requiredSkills.isEmpty()) {
            requiredSkills.addAll(List.of("Problem Solving", "Collaboration", "Domain Knowledge"));
        }
        model.addAttribute("requiredSkillsList", requiredSkills);

        return "dashboard/hr/job-details";
    }

    @GetMapping({"/dashboard/candidates", "/dashboard/candidate"})
    public String candidates(
            @RequestParam(value = "stage", required = false) String stageParam,
            @RequestParam(value = "shortlisted", required = false) String shortlistedParam,
            Model model) {
        HttpSession session = getSession();
        if (!isHr(session)) {
            return "redirect:/dashboard?denied=seeker_restricted";
        }
        setupCommonModel(model, session, "HR");
        model.addAttribute("pageTitle", "Candidates");

        List<ResumeAnalysis> analyses = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();
        if (stageParam != null && !stageParam.isBlank()) {
            String norm = stageParam.trim().toLowerCase();
            analyses = analyses.stream()
                    .filter(a -> {
                        String st = a.getStage() != null ? a.getStage().toLowerCase() : "under review";
                        if ("under review".equals(norm) || "awaiting review".equals(norm) || "review".equals(norm)) {
                            return "under review".equals(st) || a.getStage() == null;
                        }
                        return st.contains(norm) || norm.contains(st);
                    })
                    .toList();
            model.addAttribute("selectedStage", stageParam);
        }
        model.addAttribute("candidateAnalyses", analyses);
        model.addAttribute("shortlistedCount", resumeAnalysisRepository.findByShortlistedTrueOrderByCreatedAtDesc().size());

        if (shortlistedParam != null) {
            model.addAttribute("successMessage", "Candidate shortlist status updated.");
        }

        return "dashboard/hr/candidates";
    }

    @PostMapping("/dashboard/candidates/{id}/shortlist")
    public String toggleShortlist(@PathVariable("id") String id) {
        try {
            long candId = Long.parseLong(id.replaceAll("\\D+", ""));
            resumeAnalysisRepository.findById(candId).ifPresent(analysis -> {
                boolean willBeShortlisted = !analysis.isShortlisted();
                analysis.setShortlisted(willBeShortlisted);
                resumeAnalysisRepository.save(analysis);

                // Dispatch real-time notification to the candidate
                String candEmail = analysis.getCandidateEmail();
                if (candEmail != null && !candEmail.isBlank() && notificationService != null) {
                    String roleName = analysis.getTargetJobRole() != null ? analysis.getTargetJobRole() : "Open Position";
                    String title = willBeShortlisted ? "You have been Shortlisted! ⭐" : "Application Status Updated";
                    String msg = willBeShortlisted
                            ? "Congratulations " + analysis.getCandidateName() + "! Your application for " + roleName + " has been shortlisted by the recruiting team."
                            : "Your shortlist status for " + roleName + " has been updated by HR.";
                    notificationService.sendNotification(candEmail, analysis.getCandidateName(), title, msg, "SHORTLIST", "/dashboard/analyzerhistory");
                }
            });
        } catch (Exception ignored) {
        }
        return "redirect:/dashboard/candidates?shortlisted=true";
    }

    @GetMapping({"/dashboard/candidates/{candidateId}", "/dashboard/candidate/{candidateId}"})
    public String candidateDetails(@PathVariable("candidateId") String candidateId, Model model) {
        HttpSession session = getSession();
        if (!isHr(session)) {
            return "redirect:/dashboard?denied=seeker_restricted";
        }
        setupCommonModel(model, session, "HR");
        model.addAttribute("pageTitle", "Candidate Profile");
        model.addAttribute("candidateId", candidateId);

        try {
            long id = Long.parseLong(candidateId.replaceAll("\\D+", ""));
            resumeAnalysisRepository.findById(id).ifPresent(analysis -> model.addAttribute("analysis", analysis));
        } catch (Exception ignored) {
        }
        if (!model.containsAttribute("analysis")) {
            List<ResumeAnalysis> list = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();
            if (!list.isEmpty()) {
                model.addAttribute("analysis", list.get(0));
            } else {
                model.addAttribute("analysis", new ResumeAnalysis());
            }
        }
        return "dashboard/hr/candidate-details";
    }

    @GetMapping({"/dashboard/applications", "/dashboard/application"})
    public String applications(
            @RequestParam(value = "stage", required = false) String stageParam,
            @RequestParam(value = "saved", required = false) String saved,
            Model model) {
        HttpSession session = getSession();
        if (!isHr(session)) {
            return "redirect:/dashboard?denied=seeker_restricted";
        }
        setupCommonModel(model, session, "HR");
        model.addAttribute("pageTitle", "Applications Pipeline");

        List<ResumeAnalysis> candidateAnalyses = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();
        if (stageParam != null && !stageParam.isBlank()) {
            String norm = stageParam.trim().toLowerCase();
            candidateAnalyses = candidateAnalyses.stream()
                    .filter(a -> {
                        if ("shortlisted".equals(norm) || norm.contains("shortlist")) {
                            return a.isShortlisted()
                                    || (a.getStage() != null && a.getStage().toLowerCase().contains("shortlist"))
                                    || (a.getDisplayStage() != null && a.getDisplayStage().toLowerCase().contains("shortlist"));
                        }
                        if ("offered".equals(norm) || norm.contains("offer")) {
                            return (a.getStage() != null && a.getStage().toLowerCase().contains("offer"))
                                    || (a.getDisplayStage() != null && a.getDisplayStage().toLowerCase().contains("offer"))
                                    || (a.getStatus() != null && a.getStatus().toLowerCase().contains("offer"))
                                    || (a.getRecommendation() != null && (a.getRecommendation().toLowerCase().contains("offer")
                                        || "strong hire".equalsIgnoreCase(a.getRecommendation().trim())
                                        || "hire".equalsIgnoreCase(a.getRecommendation().trim())));
                        }
                        if ("interviewing".equals(norm) || "interview".equals(norm) || norm.contains("interview")) {
                            return (a.getStage() != null && a.getStage().toLowerCase().contains("interview"))
                                    || a.getInterviewDate() != null
                                    || (a.getDisplayStage() != null && a.getDisplayStage().toLowerCase().contains("interview"));
                        }
                        if ("hired".equals(norm) || norm.contains("hire")) {
                            return (a.getStage() != null && a.getStage().toLowerCase().contains("hired"))
                                    || (a.getStatus() != null && a.getStatus().toLowerCase().contains("hire"))
                                    || (a.getDisplayStage() != null && a.getDisplayStage().toLowerCase().contains("hire"));
                        }
                        if ("under review".equals(norm) || "awaiting review".equals(norm) || "review".equals(norm)) {
                            String st = a.getStage() != null ? a.getStage().toLowerCase() : "under review";
                            return "under review".equals(st) || a.getStage() == null
                                    || (a.getDisplayStage() != null && "under review".equalsIgnoreCase(a.getDisplayStage()));
                        }
                        String st = a.getStage() != null ? a.getStage().toLowerCase() : "";
                        String ds = a.getDisplayStage() != null ? a.getDisplayStage().toLowerCase() : "";
                        return st.contains(norm) || norm.contains(st) || ds.contains(norm);
                    })
                    .toList();
            model.addAttribute("selectedStage", stageParam);
        }
        model.addAttribute("candidateAnalyses", candidateAnalyses);

        if (reportService != null) {
            model.addAttribute("report", reportService.generateReport("30days"));
        }

        if (saved != null) {
            model.addAttribute("successMessage", "Application stage updated successfully.");
        }

        return "dashboard/hr/applications";
    }

    @PostMapping("/dashboard/applications/{id}/stage")
    public String updateApplicationStage(
            @PathVariable("id") Long id,
            @RequestParam("stage") String stage,
            @RequestParam(value = "filter", required = false) String currentFilter) {
        resumeAnalysisRepository.findById(id).ifPresent(analysis -> {
            analysis.setStage(stage);
            if ("Shortlisted".equalsIgnoreCase(stage)) {
                analysis.setShortlisted(true);
            } else if ("Offered".equalsIgnoreCase(stage)) {
                analysis.setShortlisted(true);
                analysis.setStatus("Offered");
            } else if ("Hired".equalsIgnoreCase(stage)) {
                analysis.setShortlisted(true);
                analysis.setStatus("Hired");
            } else if ("Interviewing".equalsIgnoreCase(stage)) {
                analysis.setShortlisted(true);
            } else if ("Rejected".equalsIgnoreCase(stage)) {
                analysis.setShortlisted(false);
                analysis.setStatus("Rejected");
            }
            resumeAnalysisRepository.save(analysis);

            // Dispatch notification to candidate
            String candEmail = analysis.getCandidateEmail();
            if (candEmail != null && !candEmail.isBlank() && notificationService != null) {
                String roleName = analysis.getTargetJobRole() != null ? analysis.getTargetJobRole() : "Job Requisition";
                String title = "Application Stage Updated: " + stage;
                String msg = "Your application for " + roleName + " has been moved to stage: " + stage + " by the HR recruiter.";
                notificationService.sendNotification(candEmail, analysis.getCandidateName(), title, msg, "STAGE_CHANGE", "/dashboard/analyzerhistory");
            }
        });
        String redirectUrl = "/dashboard/applications?saved=true";
        if (currentFilter != null && !currentFilter.isBlank()) {
            redirectUrl += "&stage=" + java.net.URLEncoder.encode(currentFilter, java.nio.charset.StandardCharsets.UTF_8);
        }
        return "redirect:" + redirectUrl;
    }

    @GetMapping({"/dashboard/shortlist", "/dashboard/shortlists"})
    public String shortlist(
            @RequestParam(value = "removed", required = false) String removed,
            Model model) {
        HttpSession session = getSession();
        if (!isHr(session)) {
            return "redirect:/dashboard?denied=seeker_restricted";
        }
        setupCommonModel(model, session, "HR");
        model.addAttribute("pageTitle", "Shortlisted Candidates");

        List<ResumeAnalysis> all = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();
        List<ResumeAnalysis> shortlisted = resumeAnalysisRepository.findByShortlistedTrueOrderByCreatedAtDesc();
        if (shortlisted.isEmpty() && !all.isEmpty()) {
            shortlisted = all.stream().limit(3).toList();
        }
        model.addAttribute("shortlistedAnalyses", shortlisted);

        if (removed != null) {
            model.addAttribute("successMessage", "Candidate removed from shortlist.");
        }

        return "dashboard/hr/shortlist";
    }

    private String resolveCandidateEmail(ResumeAnalysis analysis) {
        if (analysis == null) return null;
        String candEmail = analysis.getCandidateEmail();
        if (candEmail != null && !candEmail.isBlank() && !candEmail.equalsIgnoreCase("candidate@email.com")) {
            return candEmail.trim();
        }
        if (analysis.getCandidateEmailNormalized() != null && !analysis.getCandidateEmailNormalized().isBlank()) {
            return analysis.getCandidateEmailNormalized().trim();
        }
        if (analysis.getCandidateName() != null && !analysis.getCandidateName().isBlank() && userRepository != null) {
            String candName = analysis.getCandidateName().trim();
            for (User u : userRepository.findAll()) {
                if (u.getFullName() != null && u.getFullName().equalsIgnoreCase(candName)) {
                    return u.getEmail();
                }
            }
        }
        return candEmail;
    }

    private String getActiveSessionEmail() {
        HttpSession session = getSession();
        if (session != null) {
            String email = (String) session.getAttribute("userEmail");
            if (email != null && !email.isBlank()) {
                return email;
            }
        }
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null && !auth.getName().equalsIgnoreCase("anonymousUser")) {
                return auth.getName();
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @GetMapping({"/dashboard/interviews", "/dashboard/interview"})
    public String interviews(
            @RequestParam(value = "scheduled", required = false) String scheduled,
            @RequestParam(value = "rescheduled", required = false) String rescheduled,
            @RequestParam(value = "cancelled", required = false) String cancelled,
            @RequestParam(value = "feedbackSaved", required = false) String feedbackSaved,
            Model model) {
        HttpSession session = getSession();
        if (!isHr(session)) {
            return "redirect:/dashboard?denied=seeker_restricted";
        }
        setupCommonModel(model, session, "HR");
        model.addAttribute("pageTitle", "Interview Management");

        List<ResumeAnalysis> analyses = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();
        model.addAttribute("interviewAnalyses", analyses);
        model.addAttribute("allCandidateAnalyses", analyses);
        model.addAttribute("jobsList", jobService.getAllJobs());

        long upcoming = analyses.stream().filter(a -> a.getInterviewDate() != null && a.getFeedbackNotes() == null).count();
        long completed = analyses.stream().filter(a -> a.getFeedbackNotes() != null).count();
        long needsFeedback = analyses.stream().filter(a -> a.getFeedbackNotes() == null).count();

        model.addAttribute("upcomingCount", upcoming);
        model.addAttribute("completedCount", completed);
        model.addAttribute("needsFeedbackCount", needsFeedback);
        model.addAttribute("allCount", analyses.size());

        if (scheduled != null) {
            model.addAttribute("successMessage", "Interview scheduled successfully and real-time notification sent to candidate.");
        }
        if (rescheduled != null) {
            model.addAttribute("successMessage", "Interview rescheduled successfully and candidate calendar updated in real time.");
        }
        if (cancelled != null) {
            model.addAttribute("successMessage", "Interview cancelled successfully and candidate has been notified in real time.");
        }
        if (feedbackSaved != null) {
            model.addAttribute("successMessage", "Candidate interview evaluation and scorecard recorded successfully.");
        }

        return "dashboard/hr/interviews";
    }

    @PostMapping("/dashboard/interviews/schedule")
    public String scheduleInterview(
            @RequestParam("candidateId") Long candidateId,
            @RequestParam(value = "round", defaultValue = "Technical Round 1") String round,
            @RequestParam(value = "date", required = false) String dateStr,
            @RequestParam(value = "interviewer", defaultValue = "Alex Carter (Lead Architect)") String interviewer,
            @RequestParam(value = "interviewType", defaultValue = "Google Meet") String interviewType) {
        final boolean[] wasRescheduled = new boolean[]{false};
        resumeAnalysisRepository.findById(candidateId).ifPresent(analysis -> {
            boolean isReschedule = (analysis.getInterviewDate() != null);
            wasRescheduled[0] = isReschedule;
            analysis.setInterviewRound(round);
            analysis.setInterviewerName(interviewer);
            analysis.setInterviewType(interviewType);
            analysis.setStage("Interviewing");
            analysis.setShortlisted(true);
            try {
                if (dateStr != null && !dateStr.isBlank()) {
                    analysis.setInterviewDate(java.time.LocalDateTime.parse(dateStr));
                } else {
                    analysis.setInterviewDate(java.time.LocalDateTime.now().plusDays(2).withHour(11).withMinute(0));
                }
            } catch (Exception e) {
                analysis.setInterviewDate(java.time.LocalDateTime.now().plusDays(2).withHour(11).withMinute(0));
            }
            resumeAnalysisRepository.save(analysis);

            String roleName = analysis.getTargetJobRole() != null ? analysis.getTargetJobRole() : "Applied Role";
            String formattedDate = (analysis.getInterviewDate() != null)
                    ? analysis.getInterviewDate().format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"))
                    : "Upcoming";

            // Dispatch real-time notification to the candidate
            String candEmail = resolveCandidateEmail(analysis);
            if (candEmail != null && !candEmail.isBlank() && notificationService != null) {
                String title = isReschedule
                        ? "Interview Rescheduled 🔄 (" + round + ")"
                        : "Interview Scheduled 📅 (" + round + ")";
                String msg = isReschedule
                        ? "Your interview for " + roleName + " has been rescheduled to " + formattedDate + " via " + interviewType + " with " + interviewer + "."
                        : "An interview for " + roleName + " has been scheduled on " + formattedDate + " via " + interviewType + " with " + interviewer + ".";
                notificationService.sendNotification(candEmail, analysis.getCandidateName(), title, msg, "INTERVIEW", "/dashboard/notifications");
            }
        });
        return "redirect:/dashboard/interviews?" + (wasRescheduled[0] ? "rescheduled=true" : "scheduled=true");
    }

    @PostMapping("/dashboard/interviews/{id}/cancel")
    public String cancelInterview(@PathVariable("id") Long candidateId) {
        resumeAnalysisRepository.findById(candidateId).ifPresent(analysis -> {
            String round = analysis.getInterviewRound() != null ? analysis.getInterviewRound() : "Technical Round";
            String roleName = analysis.getTargetJobRole() != null ? analysis.getTargetJobRole() : "Applied Role";
            String formattedDate = (analysis.getInterviewDate() != null)
                    ? analysis.getInterviewDate().format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"))
                    : "Scheduled Date";

            analysis.setInterviewDate(null);
            analysis.setStage("Under Review");
            resumeAnalysisRepository.save(analysis);

            // Dispatch real-time cancellation notification to candidate
            String candEmail = resolveCandidateEmail(analysis);
            if (candEmail != null && !candEmail.isBlank() && notificationService != null) {
                String title = "Interview Cancelled ❌ (" + round + ")";
                String msg = "Your interview for " + roleName + " originally scheduled for " + formattedDate + " has been cancelled by the recruitment team. We will follow up with further details.";
                notificationService.sendNotification(candEmail, analysis.getCandidateName(), title, msg, "INTERVIEW", "/dashboard/notifications");
            }
        });
        return "redirect:/dashboard/interviews?cancelled=true";
    }

    @GetMapping({"/dashboard/feedback", "/dashboard/feedbacks"})
    public String feedback(
            @RequestParam(value = "candId", required = false) String candIdParam,
            Model model) {
        HttpSession session = getSession();
        if (!isHr(session)) {
            return "redirect:/dashboard?denied=seeker_restricted";
        }
        setupCommonModel(model, session, "HR");
        model.addAttribute("pageTitle", "Interview Feedback");

        List<ResumeAnalysis> analyses = resumeAnalysisRepository.findAllByOrderByCreatedAtDesc();
        ResumeAnalysis selectedCandidate = null;

        if (candIdParam != null && !candIdParam.isBlank()) {
            try {
                long id = Long.parseLong(candIdParam.replaceAll("\\D+", ""));
                selectedCandidate = resumeAnalysisRepository.findById(id).orElse(null);
            } catch (Exception ignored) {
            }
        }
        if (selectedCandidate == null && !analyses.isEmpty()) {
            selectedCandidate = analyses.get(0);
        }

        model.addAttribute("candidate", selectedCandidate);
        model.addAttribute("allCandidates", analyses);
        return "dashboard/hr/feedback";
    }

    @PostMapping("/dashboard/feedback")
    public String submitFeedback(
            @RequestParam("candId") Long candId,
            @RequestParam(value = "techScore", defaultValue = "4") int techScore,
            @RequestParam(value = "archScore", defaultValue = "4") int archScore,
            @RequestParam(value = "commScore", defaultValue = "4") int commScore,
            @RequestParam(value = "strengths", required = false) String strengths,
            @RequestParam(value = "weaknesses", required = false) String weaknesses,
            @RequestParam(value = "recommendation", defaultValue = "Strong Hire") String recommendation) {
        resumeAnalysisRepository.findById(candId).ifPresent(analysis -> {
            analysis.setFeedbackScore(Math.round((techScore + archScore + commScore) / 3.0f * 20));
            String notes = "Strengths: " + (strengths != null ? strengths : "N/A") + " | Areas: " + (weaknesses != null ? weaknesses : "N/A");
            analysis.setFeedbackNotes(notes);
            analysis.setRecommendation(recommendation);
            if ("Strong Hire".equalsIgnoreCase(recommendation) || "Hire".equalsIgnoreCase(recommendation)) {
                analysis.setStage("Offered");
            } else if ("No Hire".equalsIgnoreCase(recommendation)) {
                analysis.setStage("Rejected");
            }
            resumeAnalysisRepository.save(analysis);

            // Dispatch notification to candidate
            String candEmail = resolveCandidateEmail(analysis);
            if (candEmail != null && !candEmail.isBlank() && notificationService != null) {
                String roleName = analysis.getTargetJobRole() != null ? analysis.getTargetJobRole() : "Position";
                String title = "Interview Evaluation: " + recommendation + " ⭐";
                String msg = "The recruiting team recorded feedback for your " + roleName + " interview. Outcome: " + recommendation + ". Score: " + analysis.getFeedbackScore() + "%.";
                notificationService.sendNotification(candEmail, analysis.getCandidateName(), title, msg, "FEEDBACK", "/dashboard/notifications");
            }
        });
        return "redirect:/dashboard/interviews?feedbackSaved=true";
    }

    @GetMapping({"/dashboard/reports", "/dashboard/report"})
    public String reports(
            @RequestParam(value = "period", defaultValue = "30days") String period,
            Model model) {
        HttpSession session = getSession();
        if (!isHr(session)) {
            return "redirect:/dashboard?denied=seeker_restricted";
        }
        setupCommonModel(model, session, "HR");
        model.addAttribute("pageTitle", "Recruitment Reports");
        model.addAttribute("selectedPeriod", period);

        if (reportService != null) {
            RecruitmentReportDTO report = reportService.generateReport(period);
            model.addAttribute("report", report);
        }

        return "dashboard/hr/reports";
    }

    @GetMapping("/dashboard/reports/export")
    public void exportCsvReport(
            @RequestParam(value = "period", defaultValue = "30days") String period,
            HttpServletResponse response) throws IOException {
        HttpSession session = getSession();
        if (!isHr(session)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN);
            return;
        }

        RecruitmentReportDTO report = (reportService != null)
                ? reportService.generateReport(period)
                : new RecruitmentReportDTO();

        String csvData = (reportService != null && report != null) ? reportService.generateCsv(report) : "";
        if (csvData == null) {
            csvData = "Job Requisition,Department,Total Applications,Shortlisted,Interviews,Hired,Avg Match Score\n";
        }

        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"recruitment_analytics_report.csv\"");
        response.getOutputStream().write(csvData.getBytes(StandardCharsets.UTF_8));
        response.getOutputStream().flush();
    }

    // ==========================================
    // BACKWARD COMPATIBLE LEGACY ROUTES
    // ==========================================

    @GetMapping("/analyzer")
    public String legacyAnalyzer(Model model) {
        return resumeAnalyzer(null, model);
    }

    @GetMapping("/ats-checker")
    public String legacyAtsChecker(Model model) {
        return resumeAnalyzer(null, model);
    }

    @GetMapping("/history")
    public String legacyHistory(Model model) {
        return analyzerHistory(null, model);
    }

    @GetMapping("/job-roles")
    public String legacyJobRoles(Model model) {
        return jobRoles(model);
    }

    @GetMapping("/profile")
    public String legacyProfile(Model model) {
        return profile(null, model);
    }

    @GetMapping("/settings")
    public String legacySettings(Model model) {
        return settings(null, null, null, model);
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    private String getSessionRole(HttpSession session) {
        if (session == null) return "USER";
        String role = (String) session.getAttribute("userRole");
        return (role != null && !role.isBlank()) ? role : "USER";
    }

    private void setupCommonModel(Model model, HttpSession session, String role) {
        String sessionName = (session != null) ? (String) session.getAttribute("userName") : null;
        String sessionEmail = (session != null) ? (String) session.getAttribute("userEmail") : null;
        String sessionCompany = (session != null) ? (String) session.getAttribute("companyName") : null;

        // 1. Resolve strictly authenticated user from Spring Security Context
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User authenticatedUser = null;

        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken) && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
            String principalEmail = auth.getName();
            if (principalEmail != null && !principalEmail.isBlank()) {
                authenticatedUser = userRepository.findByEmail(principalEmail.trim().toLowerCase()).orElse(null);
            }
        }

        // 2. Fallback to session userEmail if SecurityContext had no match
        if (authenticatedUser == null && sessionEmail != null && !sessionEmail.isBlank()) {
            authenticatedUser = userRepository.findByEmail(sessionEmail.trim().toLowerCase()).orElse(null);
        }

        // 3. Keep HTTP session synchronized with genuine authenticated database user
        if (authenticatedUser != null && session != null) {
            session.setAttribute("userName", authenticatedUser.getFullName());
            session.setAttribute("userEmail", authenticatedUser.getEmail());
            if (authenticatedUser.getRole() != null) {
                session.setAttribute("userRole", "HR".equalsIgnoreCase(role) ? "HR" : authenticatedUser.getRole());
            }
            if (authenticatedUser.getPhoneNumber() != null) {
                session.setAttribute("phoneNumber", authenticatedUser.getPhoneNumber());
            }
            if (authenticatedUser.getCompanyName() != null) {
                session.setAttribute("companyName", authenticatedUser.getCompanyName());
            }
            if (authenticatedUser.getCareerRole() != null) {
                session.setAttribute("careerRole", authenticatedUser.getCareerRole());
            }
        }

        // 4. Strict separation: Authenticated account identity vs guest demo fallback
        // Extracted resume candidate details must NEVER overwrite logged-in user profile
        String activeName;
        String activeEmail;
        String activeCompany;
        String activeRole = (role != null && !role.isBlank()) ? role : "USER";

        if (authenticatedUser != null) {
            activeName = authenticatedUser.getFullName();
            activeEmail = authenticatedUser.getEmail();
            activeCompany = authenticatedUser.getCompanyName();
            if (authenticatedUser.getRole() != null && !authenticatedUser.getRole().isBlank()) {
                activeRole = ("HR".equalsIgnoreCase(role) || "RECRUITER".equalsIgnoreCase(role)) ? "HR" : authenticatedUser.getRole();
            }
        } else if (sessionEmail != null && !sessionEmail.isBlank()) {
            activeName = (sessionName != null && !sessionName.isBlank()) ? sessionName : ("HR".equalsIgnoreCase(role) ? "HR Recruiter" : "Job Seeker");
            activeEmail = sessionEmail;
            activeCompany = (sessionCompany != null && !sessionCompany.isBlank()) ? sessionCompany : null;
        } else if ("HR".equalsIgnoreCase(role)) {
            activeName = (sessionName != null && !sessionName.isBlank()) ? sessionName : "HR Recruiter";
            activeEmail = "";
            activeCompany = (sessionCompany != null && !sessionCompany.isBlank()) ? sessionCompany : "";
        } else {
            activeName = (sessionName != null && !sessionName.isBlank()) ? sessionName : "User Account";
            activeEmail = "";
            activeCompany = null;
        }

        String activeTheme = "light";
        if (authenticatedUser != null && authenticatedUser.getThemePreference() != null) {
            activeTheme = authenticatedUser.getThemePreference();
        } else if (session != null && session.getAttribute("theme") != null) {
            activeTheme = (String) session.getAttribute("theme");
        }

        if (session != null) {
            session.setAttribute("theme", activeTheme);
        }

        model.addAttribute("userRole", activeRole);
        model.addAttribute("theme", activeTheme);
        model.addAttribute("activeTheme", activeTheme);
        model.addAttribute("userName", activeName);
        model.addAttribute("userEmail", activeEmail);
        if (activeCompany != null) {
            model.addAttribute("companyName", activeCompany);
        }

        if (authenticatedUser != null) {
            model.addAttribute("userThemePreference", authenticatedUser.getThemePreference());
            model.addAttribute("notifResumeScan", authenticatedUser.isNotifResumeScan());
            model.addAttribute("notifJobInsights", authenticatedUser.isNotifJobInsights());
            model.addAttribute("notifInterviewUpdates", authenticatedUser.isNotifInterviewUpdates());
        } else {
            model.addAttribute("userThemePreference", activeTheme);
            model.addAttribute("notifResumeScan", true);
            model.addAttribute("notifJobInsights", true);
            model.addAttribute("notifInterviewUpdates", true);
        }

        if (!"HR".equalsIgnoreCase(activeRole)) {
            model.addAttribute("totalAnalyses", 0);
            model.addAttribute("averageAtsScore", 0.0);
            model.addAttribute("averageSkillMatch", 0.0);
            model.addAttribute("latestAnalysisDate", "Recent");
        }

        // Dynamic notifications for header badge and topbar dropdown
        if (notificationService != null && activeEmail != null) {
            long unreadCount = notificationService.getUnreadCount(activeEmail);
            List<Notification> topNotifs = notificationService.getRecentNotifications(activeEmail, 5);
            model.addAttribute("unreadNotifCount", unreadCount);
            model.addAttribute("topbarNotifications", topNotifs);
        } else {
            model.addAttribute("unreadNotifCount", 0L);
            model.addAttribute("topbarNotifications", Collections.emptyList());
        }
    }
}
