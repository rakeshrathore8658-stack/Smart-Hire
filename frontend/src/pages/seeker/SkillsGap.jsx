import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import CustomSelect from '../../components/common/CustomSelect';

const SkillsGap = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const analysisId = searchParams.get('id');

  const [analysis, setAnalysis] = useState(null);
  const [dbJobs, setDbJobs] = useState([]);
  const [selectedRole, setSelectedRole] = useState(roleParam || '');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'verified' | 'missing' | 'categories'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const activeEmail = user?.email
          ? user.email.trim().toLowerCase()
          : (typeof window !== 'undefined'
              ? (sessionStorage.getItem('smarthire_user_email') || localStorage.getItem('smarthire_user_email') || '')
              : '');

        // 1. Fetch available jobs for comparison benchmarks
        const jobsPromise = api.get('/jobs').catch(() => ({ data: [] }));

        // 2. Fetch analysis (either by ID or latest from history)
        let analysisData = null;
        if (analysisId) {
          try {
            const singleRes = await api.get(`/analysis/${analysisId}`);
            if (singleRes.data) {
              analysisData = singleRes.data.analysis || singleRes.data;
            }
          } catch (e) {
            console.warn('Direct analysis fetch failed, falling back to history', e);
          }
        }

        if (!analysisData) {
          const histRes = await api.get('/dashboard/history', {
            params: activeEmail ? { email: activeEmail } : {},
          }).catch(() => ({ data: [] }));
          const list = Array.isArray(histRes.data) ? histRes.data : (histRes.data?.history || []);
          if (list.length > 0) {
            const latest = list[0];
            if (latest.analysisJson) {
              try {
                const parsed = JSON.parse(latest.analysisJson);
                parsed.id = parsed.id || latest.id;
                analysisData = parsed;
              } catch (err) {
                analysisData = latest;
              }
            } else if (latest.id) {
              const singleRes = await api.get(`/analysis/${latest.id}`).catch(() => null);
              analysisData = singleRes?.data?.analysis || singleRes?.data || latest;
            } else {
              analysisData = latest;
            }
          }
        }

        const [jobsRes] = await Promise.all([jobsPromise]);

        if (isMounted) {
          const jobsList = jobsRes.data?.jobs || (Array.isArray(jobsRes.data) ? jobsRes.data : []);
          setDbJobs(jobsList);

          if (analysisData) {
            setAnalysis(analysisData);
            const initialRole = roleParam || analysisData.targetJobRole || (jobsList.length > 0 ? jobsList[0].title : 'Java Developer');
            setSelectedRole(initialRole);
          } else if (jobsList.length > 0) {
            setSelectedRole(roleParam || jobsList[0].title);
          }
        }
      } catch (err) {
        console.error('Failed to load skills gap data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAllData();
    return () => {
      isMounted = false;
    };
  }, [analysisId, roleParam, user]);

  // Extract candidate details
  const candidateName = analysis?.candidateName || analysis?.candidate?.name || '';
  const effScore = analysis?.overallScore ?? analysis?.atsScore ?? 85;
  const analyzedRole = analysis?.targetJobRole || 'Software Professional';

  // Extract all detected verified skills from resume (all 30+ skills)
  const candidateVerifiedSkills = useMemo(() => {
    if (!analysis) return [];
    const raw = analysis.matchedSkillsList || analysis.skillsAnalysis?.matchedSkills || analysis.matchedSkills || [];
    return Array.from(new Set(raw.map((s) => (typeof s === 'object' ? s.name || s.skill : String(s)).trim()))).filter(Boolean);
  }, [analysis]);

  // Extract missing skills directly identified by AI analysis
  const candidateMissingSkills = useMemo(() => {
    if (!analysis) return [];
    const raw = analysis.missingSkillsList || analysis.skillsAnalysis?.missingSkills || analysis.missingSkills || [];
    return raw.map((s) => {
      if (typeof s === 'object' && s !== null) {
        return {
          name: s.skill || s.name || 'Required Competency',
          priority: s.priority || 'HIGH',
          reason: s.reason || `Core qualification filter for ${analyzedRole} candidates.`,
        };
      }
      return {
        name: String(s),
        priority: 'HIGH',
        reason: `Expected keyword requirement for ${analyzedRole} screening algorithms.`,
      };
    });
  }, [analysis, analyzedRole]);

  // Find job definition if comparing with a database vacancy
  const activeJob = useMemo(() => {
    if (!dbJobs || dbJobs.length === 0) return null;
    return dbJobs.find((j) => j.title.toLowerCase() === selectedRole.toLowerCase()) || null;
  }, [dbJobs, selectedRole]);

  // Dynamic Skill Gap Calculation for current selectedRole
  const { roleVerifiedSkills, roleMissingSkills, roleMatchPercent } = useMemo(() => {
    // If selectedRole matches analyzed target job role
    if (selectedRole.toLowerCase() === analyzedRole.toLowerCase() || !activeJob) {
      const verified = candidateVerifiedSkills.map((name) => ({
        name,
        verified: true,
        source: 'Resume Text & AI Analysis',
      }));
      const missing = candidateMissingSkills.map((sk) => ({
        ...sk,
        verified: false,
      }));
      const total = verified.length + missing.length;
      const pct = total > 0 ? Math.round((verified.length / total) * 100) : effScore;
      return {
        roleVerifiedSkills: verified,
        roleMissingSkills: missing,
        roleMatchPercent: Math.min(100, Math.max(effScore, pct)),
      };
    }

    // If comparing against an active company job requisition
    const reqSkills = activeJob.requiredSkills
      ? activeJob.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const verified = [];
    const missing = [];

    reqSkills.forEach((req) => {
      const match = candidateVerifiedSkills.find(
        (cv) => cv.toLowerCase() === req.toLowerCase() || cv.toLowerCase().includes(req.toLowerCase()) || req.toLowerCase().includes(cv.toLowerCase())
      );
      if (match) {
        verified.push({ name: req, verified: true, source: `Matches verified skill: ${match}` });
      } else {
        missing.push({
          name: req,
          priority: 'HIGH',
          reason: `Required for ${activeJob.title} requisition in ${activeJob.department || 'Engineering'}.`,
          verified: false,
        });
      }
    });

    const total = verified.length + missing.length;
    const pct = total > 0 ? Math.round((verified.length / total) * 100) : 50;

    return {
      roleVerifiedSkills: verified,
      roleMissingSkills: missing,
      roleMatchPercent: pct,
    };
  }, [selectedRole, analyzedRole, activeJob, candidateVerifiedSkills, candidateMissingSkills, effScore]);

  // Skill categorization taxonomy
  const categorizedSkills = useMemo(() => {
    const categories = {
      'Programming Languages & Core CS': [],
      'Backend & Web Frameworks': [],
      'Databases & Persistence': [],
      'Tools, DevOps & AI': [],
    };

    candidateVerifiedSkills.forEach((sk) => {
      const s = sk.toLowerCase();
      if (
        s.includes('java') ||
        s === 'c' ||
        s === 'c++' ||
        s.includes('javascript') ||
        s.includes('python') ||
        s.includes('oop') ||
        s.includes('dsa') ||
        s.includes('multithreading') ||
        s.includes('collections') ||
        s.includes('exception')
      ) {
        categories['Programming Languages & Core CS'].push(sk);
      } else if (
        s.includes('spring') ||
        s.includes('rest') ||
        s.includes('servlet') ||
        s.includes('jsp') ||
        s.includes('html') ||
        s.includes('css') ||
        s.includes('react')
      ) {
        categories['Backend & Web Frameworks'].push(sk);
      } else if (
        s.includes('sql') ||
        s.includes('mysql') ||
        s.includes('jdbc') ||
        s.includes('database') ||
        s.includes('mongodb')
      ) {
        categories['Databases & Persistence'].push(sk);
      } else {
        categories['Tools, DevOps & AI'].push(sk);
      }
    });

    return categories;
  }, [candidateVerifiedSkills]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <Link to="/dashboard/resumeanalyzer">Resume Analyzer</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Skills Gap Analysis</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">
              <i className="bi bi-graph-up-arrow"></i> TALENT INTELLIGENCE
            </span>
            {analysis?.id && (
              <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                ANALYSIS ID #{analysis.id}
              </span>
            )}
          </div>
          <h1 className="page-title">Skills Gap Analysis &amp; Competency Matrix</h1>
          <p className="page-subtitle">
            Deep-dive comparison between verified resume competencies and target industry requisitions for{' '}
            <strong>{candidateName || 'Candidate'}</strong>.
          </p>
        </div>
        <div className="page-header-actions">
          <Link
            className="btn btn-secondary"
            to={`/dashboard/resumeimprovement${analysis?.id ? `?id=${analysis.id}` : ''}`}
          >
            <i className="bi bi-magic"></i> View Improvement Plan
          </Link>
          <Link
            className="btn btn-primary"
            to={`/dashboard/resumeanalyzer?role=${encodeURIComponent(selectedRole)}`}
          >
            <i className="bi bi-cpu"></i> Re-scan for this Role
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem', margin: '0 auto 16px' }}></div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Calculating Dynamic Skills Gap Matrix...</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Benchmarking 30+ verified competencies against live industry requisitions...
          </p>
        </div>
      ) : !analysis ? (
        <div className="card" style={{ padding: '50px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: '16px' }}>
            <i className="bi bi-bullseye"></i>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>
            No Resume Skills Analyzed Yet
          </h2>
          <p style={{ maxWidth: '520px', margin: '0 auto 24px', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Upload your resume in the Resume Analyzer to extract your verified skills and evaluate your real competency match against any role.
          </p>
          <Link to="/dashboard/resumeanalyzer" className="btn btn-primary" style={{ padding: '10px 24px' }}>
            <i className="bi bi-cloud-arrow-up" style={{ marginRight: '8px' }}></i> Analyze Resume Now
          </Link>
        </div>
      ) : (
        <>
          {/* Target Role & Benchmark Selector Card */}
          <article className="card" style={{ marginBottom: '24px', padding: '18px 24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '1.6rem', color: 'var(--accent)' }}>
                  <i className="bi bi-bullseye"></i>
                </span>
                <div>
                  <strong style={{ fontSize: '0.96rem', color: 'var(--text-primary)', display: 'block' }}>
                    Comparing Skills Against Role Benchmark:
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Switch roles to evaluate how your current {candidateVerifiedSkills.length} verified competencies map to different engineering tracks.
                  </p>
                </div>
              </div>

              <div style={{ flex: '1 1 260px', maxWidth: '400px' }}>
                <CustomSelect
                  value={selectedRole}
                  onChange={(val) => setSelectedRole(val)}
                  options={[
                    {
                      isHeader: true,
                      label: 'Analyzed Resume Target Role',
                    },
                    {
                      value: analyzedRole,
                      label: `${analyzedRole} (From Resume Analysis #${analysis.id})`,
                      badge: 'Target Role',
                      icon: <i className="bi bi-file-earmark-person text-primary"></i>,
                    },
                    ...(dbJobs.length > 0
                      ? [
                          { isHeader: true, label: 'Active Company Vacancies' },
                          ...dbJobs.map((j) => ({
                            value: j.title,
                            label: `${j.title} (${j.department || 'Engineering'})`,
                            badge: `${j.openings || 1} open`,
                            icon: <i className="bi bi-briefcase text-accent"></i>,
                          })),
                        ]
                      : []),
                  ]}
                  placeholder="Select Role Benchmark..."
                />
              </div>
            </div>
          </article>

          {/* 4 Modern SaaS KPI Metric Cards */}
          <section className="stats-grid-4" style={{ marginBottom: '28px' }}>
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Competency Match Index</span>
                <span className="stat-icon icon-green">
                  <i className="bi bi-bullseye"></i>
                </span>
              </div>
              <div
                className="stat-value"
                style={{
                  color: roleMatchPercent >= 75 ? 'var(--success)' : roleMatchPercent >= 50 ? 'var(--warning)' : '#dc2626',
                }}
              >
                {roleMatchPercent}%
              </div>
              <span className="stat-unit">
                {roleVerifiedSkills.length} of {roleVerifiedSkills.length + roleMissingSkills.length} required skills verified
              </span>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Verified Resume Skills</span>
                <span className="stat-icon icon-navy">
                  <i className="bi bi-patch-check-fill"></i>
                </span>
              </div>
              <div className="stat-value" style={{ color: 'var(--primary)' }}>
                {candidateVerifiedSkills.length}
              </div>
              <span className="stat-unit">Extracted across 4 technical domains</span>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Critical Skill Gaps</span>
                <span
                  className="stat-icon"
                  style={{
                    background: roleMissingSkills.length > 0 ? 'var(--warning-bg, #fef3c7)' : 'rgba(34, 197, 94, 0.1)',
                    color: roleMissingSkills.length > 0 ? 'var(--warning, #d97706)' : 'var(--success)',
                  }}
                >
                  <i className={roleMissingSkills.length > 0 ? 'bi bi-exclamation-triangle-fill' : 'bi bi-check-all'}></i>
                </span>
              </div>
              <div
                className="stat-value"
                style={{ color: roleMissingSkills.length > 0 ? 'var(--warning)' : 'var(--success)' }}
              >
                {roleMissingSkills.length}
              </div>
              <span className="stat-unit">
                {roleMissingSkills.length > 0 ? `Required for ${selectedRole}` : 'Zero critical gaps detected!'}
              </span>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">ATS Candidate Tier</span>
                <span className="stat-icon icon-info">
                  <i className="bi bi-award-fill"></i>
                </span>
              </div>
              <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                {roleMatchPercent >= 80 ? 'Top 15% Candidate' : roleMatchPercent >= 65 ? 'Competitive Candidate' : 'Upskilling Needed'}
              </div>
              <span className="stat-unit">Based on verified keyword density</span>
            </article>
          </section>

          {/* Interactive Filter Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '24px',
              overflowX: 'auto',
              paddingBottom: '2px',
            }}
          >
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('all')}
              style={{ borderRadius: '8px', padding: '8px 16px', fontWeight: 600 }}
            >
              All Competencies ({candidateVerifiedSkills.length + roleMissingSkills.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'verified' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('verified')}
              style={{ borderRadius: '8px', padding: '8px 16px', fontWeight: 600 }}
            >
              <i className="bi bi-check2-circle" style={{ marginRight: '6px' }}></i>
              Verified in Resume ({candidateVerifiedSkills.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'missing' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('missing')}
              style={{ borderRadius: '8px', padding: '8px 16px', fontWeight: 600 }}
            >
              <i className="bi bi-exclamation-triangle" style={{ marginRight: '6px' }}></i>
              Skill Gaps to Bridge ({roleMissingSkills.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'categories' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('categories')}
              style={{ borderRadius: '8px', padding: '8px 16px', fontWeight: 600 }}
            >
              <i className="bi bi-grid-3x3-gap" style={{ marginRight: '6px' }}></i>
              Domain Matrix
            </button>
          </div>

          {/* TAB 1: ALL & VERIFIED vs MISSING COMPARISON */}
          {(activeTab === 'all' || activeTab === 'verified' || activeTab === 'missing') && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  activeTab === 'all'
                    ? 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))'
                    : '1fr',
                gap: '24px',
                marginBottom: '28px',
              }}
            >
              {/* Verified Skills Panel */}
              {(activeTab === 'all' || activeTab === 'verified') && (
                <article className="card" style={{ padding: '24px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--border-color)',
                      paddingBottom: '14px',
                      marginBottom: '16px',
                    }}
                  >
                    <div>
                      <span className="badge badge-success">
                        <i className="bi bi-check-circle-fill" style={{ marginRight: '4px' }}></i>
                        DETECTED &amp; VERIFIED
                      </span>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '6px 0 2px' }}>
                        Skills Present in Candidate Resume
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        Cross-referenced from resume text, project descriptions, and technical profiles.
                      </p>
                    </div>
                    <span className="count-badge count-success" style={{ fontSize: '0.9rem', padding: '4px 10px' }}>
                      {candidateVerifiedSkills.length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {candidateVerifiedSkills.map((sk, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(34, 197, 94, 0.08)',
                          color: '#15803d',
                          border: '1px solid rgba(34, 197, 94, 0.25)',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                        }}
                      >
                        <i className="bi bi-check-lg" style={{ fontSize: '0.9rem', fontWeight: 900 }}></i>
                        {sk}
                      </span>
                    ))}
                  </div>
                </article>
              )}

              {/* Missing Skills Gap Panel */}
              {(activeTab === 'all' || activeTab === 'missing') && (
                <article className="card" style={{ padding: '24px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--border-color)',
                      paddingBottom: '14px',
                      marginBottom: '16px',
                    }}
                  >
                    <div>
                      <span className="badge badge-warning">
                        <i className="bi bi-exclamation-triangle" style={{ marginRight: '4px' }}></i>
                        HIGH-IMPACT GAPS
                      </span>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '6px 0 2px' }}>
                        Identified Gaps for {selectedRole}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        Core requirements not detected in current resume that trigger ATS parser deductions.
                      </p>
                    </div>
                    <span className="count-badge count-warning" style={{ fontSize: '0.9rem', padding: '4px 10px' }}>
                      {roleMissingSkills.length}
                    </span>
                  </div>

                  {roleMissingSkills.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {roleMissingSkills.map((item, idx) => (
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
                              marginBottom: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                                {item.name}
                              </strong>
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
                            <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                              +6% ATS Boost
                            </span>
                          </div>

                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 10px' }}>
                            {item.reason}
                          </p>

                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--accent)',
                              background: 'var(--bg-card)',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px dashed var(--accent)',
                            }}
                          >
                            <strong>Action:</strong> Add a bullet point demonstrating hands-on experience or project implementation with {item.name}.
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '30px 20px',
                        textAlign: 'center',
                        background: 'rgba(34, 197, 94, 0.06)',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <i className="bi bi-shield-check text-success" style={{ fontSize: '2.5rem', marginBottom: '8px', display: 'block' }}></i>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)', display: 'block' }}>
                        Zero Skill Gaps Detected for {selectedRole}!
                      </strong>
                      <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Your resume verified skills fulfill 100% of the screening requisitions for this target profile.
                      </p>
                    </div>
                  )}
                </article>
              )}
            </div>
          )}

          {/* TAB 4: CATEGORIZED DOMAIN MATRIX */}
          {activeTab === 'categories' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                gap: '20px',
                marginBottom: '28px',
              }}
            >
              {Object.entries(categorizedSkills).map(([catName, skills]) => (
                <article key={catName} className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      {catName}
                    </h4>
                    <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                      {skills.length} verified
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {skills.length > 0 ? (
                      skills.map((s, i) => (
                        <span
                          key={i}
                          style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                            color: 'var(--text-primary)',
                            fontWeight: 500,
                          }}
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        No skills detected in this category.
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Bottom Callout Banner */}
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
              <strong style={{ fontSize: '0.96rem', color: 'var(--text-primary)' }}>
                Want to Bridge Your Missing Skills?
              </strong>
              <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Access customized resume bullet rewriting, summary optimization, and ready-to-paste keyword templates.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link
                to={`/dashboard/resumeimprovement${analysis?.id ? `?id=${analysis.id}` : ''}`}
                className="btn btn-primary"
              >
                <i className="bi bi-box-arrow-up-right"></i> Open Resume Improvement Plan
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SkillsGap;
