import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SettingsLayout({ children, activeTab, onTabChange }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isHr } = useAuth();

  // Dropdown touch/mobile state management
  const [mobileMenuOpen, setMobileMenuOpen] = useState(null);

  const handleMobileToggle = (menu, e) => {
    if (window.innerWidth <= 768) {
      e.preventDefault();
      setMobileMenuOpen(prev => (prev === menu ? null : menu));
    }
  };

  const handleItemClick = () => {
    setMobileMenuOpen(null);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.settings-dropdown-wrapper')) {
        setMobileMenuOpen(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const path = location.pathname;
  const search = location.search;

  // Active section flags
  const isProfileActive = path === '/dashboard/settings' || path === '/dashboard/settings/profile';
  const isNotificationsActive = path.includes('/notifications');
  const isEmailHistoryActive = isNotificationsActive && search.includes('tab=email-history');
  const isAppHistoryActive = isNotificationsActive && search.includes('tab=app-history');
  const isHrNotifActive = isNotificationsActive && (search.includes('tab=hr') || activeTab === 'hr-notif');
  const isCandidateNotifActive = isNotificationsActive && !isHrNotifActive && !isEmailHistoryActive && !isAppHistoryActive;
  
  const isAppearanceActive = path.includes('/appearance');
  
  const isSecurityActive = path.includes('/security') || path.includes('/email');
  const isEmailSmtpActive = path === '/dashboard/settings/email' || path === '/dashboard/settings/security/email' || (isSecurityActive && !path.includes('/account') && !path.includes('/delete'));
  const isAccountSecActive = path.includes('/account');
  const isDeleteSecActive = path.includes('/delete');

  const getPageInfo = () => {
    if (isNotificationsActive) {
      if (!isHr) {
        return { title: 'In-App Notification Preferences', category: 'Notification Settings', icon: 'bi-bell-fill' };
      }
      if (isEmailHistoryActive) {
        return { title: 'Sent Email Notification History', category: 'Notification Settings', icon: 'bi-envelope-check-fill' };
      }
      if (isAppHistoryActive) {
        return { title: 'Candidate App Notification History', category: 'Notification Settings', icon: 'bi-app-indicator' };
      }
      if (isHrNotifActive) {
        return { title: 'HR Notification Preferences', category: 'Notification Settings', icon: 'bi-bell-fill' };
      }
      return { title: 'Notify Preferences (Candidate)', category: 'Notification Settings', icon: 'bi-megaphone-fill' };
    }
    if (isAppearanceActive) {
      return { title: 'Appearance & Theme', category: 'Appearance Settings', icon: 'bi-palette-fill' };
    }
    if (isSecurityActive) {
      if (isAccountSecActive) {
        return { title: 'Account Settings & Credentials', category: 'Security', icon: 'bi-shield-lock-fill' };
      }
      if (isDeleteSecActive) {
        return { title: 'Delete My Account', category: 'Security', icon: 'bi-exclamation-triangle-fill' };
      }
      return isHr
        ? { title: 'Email Credential Settings (SMTP)', category: 'Security', icon: 'bi-envelope-at-fill' }
        : { title: 'Account Settings & Credentials', category: 'Security', icon: 'bi-shield-lock-fill' };
    }
    return !isHr
      ? { title: 'Job Seeker Profile & ATS Preferences', category: 'Profile Settings', icon: 'bi-person-badge-fill' }
      : { title: 'Profile Settings', category: 'Settings', icon: 'bi-person-circle' };
  };

  const pageInfo = getPageInfo();

  return (
    <div className="dashboard-content-page" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 8px 36px' }}>
      {/* Sticky Sub Top-Bar Navigation Bar */}
      <div className="settings-sub-topbar-wrapper">
        <div className="settings-sub-topbar" role="navigation" aria-label="Settings Sub-Navigation">
          <div className="settings-nav-group">
            {/* 1. Profile Settings (Direct Link) */}
            <NavLink
              to="/dashboard/settings/profile"
              className={`settings-nav-pill ${isProfileActive ? 'active' : ''}`}
              title={isHr ? "Recruiter Personal Profile & Workspace Identity" : "Job Seeker Personal Details & Career Track"}
            >
              <span>Profile Settings</span>
            </NavLink>

            {/* 2. Notification Settings */}
            {isHr ? (
              /* HR Recruiter Notification Hover Dropdown */
              <div
                className={`settings-dropdown-wrapper ${mobileMenuOpen === 'notifications' ? 'is-open' : ''}`}
              >
                <button
                  type="button"
                  className={`settings-nav-pill ${isNotificationsActive ? 'active' : ''}`}
                  onClick={(e) => {
                    if (window.innerWidth <= 768) {
                      handleMobileToggle('notifications', e);
                    } else {
                      navigate('/dashboard/settings/notifications?tab=candidate');
                    }
                  }}
                  aria-expanded={mobileMenuOpen === 'notifications'}
                  aria-haspopup="true"
                  title="Candidate & HR Notification Channels"
                >
                  <span>Notification Settings</span>
                  <span className="nav-pill-chevron">
                    <i className="bi bi-chevron-down"></i>
                  </span>
                </button>

                {/* Dropdown Menu (Pure CSS Hover + Mobile Touch Toggle) */}
                <div className="settings-dropdown-menu" role="menu">
                  <div className="settings-dropdown-header">
                    Notification Preferences
                  </div>

                  {/* Candidate Notify Preferences */}
                  <Link
                    to="/dashboard/settings/notifications?tab=candidate"
                    className={`settings-dropdown-item ${isCandidateNotifActive ? 'active' : ''}`}
                    onClick={handleItemClick}
                    role="menuitem"
                  >
                    <div className="settings-dropdown-icon">
                      <i className="bi bi-megaphone-fill"></i>
                    </div>
                    <div className="settings-dropdown-text">
                      <div className="settings-dropdown-title-row">
                        <span className="settings-dropdown-title">Notify Preferences (Candidate)</span>
                        <span className="settings-dropdown-badge">Candidate</span>
                      </div>
                      <p className="settings-dropdown-desc">
                        Manage automated candidate emails &amp; in-app alerts for shortlist, interview, &amp; rejection.
                      </p>
                    </div>
                  </Link>

                  {/* HR Notification Preferences */}
                  <Link
                    to="/dashboard/settings/notifications?tab=hr"
                    className={`settings-dropdown-item ${isHrNotifActive ? 'active' : ''}`}
                    onClick={handleItemClick}
                    role="menuitem"
                  >
                    <div className="settings-dropdown-icon">
                      <i className="bi bi-bell-fill"></i>
                    </div>
                    <div className="settings-dropdown-text">
                      <div className="settings-dropdown-title-row">
                        <span className="settings-dropdown-title">HR Notification Preferences</span>
                        <span className="settings-dropdown-badge">Recruiter</span>
                      </div>
                      <p className="settings-dropdown-desc">
                        Configure recruiter in-app bell notifications and activity alerts.
                      </p>
                    </div>
                  </Link>

                  {/* 3. Sent Email Notification History */}
                  <Link
                    to="/dashboard/settings/notifications?tab=email-history"
                    className={`settings-dropdown-item ${isEmailHistoryActive ? 'active' : ''}`}
                    onClick={handleItemClick}
                    role="menuitem"
                  >
                    <div className="settings-dropdown-icon">
                      <i className="bi bi-envelope-check-fill" style={{ color: '#059669' }}></i>
                    </div>
                    <div className="settings-dropdown-text">
                      <div className="settings-dropdown-title-row">
                        <span className="settings-dropdown-title">Sent Email History</span>
                        <span className="settings-dropdown-badge" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>Audit</span>
                      </div>
                      <p className="settings-dropdown-desc">
                        Recruiter-specific audit log of all automated &amp; scheduled candidate emails.
                      </p>
                    </div>
                  </Link>

                  {/* 4. App Notification History */}
                  <Link
                    to="/dashboard/settings/notifications?tab=app-history"
                    className={`settings-dropdown-item ${isAppHistoryActive ? 'active' : ''}`}
                    onClick={handleItemClick}
                    role="menuitem"
                  >
                    <div className="settings-dropdown-icon">
                      <i className="bi bi-app-indicator" style={{ color: '#0284c7' }}></i>
                    </div>
                    <div className="settings-dropdown-text">
                      <div className="settings-dropdown-title-row">
                        <span className="settings-dropdown-title">App Notification History</span>
                        <span className="settings-dropdown-badge" style={{ background: '#f0f9ff', color: '#0284c7', borderColor: '#bae6fd' }}>Audit</span>
                      </div>
                      <p className="settings-dropdown-desc">
                        Recruiter-specific history of real-time in-app alerts sent to candidates.
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            ) : (
              /* Job Seeker Direct In-App Notification Preferences Link */
              <NavLink
                to="/dashboard/settings/notifications"
                className={`settings-nav-pill ${isNotificationsActive ? 'active' : ''}`}
                title="Job Seeker In-App Notification Alerts"
              >
                <span>Notification Preferences</span>
              </NavLink>
            )}

            {/* 3. Appearance Settings (Direct Link) */}
            <NavLink
              to="/dashboard/settings/appearance"
              className={`settings-nav-pill ${isAppearanceActive ? 'active' : ''}`}
              title="Interface Visual Theme & Display Preferences"
            >
              <span>Appearance Settings</span>
            </NavLink>

            {/* 4. Security (Hover & Touch Dropdown) */}
            <div
              className={`settings-dropdown-wrapper align-right ${mobileMenuOpen === 'security' ? 'is-open' : ''}`}
            >
              <button
                type="button"
                className={`settings-nav-pill ${isSecurityActive ? 'active' : ''}`}
                onClick={(e) => {
                  if (window.innerWidth <= 768) {
                    handleMobileToggle('security', e);
                  } else {
                    navigate(isHr ? '/dashboard/settings/security/email' : '/dashboard/settings/security/account');
                  }
                }}
                aria-expanded={mobileMenuOpen === 'security'}
                aria-haspopup="true"
                title="Security Credentials & Account Protection"
              >
                <span>Security</span>
                <span className="nav-pill-chevron">
                  <i className="bi bi-chevron-down"></i>
                </span>
              </button>

              {/* Dropdown Menu */}
              <div
                className="settings-dropdown-menu"
                role="menu"
              >
                <div className="settings-dropdown-header">
                  Platform Security &amp; Credentials
                </div>

                {/* Email Credential Settings (Only for HR) */}
                {isHr && (
                  <Link
                    to="/dashboard/settings/security/email"
                    className={`settings-dropdown-item ${isEmailSmtpActive ? 'active' : ''}`}
                    onClick={handleItemClick}
                    role="menuitem"
                  >
                    <div className="settings-dropdown-icon">
                      <i className="bi bi-envelope-at-fill"></i>
                    </div>
                    <div className="settings-dropdown-text">
                      <div className="settings-dropdown-title-row">
                        <span className="settings-dropdown-title">Email Credential Settings</span>
                        <span className="settings-dropdown-badge">SMTP</span>
                      </div>
                      <p className="settings-dropdown-desc">
                        Personal Gmail SMTP credentials, AES-256-GCM app password &amp; verification.
                      </p>
                    </div>
                  </Link>
                )}

                {/* Account Settings */}
                <Link
                  to="/dashboard/settings/security/account"
                  className={`settings-dropdown-item ${isAccountSecActive ? 'active' : ''}`}
                  onClick={handleItemClick}
                  role="menuitem"
                >
                  <div className="settings-dropdown-icon">
                    <i className="bi bi-key-fill"></i>
                  </div>
                  <div className="settings-dropdown-text">
                    <div className="settings-dropdown-title-row">
                      <span className="settings-dropdown-title">Account Settings</span>
                      <span className="settings-dropdown-badge">Auth</span>
                    </div>
                    <p className="settings-dropdown-desc">
                      Update account login password, active session tokens &amp; credential security.
                    </p>
                  </div>
                </Link>

                {/* Delete My Account */}
                <Link
                  to="/dashboard/settings/security/delete"
                  className={`settings-dropdown-item danger-item ${isDeleteSecActive ? 'active' : ''}`}
                  onClick={handleItemClick}
                  role="menuitem"
                >
                  <div className="settings-dropdown-icon">
                    <i className="bi bi-trash3-fill"></i>
                  </div>
                  <div className="settings-dropdown-text">
                    <div className="settings-dropdown-title-row">
                      <span className="settings-dropdown-title" style={{ color: '#dc2626' }}>Delete My Account</span>
                      <span className="settings-dropdown-badge danger">Danger</span>
                    </div>
                    <p className="settings-dropdown-desc">
                      {isHr
                        ? 'Permanently delete your HR recruiter account and associated ATS candidate data.'
                        : 'Permanently delete your Job Seeker profile, stored resumes, and analysis history.'}
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Header */}
      <div className="page-header-row" style={{ marginBottom: '22px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.65rem', fontWeight: 800, margin: '0 0 6px 0' }}>
            <i className={`bi ${pageInfo.icon}`} style={{ color: 'var(--accent)' }}></i>
            {pageInfo.title}
          </h1>
          <p className="page-subtitle" style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.92rem' }}>
            {isHr
              ? 'Configure your personal workspace, multi-channel recruitment notifications, AES-256-GCM SMTP credentials, and platform security.'
              : 'Configure your candidate profile, real-time in-app alerts, visual appearance, and account security.'}
          </p>
        </div>
      </div>

      {/* Main Content Area - Full Width */}
      <main className="settings-main-content" style={{ width: '100%' }}>
        {children}
      </main>
    </div>
  );
}
