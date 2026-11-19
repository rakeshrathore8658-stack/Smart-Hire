import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import SettingsLayout from './SettingsLayout';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/client';
import ConfirmPopover from '../../components/common/ConfirmPopover';

export default function SecuritySettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateUser, isHr, logout } = useAuth();
  const { isDark } = useTheme();

  // Determine active sub-tab from path or query
  const getInitialTab = () => {
    const p = location.pathname;
    if (p.includes('/account')) return 'account';
    if (p.includes('/delete')) return 'delete';
    return isHr ? 'email' : 'account'; // If Job Seeker, default directly to 'account'
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname]);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    navigate(`/dashboard/settings/security/${tab}`);
  };

  // ==========================================
  // 1. EMAIL CREDENTIAL (SMTP) STATE
  // ==========================================
  const [smtpLoading, setSmtpLoading] = useState(true);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpDeleting, setSmtpDeleting] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);

  const [smtpData, setSmtpData] = useState(null);
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAppPassHelp, setShowAppPassHelp] = useState(false);
  const [smtpAlert, setSmtpAlert] = useState(null);

  const fetchSmtpSettings = async () => {
    try {
      setSmtpLoading(true);
      const res = await api.get('/hr/email-settings');
      const data = res.data?.setting || res.data;
      if (data && Boolean(data.configured) && Boolean(data.active)) {
        setSmtpData(data);
        setSenderEmail(data.senderEmail || '');
        setSenderName(data.senderName || '');
      } else {
        setSmtpData(null);
        setSenderEmail('');
        setSenderName('');
      }
    } catch (err) {
      console.warn('Could not load SMTP settings:', err);
      setSmtpData(null);
    } finally {
      setSmtpLoading(false);
    }
  };

  useEffect(() => {
    fetchSmtpSettings();
  }, []);

  const handleSmtpSave = async (e) => {
    e.preventDefault();
    const cleanEmail = senderEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.endsWith('gmail.com')) {
      setSmtpAlert({ type: 'danger', message: 'Please provide a valid Gmail address (@gmail.com).' });
      return;
    }
    const cleanPwd = appPassword.trim().replace(/\s+/g, '');
    if (!cleanPwd || cleanPwd.length < 12) {
      setSmtpAlert({ type: 'danger', message: 'Please enter a valid 16-character Google App Password.' });
      return;
    }

    try {
      setSmtpSaving(true);
      setSmtpAlert(null);
      const payload = {
        senderEmail: cleanEmail,
        senderName: senderName.trim() || undefined,
        appPassword: appPassword.trim(),
      };
      const res = await api.post('/hr/email-settings', payload);
      setSmtpAlert({
        type: 'success',
        message: res.data?.message || 'SMTP settings configured successfully! Click "Test Connection" to verify with Google.',
      });
      setAppPassword('');
      await fetchSmtpSettings();
    } catch (err) {
      setSmtpAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to save SMTP credentials. Please check your inputs.',
      });
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleSmtpTest = async () => {
    try {
      setSmtpTesting(true);
      setSmtpAlert(null);

      const res = await api.post('/hr/email-settings/test', {});
      if (res.data?.success && res.data?.result === 'SUCCESS') {
        setSmtpAlert({
          type: 'success',
          message: res.data.message || 'SMTP Connection verified successfully! A test email has been sent to ' + (smtpData?.senderEmail || ''),
        });
        await fetchSmtpSettings();
      } else {
        setSmtpAlert({
          type: 'danger',
          message: res.data?.message || 'SMTP connection verification failed. Please verify credentials.',
        });
      }
    } catch (err) {
      setSmtpAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Connection test failed. Check your Gmail App Password and ensure 2-Step Verification is active.',
      });
    } finally {
      setSmtpTesting(false);
    }
  };

  const handleSmtpDelete = async () => {
    if (!window.confirm('Are you sure you want to remove your custom SMTP configuration? All automated emails will be paused until re-configured.')) {
      return;
    }

    try {
      setSmtpDeleting(true);
      setSmtpAlert(null);
      await api.delete('/hr/email-settings');
      setSmtpData(null);
      setSenderEmail('');
      setSenderName('');
      setAppPassword('');
      setSmtpAlert({
        type: 'info',
        message: 'Custom SMTP configuration removed successfully. Status reset to unconfigured.',
      });
      await fetchSmtpSettings();
    } catch (err) {
      setSmtpAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to delete SMTP configuration.',
      });
    } finally {
      setSmtpDeleting(false);
    }
  };

  // ==========================================
  // 2. ACCOUNT SETTINGS STATE
  // ==========================================
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordAlert, setPasswordAlert] = useState(null);

  // Role switch state (Strict 1-Time Limit)
  const [switchingRole, setSwitchingRole] = useState(false);
  const [roleAlert, setRoleAlert] = useState(null);
  const [roleSwitchCount, setRoleSwitchCount] = useState(0);
  const [canSwitchRole, setCanSwitchRole] = useState(true);

  useEffect(() => {
    const fetchAccountSettings = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data) {
          if (res.data.roleSwitchCount !== undefined) {
            setRoleSwitchCount(res.data.roleSwitchCount);
          }
          if (res.data.canSwitchRole !== undefined) {
            setCanSwitchRole(Boolean(res.data.canSwitchRole));
          } else if (res.data.roleSwitchCount !== undefined) {
            setCanSwitchRole(res.data.roleSwitchCount < 1);
          }
        }
      } catch (err) {
        console.warn('Could not load account role switch status:', err);
      }
    };
    fetchAccountSettings();
  }, []);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordAlert(null);

    if (newPassword !== confirmPassword) {
      setPasswordAlert({ type: 'danger', message: 'New passwords do not match. Please verify and try again.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordAlert({ type: 'danger', message: 'New password must be at least 6 characters long.' });
      return;
    }

    try {
      setPasswordLoading(true);
      await api.post('/settings/password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordAlert({ type: 'success', message: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordAlert(null), 4000);
    } catch (err) {
      setPasswordAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Error updating password. Please check your current password.',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRoleSwitch = async () => {
    if (!canSwitchRole || roleSwitchCount >= 1) {
      setRoleAlert({
        type: 'warning',
        message: 'Account role switch is locked. Workspace portal mode can strictly only be switched ONCE per account.',
      });
      return;
    }
    const targetRole = isHr ? 'JOB_SEEKER' : 'HR';
    try {
      setSwitchingRole(true);
      setRoleAlert(null);
      const res = await api.post('/settings/switch-role', { newRole: targetRole });
      if (res.data?.success) {
        updateUser({ role: targetRole });
        setCanSwitchRole(false);
        setRoleSwitchCount((prev) => prev + 1);
        setRoleAlert({ type: 'success', message: `Portal switched successfully to ${targetRole === 'HR' ? 'HR Recruiter' : 'Job Seeker'}. Redirecting...` });
        setTimeout(() => {
          window.location.href = targetRole === 'HR' ? '/dashboard/hr' : '/dashboard';
        }, 1200);
      }
    } catch (err) {
      setRoleAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to switch portal role.',
      });
    } finally {
      setSwitchingRole(false);
    }
  };

  // ==========================================
  // 3. DELETE ACCOUNT STATE
  // ==========================================
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState(null);

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      setDeleteAlert(null);
      await api.post('/settings/delete-account', {});
      alert('Your Smart-Hire account has been permanently deleted.');
      logout();
      window.location.href = '/login';
    } catch (err) {
      setDeleteAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to delete account. Please contact support.',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return 'Never tested';
    try {
      const d = new Date(dtStr);
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dtStr;
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    outline: 'none',
  };

  return (
    <SettingsLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Navigation Sub-Tabs */}
        <div className="settings-inner-subtabs">
          {/* Email Credentials Tab - Only for HR Recruiters */}
          {isHr && (
            <button
              type="button"
              onClick={() => handleTabSwitch('email')}
              className="settings-inner-subtab-btn"
              style={{
                background: activeTab === 'email' ? 'var(--card-bg)' : 'transparent',
                color: activeTab === 'email' ? 'var(--accent, #ea580c)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'email' ? '3px solid var(--accent, #ea580c)' : '3px solid transparent',
              }}
            >
              <i className="bi bi-envelope-at"></i>
              <span>Email Credential Settings</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleTabSwitch('account')}
            className="settings-inner-subtab-btn"
            style={{
              background: activeTab === 'account' ? 'var(--card-bg)' : 'transparent',
              color: activeTab === 'account' ? 'var(--accent, #ea580c)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'account' ? '3px solid var(--accent, #ea580c)' : '3px solid transparent',
            }}
          >
            <i className="bi bi-key"></i>
            <span>Account Settings</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('delete')}
            className="settings-inner-subtab-btn"
            style={{
              background: activeTab === 'delete' ? 'var(--card-bg)' : 'transparent',
              color: activeTab === 'delete' ? '#dc2626' : 'var(--text-secondary)',
              borderBottom: activeTab === 'delete' ? '3px solid #dc2626' : '3px solid transparent',
            }}
          >
            <i className="bi bi-trash3" style={{ color: activeTab === 'delete' ? '#dc2626' : 'inherit' }}></i>
            <span style={{ color: activeTab === 'delete' ? '#dc2626' : 'inherit' }}>Delete My Account</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: EMAIL CREDENTIAL SETTINGS (SMTP - HR ONLY)                         */}
        {/* ========================================================================= */}
        {isHr && activeTab === 'email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Alert Box */}
            {smtpAlert && (
              <div
                className={`alert alert-${smtpAlert.type}`}
                style={{
                  padding: '14px 18px',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  border: smtpAlert.type === 'success' ? '1px solid #86efac' : smtpAlert.type === 'danger' ? '1px solid #fca5a5' : '1px solid #93c5fd',
                  backgroundColor: smtpAlert.type === 'success' ? (isDark ? 'rgba(22, 101, 52, 0.25)' : '#f0fdf4') : (isDark ? 'rgba(185, 28, 28, 0.25)' : '#fef2f2'),
                  color: smtpAlert.type === 'success' ? (isDark ? '#86efac' : '#166534') : (isDark ? '#fca5a5' : '#991b1b'),
                }}
              >
                <i className={`bi ${smtpAlert.type === 'success' ? 'bi-check-circle-fill' : smtpAlert.type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'}`}></i>
                <span style={{ flex: 1 }}>{smtpAlert.message}</span>
                <button
                  type="button"
                  onClick={() => setSmtpAlert(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1.1rem' }}
                >
                  &times;
                </button>
              </div>
            )}

            {/* Current SMTP Status Summary Card */}
            {smtpLoading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div className="spinner-border spinner-border-sm" role="status" style={{ marginRight: '8px' }}></div>
                Loading SMTP configuration...
              </div>
            ) : smtpData ? (
              <div
                className="card"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 700 }}>
                      CURRENT SMTP STATUS
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                      <span
                        style={{
                          fontSize: '0.85rem',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          background: smtpData.isVerified ? (isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7') : (isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7'),
                          color: smtpData.isVerified ? (isDark ? '#4ade80' : '#166534') : (isDark ? '#fbbf24' : '#92400e'),
                          border: smtpData.isVerified ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <i className={`bi ${smtpData.isVerified ? 'bi-patch-check-fill' : 'bi-hourglass-split'}`}></i>
                        {smtpData.isVerified ? 'VERIFIED & ACTIVE' : 'CONFIGURED (UNVERIFIED)'}
                      </span>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {smtpData.senderEmail}
                      </strong>
                      {smtpData.senderName && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>({smtpData.senderName})</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleSmtpTest}
                      disabled={smtpTesting}
                      className="btn btn-outline-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '6px' }}
                    >
                      {smtpTesting ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status"></span>
                          Testing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-send"></i> Test Connection
                        </>
                      )}
                    </button>

                    <Link
                      to="/dashboard/settings/email/update"
                      className="btn btn-outline-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '6px', textDecoration: 'none' }}
                    >
                      <i className="bi bi-pencil-square"></i> Update Credential
                    </Link>

                    <button
                      type="button"
                      onClick={handleSmtpDelete}
                      disabled={smtpDeleting}
                      className="btn btn-outline-danger btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '6px' }}
                    >
                      {smtpDeleting ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status"></span>
                          Removing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-trash3"></i> Remove
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Status Summary Details */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    padding: '16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Configured Gmail Address</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{smtpData.senderEmail}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Sender Display Name</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{smtpData.senderName || user?.fullName || 'Not specified'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Verification Status</span>
                    <strong style={{ fontSize: '0.9rem', color: smtpData.isVerified ? (isDark ? '#4ade80' : '#166534') : (isDark ? '#fbbf24' : '#92400e') }}>
                      {smtpData.isVerified ? 'Verified & Active' : 'Unverified / Verification Pending'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Last Verified</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{formatDateTime(smtpData.lastTestedAt)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              /* Configure New SMTP Form */
              <div
                className="card"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Configure Recruiter Gmail SMTP
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Configure your personal Gmail credentials to send automated shortlist, interview invite, and candidate status notifications directly from your own identity.
                  </p>
                </div>

                <form onSubmit={handleSmtpSave}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '18px' }}>
                    <div>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                        Sender Display Name (Optional)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="e.g. Information Tech / Rakesh Rathore"
                        style={inputStyle}
                      />
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                        This name will appear as the "From" display name in the candidate's inbox.
                      </small>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                        Gmail Address <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        placeholder="e.g. yourname@gmail.com"
                        required
                        style={inputStyle}
                      />
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                        All automated candidate emails will be sent directly through this address.
                      </small>
                    </div>
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', margin: 0, color: 'var(--text-primary)' }}>
                        16-Digit Google App Password <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAppPassHelp(!showAppPassHelp)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent, #ea580c)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <i className="bi bi-question-circle"></i> How to generate App Password?
                      </button>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        value={appPassword}
                        onChange={(e) => setAppPassword(e.target.value)}
                        placeholder="abcd efgh ijkl mnop"
                        required
                        style={{ ...inputStyle, paddingRight: '42px', fontFamily: 'monospace' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                    </div>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="bi bi-shield-lock-fill" style={{ color: '#16a34a' }}></i>
                      Your App Password is encrypted at rest using enterprise AES-256-GCM authenticated encryption and is never logged or exposed.
                    </small>
                  </div>

                  {/* App Password Instructions Box */}
                  {showAppPassHelp && (
                    <div
                      style={{
                        background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
                        border: isDark ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #fef3c7',
                        borderRadius: '8px',
                        padding: '14px 18px',
                        marginBottom: '18px',
                        fontSize: '0.82rem',
                        color: isDark ? '#fde68a' : '#92400e',
                      }}
                    >
                      <strong style={{ display: 'block', marginBottom: '6px' }}>How to generate a Google App Password:</strong>
                      <ol style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.6 }}>
                        <li>Open your <strong>Google Account Settings</strong> (myaccount.google.com).</li>
                        <li>Go to the <strong>Security</strong> tab and ensure <strong>2-Step Verification</strong> is ON.</li>
                        <li>Search for <strong>"App Passwords"</strong> in the search bar.</li>
                        <li>Give it an App name (e.g. <code>SmartHire Recruiter</code>) and click <strong>Create</strong>.</li>
                        <li>Copy the generated 16-character code (e.g. <code>abcd efgh ijkl mnop</code>) and paste it above.</li>
                      </ol>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={smtpSaving}
                      className="btn btn-primary"
                      style={{
                        background: 'var(--accent, #ea580c)',
                        borderColor: 'var(--accent, #ea580c)',
                        padding: '10px 24px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#ffffff',
                      }}
                    >
                      {smtpSaving ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status"></span>
                          Configuring SMTP...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-save"></i> Save SMTP Credentials
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ACCOUNT SETTINGS                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Password Update Card */}
            <div
              className="card"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Change Account Password
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Update your authentication credentials to keep your Smart-Hire recruiter account secure.
                </p>
              </div>

              {passwordAlert && (
                <div
                  className={`alert alert-${passwordAlert.type}`}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    marginBottom: '16px',
                    border: passwordAlert.type === 'success' ? '1px solid #86efac' : '1px solid #fca5a5',
                    backgroundColor: passwordAlert.type === 'success' ? (isDark ? 'rgba(22, 101, 52, 0.25)' : '#f0fdf4') : (isDark ? 'rgba(185, 28, 28, 0.25)' : '#fef2f2'),
                    color: passwordAlert.type === 'success' ? (isDark ? '#86efac' : '#166534') : (isDark ? '#fca5a5' : '#991b1b'),
                  }}
                >
                  {passwordAlert.message}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                    Current Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current account password"
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                      New Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                      Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="btn btn-primary"
                    style={{
                      background: 'var(--accent, #ea580c)',
                      borderColor: 'var(--accent, #ea580c)',
                      padding: '10px 24px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      color: '#ffffff',
                    }}
                  >
                    {passwordLoading ? 'Updating Password...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>

            {/* Portal Role Switcher Card */}
            <div
              className="card"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Account Type &amp; Active Portal
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Switch seamlessly between HR Recruiter and Job Seeker workspace modes without losing your account history.
                </p>
              </div>

              {roleAlert && (
                <div
                  className={`alert alert-${roleAlert.type}`}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    marginBottom: '16px',
                  }}
                >
                  {roleAlert.message}
                </div>
              )}

              {/* Strict 1-Time Limit Warning / Lock Banner */}
              {!canSwitchRole || roleSwitchCount >= 1 ? (
                <div
                  style={{
                    background: isDark ? 'rgba(234, 88, 12, 0.15)' : '#fff7ed',
                    border: '1px solid #fdba74',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    fontSize: '0.85rem',
                    color: isDark ? '#fdba74' : '#c2410c',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <i className="bi bi-shield-lock-fill" style={{ fontSize: '1.2rem', flexShrink: 0 }}></i>
                  <div>
                    <strong>Portal Mode Locked (1-Time Limit Reached):</strong> You have already switched your portal workspace mode once. To maintain account integrity and avoid data inconsistencies, mode switching is strictly limited to <strong>1 time per account</strong>.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: isDark ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    fontSize: '0.82rem',
                    color: isDark ? '#93c5fd' : '#1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <i className="bi bi-info-circle-fill" style={{ flexShrink: 0 }}></i>
                  <span>
                    <strong>Strict 1-Time Policy:</strong> You can switch between HR Recruiter and Job Seeker workspace modes <strong>only ONCE</strong>. Once switched, the active portal will be permanently locked.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current Active Mode:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        background: isHr ? (isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe') : (isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7'),
                        color: isHr ? (isDark ? '#93c5fd' : '#1e40af') : (isDark ? '#fcd34d' : '#92400e'),
                      }}
                    >
                      {isHr ? 'HR / RECRUITER PORTAL' : 'JOB SEEKER PORTAL'}
                    </span>
                    {!canSwitchRole && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className="bi bi-lock-fill"></i> Permanently Locked
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRoleSwitch}
                  disabled={switchingRole || !canSwitchRole}
                  className="btn btn-outline-secondary"
                  style={{
                    borderRadius: '8px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: !canSwitchRole ? 0.6 : 1,
                    cursor: !canSwitchRole ? 'not-allowed' : 'pointer',
                  }}
                >
                  <i className={`bi ${!canSwitchRole ? 'bi-lock-fill' : 'bi-arrow-repeat'}`}></i>
                  {!canSwitchRole
                    ? 'Role Switch Locked (1-Time Limit Reached)'
                    : switchingRole
                    ? 'Switching Role...'
                    : `Switch to ${isHr ? 'Job Seeker Portal' : 'HR Recruiter Portal'}`}
                </button>
              </div>
            </div>

            {/* Privacy & Data Retention Card */}
            <div
              className="card"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Privacy &amp; Data Archive
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Download a JSON archive copy of your account profile, job vacancies, and preferences.
              </p>
              <button
                type="button"
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user || {}, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", `smarthire_user_archive_${user?.id || 'export'}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }}
                className="btn btn-outline-secondary btn-sm"
                style={{ borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="bi bi-download"></i> Download My Data Archive
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: DELETE MY ACCOUNT                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'delete' && (
          <div
            className="card"
            style={{
              background: isDark ? 'rgba(220, 38, 38, 0.12)' : '#fff5f5',
              border: isDark ? '1px solid rgba(220, 38, 38, 0.35)' : '2px solid #fecaca',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: isDark ? 'rgba(220, 38, 38, 0.25)' : '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                }}
              >
                <i className="bi bi-exclamation-triangle-fill"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: isDark ? '#fca5a5' : '#991b1b' }}>
                  Danger Zone: Delete Account
                </h3>
                <span style={{ fontSize: '0.82rem', color: isDark ? '#f87171' : '#b91c1c' }}>Irreversible account erasure</span>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: isDark ? '#fca5a5' : '#7f1d1d', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              {isHr
                ? 'Permanently delete your Smart-Hire account. All published job postings, candidate evaluations, parsed resume attachments, screening questions, and notification settings will be permanently erased. This action cannot be reversed.'
                : 'Permanently delete your Smart-Hire account. Your Job Seeker profile, uploaded resumes, ATS match scores, job applications, and notification preferences will be permanently erased. This action cannot be reversed.'}
            </p>

            {deleteAlert && (
              <div
                className="alert alert-danger"
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  marginBottom: '16px',
                }}
              >
                {deleteAlert.message}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <ConfirmPopover
                title="Permanently Delete Account?"
                message={isHr
                  ? 'Are you completely certain? All your recruiter jobs, candidate scorecards, and data will be permanently wiped from the database.'
                  : 'Are you completely certain? Your candidate profile, parsed resumes, and application records will be permanently wiped from the database.'}
                confirmText="Yes, Delete My Account"
                confirmVariant="danger"
                onConfirm={handleDeleteAccount}
              >
                <button
                  type="button"
                  disabled={deleteLoading}
                  className="btn btn-danger"
                  style={{
                    background: '#dc2626',
                    borderColor: '#dc2626',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <i className="bi bi-trash3-fill"></i>
                  {deleteLoading ? 'Deleting Account...' : 'Permanently Delete My Account'}
                </button>
              </ConfirmPopover>
            </div>
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
