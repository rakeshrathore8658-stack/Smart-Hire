import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import CustomSelect from '../../components/common/CustomSelect';
import EmptyState from '../../components/common/EmptyState';
import SkeletonLoader from '../../components/common/SkeletonLoader';

export default function Interviews() {
  const [activeTab, setActiveTab] = useState('all');
  const [interviews, setInterviews] = useState([]);
  const [allCandidates, setAllCandidates] = useState([]);
  const [counts, setCounts] = useState({ allCount: 0, upcomingCount: 0, completedCount: 0, needsFeedbackCount: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);

  // Form states
  const [scheduleForm, setScheduleForm] = useState({
    candidateId: '',
    interviewRound: 'Technical Round 1',
    interviewDate: '',
    interviewTime: '10:00',
    interviewMode: 'Online',
    meetingPlatform: 'Google Meet',
    meetingLink: 'https://meet.google.com/smarthire-interview',
    interviewLocation: '',
    interviewerName: 'Alex Chen (Principal Architect)',
    notes: '',
  });

  const [rescheduleForm, setRescheduleForm] = useState({
    candidateId: '',
    interviewRound: '',
    interviewDate: '',
    interviewTime: '10:00',
    interviewMode: 'Online',
    meetingPlatform: 'Google Meet',
    meetingLink: '',
    interviewLocation: '',
    interviewerName: '',
    reason: '',
  });

  const [cancelForm, setCancelForm] = useState({
    candidateId: '',
    reason: '',
  });

  const [feedbackForm, setFeedbackForm] = useState({
    candId: '',
    techRating: 4,
    commRating: 4,
    problemSolvingRating: 4,
    recommendation: 'Next Round',
    strengths: '',
    weaknesses: '',
    confidentialNotes: '',
  });

  const fetchInterviews = async () => {
    try {
      const res = await api.get('/dashboard/interviews');
      if (res.data) {
        const ivList = Array.isArray(res.data.interviews)
          ? res.data.interviews
          : Array.isArray(res.data)
          ? res.data
          : [];
        setInterviews(ivList);

        const candList = Array.isArray(res.data.allCandidates)
          ? res.data.allCandidates
          : ivList;
        setAllCandidates(candList);

        if (!scheduleForm.candidateId && candList.length > 0) {
          setScheduleForm((prev) => ({ ...prev, candidateId: candList[0].id }));
        }

        setCounts({
          allCount: res.data.allCount ?? ivList.length,
          upcomingCount: res.data.upcomingCount ?? ivList.filter((i) => i.interviewDate && !i.feedbackNotes && i.interviewStatus !== 'CANCELLED').length,
          completedCount: res.data.completedCount ?? ivList.filter((i) => i.feedbackNotes || i.interviewStatus === 'COMPLETED').length,
          needsFeedbackCount: res.data.needsFeedbackCount ?? ivList.filter((i) => i.interviewDate && !i.feedbackNotes && i.interviewStatus !== 'CANCELLED').length,
        });
      }
    } catch (err) {
      console.error('Error fetching interviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  // Quick message helpers
  const triggerSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4500);
  };
  const triggerError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 4500);
  };

  // Open Schedule Modal
  const handleOpenSchedule = (existing = null) => {
    const todayStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    if (existing) {
      setScheduleForm({
        candidateId: existing.id,
        interviewRound: existing.interviewRound || 'Technical Round 1',
        interviewDate: existing.interviewDateIso ? existing.interviewDateIso.split('T')[0] : todayStr,
        interviewTime: existing.interviewDateIso && existing.interviewDateIso.includes('T') ? existing.interviewDateIso.split('T')[1].substring(0, 5) : '10:00',
        interviewMode: existing.interviewLocation ? 'Offline' : 'Online',
        meetingPlatform: existing.interviewType || 'Google Meet',
        meetingLink: existing.meetingLink || 'https://meet.google.com/smarthire-interview',
        interviewLocation: existing.interviewLocation || '',
        interviewerName: existing.interviewerName || 'Alex Chen (Principal Architect)',
        notes: existing.hrNotes || '',
      });
    } else {
      setScheduleForm({
        candidateId: allCandidates.length > 0 ? allCandidates[0].id : '',
        interviewRound: 'Technical Round 1',
        interviewDate: todayStr,
        interviewTime: '10:00',
        interviewMode: 'Online',
        meetingPlatform: 'Google Meet',
        meetingLink: 'https://meet.google.com/smarthire-interview',
        interviewLocation: '',
        interviewerName: 'Alex Chen (Principal Architect)',
        notes: '',
      });
    }
    setShowScheduleModal(true);
  };

  // Open Reschedule Modal
  const handleOpenReschedule = (item) => {
    setSelectedInterview(item);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setRescheduleForm({
      candidateId: item.id,
      interviewRound: item.interviewRound || 'Technical Round 1',
      interviewDate: item.interviewDateIso ? item.interviewDateIso.split('T')[0] : tomorrow,
      interviewTime: item.interviewDateIso && item.interviewDateIso.includes('T') ? item.interviewDateIso.split('T')[1].substring(0, 5) : '11:00',
      interviewMode: item.interviewLocation ? 'Offline' : 'Online',
      meetingPlatform: item.interviewType || 'Google Meet',
      meetingLink: item.meetingLink || 'https://meet.google.com/smarthire-interview',
      interviewLocation: item.interviewLocation || '',
      interviewerName: item.interviewerName || 'Alex Chen (Principal Architect)',
      reason: 'Slot conflict / panel rescheduled for candidate convenience',
    });
    setShowRescheduleModal(true);
  };

  // Open Cancel Modal
  const handleOpenCancel = (item) => {
    setSelectedInterview(item);
    setCancelForm({
      candidateId: item.id,
      reason: 'Recruiting priority change / candidate availability conflict',
    });
    setShowCancelModal(true);
  };

  // Open Feedback Modal
  const handleOpenFeedback = (item) => {
    setSelectedInterview(item);
    setFeedbackForm({
      candId: item.id,
      techRating: item.techRating || 4,
      commRating: item.commRating || 4,
      problemSolvingRating: item.problemSolvingRating || 4,
      recommendation: item.recommendation || 'Next Round',
      strengths: item.feedbackNotes?.includes('Strengths:')
        ? item.feedbackNotes.split('|')[0].replace('Strengths:', '').trim()
        : 'Demonstrated solid understanding of architecture, Clean Code principles, and API optimizations.',
      weaknesses: item.feedbackNotes?.includes('Areas:')
        ? item.feedbackNotes.split('|')[1].replace('Areas:', '').replace('Areas of Improvement:', '').trim()
        : 'Could provide deeper edge-case coverage and practice large-scale distributed tracing.',
      confidentialNotes: item.hrNotes || '',
    });
    setShowFeedbackModal(true);
  };

  // Submit Schedule
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fullIso = `${scheduleForm.interviewDate}T${scheduleForm.interviewTime}:00`;
      await api.post('/dashboard/interviews/schedule', {
        ...scheduleForm,
        interviewDate: fullIso,
        isReschedule: false,
      });
      triggerSuccess('Interview scheduled successfully! Real-time notification dispatched to candidate.');
      setShowScheduleModal(false);
      fetchInterviews();
    } catch (err) {
      console.error(err);
      triggerError('Failed to schedule interview. Please verify candidate details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Reschedule
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fullIso = `${rescheduleForm.interviewDate}T${rescheduleForm.interviewTime}:00`;
      await api.post('/dashboard/interviews/schedule', {
        ...rescheduleForm,
        interviewDate: fullIso,
        isReschedule: true,
      });
      triggerSuccess('Interview rescheduled successfully! Updated notification pushed to candidate.');
      setShowRescheduleModal(false);
      fetchInterviews();
    } catch (err) {
      console.error(err);
      triggerError('Failed to reschedule interview. Please check server status.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Cancel
  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/dashboard/interviews/${cancelForm.candidateId}/cancel`, {
        reason: cancelForm.reason,
      });
      triggerSuccess('Interview cancelled. Candidate notified via in-app alert.');
      setShowCancelModal(false);
      fetchInterviews();
    } catch (err) {
      console.error(err);
      triggerError('Failed to cancel interview.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Feedback
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/dashboard/feedback', feedbackForm);
      triggerSuccess('Interview scorecard and candidate evaluation submitted successfully!');
      setShowFeedbackModal(false);
      fetchInterviews();
    } catch (err) {
      console.error(err);
      triggerError('Failed to record feedback scorecard.');
    } finally {
      setSubmitting(false);
    }
  };

  // Options
  const roundOptions = [
    { value: 'Technical Round 1', label: 'Technical Round 1 (Coding & Algorithms)' },
    { value: 'Technical Round 2', label: 'Technical Round 2 (Deep Dive & Frameworks)' },
    { value: 'System Architecture', label: 'System Architecture & Scalability Design' },
    { value: 'Culture & Leadership', label: 'Culture Fit, Team Collaboration & Leadership' },
    { value: 'Managerial Round', label: 'Managerial & Problem Solving Review' },
    { value: 'Final HR Negotiation', label: 'Final HR Negotiation & Compensation Review' },
  ];

  const onlineMediumOptions = [
    { value: 'Google Meet', label: 'Google Meet' },
    { value: 'Microsoft Teams', label: 'Microsoft Teams' },
    { value: 'Zoom Video', label: 'Zoom Video' },
  ];

  const candidateOptions = allCandidates.map((c) => ({
    value: c.id,
    label: `${c.candidateName} · ${c.targetJobRole || 'Candidate'} (${c.overallScore || 70}% Match)`,
  }));

  // Filtering
  const filteredInterviews = interviews.filter((item) => {
    // Tab check
    if (activeTab === 'upcoming') {
      if (item.interviewStatus === 'CANCELLED' || item.interviewStatus === 'COMPLETED' || Boolean(item.feedbackNotes) || !item.interviewDateIso) {
        return false;
      }
    } else if (activeTab === 'completed') {
      if (item.interviewStatus !== 'COMPLETED' && !item.feedbackNotes) {
        return false;
      }
    } else if (activeTab === 'feedback') {
      if (item.feedbackNotes || item.interviewStatus === 'CANCELLED' || !item.interviewDateIso) {
        return false;
      }
    }

    // Search query check
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.candidateName?.toLowerCase().includes(q);
      const matchRole = item.targetJobRole?.toLowerCase().includes(q);
      const matchInterviewer = item.interviewerName?.toLowerCase().includes(q);
      const matchRound = item.interviewRound?.toLowerCase().includes(q);
      return matchName || matchRole || matchInterviewer || matchRound;
    }

    return true;
  });

  return (
    <div className="fade-in">
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Interviews</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Candidate Interview Schedules</h1>
          <p className="page-subtitle">
            Coordinate video interviews, structured scorecards, and engineering review rounds.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            data-tour="schedule-interview-btn"
            onClick={() => handleOpenSchedule()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="bi bi-calendar-plus"></i>
            <span>Schedule Interview</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMessage && (
        <div className="alert alert-success" role="status" style={{ marginBottom: '16px' }}>
          <i className="bi bi-check-circle-fill"></i> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="alert alert-danger" role="status" style={{ marginBottom: '16px' }}>
          <i className="bi bi-exclamation-triangle-fill"></i> {errorMessage}
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        {/* Filter Tabs */}
        <div className="filter-tabs-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('all')}
          >
            All Rounds ({counts.allCount})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'upcoming' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming ({counts.upcomingCount})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'completed' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('completed')}
          >
            Completed ({counts.completedCount})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'feedback' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('feedback')}
          >
            Needs Feedback ({counts.needsFeedbackCount})
          </button>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <i
            className="bi bi-search"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          ></i>
          <input
            type="text"
            className="form-control"
            placeholder="Search candidate, role, round..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: '34px',
              paddingRight: '12px',
              height: '38px',
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-primary)',
            }}
          />
        </div>
      </div>

      {/* Main Interviews List Card */}
      <article className="card" style={{ padding: '8px' }}>
        {loading ? (
          <div style={{ padding: '24px' }}>
            <SkeletonLoader type="card" count={3} />
          </div>
        ) : filteredInterviews.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '8px' }}>
            {filteredInterviews.map((item) => {
              const isCancelled = item.interviewStatus === 'CANCELLED';
              const isCompleted = item.interviewStatus === 'COMPLETED' || Boolean(item.feedbackNotes);
              const isRescheduled = item.interviewStatus === 'RESCHEDULED';

              return (
                <div
                  key={item.id}
                  className="interview-card"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '18px 22px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    flexWrap: 'wrap',
                    gap: '16px',
                    transition: 'all 0.2s ease',
                    opacity: isCancelled ? 0.78 : 1,
                  }}
                >
                  {/* Left: Date box & details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: '1 1 500px' }}>
                    {/* Date Block */}
                    <div
                      style={{
                        padding: '12px 14px',
                        background: isCancelled
                          ? 'var(--text-muted)'
                          : isCompleted
                          ? '#10b981'
                          : isRescheduled
                          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                          : 'var(--primary)',
                        color: '#fff',
                        borderRadius: '12px',
                        textAlign: 'center',
                        minWidth: '64px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                      }}
                    >
                      <span style={{ fontSize: '1.35rem', fontWeight: 800, display: 'block', lineHeight: 1 }}>
                        {item.interviewDay || '--'}
                      </span>
                      <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
                        {item.interviewMonth || 'TBD'}
                      </span>
                    </div>

                    {/* Information */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                          {item.candidateName}
                        </h3>
                        <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.4px' }}>
                          {item.targetJobRole || 'Candidate Role'}
                        </span>

                        {/* Status Pills */}
                        {isCompleted && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <i className="bi bi-check2-circle"></i> COMPLETED
                          </span>
                        )}
                        {isRescheduled && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              background: '#fffbeb',
                              color: '#d97706',
                              border: '1px solid #fde68a',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <i className="bi bi-arrow-repeat"></i> RESCHEDULED
                          </span>
                        )}
                        {isCancelled && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <i className="bi bi-x-circle"></i> CANCELLED
                          </span>
                        )}
                        {!isCancelled && !isCompleted && !isRescheduled && item.interviewDateIso && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              fontWeight: 700,
                            }}
                          >
                            CONFIRMED
                          </span>
                        )}
                      </div>

                      {/* Schedule Meta Details */}
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <strong>{item.interviewRound || 'Technical Round'}</strong> &bull;{' '}
                        {item.formattedInterviewDate || 'Upcoming Round'} &bull;{' '}
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                          <i
                            className={
                              item.interviewLocation
                                ? 'bi bi-geo-alt'
                                : item.interviewType?.toLowerCase().includes('zoom')
                                ? 'bi bi-camera-video'
                                : 'bi bi-google'
                            }
                            style={{ marginRight: '4px' }}
                          ></i>
                          {item.interviewLocation ? `In-Person (${item.interviewLocation})` : (item.interviewType || 'Online')}
                        </span>
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <i className="bi bi-person-badge" style={{ marginRight: '4px' }}></i>
                          Interviewer: <strong>{item.interviewerName || 'Hiring Panel'}</strong>
                        </span>

                        {/* Meeting link button */}
                        {item.meetingLink && !isCancelled && (
                          <a
                            href={item.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm"
                            style={{
                              padding: '2px 10px',
                              fontSize: '0.78rem',
                              color: 'var(--primary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                            title="Open Video Meeting Link"
                          >
                            <i className="bi bi-box-arrow-up-right"></i> Join Meeting
                          </a>
                        )}
                      </div>

                      {/* Reschedule or cancellation note */}
                      {isCancelled && item.cancellationReason && (
                        <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#dc2626' }}>
                          <i className="bi bi-info-circle"></i> Cancellation Reason: {item.cancellationReason}
                        </p>
                      )}
                      {isRescheduled && item.previousInterviewDate && (
                        <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: '#b45309' }}>
                          <i className="bi bi-clock-history"></i> Original slot moved from {item.previousInterviewDate}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Feedback button */}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleOpenFeedback(item)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <i className="bi bi-clipboard-check"></i>
                      <span>{isCompleted ? 'Scorecard' : 'Feedback'}</span>
                    </button>

                    {/* Reschedule button */}
                    {!isCompleted && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenReschedule(item)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        title="Reschedule this interview"
                      >
                        <i className="bi bi-pencil-square"></i>
                        <span>Reschedule</span>
                      </button>
                    )}

                    {/* Cancel Interview button */}
                    {!isCancelled && !isCompleted && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => handleOpenCancel(item)}
                        style={{
                          background: 'transparent',
                          color: '#ef4444',
                          border: '1px solid #fca5a5',
                          borderRadius: 'var(--radius-md)',
                          padding: '6px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                        }}
                        title="Cancel this interview"
                      >
                        <i className="bi bi-x-circle"></i>
                        <span>Cancel</span>
                      </button>
                    )}

                    {/* Candidate Profile Link */}
                    <Link
                      to={`/dashboard/candidates/${item.id}`}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.82rem' }}
                    >
                      Profile
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="bi-calendar2-week"
            title="No Interviews in this View"
            description={
              searchQuery
                ? `No candidate interviews found matching "${searchQuery}".`
                : activeTab !== 'all'
                ? `No interview rounds match the "${activeTab}" filter. Select "All Rounds" or schedule a new candidate.`
                : 'No candidate interviews scheduled yet. Shortlist candidates from the database and set up interview rounds.'
            }
            actionLabel="Schedule New Interview"
            onAction={() => handleOpenSchedule()}
          />
        )}
      </article>

      {/* MODAL 1: Schedule Interview Modal */}
      {showScheduleModal && (
        <div
          className="modal-overlay is-open"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.68)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setShowScheduleModal(false)}
        >
          <div
            className="modal-dialog card"
            style={{ maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-primary)', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  <i className="bi bi-calendar-plus" style={{ color: 'var(--accent)', marginRight: '8px' }}></i>
                  Schedule Candidate Interview
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Coordinate interview time, interviewer panel, and auto-dispatch candidate invite.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowScheduleModal(false)}
                style={{ fontSize: '1.25rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
                {/* Candidate Selection */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Select Candidate &amp; Job Application *
                  </label>
                  <CustomSelect
                    value={scheduleForm.candidateId}
                    onChange={(val) => setScheduleForm({ ...scheduleForm, candidateId: val })}
                    options={candidateOptions}
                    placeholder="Choose candidate application..."
                    searchable={true}
                  />
                </div>

                {/* Interview Round */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Interview Round *
                  </label>
                  <CustomSelect
                    value={scheduleForm.interviewRound}
                    onChange={(val) => setScheduleForm({ ...scheduleForm, interviewRound: val })}
                    options={roundOptions}
                  />
                </div>

                {/* Date & Time Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Interview Date *
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={scheduleForm.interviewDate}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, interviewDate: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
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
                      }}
                    />
                  </div>
                </div>

                {/* Interview Mode: Online / Offline */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Interview Mode
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        border: `1px solid ${scheduleForm.interviewMode === 'Online' ? 'var(--accent)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        background: scheduleForm.interviewMode === 'Online' ? 'rgba(255, 121, 0, 0.08)' : 'transparent',
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
                        border: `1px solid ${scheduleForm.interviewMode === 'Offline' ? 'var(--accent)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        background: scheduleForm.interviewMode === 'Offline' ? 'rgba(255, 121, 0, 0.08)' : 'transparent',
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

                {/* If Online: Platform & Meeting Link */}
                {scheduleForm.interviewMode === 'Online' ? (
                  <>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                        Meeting Platform
                      </label>
                      <CustomSelect
                        value={scheduleForm.meetingPlatform}
                        onChange={(val) => setScheduleForm({ ...scheduleForm, meetingPlatform: val })}
                        options={onlineMediumOptions}
                      />
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
                        }}
                      />
                    </div>
                  </>
                ) : (
                  /* If Offline: Location */
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
                      }}
                    />
                  </div>
                )}

                {/* Interviewer Name */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Interviewer Name &amp; Title *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={scheduleForm.interviewerName}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, interviewerName: e.target.value })}
                    placeholder="e.g. Dinesh Bhatt (Senior Engineering Manager)"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                </div>

                {/* Additional Instructions / HR Message */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    HR Message / Additional Instructions for Candidate (Optional)
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={scheduleForm.notes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                    placeholder="e.g. Please ensure you join 5 minutes early with your IDE ready for a coding demonstration."
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  ></textarea>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowScheduleModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="bi bi-send-check"></i>
                  <span>{submitting ? 'Scheduling...' : 'Save & Notify Candidate'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Reschedule Interview Modal */}
      {showRescheduleModal && selectedInterview && (
        <div
          className="modal-overlay is-open"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.68)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setShowRescheduleModal(false)}
        >
          <div
            className="modal-dialog card"
            style={{ maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-primary)', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  <i className="bi bi-arrow-repeat" style={{ color: '#f59e0b', marginRight: '8px' }}></i>
                  Reschedule Candidate Interview
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Update date, time, and notify <strong>{selectedInterview.candidateName}</strong> with new details.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowRescheduleModal(false)}
                style={{ fontSize: '1.25rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Current Schedule Summary */}
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '18px',
                fontSize: '0.84rem',
                color: '#92400e',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                <i className="bi bi-clock-history"></i> Current Scheduled Slot:
              </div>
              <div>
                {selectedInterview.formattedInterviewDate || 'Not confirmed'} &bull; {selectedInterview.interviewType || 'Online'} &bull; Interviewer: {selectedInterview.interviewerName || 'Panel'}
              </div>
            </div>

            <form onSubmit={handleRescheduleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                {/* Round */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Interview Round
                  </label>
                  <CustomSelect
                    value={rescheduleForm.interviewRound}
                    onChange={(val) => setRescheduleForm({ ...rescheduleForm, interviewRound: val })}
                    options={roundOptions}
                  />
                </div>

                {/* New Date & Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      New Date *
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={rescheduleForm.interviewDate}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, interviewDate: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      New Time *
                    </label>
                    <input
                      type="time"
                      className="form-control"
                      value={rescheduleForm.interviewTime}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, interviewTime: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    />
                  </div>
                </div>

                {/* Meeting Medium / Platform */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Meeting Platform
                  </label>
                  <CustomSelect
                    value={rescheduleForm.meetingPlatform}
                    onChange={(val) => setRescheduleForm({ ...rescheduleForm, meetingPlatform: val })}
                    options={onlineMediumOptions}
                  />
                </div>

                {/* Meeting Link */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Meeting Link
                  </label>
                  <input
                    type="url"
                    className="form-control"
                    value={rescheduleForm.meetingLink}
                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, meetingLink: e.target.value })}
                    placeholder="https://meet.google.com/..."
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                </div>

                {/* Reason for Reschedule */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Reason for Rescheduling * (Sent in Candidate Notification)
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={rescheduleForm.reason}
                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                    placeholder="e.g. Panel availability adjustment / candidate requested later time slot"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  ></textarea>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRescheduleModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    borderColor: '#d97706',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <i className="bi bi-check2-circle"></i>
                  <span>{submitting ? 'Updating...' : 'Confirm Reschedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Cancel Interview Modal */}
      {showCancelModal && selectedInterview && (
        <div
          className="modal-overlay is-open"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.68)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="modal-dialog card"
            style={{ maxWidth: '480px', width: '100%', background: 'var(--bg-primary)', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#dc2626', fontWeight: 700 }}>
                <i className="bi bi-exclamation-octagon" style={{ marginRight: '8px' }}></i>
                Cancel Scheduled Interview
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCancelModal(false)}
                style={{ fontSize: '1.25rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Are you sure you want to cancel the scheduled interview for <strong>{selectedInterview.candidateName}</strong> (
              {selectedInterview.targetJobRole || 'Candidate'})? This will move the candidate status back to Shortlisted and send an immediate cancellation notification.
            </p>

            <form onSubmit={handleCancelSubmit}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Cancellation Reason *
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={cancelForm.reason}
                  onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}
                  placeholder="Provide reason for candidate notification (e.g. Schedule conflict, requisition on hold)..."
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                  }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCancelModal(false)}
                  disabled={submitting}
                >
                  Keep Interview
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={submitting}
                  style={{
                    background: '#dc2626',
                    borderColor: '#b91c1c',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <i className="bi bi-x-circle"></i>
                  <span>{submitting ? 'Cancelling...' : 'Yes, Cancel Interview'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: In-Page Feedback Scorecard Modal */}
      {showFeedbackModal && selectedInterview && (
        <div
          className="modal-overlay is-open"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.68)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setShowFeedbackModal(false)}
        >
          <div
            className="modal-dialog card"
            style={{ maxWidth: '620px', width: '100%', maxHeight: '92vh', overflowY: 'auto', background: 'var(--bg-primary)', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  <i className="bi bi-clipboard-data" style={{ color: 'var(--accent)', marginRight: '8px' }}></i>
                  Interview Scorecard &amp; Feedback
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Evaluating <strong>{selectedInterview.candidateName}</strong> for{' '}
                  <span className="badge badge-primary" style={{ verticalAlign: 'middle' }}>{selectedInterview.targetJobRole}</span>
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowFeedbackModal(false)}
                style={{ fontSize: '1.25rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '22px' }}>
                {/* Rating Sliders/Stars Grid */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                    Core Evaluation Competencies (1 to 5 Scale)
                  </h4>

                  {/* Tech Rating */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Technical Proficiency</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setFeedbackForm({ ...feedbackForm, techRating: val })}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            border: `1px solid ${feedbackForm.techRating >= val ? 'var(--accent)' : 'var(--border-color)'}`,
                            background: feedbackForm.techRating >= val ? 'var(--accent)' : 'var(--bg-primary)',
                            color: feedbackForm.techRating >= val ? '#fff' : 'var(--text-secondary)',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Communication Rating */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Communication &amp; Team Fit</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setFeedbackForm({ ...feedbackForm, commRating: val })}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            border: `1px solid ${feedbackForm.commRating >= val ? 'var(--primary)' : 'var(--border-color)'}`,
                            background: feedbackForm.commRating >= val ? 'var(--primary)' : 'var(--bg-primary)',
                            color: feedbackForm.commRating >= val ? '#fff' : 'var(--text-secondary)',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Problem Solving */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Problem Solving &amp; Architecture</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setFeedbackForm({ ...feedbackForm, problemSolvingRating: val })}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            border: `1px solid ${feedbackForm.problemSolvingRating >= val ? '#10b981' : 'var(--border-color)'}`,
                            background: feedbackForm.problemSolvingRating >= val ? '#10b981' : 'var(--bg-primary)',
                            color: feedbackForm.problemSolvingRating >= val ? '#fff' : 'var(--text-secondary)',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Overall Computed Score preview */}
                  <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Calculated Composite Score:</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {Math.round(((feedbackForm.techRating + feedbackForm.commRating + feedbackForm.problemSolvingRating) / 15) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Overall Recommendation */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Overall Hiring Recommendation *
                  </label>
                  <CustomSelect
                    value={feedbackForm.recommendation}
                    onChange={(val) => setFeedbackForm({ ...feedbackForm, recommendation: val })}
                    options={[
                      { value: 'Next Round', label: 'Next Round (Proceed to next technical or HR stage)' },
                      { value: 'Strong Hire', label: 'Strong Hire (Exceptional match - Extend Offer)' },
                      { value: 'Hire', label: 'Hire (Meets required technical and team bar)' },
                      { value: 'Hold', label: 'Hold (Needs review against other pool candidates)' },
                      { value: 'Reject', label: 'Reject (Does not meet required criteria)' },
                    ]}
                  />
                </div>

                {/* Key Strengths */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Key Strengths Demonstrated
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={feedbackForm.strengths}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, strengths: e.target.value })}
                    placeholder="e.g. Strong conceptual grasp of Spring Boot, clean async design, very collaborative..."
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  ></textarea>
                </div>

                {/* Areas for Improvement */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Areas for Improvement
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={feedbackForm.weaknesses}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, weaknesses: e.target.value })}
                    placeholder="e.g. Could practice deep distributed cache patterns and Docker compose setup..."
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  ></textarea>
                </div>

                {/* Confidential HR Notes */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: '#b45309' }}>
                    <i className="bi bi-shield-lock" style={{ marginRight: '4px' }}></i>
                    Confidential Internal Remarks (Internal HR only — Not shared with candidate)
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={feedbackForm.confidentialNotes}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, confidentialNotes: e.target.value })}
                    placeholder="Confidential notes on salary expectation, notice period, team culture notes..."
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  ></textarea>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowFeedbackModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="bi bi-check2-all"></i>
                  <span>{submitting ? 'Submitting...' : 'Submit Scorecard & Notify'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
