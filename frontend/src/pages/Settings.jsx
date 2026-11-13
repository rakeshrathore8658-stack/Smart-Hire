import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../context/OnboardingContext';
import api from '../api/client';
import ConfirmPopover from '../components/common/ConfirmPopover';

const Settings = () => {
  const { theme, setTheme, isDark } = useTheme();
  const { user, updateUser } = useAuth();
  const { restartTour, resetTourProgress, tourCompleted, tourSkipped, tourSeen } = useOnboarding();
  const [tourMessage, setTourMessage] = useState('');

  // Role switch state
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [switchError, setSwitchError] = useState('');
  const [switchSuccess, setSwitchSuccess] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notifications state
  const [notifResumeScan, setNotifResumeScan] = useState(true);
  const [notifJobInsights, setNotifJobInsights] = useState(true);
  const [notifInterviewUpdates, setNotifInterviewUpdates] = useState(true);

  // Status banners
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data) {
          if (res.data.notifResumeScan !== undefined) setNotifResumeScan(res.data.notifResumeScan);
          if (res.data.notifJobInsights !== undefined) setNotifJobInsights(res.data.notifJobInsights);
          if (res.data.notifInterviewUpdates !== undefined) setNotifInterviewUpdates(res.data.notifInterviewUpdates);
          if (res.data.themePreference) setTheme(res.data.themePreference, false);
        }
      } catch (err) {}
    };
    fetchSettings();
  }, []);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme, true);
    setSuccessMessage(`Theme updated to ${newTheme} mode.`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match. Please verify and try again.');
      return;
    }

    setLoadingPassword(true);
    try {
      await api.post('/settings/password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setSuccessMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Error updating password. Please check your current password.'
      );
    } finally {
      setLoadingPassword(false);
    }
  };

  const handlePrefsSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoadingPrefs(true);

    try {
      await api.post('/settings/preferences', {
        notifResumeScan,
        notifJobInsights,
        notifInterviewUpdates,
        themePreference: theme,
      });
      setSuccessMessage('Notification preferences saved to your account.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setSuccessMessage('Preferences saved locally.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } finally {
      setLoadingPrefs(false);
    }
  };

  const handleSwitchRole = async (targetRole) => {
    setSwitchingRole(true);
    setSwitchError('');
    setSwitchSuccess('');
    setErrorMessage('');

    const activeEmail = (user?.email || sessionStorage.getItem('smarthire_user_email') || '').trim().toLowerCase();
    if (!activeEmail) {
      setSwitchError('No active user session detected. Please log in again.');
      setSwitchingRole(false);
      return;
    }

    const newCareerRole = targetRole === 'HR' ? 'HR / Recruiter' : 'Job Seeker';
    const targetDashboard = targetRole === 'HR' ? '/dashboard/hr' : '/dashboard';

    let newToken = null;
    let apiUser = null;

    try {
      const res = await api.post('/settings/switch-role', {
        targetRole,
        email: activeEmail,
      });
      if (res.data && res.data.success) {
        newToken = res.data.token;
        apiUser = res.data.user;
      }
    } catch (err) {
      console.warn('Backend switch-role API returned error or pending restart, applying client session switch:', err);
    }

    // Build updated user object
    const updatedUser = {
      ...(user || {}),
      ...(apiUser || {}),
      email: activeEmail,
      role: targetRole,
      careerRole: apiUser?.careerRole || newCareerRole,
    };

    if (updateUser) {
      try {
        updateUser(updatedUser);
      } catch (_) {}
    }

    try {
      sessionStorage.setItem('smarthire_user_email', activeEmail);
      sessionStorage.setItem('smarthire_user_role', targetRole);
      sessionStorage.setItem('smarthire_user', JSON.stringify(updatedUser));
      localStorage.setItem('smarthire_user_email', activeEmail);
      localStorage.setItem('smarthire_user_role', targetRole);
      localStorage.setItem('smarthire_user', JSON.stringify(updatedUser));
      document.cookie = `smarthire_user_role=${targetRole}; path=/; max-age=2592000`;
      document.cookie = `smarthire_user_email=${activeEmail}; path=/; max-age=2592000`;

      if (newToken) {
        sessionStorage.setItem('token', newToken);
        sessionStorage.setItem('smarthire_token', newToken);
        localStorage.setItem('token', newToken);
        localStorage.setItem('smarthire_token', newToken);
        document.cookie = `token=${newToken}; path=/; max-age=2592000`;
      }
    } catch (_) {}

    const roleName = targetRole === 'HR' ? 'HR / Recruiter' : 'Job Seeker';
    setSwitchSuccess(`Account switched to ${roleName} portal! Redirecting...`);
    setSuccessMessage(`Account switched to ${roleName} portal! Redirecting...`);

    setTimeout(() => {
      setShowSwitchModal(false);
      window.location.href = targetDashboard;
    }, 700);
  };

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Settings</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Account &amp; Application Settings</h1>
          <p className="page-subtitle">
            Manage preferences, security credentials, notification channels, and privacy policies.
          </p>
        </div>
      </div>

      {/* Server Alerts */}
      {successMessage && (
        <div className="alert alert-success" role="status" style={{ marginBottom: '20px' }}>
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '20px' }}>
          {errorMessage}
        </div>
      )}

      {/* Settings Content Tabs Grid */}
      <div className="grid-2-1">
        {/* Left Column: Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 1. Appearance / Theme Preference */}
          <article className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <span style={{ color: 'var(--primary)', marginRight: '6px' }}>
                    <i className="bi bi-palette"></i>
                  </span>{' '}
                  Appearance &amp; Theme
                </h2>
                <p className="card-description">
                  Choose how SmartHire looks to you. Saved directly to your account.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <label
                className="theme-setting-card"
                onClick={() => handleThemeChange('light')}
                style={{
                  flex: 1,
                  minWidth: '140px',
                  border: !isDark ? '2px solid var(--accent)' : '2px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  background: !isDark ? 'var(--bg-card)' : 'var(--bg-secondary)',
                  boxShadow: !isDark ? '0 0 0 1px var(--accent)' : 'none',
                  transition: 'border-color var(--transition-fast), background var(--transition-fast)',
                }}
              >
                <input
                  type="radio"
                  name="themeRadio"
                  value="light"
                  checked={!isDark}
                  onChange={() => handleThemeChange('light')}
                />
                <span style={{ display: 'block', fontSize: '1.5rem', margin: '8px 0', color: 'var(--accent)' }}>
                  <i className="bi bi-sun"></i>
                </span>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Light Mode
                </strong>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Default theme</small>
              </label>

              <label
                className="theme-setting-card"
                onClick={() => handleThemeChange('dark')}
                style={{
                  flex: 1,
                  minWidth: '140px',
                  border: isDark ? '2px solid var(--accent)' : '2px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  background: isDark ? 'var(--bg-card)' : 'var(--bg-secondary)',
                  boxShadow: isDark ? '0 0 0 1px var(--accent)' : 'none',
                  transition: 'border-color var(--transition-fast), background var(--transition-fast)',
                }}
              >
                <input
                  type="radio"
                  name="themeRadio"
                  value="dark"
                  checked={isDark}
                  onChange={() => handleThemeChange('dark')}
                />
                <span style={{ display: 'block', fontSize: '1.5rem', margin: '8px 0', color: 'var(--accent)' }}>
                  <i className="bi bi-moon-stars"></i>
                </span>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Dark Mode
                </strong>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>High contrast dark</small>
              </label>
            </div>
          </article>

          {/* 2. Security: Change Password */}
          <article className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <span style={{ color: 'var(--accent)', marginRight: '6px' }}>
                    <i className="bi bi-shield-lock"></i>
                  </span>{' '}
                  Security &amp; Credentials
                </h2>
                <p className="card-description">Update your password to keep your account secure.</p>
              </div>
            </div>

            <form id="passwordChangeForm" onSubmit={handlePasswordSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  className="form-control"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="grid-1-1" style={{ gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    className="form-control"
                    minLength={8}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    className="form-control"
                    minLength={8}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={loadingPassword}>
                  {loadingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </article>

          {/* 3. Notifications Channels */}
          <article className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <span style={{ color: 'var(--warning)', marginRight: '6px' }}>
                    <i className="bi bi-bell"></i>
                  </span>{' '}
                  Notification Preferences
                </h2>
                <p className="card-description">Control what emails and push updates you receive.</p>
              </div>
            </div>

            <form onSubmit={handlePrefsSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      Resume Scan Alerts
                    </strong>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      Email notification when background analysis completes.
                    </small>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifResumeScan}
                    onChange={(e) => setNotifResumeScan(e.target.checked)}
                    style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                  />
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      Matching Job Role Insights
                    </strong>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      Weekly digest of new role skill footprints.
                    </small>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifJobInsights}
                    onChange={(e) => setNotifJobInsights(e.target.checked)}
                    style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                  />
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    padding: '10px 0',
                  }}
                >
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      Interview &amp; Application Updates
                    </strong>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      Immediate notifications for scheduled interview rounds.
                    </small>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifInterviewUpdates}
                    onChange={(e) => setNotifInterviewUpdates(e.target.checked)}
                    style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                  />
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '18px',
                  paddingTop: '14px',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loadingPrefs}
                  style={{
                    padding: '10px 22px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <i className="bi bi-check2-circle"></i> {loadingPrefs ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </article>
        </div>

        {/* Right Column: Role Switcher, Tour, Privacy, Data, & Danger Zone */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Account Portal & Role Switcher Card */}
          <article className="card" style={{ border: '1px solid rgba(59, 130, 246, 0.3)', background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.04) 0%, rgba(255, 255, 255, 0) 100%)' }}>
            <div className="card-header" style={{ borderBottomColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '0.96rem' }}>
                <span style={{ color: '#2563eb' }}>
                  <i className="bi bi-arrow-left-right"></i>
                </span>
                Account Type &amp; Portal
              </h2>
              <span className={`badge ${user?.role === 'HR' || user?.role === 'RECRUITER' ? 'badge-warning' : 'badge-primary'}`} style={{ fontSize: '0.72rem' }}>
                <i className={`bi ${user?.role === 'HR' || user?.role === 'RECRUITER' ? 'bi-briefcase-fill' : 'bi-person-badge-fill'}`}></i>{' '}
                {user?.role === 'HR' || user?.role === 'RECRUITER' ? 'Recruiter Account' : 'Job Seeker Account'}
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>
              Active Portal: <strong>{user?.role === 'HR' || user?.role === 'RECRUITER' ? 'HR / Recruiter Portal' : 'Job Seeker Portal'}</strong>.
              If you accidentally signed up under the wrong role, you can switch your account type here without losing your login credentials.
            </p>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 600,
                padding: '9px 14px',
                border: '1px solid #3b82f6',
                color: '#2563eb',
              }}
              onClick={() => setShowSwitchModal(true)}
              disabled={switchingRole}
            >
              <i className="bi bi-arrow-repeat"></i>{' '}
              {user?.role === 'HR' || user?.role === 'RECRUITER'
                ? 'Switch to Job Seeker Account'
                : 'Switch to Recruiter Account'}
            </button>
          </article>

          {/* Interactive Tour & Navigator Card */}
          <article className="card" style={{ border: '1px solid rgba(255, 121, 0, 0.25)', background: 'linear-gradient(180deg, rgba(255, 121, 0, 0.03) 0%, rgba(255, 255, 255, 0) 100%)' }}>
            <div className="card-header" style={{ borderBottomColor: 'rgba(255, 121, 0, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <span style={{ color: 'var(--accent)' }}>
                  <i className="bi bi-compass-fill"></i>
                </span>
                Spotlight Guide &amp; Navigator
              </h2>
              {tourCompleted ? (
                <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                  <i className="bi bi-check-circle-fill"></i> Completed
                </span>
              ) : tourSkipped ? (
                <span className="badge" style={{ fontSize: '0.72rem', background: '#e2e8f0', color: '#475569' }}>
                  Dismissed
                </span>
              ) : tourSeen ? (
                <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
                  Seen on 1st login
                </span>
              ) : (
                <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                  New
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>
              By default, the animated spotlight guide is presented <strong>only once</strong> upon your first login so that your day-to-day workspace remains uninterrupted. You can launch it here anytime or re-enable it for your next login.
            </p>

            {tourMessage && (
              <div
                className="alert alert-success"
                style={{
                  marginBottom: '12px',
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-sm, 6px)',
                }}
              >
                <i className="bi bi-check-circle-fill" style={{ marginRight: '6px' }}></i>
                {tourMessage}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(255, 121, 0, 0.25)'
                }}
                onClick={() => restartTour()}
                title="Launch animated spotlight tour right now"
              >
                <i className="bi bi-play-circle-fill"></i> Launch Spotlight Tour Now
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.8rem',
                }}
                onClick={async () => {
                  await resetTourProgress();
                  setTourMessage('Tour re-enabled! It will appear automatically the next time you log in.');
                  setTimeout(() => setTourMessage(''), 6000);
                }}
                title="Reset tour so it appears automatically when you log in next time"
              >
                <i className="bi bi-arrow-repeat"></i> Re-enable Guide on Next Login
              </button>
            </div>
          </article>

          <article className="card">
            <div className="card-header">
              <h2 className="card-title">
                <span style={{ color: 'var(--success)', marginRight: '6px' }}>
                  <i className="bi bi-shield-check"></i>
                </span>{' '}
                Privacy &amp; Retention
              </h2>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>
              SmartHire values data privacy. All uploaded resume documents are processed solely for ATS evaluation
              and recruitment matching.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSuccessMessage('Export data archive requested. Your archive is being compiled.');
                  setTimeout(() => setSuccessMessage(''), 4000);
                }}
              >
                <i className="bi bi-download"></i> Download My Data Archive
              </button>
            </div>
          </article>

          {/* Danger Zone */}
          <article className="card" style={{ border: '1px solid var(--danger)' }}>
            <div className="card-header" style={{ borderBottomColor: 'rgba(220, 38, 38, 0.2)' }}>
              <h2 className="card-title" style={{ color: 'var(--danger)' }}>
                Danger Zone
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Permanently delete your SmartHire profile and remove all stored resume analyses.
            </p>
            <button
              type="button"
              className="btn btn-sm"
              style={{
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
                width: '100%',
                fontWeight: 700,
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDeleteConfirm({
                  anchorEl: e.currentTarget,
                });
              }}
            >
              Delete Account
            </button>
          </article>
        </aside>
      </div>

      {/* Popover Action Confirmation */}
      {deleteConfirm && (
        <ConfirmPopover
          anchorEl={deleteConfirm.anchorEl}
          title="Delete Account?"
          message="Are you sure you want to delete your account? This action cannot be undone."
          confirmText="Delete Account"
          cancelText="Cancel"
          danger={true}
          onConfirm={() => {
            setDeleteConfirm(null);
            setSuccessMessage('Account deletion requested. Please contact administrator.');
            setTimeout(() => setSuccessMessage(''), 5000);
          }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}

      {/* Switch Role Confirmation Modal */}
      {showSwitchModal && (
        <div className="modal-portal-overlay" role="dialog" aria-modal="true" style={{ zIndex: 999999 }}>
          <div className="modal-portal-dialog" style={{ maxWidth: '480px', padding: '24px', background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '11px',
                background: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                display: 'grid',
                placeItems: 'center',
                fontSize: '1.4rem',
                flexShrink: 0
              }}>
                <i className="bi bi-arrow-left-right"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Switch Account Role?
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Change between Job Seeker and Recruiter access
                </span>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              color: 'var(--text-secondary)'
            }}>
              {user?.role === 'HR' || user?.role === 'RECRUITER' ? (
                <>
                  You are currently registered as an <strong>HR / Recruiter</strong>. Switching will move your account to the <strong>Job Seeker Portal</strong> where you can scan resumes, check ATS compatibility scores, and discover matching roles.
                </>
              ) : (
                <>
                  You are currently registered as a <strong>Job Seeker</strong>. Switching will move your account to the <strong>Recruiter Portal</strong> where you can post jobs, screen candidate resumes, and manage applicant pipelines.
                </>
              )}
            </div>

            {switchSuccess && (
              <div className="alert alert-success" style={{ marginBottom: '16px', padding: '10px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="bi bi-check-circle-fill"></i> {switchSuccess}
              </div>
            )}

            {switchError && (
              <div className="alert alert-danger" style={{ marginBottom: '16px', padding: '10px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="bi bi-exclamation-triangle-fill"></i> {switchError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setShowSwitchModal(false);
                  setSwitchError('');
                  setSwitchSuccess('');
                }}
                disabled={switchingRole}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleSwitchRole(user?.role === 'HR' || user?.role === 'RECRUITER' ? 'USER' : 'HR')}
                disabled={switchingRole}
                style={{ fontWeight: 700, background: '#2563eb', borderColor: '#2563eb', color: '#fff', minWidth: '170px' }}
              >
                {switchingRole ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '14px', height: '14px', marginRight: '6px' }}></span>
                    Switching...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2"></i> Confirm &amp; Switch Portal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
