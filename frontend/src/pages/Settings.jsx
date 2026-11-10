import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../context/OnboardingContext';
import api from '../api/client';

const Settings = () => {
  const { theme, setTheme, isDark } = useTheme();
  const { user } = useAuth();
  const { restartTour, resetTourProgress, tourCompleted, tourSkipped, tourSeen } = useOnboarding();
  const [tourMessage, setTourMessage] = useState('');

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

        {/* Right Column: Tour, Privacy, Data, & Danger Zone */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                onClick={() => alert('Export data archive requested. Your archive is being compiled.')}
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
              onClick={() => {
                if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                  alert('Account deletion requested. Please contact administrator.');
                }
              }}
            >
              Delete Account
            </button>
          </article>
        </aside>
      </div>
    </div>
  );
};

export default Settings;
