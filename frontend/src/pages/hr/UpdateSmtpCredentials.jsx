import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function UpdateSmtpCredentials() {
  const navigate = useNavigate();

  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [alert, setAlert] = useState(null); // { type: 'success' | 'danger' | 'info', message: '' }

  // Load existing sender email & display name if configured
  useEffect(() => {
    const fetchCurrent = async () => {
      try {
        const res = await api.get('/hr/email-settings');
        const data = res.data?.setting || res.data;
        if (data && data.senderEmail) {
          setSenderEmail(data.senderEmail);
        }
        if (data && data.senderName) {
          setSenderName(data.senderName);
        }
      } catch (err) {
        console.warn('Could not prefill email settings:', err);
      }
    };
    fetchCurrent();
  }, []);

  const validateInputs = () => {
    const email = senderEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setAlert({ type: 'danger', message: 'Please enter a valid Gmail address.' });
      return false;
    }
    if (!email.endsWith('gmail.com')) {
      setAlert({ type: 'danger', message: 'Only Gmail addresses (@gmail.com) are supported for Gmail SMTP.' });
      return false;
    }
    const cleanPwd = newPassword.trim().replace(/\s+/g, '');
    if (!cleanPwd) {
      setAlert({ type: 'danger', message: 'Please enter your new 16-character Google App Password.' });
      return false;
    }
    if (cleanPwd.length < 12) {
      setAlert({ type: 'danger', message: 'Google App Password must be 16 characters (e.g. abcd efgh ijkl mnop).' });
      return false;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setAlert({ type: 'danger', message: 'New App Password and Confirm App Password do not match.' });
      return false;
    }
    return true;
  };

  const handleTestConnection = async () => {
    if (!validateInputs()) return;

    try {
      setTesting(true);
      setAlert({ type: 'info', message: 'Verifying SMTP credentials with Google Mail servers...' });

      const payload = {
        senderEmail: senderEmail.trim().toLowerCase(),
        senderName: senderName.trim() || undefined,
        appPassword: newPassword.trim(),
      };

      const res = await api.post('/hr/email-settings/test', payload);
      if (res.data?.success && res.data?.result === 'SUCCESS') {
        setAlert({
          type: 'success',
          message: res.data.message || 'SMTP Connection verified successfully! Google accepted the credentials.',
        });
      } else {
        setAlert({
          type: 'danger',
          message: res.data?.message || 'SMTP connection verification failed. Please check credentials.',
        });
      }
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'SMTP connection test failed. Verify 2-Step Verification and App Password.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validateInputs()) return;

    try {
      setSaving(true);
      setAlert(null);

      const payload = {
        senderEmail: senderEmail.trim().toLowerCase(),
        senderName: senderName.trim() || undefined,
        appPassword: newPassword.trim(),
      };

      const res = await api.put('/hr/email-settings', payload);
      setAlert({
        type: 'success',
        message: 'SMTP credentials updated and encrypted successfully! Redirecting to Email Settings...',
      });

      // Clear password states from memory immediately
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        navigate('/dashboard/settings/email', { state: { updated: true } });
      }, 1500);
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to update SMTP credentials. Please check inputs.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-content-page" style={{ maxWidth: '820px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="breadcrumb" style={{ marginBottom: '16px', fontSize: '0.85rem' }}>
        <ol style={{ display: 'flex', listStyle: 'none', padding: 0, margin: 0, gap: '8px', color: 'var(--text-muted)' }}>
          <li><Link to="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Dashboard</Link></li>
          <li>/</li>
          <li><Link to="/dashboard/settings" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Settings</Link></li>
          <li>/</li>
          <li><Link to="/dashboard/settings/email" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Email Settings</Link></li>
          <li>/</li>
          <li style={{ color: 'var(--accent)', fontWeight: 600 }}>Update Credential</li>
        </ol>
      </nav>

      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          <i className="bi bi-shield-lock" style={{ color: 'var(--accent)', marginRight: '10px' }}></i>
          Update SMTP Credentials
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Update your personal Gmail address or generate a new Google App Password. New credentials are encrypted with AES-256-GCM.
        </p>
      </div>

      {/* Alert Banner */}
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

      {/* Update Credentials Card */}
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
        <form onSubmit={handleUpdate}>
          {/* Sender Display Name */}
          <div style={{ marginBottom: '20px' }}>
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
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Candidate will see this display name as the sender in their email inbox.
            </span>
          </div>

          {/* Gmail Address */}
          <div style={{ marginBottom: '20px' }}>
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

          {/* New Gmail App Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              New 16-Digit Google App Password <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
              Enter the 16-letter App Password generated from Google Account Security.
            </span>
          </div>

          {/* Confirm App Password */}
          <div style={{ marginBottom: '26px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Confirm App Password <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter the 16-digit Google App Password"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)',
                backgroundColor: 'var(--input-bg, #ffffff)',
                color: 'var(--text-primary)',
                fontSize: '0.92rem',
                fontFamily: showPassword ? 'inherit' : 'monospace',
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={saving || testing}
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
                cursor: (saving || testing) ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Updating Credentials...
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle"></i>
                  Update SMTP Credentials
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || saving}
              className="btn btn-outline-primary"
              style={{
                padding: '10px 18px',
                fontWeight: 600,
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid var(--accent, #FF7900)',
                color: 'var(--accent, #FF7900)',
                background: 'transparent',
                cursor: (testing || saving) ? 'not-allowed' : 'pointer',
              }}
            >
              {testing ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Testing Live Connection...
                </>
              ) : (
                <>
                  <i className="bi bi-send-check"></i>
                  Test SMTP Connection
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard/settings/email')}
              disabled={saving || testing}
              className="btn btn-ghost"
              style={{
                padding: '10px 18px',
                fontWeight: 500,
                borderRadius: '8px',
                color: 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                marginLeft: 'auto',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Helpful Instructions Box */}
      <div
        style={{
          marginTop: '24px',
          padding: '18px 20px',
          background: 'rgba(255, 121, 0, 0.05)',
          border: '1px solid rgba(255, 121, 0, 0.2)',
          borderRadius: '10px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="bi bi-info-circle"></i>
          How to generate a Google App Password:
        </div>
        <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.7 }}>
          <li>Open your Google Account Security settings (<a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>myaccount.google.com/security</a>).</li>
          <li>Ensure <strong>2-Step Verification</strong> is turned ON.</li>
          <li>Search for <strong>"App passwords"</strong> in the top search bar.</li>
          <li>Create a new App Password named <strong>"SmartHire ATS"</strong>.</li>
          <li>Copy the 16-character code (spaces do not matter) and paste it into the field above.</li>
        </ol>
      </div>
    </div>
  );
}
