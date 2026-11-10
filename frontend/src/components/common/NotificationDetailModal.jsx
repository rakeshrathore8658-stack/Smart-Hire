import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const getModalConfig = (item) => {
  const actionType = item?.actionType || '';
  const type = item?.type || '';
  const title = item?.title || '';

  if (actionType === 'SHORTLIST_ADDED' || (title.includes('Shortlist') && !title.includes('Updated') && !title.includes('Removed'))) {
    return {
      heading: 'Application Shortlisted',
      badgeClass: 'badge-success',
      badgeText: 'SHORTLISTED',
      icon: 'bi-star-fill',
      iconColor: '#10b981',
      iconBg: 'rgba(16, 185, 129, 0.15)',
      actionPerformed: 'Candidate Shortlisted for Interview Stage',
    };
  }

  if (actionType === 'SHORTLIST_REMOVED' || title.includes('Shortlist Status Updated') || title.includes('Removed from Shortlist')) {
    return {
      heading: 'Removed from Shortlist',
      badgeClass: 'badge-warning',
      badgeText: item.currentStatus || 'UNDER REVIEW',
      icon: 'bi-dash-circle-fill',
      iconColor: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      actionPerformed: 'Candidate Removed from Shortlist',
    };
  }

  if (actionType === 'INTERVIEW_RESCHEDULED' || title.includes('Rescheduled')) {
    return {
      heading: 'Interview Rescheduled',
      badgeClass: 'badge-primary',
      badgeText: 'RESCHEDULED',
      icon: 'bi-calendar-range-fill',
      iconColor: '#0284c7',
      iconBg: 'rgba(14, 165, 233, 0.15)',
      actionPerformed: 'Interview Round Rescheduled to Updated Slot',
    };
  }

  if (actionType === 'INTERVIEW_CANCELLED' || title.includes('Interview Cancelled')) {
    return {
      heading: 'Interview Cancelled',
      badgeClass: 'badge-danger',
      badgeText: 'CANCELLED',
      icon: 'bi-calendar-x-fill',
      iconColor: '#ef4444',
      iconBg: 'rgba(239, 68, 68, 0.15)',
      actionPerformed: 'Scheduled Interview Cancelled by Recruitment Team',
    };
  }

  if (actionType === 'INTERVIEW_SCHEDULED' || type === 'INTERVIEW' || title.includes('Interview Scheduled')) {
    return {
      heading: 'Interview Scheduled',
      badgeClass: 'badge-primary',
      badgeText: 'INTERVIEWING',
      icon: 'bi-calendar2-check-fill',
      iconColor: '#8b5cf6',
      iconBg: 'rgba(139, 92, 246, 0.15)',
      actionPerformed: 'Technical Interview Round Scheduled',
    };
  }

  if (actionType === 'BULK_ANALYSIS_COMPLETED' || type === 'BULK_UPLOAD' || title.includes('Bulk')) {
    return {
      heading: 'Bulk Resume Screening Completed',
      badgeClass: 'badge-primary',
      badgeText: 'COMPLETED',
      icon: 'bi-cloud-check-fill',
      iconColor: 'var(--accent)',
      iconBg: 'rgba(255, 121, 0, 0.15)',
      actionPerformed: 'Batch AI Resume Screening & Matching',
    };
  }

  if (actionType === 'JOB_PUBLISHED' || type === 'JOB_POSTING') {
    return {
      heading: 'New Job Opportunity Available',
      badgeClass: 'badge-info',
      badgeText: 'NEW OPENING',
      icon: 'bi-briefcase-fill',
      iconColor: '#6366f1',
      iconBg: 'rgba(99, 102, 241, 0.15)',
      actionPerformed: 'New Career Requisition Published',
    };
  }

  return {
    heading: 'Application Status Updated',
    badgeClass: 'badge-primary',
    badgeText: item?.currentStatus || 'STATUS UPDATED',
    icon: 'bi-info-circle-fill',
    iconColor: '#2563eb',
    iconBg: 'rgba(37, 99, 235, 0.15)',
    actionPerformed: 'Application Status Progressed in Recruitment Pipeline',
  };
};

const NotificationDetailModal = ({ notification, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!notification) return null;

  const config = getModalConfig(notification);

  const formattedDateTime = notification.createdAt
    ? new Date(notification.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Recent';

  const candidateName = notification.candidateName || 'Candidate';
  const jobTitle = notification.jobTitle || notification.title?.split(':')?.[1]?.trim() || 'Software Engineer';
  const applicationId = notification.relatedEntityId ? `#APP-${notification.relatedEntityId}` : `#NOTIF-${notification.id}`;
  const previousStatus = notification.previousStatus || (config.heading === 'Removed from Shortlist' ? 'SHORTLISTED' : 'Under Review');
  const currentStatus = notification.currentStatus || (config.heading === 'Application Shortlisted' ? 'SHORTLISTED' : 'Active');
  const updatedBy = notification.updatedBy || 'SmartHire Recruitment Team';

  return (
    <div
      className="modal-backdrop fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.25)',
          padding: '0',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            background: 'var(--bg-secondary, #f8fafc)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: config.iconBg,
                color: config.iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                flexShrink: 0,
              }}
            >
              <i className={`bi ${config.icon}`}></i>
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    margin: 0,
                    color: 'var(--text-primary, #0f172a)',
                  }}
                >
                  {config.heading}
                </h2>
                <span className={`badge ${config.badgeClass}`} style={{ fontSize: '0.72rem' }}>
                  {config.badgeText}
                </span>
              </div>
              <small style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.8rem' }}>
                Ref ID: {applicationId} &bull; {formattedDateTime}
              </small>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '1.2rem', padding: '4px 8px', color: 'var(--text-muted)' }}
            onClick={onClose}
            aria-label="Close modal"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>
          {/* Official Notification Message Banner */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'rgba(255, 121, 0, 0.05)',
              borderLeft: '4px solid var(--accent, #ff7900)',
              marginBottom: '22px',
            }}
          >
            <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
              Notification Message:
            </strong>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary, #334155)', lineHeight: 1.55 }}>
              {notification.message}
            </p>
          </div>

          {/* Key Attributes Data Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px',
              marginBottom: '22px',
            }}
          >
            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-secondary, #f8fafc)' }}>
              <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                Candidate Name
              </small>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.94rem' }}>{candidateName}</strong>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-secondary, #f8fafc)' }}>
              <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                Target Job Role
              </small>
              <strong style={{ color: 'var(--primary, #203b60)', fontSize: '0.94rem' }}>{jobTitle}</strong>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-secondary, #f8fafc)' }}>
              <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                Candidate Email
              </small>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{notification.userEmail}</span>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-secondary, #f8fafc)' }}>
              <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                Updated By
              </small>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem' }}>{updatedBy}</span>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-secondary, #f8fafc)' }}>
              <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                Previous Status
              </small>
              <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>{previousStatus}</span>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-secondary, #f8fafc)' }}>
              <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                Current Status
              </small>
              <span className={`badge ${config.badgeClass}`} style={{ fontSize: '0.75rem' }}>{currentStatus}</span>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-secondary, #f8fafc)', gridColumn: '1 / -1' }}>
              <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                Action Performed
              </small>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem' }}>
                <i className="bi bi-arrow-right-short text-primary"></i> {config.actionPerformed}
              </span>
            </div>
          </div>

          {/* Conditional: Interview Details Section */}
          {(notification.type === 'INTERVIEW' || notification.interviewDate || notification.actionType?.includes('INTERVIEW')) && (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(14, 165, 233, 0.06)',
                border: '1px solid rgba(14, 165, 233, 0.2)',
                marginBottom: '20px',
              }}
            >
              <h4 style={{ margin: '0 0 12px', fontSize: '0.94rem', fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="bi bi-camera-video"></i> Confirmed Interview Schedule
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div>
                  <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>INTERVIEW DATE</small>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    {notification.interviewDate || 'To be finalized'}
                  </strong>
                </div>
                <div>
                  <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>TIME</small>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    {notification.interviewTime || 'Scheduled Slot'}
                  </strong>
                </div>
                <div>
                  <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>MODE</small>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    {notification.interviewMode || 'Google Meet / Online'}
                  </strong>
                </div>
              </div>

              {notification.meetingLink && (
                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <a
                    href={notification.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '6px 16px' }}
                  >
                    <i className="bi bi-box-arrow-up-right"></i> Join Meeting Room
                  </a>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {notification.meetingLink}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Conditional: HR Message Notes */}
          {notification.hrMessage && (
            <div
              style={{
                padding: '14px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                marginBottom: '20px',
              }}
            >
              <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                HR INSTRUCTIONS / RECRUITER NOTES:
              </small>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                {notification.hrMessage}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            background: 'var(--bg-secondary, #f8fafc)',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px',
          }}
        >
          {notification.actionUrl && (
            <Link
              to={notification.actionUrl}
              className="btn btn-primary btn-sm"
              onClick={onClose}
              style={{ fontSize: '0.85rem', padding: '6px 18px' }}
            >
              Go to Related Page &rarr;
            </Link>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ fontSize: '0.85rem', padding: '6px 18px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationDetailModal;
