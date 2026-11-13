import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from './AuthContext';

const OnboardingContext = createContext();

export const JOB_SEEKER_STEPS = [
  {
    id: 'seeker-welcome',
    route: '/dashboard',
    selector: '[data-tour="dashboard-overview"]',
    sidebarSelector: '[data-tour="nav-dashboard"]',
    badge: 'STEP 01 OF 10',
    title: 'Welcome to Your Workspace',
    description: 'Welcome to SmartHire! Your personal workspace helps you analyze resumes, understand ATS compatibility, and explore career opportunities.',
    placement: 'bottom',
    icon: 'bi-speedometer2',
  },
  {
    id: 'seeker-nav-analyzer',
    route: '/dashboard',
    selector: '[data-tour="btn-analyze-resume"]',
    fallbackSelector: '[data-tour="nav-resumeanalyzer"]',
    sidebarSelector: '[data-tour="nav-resumeanalyzer"]',
    badge: 'STEP 02 OF 10',
    title: 'AI Resume Analyzer',
    description: 'Launch AI-powered analysis to evaluate your resume against industry recruitment standards.',
    placement: 'bottom',
    icon: 'bi-cpu',
  },
  {
    id: 'seeker-upload',
    route: '/dashboard/resumeanalyzer',
    selector: '[data-tour="resume-upload-zone"]',
    sidebarSelector: '[data-tour="nav-resumeanalyzer"]',
    badge: 'STEP 03 OF 10',
    title: 'Upload Your Resume',
    description: 'Upload your existing resume to begin. We support PDF, Microsoft Word (.doc, .docx), and Text files up to 10MB.',
    placement: 'bottom',
    icon: 'bi-cloud-arrow-up',
  },
  {
    id: 'seeker-target-role',
    route: '/dashboard/resumeanalyzer',
    selector: '[data-tour="target-job-role"]',
    sidebarSelector: '[data-tour="nav-resumeanalyzer"]',
    badge: 'STEP 04 OF 10',
    title: 'Target Career Profile',
    description: 'Select the profession you want to evaluate your resume against. You can also paste an optional custom job description for tailored keyword density matching.',
    placement: 'bottom',
    icon: 'bi-briefcase',
  },
  {
    id: 'seeker-ai-provider',
    route: '/dashboard/resumeanalyzer',
    selector: '[data-tour="ai-provider-select"]',
    sidebarSelector: '[data-tour="nav-resumeanalyzer"]',
    badge: 'STEP 05 OF 10',
    title: 'AI Intelligence Engine',
    description: 'Choose your preferred AI evaluation engine. SmartHire provides Local Deterministic Analysis (100% private & offline) as well as Gemini API intelligence.',
    placement: 'top',
    icon: 'bi-robot',
  },
  {
    id: 'seeker-analyze-btn',
    route: '/dashboard/resumeanalyzer',
    selector: '[data-tour="analyze-submit-button"]',
    sidebarSelector: '[data-tour="nav-resumeanalyzer"]',
    badge: 'STEP 06 OF 10',
    title: 'Analyze Resume',
    description: 'Click Analyze Resume to start evaluating your credentials against the chosen role. The AI will extract skills, experience, and format quality.',
    placement: 'top',
    icon: 'bi-lightning-charge',
  },
  {
    id: 'seeker-ats-score',
    route: '/dashboard/resumeanalyzer',
    selector: '[data-tour="ats-score-card"]',
    fallbackSelector: '[data-tour="resume-upload-zone"]',
    sidebarSelector: '[data-tour="nav-resumeanalyzer"]',
    badge: 'STEP 07 OF 10',
    title: 'Understanding Your ATS Score',
    description: 'Review your overall ATS compatibility score, category breakdowns (skills, formatting, experience), evidenced competencies, and actionable recommendations.',
    placement: 'left',
    icon: 'bi-award',
  },
  {
    id: 'seeker-history',
    route: '/dashboard/analyzerhistory',
    selector: '[data-tour="history-table"]',
    fallbackSelector: '[data-tour="nav-analyzerhistory"]',
    sidebarSelector: '[data-tour="nav-analyzerhistory"]',
    badge: 'STEP 08 OF 10',
    title: 'Scan History & Reports',
    description: 'Revisit past resume evaluations, track your score progression over time, compare job role fits, and view complete analysis reports.',
    placement: 'top',
    icon: 'bi-clock-history',
  },
  {
    id: 'seeker-additional',
    route: '/dashboard',
    selector: '[data-tour="career-growth-tools"]',
    fallbackSelector: '[data-tour="nav-skillsgap"]',
    sidebarSelector: '[data-tour="nav-skillsgap"]',
    badge: 'STEP 09 OF 10',
    title: 'Career Growth Tools',
    description: 'Explore Skills Gap Analysis to discover missing industry keywords, and Resume Improvement for formatting and phrasing tips.',
    placement: 'left',
    icon: 'bi-stars',
  },
  {
    id: 'seeker-complete',
    route: '/dashboard',
    selector: null, // Center Dialog
    sidebarSelector: '[data-tour="nav-dashboard"]',
    badge: 'STEP 10 OF 10',
    title: "You're All Set!",
    description: 'You now know how to upload your resume, perform AI analysis, and understand your ATS score. Ready to start optimizing your resume?',
    placement: 'center',
    icon: 'bi-check-circle',
    actionLabel: 'Start Exploring SmartHire',
  },
];

export const HR_STEPS = [
  {
    id: 'hr-dashboard',
    route: '/dashboard',
    selector: '[data-tour="hr-stats-grid"]',
    sidebarSelector: '[data-tour="nav-dashboard"]',
    badge: 'STEP 01 OF 10',
    title: 'Recruiter Command Center',
    description: 'Welcome to your Recruiter Dashboard. Monitor key recruitment metrics, active candidates, interview pipeline, and hiring velocity.',
    placement: 'bottom',
    icon: 'bi-speedometer2',
  },
  {
    id: 'hr-jobs',
    route: '/dashboard/jobs',
    selector: '[data-tour="create-job-btn"]',
    fallbackSelector: '[data-tour="jobs-table-card"]',
    sidebarSelector: '[data-tour="nav-jobs"]',
    badge: 'STEP 02 OF 10',
    title: 'Job Vacancy Management',
    description: 'Create, edit, and publish job requisitions. Manage opening status, department requirements, and target technical skills.',
    placement: 'bottom',
    icon: 'bi-briefcase',
  },
  {
    id: 'hr-jobroles',
    route: '/dashboard/jobroles',
    selector: '[data-tour="roles-filter"]',
    fallbackSelector: '[data-tour="roles-grid"]',
    sidebarSelector: '[data-tour="nav-jobroles"]',
    badge: 'STEP 03 OF 10',
    title: 'Job Roles & ATS Profiles',
    description: 'Define standardized skill taxonomies, required frameworks, and ATS scoring benchmarks for each position.',
    placement: 'bottom',
    icon: 'bi-compass',
  },
  {
    id: 'hr-candidates',
    route: '/dashboard/candidates',
    selector: '[data-tour="candidates-search-card"]',
    fallbackSelector: '[data-tour="candidates-table"]',
    sidebarSelector: '[data-tour="nav-candidates"]',
    badge: 'STEP 04 OF 10',
    title: 'Candidate Database & Pool',
    description: 'Browse all screened candidates, search by extracted skills, filter by match scores, and review parsed credentials.',
    placement: 'bottom',
    icon: 'bi-people',
  },
  {
    id: 'hr-applications',
    route: '/dashboard/applications',
    selector: '[data-tour="pipeline-funnel"]',
    fallbackSelector: '.pipeline-funnel-grid',
    sidebarSelector: '[data-tour="nav-applications"]',
    badge: 'STEP 05 OF 10',
    title: 'Application Pipeline',
    description: 'Track candidate applications across screening stages, from initial review to technical rounds and hiring decisions.',
    placement: 'bottom',
    icon: 'bi-inbox',
  },
  {
    id: 'hr-screening',
    route: '/dashboard/candidates',
    selector: '[data-tour="bulk-upload-btn"]',
    fallbackSelector: '[data-tour="candidates-table"]',
    sidebarSelector: '[data-tour="nav-candidates"]',
    badge: 'STEP 06 OF 10',
    title: 'Batch Resume Screening',
    description: 'Upload bulk resumes to screen entire applicant pools automatically with AI-extracted skills and matching scores.',
    placement: 'bottom',
    icon: 'bi-file-earmark-arrow-up',
  },
  {
    id: 'hr-shortlist',
    route: '/dashboard/shortlist',
    selector: '[data-tour="shortlist-table"]',
    fallbackSelector: '[data-tour="compare-selected-btn"]',
    sidebarSelector: '[data-tour="nav-shortlist"]',
    badge: 'STEP 07 OF 10',
    title: 'Priority Talent Shortlist',
    description: 'Fast-track top candidates with the highest ATS scores. Manage priority talent ready for technical evaluations.',
    placement: 'top',
    icon: 'bi-star',
  },
  {
    id: 'hr-compare',
    route: '/dashboard/shortlist',
    selector: '[data-tour="compare-selected-btn"]',
    fallbackSelector: '[data-tour="shortlist-table"]',
    sidebarSelector: '[data-tour="nav-shortlist"]',
    badge: 'STEP 08 OF 10',
    title: 'Side-by-Side Candidate Comparison',
    description: 'Select 2 or 3 shortlisted candidates to compare their skills, ATS scores, experience, and projects head-to-head.',
    placement: 'bottom',
    icon: 'bi-columns-gap',
  },
  {
    id: 'hr-interviews',
    route: '/dashboard/interviews',
    selector: '[data-tour="schedule-interview-btn"]',
    fallbackSelector: '.page-header-actions',
    sidebarSelector: '[data-tour="nav-interviews"]',
    badge: 'STEP 09 OF 10',
    title: 'Interview Management & Scorecards',
    description: 'Coordinate video calls, set interview rounds, record panel feedback scorecards, and notify candidates in real time.',
    placement: 'bottom',
    icon: 'bi-calendar2-week',
  },
  {
    id: 'hr-reports',
    route: '/dashboard/reports',
    selector: null, // Center Dialog
    sidebarSelector: '[data-tour="nav-reports"]',
    badge: 'STEP 10 OF 10',
    title: 'Your Recruiter Workspace is Ready!',
    description: 'Analyze hiring pipeline conversion, requisition fulfillment, and ATS score distributions to optimize hiring outcomes.',
    placement: 'center',
    icon: 'bi-check-circle',
    actionLabel: 'Explore Recruiter Dashboard',
  },
];

export const OnboardingProvider = ({ children }) => {
  const { user, isHr, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [tourSkipped, setTourSkipped] = useState(false);
  const [tourSeen, setTourSeen] = useState(false);

  // Target element geometry
  const [targetRect, setTargetRect] = useState(null);
  const [targetElement, setTargetElement] = useState(null);
  const [sidebarRect, setSidebarRect] = useState(null);
  const [sidebarElement, setSidebarElement] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const steps = isHr ? HR_STEPS : JOB_SEEKER_STEPS;
  const currentStep = steps[currentStepIndex] || null;

  // Local storage helper (unique per user email)
  const getStorageKey = useCallback(() => {
    return user?.email ? `smarthire_tour_${user.email.toLowerCase()}` : 'smarthire_tour_guest';
  }, [user]);

  // Track user email prompted in the current session
  const hasCheckedUserRef = useRef(null);

  // Synchronize preferences to backend and localStorage
  const savePreferences = useCallback(
    async (completed, skipped, seen = true, lastStep = 0) => {
      setTourCompleted(completed);
      setTourSkipped(skipped);
      setTourSeen(seen);

      // Save locally
      try {
        localStorage.setItem(
          getStorageKey(),
          JSON.stringify({
            tourCompleted: completed,
            tourSkipped: skipped,
            tourSeen: seen,
            lastStep,
            role: isHr ? 'HR' : 'JOB_SEEKER',
            timestamp: Date.now(),
          })
        );
      } catch (ignored) {}

      // Save to backend database
      try {
        await api.post('/user/onboarding', {
          tourCompleted: completed,
          tourSkipped: skipped,
          tourSeen: seen,
          tourLastStep: lastStep,
        });
      } catch (ignored) {}
    },
    [getStorageKey, isHr]
  );

  // Fetch preferences from backend & fallback to localStorage
  // Requirement: ONLY show guide once on first-time login on dashboard. Never show on 2nd login.
  useEffect(() => {
    // 1. Must be authenticated with a valid user
    if (!isAuthenticated || !user || !user.email) return;

    // 2. ONLY run check when user is physically inside the dashboard
    if (!location.pathname.startsWith('/dashboard')) return;

    const userEmailKey = user.email.trim().toLowerCase();

    // 3. Avoid duplicate prompting during navigation between dashboard sub-pages in same session
    if (hasCheckedUserRef.current === userEmailKey) return;

    let isMounted = true;

    const checkPreferences = async () => {
      let completed = false;
      let skipped = false;
      let seen = false;

      // 1. Try local cache first for instant feedback
      try {
        const local = localStorage.getItem(getStorageKey());
        if (local) {
          const parsed = JSON.parse(local);
          completed = !!parsed.tourCompleted;
          skipped = !!parsed.tourSkipped;
          seen = !!parsed.tourSeen;
        }
      } catch (ignored) {}

      // 2. Check user object from AuthContext
      if (user) {
        if (user.tourCompleted !== undefined) completed = completed || !!user.tourCompleted;
        if (user.tourSkipped !== undefined) skipped = skipped || !!user.tourSkipped;
        if (user.tourSeen !== undefined) seen = seen || !!user.tourSeen;
      }

      // 3. Fetch authoritative state from backend API (Neon PostgreSQL)
      try {
        const res = await api.get('/user/onboarding');
        if (res.data && res.data.success) {
          completed = completed || !!res.data.tourCompleted;
          skipped = skipped || !!res.data.tourSkipped;
          seen = seen || !!res.data.tourSeen;
        }
      } catch (err) {
        // Fallback gracefully on local storage
      }

      if (!isMounted) return;

      setTourCompleted(completed);
      setTourSkipped(skipped);
      setTourSeen(seen);
      hasCheckedUserRef.current = userEmailKey;

      // Check if user just registered or completed 1st Google OAuth sign-in
      const isFirstLoginFlag = typeof window !== 'undefined' && sessionStorage.getItem('smarthire_first_login') === 'true';
      const isFirstTimeUser = isFirstLoginFlag || (!completed && !skipped && !seen);

      if (isFirstTimeUser && !isActive) {
        if (isFirstLoginFlag) {
          try {
            sessionStorage.removeItem('smarthire_first_login');
          } catch (_) {}
        }
        // Allow dashboard layout and components 600ms to mount comfortably
        const timer = setTimeout(() => {
          if (isMounted) {
            setShowWelcomeModal(true);
          }
        }, 600);
        return () => clearTimeout(timer);
      }
    };

    checkPreferences();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user, location.pathname, getStorageKey, isActive]);

  // Helper to determine if an element is currently visible and on-screen
  const isElementVisibleOnScreen = (el) => {
    if (!el) return false;
    // Check if element is inside mobile sidebar drawer when the drawer is closed
    const sidebar = el.closest('#dashboardSidebar');
    if (sidebar && window.innerWidth <= 900 && !sidebar.classList.contains('is-open')) {
      return false;
    }
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    // Off-screen horizontally or vertically
    if (rect.right <= 10 || rect.bottom <= 10 || rect.left >= window.innerWidth - 10 || rect.top >= window.innerHeight - 10) {
      return false;
    }
    // Offscreen to the left (e.g. collapsed or offscreen drawer)
    if (rect.left < 0 && rect.right < 50) return false;
    return true;
  };

  // Helper to resolve the best visible target element
  const resolveTargetElement = useCallback((step) => {
    if (!step || step.selector === null) return null;
    let el = document.querySelector(step.selector);
    if (isElementVisibleOnScreen(el)) return el;
    if (step.fallbackSelector) {
      el = document.querySelector(step.fallbackSelector);
      if (isElementVisibleOnScreen(el)) return el;
    }
    return null;
  }, []);

  // Compute clamped target bounding rect that never sticks outside the visible viewport
  const calculateClampedRect = (el) => {
    if (!el || !isElementVisibleOnScreen(el)) return null;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const padding = 6;

    const left = Math.max(8, rect.left - padding);
    const top = Math.max(8, rect.top - padding);
    const right = Math.min(vw - 8, rect.right + padding);
    const bottom = Math.min(vh - 8, rect.bottom + padding);
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);

    if (width < 10 || height < 10) return null;

    return {
      top,
      left,
      width,
      height,
      bottom,
      right,
      rawTop: rect.top,
      rawLeft: rect.left,
    };
  };

  // Helper to toggle active CSS class on the corresponding sidebar nav link
  const highlightSidebarElement = useCallback((el) => {
    document.querySelectorAll('.tour-active-nav').forEach((item) => {
      item.classList.remove('tour-active-nav');
    });
    if (el) {
      el.classList.add('tour-active-nav');
    }
  }, []);

  const clearTourHighlights = useCallback(() => {
    document.querySelectorAll('.tour-active-nav').forEach((item) => {
      item.classList.remove('tour-active-nav');
    });
    setSidebarRect(null);
    setSidebarElement(null);
    setTargetRect(null);
    setTargetElement(null);
  }, []);

  // Measure and update the target element coordinates
  const updateTargetPosition = useCallback(() => {
    // 1. Main target on page
    if (!currentStep || currentStep.selector === null) {
      setTargetRect(null);
      setTargetElement(null);
    } else {
      const el = resolveTargetElement(currentStep);
      if (el) {
        const clamped = calculateClampedRect(el);
        setTargetRect(clamped);
        setTargetElement(clamped ? el : null);
      } else {
        setTargetRect(null);
        setTargetElement(null);
      }
    }

    // 2. Corresponding sidebar / slider bar navigation item
    if (currentStep?.sidebarSelector) {
      const sideEl = document.querySelector(currentStep.sidebarSelector);
      if (sideEl && isElementVisibleOnScreen(sideEl)) {
        const sideClamped = calculateClampedRect(sideEl);
        setSidebarRect(sideClamped);
        setSidebarElement(sideClamped ? sideEl : null);
        highlightSidebarElement(sideClamped ? sideEl : null);
      } else {
        setSidebarRect(null);
        setSidebarElement(null);
        highlightSidebarElement(null);
      }
    } else {
      setSidebarRect(null);
      setSidebarElement(null);
      highlightSidebarElement(null);
    }
  }, [currentStep, resolveTargetElement, highlightSidebarElement]);

  // Listen to window resize and scroll events
  useEffect(() => {
    if (!isActive) return;

    const handleUpdate = () => {
      requestAnimationFrame(updateTargetPosition);
    };

    window.addEventListener('resize', handleUpdate, { passive: true });
    window.addEventListener('scroll', handleUpdate, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, { capture: true });
    };
  }, [isActive, updateTargetPosition]);

  // Handle Step Activation & Route Changes
  useEffect(() => {
    if (!isActive || !currentStep) return;

    let isCancelled = false;

    const activateStep = async () => {
      setIsTransitioning(true);

      // Check if we need to navigate to another route
      if (currentStep.route && location.pathname !== currentStep.route) {
        navigate(currentStep.route);
      }

      // If step has no selector (Center dialog step), clear target and settle
      if (!currentStep.selector) {
        setTargetRect(null);
        setTargetElement(null);
        if (currentStep.sidebarSelector) {
          const sideEl = document.querySelector(currentStep.sidebarSelector);
          if (sideEl && isElementVisibleOnScreen(sideEl)) {
            const sideClamped = calculateClampedRect(sideEl);
            setSidebarRect(sideClamped);
            setSidebarElement(sideClamped ? sideEl : null);
            highlightSidebarElement(sideClamped ? sideEl : null);
          } else {
            setSidebarRect(null);
            setSidebarElement(null);
            highlightSidebarElement(null);
          }
        }
        setIsTransitioning(false);
        return;
      }

      // Wait for target DOM element to be rendered (poll up to 2500ms)
      const maxRetries = 25;
      let retries = 0;

      const waitForElement = () => {
        if (isCancelled) return;

        const el = resolveTargetElement(currentStep);

        if (el) {
          // Scroll element smoothly into center view
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

          // Measure after scroll settles
          setTimeout(() => {
            if (isCancelled) return;
            const clamped = calculateClampedRect(el);
            setTargetRect(clamped);
            setTargetElement(clamped ? el : null);

            // Measure corresponding sidebar navigation item
            if (currentStep.sidebarSelector) {
              const sideEl = document.querySelector(currentStep.sidebarSelector);
              if (sideEl && isElementVisibleOnScreen(sideEl)) {
                try {
                  sideEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } catch (ignored) {}
                const sideClamped = calculateClampedRect(sideEl);
                setSidebarRect(sideClamped);
                setSidebarElement(sideClamped ? sideEl : null);
                highlightSidebarElement(sideClamped ? sideEl : null);
              } else {
                setSidebarRect(null);
                setSidebarElement(null);
                highlightSidebarElement(null);
              }
            } else {
              setSidebarRect(null);
              setSidebarElement(null);
              highlightSidebarElement(null);
            }

            setIsTransitioning(false);
          }, 260);
        } else if (retries < maxRetries) {
          retries++;
          setTimeout(waitForElement, 90);
        } else {
          // Timeout reached, fallback gracefully
          setIsTransitioning(false);
          setTargetRect(null);
          setTargetElement(null);
        }
      };

      waitForElement();
    };

    activateStep();

    return () => {
      isCancelled = true;
    };
  }, [isActive, currentStepIndex, currentStep, location.pathname, navigate, resolveTargetElement, highlightSidebarElement]);

  // Tour Controls
  const startTour = useCallback((stepIdx = 0) => {
    setShowWelcomeModal(false);
    setShowCompletionModal(false);
    setCurrentStepIndex(stepIdx);
    setIsActive(true);
    // Mark as seen immediately so 2nd login will not auto-open the welcome modal
    savePreferences(false, false, true, stepIdx);
  }, [savePreferences]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Completed all steps
      completeTour();
    }
  }, [currentStepIndex, steps.length]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback(
    (index) => {
      if (index >= 0 && index < steps.length) {
        setCurrentStepIndex(index);
      }
    },
    [steps.length]
  );

  const dismissWelcome = useCallback(() => {
    setShowWelcomeModal(false);
    // Mark as seen so 2nd login will not auto-open
    savePreferences(false, false, true, 0);
  }, [savePreferences]);

  const skipTour = useCallback(() => {
    setIsActive(false);
    setShowWelcomeModal(false);
    setShowCompletionModal(false);
    clearTourHighlights();
    savePreferences(false, true, true, currentStepIndex);
  }, [savePreferences, currentStepIndex, clearTourHighlights]);

  const completeTour = useCallback(() => {
    setIsActive(false);
    setShowCompletionModal(true);
    clearTourHighlights();
    savePreferences(true, false, true, steps.length);
  }, [savePreferences, steps.length, clearTourHighlights]);

  const restartTour = useCallback(async () => {
    setShowWelcomeModal(false);
    setShowCompletionModal(false);
    clearTourHighlights();
    startTour(0);
  }, [startTour, clearTourHighlights]);

  const resetTourProgress = useCallback(async () => {
    setShowWelcomeModal(false);
    setShowCompletionModal(false);
    setIsActive(false);
    setTourCompleted(false);
    setTourSkipped(false);
    setTourSeen(false);
    clearTourHighlights();
    hasCheckedUserRef.current = null; // allow re-prompting on next visit
    try {
      localStorage.removeItem(getStorageKey());
      await api.post('/user/onboarding/reset');
    } catch (ignored) {}
  }, [getStorageKey, clearTourHighlights]);

  const closeTour = useCallback(() => {
    setIsActive(false);
    setShowWelcomeModal(false);
    setShowCompletionModal(false);
    clearTourHighlights();
    // Ensure closing via tooltip X also saves seen so 2nd login doesn't auto-open
    savePreferences(tourCompleted, true, true, currentStepIndex);
  }, [clearTourHighlights, savePreferences, tourCompleted, currentStepIndex]);

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStepIndex,
        totalSteps: steps.length,
        currentStep,
        steps,
        targetRect,
        targetElement,
        sidebarRect,
        sidebarElement,
        isTransitioning,
        showWelcomeModal,
        showCompletionModal,
        tourCompleted,
        tourSkipped,
        tourSeen,
        isHr,
        startTour,
        nextStep,
        prevStep,
        goToStep,
        skipTour,
        completeTour,
        restartTour,
        resetTourProgress,
        dismissWelcome,
        closeTour,
        setShowWelcomeModal,
        setShowCompletionModal,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
