import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { useOnboarding } from '../../context/OnboardingContext';
import ProfileDropdown from './ProfileDropdown';
import NotificationDetailModal from '../common/NotificationDetailModal';
import { formatTimeAgo } from '../../utils/timeAgo';

const Header = ({ pageTitle, toggleSidebar, isCollapsed, isMobileOpen }) => {
  const { user, role, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { restartTour } = useOnboarding();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [selectedModalNotif, setSelectedModalNotif] = useState(null);

  const profileRef = useRef(null);
  const notifsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifsRef.current && !notifsRef.current.contains(e.target)) {
        setNotifsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notif, e) => {
    e.preventDefault();
    setNotifsOpen(false);
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
    setSelectedModalNotif(notif);
  };

  const isHr = role === 'HR' || role === 'RECRUITER';
  const initial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U';

  return (
    <>
      <header className="dashboard-topbar">
        {/* Topbar Left: Hamburger Menu & Breadcrumbs */}
        <div className="topbar-left">
          <button
            type="button"
            className="sidebar-menu-button"
            onClick={toggleSidebar}
            aria-label="Open navigation menu"
            title="Open Navigation Menu"
          >
            <i className="bi bi-list"></i>
          </button>

          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/dashboard">
              <span className="breadcrumb-icon" aria-hidden="true"><i className="bi bi-speedometer2"></i></span>
              <span className="breadcrumb-home-text">Dashboard</span>
            </Link>
            {pageTitle && (
              <>
                <span className="breadcrumb-separator" aria-hidden="true">/</span>
                <span className="breadcrumb-current" title={pageTitle}>{pageTitle}</span>
              </>
            )}
          </nav>
        </div>

        {/* Topbar Actions */}
        <div className="topbar-actions">
          {/* Role Portal Badge (visible on desktop/tablet) */}
          <div className="topbar-role-badge">
            {!isHr ? (
              <span className="badge badge-primary">
                <i className="bi bi-person-badge"></i> Job Seeker Portal
              </span>
            ) : (
              <span className="badge badge-warning">
                <i className="bi bi-briefcase"></i> Recruiter Portal
              </span>
            )}
          </div>

          {/* Guided Product Tour Button */}
          <button
            type="button"
            className="btn btn-ghost btn-sm topbar-tour-btn"
            onClick={restartTour}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              color: 'var(--accent)',
              background: 'rgba(255, 121, 0, 0.08)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title="Start or restart animated platform spotlight tour"
          >
            <i className="bi bi-compass"></i>
            <span className="topbar-tour-text">Tour</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="notifications-dropdown-wrapper" ref={notifsRef}>
            <button
              type="button"
              className="topbar-icon-button"
              id="notificationsTrigger"
              onClick={() => setNotifsOpen((prev) => !prev)}
              aria-label="View notifications"
              aria-expanded={notifsOpen}
            >
              <span className="icon-bell" aria-hidden="true"><i className="bi bi-bell"></i></span>
              {unreadCount > 0 && (
                <span className="notification-badge" id="notificationBadge">{unreadCount}</span>
              )}
            </button>

            {notifsOpen && (
              <div className="notifications-dropdown-menu" id="notificationsDropdown" style={{ display: 'block' }}>
                <div className="dropdown-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong>Notifications</strong>
                    {unreadCount > 0 && (
                      <span className="header-unread-count" id="headerUnreadCount">{unreadCount}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="btn-mark-all-read-header"
                        id="btnMarkAllReadHeader"
                        onClick={markAllAsRead}
                      >
                        <i className="bi bi-check2-all"></i> Mark all read
                      </button>
                    )}
                    <Link to="/dashboard/notifications" onClick={() => setNotifsOpen(false)} className="dropdown-header-link">
                      View all
                    </Link>
                  </div>
                </div>

                <div className="notifications-list" id="topbarNotificationsList">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        className={`notification-item-row ${notif.isRead ? 'is-read' : 'is-unread'}`}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleNotificationClick(notif, e)}
                          className={`notification-item ${notif.isRead ? '' : 'unread'}`}
                          style={{
                            textAlign: 'left',
                            background: 'none',
                            border: 'none',
                            width: '100%',
                            cursor: 'pointer',
                            display: 'flex',
                          }}
                        >
                          <span className="notif-icon" aria-hidden="true">
                            <i className={`bi ${notif.iconClass || 'bi-info-circle'}`}></i>
                          </span>
                          <div className="notif-content">
                            <p className="notif-title">{notif.title}</p>
                            <span className="notif-time">{formatTimeAgo(notif.createdAt || notif.timeAgo)}</span>
                          </div>
                        </button>
                        {!notif.isRead && (
                          <button
                            type="button"
                            className="btn-mark-single-read"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notif.id);
                            }}
                            title="Mark as read"
                            aria-label="Mark notification as read"
                          >
                            <span className="unread-dot"></span>
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div id="topbarEmptyState" style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <i className="bi bi-bell-slash" style={{ fontSize: '1.6rem', display: 'block', marginBottom: '8px', opacity: 0.5 }}></i>
                      <span>No new notifications</span>
                    </div>
                  )}
                </div>

                <div className="dropdown-footer">
                  <Link to="/dashboard/notifications" onClick={() => setNotifsOpen(false)}>
                    Open Notification Center &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Dark / Light Theme Toggle */}
          <button
            type="button"
            className="theme-toggle"
            data-theme-toggle
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
          >
            <span className="icon-moon" aria-hidden="true"><i className="bi bi-moon-stars"></i></span>
            <span className="icon-sun" aria-hidden="true"><i className="bi bi-sun"></i></span>
          </button>

          {/* User Profile Dropdown */}
          <div className="profile-dropdown-wrapper" ref={profileRef}>
            <button
              type="button"
              className={`topbar-profile-trigger ${profileOpen ? 'is-active' : ''}`}
              id="profileMenuTrigger"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-label="User account menu"
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <span className="profile-avatar">{initial}</span>
              <span className="topbar-profile-name">{user?.fullName || 'User Account'}</span>
              <span className={`profile-chevron ${profileOpen ? 'rotated' : ''}`} aria-hidden="true">
                <i className="bi bi-chevron-down"></i>
              </span>
            </button>

            <ProfileDropdown
              isOpen={profileOpen}
              onClose={() => setProfileOpen(false)}
            />
          </div>
        </div>
      </header>

      {/* Reusable View Details Modal */}
      {selectedModalNotif && (
        <NotificationDetailModal
          notification={selectedModalNotif}
          onClose={() => setSelectedModalNotif(null)}
        />
      )}
    </>
  );
};

export default React.memo(Header);
