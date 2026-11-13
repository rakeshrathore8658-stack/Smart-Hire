import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import NotificationDetailModal from '../components/common/NotificationDetailModal';
import { formatTimeAgo, formatNotificationTime } from '../utils/timeAgo';
import { formatNotificationDisplay } from '../utils/notificationFormatter';

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
    const display = formatNotificationDisplay(enriched || notif);
    setSelectedDetailNotif({
      ...(enriched || notif),
      title: display.title,
      message: display.message,
    });
  };

  const shortlistCount = notifications.filter((n) => n.type === 'SHORTLIST' || n.actionType?.includes('SHORTLIST')).length;
  const interviewCount = notifications.filter((n) => n.type === 'INTERVIEW' || n.actionType?.includes('INTERVIEW') || n.type === 'FEEDBACK').length;
  const stageCount = notifications.filter((n) => n.type === 'STAGE_CHANGE' || n.actionType?.includes('STAGE')).length;
  const jobCount = notifications.filter((n) => n.type === 'JOB_POSTING').length;

  const filtered = notifications.filter((item) => {
    if (activeFilter === 'unread') return !item.isRead;
    if (activeFilter === 'SHORTLIST') return item.type === 'SHORTLIST' || item.actionType?.includes('SHORTLIST');
    if (activeFilter === 'INTERVIEW') return item.type === 'INTERVIEW' || item.actionType?.includes('INTERVIEW') || item.type === 'FEEDBACK';
    if (activeFilter === 'STAGE_CHANGE') return item.type === 'STAGE_CHANGE' || item.actionType?.includes('STAGE');
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
              const display = formatNotificationDisplay(notif);
              const meta = display.badge;
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
                          {meta.text}
                        </span>
                        <strong
                          style={{
                            fontSize: '0.94rem',
                            color: notif.isRead ? 'var(--text-secondary)' : 'var(--text-primary)',
                            fontWeight: notif.isRead ? 600 : 700,
                          }}
                        >
                          {display.title}
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
                      {(() => {
                        const timeInfo = formatNotificationTime(notif.createdAt || notif.timeAgo);
                        return (
                          <small
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                            title={`Exact Timestamp: ${timeInfo.exact}`}
                          >
                            <i className="bi bi-clock" style={{ fontSize: '0.74rem' }}></i>
                            <span style={{ fontWeight: 600 }}>{timeInfo.relative}</span>
                            <span style={{ opacity: 0.65, fontSize: '0.74rem' }}>&bull; {timeInfo.exact}</span>
                          </small>
                        );
                      })()}
                    </div>

                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.5 }}>
                      {display.message}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleOpenDetails(notif)}
                        style={{ fontSize: '0.78rem', padding: '4px 12px' }}
                      >
                        View Details &rarr;
                      </button>

                      {!notif.isRead && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => markAsRead(notif.id)}
                          style={{ fontSize: '0.78rem', padding: '4px 8px', color: 'var(--text-muted)' }}
                        >
                          <i className="bi bi-check2"></i> Mark as Read
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => deleteNotification(notif.id)}
                        style={{ fontSize: '0.85rem', padding: '4px 8px', color: 'var(--text-muted)', marginLeft: 'auto' }}
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
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <i className="bi bi-bell-slash" style={{ fontSize: '2.4rem', opacity: 0.5, display: 'block', marginBottom: '12px' }}></i>
              <h3 style={{ margin: '0 0 6px', fontSize: '1rem', color: 'var(--text-primary)' }}>No notifications found</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                {activeFilter === 'unread' ? 'You have read all your notifications.' : 'You have no notifications in this category yet.'}
              </p>
            </div>
          )}
        </div>
      </article>

      {/* Modern Detailed Notification Modal */}
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
