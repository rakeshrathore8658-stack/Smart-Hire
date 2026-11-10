import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import CustomSelect from '../../components/common/CustomSelect';
import EmptyState from '../../components/common/EmptyState';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const Applications = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStage = searchParams.get('stage') || '';

  const [selectedStage, setSelectedStage] = useState(initialStage);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchApps = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/applications');
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.applications)
        ? res.data.applications
        : [];
      setApplications(list);
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  // Real-time synchronization
  useRealtimeSync(fetchApps);

  const handleStageFilter = (stage) => {
    setSelectedStage(stage);
    if (stage) {
      setSearchParams({ stage });
    } else {
      setSearchParams({});
    }
  };

  const handleStageChange = async (id, newStage) => {
    try {
      await api.patch(`/dashboard/applications/${id}/stage`, { stage: newStage });
    } catch (err) {}

    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, displayStage: newStage, stage: newStage } : app))
    );
    setSuccessMessage(`Application stage updated to "${newStage}".`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteApp = async (id, name, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete application for "${name || 'Candidate'}" from database?`)) return;

    try {
      const res = await api.delete(`/dashboard/applications/${id}`);
      setApplications((prev) => prev.filter((app) => app.id !== id));
      setSuccessMessage(res.data?.message || 'Application and resume deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      console.error('Delete application failed:', err);
      try {
        const res = await api.delete(`/analysis/${id}`);
        setApplications((prev) => prev.filter((app) => app.id !== id));
        setSuccessMessage(res.data?.message || 'Application deleted successfully.');
        setTimeout(() => setSuccessMessage(''), 3500);
      } catch (fallbackErr) {
        alert(fallbackErr.response?.data?.message || err.response?.data?.message || 'Failed to delete application from database.');
      }
    }
  };

  // Helper functions for stage matching
  const isUnderReview = (a) =>
    !a.stage ||
    a.stage?.toLowerCase() === 'under review' ||
    a.displayStage?.toLowerCase() === 'under review';
  const isShortlisted = (a) =>
    Boolean(
      a.shortlisted ||
        a.isShortlisted ||
        a.stage?.toLowerCase()?.includes('shortlist') ||
        a.displayStage?.toLowerCase()?.includes('shortlist')
    );
  const isInterviewing = (a) =>
    Boolean(
      a.stage?.toLowerCase()?.includes('interview') ||
        a.interviewDate ||
        a.displayStage?.toLowerCase()?.includes('interview')
    );
  const isOffered = (a) =>
    Boolean(
      a.stage?.toLowerCase()?.includes('offer') ||
        a.displayStage?.toLowerCase()?.includes('offer') ||
        a.status?.toLowerCase()?.includes('offer') ||
        a.recommendation?.toLowerCase()?.includes('offer') ||
        a.recommendation?.toLowerCase() === 'strong hire' ||
        a.recommendation?.toLowerCase() === 'hire'
    );
  const isHired = (a) =>
    Boolean(
      a.stage?.toLowerCase()?.includes('hired') ||
        a.status?.toLowerCase()?.includes('hire') ||
        a.displayStage?.toLowerCase()?.includes('hire')
    );

  // Funnel counts from real DB applications
  const totalApplied = applications.length;
  const underReviewCount = applications.filter(isUnderReview).length;
  const shortlistedCount = applications.filter(isShortlisted).length;
  const interviewCount = applications.filter(isInterviewing).length;
  const offeredCount = applications.filter(isOffered).length;
  const hiredCount = applications.filter(isHired).length;

  const stageOptions = [
    { value: 'Under Review', label: 'Under Review' },
    { value: 'Shortlisted', label: 'Shortlisted' },
    { value: 'Interviewing', label: 'Interviewing' },
    { value: 'Offered', label: 'Offered' },
    { value: 'Hired', label: 'Hired' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  const filtered = applications.filter((app) => {
    if (!selectedStage || selectedStage === 'all') return true;
    const stage = (app.displayStage || app.stage || '').toLowerCase();
    const filter = selectedStage.toLowerCase();

    if (filter === 'under review') return isUnderReview(app);
    if (filter === 'shortlisted') return isShortlisted(app);
    if (filter === 'interviewing' || filter === 'interview') return isInterviewing(app);
    if (filter === 'offered') return isOffered(app);
    if (filter === 'hired') return isHired(app);

    return stage.includes(filter);
  });

  return (
    <div className="fade-in">
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Applications Pipeline</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Candidate Hiring Pipeline</h1>
          <p className="page-subtitle">
            Manage stage progressions, AI screening decisions, and track real-time applicant status.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="btn btn-secondary" to="/dashboard/candidates">
            <i className="bi bi-people"></i> Candidate Pool
          </Link>
          <Link className="btn btn-primary" to="/dashboard/jobs/new">
            <i className="bi bi-plus-lg"></i> Create Job Vacancy
          </Link>
        </div>
      </div>

      {successMessage && (
        <div className="alert alert-success" role="status" style={{ marginBottom: '16px' }}>
          <i className="bi bi-check-circle"></i> {successMessage}
        </div>
      )}

      {/* Pipeline Funnel Cards */}
      <div className="pipeline-funnel-grid" data-tour="pipeline-funnel" style={{ marginBottom: '28px' }}>
        <div
          className="funnel-stage-card funnel-card-interactive"
          onClick={() => handleStageFilter('')}
          style={{
            cursor: 'pointer',
            borderColor: !selectedStage ? 'var(--primary)' : undefined,
            boxShadow: !selectedStage ? '0 0 0 2px rgba(10, 102, 194, 0.25)' : undefined,
            transform: !selectedStage ? 'translateY(-2px)' : undefined,
          }}
        >
          <span className="funnel-count">{totalApplied}</span>
          <span className="funnel-label">All Applied</span>
        </div>

        <div
          className="funnel-stage-card funnel-card-interactive"
          onClick={() => handleStageFilter('Under Review')}
          style={{
            cursor: 'pointer',
            borderColor: selectedStage === 'Under Review' ? 'var(--primary)' : undefined,
            boxShadow: selectedStage === 'Under Review' ? '0 0 0 2px rgba(10, 102, 194, 0.25)' : undefined,
            transform: selectedStage === 'Under Review' ? 'translateY(-2px)' : undefined,
          }}
        >
          <span className="funnel-count">{underReviewCount}</span>
          <span className="funnel-label">Under Review</span>
        </div>

        <div
          className="funnel-stage-card funnel-card-interactive"
          onClick={() => handleStageFilter('Shortlisted')}
          style={{
            cursor: 'pointer',
            borderColor: selectedStage === 'Shortlisted' ? 'var(--primary)' : undefined,
            boxShadow: selectedStage === 'Shortlisted' ? '0 0 0 2px rgba(10, 102, 194, 0.25)' : undefined,
            transform: selectedStage === 'Shortlisted' ? 'translateY(-2px)' : undefined,
          }}
        >
          <span className="funnel-count">{shortlistedCount}</span>
          <span className="funnel-label">Shortlisted</span>
        </div>

        <div
          className="funnel-stage-card funnel-card-interactive"
          onClick={() => handleStageFilter('Interviewing')}
          style={{
            cursor: 'pointer',
            borderColor:
              selectedStage === 'Interviewing' || selectedStage === 'Interview' ? 'var(--primary)' : undefined,
            boxShadow:
              selectedStage === 'Interviewing' || selectedStage === 'Interview'
                ? '0 0 0 2px rgba(10, 102, 194, 0.25)'
                : undefined,
            transform:
              selectedStage === 'Interviewing' || selectedStage === 'Interview' ? 'translateY(-2px)' : undefined,
          }}
        >
          <span className="funnel-count">{interviewCount}</span>
          <span className="funnel-label">Interview</span>
        </div>

        <div
          className="funnel-stage-card funnel-card-interactive"
          onClick={() => handleStageFilter('Offered')}
          style={{
            cursor: 'pointer',
            borderColor: selectedStage === 'Offered' ? 'var(--primary)' : undefined,
            boxShadow: selectedStage === 'Offered' ? '0 0 0 2px rgba(10, 102, 194, 0.25)' : undefined,
            transform: selectedStage === 'Offered' ? 'translateY(-2px)' : undefined,
          }}
        >
          <span className="funnel-count">{offeredCount}</span>
          <span className="funnel-label">Offered</span>
        </div>

        <div
          className="funnel-stage-card funnel-card-interactive funnel-hired"
          onClick={() => handleStageFilter('Hired')}
          style={{
            cursor: 'pointer',
            boxShadow: selectedStage === 'Hired' ? '0 0 0 2px rgba(22, 163, 74, 0.35)' : undefined,
            transform: selectedStage === 'Hired' ? 'translateY(-2px)' : undefined,
          }}
        >
          <span className="funnel-count">{hiredCount}</span>
          <span className="funnel-label">Hired</span>
        </div>
      </div>

      {/* Applications Table Card */}
      <article className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              {selectedStage ? `${selectedStage} Applications` : 'All Pipeline Candidates'}
            </h2>
            <p className="card-description">
              Showing {filtered.length} active applicant records from the database.
            </p>
          </div>
          {selectedStage && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => handleStageFilter('')}
            >
              Reset Filter &times;
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '24px' }}>
            <SkeletonLoader type="card" count={3} />
          </div>
        ) : filtered.length > 0 ? (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Target Requisition</th>
                  <th>Applied On</th>
                  <th>Match Score</th>
                  <th>Stage Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cand) => (
                  <tr key={cand.id}>
                    <td>
                      <div className="candidate-cell">
                        <div className="candidate-cell-avatar">
                          {cand.candidateInitials ||
                            (cand.candidateName ? cand.candidateName.slice(0, 2).toUpperCase() : 'C')}
                        </div>
                        <div>
                          <strong className="candidate-name-link">{cand.candidateName}</strong>
                          <small className="candidate-email-muted">{cand.candidateEmail}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-primary">
                        {cand.targetJobRole || 'General Requisition'}
                      </span>
                    </td>
                    <td>{cand.formattedDate || 'Recent'}</td>
                    <td>
                      <span
                        className={`score-badge ${
                          cand.overallScore >= 75
                            ? 'score-high'
                            : cand.overallScore >= 50
                            ? 'score-mid'
                            : 'score-low'
                        }`}
                      >
                        {cand.overallScore || 0}%
                      </span>
                    </td>
                    <td style={{ minWidth: '170px' }}>
                      <CustomSelect
                        size="sm"
                        value={cand.displayStage || cand.stage || 'Under Review'}
                        onChange={(newVal) => handleStageChange(cand.id, newVal)}
                        options={stageOptions}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <Link to={`/dashboard/candidates/${cand.id}`} className="btn btn-secondary btn-sm">
                          Details
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)', padding: '4px 8px' }}
                          title="Delete Application Record"
                          onClick={(e) => handleDeleteApp(cand.id, cand.candidateName, e)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="bi-inbox"
            title="No Applications in this Stage"
            description={
              selectedStage
                ? `Currently no candidates are marked as "${selectedStage}". Choose another stage or view all.`
                : 'No candidate applications have been uploaded yet.'
            }
            actionLabel={selectedStage ? 'View All Applications' : 'Upload First Resume'}
            onAction={selectedStage ? () => handleStageFilter('') : null}
            actionLink={selectedStage ? null : '/dashboard/candidates'}
          />
        )}
      </article>
    </div>
  );
};

export default Applications;
