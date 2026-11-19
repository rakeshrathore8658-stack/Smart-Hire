import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../api/client';

export default function HrEmailSettings() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [settingData, setSettingData] = useState(null);

  const [alert, setAlert] = useState(null); // { type: 'success' | 'danger' | 'info', message: '' }

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/hr/email-settings');
      const data = res.data?.setting || res.data;
      if (data && Boolean(data.configured) && Boolean(data.active)) {
        setSettingData(data);
        setSenderEmail(data.senderEmail || '');
        setSenderName(data.senderName || '');
      } else {
        setSettingData(null);
        setSenderEmail('');
        setSenderName('');
      }
    } catch (err) {
      console.warn('Could not load email settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    if (location.state?.updated) {
      setAlert({
        type: 'success',
        message: 'SMTP credentials updated successfully! You can verify live delivery with "Test Connection".',
      });
    }
  }, [location.state]);

  const handleSaveInitial = async (e) => {
    e.preventDefault();
    const cleanEmail = senderEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAlert({ type: 'danger', message: 'Please enter a valid Gmail address.' });
      return;
    }
    if (!cleanEmail.endsWith('gmail.com')) {
      setAlert({ type: 'danger', message: 'Please provide a Gmail address (@gmail.com).' });
      return;
    }
    if (!appPassword.trim()) {
      setAlert({ type: 'danger', message: 'Please enter your 16-character Google App Password.' });
      return;
    }
    if (appPassword.trim().replace(/\s+/g, '').length < 12) {
      setAlert({ type: 'danger', message: 'Google App Password must be 16 characters (e.g. abcd efgh ijkl mnop).' });
      return;
    }

    try {
      setSaving(true);
      setAlert(null);
      const payload = {
        senderEmail: cleanEmail,
        senderName: senderName.trim() || undefined,
        appPassword: appPassword.trim(),
      };
      const res = await api.post('/hr/email-settings', payload);
      setAlert({
        type: 'success',
        message: res.data?.message || 'SMTP settings configured successfully! Click "Test Connection" to verify with Google.',
      });
      setAppPassword('');
      fetchSettings();
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to save SMTP credentials. Please check input.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setAlert(null);

      const res = await api.post('/hr/email-settings/test', {});
      if (res.data?.success && res.data?.result === 'SUCCESS') {
        setAlert({
          type: 'success',
          message: res.data.message || 'SMTP Connection verified successfully! A test email has been sent to ' + (settingData?.senderEmail || ''),
        });
        fetchSettings();
      } else {
        setAlert({
          type: 'danger',
          message: res.data?.message || 'SMTP connection verification failed. Please verify credentials.',
        });
      }
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Connection test failed. Check your Gmail App Password and ensure 2-Step Verification is active.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to remove your custom SMTP configuration? All automated emails will be paused until re-configured.')) {
      return;
    }

    try {
      setDeleting(true);
      setAlert(null);
      await api.delete('/hr/email-settings');
      setSettingData(null);
      setSenderEmail('');
      setSenderName('');
      setAppPassword('');
      setAlert({
        type: 'info',
        message: 'Custom SMTP configuration removed successfully. Status reset to unconfigured.',
      });
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to delete SMTP configuration.',
      });
    } finally {
      setDeleting(false);
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

  return (
    <div className="dashboard-content-page" style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px', fontSize: '0.85rem' }}>
        <ol style={{ display: 'flex', listStyle: 'none', padding: 0, margin: 0, gap: '8px', color: 'var(--text-muted)' }}>
          <li><Link to="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Dashboard</Link></li>
          <li>/</li>
          <li><Link to="/dashboard/settings" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Settings</Link></li>
          <li>/</li>
          <li style={{ color: 'var(--accent)', fontWeight: 600 }}>Recruiter Email &amp; SMTP</li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="page-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px 0' }}>
            <i className="bi bi-envelope-at" style={{ color: 'var(--accent)' }}></i>
            Recruiter SMTP Email Settings
          </h1>
          <p className="page-subtitle" style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.92rem' }}>
            Configure your personal Gmail credentials to send automated shortlist, interview invite, and candidate status notifications directly from your own email identity.
          </p>
        </div>
      </div>

      {/* Alert Notification */}
      {alert && (
        <div
          className={`alert alert-${alert.type}`}
          role="alert"
          style={{
            padding: '14px 18px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            border: alert.type === 'success' ? '1px solid #86efac' : alert.type === 'danger' ? '1px solid #fca5a5' : '1px solid #93c5fd',
            backgroundColor: alert.type === 'success' ? '#f0fdf4' : alert.type === 'danger' ? '#fef2f2' : '#eff6ff',
            color: alert.type === 'success' ? '#166534' : alert.type === 'danger' ? '#991b1b' : '#1e40af',
          }}
        >
          <i className={`bi ${alert.type === 'success' ? 'bi-check-circle-fill' : alert.type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'}`}></i>
          <span style={{ flex: 1 }}>{alert.message}</span>
          <button
            type="button"
            onClick={() => setAlert(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1.1rem' }}
          >
            &times;
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner-border spinner-border-sm" role="status" style={{ marginRight: '8px' }}></div>
          Loading SMTP configuration...
        </div>
      ) : settingData ? (
        /* ========================================================================= */
        /* MODULE 1.1: CONFIGURED SMTP SUMMARY CARD (NO PASSWORDS EXPOSED)            */
        /* ========================================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            className="card"
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 700 }}>
                  CURRENT SMTP STATUS
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <span
                    className={`badge ${settingData.isVerified ? 'badge-success' : 'badge-warning'}`}
                    style={{
                      fontSize: '0.85rem',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      background: settingData.isVerified ? '#dcfce7' : '#fef3c7',
                      color: settingData.isVerified ? '#166534' : '#92400e',
                      border: settingData.isVerified ? '1px solid #86efac' : '1px solid #fde68a',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <i className={`bi ${settingData.isVerified ? 'bi-patch-check-fill' : 'bi-hourglass-split'}`}></i>
                    {settingData.isVerified ? 'VERIFIED & ACTIVE' : 'CONFIGURED (UNVERIFIED)'}
                  </span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {settingData.senderEmail}
                  </span>
                  {settingData.senderName && (
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                      ({settingData.senderName})
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link
                  to="/dashboard/settings/email/update"
                  className="btn btn-primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #FF7900 0%, #EA580C 100%)',
                    color: '#ffffff',
                    border: 'none',
                    textDecoration: 'none',
                  }}
                  title="Update Gmail address or change App Password"
                >
                  <i className="bi bi-key-fill"></i>
                  Update Credential
                </Link>

                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={handleTest}
                  disabled={testing}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: '1px solid var(--accent, #FF7900)',
                    color: 'var(--accent, #FF7900)',
                    background: 'transparent',
                    cursor: testing ? 'not-allowed' : 'pointer',
                  }}
                  title="Send live verification test message"
                >
                  <i className={`bi ${testing ? 'bi-arrow-repeat bi-spin' : 'bi-send-check'}`}></i>
                  {testing ? 'Verifying with Google...' : 'Test Connection'}
                </button>

                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: '1px solid #f87171',
                    color: '#ef4444',
                    background: 'transparent',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                  }}
                  title="Remove SMTP configuration"
                >
                  <i className="bi bi-trash"></i>
                  Remove
                </button>
              </div>
            </div>

            {/* Diagnostic Details Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                paddingTop: '18px',
                borderTop: '1px solid var(--border-color, #f1f5f9)',
                fontSize: '0.88rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Configured Gmail Address:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{settingData.senderEmail}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Verification Status:</span>
                <span style={{ fontWeight: 600, color: settingData.isVerified ? '#166534' : '#92400e' }}>
                  {settingData.isVerified ? 'Verified via Google SMTP' : 'Pending Verification'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Last Tested / Updated:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDateTime(settingData.lastTestedAt)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Password Storage:</span>
                <span style={{ fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="bi bi-shield-check"></i> Encrypted at Rest (AES-256-GCM)
                </span>
              </div>
            </div>
          </div>

          {/* Quick link to Notification Preferences */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #e2e8f0)',
              background: 'var(--card-bg, #ffffff)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Candidate Notification Preferences
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Control which recruitment events automatically trigger email delivery vs. in-app notifications.
              </div>
            </div>
            <Link
              to="/dashboard/settings/notifications"
              className="btn btn-outline-primary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <i className="bi bi-sliders"></i>
              Manage Notification Preferences
            </Link>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* INITIAL SETUP FORM (WHEN NOT CONFIGURED)                                   */
        /* ========================================================================= */
        <div
          className="card"
          style={{
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            padding: '28px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color, #f1f5f9)', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Set Up Gmail Credentials
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Connect your recruiter Gmail account to enable automatic candidate notifications.
            </p>
          </div>

          <form onSubmit={handleSaveInitial}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Sender Display Name (Optional)
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Information Tech / Rakesh Rathore"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: 'var(--input-bg, #ffffff)',
                  color: 'var(--text-primary)',
                  fontSize: '0.92rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Gmail Address <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                required
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: 'var(--input-bg, #ffffff)',
                  color: 'var(--text-primary)',
                  fontSize: '0.92rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                16-Digit Google App Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="e.g. abcd efgh ijkl mnop"
                  style={{
                    width: '100%',
                    padding: '10px 42px 10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    backgroundColor: 'var(--input-bg, #ffffff)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    fontFamily: showPassword ? 'inherit' : 'monospace',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '1rem',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Encrypted at rest with enterprise AES-256-GCM. Never logged or exposed.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{
                  padding: '10px 22px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #FF7900 0%, #EA580C 100%)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Saving Configuration...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle"></i>
                    Save &amp; Configure SMTP
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Setup Guidelines */}
          <div
            style={{
              marginTop: '24px',
              padding: '16px 18px',
              background: 'rgba(255, 121, 0, 0.05)',
              border: '1px solid rgba(255, 121, 0, 0.2)',
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '6px' }}>
              <i className="bi bi-info-circle" style={{ marginRight: '6px' }}></i>
              How to generate a Google App Password:
            </div>
            <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
              <li>Open Google Account Security (<a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>myaccount.google.com/security</a>).</li>
              <li>Ensure <strong>2-Step Verification</strong> is ON.</li>
              <li>Search for <strong>"App passwords"</strong> in the search bar.</li>
              <li>Generate a password named "SmartHire ATS" and copy the 16 characters.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
