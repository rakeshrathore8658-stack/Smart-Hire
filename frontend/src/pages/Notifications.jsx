import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import EmptyState from '../components/common/EmptyState';
import NotificationDetailModal from '../components/common/NotificationDetailModal';
import { formatTimeAgo } from '../utils/timeAgo';

const getNotificationBadge = (type) => {
  switch (type?.toUpperCase()) {
    case 'SHORTLIST':
      return { label: 'Shortlist', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', icon: 'bi-star-fill' };
    case 'STAGE_CHANGE':
      return { label: 'Status Update', bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', icon: 'bi-arrow-repeat' };
    case 'INTERVIEW':
      return { label: 'Interview', bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', icon: 'bi-calendar-check' };
    case 'FEEDBACK':
      return { label: 'Feedback', bg: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6', icon: 'bi-chat-left-quote' };
    case 'JOB_POSTING':
      return { label: 'New Job', bg: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', icon: 'bi-briefcase' };
    case 'ANALYSIS':
      return { label: 'ATS Analysis', bg: 'rgba(255, 121, 0, 0.15)', color: '#ff7900', icon: 'bi-cpu' };
    case 'BULK_UPLOAD':
      return { label: 'Bulk Screening', bg: 'rgba(255, 121, 0, 0.15)', color: '#ff7900', icon: 'bi-cloud-check-fill' };
    default:
      return { label: 'Update', bg: 'rgba(100, 116, 139, 0.15)', color: '#64748b', icon: 'bi-bell' };
  }
};

const Notifications = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationDetails,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedDetailNotif, setSelectedDetailNotif] = useState(null);

  const handleOpenDetails = async (notif) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
    const enriched = await getNotificationDetails(notif.id);
    setSelectedDetailNotif(enriched || notif);
  };

  const shortlistCount = notifications.filter((n) => n.type === 'SHORTLIST').length;
  const interviewCount = notifications.filter((n) => n.type === 'INTERVIEW').length;
  const stageCount = notifications.filter((n) => n.type === 'STAGE_CHANGE').length;
  const jobCount = notifications.filter((n) => n.type === 'JOB_POSTING').length;

  const filtered = notifications.filter((item) => {
    if (activeFilter === 'unread') return !item.isRead;
    if (activeFilter === 'SHORTLIST') return item.type === 'SHORTLIST';
    if (activeFilter === 'INTERVIEW') return item.type === 'INTERVIEW';
    if (activeFilter === 'STAGE_CHANGE') return item.type === 'STAGE_CHANGE';
    if (activeFilter === 'JOB_POSTING') return item.type === 'JOB_POSTING';
    return true;
  });

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Notifications</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Notification Center</h1>
          <p className="page-subtitle">
            Real-time updates on candidate shortlists, hiring stages, interview invitations, and job opportunities.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            title={unreadCount === 0 ? 'All notifications already marked as read' : 'Mark all notifications as read'}
          >
            <i className="bi bi-check2-all"></i> Mark All as Read
          </button>
        </div>
      </div>

      {/* Notifications List Card */}
      <article className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeFilter === 'unread' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          {shortlistCount > 0 && (
            <button
              type="button"
              className={`btn btn-sm ${activeFilter === 'SHORTLIST' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveFilter('SHORTLIST')}
            >
              Shortlists ({shortlistCount})
            </button>
          )}
          {interviewCount > 0 && (
            <button
              type="button"
              className={`btn btn-sm ${activeFilter === 'INTERVIEW' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveFilter('INTERVIEW')}
            >
              Interviews ({interviewCount})
            </button>
          )}
          {stageCount > 0 && (
            <button
              type="button"
              className={`btn btn-sm ${activeFilter === 'STAGE_CHANGE' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveFilter('STAGE_CHANGE')}
            >
              Status Updates ({stageCount})
            </button>
          )}
          {jobCount > 0 && (
            <button
              type="button"
              className={`btn btn-sm ${activeFilter === 'JOB_POSTING' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveFilter('JOB_POSTING')}
            >
              Jobs ({jobCount})
            </button>
          )}
        </div>

        {/* Notifications Dynamic Container */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <i className="bi bi-arrow-repeat spin" style={{ fontSize: '1.8rem', display: 'block', marginBottom: '8px' }}></i>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Loading notifications...</p>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((notif) => {
              const meta = getNotificationBadge(notif.type);
              return (
                <div
                  key={notif.id}
                  className="notification-item-card"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    padding: '18px 24px',
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'all 0.25s ease',
                    background: notif.isRead ? 'transparent' : 'rgba(255, 121, 0, 0.04)',
                    borderLeft: notif.isRead ? '4px solid transparent' : '4px solid var(--accent, #ff7900)',
                  }}
                >
                  <span
                    style={{
                      width: '42px',
                      height: '42px',
                      fontSize: '1.2rem',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: meta.bg,
                      color: meta.color,
                    }}
                  >
                    <i className={`bi ${meta.icon}`}></i>
                  </span>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            background: meta.bg,
                            color: meta.color,
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {meta.label}
                        </span>
                        <strong
                          style={{
                            fontSize: '0.94rem',
                            color: notif.isRead ? 'var(--text-secondary)' : 'var(--text-primary)',
                            fontWeight: notif.isRead ? 600 : 700,
                          }}
                        >
                          {notif.title}
                        </strong>
                        {!notif.isRead && (
                          <span
                            className="badge badge-warning"
                            style={{ fontSize: '0.65rem', padding: '2px 6px', fontWeight: 700 }}
                          >
                            NEW
                          </span>
                        )}
                      </div>
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {formatTimeAgo(notif.createdAt || notif.timeAgo)}
                      </small>
                    </div>

                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.5 }}>
                      {notif.message}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.8rem', padding: '4px 14px' }}
                        onClick={() => handleOpenDetails(notif)}
                      >
                        View Details &rarr;
                      </button>
                      {!notif.isRead && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                          onClick={() => markAsRead(notif.id)}
                        >
                          <i className="bi bi-check2"></i> Mark as Read
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.8rem', color: '#ef4444', marginLeft: 'auto' }}
                        onClick={() => deleteNotification(notif.id)}
                        title="Delete notification"
                        aria-label="Delete notification"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '32px 20px' }}>
              <EmptyState
                icon="bi-bell-slash"
                title="No Notifications Found"
                description={
                  activeFilter === 'unread'
                    ? "You're all caught up! There are no unread notifications right now."
                    : "No notifications match this category yet. When recruiters take action or schedule interviews, alerts will appear here."
                }
              />
            </div>
          )}
        </div>
      </article>

      {/* Reusable View Details Modal */}
      {selectedDetailNotif && (
        <NotificationDetailModal
          notification={selectedDetailNotif}
          onClose={() => setSelectedDetailNotif(null)}
        />
      )}
    </div>
  );
};

export default Notifications;
