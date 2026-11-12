import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';
import SkeletonLoader from '../../components/common/SkeletonLoader';

export default function JobDetails() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [jobRes, candsRes] = await Promise.allSettled([
          api.get(`/jobs/${id}`),
          api.get('/dashboard/applications'),
        ]);

        if (isMounted) {
          if (jobRes.status === 'fulfilled' && jobRes.value?.data) {
            setJob(jobRes.value.data);
          } else {
            setJob(null);
          }

          if (candsRes.status === 'fulfilled') {
            const list = candsRes.value?.data?.applications || (Array.isArray(candsRes.value?.data) ? candsRes.value.data : []);
            setCandidates(list);
          } else {
            setCandidates([]);
          }
        }
      } catch (err) {
        if (isMounted) {
          setJob(null);
          setCandidates([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div>
        <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
          <Link to="/dashboard">Dashboard</Link>
          <span className="breadcrumb-separator">/</span>
          <Link to="/dashboard/jobs">Jobs</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Loading...</span>
        </nav>
        <SkeletonLoader type="card" count={3} />
      </div>
    );
  }

  if (!job) {
    return (
      <div>
        <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
          <Link to="/dashboard">Dashboard</Link>
          <span className="breadcrumb-separator">/</span>
          <Link to="/dashboard/jobs">Jobs</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Not Found</span>
        </nav>
        <article className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--danger)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
              fontSize: '1.8rem',
            }}
          >
            <i className="bi bi-exclamation-triangle"></i>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
            Job Requisition Not Found
          </h3>
          <p style={{ maxWidth: '500px', margin: '0 auto 20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            The requested job requisition (#{id}) does not exist in the database or the database connection is currently unavailable.
          </p>
          <Link to="/dashboard/jobs" className="btn btn-primary btn-sm">
            <i className="bi bi-arrow-left"></i> Back to Job Management
          </Link>
        </article>
      </div>
    );
  }

  const currentJob = job;
  const requiredSkillsList = currentJob.requiredSkills
    ? currentJob.requiredSkills.split(',').map((s) => s.trim())
    : ['Java', 'Spring Boot', 'SQL'];

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <Link to="/dashboard/jobs">Jobs</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">
          REQ-{currentJob.id} · {currentJob.title}
        </span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span
              className={`badge ${currentJob.status?.toLowerCase() === 'closed' ? 'badge-neutral' : 'badge-success'}`}
            >
              {currentJob.status || 'Open'}
            </span>
            <span className="badge badge-primary">{currentJob.department || 'Engineering'}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>REQ-{currentJob.id}</span>
          </div>
          <h1 className="page-title">{currentJob.title}</h1>
          <p className="page-subtitle">
            {currentJob.employmentType || 'Full-time'} · {currentJob.location || 'Remote / Hybrid'} ·{' '}
            {currentJob.minExperience} – {currentJob.maxExperience} Years Experience · Posted{' '}
            {currentJob.formattedDate || 'Recently'}
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="btn btn-secondary" to={`/dashboard/jobs/${currentJob.id}/edit`}>
            <i className="bi bi-pencil"></i> Edit Job
          </Link>
          <Link className="btn btn-primary" to="/dashboard/candidates">
            <i className="bi bi-people"></i> Candidate Pool ({candidates.length})
          </Link>
        </div>
      </div>

      {/* Mini Funnel */}
      <section className="stats-grid-6" style={{ marginBottom: '24px' }}>
        <article className="stat-card">
          <span className="stat-label">Total Applied</span>
          <div className="stat-value">{candidates.length}</div>
        </article>
        <article className="stat-card">
          <span className="stat-label">AI Screened</span>
          <div className="stat-value">{candidates.length}</div>
        </article>
        <article className="stat-card">
          <span className="stat-label">Shortlisted</span>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>
            {candidates.filter((c) => c.shortlisted || c.stage?.includes('Shortlist')).length}
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-label">Interviewing</span>
          <div className="stat-value">
            {candidates.filter((c) => c.stage?.includes('Interview')).length}
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-label">Offer Extended</span>
          <div className="stat-value">
            {candidates.filter((c) => c.stage?.includes('Offer')).length}
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-label">Hired</span>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {candidates.filter((c) => c.stage?.includes('Hire')).length}
          </div>
        </article>
      </section>

      {/* Grid: Job Criteria & Associated Candidates */}
      <div className="grid-2-1">
        {/* Associated Candidates Table */}
        <article className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Associated Candidates</h2>
              <p className="card-description">Screened applicants ranked by AI match score.</p>
            </div>
            <Link to="/dashboard/candidates" className="btn btn-ghost btn-sm">
              View full pool →
            </Link>
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Match Score</th>
                  <th>Role Analyzed</th>
                  <th>Stage</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {candidates.length > 0 ? (
                  candidates.map((cand) => (
                    <tr key={cand.id}>
                      <td>
                        <strong>{cand.candidateName || 'Candidate'}</strong>
                        <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                          {cand.candidateEmail || 'No email'}
                        </small>
                      </td>
                      <td>
                        <span
                          className={`score-badge ${cand.overallScore >= 80 ? 'score-high' : cand.overallScore >= 60 ? 'score-mid' : 'score-low'}`}
                        >
                          {cand.overallScore}%
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{cand.targetJobRole || 'General'}</span>
                      </td>
                      <td>
                        <span className="badge badge-success">{cand.stage || 'Under Review'}</span>
                      </td>
                      <td>
                        <Link to={`/dashboard/candidates/${cand.id}`} className="btn btn-secondary btn-sm">
                          Profile
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                      <i
                        className="bi bi-people"
                        style={{ fontSize: '2rem', display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}
                      ></i>
                      No candidate applications associated with this job requisition yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* Right Column: Requisition Requirements */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <article className="card">
            <div className="card-header">
              <h2 className="card-title">Required Skills</h2>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {requiredSkillsList.map((skill, idx) => (
                <span key={idx} className="skill-tag skill-matched" style={{ fontSize: '0.75rem' }}>
                  {skill}
                </span>
              ))}
            </div>

            <strong
              style={{
                display: 'block',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '6px',
              }}
            >
              Position Details:
            </strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <div>
                <strong>Salary Range: </strong>
                <span>{currentJob.salaryRange || 'Competitive'}</span>
              </div>
              <div>
                <strong>Openings: </strong>
                <span>{currentJob.openings || 1}</span> Position(s)
              </div>
              <div>
                <strong>Experience: </strong>
                <span>
                  {currentJob.minExperience} - {currentJob.maxExperience} yrs
                </span>
              </div>
            </div>
          </article>

          <article className="card">
            <div className="card-header">
              <h2 className="card-title">Job Summary</h2>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {currentJob.description}
            </p>
          </article>
        </aside>
      </div>
    </div>
  );
}
