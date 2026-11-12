import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const ResumeImprovement = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const analysisId = searchParams.get('id');

  const [copiedId, setCopiedId] = useState(null);
  const [targetRole, setTargetRole] = useState(roleParam || 'Software Professional');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState({});

  useEffect(() => {
    let isMounted = true;
    const fetchAnalysisData = async () => {
      setLoading(true);
      try {
        const activeEmail = user?.email
          ? user.email.trim().toLowerCase()
          : (typeof window !== 'undefined'
              ? (sessionStorage.getItem('smarthire_user_email') || localStorage.getItem('smarthire_user_email') || '')
              : '');

        // 1. Direct fetch if analysisId is passed
        if (analysisId) {
          try {
            const res = await api.get(`/analysis/${analysisId}`);
            if (isMounted && res.data) {
              const data = res.data.analysis || res.data;
              setAnalysis(data);
              if (data.targetJobRole) setTargetRole(data.targetJobRole);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn('Analysis ID fetch failed, trying history fallback', e);
          }
        }

        // 2. Fetch latest analysis from user history
        const histRes = await api.get('/dashboard/history', {
          params: activeEmail ? { email: activeEmail } : {},
        });
        const list = Array.isArray(histRes.data) ? histRes.data : (histRes.data?.history || []);
        if (isMounted && list.length > 0) {
          const latest = list[0];
          if (latest.analysisJson) {
            try {
              const parsed = JSON.parse(latest.analysisJson);
              parsed.id = parsed.id || latest.id;
              setAnalysis(parsed);
              if (parsed.targetJobRole) setTargetRole(parsed.targetJobRole);
            } catch (err) {
              setAnalysis(latest);
              if (latest.targetJobRole) setTargetRole(latest.targetJobRole);
            }
          } else if (latest.id) {
            const singleRes = await api.get(`/analysis/${latest.id}`);
            const data = singleRes.data.analysis || singleRes.data;
            setAnalysis(data);
            if (data.targetJobRole) setTargetRole(data.targetJobRole);
          } else {
            setAnalysis(latest);
            if (latest.targetJobRole) setTargetRole(latest.targetJobRole);
          }
        }
      } catch (err) {
        console.error('Failed to load resume analysis data for improvement roadmap:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAnalysisData();
    return () => {
      isMounted = false;
    };
  }, [analysisId, roleParam, user]);

  const handleCopy = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const toggleTask = (taskId) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  // Extract dynamic details
  const candidateName = analysis?.candidateName || analysis?.candidate?.name || '';
  const candidateEmail = analysis?.candidateEmail || analysis?.candidate?.email || '';
  const effScore = analysis?.overallScore ?? analysis?.atsScore ?? 0;
  const matchLevel = analysis?.matchLevel || (effScore >= 75 ? 'Strong Match' : effScore >= 50 ? 'Moderate Match' : 'Needs Optimization');

  const skillsScore = analysis?.skillsScore ?? analysis?.categoryScores?.skills ?? (effScore > 0 ? effScore : 0);
  const experienceScore = analysis?.experienceScore ?? analysis?.categoryScores?.experience ?? (effScore > 0 ? (effScore >= 70 ? 88 : 65) : 0);
  const formatScore = analysis?.formattingScore ?? analysis?.categoryScores?.formatting ?? (effScore > 0 ? 88 : 70);
  const keywordScore = analysis?.keywordScore ?? analysis?.categoryScores?.keywords ?? (effScore > 0 ? (effScore >= 80 ? 75 : 67) : 0);

  const matchedSkills = analysis?.matchedSkillsList || analysis?.skillsAnalysis?.matchedSkills || [];
  const rawMissingSkills = analysis?.missingSkillsList || analysis?.skillsAnalysis?.missingSkills || [];
  const recommendations = analysis?.recommendationsList || analysis?.recommendations || [];
  const weaknesses = analysis?.weaknesses || [];

  const originalSummary = analysis?.candidate?.professionalSummary || '';
  const tailoredSummary =
    analysis?.improvedSummary ||
    `Results-driven ${targetRole} with hands-on expertise across ${
      matchedSkills.slice(0, 4).join(', ') || 'modern software engineering'
    }. Proven track record designing scalable architecture, optimizing query execution, and delivering resilient technical solutions.`;

  // Missing skills normalized list
  const missingSkills = rawMissingSkills.map((s) => {
    if (typeof s === 'object' && s !== null) {
      return {
        name: s.skill || s.name || 'Required Competency',
        priority: s.priority || 'HIGH',
        reason: s.reason || `Core qualification filter for ${targetRole} candidates.`,
      };
    }
    return {
      name: String(s),
      priority: 'HIGH',
      reason: `Expected keyword requirement for ${targetRole} screening algorithms.`,
    };
  });

  // Dynamic Project & Experience Bullet Rewriting from candidate's actual resume
  const candidateProjects = analysis?.candidate?.projects || [];
  const candidateExp = analysis?.candidate?.workExperience || [];

  const dynamicBulletRewrites = [];

  // Project bullets
  if (candidateProjects.length > 0) {
    const p1 = candidateProjects[0];
    const p2 = candidateProjects.length > 1 ? candidateProjects[1] : null;
    const p3 = candidateProjects.length > 2 ? candidateProjects[2] : null;

    dynamicBulletRewrites.push({
      id: 'proj-1',
      title: 'Primary Project Bullet Impact Rewrite',
      context: p1,
      originalText: p2 || p1,
      improvedText: `Architected and deployed modular system workflows for ${p1.split('—')[0].trim()} utilizing ${
        matchedSkills.slice(0, 3).join(', ') || 'modern backend frameworks'
      }; engineered high-throughput REST APIs and optimized database query execution, reducing transaction latency by 35%.`,
      impact: '+4% ATS Score',
    });

    if (p3) {
      dynamicBulletRewrites.push({
        id: 'proj-2',
        title: 'Secondary Project & Architecture Rewrite',
        context: p1,
        originalText: p3,
        improvedText: `Engineered scalable backend service layers integrated with relational database persistence and third-party API gateways, ensuring 99.9% uptime and zero unhandled exception escapement in test environments.`,
        impact: '+3% ATS Score',
      });
    }
  }

  // Work experience / Leadership bullets
  if (candidateExp.length > 0) {
    const roleTitle = candidateExp[0];
    const expBullet = candidateExp.length > 1 ? candidateExp[1] : candidateExp[0];
    dynamicBulletRewrites.push({
      id: 'exp-1',
      title: 'Experience & Leadership Bullet Impact Rewrite',
      context: roleTitle,
      originalText: expBullet,
      improvedText: `Spearheaded technical communications, team coordination, and structured workshop operations for ${roleTitle.split(',')[0].trim()}, increasing engagement by 40% across 500+ participants through targeted digital outreach.`,
      impact: '+4% ATS Score',
    });
  }

  // Fallback if resume text had no parsed project/exp arrays
  if (dynamicBulletRewrites.length === 0) {
    dynamicBulletRewrites.push({
      id: 'default-bullet-1',
      title: 'Core Technical Achievement Rewrite',
      context: targetRole,
      originalText: 'Responsible for writing code, debugging issues, and building features.',
      improvedText: `Architected and shipped production-ready ${targetRole} modules utilizing ${
        matchedSkills.slice(0, 3).join(', ') || 'clean code principles'
      }, implementing automated unit tests that improved release velocity by 30% and cut defect rates by 25%.`,
      impact: '+4% ATS Score',
    });
  }

  // Suggested copy-paste sentences for missing skills
  const missingSkillTemplates = missingSkills.map((sk) => {
    let sentence = `Designed and implemented ${sk.name} integration into backend application services, enhancing data persistence and architectural reliability.`;
    if (sk.name.toLowerCase().includes('hibernate') || sk.name.toLowerCase().includes('jpa')) {
      sentence = `Engineered robust relational persistence layers leveraging ${sk.name} ORM and Spring Data repositories with optimized entity mapping, reducing boilerplate SQL and query overhead.`;
    } else if (sk.name.toLowerCase().includes('docker') || sk.name.toLowerCase().includes('kubernetes')) {
      sentence = `Containerized multi-service applications using ${sk.name}, standardizing local testing workflows and streamlining automated deployment pipelines.`;
    } else if (sk.name.toLowerCase().includes('aws') || sk.name.toLowerCase().includes('cloud')) {
      sentence = `Configured and deployed cloud-native application resources on ${sk.name}, improving service scalability and system availability.`;
    }
    return {
      ...sk,
      suggestedSentence: sentence,
    };
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <Link to="/dashboard/resumeanalyzer">Resume Analyzer</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Resume Improvement</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">
              <i className="bi bi-magic"></i> AI RESUME OPTIMIZER
            </span>
            {analysis?.id && (
              <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                ANALYSIS ID #{analysis.id}
              </span>
            )}
          </div>
          <h1 className="page-title">Personalized Resume Improvement Roadmap</h1>
          <p className="page-subtitle">
            Actionable bullet point rewrites, missing technical keyword injections, and structural optimizations tailored for{' '}
            <strong>{targetRole}</strong>
            {candidateName ? ` (${candidateName})` : ''}.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            <i className="bi bi-printer"></i> Print Action Plan
          </button>
          <Link className="btn btn-primary" to={`/dashboard/resumeanalyzer${analysis?.id ? `?id=${analysis.id}` : ''}`}>
            <i className="bi bi-cpu"></i> View Full Analysis Report
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem', margin: '0 auto 16px' }}></div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Generating Your Personalized Improvement Roadmap...</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Deeply auditing your resume against {targetRole} industry benchmarks...
          </p>
        </div>
      ) : !analysis ? (
        <div className="card" style={{ padding: '50px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: '16px' }}>
            <i className="bi bi-file-earmark-diff"></i>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>
            No Resume Analysis Found Yet
          </h2>
          <p style={{ maxWidth: '520px', margin: '0 auto 24px', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Upload and analyze your resume in the Resume Analyzer to automatically generate custom bullet point rewrites, keyword insertion templates, and targeted recommendations.
          </p>
          <Link to="/dashboard/resumeanalyzer" className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '0.95rem' }}>
            <i className="bi bi-cloud-arrow-up" style={{ marginRight: '8px' }}></i> Analyze Resume Now
          </Link>
        </div>
      ) : (
        <>
          {/* Target Score & Readiness Banner */}
          <article
            className="card"
            style={{
              background: 'linear-gradient(135deg, var(--primary, #1e3a8a) 0%, #0f172a 100%)',
              color: '#ffffff',
              marginBottom: '28px',
              padding: '24px 28px',
              border: 'none',
              borderRadius: 'var(--radius-lg, 16px)',
              boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '20px',
              }}
            >
              <div style={{ maxWidth: '650px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(255, 255, 255, 0.18)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.28)',
                      fontSize: '0.78rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    TARGET: {targetRole.toUpperCase()}
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: effScore >= 75 ? 'rgba(34, 197, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      fontSize: '0.78rem',
                    }}
                  >
                    CURRENT MATCH: {effScore}% ({matchLevel})
                  </span>
                </div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 6px', color: '#ffffff' }}>
                  Actionable Steps to Elevate Your ATS Score to 95%+
                </h2>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.5 }}>
                  Implementing these targeted summaries, high-impact bullet rewrites, and keyword injections will eliminate ATS parsing drop-offs and maximize recruiter callbacks.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', textAlign: 'right' }}>
                <div>
                  <span style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--accent, #f97316)', lineHeight: 1, display: 'block' }}>
                    95%+
                  </span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.75)', marginTop: '4px', letterSpacing: '0.04em' }}>
                    TARGET READINESS
                  </span>
                </div>
              </div>
            </div>

            {/* Category Performance Breakdown Chips */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
                marginTop: '20px',
                paddingTop: '18px',
                borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)', display: 'block' }}>Technical Skills</span>
                <strong style={{ fontSize: '1.1rem', color: '#ffffff' }}>{skillsScore}%</strong>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)', display: 'block' }}>Experience Alignment</span>
                <strong style={{ fontSize: '1.1rem', color: '#ffffff' }}>{experienceScore}%</strong>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)', display: 'block' }}>ATS Formatting</span>
                <strong style={{ fontSize: '1.1rem', color: '#ffffff' }}>{formatScore}%</strong>
              </div>
              <div
                style={{
                  background: keywordScore < 75 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: keywordScore < 75 ? '1px solid rgba(239, 68, 68, 0.4)' : 'none',
                }}
              >
                <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.8)', display: 'block' }}>
                  Keywords Density {keywordScore < 75 && <i className="bi bi-exclamation-triangle-fill" style={{ color: '#fbbf24', marginLeft: '4px' }}></i>}
                </span>
                <strong style={{ fontSize: '1.1rem', color: '#ffffff' }}>{keywordScore}%</strong>
              </div>
            </div>
          </article>

          {/* SECTION 1: Professional Summary Optimization */}
          <article className="card" style={{ marginBottom: '24px', padding: '24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: 'var(--accent)',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  SECTION 1 • PROFILE INTRO
                </span>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: '0 0 4px' }}>
                  Professional Summary Optimization
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Recruiters review summaries in 6 seconds. Replace broad statements with quantifiable keywords matching {targetRole}.
                </p>
              </div>
              <span className="badge badge-success" style={{ fontSize: '0.78rem', fontWeight: 700, padding: '5px 12px' }}>
                +5% ATS Score
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
                gap: '16px',
              }}
            >
              {/* Original Summary */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      display: 'block',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                    }}
                  >
                    <i className="bi bi-file-earmark-text text-muted" style={{ marginRight: '6px' }}></i>
                    Original Summary in Resume
                  </span>
                  <p
                    style={{
                      fontSize: '0.86rem',
                      lineHeight: '1.55',
                      color: originalSummary ? 'var(--text-secondary)' : 'var(--text-muted)',
                      margin: 0,
                      fontStyle: originalSummary ? 'normal' : 'italic',
                    }}
                  >
                    {originalSummary
                      ? `"${originalSummary}"`
                      : 'No professional summary was detected in your uploaded resume text. Adding an ATS-tailored summary is strongly recommended.'}
                  </p>
                </div>
              </div>

              {/* Improved Summary */}
              <div
                style={{
                  background: 'var(--accent-light, #fff7ed)',
                  border: '1px solid var(--accent, #f97316)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: 'var(--accent)',
                        textTransform: 'uppercase',
                      }}
                    >
                      <i className="bi bi-check-circle-fill text-success" style={{ marginRight: '6px' }}></i>
                      AI ATS-Optimized Version
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCopy('summary-copy', tailoredSummary)}
                      style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                    >
                      <i className="bi bi-clipboard"></i> {copiedId === 'summary-copy' ? 'Copied!' : 'Copy Summary'}
                    </button>
                  </div>
                  <p
                    style={{
                      fontSize: '0.86rem',
                      lineHeight: '1.55',
                      color: 'var(--text-primary)',
                      margin: 0,
                      fontWeight: 500,
                    }}
                  >
                    "{tailoredSummary}"
                  </p>
                </div>
              </div>
            </div>
          </article>

          {/* SECTION 2: Project & Experience Bullet Impact Rewrites */}
          <article className="card" style={{ marginBottom: '24px', padding: '24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: 'var(--accent)',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  SECTION 2 • EXPERIENCE &amp; PROJECTS
                </span>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: '0 0 4px' }}>
                  Bullet Point Rewriting with Measurable Impact
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Transform standard task descriptions from your actual projects into the proven <strong>Action Verb + Technical Scope + Measurable Result</strong> formula.
                </p>
              </div>
              <span className="badge badge-success" style={{ fontSize: '0.78rem', fontWeight: 700, padding: '5px 12px' }}>
                +8% ATS Score
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {dynamicBulletRewrites.map((b) => (
                <div
                  key={b.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 16px',
                      background: 'var(--bg-secondary)',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      <i className="bi bi-code-square text-accent" style={{ marginRight: '6px' }}></i>
                      {b.title}
                    </strong>
                    <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                      {b.impact}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
                      gap: '0',
                    }}
                  >
                    {/* Before */}
                    <div
                      style={{
                        padding: '16px',
                        background: 'var(--bg-secondary)',
                        borderRight: '1px solid var(--border-color)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          display: 'block',
                          marginBottom: '6px',
                          textTransform: 'uppercase',
                        }}
                      >
                        <i className="bi bi-x-circle text-danger" style={{ marginRight: '4px' }}></i>
                        Detected in Your Resume
                      </span>
                      <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>
                        "{b.originalText}"
                      </p>
                    </div>

                    {/* After */}
                    <div
                      style={{
                        padding: '16px',
                        background: 'var(--accent-light, #fff7ed)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '6px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: 'var(--accent)',
                              textTransform: 'uppercase',
                            }}
                          >
                            <i className="bi bi-check-circle-fill text-success" style={{ marginRight: '4px' }}></i>
                            AI ATS-Optimized Bullet
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleCopy(b.id, b.improvedText)}
                            style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                          >
                            <i className="bi bi-clipboard"></i> {copiedId === b.id ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <p style={{ fontSize: '0.86rem', lineHeight: '1.5', color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>
                          • {b.improvedText}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* SECTION 3: Missing Keywords & How to Add Them */}
          <article className="card" style={{ marginBottom: '24px', padding: '24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: 'var(--accent)',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  SECTION 3 • KEYWORD GAP INTEGRATION
                </span>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: '0 0 4px' }}>
                  Missing Technical Keywords &amp; Ready-to-Paste Bullets
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  ATS keyword algorithms search for exact technical terms. Add these ready-made statements into your skills and project sections.
                </p>
              </div>
              {missingSkills.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleCopy('all-keywords-copy', missingSkills.map((s) => s.name).join(', '))}
                >
                  <i className="bi bi-clipboard"></i>{' '}
                  {copiedId === 'all-keywords-copy' ? 'Copied All Keywords!' : 'Copy All Keywords'}
                </button>
              )}
            </div>

            {missingSkillTemplates.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {missingSkillTemplates.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      padding: '16px',
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1rem', color: 'var(--accent)' }}>
                          <i className="bi bi-tag-fill"></i>
                        </span>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.name}</strong>
                        <span
                          className="badge"
                          style={{
                            background: item.priority === 'HIGH' ? '#fee2e2' : '#fef3c7',
                            color: item.priority === 'HIGH' ? '#dc2626' : '#d97706',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                          }}
                        >
                          {item.priority} PRIORITY
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleCopy(`kw-${idx}`, item.suggestedSentence)}
                        style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                      >
                        <i className="bi bi-clipboard"></i> {copiedId === `kw-${idx}` ? 'Copied Bullet!' : 'Copy Bullet'}
                      </button>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 10px' }}>
                      <strong>Why ATS checks this:</strong> {item.reason}
                    </p>

                    <div
                      style={{
                        background: 'var(--bg-card)',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        border: '1px dashed var(--accent)',
                        fontSize: '0.84rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', display: 'block', marginBottom: '2px' }}>
                        RECOMMENDED RESUME INSERTION:
                      </span>
                      • {item.suggestedSentence}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '1.5rem' }}></i>
                <div>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    Zero Critical Keyword Gaps Detected!
                  </strong>
                  <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    Your resume successfully covers all essential keyword criteria for {targetRole}.
                  </p>
                </div>
              </div>
            )}
          </article>

          {/* SECTION 4: Interactive ATS Action Checklist */}
          <article className="card" style={{ marginBottom: '24px', padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: 'var(--accent)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                SECTION 4 • EXECUTION CHECKLIST
              </span>
              <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: '0 0 4px' }}>
                Actionable AI Optimization Checklist
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Check off each enhancement as you apply it to your Word or PDF document before re-analyzing.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recommendations.map((rec, i) => {
                const taskId = `rec-task-${i}`;
                const isDone = !!completedTasks[taskId];
                return (
                  <div
                    key={i}
                    onClick={() => toggleTask(taskId)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      background: isDone ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: isDone ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => {}}
                      style={{ marginTop: '3px', cursor: 'pointer', accentColor: 'var(--success)' }}
                    />
                    <span
                      style={{
                        fontSize: '0.86rem',
                        lineHeight: '1.45',
                        color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: isDone ? 'line-through' : 'none',
                      }}
                    >
                      {rec}
                    </span>
                  </div>
                );
              })}
            </div>
          </article>

          {/* Bottom Action Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              padding: '20px 24px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Updated Your Resume Document?
              </strong>
              <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Re-scan your revised resume file to verify your new score and validate all resolved keyword gaps.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link to="/dashboard/skillsgap" className="btn btn-secondary">
                <i className="bi bi-graph-up"></i> Explore Skills Gap
              </Link>
              <Link to="/dashboard/resumeanalyzer" className="btn btn-primary">
                <i className="bi bi-cloud-arrow-up"></i> Re-Scan Updated Resume
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ResumeImprovement;
