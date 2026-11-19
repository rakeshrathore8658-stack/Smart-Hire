import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { formatNotificationTime } from '../../utils/timeAgo';
import { formatNotificationDisplay } from '../../utils/notificationFormatter';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notif, e) => {
    e.preventDefault();
    setIsOpen(false);
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    } else {
      navigate('/dashboard/notifications');
    }
  };

  return (
    <div className="notifications-dropdown-wrapper" ref={bellRef} style={{ position: 'relative' }}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        className="topbar-icon-button"
        id="notificationBellTrigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="View notifications"
        aria-expanded={isOpen}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          color: 'var(--text-secondary, #64748b)',
          fontSize: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          transition: 'all 0.2s',
        }}
      >
        <span className="icon-bell" aria-hidden="true">
          <i className="bi bi-bell"></i>
        </span>
        {unreadCount > 0 && (
          <span
            className="notification-badge"
            id="notificationBellBadge"
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              minWidth: '18px',
              height: '18px',
              lineHeight: '18px',
              padding: '0 5px',
              borderRadius: '9px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 800,
              textAlign: 'center',
              boxShadow: '0 0 0 2px var(--topbar-bg, #ffffff)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div
          className="notifications-dropdown-menu"
          id="notificationBellDropdown"
          style={{
            display: 'block',
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: '360px',
            maxWidth: '90vw',
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            zIndex: 1050,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-color, #f1f5f9)',
              background: 'var(--table-header-bg, #f8fafc)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Notifications</strong>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'rgba(255, 121, 0, 0.12)',
                    color: 'var(--accent, #FF7900)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--accent, #FF7900)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <i className="bi bi-check2-all"></i> Mark all read
                </button>
              )}
              <Link
                to="/dashboard/notifications"
                onClick={() => setIsOpen(false)}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                }}
              >
                View all
              </Link>
            </div>
          </div>

          {/* List of Recent Notifications */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifications.length > 0 ? (
              notifications.slice(0, 6).map((notif) => {
                const display = formatNotificationDisplay(notif);
                const timeInfo = formatNotificationTime(notif.createdAt || notif.timeAgo);
                return (
                  <div
                    key={notif.id}
                    onClick={(e) => handleNotificationClick(notif, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 18px',
                      borderBottom: '1px solid var(--border-color, #f1f5f9)',
                      backgroundColor: notif.isRead ? 'transparent' : 'rgba(255, 121, 0, 0.04)',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--hover-bg, #f8fafc)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = notif.isRead ? 'transparent' : 'rgba(255, 121, 0, 0.04)';
                    }}
                  >
                    <span
                      style={{
                        color: display.badge?.color || 'var(--accent)',
                        fontSize: '1.1rem',
                        marginTop: '2px',
                        flexShrink: 0,
                      }}
                    >
                      <i className={`bi ${display.badge?.icon || 'bi-bell'}`}></i>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: notif.isRead ? 600 : 700,
                          color: 'var(--text-primary)',
                          marginBottom: '3px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {display.title || notif.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {display.message || notif.message}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          marginTop: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <i className="bi bi-clock" style={{ fontSize: '0.68rem' }}></i>
                        <span>{timeInfo.relative}</span>
                        {!notif.isRead && (
                          <span
                            style={{
                              marginLeft: 'auto',
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--accent, #FF7900)',
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="bi bi-bell-slash" style={{ fontSize: '1.8rem', display: 'block', marginBottom: '8px', opacity: 0.5 }}></i>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>No notifications yet</div>
                <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>You will see real-time alerts when candidates or jobs update.</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '10px 18px',
              textAlign: 'center',
              borderTop: '1px solid var(--border-color, #f1f5f9)',
              background: 'var(--table-header-bg, #f8fafc)',
            }}
          >
            <Link
              to="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--accent, #FF7900)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Go to Notification Center <i className="bi bi-arrow-right"></i>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
