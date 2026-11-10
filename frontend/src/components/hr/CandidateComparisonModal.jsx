import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import SkeletonLoader from '../common/SkeletonLoader';

/**
 * CandidateComparisonModal
 * Enterprise-grade side-by-side comparison interface for 2 or 3 shortlisted candidates.
 * Retrieves real evaluation, skills, and ATS data from Spring Boot REST API.
 */
export default function CandidateComparisonModal({ candidateIds, onClose, onRemoveCandidate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' or 'cards'
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'skills', 'experience', 'projects', 'education'

  // Interview Scheduling State
  const [scheduleCandidate, setScheduleCandidate] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleForm, setScheduleForm] = useState({
    interviewRound: 'Technical Round 1',
    interviewDate: '',
    interviewTime: '11:00',
    interviewMode: 'Online',
    meetingPlatform: 'Google Meet',
    meetingLink: 'https://meet.google.com/smarthire-interview',
    interviewLocation: '',
    interviewerName: 'Alex Chen (Principal Architect)',
    notes: '',
  });

  const handleOpenSchedule = (cand) => {
    setScheduleCandidate(cand);
    setScheduleError('');
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const isAlreadyScheduled = cand.interviewStatus === 'SCHEDULED' || cand.interviewStatus === 'RESCHEDULED';

    setScheduleForm({
      interviewRound: cand.interviewRound || 'Technical Round 1',
      interviewDate: cand.interviewDate ? cand.interviewDate.split('T')[0] : tomorrow,
      interviewTime: cand.interviewDate && cand.interviewDate.includes('T') ? cand.interviewDate.split('T')[1].substring(0, 5) : '11:00',
      interviewMode: cand.interviewLocation ? 'Offline' : 'Online',
      meetingPlatform: cand.interviewType || 'Google Meet',
      meetingLink: cand.meetingLink || 'https://meet.google.com/smarthire-interview',
      interviewLocation: cand.interviewLocation || '',
      interviewerName: cand.interviewerName || 'Alex Chen (Principal Architect)',
      notes: isAlreadyScheduled
        ? 'Rescheduling interview slot for technical assessment round.'
        : 'Please ensure your camera is turned on and have an IDE open for coding evaluation.',
    });
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleCandidate) return;

    setScheduling(true);
    setScheduleError('');

    try {
      const fullIso = `${scheduleForm.interviewDate}T${scheduleForm.interviewTime}:00`;
      const isResched = scheduleCandidate.interviewStatus === 'SCHEDULED' || scheduleCandidate.interviewStatus === 'RESCHEDULED';

      await api.post('/dashboard/interviews/schedule', {
        candidateId: scheduleCandidate.id,
        interviewRound: scheduleForm.interviewRound,
        interviewDate: fullIso,
        interviewTime: scheduleForm.interviewTime,
        interviewMode: scheduleForm.interviewMode,
        meetingPlatform: scheduleForm.meetingPlatform,
        meetingLink: scheduleForm.interviewMode === 'Online' ? scheduleForm.meetingLink : '',
        interviewLocation: scheduleForm.interviewMode === 'Offline' ? scheduleForm.interviewLocation : '',
        interviewerName: scheduleForm.interviewerName,
        notes: scheduleForm.notes,
        isReschedule: isResched,
      });

      // Format date for display
      const dateObj = new Date(fullIso);
      const formattedDateStr = `${dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}, ${scheduleForm.interviewTime}`;

      // Update candidate in local comparison state immediately
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          candidates: prev.candidates.map((c) => {
            if (c.id === scheduleCandidate.id) {
              return {
                ...c,
                interviewStatus: isResched ? 'RESCHEDULED' : 'SCHEDULED',
                interviewRound: scheduleForm.interviewRound,
                interviewDate: fullIso,
                formattedInterviewDate: formattedDateStr,
                meetingLink: scheduleForm.interviewMode === 'Online' ? scheduleForm.meetingLink : '',
                interviewLocation: scheduleForm.interviewMode === 'Offline' ? scheduleForm.interviewLocation : '',
                interviewerName: scheduleForm.interviewerName,
                interviewType: scheduleForm.interviewMode === 'Online' ? scheduleForm.meetingPlatform : 'In-Person',
              };
            }
            return c;
          }),
        };
      });

      setScheduleSuccess(`Interview successfully ${isResched ? 'rescheduled' : 'scheduled'} for ${scheduleCandidate.candidateName}! Candidate calendar updated and real-time notification dispatched.`);
      setScheduleCandidate(null);
      setTimeout(() => setScheduleSuccess(''), 6000);
    } catch (err) {
      console.error('Failed to schedule interview:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to schedule interview. Please try again.';
      setScheduleError(msg);
    } finally {
      setScheduling(false);
    }
  };

  const fetchComparison = useCallback(async () => {
    if (!candidateIds || candidateIds.length < 2) {
      setError('Please select at least 2 candidates for comparison.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Primary endpoint POST /candidates/compare, fallback to /dashboard/compare and GET
      let res;
      try {
        res = await api.post('/candidates/compare', { candidateIds });
      } catch (err1) {
        try {
          res = await api.post('/dashboard/compare', { candidateIds });
        } catch (err2) {
          try {
            res = await api.get(`/candidates/compare?ids=${candidateIds.join(',')}`);
          } catch (err3) {
            throw err1; // Throw original error with message
          }
        }
      }

      if (res.data) {
        // Backend returns CandidateCompareResponseDTO
        setData(res.data);
      } else {
        throw new Error('Empty response received from comparison engine.');
      }
    } catch (err) {
      console.error('Failed to fetch candidate comparison:', err);
      const msg = err.response?.data?.message || err.message || 'Unable to retrieve comparison data from server.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [candidateIds]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const candidates = data?.candidates || [];
  const highestScore = data?.highestScore || 0;
  const commonSkills = data?.commonSkills || [];
  const highlights = data?.summaryHighlights || [];

  const handlePrint = () => {
    window.print();
  };

  const handleRemoveOne = (id) => {
    if (candidates.length <= 2) {
      if (window.confirm('Removing this candidate will leave only 1 candidate, closing the comparison. Continue?')) {
        onRemoveCandidate(id);
        onClose();
      }
      return;
    }
    onRemoveCandidate(id);
  };

  return (
    <div
      className="modal-overlay is-open comparison-modal-overlay"
      style={{
        display: 'flex',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 99999,
        padding: 'clamp(6px, 2vw, 20px)',
        alignItems: 'center',
        justifyContent: 'center',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        className="modal-dialog comparison-modal-dialog"
        style={{
          maxWidth: '1240px',
          width: '100%',
          maxHeight: '96vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header Bar */}
        <div
          className="modal-header"
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary) 0%, #1e40af 100%)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontSize: '1.2rem',
              }}
            >
              <i className="bi bi-columns-gap"></i>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="modal-title" style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800 }}>
                  Candidate Comparison Matrix
                </h3>
                <span
                  className="badge badge-primary"
                  style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px' }}
                >
                  {data?.targetJobRole || 'Target Requisition'}
                </span>
                <span
                  className="badge"
                  style={{
                    fontSize: '0.72rem',
                    background: 'var(--bg-tertiary, #e2e8f0)',
                    color: 'var(--text-secondary)',
                    borderRadius: '12px',
                    padding: '3px 8px',
                  }}
                >
                  {candidates.length} Candidates
                </span>
              </div>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                Objective head-to-head evaluation of verified skills, ATS matching scores, and credentials.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* View Mode Toggle */}
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`btn btn-sm ${viewMode === 'matrix' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '6px' }}
                title="Matrix Grid View"
              >
                <i className="bi bi-table"></i> Matrix
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '6px' }}
                title="Comparative Cards View"
              >
                <i className="bi bi-grid"></i> Cards
              </button>
            </div>

            {/* Print Action */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrint}
              title="Print or export comparison report"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <i className="bi bi-printer"></i> Print
            </button>

            {/* Close Button */}
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="Close comparison modal"
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div
          className="modal-body"
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1,
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          {loading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div
                className="spinner"
                style={{
                  width: '42px',
                  height: '42px',
                  border: '3px solid var(--border-color)',
                  borderTopColor: 'var(--primary)',
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700 }}>
                Synthesizing Candidate Deep Intelligence...
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Comparing ATS score breakdowns, common competencies, unique differentiators, and gap matrices.
              </p>
              <div style={{ maxWidth: '600px', margin: '24px auto 0' }}>
                <SkeletonLoader type="table" count={3} />
              </div>
            </div>
          ) : error ? (
            <div
              className="alert alert-danger"
              style={{
                padding: '24px',
                textAlign: 'center',
                borderRadius: '12px',
                margin: '20px auto',
                maxWidth: '600px',
              }}
            >
              <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}></i>
              <h4 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 700 }}>Comparison Failed</h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.85rem' }}>{error}</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={fetchComparison}>
                <i className="bi bi-arrow-clockwise"></i> Retry Comparison
              </button>
            </div>
          ) : candidates.length < 2 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <i className="bi bi-info-circle" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginBottom: '12px' }}></i>
              <h4 style={{ margin: '0 0 8px', fontWeight: 700 }}>Insufficient Candidates</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 16px' }}>
                At least 2 candidates are required to generate a side-by-side comparison. Please select additional candidates from the shortlist.
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
                Back to Shortlist
              </button>
            </div>
          ) : (
            <div>
              {/* Interview Scheduled Toast Alert */}
              {scheduleSuccess && (
                <div
                  className="alert alert-success"
                  style={{
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 18px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#065f46',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                  }}
                >
                  <i className="bi bi-check-circle-fill" style={{ fontSize: '1.25rem', color: '#10b981', flexShrink: 0 }}></i>
                  <span style={{ flex: 1 }}>{scheduleSuccess}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setScheduleSuccess('')}
                    style={{ padding: '2px 8px', fontSize: '1.1rem', color: '#065f46', cursor: 'pointer' }}
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* Objective AI Insights Banner */}
              {highlights.length > 0 && (
                <div
                  style={{
                    backgroundColor: 'rgba(10, 102, 194, 0.05)',
                    border: '1px solid rgba(10, 102, 194, 0.2)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--primary)',
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '1rem',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <i className="bi bi-lightbulb"></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h5
                      style={{
                        margin: '0 0 6px',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>Objective Comparative Insights</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          background: 'rgba(10, 102, 194, 0.15)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                      >
                        AI Synthesized
                      </span>
                    </h5>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '18px',
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                        lineHeight: '1.5',
                      }}
                    >
                      {highlights.map((h, idx) => (
                        <li key={idx} style={{ marginBottom: '2px' }}>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Shared Core Skills Strip */}
              {commonSkills.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#16a34a',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <i className="bi bi-check-all"></i> Shared Competencies ({commonSkills.length}):
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {commonSkills.map((sk, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.74rem',
                          padding: '2px 8px',
                          background: 'rgba(34, 197, 94, 0.12)',
                          color: '#16a34a',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          borderRadius: '6px',
                          fontWeight: 600,
                        }}
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* View Switch Rendering */}
              {viewMode === 'matrix' ? (
                /* ---------------- TABULAR MATRIX VIEW ---------------- */
                <div
                  className="table-wrapper comparison-table-wrapper"
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  <table
                    className="table comparison-table"
                    style={{
                      width: '100%',
                      minWidth: candidates.length >= 3 ? '850px' : '650px',
                      borderCollapse: 'collapse',
                    }}
                  >
                    {/* Header Columns */}
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)' }}>
                        <th
                          style={{
                            width: '22%',
                            padding: '16px',
                            borderBottom: '2px solid var(--border-color)',
                            verticalAlign: 'bottom',
                          }}
                        >
                          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                            Evaluation Criteria
                          </span>
                        </th>
                        {candidates.map((c) => {
                          const isTop = c.isHighestScore || c.overallScore === highestScore;
                          return (
                            <th
                              key={c.id}
                              style={{
                                width: `${78 / candidates.length}%`,
                                padding: '16px',
                                borderBottom: '2px solid var(--border-color)',
                                textAlign: 'center',
                                backgroundColor: isTop ? 'rgba(255, 121, 0, 0.03)' : 'inherit',
                                position: 'relative',
                              }}
                            >
                              {/* Top score banner */}
                              {isTop && (
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    background: 'var(--accent, #ff7900)',
                                    color: '#fff',
                                    borderRadius: '10px',
                                    marginBottom: '8px',
                                  }}
                                >
                                  <i className="bi bi-trophy-fill"></i> Top Match
                                </div>
                              )}

                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <div
                                  className="candidate-cell-avatar"
                                  style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '50%',
                                    background: isTop ? 'var(--accent, #ff7900)' : 'var(--primary)',
                                    color: '#fff',
                                    fontWeight: 800,
                                    fontSize: '1.15rem',
                                    margin: '0 auto 8px',
                                    display: 'grid',
                                    placeItems: 'center',
                                    boxShadow: isTop ? '0 0 12px rgba(255, 121, 0, 0.35)' : 'none',
                                  }}
                                >
                                  {c.candidateInitials || 'C'}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOne(c.id)}
                                  title="Remove from comparison"
                                  style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-6px',
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    display: 'grid',
                                    placeItems: 'center',
                                    fontSize: '0.65rem',
                                    cursor: 'pointer',
                                    color: 'var(--danger)',
                                  }}
                                  aria-label={`Remove ${c.candidateName}`}
                                >
                                  <i className="bi bi-x-lg"></i>
                                </button>
                              </div>

                              <h4 style={{ margin: '0 0 2px', fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {c.candidateName}
                              </h4>
                              <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {c.candidateEmail}
                              </p>

                              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span
                                  className={`score-badge ${
                                    c.overallScore >= 75 ? 'score-high' : c.overallScore >= 50 ? 'score-mid' : 'score-low'
                                  }`}
                                  style={{ fontSize: '0.85rem', padding: '4px 10px' }}
                                >
                                  {c.overallScore}% Match
                                </span>
                                <span
                                  className="badge badge-primary"
                                  style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                                >
                                  {c.displayStage || c.stage || 'Shortlisted'}
                                </span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody>
                      {/* 1. Target Requisition */}
                      <tr>
                        <th style={{ background: 'var(--bg-secondary)', fontWeight: 700, padding: '12px 16px' }}>
                          Target Requisition
                        </th>
                        {candidates.map((c) => (
                          <td key={c.id} style={{ textAlign: 'center', padding: '12px 16px' }}>
                            <strong style={{ color: 'var(--primary)', fontSize: '0.88rem' }}>
                              {c.targetJobRole}
                            </strong>
                          </td>
                        ))}
                      </tr>

                      {/* 2. Total Experience */}
                      <tr>
                        <th style={{ background: 'var(--bg-secondary)', fontWeight: 700, padding: '12px 16px' }}>
                          Verified Experience
                        </th>
                        {candidates.map((c) => (
                          <td key={c.id} style={{ textAlign: 'center', padding: '12px 16px' }}>
                            <span
                              style={{
                                fontSize: '0.92rem',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                              }}
                            >
                              {c.totalExperience || '1-3 Years'}
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* 3. ATS Category Breakdown */}
                      <tr>
                        <th style={{ background: 'var(--bg-secondary)', fontWeight: 700, padding: '12px 16px' }}>
                          Category Score Breakdown
                        </th>
                        {candidates.map((c) => (
                          <td key={c.id} style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '240px', margin: '0 auto' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Skills Alignment</span>
                                <strong>{c.skillsScore || 0}%</strong>
                              </div>
                              <div className="progress-bar-container" style={{ height: '6px', background: 'var(--bg-tertiary, #e2e8f0)', borderRadius: '3px' }}>
                                <div style={{ width: `${c.skillsScore || 0}%`, height: '100%', background: 'var(--primary)', borderRadius: '3px' }} />
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Experience Depth</span>
                                <strong>{c.experienceScore || 0}%</strong>
                              </div>
                              <div className="progress-bar-container" style={{ height: '6px', background: 'var(--bg-tertiary, #e2e8f0)', borderRadius: '3px' }}>
                                <div style={{ width: `${c.experienceScore || 0}%`, height: '100%', background: '#16a34a', borderRadius: '3px' }} />
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Formatting & Readability</span>
                                <strong>{c.formattingScore || 0}%</strong>
                              </div>
                              <div className="progress-bar-container" style={{ height: '6px', background: 'var(--bg-tertiary, #e2e8f0)', borderRadius: '3px' }}>
                                <div style={{ width: `${c.formattingScore || 0}%`, height: '100%', background: '#f59e0b', borderRadius: '3px' }} />
                              </div>
                            </div>
                          </td>
                        ))}
                      </tr>

                      {/* 4. Unique Skills (Differentiator) */}
                      <tr style={{ background: 'rgba(124, 58, 237, 0.02)' }}>
                        <th style={{ background: 'var(--bg-secondary)', fontWeight: 700, padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="bi bi-stars" style={{ color: '#7c3aed' }}></i>
                            <span>Unique Differentiators</span>
                          </div>
                          <small style={{ fontWeight: 400, color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>
                            Skills exclusive to this candidate
                          </small>
                        </th>
                        {candidates.map((c) => (
                          <td key={c.id} style={{ textAlign: 'center', padding: '12px 16px' }}>
                            {c.uniqueSkills && c.uniqueSkills.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>
                                {c.uniqueSkills.map((sk, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      fontSize: '0.73rem',
                                      padding: '3px 8px',
                                      background: 'rgba(124, 58, 237, 0.1)',
                                      color: '#7c3aed',
                                      border: '1px solid rgba(124, 58, 237, 0.25)',
                                      borderRadius: '6px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    <i className="bi bi-star-fill" style={{ fontSize: '0.65rem', marginRight: '3px' }}></i>
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>None exclusive</span>
                            )}
                          </td>
                        ))}
                      </tr>

                      {/* 5. Core Technical Skills */}
                      <tr>
                        <th style={{ background: 'var(--bg-secondary)', fontWeight: 700, padding: '12px 16px' }}>
                          Core Technical Skills
                        </th>
                        {candidates.map((c) => (
                          <td key={c.id} style={{ textAlign: 'center', padding: '12px 16px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                              {(c.matchedSkills || c.technicalSkills || []).slice(0, 10).map((sk, idx) => {
                                const isCommon = commonSkills.includes(sk);
                                return (
                                  <span
                                    key={idx}
                                    style={{
                                      fontSize: '0.72rem',
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      background: isCommon ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-secondary)',
                                      color: isCommon ? '#16a34a' : 'var(--text-primary)',
                                      border: `1px solid ${isCommon ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-color)'}`,
                                      fontWeight: isCommon ? 600 : 500,
                                    }}
                                  >
                                    {sk}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                        ))}
                      </tr>

                      {/* 6. Missing Requisition Skills */}
                      <tr>
                        <th style={{ background: 'var(--bg-secondary)', fontWeight: 700, padding: '12px 16px' }}>
                          Missing Requisition Skills
                        </th>
                        {candidates.map((c) => (
                          <td key={c.id} style={{ textAlign: 'center', padding: '12px 16px' }}>
                            {c.missingSkills && c.missingSkills.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                                {c.missingSkills.map((m, idx) => {
                                  const name = typeof m === 'string' ? m : m.skill || 'Missing Skill';
                                  const isHigh = typeof m === 'object' && m.priority === 'HIGH';
                                  return (
                                    <span
                                      key={idx}
                                      style={{
                                        fontSize: '0.72rem',
                                        padding: '2px 7px',
                                        borderRadius: '4px',
                                        background: isHigh ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                        color: isHigh ? 'var(--danger)' : '#d97706',
                                        border: `1px solid ${isHigh ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                        fontWeight: 500,
                                      }}
                                    >
                                      {name}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#16a34a' }}>
                                <i className="bi bi-check-circle"></i> No critical gaps
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>

                      {/* 7. Key Projects */}
                      <tr>
                        <th style={{ background: 'var(--bg-secondary)', fontWeight: 700, padding: '12px 16px' }}>
                          Projects & Depth
                        </th>
                        {candidates.map((c) => (
                          <td key={c.id} style={{ padding: '12px 16px' }}>
                            {c.projects && c.projects.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                {c.projects.slice(0, 3).map((p, idx) => (
                                  <li key={idx} style={{ marginBottom: '4px' }}>
                                    {p}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', textAlign: 'center' }}>
                                No specific projects extracted
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>

                      {/* 8. Education & Certifications */}
                      <tr>
                        <th style={{ background: 'var(--bg-secondary)', fontWeight: 700, padding: '12px 16px' }}>
                          Education & Credentials
                        </th>
                        {candidates.map((c) => (
                          <td key={c.id} style={{ textAlign: 'center', padding: '12px 16px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                              {c.education && c.education.length > 0 ? (
                                <div style={{ marginBottom: '4px' }}>
                                  <strong>{c.education[0]}</strong>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Degree in Computer Science / IT</span>
                              )}
                              {c.certifications && c.certifications.length > 0 && (
                                <div style={{ marginTop: '4px' }}>
                                  {c.certifications.slice(0, 2).map((cert, idx) => (
                                    <span
                                      key={idx}
                                      className="badge badge-neutral"
                                      style={{ fontSize: '0.7rem', margin: '2px' }}
                                    >
                                      {cert}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>

                      {/* 9. Interview Status */}
                      <tr>
                        <th style={{ background: 'var(--bg-secondary)', fontWeight: 700, padding: '12px 16px' }}>
                          Interview Status
                        </th>
                        {candidates.map((c) => {
                          const isScheduled = c.interviewStatus === 'SCHEDULED' || c.interviewStatus === 'RESCHEDULED' || c.interviewStatus === 'COMPLETED';
                          return (
                            <td key={c.id} style={{ textAlign: 'center', padding: '12px 16px' }}>
                              {isScheduled ? (
                                <div>
                                  <span
                                    className="badge badge-success"
                                    style={{
                                      fontSize: '0.74rem',
                                      padding: '4px 8px',
                                      marginBottom: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <i className="bi bi-calendar-check-fill"></i> {c.interviewRound || 'Technical Round'} ({c.interviewStatus})
                                  </span>
                                  <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.74rem', fontWeight: 600 }}>
                                    {c.formattedInterviewDate || 'Upcoming Schedule'}
                                  </small>
                                  {c.meetingLink && (
                                    <a
                                      href={c.meetingLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        fontSize: '0.7rem',
                                        color: 'var(--primary)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        marginTop: '3px',
                                        textDecoration: 'none',
                                        fontWeight: 600,
                                      }}
                                    >
                                      <i className="bi bi-camera-video"></i> Join Link
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  Not scheduled yet
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* 10. Actions Row */}
                      <tr style={{ background: 'var(--bg-secondary)' }}>
                        <th style={{ padding: '16px', fontWeight: 700 }}>Decision Actions</th>
                        {candidates.map((c) => {
                          const isScheduled = c.interviewStatus === 'SCHEDULED' || c.interviewStatus === 'RESCHEDULED' || c.interviewStatus === 'COMPLETED';
                          return (
                            <td key={c.id} style={{ textAlign: 'center', padding: '16px' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenSchedule(c)}
                                  className="btn btn-primary btn-sm"
                                  style={{
                                    fontSize: '0.78rem',
                                    padding: '6px 14px',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                  }}
                                  title={isScheduled ? 'Reschedule candidate interview round' : 'Schedule candidate interview'}
                                >
                                  <i className={`bi ${isScheduled ? 'bi-calendar-check' : 'bi-calendar-plus'}`}></i>
                                  <span>{isScheduled ? 'Reschedule' : 'Schedule Interview'}</span>
                                </button>
                                <Link
                                  to={`/dashboard/candidates/${c.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                                  title="Open candidate profile in new tab"
                                >
                                  <i className="bi bi-person"></i> Profile
                                </Link>
                                {isScheduled && (
                                  <Link
                                    to={`/dashboard/feedback?candId=${c.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-ghost btn-sm"
                                    style={{ fontSize: '0.78rem', padding: '6px 10px', color: 'var(--text-secondary)' }}
                                    title="Scorecard & Feedback"
                                  >
                                    <i className="bi bi-clipboard-check"></i> Feedback
                                  </Link>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                /* ---------------- COMPARATIVE CARDS VIEW ---------------- */
                <div
                  className="comparison-cards-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 300px), 1fr))`,
                    gap: '20px',
                  }}
                >
                  {candidates.map((c) => {
                    const isTop = c.isHighestScore || c.overallScore === highestScore;
                    return (
                      <article
                        key={c.id}
                        className="card"
                        style={{
                          border: isTop ? '2px solid var(--accent, #ff7900)' : '1px solid var(--border-color)',
                          boxShadow: isTop ? '0 10px 25px -5px rgba(255, 121, 0, 0.15)' : 'var(--shadow-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative',
                        }}
                      >
                        {isTop && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '-12px',
                              right: '16px',
                              background: 'var(--accent, #ff7900)',
                              color: '#fff',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 10px',
                              borderRadius: '10px',
                              boxShadow: '0 2px 6px rgba(255, 121, 0, 0.4)',
                            }}
                          >
                            <i className="bi bi-trophy-fill"></i> Highest Match Score
                          </div>
                        )}

                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                            <div
                              className="candidate-cell-avatar"
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: isTop ? 'var(--accent, #ff7900)' : 'var(--primary)',
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: '1.1rem',
                                display: 'grid',
                                placeItems: 'center',
                              }}
                            >
                              {c.candidateInitials || 'C'}
                            </div>
                            <div>
                              <h4 style={{ margin: '0 0 2px', fontSize: '1.05rem', fontWeight: 800 }}>{c.candidateName}</h4>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.candidateEmail}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--danger)', padding: '4px' }}
                            title="Remove from comparison"
                            onClick={() => handleRemoveOne(c.id)}
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </div>

                        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Score & Requisition */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px' }}>
                            <div>
                              <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>ATS MATCH</small>
                              <strong style={{ fontSize: '1.3rem', color: isTop ? 'var(--accent, #ff7900)' : 'var(--primary)' }}>
                                {c.overallScore}%
                              </strong>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>EXPERIENCE</small>
                              <strong style={{ fontSize: '0.95rem' }}>{c.totalExperience || '1-3 Yrs'}</strong>
                            </div>
                          </div>

                          {/* Unique Skills */}
                          {c.uniqueSkills && c.uniqueSkills.length > 0 && (
                            <div>
                              <small style={{ fontWeight: 700, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                                <i className="bi bi-stars"></i> Unique Competencies:
                              </small>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {c.uniqueSkills.map((sk, idx) => (
                                  <span key={idx} style={{ fontSize: '0.72rem', padding: '2px 7px', background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', borderRadius: '4px', fontWeight: 600 }}>
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Core Skills */}
                          <div>
                            <small style={{ fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                              Top Evidenced Skills:
                            </small>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {(c.matchedSkills || c.technicalSkills || []).slice(0, 8).map((sk, idx) => (
                                <span key={idx} style={{ fontSize: '0.72rem', padding: '2px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                                  {sk}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Missing Skills */}
                          {c.missingSkills && c.missingSkills.length > 0 && (
                            <div>
                              <small style={{ fontWeight: 700, color: 'var(--danger)', display: 'block', marginBottom: '6px' }}>
                                Requisition Skill Gaps:
                              </small>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {c.missingSkills.map((m, idx) => (
                                  <span key={idx} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '4px' }}>
                                    {typeof m === 'string' ? m : m.skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Interview Status in Card */}
                        <div
                          style={{
                            margin: '0 20px 12px',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background:
                              c.interviewStatus === 'SCHEDULED' || c.interviewStatus === 'RESCHEDULED'
                                ? 'rgba(16, 185, 129, 0.08)'
                                : 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <small style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Interview Status:</small>
                          {c.interviewStatus === 'SCHEDULED' || c.interviewStatus === 'RESCHEDULED' ? (
                            <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                              <i className="bi bi-calendar-check-fill"></i> {c.interviewRound || 'Scheduled'} ({c.formattedInterviewDate || 'Upcoming'})
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Not Scheduled</span>
                          )}
                        </div>

                        <div
                          style={{
                            padding: '16px 20px',
                            borderTop: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            display: 'flex',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenSchedule(c)}
                            className="btn btn-primary btn-sm"
                            style={{
                              flex: 1,
                              minWidth: '130px',
                              textAlign: 'center',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            <i
                              className={`bi ${
                                c.interviewStatus === 'SCHEDULED' || c.interviewStatus === 'RESCHEDULED'
                                  ? 'bi-calendar-check'
                                  : 'bi-calendar-plus'
                              }`}
                            ></i>
                            <span>
                              {c.interviewStatus === 'SCHEDULED' || c.interviewStatus === 'RESCHEDULED'
                                ? 'Reschedule'
                                : 'Schedule Interview'}
                            </span>
                          </button>
                          <Link
                            to={`/dashboard/candidates/${c.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ minWidth: '70px', textAlign: 'center' }}
                          >
                            Profile
                          </Link>
                          {(c.interviewStatus === 'SCHEDULED' ||
                            c.interviewStatus === 'RESCHEDULED' ||
                            c.interviewStatus === 'COMPLETED') && (
                            <Link
                              to={`/dashboard/feedback?candId=${c.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}
                              title="Interview Feedback"
                            >
                              <i className="bi bi-clipboard-check"></i>
                            </Link>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Showing comparison of <strong>{candidates.length}</strong> shortlisted profiles &bull; Scores verified by ATS engine.
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Back to Shortlist
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- SCHEDULE INTERVIEW MODAL POPUP ----------------- */}
      {scheduleCandidate && (
        <div
          className="modal-overlay is-open"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => !scheduling && setScheduleCandidate(null)}
        >
          <div
            className="modal-dialog card"
            style={{
              maxWidth: '560px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: 'var(--bg-primary)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '12px',
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.2rem',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <i className="bi bi-calendar-plus" style={{ color: 'var(--accent)' }}></i>
                  {scheduleCandidate.interviewStatus === 'SCHEDULED' ||
                  scheduleCandidate.interviewStatus === 'RESCHEDULED'
                    ? 'Reschedule Candidate Interview'
                    : 'Schedule Candidate Interview'}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Coordinate interview time, panel details, and dispatch invite notification.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => !scheduling && setScheduleCandidate(null)}
                style={{ fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* Candidate Info Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--bg-secondary)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: 'var(--primary)',
                    color: '#fff',
                    fontWeight: 700,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '0.9rem',
                  }}
                >
                  {scheduleCandidate.candidateInitials ||
                    scheduleCandidate.candidateName?.slice(0, 2).toUpperCase() ||
                    'C'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {scheduleCandidate.candidateName}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {scheduleCandidate.candidateEmail} &bull;{' '}
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      {scheduleCandidate.targetJobRole || 'Software Role'}
                    </span>
                  </div>
                </div>
              </div>
              <span
                className={`score-badge ${
                  scheduleCandidate.atsScore >= 75 ? 'score-high' : 'score-mid'
                }`}
              >
                {scheduleCandidate.atsScore}% ATS
              </span>
            </div>

            {scheduleError && (
              <div
                className="alert alert-danger"
                style={{
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                }}
              >
                <i className="bi bi-exclamation-circle-fill"></i>
                <span>{scheduleError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleScheduleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                {/* Round */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Interview Round *
                  </label>
                  <select
                    className="form-control"
                    value={scheduleForm.interviewRound}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, interviewRound: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.88rem',
                    }}
                    required
                  >
                    <option value="Technical Round 1">Technical Round 1 (DSA &amp; Core Concepts)</option>
                    <option value="Technical Round 2">Technical Round 2 (System Design &amp; Architecture)</option>
                    <option value="Coding Demonstration">Hands-on Live Coding Demonstration</option>
                    <option value="HR &amp; Culture Fit">HR &amp; Cultural Alignment Round</option>
                    <option value="Final Managerial Round">Final Managerial &amp; Leadership Round</option>
                  </select>
                </div>

                {/* Date & Time */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Interview Date *
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={scheduleForm.interviewDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, interviewDate: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Interview Time *
                    </label>
                    <input
                      type="time"
                      className="form-control"
                      value={scheduleForm.interviewTime}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, interviewTime: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>
                </div>

                {/* Mode: Online / Offline */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Interview Mode
                  </label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        border: `1px solid ${
                          scheduleForm.interviewMode === 'Online' ? 'var(--accent)' : 'var(--border-color)'
                        }`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        background:
                          scheduleForm.interviewMode === 'Online' ? 'rgba(255, 121, 0, 0.08)' : 'transparent',
                        fontSize: '0.85rem',
                      }}
                    >
                      <input
                        type="radio"
                        name="interviewMode"
                        value="Online"
                        checked={scheduleForm.interviewMode === 'Online'}
                        onChange={() => setScheduleForm({ ...scheduleForm, interviewMode: 'Online' })}
                      />
                      <i className="bi bi-camera-video"></i> Online Video Call
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        border: `1px solid ${
                          scheduleForm.interviewMode === 'Offline' ? 'var(--accent)' : 'var(--border-color)'
                        }`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        background:
                          scheduleForm.interviewMode === 'Offline' ? 'rgba(255, 121, 0, 0.08)' : 'transparent',
                        fontSize: '0.85rem',
                      }}
                    >
                      <input
                        type="radio"
                        name="interviewMode"
                        value="Offline"
                        checked={scheduleForm.interviewMode === 'Offline'}
                        onChange={() => setScheduleForm({ ...scheduleForm, interviewMode: 'Offline' })}
                      />
                      <i className="bi bi-building"></i> In-Person / Onsite
                    </label>
                  </div>
                </div>

                {/* Online: Platform & Link */}
                {scheduleForm.interviewMode === 'Online' ? (
                  <>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                        Meeting Platform
                      </label>
                      <select
                        className="form-control"
                        value={scheduleForm.meetingPlatform}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, meetingPlatform: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.88rem',
                        }}
                      >
                        <option value="Google Meet">Google Meet</option>
                        <option value="Zoom">Zoom Video</option>
                        <option value="Microsoft Teams">Microsoft Teams</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                        Meeting Link *
                      </label>
                      <input
                        type="url"
                        className="form-control"
                        value={scheduleForm.meetingLink}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, meetingLink: e.target.value })}
                        placeholder="https://meet.google.com/..."
                        required
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.88rem',
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Onsite Interview Location *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={scheduleForm.interviewLocation}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, interviewLocation: e.target.value })}
                      placeholder="e.g. SmartHire HQ, Floor 4, Meeting Room B, Tech City"
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>
                )}

                {/* Interviewer */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Interviewer Name &amp; Title *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={scheduleForm.interviewerName}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, interviewerName: e.target.value })}
                    placeholder="e.g. Alex Chen (Principal Architect)"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    HR Instructions / Candidate Notes (Optional)
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={scheduleForm.notes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                    placeholder="e.g. Please join 5 minutes early with your IDE ready for technical assessment."
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.88rem',
                    }}
                  ></textarea>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '14px',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setScheduleCandidate(null)}
                  disabled={scheduling}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={scheduling}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="bi bi-send-check"></i>
                  <span>{scheduling ? 'Scheduling...' : 'Save & Dispatch Invite'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
