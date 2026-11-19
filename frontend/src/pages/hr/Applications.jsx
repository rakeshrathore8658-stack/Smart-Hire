import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import CustomSelect from '../../components/common/CustomSelect';
import ConfirmPopover from '../../components/common/ConfirmPopover';
import EmptyState from '../../components/common/EmptyState';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const Applications = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStage = searchParams.get('stage') || '';

  const [selectedStage, setSelectedStage] = useState(initialStage);
  const [selectedSource, setSelectedSource] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  const executeDeleteApp = async (id, name) => {
    try {
      const res = await api.delete(`/dashboard/applications/${id}`);
      setApplications((prev) => prev.filter((app) => app.id !== id));
      setSuccessMessage(res.data?.message || `Application for "${name || 'Candidate'}" removed successfully.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Delete application failed via dashboard endpoint:', err);
      try {
        const res = await api.delete(`/analysis/${id}`);
        setApplications((prev) => prev.filter((app) => app.id !== id));
        setSuccessMessage(res.data?.message || `Application for "${name || 'Candidate'}" removed successfully.`);
        setTimeout(() => setSuccessMessage(''), 4000);
      } catch (fallbackErr) {
        console.error('Delete fallback failed:', fallbackErr);
        setSuccessMessage(fallbackErr.response?.data?.message || err.response?.data?.message || 'Failed to delete application.');
        setTimeout(() => setSuccessMessage(''), 4000);
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
    { value: 'Under Review', label: 'Under Review', icon: <i className="bi bi-clock-history text-muted"></i> },
    { value: 'Shortlisted', label: 'Shortlisted', icon: <i className="bi bi-star-fill text-warning"></i> },
    { value: 'Interviewing', label: 'Interviewing', icon: <i className="bi bi-calendar-event text-primary"></i> },
    { value: 'Offered', label: 'Offered', icon: <i className="bi bi-envelope-paper-heart text-success"></i> },
    { value: 'Hired', label: 'Hired', icon: <i className="bi bi-award-fill text-success"></i> },
    { value: 'Rejected', label: 'Rejected', icon: <i className="bi bi-x-circle text-danger"></i> },
  ];

  const seekerCount = useMemo(
    () => applications.filter((c) => (c.applicationSource || '').toUpperCase() === 'JOB_SEEKER').length,
    [applications]
  );
  const hrScanCount = useMemo(
    () => applications.filter((c) => (c.applicationSource || '').toUpperCase() === 'HR_SCAN').length,
    [applications]
  );

  const sourceOptions = useMemo(
    () => [
      {
        value: '',
        label: 'All Sources',
        badge: String(applications.length),
        icon: <i className="bi bi-people-fill text-muted"></i>,
      },
      {
        value: 'JOB_SEEKER',
        label: 'Job Seeker Portal',
        badge: `${seekerCount}`,
        icon: <i className="bi bi-globe2 text-primary"></i>,
      },
      {
        value: 'HR_SCAN',
        label: 'Scanned by HR',
        badge: `${hrScanCount}`,
        icon: <i className="bi bi-person-workspace text-warning"></i>,
      },
    ],
    [applications.length, seekerCount, hrScanCount]
  );

  const filtered = applications.filter((app) => {
    if (selectedSource) {
      if ((app.applicationSource || '').toUpperCase() !== selectedSource.toUpperCase()) {
        return false;
      }
    }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '180px' }}>
              <CustomSelect
                size="sm"
                value={selectedSource}
                onChange={(val) => setSelectedSource(val)}
                options={sourceOptions}
                placeholder="All Sources"
              />
            </div>
            {(selectedStage || selectedSource) && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  handleStageFilter('');
                  setSelectedSource('');
                }}
              >
                Reset Filter &times;
              </button>
            )}
          </div>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                            <small className="candidate-email-muted">{cand.candidateEmail}</small>
                            {(cand.applicationSource || '').toUpperCase() === 'JOB_SEEKER' ? (
                              <span
                                className="badge"
                                title="Candidate applied directly via Job Seeker Portal"
                                style={{
                                  background: 'rgba(59, 130, 246, 0.12)',
                                  color: '#2563eb',
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                  borderRadius: '12px',
                                  fontSize: '0.65rem',
                                  padding: '1px 6px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <i className="bi bi-globe2"></i> Job Seeker
                              </span>
                            ) : (
                              <span
                                className="badge"
                                title="Resume scanned or uploaded by HR Recruiter"
                                style={{
                                  background: 'rgba(245, 158, 11, 0.12)',
                                  color: '#d97706',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  borderRadius: '12px',
                                  fontSize: '0.65rem',
                                  padding: '1px 6px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <i className="bi bi-person-workspace"></i> HR Scan
                              </span>
                            )}
                          </div>
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
                        <Link to={`/dashboard/applications/${cand.id}`} className="btn btn-secondary btn-sm" title="View Complete Application & Screening Responses">
                          Details
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)', padding: '4px 8px' }}
                          title="Delete Application Record"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteConfirm({
                              anchorEl: e.currentTarget,
                              id: cand.id,
                              name: cand.candidateName || 'Candidate',
                            });
                          }}
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

      {/* Popover Action Confirmation (Replaces native browser window.confirm) */}
      {deleteConfirm && (
        <ConfirmPopover
          anchorEl={deleteConfirm.anchorEl}
          title="Delete Application?"
          message={`Are you sure you want to permanently delete the application for "${deleteConfirm.name}" from database?`}
          confirmText="Delete"
          cancelText="Cancel"
          danger={true}
          onConfirm={() => {
            executeDeleteApp(deleteConfirm.id, deleteConfirm.name);
            setDeleteConfirm(null);
          }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

export default Applications;
