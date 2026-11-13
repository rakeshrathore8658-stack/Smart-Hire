import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import CustomSelect from '../../components/common/CustomSelect';
import ConfirmPopover from '../../components/common/ConfirmPopover';
import EmptyState from '../../components/common/EmptyState';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import { formatExactDateTime, formatTimeAgo } from '../../utils/timeAgo';

const ArchivedCandidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedScore, setSelectedScore] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [restoringId, setRestoringId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchArchived = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/candidates/archived');
      const list = Array.isArray(res.data) ? res.data : (res.data?.candidates || res.data?.applications || []);
      setCandidates(list);
    } catch (err) {
      console.error('Failed to load archived candidates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchived();
  }, [fetchArchived]);

  useRealtimeSync(fetchArchived);

  // Restore/Unarchive candidate back to active pool
  const handleRestore = async (id, name) => {
    setRestoringId(id);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await api.post(`/dashboard/candidates/${id}/unarchive`);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setActionSuccess(res.data?.message || `Candidate "${name || 'Candidate'}" has been successfully restored to the Active Pool.`);
      setTimeout(() => setActionSuccess(''), 4500);
    } catch (err) {
      console.error('Failed to unarchive candidate:', err);
      setActionError(err.response?.data?.message || 'Could not restore candidate. Please try again.');
      setTimeout(() => setActionError(''), 4500);
    } finally {
      setRestoringId(null);
    }
  };

  // Permanently delete candidate and resume from database
  const handlePermanentDelete = async (id, name) => {
    setDeletingId(id);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await api.delete(`/dashboard/candidates/${id}/permanent`);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setActionSuccess(res.data?.message || `Candidate "${name || 'Candidate'}" has been permanently deleted from database.`);
      setTimeout(() => setActionSuccess(''), 4500);
    } catch (err) {
      console.error('Failed to permanently delete candidate:', err);
      try {
        const res = await api.delete(`/dashboard/candidates/${id}?permanent=true`);
        setCandidates((prev) => prev.filter((c) => c.id !== id));
        setActionSuccess(res.data?.message || `Candidate "${name || 'Candidate'}" has been permanently deleted from database.`);
        setTimeout(() => setActionSuccess(''), 4500);
      } catch (fallbackErr) {
        setActionError(fallbackErr.response?.data?.message || err.response?.data?.message || 'Could not permanently delete candidate. Please try again.');
        setTimeout(() => setActionError(''), 4500);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const filterRoles = [
    { value: '', label: 'All Career Roles' },
    ...Array.from(new Set(candidates.map((c) => c.targetJobRole).filter(Boolean))).map((r) => ({
      value: r,
      label: r,
    })),
  ];

  const scoreOptions = [
    { value: '', label: 'All Match Scores', icon: <i className="bi bi-filter"></i> },
    { value: 'high', label: 'Top Match (85%+)', badge: '85%+', icon: <i className="bi bi-award-fill text-success"></i> },
    { value: 'mid', label: 'Moderate Match (65-84%)', badge: '65-84%', icon: <i className="bi bi-shield-check text-warning"></i> },
    { value: 'low', label: 'Low Match (<65%)', badge: '<65%', icon: <i className="bi bi-exclamation-circle text-danger"></i> },
  ];

  const filtered = candidates.filter((item) => {
    const text = `${item.candidateName || ''} ${item.candidateEmail || ''} ${(item.keySkills || []).join(' ')}`.toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase().trim());
    const matchesRole = !selectedRole || item.targetJobRole?.toLowerCase().includes(selectedRole.toLowerCase());
    const score = item.overallScore || 0;
    let matchesScore = true;
    if (selectedScore === 'high') matchesScore = score >= 85;
    else if (selectedScore === 'mid') matchesScore = score >= 65 && score < 85;
    else if (selectedScore === 'low') matchesScore = score < 65;

    return matchesSearch && matchesRole && matchesScore;
  });

  return (
    <div className="fade-in">
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <Link to="/dashboard/candidates">Candidate Pool</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Archived Candidates</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
              }}
            >
              <i className="bi bi-archive-fill"></i>
            </span>
            <h1 className="page-title" style={{ margin: 0 }}>
              Archived &amp; Recently Deleted Candidates
            </h1>
          </div>
          <p className="page-subtitle">
            Candidates removed from the active screening pool are safely preserved here. You can unarchive and restore them to the candidate pool at any time.
          </p>
        </div>

        <div className="page-header-actions">
          <Link className="btn btn-primary" to="/dashboard/candidates">
            <i className="bi bi-arrow-left"></i> Back to Candidate Pool
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <div className="alert alert-success" role="alert" style={{ marginBottom: '16px' }}>
          <i className="bi bi-check-circle"></i> {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '16px' }}>
          <i className="bi bi-exclamation-triangle"></i> {actionError}
        </div>
      )}

      {/* Search & Filters */}
      <article className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px', minWidth: 'min(260px, 100%)', position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            >
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search archived candidates by name, email, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: '1 1 auto' }}>
            <div style={{ minWidth: 'min(180px, 100%)', flex: '1 1 180px' }}>
              <CustomSelect
                value={selectedRole}
                onChange={(val) => setSelectedRole(val)}
                options={filterRoles}
                placeholder="Filter by Role"
              />
            </div>

            <div style={{ minWidth: 'min(180px, 100%)', flex: '1 1 180px' }}>
              <CustomSelect
                value={selectedScore}
                onChange={(val) => setSelectedScore(val)}
                options={scoreOptions}
                placeholder="Filter by ATS Score"
              />
            </div>
          </div>
        </div>
      </article>

      {/* Table */}
      <article className="card">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <SkeletonLoader count={5} type="table" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="table-wrapper">
            <table className="table" id="archivedCandidatesTable">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Target Job Role</th>
                  <th>ATS Match Score</th>
                  <th>Key Extracted Skills</th>
                  <th>Archived Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((candidate) => {
                  const score = candidate.overallScore || 0;
                  const scoreClass = score >= 80 ? 'badge-success' : score >= 60 ? 'badge-warning' : 'badge-danger';
                  const initials = candidate.candidateInitials || (candidate.candidateName ? candidate.candidateName.substring(0, 2).toUpperCase() : 'CA');

                  return (
                    <tr key={candidate.id}>
                      {/* Candidate Avatar & Name */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: 'var(--accent-light)',
                              color: 'var(--accent)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </span>
                          <div>
                            <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                              {candidate.candidateName || 'Candidate Profile'}
                            </strong>
                            <small style={{ color: 'var(--text-muted)' }}>
                              {candidate.candidateEmail || 'No email provided'}
                            </small>
                          </div>
                        </div>
                      </td>

                      {/* Job Role */}
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {candidate.targetJobRole || 'General Profile'}
                        </span>
                        {candidate.candidateExperience && (
                          <small style={{ display: 'block', color: 'var(--text-secondary)' }}>
                            Exp: {candidate.candidateExperience}
                          </small>
                        )}
                      </td>

                      {/* ATS Score */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`badge ${scoreClass}`} style={{ fontWeight: 700 }}>
                            {score}%
                          </span>
                          <small style={{ color: 'var(--text-muted)' }}>
                            {score >= 75 ? 'Strong' : score >= 50 ? 'Moderate' : 'Low'}
                          </small>
                        </div>
                      </td>

                      {/* Key Skills */}
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '240px' }}>
                          {(candidate.keySkills || candidate.matchedSkills || []).slice(0, 3).map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              style={{
                                fontSize: '0.72rem',
                                background: 'var(--bg-secondary)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {skill}
                            </span>
                          ))}
                          {(candidate.keySkills || candidate.matchedSkills || []).length > 3 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              +{(candidate.keySkills || candidate.matchedSkills || []).length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Archived Date */}
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {candidate.archivedAt ? formatTimeAgo(candidate.archivedAt) : (candidate.formattedDate || 'Recently')}
                        </span>
                        {candidate.archivedAt && (
                          <small style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {formatExactDateTime(candidate.archivedAt)}
                          </small>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <i className="bi bi-archive"></i> Archived
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-outline-success btn-sm"
                            disabled={restoringId === candidate.id || deletingId === candidate.id}
                            onClick={() => handleRestore(candidate.id, candidate.candidateName)}
                            style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            title="Restore candidate to active Candidate Pool"
                          >
                            <i className={`bi ${restoringId === candidate.id ? 'bi-hourglass-split' : 'bi-arrow-counterclockwise'}`}></i>
                            {restoringId === candidate.id ? 'Restoring...' : 'Unarchive / Restore'}
                          </button>

                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            disabled={restoringId === candidate.id || deletingId === candidate.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({
                                id: candidate.id,
                                name: candidate.candidateName || 'Candidate',
                                anchorEl: e.currentTarget,
                              });
                            }}
                            style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            title="Permanently delete candidate and resume from database"
                          >
                            <i className={`bi ${deletingId === candidate.id ? 'bi-hourglass-split' : 'bi-trash3-fill'}`}></i>
                            {deletingId === candidate.id ? 'Deleting...' : 'Permanently Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="bi-archive"
            title="No Archived Candidates"
            description={
              searchQuery || selectedRole || selectedScore
                ? 'No archived candidates match your current filter criteria.'
                : 'There are currently no archived or deleted candidates. Any candidate profiles removed from the Candidate Pool will be preserved here and can be restored anytime.'
            }
            actionLabel="View Candidate Pool"
            onAction={() => window.location.assign('/dashboard/candidates')}
          />
        )}
      </article>

      {/* Popover Action Confirmation for Permanent Deletion */}
      {deleteConfirm && (
        <ConfirmPopover
          anchorEl={deleteConfirm.anchorEl}
          title="Permanently Delete Candidate?"
          message={`Are you sure you want to permanently delete "${deleteConfirm.name}" and their resume from the database? This action cannot be undone.`}
          confirmText="Delete Permanently"
          cancelText="Cancel"
          danger={true}
          onConfirm={() => {
            handlePermanentDelete(deleteConfirm.id, deleteConfirm.name);
            setDeleteConfirm(null);
          }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

export default ArchivedCandidates;
