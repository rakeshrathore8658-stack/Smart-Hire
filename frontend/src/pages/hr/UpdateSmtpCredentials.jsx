import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function UpdateSmtpCredentials() {
  const navigate = useNavigate();

  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [providerType, setProviderType] = useState('BREVO_API');
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
        if (data && data.providerType && Boolean(data.isVerified)) {
          setProviderType(data.providerType);
        } else {
          // Default to BREVO_API for unverified configurations or Render Free Tier
          setProviderType('BREVO_API');
        }
      } catch (err) {
        console.warn('Could not prefill email settings:', err);
      }
    };
    fetchCurrent();
  }, []);

  const handlePasswordChange = (val) => {
    setNewPassword(val);
    setConfirmPassword(val); // Auto-sync to prevent 70-character re-typing friction!
    const clean = val.trim().toLowerCase();
    if (clean.startsWith('xkeysib-') || clean.startsWith('xsmtpsib-') || clean.includes('brevo') || clean.length >= 45) {
      setProviderType('BREVO_API');
    } else if (clean.startsWith('re_') || clean.includes('resend')) {
      setProviderType('RESEND_API');
    }
  };

  const validateInputs = () => {
    const email = senderEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setAlert({ type: 'danger', message: 'Please enter a valid email address.' });
      return false;
    }
    if (providerType === 'GMAIL_SMTP' && !email.endsWith('gmail.com')) {
      setAlert({ type: 'danger', message: 'Only Gmail addresses (@gmail.com) are supported for Gmail SMTP.' });
      return false;
    }
    const cleanPwd = newPassword.trim().replace(/\s+/g, '');
    if (!cleanPwd) {
      setAlert({ type: 'danger', message: 'Please enter your new API Key or App Password.' });
      return false;
    }
    if (providerType === 'GMAIL_SMTP' && cleanPwd.length < 12) {
      setAlert({ type: 'danger', message: 'Google App Password must be 16 characters (e.g. abcd efgh ijkl mnop).' });
      return false;
    }
    if (providerType === 'BREVO_API' && cleanPwd.length < 35) {
      setAlert({
        type: 'danger',
        message: `Brevo API Key must be around 70 characters long (starts with 'xkeysib-'). You only entered ${cleanPwd.length} characters. Please generate the key in Brevo and copy the full key.`,
      });
      return false;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setAlert({ type: 'danger', message: 'New credential and Confirm credential do not match.' });
      return false;
    }
    return true;
  };

  const handleTestConnection = async () => {
    if (!validateInputs()) return;

    try {
      setTesting(true);
      setAlert({ type: 'info', message: 'Verifying credentials with mail server...' });

      const payload = {
        senderEmail: senderEmail.trim().toLowerCase(),
        senderName: senderName.trim() || undefined,
        appPassword: newPassword.trim(),
        providerType: providerType,
      };

      const res = await api.post('/hr/email-settings/test', payload);
      if (res.data?.success && res.data?.result === 'SUCCESS') {
        setAlert({
          type: 'success',
          message: res.data.message || 'Connection verified successfully! The mail server accepted your credentials.',
        });
      } else {
        setAlert({
          type: 'danger',
          message: res.data?.message || 'Connection verification failed. Please check credentials.',
        });
      }
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Connection test failed. Check your API key or App Password.',
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
        providerType: providerType,
      };

      const res = await api.put('/hr/email-settings', payload);
      setAlert({
        type: 'success',
        message: 'Email credentials updated and encrypted successfully! Redirecting to Email Settings...',
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
          Update Email Delivery Credentials
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Update your sender email address or API Key / App Password. Works seamlessly with Brevo HTTP API (Port 443) on Render Free Tier.
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
          {/* Provider Selection */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Delivery Provider <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setProviderType('BREVO_API')}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: providerType === 'BREVO_API' ? '2px solid #2563eb' : '1px solid var(--border-color, #cbd5e1)',
                  background: providerType === 'BREVO_API' ? 'rgba(37, 99, 235, 0.06)' : 'var(--input-bg, #ffffff)',
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.92rem', color: providerType === 'BREVO_API' ? '#2563eb' : 'inherit' }}>
                    Brevo HTTP API
                  </strong>
                  <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontWeight: 700 }}>
                    RECOMMENDED
                  </span>
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.76rem', display: 'block' }}>
                  Port 443 &bull; 100% Free on Render &bull; 300/day
                </small>
              </button>

              <button
                type="button"
                onClick={() => setProviderType('GMAIL_SMTP')}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: providerType === 'GMAIL_SMTP' ? '2px solid var(--accent, #FF7900)' : '1px solid var(--border-color, #cbd5e1)',
                  background: providerType === 'GMAIL_SMTP' ? 'rgba(255, 121, 0, 0.06)' : 'var(--input-bg, #ffffff)',
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <strong style={{ fontSize: '0.92rem', display: 'block', marginBottom: '4px', color: providerType === 'GMAIL_SMTP' ? 'var(--accent, #FF7900)' : 'inherit' }}>
                  Gmail SMTP
                </strong>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.76rem', display: 'block' }}>
                  Port 587 &bull; For Local / Paid VPS
                </small>
              </button>

              <button
                type="button"
                onClick={() => setProviderType('RESEND_API')}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: providerType === 'RESEND_API' ? '2px solid #0284c7' : '1px solid var(--border-color, #cbd5e1)',
                  background: providerType === 'RESEND_API' ? 'rgba(14, 165, 233, 0.06)' : 'var(--input-bg, #ffffff)',
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <strong style={{ fontSize: '0.92rem', display: 'block', marginBottom: '4px', color: providerType === 'RESEND_API' ? '#0284c7' : 'inherit' }}>
                  Resend API
                </strong>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.76rem', display: 'block' }}>
                  Port 443 &bull; 100/day free
                </small>
              </button>
            </div>
          </div>

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

          {/* Sender Email Address */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              {providerType === 'BREVO_API' ? 'Sender Email (Verified in Brevo)' : providerType === 'RESEND_API' ? 'Sender Email' : 'Gmail Address'} <span style={{ color: '#ef4444' }}>*</span>
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

          {/* New Password or API Key */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              {providerType === 'BREVO_API' ? 'Brevo API Key (starts with xkeysib-)' : providerType === 'RESEND_API' ? 'Resend API Key (starts with re_)' : 'New 16-Digit Google App Password'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder={providerType === 'BREVO_API' ? 'xkeysib-...' : providerType === 'RESEND_API' ? 're_...' : 'e.g. abcd efgh ijkl mnop'}
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
                title={showPassword ? 'Hide' : 'Show'}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              {providerType === 'BREVO_API' ? (
                <span>Copy your free key from <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>Brevo Dashboard ➔ SMTP & API</a></span>
              ) : providerType === 'RESEND_API' ? (
                <span>Copy key from <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 600 }}>Resend Dashboard</a></span>
              ) : (
                <span>16-character App Password generated from myaccount.google.com/apppasswords.</span>
              )}
            </span>
          </div>

          {/* Confirm Password / Key */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Confirm Key / Password <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter above key or password"
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
