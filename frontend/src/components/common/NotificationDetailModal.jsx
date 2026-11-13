import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatTimeAgo, formatNotificationTime } from '../../utils/timeAgo';
import { formatNotificationDisplay } from '../../utils/notificationFormatter';

const NotificationDetailModal = ({ notification, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!notification) return null;

  const display = formatNotificationDisplay(notification);
  const timeInfo = formatNotificationTime(notification.createdAt);

  const formattedDateTime = `${timeInfo.exact} (${timeInfo.relative})`;

  const candidateName = notification.candidateName || 'Candidate';
  const jobTitle = notification.jobTitle || notification.title?.split(':')?.[1]?.trim() || 'Software Engineer';
  const applicationId = notification.relatedEntityId ? `#APP-${notification.relatedEntityId}` : `#NOTIF-${notification.id}`;
  const previousStatus = notification.previousStatus || (display.heading === 'Removed from Shortlist' ? 'SHORTLISTED' : 'Under Review');
  const currentStatus = notification.currentStatus || display.badge.text;
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
                background: display.badge.bg,
                color: display.badge.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                flexShrink: 0,
              }}
            >
              <i className={`bi ${display.badge.icon}`}></i>
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    margin: 0,
                    color: 'var(--text-primary, #0f172a)',
                  }}
                >
                  {display.heading}
                </h2>
                <span className={`badge ${display.badge.badgeClass}`} style={{ fontSize: '0.72rem' }}>
                  {display.badge.text}
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
            <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
              {display.title}
            </strong>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary, #334155)', lineHeight: 1.55 }}>
              {display.message}
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
              <span className={`badge ${display.badge.badgeClass}`} style={{ fontSize: '0.75rem' }}>{currentStatus}</span>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-secondary, #f8fafc)' }}>
              <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                Notification Timestamp
              </small>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <i className="bi bi-clock" style={{ color: 'var(--accent, #ff7900)' }}></i>
                {timeInfo.exact}
              </strong>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-secondary, #f8fafc)', gridColumn: '1 / -1' }}>
              <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                Action Performed
              </small>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem' }}>
                <i className="bi bi-arrow-right-short text-primary"></i> {display.actionPerformed}
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

          {/* Conditional: Interview Feedback Section */}
          {(notification.type === 'FEEDBACK' || notification.actionType === 'INTERVIEW_FEEDBACK' || notification.recommendation) && (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(14, 165, 233, 0.06)',
                border: '1px solid rgba(14, 165, 233, 0.2)',
                marginBottom: '20px',
              }}
            >
              <h4 style={{ margin: '0 0 10px', fontSize: '0.94rem', fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="bi bi-clipboard-data-fill"></i> Interview Evaluation & Recommendation
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div>
                  <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>OUTCOME / RECOMMENDATION</small>
                  <strong style={{ fontSize: '0.88rem', color: '#0ea5e9' }}>
                    {notification.recommendation || 'Evaluation Recorded'}
                  </strong>
                </div>
                {notification.feedbackScore != null && (
                  <div>
                    <small style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>EVALUATION SCORE</small>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {notification.feedbackScore}%
                    </strong>
                  </div>
                )}
              </div>
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
