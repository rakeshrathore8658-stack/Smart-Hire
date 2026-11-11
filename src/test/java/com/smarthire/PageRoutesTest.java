package com.smarthire;

import com.smarthire.controller.AuthController;
import com.smarthire.controller.PageController;
import com.smarthire.dto.RegisterRequest;
import com.smarthire.entity.User;
import com.smarthire.service.AuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        controllers = {PageController.class, AuthController.class},
        excludeAutoConfiguration = {org.springframework.boot.thymeleaf.autoconfigure.ThymeleafAutoConfiguration.class}
)
@org.springframework.test.context.TestPropertySource(properties = {
        "spring.mvc.view.prefix=/WEB-INF/views/",
        "spring.mvc.view.suffix=.html"
})
@AutoConfigureMockMvc(addFilters = false)
class PageRoutesTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private com.smarthire.service.JobService jobService;

    @MockitoBean
    private com.smarthire.repository.ResumeAnalysisRepository resumeAnalysisRepository;

    @MockitoBean
    private com.smarthire.repository.UserRepository userRepository;

    @MockitoBean
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @MockitoBean
    private com.smarthire.service.ReportService reportService;

    @MockitoBean
    private com.smarthire.service.ResumeParserService resumeParserService;

    @MockitoBean
    private com.smarthire.service.ResumeNormalizationService resumeNormalizationService;

    @MockitoBean
    private com.smarthire.service.ResumeExtractionService resumeExtractionService;

    @MockitoBean
    private com.smarthire.repository.ResumeRepository resumeRepository;

    @MockitoBean
    private com.smarthire.service.ResumeAnalysisService resumeAnalysisService;

    @MockitoBean
    private com.smarthire.service.NotificationService notificationService;

    @Test
    @DisplayName("1. Public Pages (Home, Login, Register, Forgot Password)")
    void testPublicPages() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(view().name("index"));

        mockMvc.perform(get("/login"))
                .andExpect(status().isOk())
                .andExpect(view().name("login"));

        mockMvc.perform(get("/register"))
                .andExpect(status().isOk())
                .andExpect(view().name("register"));

        mockMvc.perform(get("/forgot-password"))
                .andExpect(status().isOk())
                .andExpect(view().name("forgot-password"));
    }

    @Test
    @DisplayName("2. Dashboard Common Pages")
    void testDashboardCommonPages() throws Exception {
        mockMvc.perform(get("/dashboard"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/index"));

        mockMvc.perform(get("/dashboard").param("role", "HR"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/index"))
                .andExpect(model().attribute("userRole", "HR"));

        mockMvc.perform(get("/dashboard/profile"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/profile"));

        mockMvc.perform(get("/dashboard/settings"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/settings"));

        // Settings Preferences update & theme AJAX
        User testUser = new User("Settings User", "settings@user.com", null, "pass", "USER", null, null);
        Mockito.when(userRepository.findByEmail("settings@user.com")).thenReturn(Optional.of(testUser));

        mockMvc.perform(post("/dashboard/settings/preferences")
                        .param("themeChoice", "dark")
                        .param("notifResumeScan", "true")
                        .param("notifJobInsights", "false")
                        .param("notifInterviewUpdates", "true")
                        .sessionAttr("userEmail", "settings@user.com"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/dashboard/settings?saved=true"));

        mockMvc.perform(post("/dashboard/settings/theme")
                        .param("theme", "dark")
                        .sessionAttr("userEmail", "settings@user.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.theme").value("dark"));

        mockMvc.perform(get("/dashboard/notifications"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/notifications"));

        mockMvc.perform(get("/dashboard/help"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/help"));
    }

    @Test
    @DisplayName("3. Job Seeker / User Workflows")
    void testUserWorkflowPages() throws Exception {
        mockMvc.perform(get("/dashboard/resumeanalyzer"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/user/smarthire"));

        mockMvc.perform(get("/dashboard/analyzerhistory"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/user/analyzerhistory"));

        com.smarthire.entity.Job testJob = new com.smarthire.entity.Job();
        testJob.setId(1L);
        testJob.setTitle("Senior Java Developer");
        testJob.setDepartment("Engineering");
        testJob.setRequiredSkills("Java, Spring Boot, Microservices");
        testJob.setMinExperience(3);
        testJob.setMaxExperience(6);
        testJob.setLocation("Indore / Remote");
        testJob.setDescription("Design enterprise services");
        testJob.setStatus("Open");
        org.mockito.Mockito.when(jobService.getAllJobs()).thenReturn(java.util.List.of(testJob));

        mockMvc.perform(get("/dashboard/jobroles"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/user/jobroles"));

        mockMvc.perform(get("/dashboard/resumeimprovement"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/user/resumeimprovement"));

        mockMvc.perform(get("/dashboard/skillsgap"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/user/skillsgap"));
    }

    @Test
    @DisplayName("4. HR & Recruiter Workflows (Candidates, Shortlist, Jobs, Interviews, Reports)")
    void testHrWorkflowPages() throws Exception {
        mockMvc.perform(get("/dashboard/jobs").sessionAttr("userRole", "HR"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/hr/jobs"));

        mockMvc.perform(get("/dashboard/jobs/create").sessionAttr("userRole", "HR"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/hr/job-form"));

        mockMvc.perform(get("/dashboard/jobs/job-101").sessionAttr("userRole", "HR"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/hr/job-details"));

        mockMvc.perform(get("/dashboard/candidates").sessionAttr("userRole", "HR"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/hr/candidates"));

        mockMvc.perform(get("/dashboard/candidate").sessionAttr("userRole", "HR"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/hr/candidates"));

        mockMvc.perform(get("/dashboard/candidates/cand-101").sessionAttr("userRole", "HR"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/hr/candidate-details"));

        mockMvc.perform(get("/dashboard/applications").sessionAttr("userRole", "HR"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/hr/applications"));

        // Stage filters for Shortlisted and Offered
        mockMvc.perform(get("/dashboard/applications").param("stage", "Shortlisted").sessionAttr("userRole", "HR"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/hr/applications"))
                .andExpect(model().attribute("selectedStage", "Shortlisted"));

        mockMvc.perform(get("/dashboard/applications").param("stage", "Offered").sessionAttr("userRole", "HR"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/hr/applications"))
                .andExpect(model().attribute("selectedStage", "Offered"));

        // Update stage POST
        com.smarthire.entity.ResumeAnalysis dummyAnalysis = new com.smarthire.entity.ResumeAnalysis();
        dummyAnalysis.setId(55L);
        dummyAnalysis.setCandidateName("Test Candidate");
        dummyAnalysis.setCandidateEmail("cand@test.com");
        Mockito.when(resumeAnalysisRepository.findById(55L)).thenReturn(Optional.of(dummyAnalysis));

        mockMvc.perform(post("/dashboard/applications/55/stage")
                        .param("stage", "Offered")
                        .param("filter", "Offered")
                        .sessionAttr("userRole", "HR"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/dashboard/applications?saved=true&stage=Offered"));

        mockMvc.perform(get("/dashboard/shortlist").sessionAttr("userRole", "HR"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/hr/shortlist"));

        mockMvc.perform(get("/dashboard/interviews").sessionAttr("userRole", "HR"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/hr/interviews"));

        mockMvc.perform(get("/dashboard/feedback").sessionAttr("userRole", "HR"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/hr/feedback"));

        mockMvc.perform(get("/dashboard/reports").sessionAttr("userRole", "HR"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/hr/reports"));

        mockMvc.perform(get("/dashboard/reports/export").sessionAttr("userRole", "HR"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("5. Legacy Fallback Routes")
    void testLegacyFallbackPages() throws Exception {
        mockMvc.perform(get("/analyzer"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/user/smarthire"));

        mockMvc.perform(get("/ats-checker"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/user/smarthire"));

        mockMvc.perform(get("/history"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/user/analyzerhistory"));

        mockMvc.perform(get("/job-roles"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/user/jobroles"));

        mockMvc.perform(get("/profile"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/profile"));

        mockMvc.perform(get("/settings"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/settings"));
    }

    @Test
    @DisplayName("6. Role-Based Route Access Control")
    void testRouteAccessControl() throws Exception {
        // HR user trying to access Job Seeker tool -> redirected to /dashboard?denied=hr_restricted
        mockMvc.perform(get("/dashboard/resumeanalyzer").sessionAttr("userRole", "HR"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/dashboard?denied=hr_restricted"));

        // Seeker user trying to access HR tool -> redirected to /dashboard?denied=seeker_restricted
        mockMvc.perform(get("/dashboard/jobs").sessionAttr("userRole", "USER"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/dashboard?denied=seeker_restricted"));
    }

    @Test
    @DisplayName("7. Form Submissions (Login, Role Mismatch & Registration)")
    void testFormSubmissions() throws Exception {
        User hrUser = new User();
        hrUser.setFullName("Sarah Jenkins");
        hrUser.setEmail("sarah@company.com");
        hrUser.setRole("HR");
        hrUser.setCompanyName("ITSoftLab");

        User seekerUser = new User();
        seekerUser.setFullName("Alex Morgan");
        seekerUser.setEmail("alex@email.com");
        seekerUser.setRole("USER");

        Mockito.when(authService.authenticate(eq("sarah@company.com"), eq("password123"))).thenReturn(Optional.of(hrUser));
        Mockito.when(authService.authenticate(eq("alex@email.com"), eq("password123"))).thenReturn(Optional.of(seekerUser));
        Mockito.when(authService.register(any(RegisterRequest.class))).thenReturn(hrUser);
        Mockito.when(authService.resetPassword(eq("alex@email.com"), any())).thenReturn(true);

        // HR Login with HR portal -> redirected to /dashboard (SUCCESS)
        mockMvc.perform(post("/login")
                        .param("role", "HR")
                        .param("username", "sarah@company.com")
                        .param("password", "password123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/dashboard"));

        // Seeker Login with USER portal -> redirected to /dashboard (SUCCESS)
        mockMvc.perform(post("/login")
                        .param("role", "USER")
                        .param("username", "alex@email.com")
                        .param("password", "password123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/dashboard"));

        // HR user trying to log into Job Seeker portal -> PORTAL MISMATCH ERROR
        mockMvc.perform(post("/login")
                        .param("role", "USER")
                        .param("username", "sarah@company.com")
                        .param("password", "password123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login?error=portal_mismatch&role=USER&username=sarah@company.com"));

        // Seeker user trying to log into HR portal -> PORTAL MISMATCH ERROR
        mockMvc.perform(post("/login")
                        .param("role", "HR")
                        .param("username", "alex@email.com")
                        .param("password", "password123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login?error=portal_mismatch&role=HR&username=alex@email.com"));

        // Register HR with Phone Number
        mockMvc.perform(post("/register")
                        .param("role", "HR")
                        .param("fullName", "Sarah Jenkins")
                        .param("email", "sarah@company.com")
                        .param("phoneNumber", "+91 98765 43210")
                        .param("password", "password123")
                        .param("confirmPassword", "password123")
                        .param("companyName", "ITSoftLab"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/dashboard"));

        // Forgot Password
        mockMvc.perform(post("/forgot-password")
                        .param("email", "alex@email.com")
                        .param("newPassword", "newPassword123")
                        .param("confirmPassword", "newPassword123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login?reset=true"));

        // Logout Flow (GET & POST)
        mockMvc.perform(get("/logout"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login?logout=true"));

        mockMvc.perform(post("/logout"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login?logout=true"));
    }

    @Test
    @DisplayName("7. Identity Separation: Authenticated User identity is NEVER overwritten by Resume Candidate details")
    void testIdentitySeparationFromResumeCandidate() throws Exception {
        // Setup authenticated user Vicky
        User vicky = new User("Vicky", "vicky@gmail.com", "+91 99999 88888", "hashed", "USER", "Java Developer", null);
        Mockito.when(userRepository.findByEmail("vicky@gmail.com")).thenReturn(Optional.of(vicky));

        // Setup candidate analysis in DB with candidate Ramu Kushwah
        com.smarthire.entity.ResumeAnalysis ramuAnalysis = new com.smarthire.entity.ResumeAnalysis();
        ramuAnalysis.setId(20L);
        ramuAnalysis.setCandidateName("Ramu Kushwah");
        ramuAnalysis.setCandidateEmail("ramu@gmail.com");
        ramuAnalysis.setCandidateEmailNormalized("ramu@gmail.com");
        ramuAnalysis.setOverallScore(85);
        ramuAnalysis.setTargetJobRole("Java Developer");
        Mockito.when(resumeAnalysisRepository.findById(20L)).thenReturn(Optional.of(ramuAnalysis));
        Mockito.when(resumeAnalysisRepository.findTop10ByOrderByCreatedAtDesc()).thenReturn(java.util.List.of(ramuAnalysis));

        // When Vicky views Resume Analyzer page with analysis id 20:
        // Navbar and user identity in model MUST be Vicky, NOT Ramu Kushwah
        mockMvc.perform(get("/dashboard/resumeanalyzer")
                        .param("id", "20")
                        .sessionAttr("userName", "Vicky")
                        .sessionAttr("userEmail", "vicky@gmail.com")
                        .sessionAttr("userRole", "USER"))
                .andExpect(status().isOk())
                .andExpect(model().attribute("userName", "Vicky"))
                .andExpect(model().attribute("userEmail", "vicky@gmail.com"))
                .andExpect(model().attribute("hasAnalysis", true))
                .andExpect(model().attribute("analysis", ramuAnalysis));

        // When Vicky views Profile page:
        // Profile MUST show Vicky's details, NOT Ramu Kushwah
        mockMvc.perform(get("/dashboard/profile")
                        .sessionAttr("userName", "Vicky")
                        .sessionAttr("userEmail", "vicky@gmail.com")
                        .sessionAttr("userRole", "USER"))
                .andExpect(status().isOk())
                .andExpect(model().attribute("userName", "Vicky"))
                .andExpect(model().attribute("userEmail", "vicky@gmail.com"));

        // When unauthenticated/guest visits dashboard with no session:
        // Seeker identity must default to generic User Account, NEVER Ramu Kushwah or demo identity
        mockMvc.perform(get("/dashboard/resumeanalyzer"))
                .andExpect(status().isOk())
                .andExpect(model().attribute("userName", "User Account"))
                .andExpect(model().attribute("userEmail", ""));
    }
}
