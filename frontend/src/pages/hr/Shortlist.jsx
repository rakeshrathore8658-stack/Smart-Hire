import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import EmptyState from '../../components/common/EmptyState';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import CandidateComparisonModal from '../../components/hr/CandidateComparisonModal';

export default function Shortlist() {
  const [shortlisted, setShortlisted] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState('');

  const fetchShortlist = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/shortlist');
      const list = Array.isArray(res.data) ? res.data : [];
      setShortlisted(list);

      // Clean up selectedIds if any selected candidate is no longer in the shortlist
      setSelectedIds((prev) => {
        const availableIds = new Set(list.map((c) => c.id));
        return prev.filter((id) => availableIds.has(id));
      });
    } catch (err) {
      console.error('Error loading shortlist:', err);
      setShortlisted([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShortlist();
  }, [fetchShortlist]);

  // Real-time synchronization
  useRealtimeSync(fetchShortlist);

  const handleCheckboxChange = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      } else {
        if (prev.length >= 3) {
          setAlertMsg('You can compare a maximum of 3 candidates at a time. Please deselect one first.');
          setTimeout(() => setAlertMsg(''), 4000);
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const handleQuickSelectTop = (count) => {
    const topIds = shortlisted.slice(0, count).map((c) => c.id);
    setSelectedIds(topIds);
    setAlertMsg(`Selected top ${topIds.length} candidate(s) for comparison.`);
    setTimeout(() => setAlertMsg(''), 3000);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleRemoveShortlist = async (id, e) => {
    e.preventDefault();
    try {
      await api.post(`/dashboard/candidates/${id}/shortlist`);
    } catch (err) {}
    setShortlisted((prev) => prev.filter((c) => c.id !== id));
    setSelectedIds((prev) => prev.filter((i) => i !== id));
    setAlertMsg('Candidate removed from shortlist.');
    setTimeout(() => setAlertMsg(''), 3000);
  };

  const handleRemoveFromCompare = (id) => {
    setSelectedIds((prev) => prev.filter((candId) => candId !== id));
  };

  return (
    <div className="fade-in">
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Shortlisted Candidates</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Top Shortlisted Talent</h1>
          <p className="page-subtitle">
            Compare side-by-side candidates with highest ATS match scores and fast-track to technical rounds.
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            id="compareSelectedBtn"
            data-tour="compare-selected-btn"
            disabled={selectedIds.length < 2}
            onClick={() => setShowCompareModal(true)}
            style={{
              opacity: selectedIds.length < 2 ? 0.65 : 1,
              cursor: selectedIds.length < 2 ? 'not-allowed' : 'pointer',
              fontWeight: 700,
            }}
            title={
              selectedIds.length < 2
                ? 'Select at least 2 candidates using the checkboxes below to generate side-by-side comparison'
                : 'Click to view enterprise side-by-side candidate comparison matrix'
            }
          >
            <i className="bi bi-columns-gap"></i> Compare Selected ({selectedIds.length})
          </button>
          <Link className="btn btn-primary" to="/dashboard/candidates">
            <i className="bi bi-people"></i> Candidate Pool
          </Link>
        </div>
      </div>

      {alertMsg && (
        <div className="alert alert-info" role="alert" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="bi bi-info-circle"></i>
          <span>{alertMsg}</span>
        </div>
      )}

      {/* Main Table Card */}
      <article className="card" data-tour="shortlist-table">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="card-title">Shortlisted Applications</h2>
            <p className="card-description">
              Select 2 or 3 candidates using the checkboxes below to generate a side-by-side comparison.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {shortlisted.length >= 2 && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleQuickSelectTop(2)}
                  style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                  title="Select top 2 candidates by score"
                >
                  <i className="bi bi-check2-square"></i> Select Top 2
                </button>
                {shortlisted.length >= 3 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleQuickSelectTop(3)}
                    style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                    title="Select top 3 candidates by score"
                  >
                    <i className="bi bi-check2-all"></i> Select Top 3
                  </button>
                )}
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleClearSelection}
                    style={{ fontSize: '0.78rem', padding: '4px 8px', color: 'var(--text-muted)' }}
                    title="Clear selected checkboxes"
                  >
                    Clear ({selectedIds.length})
                  </button>
                )}
              </div>
            )}
            <span className="badge badge-warning">
              <i className="bi bi-star-fill"></i> {shortlisted.length} Priority Candidates
            </span>
          </div>
        </div>

        {shortlisted.length === 1 && !loading && (
          <div style={{
            margin: '12px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#fff8f0',
            border: '1px solid #ffd8a8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="bi bi-lightbulb" style={{ color: '#e67700', fontSize: '1.2rem' }}></i>
              <span style={{ fontSize: '0.88rem', color: '#7a4100' }}>
                <strong>Comparison Tip:</strong> Side-by-side comparison requires at least 2 candidates. Shortlist one more candidate from the Candidate Pool to compare their ATS scores, technical skills, and experience head-to-head.
              </span>
            </div>
            <Link to="/dashboard/candidates" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>
              <i className="bi bi-star"></i> Browse Candidates
            </Link>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '24px' }}>
            <SkeletonLoader type="card" count={2} />
          </div>
        ) : shortlisted.length > 0 ? (
          <div className="table-wrapper">
            <table className="table" id="shortlistTable" data-tour="shortlist-table" style={{ minWidth: '720px' }}>
              <thead>
                <tr>
                  <th style={{ width: '48px', textAlign: 'center' }}>
                    <span className="sr-only">Select</span>
                    <i className="bi bi-check-square" title="Checkbox selection (2 or 3 candidates)"></i>
                  </th>
                  <th>Candidate</th>
                  <th>Target Requisition</th>
                  <th>Overall Match</th>
                  <th>Experience</th>
                  <th>Core Skills</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {shortlisted.map((cand) => {
                  const isChecked = selectedIds.includes(cand.id);
                  return (
                    <tr
                      key={cand.id}
                      style={{
                        backgroundColor: isChecked ? 'rgba(10, 102, 194, 0.05)' : 'inherit',
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCheckboxChange(cand.id)}
                          aria-label={`Select ${cand.candidateName} for comparison`}
                          style={{
                            cursor: 'pointer',
                            width: '20px',
                            height: '20px',
                            minWidth: '20px',
                            minHeight: '20px',
                            accentColor: 'var(--primary)',
                          }}
                        />
                      </td>
                      <td>
                        <div className="candidate-cell">
                          <div
                            className="candidate-cell-avatar"
                            style={{
                              backgroundColor: isChecked ? 'var(--primary)' : undefined,
                              color: isChecked ? '#fff' : undefined,
                            }}
                          >
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
                        <span className="badge badge-primary">{cand.targetJobRole || 'Software Role'}</span>
                      </td>
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
                      <td>{cand.candidateExperience || '1-3 yrs'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '240px' }}>
                          {(cand.keySkills || cand.matchedSkills || []).slice(0, 3).map((sk, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {typeof sk === 'string' ? sk : sk.skill || 'Skill'}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <Link
                            to={`/dashboard/feedback?candId=${cand.id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            <i className="bi bi-calendar2-week"></i> Interview
                          </Link>
                          <Link
                            to={`/dashboard/candidates/${cand.id}`}
                            className="btn btn-ghost btn-sm"
                          >
                            Profile
                          </Link>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            title="Remove from Shortlist"
                            style={{ color: 'var(--danger)' }}
                            onClick={(e) => handleRemoveShortlist(cand.id, e)}
                          >
                            <i className="bi bi-trash"></i>
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
            icon="bi-star"
            title="No Candidates Shortlisted Yet"
            description="Star candidates in the Candidate Pool to fast-track them and compare their skills here."
            actionLabel="Browse Candidate Pool"
            actionLink="/dashboard/candidates"
          />
        )}
      </article>

      {/* Enterprise Candidate Comparison Modal */}
      {showCompareModal && (
        <CandidateComparisonModal
          candidateIds={selectedIds}
          onClose={() => setShowCompareModal(false)}
          onRemoveCandidate={handleRemoveFromCompare}
        />
      )}
    </div>
  );
}
