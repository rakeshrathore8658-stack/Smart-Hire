import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import CustomSelect from '../../components/common/CustomSelect';
import EmptyState from '../../components/common/EmptyState';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const AnalyzerHistory = () => {
  const [analysesList, setAnalysesList] = useState([]);
  const [dbJobs, setDbJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedScore, setSelectedScore] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      const [historyRes, jobsRes] = await Promise.allSettled([
        api.get('/dashboard/history'),
        api.get('/jobs'),
      ]);

      if (historyRes.status === 'fulfilled') {
        const list = Array.isArray(historyRes.value?.data)
          ? historyRes.value.data
          : historyRes.value?.data?.history || [];
        setAnalysesList(list);
      }
      if (jobsRes.status === 'fulfilled') {
        const list = jobsRes.value.data?.jobs || (Array.isArray(jobsRes.value.data) ? jobsRes.value.data : []);
        setDbJobs(list);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Real-time synchronization
  useRealtimeSync(fetchHistory);

  const availableRoles = Array.from(
    new Set([
      ...dbJobs.map((j) => j.title),
      ...analysesList.map((a) => a.targetJobRole).filter(Boolean),
    ])
  );

  const handleDelete = async (id, e) => {
    e.preventDefault();
    if (!window.confirm('Delete this resume analysis record permanently from the database?')) return;

    try {
      const res = await api.delete(`/dashboard/history/${id}`);
      setAnalysesList((prev) => prev.filter((item) => item.id !== id));
      setSuccessMessage(res.data?.message || 'Record deleted successfully from database.');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      console.error('Delete via dashboard API failed, attempting analysis endpoint:', err);
      try {
        const res = await api.delete(`/analysis/${id}`);
        setAnalysesList((prev) => prev.filter((item) => item.id !== id));
        setSuccessMessage(res.data?.message || 'Record deleted successfully from database.');
        setTimeout(() => setSuccessMessage(''), 3500);
      } catch (fallbackErr) {
        console.error('Delete failed:', fallbackErr);
        alert(fallbackErr.response?.data?.message || err.response?.data?.message || 'Failed to delete record from database.');
      }
    }
  };

  // Filtered rows
  const filtered = analysesList.filter((item) => {
    const text = `${item.resumeFileName || ''} ${item.candidateName || ''} ${item.targetJobRole || ''}`.toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase().trim());
    const matchesRole = !selectedRole || (item.targetJobRole && item.targetJobRole.toLowerCase().includes(selectedRole.toLowerCase()));
    const score = item.overallScore || item.atsScore || 0;
    let matchesScore = true;
    if (selectedScore === 'high') matchesScore = score >= 80;
    else if (selectedScore === 'mid') matchesScore = score >= 60 && score < 80;
    else if (selectedScore === 'low') matchesScore = score < 60;

    return matchesSearch && matchesRole && matchesScore;
  });

  const totalScanned = analysesList.length;
  const scores = analysesList.map((a) => a.overallScore || a.atsScore || 0).filter((s) => s > 0);
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const mostTargetedRole = analysesList[0]?.targetJobRole || 'Java Developer';

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Analyzer History</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Resume Analysis History</h1>
          <p className="page-subtitle">
            Track your resume optimizations across different career roles and versions.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="btn btn-primary" to="/dashboard/resumeanalyzer">
            <i className="bi bi-plus-lg"></i> New Analysis
          </Link>
        </div>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="alert alert-success" role="status" style={{ marginBottom: '20px' }}>
          {successMessage}
        </div>
      )}

      {/* Stats Overview Bar */}
      <section className="stats-grid-4" style={{ marginBottom: '24px' }}>
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Total Resumes Scanned</span>
            <span className="stat-icon icon-navy">
              <i className="bi bi-file-earmark-text"></i>
            </span>
          </div>
          <div className="stat-value">{totalScanned}</div>
          <span className="stat-unit">Across target profiles</span>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Highest Score Achieved</span>
            <span className="stat-icon icon-green">
              <i className="bi bi-award"></i>
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {highestScore > 0 ? `${highestScore}%` : 'N/A'}
          </div>
          <span className="stat-unit">
            {totalScanned > 0 ? `${mostTargetedRole} role` : 'No scans yet'}
          </span>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Average Score</span>
            <span className="stat-icon icon-info">
              <i className="bi bi-graph-up-arrow"></i>
            </span>
          </div>
          <div className="stat-value">{avgScore > 0 ? `${avgScore}%` : 'N/A'}</div>
          <span className="stat-unit">Calculated ATS benchmark</span>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Most Targeted Role</span>
            <span className="stat-icon">
              <i className="bi bi-bullseye"></i>
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.15rem' }}>
            {totalScanned > 0 ? mostTargetedRole : '—'}
          </div>
          <span className="stat-unit">Primary career profile</span>
        </article>
      </section>

      {/* Filter & Search Toolbar */}
      <article className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
            <input
              type="search"
              id="historySearch"
              placeholder="Search by resume filename, job role, or candidate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <CustomSelect
              value={selectedRole}
              onChange={(val) => setSelectedRole(val)}
              options={[{ value: '', label: 'All Career Roles' }, ...availableRoles.map((r) => ({ value: r, label: r }))]}
              placeholder="All Career Roles"
              searchable={true}
              style={{ minWidth: '190px' }}
            />

            <CustomSelect
              value={selectedScore}
              onChange={(val) => setSelectedScore(val)}
              options={[
                { value: '', label: 'All Scores' },
                { value: 'high', label: 'High (80%+)' },
                { value: 'mid', label: 'Average (60-79%)' },
                { value: 'low', label: 'Needs Work (<60%)' },
              ]}
              placeholder="All Scores"
              style={{ minWidth: '160px' }}
            />
          </div>
        </div>
      </article>

      {/* History Table */}
      <article className="card" data-tour="history-table">
        <div className="table-wrapper">
          <table className="table" id="historyTable">
            <thead>
              <tr>
                <th>Resume File</th>
                <th>Target Career Profile</th>
                <th>ATS Score</th>
                <th>Skill Match</th>
                <th>Date Scanned</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((item) => {
                  const score = item.overallScore || item.atsScore || 0;
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.resumeFileName || 'Resume.pdf'}</strong>
                        {item.candidateName && (
                          <small
                            style={{
                              display: 'block',
                              color: 'var(--text-secondary)',
                              fontSize: '0.75rem',
                            }}
                          >
                            <i className="bi bi-person"></i> {item.candidateName}
                          </small>
                        )}
                        <small
                          style={{
                            display: 'block',
                            color: 'var(--text-muted)',
                            fontSize: '0.72rem',
                          }}
                        >
                          {item.aiProvider ? `Evaluated with ${item.aiProvider}` : 'Evaluated with AI'}
                        </small>
                      </td>
                      <td>
                        <span className="badge badge-primary">
                          {item.targetJobRole || 'Java Developer'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`score-badge ${
                            score >= 75 ? 'score-high' : score >= 50 ? 'score-mid' : 'score-low'
                          }`}
                        >
                          {score}%
                        </span>
                      </td>
                      <td>{item.skillsScore ? `${item.skillsScore}%` : '50%'}</td>
                      <td>{item.formattedDate || item.scanDate || '03 Nov 2026'}</td>
                      <td>
                        <span className="badge badge-success">
                          {item.status || 'Completed'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <Link
                            to={`/dashboard/resumeanalyzer?id=${item.id}`}
                            className="btn btn-secondary btn-sm"
                            title="Review analysis & ATS score"
                          >
                            Report
                          </Link>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--danger)' }}
                            title="Delete Record"
                            onClick={(e) => handleDelete(item.id, e)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ fontSize: '2.2rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      <i className="bi bi-file-earmark-x"></i>
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px' }}>
                      No Resume Analyses Found
                    </h3>
                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        maxWidth: '440px',
                        margin: '0 auto 16px',
                      }}
                    >
                      You have not analyzed any resumes yet. Upload your resume to evaluate ATS
                      compatibility and track your scoring history here.
                    </p>
                    <Link to="/dashboard/resumeanalyzer" className="btn btn-primary btn-sm">
                      <i className="bi bi-cloud-arrow-up"></i> Analyze Your First Resume
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Scalable Pagination Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing {filtered.length} saved {filtered.length === 1 ? 'analysis' : 'analyses'}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Link to="/dashboard/resumeanalyzer" className="btn btn-primary btn-sm">
              <i className="bi bi-plus-lg"></i> New Scan
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
};

export default AnalyzerHistory;
