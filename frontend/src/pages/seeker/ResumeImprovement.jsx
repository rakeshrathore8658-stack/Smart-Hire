import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client';

const ResumeImprovement = () => {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const analysisId = searchParams.get('id');

  const [copiedId, setCopiedId] = useState(null);
  const [targetRole, setTargetRole] = useState(roleParam || 'Java Developer');
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAnalysisOrHistory = async () => {
      try {
        if (analysisId) {
          const res = await api.get(`/analysis/${analysisId}`);
          if (isMounted && res.data) {
            const data = res.data.analysis || res.data;
            setAnalysis(data);
            if (data.targetJobRole) setTargetRole(data.targetJobRole);
            return;
          }
        }

        if (!roleParam) {
          const res = await api.get('/dashboard/history');
          if (isMounted && res.data?.history?.length > 0) {
            const latest = res.data.history[0];
            if (latest.targetJobRole) setTargetRole(latest.targetJobRole);
          }
        }
      } catch (err) {}
    };
    fetchAnalysisOrHistory();
    return () => {
      isMounted = false;
    };
  }, [roleParam, analysisId]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const candidateName = analysis?.candidateName || analysis?.candidate?.name || '';
  const missingSkills = (analysis?.missingSkillsList || []).map((s) =>
    typeof s === 'object' ? s.skill || s.name : s
  );
  const matchedSkills = analysis?.matchedSkillsList || [];
  const recommendations = analysis?.recommendationsList || [];

  const tailoredSummary =
    analysis?.improvedSummary ||
    `Results-driven ${targetRole} with hands-on experience in ${
      matchedSkills.slice(0, 4).join(', ') || 'enterprise software engineering'
    }. Proven track record designing maintainable microservices, optimizing database queries, and accelerating feature delivery across agile sprints.`;

  const missingKeywordsString =
    missingSkills.length > 0
      ? missingSkills.join(', ')
      : 'Docker, Kubernetes, AWS Cloud, CI/CD Pipelines, Microservices Architecture';

  const recommendationsString =
    recommendations.length > 0
      ? recommendations.slice(0, 3).join(' ')
      : 'Quantify production metrics and add modern cloud containerization keywords.';

  const improvements = [
    {
      id: 'summary',
      section: 'SECTION 1',
      title: 'Professional Summary Optimization',
      description: 'Replace generic statements with quantifiable achievements and role keywords.',
      currentText:
        '"Hardworking professional with good technical background. Looking for a challenging position to utilize skills and grow within a reputed organization."',
      improvedText: tailoredSummary,
      impact: '+5% ATS Score',
    },
    {
      id: 'bullets',
      section: 'SECTION 2',
      title: 'Experience Bullet Point Impact Rewriting',
      description: 'Transform task-based descriptions into action + metric + business impact formulas.',
      currentText:
        '"Worked on building backend endpoints, solved bugs, and participated in daily standups."',
      improvedText:
        `Architected resilient, high-throughput endpoints for ${targetRole} workflows using automated tests (JUnit/Mockito), reducing defect escapement by 35% and improving team release velocity.`,
      impact: '+4% ATS Score',
    },
    {
      id: 'keywords',
      section: 'SECTION 3',
      title: 'Missing Technical Keywords Integration',
      description: 'Weave high-frequency industry keywords into your skills and project sections.',
      currentText:
        matchedSkills.length > 0
          ? `Detected: ${matchedSkills.slice(0, 5).join(', ')}`
          : '"Skills: Java, SQL, HTML, Git"',
      improvedText: `Recommended Keywords to Incorporate: ${missingKeywordsString}`,
      impact: '+5% ATS Score',
    },
    {
      id: 'recommendations',
      section: 'SECTION 4',
      title: 'AI Actionable Recommendations',
      description: 'Immediate structural enhancements to elevate ATS pass-through rate.',
      currentText: 'Standard unoptimized format.',
      improvedText: recommendationsString,
      impact: '+3% ATS Score',
    },
  ];

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <Link to="/dashboard/resumeanalyzer">Resume Analyzer</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Resume Improvement</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Resume Improvement Roadmap</h1>
          <p className="page-subtitle">
            Targeted phrasing improvements, bullet rewrites, and keyword recommendations to elevate your score to 95%+
            {candidateName ? ` for candidate ${candidateName}` : ''}.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            <i className="bi bi-printer"></i> Print Checklist
          </button>
          <Link className="btn btn-primary" to="/dashboard/resumeanalyzer">
            <i className="bi bi-cpu"></i> Re-analyze Resume
          </Link>
        </div>
      </div>

      {/* Score Potential Banner */}
      <article
        className="card"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
          color: '#ffffff',
          marginBottom: '28px',
          padding: '24px 28px',
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
          <div>
            <span
              className="badge"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                marginBottom: '10px',
              }}
            >
              TARGET: {targetRole.toUpperCase()}
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px', color: '#ffffff' }}>
              Unlock +15% to +25% ATS Score Boost
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.85)' }}>
              Incorporate our AI-suggested keyword clusters and high-impact action verbs into your resume.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent)' }}>95%+</span>
            <span style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.75)' }}>
              TARGET ATS READINESS
            </span>
          </div>
        </div>
      </article>

      {/* Improvement Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {improvements.map((item) => (
          <article key={item.id} className="card" style={{ padding: '22px 24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '14px',
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
                  {item.section}
                </span>
                <h3 style={{ fontSize: '1.08rem', fontWeight: 700, margin: '0 0 4px' }}>{item.title}</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {item.description}
                </p>
              </div>
              <span
                className="badge badge-success"
                style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px' }}
              >
                {item.impact}
              </span>
            </div>

            {/* Before / After Comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '16px', marginTop: '16px' }}>
              {/* Before */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
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
                  <i className="bi bi-x-circle text-danger" style={{ marginRight: '4px' }}></i> Weak / Generic Version
                </span>
                <p
                  style={{
                    fontSize: '0.84rem',
                    lineHeight: '1.5',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    fontStyle: 'italic',
                  }}
                >
                  {item.currentText}
                </p>
              </div>

              {/* After (Optimized) */}
              <div
                style={{
                  background: 'var(--accent-light)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  position: 'relative',
                }}
              >
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
                      fontWeight: 700,
                      color: 'var(--accent)',
                      textTransform: 'uppercase',
                    }}
                  >
                    <i className="bi bi-check-circle-fill text-success" style={{ marginRight: '4px' }}></i> AI Optimized Version
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCopy(item.id, item.improvedText)}
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                  >
                    <i className="bi bi-clipboard"></i> {copiedId === item.id ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p
                  style={{
                    fontSize: '0.84rem',
                    lineHeight: '1.5',
                    color: 'var(--text-primary)',
                    margin: 0,
                    fontWeight: 500,
                  }}
                >
                  {item.improvedText}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ResumeImprovement;
