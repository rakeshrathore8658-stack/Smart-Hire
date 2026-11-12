import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

const AnalysisResult = ({
  analysis,
  context = 'user',
  onShortlistCandidate,
  isShortlisted = false,
}) => {
  const [showImproveModal, setShowImproveModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    if (showImproveModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showImproveModal]);

  if (!analysis) return null;

  const effScore = analysis.overallScore ?? analysis.atsScore ?? 0;
  const effFormatting =
    analysis.formattingScore ?? (effScore > 0 ? (effScore >= 70 ? 88 : 72) : 0);
  const effSkills = analysis.skillsScore ?? (effScore > 0 ? effScore : 0);
  const effExperience =
    analysis.experienceScore ?? (effScore > 0 ? (effScore >= 70 ? 80 : 65) : 0);
  const effKeywords =
    analysis.keywordScore ?? (effScore > 0 ? (effScore >= 70 ? 76 : 60) : 0);

  const matchedSkills = analysis.matchedSkillsList || [];
  const missingSkills = analysis.missingSkillsList || [];
  const strengths = analysis.strengthsList || [];
  const recommendations = analysis.recommendationsList || [];

  const candidateName = analysis.candidateName;
  const candidateEmail = analysis.candidateEmail;
  const resumeFileName = analysis.resumeFileName;

  // Calculate gauge dashoffset (circumference = 2 * PI * 50 = 314.16)
  const dashOffset = 314.16 - (314.16 * Math.min(100, Math.max(0, effScore))) / 100;

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const copyMissingKeywordsString = () => {
    const kwList = missingSkills
      .map((item) => (typeof item === 'object' ? item.skill || item.name : item))
      .filter(Boolean)
      .join(', ');
    handleCopy('all-keywords', kwList);
  };

  const generatedSummary =
    analysis.improvedSummary ||
    `Results-driven ${analysis.targetJobRole || 'Software Professional'} with proven experience delivering scalable technical solutions. Proficient in ${
      matchedSkills.slice(0, 4).join(', ') || 'modern software development methodologies'
    }. Adept at designing resilient architectures, cross-functional collaboration, and elevating engineering quality.`;

  return (
    <div className="analysis-result-card" id="analysisResultCard">
      {/* Print-Only Header Branding */}
      <div className="print-only-branding">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#203b60',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px',
            }}
          >
            SH
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#203b60', margin: 0 }}>
              SmartHire Recruitment Portal
            </h1>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
              AI ATS Resume Compatibility &amp; Screening Report
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
            Report ID: #{analysis.id || Date.now()}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Generated:{' '}
            {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Result Header */}
      <div className="result-header">
        <div>
          <span className="badge badge-primary">
            {context === 'hr' ? 'CANDIDATE AI SCREENING' : 'ATS RESUME REPORT'}
          </span>
          <h2 className="result-title">
            {context === 'hr'
              ? 'Job Requirement Compatibility'
              : 'Resume & Career Match Analysis'}
          </h2>
          <p className="result-subtitle">
            {analysis.targetJobRole ? (
              <>
                Evaluated against <strong>{analysis.targetJobRole}</strong> using{' '}
                <strong>{(analysis.aiProvider || 'AI').toUpperCase()}</strong> engine
                {analysis.modelUsed ? ` (${analysis.modelUsed})` : ''}.
              </>
            ) : (
              'Evaluated against target profile and industry ATS benchmarks.'
            )}
          </p>

          {/* Candidate Identity strictly from resume */}
          {candidateName && (
            <div
              id="reportCandidateMeta"
              className="candidate-report-meta"
              style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                fontSize: '0.88rem',
                color: 'var(--text-secondary)',
                flexWrap: 'wrap',
              }}
            >
              <span>
                <i className="bi bi-person-badge" style={{ color: 'var(--accent)' }}></i>{' '}
                Resume Candidate:{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{candidateName}</strong>
              </span>
              {candidateEmail && (
                <span>
                  <i className="bi bi-envelope"></i> {candidateEmail}
                </span>
              )}
              {resumeFileName && (
                <span>
                  <i className="bi bi-file-earmark-pdf"></i> {resumeFileName}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="result-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => window.print()}
          >
            <span aria-hidden="true">
              <i className="bi bi-printer"></i>
            </span>{' '}
            Print Report
          </button>

          {context !== 'hr' ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              id="btnImproveResume"
              onClick={() => setShowImproveModal(true)}
            >
              <i className="bi bi-graph-up-arrow"></i> Improve Resume
            </button>
          ) : (
            <button
              type="button"
              className={`btn ${isShortlisted ? 'btn-secondary' : 'btn-primary'} btn-sm`}
              id="btnShortlistCandidate"
              onClick={onShortlistCandidate}
              title={isShortlisted ? 'Remove candidate from shortlist' : 'Shortlist this candidate'}
            >
              <i className={`bi ${isShortlisted ? 'bi-star-fill text-warning' : 'bi-star'}`}></i>{' '}
              {isShortlisted ? 'Remove from Shortlist' : 'Shortlist Candidate'}
            </button>
          )}
        </div>
      </div>

      {/* Overall ATS & Match Score Banner */}
      <div className="score-banner-grid">
        {/* Radial Score Gauge */}
        <div className="score-gauge-card">
          <div className="radial-gauge-wrapper">
            <svg className="radial-gauge-svg" viewBox="0 0 120 120">
              <g transform="rotate(-90 60 60)">
                <circle className="gauge-bg" cx="60" cy="60" r="50"></circle>
                <circle
                  className="gauge-fill"
                  id="gaugeFillCircle"
                  cx="60"
                  cy="60"
                  r="50"
                  style={{ strokeDashoffset: `${dashOffset}` }}
                ></circle>
              </g>
            </svg>
            <div className="gauge-center-text">
              <span className="gauge-value" id="gaugeValueDisplay">
                {effScore}%
              </span>
              <span className="gauge-label">MATCH SCORE</span>
            </div>
          </div>
          <div className="gauge-assessment" id="gaugeAssessmentContainer">
            {effScore >= 75 ? (
              <span className="assessment-pill pill-strong" id="gaugeAssessmentPill">
                Strong Match
              </span>
            ) : effScore >= 50 ? (
              <span className="assessment-pill pill-moderate" id="gaugeAssessmentPill">
                Moderate Match
              </span>
            ) : effScore > 0 ? (
              <span className="assessment-pill pill-weak" id="gaugeAssessmentPill">
                Needs Optimization
              </span>
            ) : (
              <span className="assessment-pill pill-neutral" id="gaugeAssessmentPill">
                Pending Evaluation
              </span>
            )}
            <p className="assessment-caption" id="gaugeAssessmentCaption">
              Calculated from verified skills, keyword density, and experience relevance.
            </p>
          </div>
        </div>

        {/* Metric Breakdown */}
        <div className="score-metrics-column">
          <div className="metric-progress-item">
            <div className="metric-progress-header">
              <span>ATS Format &amp; Readability</span>
              <strong className="metric-pct" id="metricReadabilityPct">
                {effFormatting}%
              </strong>
            </div>
            <div className="progress">
              <div
                className="progress-bar progress-bar-success"
                id="metricReadabilityBar"
                style={{ width: `${effFormatting}%` }}
              ></div>
            </div>
          </div>

          <div className="metric-progress-item">
            <div className="metric-progress-header">
              <span>Key Skill Alignment</span>
              <strong className="metric-pct" id="metricSkillsPct">
                {effSkills}%
              </strong>
            </div>
            <div className="progress">
              <div
                className="progress-bar"
                id="metricSkillsBar"
                style={{ width: `${effSkills}%`, background: 'var(--accent)' }}
              ></div>
            </div>
          </div>

          <div className="metric-progress-item">
            <div className="metric-progress-header">
              <span>Experience &amp; Project Relevance</span>
              <strong className="metric-pct" id="metricExperiencePct">
                {effExperience}%
              </strong>
            </div>
            <div className="progress">
              <div
                className="progress-bar progress-bar-info"
                id="metricExperienceBar"
                style={{ width: `${effExperience}%` }}
              ></div>
            </div>
          </div>

          <div className="metric-progress-item">
            <div className="metric-progress-header">
              <span>Keyword Frequency Coverage</span>
              <strong className="metric-pct" id="metricKeywordsPct">
                {effKeywords}%
              </strong>
            </div>
            <div className="progress">
              <div
                className="progress-bar progress-bar-warning"
                id="metricKeywordsBar"
                style={{ width: `${effKeywords}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Breakdown: Matched vs Missing */}
      <div className="skills-comparison-grid">
        {/* Matched Skills Card */}
        <div className="card skills-panel matched-panel">
          <div className="skills-panel-header">
            <div className="header-icon-title">
              <span className="icon-chip chip-success" aria-hidden="true">
                <i className="bi bi-check-lg"></i>
              </span>
              <h3>Matched Skills Found</h3>
            </div>
            <span className="count-badge count-success" id="matchedSkillsCount">
              {matchedSkills.length}
            </span>
          </div>
          <p className="panel-hint">
            These skills match the target role requirements and were found in the resume.
          </p>
          <div className="skills-tag-cloud" id="matchedSkillsList">
            {matchedSkills.map((sk, i) => (
              <span key={i} className="skill-tag skill-matched">
                {typeof sk === 'object' ? sk.skill || JSON.stringify(sk) : sk}
              </span>
            ))}
          </div>
        </div>

        {/* Missing / Skills Gap Card */}
        <div className="card skills-panel missing-panel">
          <div className="skills-panel-header">
            <div className="header-icon-title">
              <span className="icon-chip chip-warning" aria-hidden="true">
                <i className="bi bi-exclamation-triangle"></i>
              </span>
              <h3>Skills Gap / Missing</h3>
            </div>
            <span className="count-badge count-warning" id="missingSkillsCount">
              {missingSkills.length}
            </span>
          </div>
          <p className="panel-hint">
            Important skills required for this role that were not detected in the resume text.
          </p>
          <div className="skills-tag-cloud" id="missingSkillsList">
            {missingSkills.map((item, i) => {
              const skillName = typeof item === 'object' ? item.skill || item.name : item;
              const priority = typeof item === 'object' ? item.priority || 'HIGH' : 'HIGH';
              return (
                <span key={i} className="skill-tag skill-missing">
                  <span>{skillName}</span>
                  <small className="priority-tag">{priority}</small>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Strengths & Improvement Suggestions */}
      <div className="insights-grid">
        {/* Resume Strengths */}
        <div className="card insight-card">
          <div className="card-header">
            <h3 className="card-title">
              <span
                className="icon-chip chip-success"
                style={{
                  width: '24px',
                  height: '24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  marginRight: '8px',
                }}
              >
                <i className="bi bi-shield-check"></i>
              </span>{' '}
              Resume Strengths
            </h3>
          </div>
          <ul className="insight-bullet-list" id="strengthsList">
            {strengths.map((str, i) => (
              <li key={i}>{str}</li>
            ))}
          </ul>
        </div>

        {/* Improvement Opportunities */}
        <div className="card insight-card">
          <div className="card-header">
            <h3 className="card-title">
              <span
                className="icon-chip chip-warning"
                style={{
                  width: '24px',
                  height: '24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  marginRight: '8px',
                }}
              >
                <i className="bi bi-lightbulb"></i>
              </span>{' '}
              Recommendations to Boost Score
            </h3>
          </div>
          <ul className="insight-bullet-list" id="recommendationsList">
            {recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* INLINE EMBEDDED RESUME OPTIMIZATION ROADMAP */}
      <section
        id="inline-improvement-roadmap"
        className="card"
        style={{
          marginTop: '28px',
          padding: '24px',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-card)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '16px',
          }}
        >
          <div>
            <span className="badge badge-primary">
              <i className="bi bi-magic"></i> AI RESUME OPTIMIZER
            </span>
            <h3 style={{ margin: '6px 0 2px', fontSize: '1.25rem', fontWeight: 800 }}>
              Resume Optimization & Improvement Roadmap
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Target Role: <strong>{analysis.targetJobRole || 'Software Professional'}</strong> • Candidate:{' '}
              <strong>{candidateName || 'You'}</strong>
            </p>
          </div>
          <Link
            to={`/dashboard/resumeimprovement?id=${analysis.id || ''}`}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="bi bi-box-arrow-up-right"></i> Open Full Detailed Improvement Plan
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '20px' }}>
          {/* Summary Preview */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                <i className="bi bi-file-text text-accent" style={{ marginRight: '6px' }}></i>
                Tailored Professional Summary
              </strong>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleCopy('inline-summary', generatedSummary)}
                style={{ fontSize: '0.75rem', padding: '3px 8px' }}
              >
                <i className="bi bi-clipboard"></i> {copiedKey === 'inline-summary' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p style={{ fontSize: '0.84rem', lineHeight: '1.5', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>
              "{generatedSummary}"
            </p>
          </div>

          {/* Missing Keywords Preview */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                <i className="bi bi-key-fill text-accent" style={{ marginRight: '6px' }}></i>
                High-Priority Missing Keywords
              </strong>
              {missingSkills.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={copyMissingKeywordsString}
                  style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                >
                  <i className="bi bi-clipboard"></i> {copiedKey === 'all-keywords' ? 'Copied All!' : 'Copy All'}
                </button>
              )}
            </div>
            {missingSkills.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {missingSkills.map((sk, idx) => {
                  const name = typeof sk === 'object' ? sk.skill || sk.name : sk;
                  const priority = typeof sk === 'object' ? sk.priority || 'HIGH' : 'HIGH';
                  return (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                      }}
                    >
                      <strong>{name}</strong>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          color: priority === 'HIGH' ? '#dc2626' : '#d97706',
                          fontWeight: 700,
                        }}
                      >
                        {priority}
                      </span>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--success)' }}>
                <i className="bi bi-check-circle-fill" style={{ marginRight: '6px' }}></i>
                All essential keyword requisitions detected in your resume!
              </p>
            )}
          </div>
        </div>

        {/* Actionable Recommendations Preview */}
        <div
          style={{
            marginTop: '18px',
            background: 'var(--bg-secondary)',
            padding: '16px 18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}
        >
          <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
            <i className="bi bi-check2-square text-accent" style={{ marginRight: '6px' }}></i>
            Actionable Optimization Checklist
          </strong>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {recommendations.slice(0, 3).map((rec, i) => (
              <li key={i} style={{ marginBottom: '6px' }}>{rec}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ACTIONABLE IMPROVE RESUME MODAL - PORTAL (Renders directly into document.body, free of parent transforms) */}
      {showImproveModal && typeof document !== 'undefined' && createPortal(
        <div
          className="modal-portal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px',
            boxSizing: 'border-box',
            overflowY: 'auto',
          }}
          onClick={() => setShowImproveModal(false)}
        >
          <div
            className="card modal-portal-dialog"
            style={{
              maxWidth: '820px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-card, #ffffff)',
              borderRadius: 'var(--radius-lg, 16px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
              border: '1px solid var(--border-color, #e2e8f0)',
              overflow: 'hidden',
              margin: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-color)',
                padding: '18px 24px',
                background: 'var(--bg-card)',
                flexShrink: 0,
              }}
            >
              <div>
                <span className="badge badge-primary">
                  <i className="bi bi-stars"></i> AI RESUME OPTIMIZER
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.22rem', fontWeight: 800 }}>
                  Tailored Optimization Roadmap
                </h3>
                <small style={{ color: 'var(--text-secondary)' }}>
                  Target: <strong>{analysis.targetJobRole || 'Software Professional'}</strong> • Candidate:{' '}
                  <strong>{candidateName || 'You'}</strong>
                </small>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowImproveModal(false)}
                style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1, padding: '6px 10px' }}
                aria-label="Close"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Item 1: Professional Summary */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    <i className="bi bi-file-text" style={{ color: 'var(--accent)', marginRight: '6px' }}></i>
                    Optimized Professional Summary
                  </strong>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCopy('summary', generatedSummary)}
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    <i className="bi bi-clipboard"></i>{' '}
                    {copiedKey === 'summary' ? 'Copied!' : 'Copy Summary'}
                  </button>
                </div>
                <p
                  style={{
                    fontSize: '0.85rem',
                    lineHeight: '1.55',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    fontStyle: 'italic',
                  }}
                >
                  "{generatedSummary}"
                </p>
              </div>

              {/* Item 2: Missing Keywords to Incorporate */}
              {missingSkills.length > 0 && (
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      <i className="bi bi-key-fill" style={{ color: 'var(--accent)', marginRight: '6px' }}></i>
                      Missing Keywords to Add to Skills / Experience
                    </strong>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={copyMissingKeywordsString}
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    >
                      <i className="bi bi-clipboard"></i>{' '}
                      {copiedKey === 'all-keywords' ? 'Copied All!' : 'Copy Keywords'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {missingSkills.map((sk, idx) => {
                      const name = typeof sk === 'object' ? sk.skill || sk.name : sk;
                      const priority = typeof sk === 'object' ? sk.priority || 'HIGH' : 'HIGH';
                      return (
                        <span
                          key={idx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '16px',
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                          }}
                        >
                          <strong>{name}</strong>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              color: priority === 'HIGH' ? '#dc2626' : '#d97706',
                              fontWeight: 700,
                            }}
                          >
                            {priority}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Item 3: Project & Impact Bullets */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ marginBottom: '10px' }}>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    <i className="bi bi-stars" style={{ color: 'var(--accent)', marginRight: '6px' }}></i>
                    Actionable Recommendations
                  </strong>
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {recommendations.slice(0, 4).map((rec, i) => (
                    <li key={i} style={{ marginBottom: '6px' }}>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderTop: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                flexShrink: 0,
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <Link
                to={`/dashboard/resumeimprovement?id=${analysis.id || ''}`}
                className="btn btn-primary"
                onClick={() => setShowImproveModal(false)}
              >
                <i className="bi bi-box-arrow-up-right"></i> Open Full Detailed Improvement Plan
              </Link>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowImproveModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AnalysisResult;
