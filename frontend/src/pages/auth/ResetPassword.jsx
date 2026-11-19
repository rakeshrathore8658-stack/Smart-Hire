import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (!token) {
      setAlert({ type: 'danger', message: 'Missing password reset token. Please check your email link.' });
      return;
    }

    if (newPassword.length < 6) {
      setAlert({ type: 'danger', message: 'Password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setAlert({ type: 'danger', message: 'Passwords do not match. Please verify and try again.' });
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/reset-password', {
        token: token.trim(),
        newPassword,
        confirmPassword,
      });

      setAlert({
        type: 'success',
        message: res.data?.message || 'Password updated successfully! Redirecting to sign in...',
      });

      setTimeout(() => {
        navigate('/login?reset=true');
      }, 1500);
    } catch (err) {
      setAlert({
        type: 'danger',
        message:
          err.response?.data?.message ||
          'Failed to reset password. The link may have expired (1 hour). Please request a new one.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      {/* LEFT VISUAL BRANDING */}
      <section className="auth-visual">
        <Link className="auth-brand" to="/" aria-label="SmartHire Home">
          <span className="brand-mark" aria-hidden="true">///</span>
          <span>
            SmartHire<span style={{ color: 'var(--accent)' }}>.</span>
          </span>
        </Link>

        <div className="auth-visual-content">
          <h1>
            Create New <br />
            <span>Secure Password.</span>
          </h1>
          <p>
            Choose a strong password with letters, numbers, and symbols to keep your recruitment workspace safe.
          </p>

          <div className="auth-benefits">
            <div className="auth-benefit">
              <span className="benefit-check" aria-hidden="true">
                <i className="bi bi-shield-check"></i>
              </span>
              <span>Encrypted BCrypt Hash Protection</span>
            </div>
            <div className="auth-benefit">
              <span className="benefit-check" aria-hidden="true">
                <i className="bi bi-lock-fill"></i>
              </span>
              <span>Single-Session Invalidation</span>
            </div>
            <div className="auth-benefit">
              <span className="benefit-check" aria-hidden="true">
                <i className="bi bi-check2-circle"></i>
              </span>
              <span>Instant Account Recovery</span>
            </div>
          </div>
        </div>

        <div style={{ color: '#B9C8DC', fontSize: '0.8rem' }}>
          &copy; {new Date().getFullYear()} SmartHire. AI Resume Analyzer &amp; Recruitment Platform.
        </div>
      </section>

      {/* RIGHT FORM PANEL */}
      <section className="auth-form-panel">
        <div className="auth-top-actions">
          <Link
            to="/login"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="bi bi-arrow-left"></i> Back to Sign In
          </Link>
        </div>

        <div className="auth-form-wrapper" style={{ maxWidth: '440px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                marginBottom: '14px',
              }}
            >
              <i className="bi bi-key-fill"></i>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
              Reset Password
            </h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Enter your new password below to regain access to your account.
            </p>
          </div>

          {alert && (
            <div
              className={`alert alert-${alert.type}`}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: alert.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: alert.type === 'success' ? '#166534' : '#991b1b',
                border: alert.type === 'success' ? '1px solid #86efac' : '1px solid #fca5a5',
              }}
            >
              <i className={`bi ${alert.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`}></i>
              <span style={{ flex: 1 }}>{alert.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                New Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    backgroundColor: 'var(--input-bg, #ffffff)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
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
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: 'var(--input-bg, #ffffff)',
                  color: 'var(--text-primary)',
                  fontSize: '0.92rem',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontWeight: 700,
                fontSize: '1rem',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #FF7900 0%, #EA580C 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(255, 121, 0, 0.3)',
              }}
            >
              {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
