import React from 'react';
import { useOnboarding } from '../../context/OnboardingContext';

export default function WelcomeTourModal() {
  const {
    showWelcomeModal,
    setShowWelcomeModal,
    startTour,
    skipTour,
    dismissWelcome,
    isHr,
  } = useOnboarding();

  if (!showWelcomeModal) return null;

  return (
    <div className="smarthire-welcome-backdrop" role="dialog" aria-modal="true" aria-labelledby="welcome-tour-title">
      <div className="smarthire-welcome-modal">
        {/* Brand Header */}
        <div className="smarthire-welcome-header">
          <div className="smarthire-welcome-logo">
            <span className="mark">///</span>
            <span>SmartHire.</span>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <span className={`badge ${isHr ? 'badge-warning' : 'badge-primary'}`}>
              <i className={`bi ${isHr ? 'bi-briefcase' : 'bi-person-badge'}`}></i>{' '}
              {isHr ? 'Recruiter Experience' : 'Job Seeker Experience'}
            </span>
          </div>

          <h2 id="welcome-tour-title" className="smarthire-welcome-title">
            Welcome to SmartHire!
          </h2>
          <p className="smarthire-welcome-subtitle">
            Let's take a quick interactive tour to help you explore the platform and understand its key features.
          </p>
        </div>

        {/* Role-Specific Feature Cards */}
        <div className="smarthire-welcome-features">
          {!isHr ? (
            <>
              <div className="smarthire-welcome-feature-card">
                <div className="smarthire-welcome-feature-icon">
                  <i className="bi bi-cpu"></i>
                </div>
                <div className="smarthire-welcome-feature-content">
                  <h5>AI Resume Evaluation</h5>
                  <p>Learn how our ATS parser analyzes core skills, formatting quality, and experience relevance.</p>
                </div>
              </div>

              <div className="smarthire-welcome-feature-card">
                <div className="smarthire-welcome-feature-icon">
                  <i className="bi bi-award"></i>
                </div>
                <div className="smarthire-welcome-feature-content">
                  <h5>ATS Compatibility &amp; Score Insights</h5>
                  <p>Understand overall match percentage, missing industry keywords, and action plans.</p>
                </div>
              </div>

              <div className="smarthire-welcome-feature-card">
                <div className="smarthire-welcome-feature-icon">
                  <i className="bi bi-stars"></i>
                </div>
                <div className="smarthire-welcome-feature-content">
                  <h5>Target Career Alignment</h5>
                  <p>Optimize your credentials specifically for high-demand software and tech requisitions.</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="smarthire-welcome-feature-card">
                <div className="smarthire-welcome-feature-icon">
                  <i className="bi bi-people"></i>
                </div>
                <div className="smarthire-welcome-feature-content">
                  <h5>Candidate Management &amp; Pool</h5>
                  <p>Screen applicants with instant ATS scores, extracted skills, and batch resume processing.</p>
                </div>
              </div>

              <div className="smarthire-welcome-feature-card">
                <div className="smarthire-welcome-feature-icon">
                  <i className="bi bi-columns-gap"></i>
                </div>
                <div className="smarthire-welcome-feature-content">
                  <h5>Side-by-Side Candidate Comparison</h5>
                  <p>Compare shortlisted talent head-to-head across verified competencies and experience depth.</p>
                </div>
              </div>

              <div className="smarthire-welcome-feature-card">
                <div className="smarthire-welcome-feature-icon">
                  <i className="bi bi-calendar2-week"></i>
                </div>
                <div className="smarthire-welcome-feature-content">
                  <h5>Interview &amp; Feedback Pipeline</h5>
                  <p>Coordinate video rounds, dispatch candidate invites, and submit hiring scorecards in real time.</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 3 Explicit Action Choices */}
        <div className="smarthire-welcome-actions">
          <button
            type="button"
            className="smarthire-welcome-btn-primary"
            onClick={() => startTour(0)}
            title="Start the animated spotlight walkthrough"
          >
            <i className="bi bi-play-circle-fill"></i>
            <span>Start Guided Tour</span>
          </button>

          <div className="smarthire-welcome-actions-row">
            <button
              type="button"
              className="smarthire-welcome-btn-secondary"
              onClick={dismissWelcome}
              title="Explore freely. The tour will not pop up automatically next time."
            >
              Explore on My Own
            </button>

            <button
              type="button"
              className="smarthire-welcome-btn-skip"
              onClick={skipTour}
              title="Do not show this onboarding tutorial again"
            >
              Skip Tutorial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
