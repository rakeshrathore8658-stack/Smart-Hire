import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import '../../styles/landing.css';

const defaultSeedRoles = [
  { id: 1, title: 'Java Developer', department: 'Engineering', openings: 3, location: 'Remote / Hybrid' },
  { id: 2, title: 'Spring Boot Engineer', department: 'Engineering', openings: 2, location: 'Bengaluru / Remote' },
  { id: 3, title: 'Full Stack MERN', department: 'Engineering', openings: 4, location: 'Indore / Hybrid' },
  { id: 4, title: 'Cloud & DevOps Architect', department: 'Infrastructure', openings: 2, location: 'Pune / Remote' },
  { id: 5, title: 'Data Analyst / Engineer', department: 'Data & Analytics', openings: 2, location: 'Hyderabad' },
  { id: 6, title: 'Mobile Developer', department: 'Engineering', openings: 1, location: 'Remote' },
  { id: 7, title: 'Cybersecurity Specialist', department: 'Security', openings: 1, location: 'Remote' },
  { id: 8, title: 'AI & NLP Engineer', department: 'AI Research', openings: 2, location: 'Remote' },
];

const getJobIcon = (title, dept) => {
  const t = (title || '').toLowerCase();
  const d = (dept || '').toLowerCase();
  if (t.includes('java')) return 'bi-filetype-java';
  if (t.includes('spring')) return 'bi-layers';
  if (t.includes('react') || t.includes('mern') || t.includes('full stack') || t.includes('frontend')) return 'bi-code-slash';
  if (t.includes('cloud') || t.includes('devops') || t.includes('aws') || d.includes('infra')) return 'bi-cloud';
  if (t.includes('data') || t.includes('sql') || t.includes('analyst')) return 'bi-database';
  if (t.includes('ai') || t.includes('nlp') || t.includes('machine learning')) return 'bi-robot';
  if (t.includes('security') || t.includes('cyber')) return 'bi-shield-check';
  if (t.includes('mobile') || t.includes('android') || t.includes('ios')) return 'bi-phone';
  return 'bi-briefcase';
};

const LandingPage = () => {
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated, isHr } = useAuth();
  const [dbJobs, setDbJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchJobs = async () => {
      try {
        const res = await api.get('/jobs');
        const list = res.data?.jobs || (Array.isArray(res.data) ? res.data : []);
        if (isMounted && list && list.length > 0) {
          setDbJobs(list);
        } else {
          setDbJobs(defaultSeedRoles);
        }
      } catch (err) {
        setDbJobs(defaultSeedRoles);
      } finally {
        if (isMounted) setLoadingJobs(false);
      }
    };
    fetchJobs();
    return () => {
      isMounted = false;
    };
  }, []);

  const displayedJobs = dbJobs.length > 0 ? dbJobs : defaultSeedRoles;

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="landing-wrapper">
      {/* ================= HEADER / NAVBAR (Non-Scrollable / Static at Top) ================= */}
      <header className="navbar landing-navbar">
        <div className="container navbar-inner">
          <Link className="brand" to="/" aria-label="SmartHire Home">
            <span className="brand-mark" aria-hidden="true">///</span>
            <span>
              SmartHire<span className="brand-mark">.</span>
            </span>
          </Link>

          <nav className="nav-links" aria-label="Main navigation">
            <Link className="nav-link active" to="/">Home</Link>
            <a className="nav-link" href="#features" onClick={(e) => scrollToSection(e, 'features')}>
              Features
            </a>
            <a className="nav-link" href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')}>
              How it works
            </a>
            <a className="nav-link" href="#job-profiles" onClick={(e) => scrollToSection(e, 'job-profiles')}>
              Job profiles
            </a>
            <a className="nav-link" href="#faq" onClick={(e) => scrollToSection(e, 'faq')}>
              FAQ
            </a>
          </nav>

          <div className="nav-actions">
            <button
              type="button"
              className="theme-toggle"
              data-theme-toggle
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={isDark}
              title="Switch theme"
            >
              <span className="icon-moon" aria-hidden="true"><i className="bi bi-moon-stars"></i></span>
              <span className="icon-sun" aria-hidden="true"><i className="bi bi-sun"></i></span>
            </button>

            {isAuthenticated ? (
              <Link className="btn btn-primary" to={isHr ? '/dashboard/hr' : '/dashboard'}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link className="btn btn-secondary" to="/login">
                  Log in
                </Link>
                <Link className="btn btn-primary" to="/register">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ================= HERO SECTION ================= */}
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-content">
              <div className="eyebrow-pill">
                <span className="eyebrow-dot"></span>
                <span>AI-Powered Career Intelligence</span>
              </div>
              <h1>
                YOUR RESUME.<br />
                <span>READY TO SHINE.</span>
              </h1>
              <p className="hero-description">
                Discover your strengths, identify missing skills and understand how your resume
                matches your target job. Make your next career move with confidence.
              </p>

              <div className="hero-actions">
                <Link className="btn btn-primary btn-lg" to="/register">
                  Analyze Your Resume
                </Link>
                <a
                  className="btn btn-secondary btn-lg"
                  href="#how-it-works"
                  onClick={(e) => scrollToSection(e, 'how-it-works')}
                >
                  See How It Works
                </a>
              </div>

              <p className="hero-note">
                <i className="bi bi-check2-circle" style={{ color: 'var(--accent)', fontSize: '1rem' }}></i>
                AI-powered insights for technical and non-technical career profiles.
              </p>
            </div>

            {/* Resume Analysis Preview Card */}
            <div className="preview-card">
              <div className="preview-top">
                <div>
                  <span className="eyebrow" style={{ fontSize: '0.74rem', letterSpacing: '0.08em' }}>SAMPLE REPORT</span>
                  <h3 style={{ margin: '6px 0 0', fontSize: '1.25rem', fontWeight: 800 }}>Resume Overview</h3>
                </div>
                <span className="badge badge-accent">AI Insights</span>
              </div>

              <div className="preview-score">
                <div className="score-circle">
                  <div>
                    <strong>85</strong>
                    <br />
                    <small>OUT OF 100</small>
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800 }}>Your profile at a glance</h3>
                  <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Sample score for demonstration only.
                  </p>
                  <span className="badge badge-success">Sample analysis</span>
                </div>
              </div>

              <div className="preview-list">
                <div>
                  <div className="preview-skill">
                    <span>Skills match</span>
                    <strong>80%</strong>
                  </div>
                  <div className="progress" style={{ marginTop: '6px' }}>
                    <div className="progress-bar" style={{ width: '80%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="preview-skill">
                    <span>Keywords match</span>
                    <strong>70%</strong>
                  </div>
                  <div className="progress" style={{ marginTop: '6px' }}>
                    <div className="progress-bar" style={{ width: '70%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="preview-skill">
                    <span>ATS readability</span>
                    <strong>90%</strong>
                  </div>
                  <div className="progress" style={{ marginTop: '6px' }}>
                    <div className="progress-bar" style={{ width: '90%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= FEATURES SECTION ================= */}
        <section className="section section-muted" id="features">
          <div className="container">
            <div className="section-header text-center" style={{ maxWidth: '700px', margin: '0 auto 48px' }}>
              <span className="eyebrow">WHY SMARTHIRE</span>
              <h2 style={{ fontSize: '2.1rem', fontWeight: 800, margin: '8px 0 14px' }}>
                Built for Both Candidates and Recruiters
              </h2>
              <p className="section-description" style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', margin: 0 }}>
                From intelligent resume parsing to automated job scoring, SmartHire streamlines the
                modern tech recruitment workflow.
              </p>
            </div>

            <div className="grid grid-3">
              <div className="feature-card">
                <span className="feature-icon" aria-hidden="true">
                  <i className="bi bi-cpu"></i>
                </span>
                <h3>ATS Compatibility Engine</h3>
                <p>
                  Evaluate resumes against modern applicant tracking algorithms, section headers,
                  formatting rules, and industry keywords.
                </p>
              </div>

              <div className="feature-card">
                <span className="feature-icon" aria-hidden="true">
                  <i className="bi bi-bullseye"></i>
                </span>
                <h3>Target Skill Gap Analysis</h3>
                <p>
                  Compare your technical background against standard industry benchmarks for Java,
                  Spring Boot, MERN, Cloud, and Data Engineering.
                </p>
              </div>

              <div className="feature-card">
                <span className="feature-icon" aria-hidden="true">
                  <i className="bi bi-briefcase"></i>
                </span>
                <h3>Recruiter Talent Pipeline</h3>
                <p>
                  Screen batches of resumes, rank applicants by match score, coordinate interview
                  rounds, and record structured feedback.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= HOW IT WORKS ================= */}
        <section className="section" id="how-it-works">
          <div className="container">
            <div className="section-header text-center" style={{ maxWidth: '650px', margin: '0 auto 48px' }}>
              <span className="eyebrow">WORKFLOW</span>
              <h2 style={{ fontSize: '2.1rem', fontWeight: 800, margin: '8px 0 14px' }}>How SmartHire Works</h2>
              <p className="section-description" style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', margin: 0 }}>
                Get job-ready in 3 simple steps with our automated intelligence system.
              </p>
            </div>

            <div className="grid grid-3">
              <div className="step-card">
                <span className="step-number">1</span>
                <h3>Upload Your Resume</h3>
                <p>Support for PDF, DOCX, and TXT documents up to 10MB.</p>
              </div>

              <div className="step-card">
                <span className="step-number">2</span>
                <h3>Select Career Role</h3>
                <p>Choose from predefined profiles or enter your target requisition.</p>
              </div>

              <div className="step-card">
                <span className="step-number">3</span>
                <h3>Review AI Recommendations</h3>
                <p>Inspect detailed scores, missing skills, and actionable improvement steps.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= JOB PROFILES ================= */}
        <section className="section section-muted" id="job-profiles">
          <div className="container">
            <div className="section-header text-center" style={{ maxWidth: '650px', margin: '0 auto 48px' }}>
              <span className="eyebrow">CAREER BENCHMARKS</span>
              <h2 style={{ fontSize: '2.1rem', fontWeight: 800, margin: '8px 0 14px' }}>
                Supported Tech Career Profiles
              </h2>
              <p className="section-description" style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', margin: 0 }}>
                Our intelligence taxonomy covers popular software engineering specialties.
              </p>
            </div>

            <div className="role-grid">
              {displayedJobs.map((job) => {
                const targetUrl = isAuthenticated
                  ? (isHr ? `/dashboard/jobs` : `/dashboard/resumeanalyzer?role=${encodeURIComponent(job.title)}`)
                  : `/register?role=${encodeURIComponent(job.title)}`;

                return (
                  <Link
                    key={job.id}
                    to={targetUrl}
                    className="role-card"
                    title={`Scan resume against ${job.title}`}
                  >
                    <span className="role-icon">
                      <i className={`bi ${getJobIcon(job.title, job.department)}`}></i>
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'left' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.98rem' }}>{job.title}</span>
                      <small style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {job.department || 'Engineering'}
                        {job.openings ? ` - ${job.openings} Openings` : ''}
                      </small>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= CALL TO ACTION ================= */}
        <section className="section">
          <div className="container">
            <div className="cta-panel">
              <div>
                <h2>Ready to elevate your tech hiring or career?</h2>
                <p>Join thousands of candidates and engineering recruiters using SmartHire today.</p>
              </div>
              <div className="cta-actions">
                <Link to="/register" className="btn btn-primary btn-lg">
                  Get Started Free
                </Link>
                <Link to="/login" className="btn btn-cta-secondary btn-lg">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ================= FAQ SECTION ================= */}
        <section className="section section-muted" id="faq">
          <div className="container">
            <div className="section-header text-center" style={{ maxWidth: '650px', margin: '0 auto 48px' }}>
              <span className="eyebrow">GOT QUESTIONS?</span>
              <h2 style={{ fontSize: '2.1rem', fontWeight: 800, margin: '8px 0 14px' }}>
                Frequently Asked Questions
              </h2>
            </div>

            <div className="faq-list">
              <details className="faq-item" open>
                <summary>How does the ATS score get calculated?</summary>
                <p>
                  Our parsing engine scans formatting, standard section headings, keyword alignment
                  against target job role taxonomy, and readable contact details to score ATS
                  compatibility from 0 to 100.
                </p>
              </details>

              <details className="faq-item">
                <summary>Can recruiters use SmartHire for hiring pipelines?</summary>
                <p>
                  Yes! Switch to the HR / Recruiter Portal to post job requisitions, view candidate
                  scores, track stages (Under Review, Interview, Shortlist, Offer), and submit
                  structured feedback.
                </p>
              </details>

              <details className="faq-item">
                <summary>Is my resume information kept confidential?</summary>
                <p>
                  Absolutely. Uploaded resumes are securely parsed for your private analysis session
                  and candidate identity is strictly separated from your user profile.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="footer" style={{ borderTop: '1px solid var(--border-color)', padding: '44px 0', background: 'var(--bg-primary)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <Link className="brand" to="/" style={{ fontSize: '1.25rem', textDecoration: 'none' }}>
              <span className="brand-mark">///</span> SmartHire<span className="brand-mark">.</span>
            </Link>
            <p style={{ margin: '8px 0 0', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              &copy; {new Date().getFullYear()} SmartHire. AI Resume Analyzer &amp; Recruitment Platform.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '24px', fontSize: '0.9rem' }}>
            <Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Login</Link>
            <Link to="/register" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Register</Link>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Features</a>
            <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
