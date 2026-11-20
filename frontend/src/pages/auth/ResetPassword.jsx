import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Statuses: 'VALIDATING' | 'READY' | 'EXPIRED' | 'ALREADY_USED' | 'INVALID' | 'SUCCESS'
  const [status, setStatus] = useState('VALIDATING');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const navigate = useNavigate();

  // Validate the reset token immediately on page mount
  useEffect(() => {
    if (!token || !token.trim()) {
      setStatus('INVALID');
      setStatusMessage('Missing password reset token in the link.');
      return;
    }

    let isMounted = true;

    const validateToken = async () => {
      try {
        const res = await api.get(`/auth/validate-reset-token?token=${encodeURIComponent(token.trim())}`);
        if (!isMounted) return;

        if (res.data?.valid) {
          setStatus('READY');
          setMaskedEmail(res.data?.email || '');
          setStatusMessage(res.data?.message || 'Token is valid.');
        } else {
          const reason = res.data?.reason;
          setStatus(reason === 'EXPIRED' ? 'EXPIRED' : 'ALREADY_USED');
          setStatusMessage(res.data?.message || 'This reset link has expired or has already been used.');
        }
      } catch (err) {
        if (!isMounted) return;
        const errReason = err.response?.data?.reason;
        const errMsg =
          err.response?.data?.message ||
          'This password reset link is invalid, has expired (30-minute limit), or has already been used.';

        if (err.response?.status === 410 || errReason === 'EXPIRED') {
          setStatus('EXPIRED');
        } else {
          setStatus('ALREADY_USED');
        }
        setStatusMessage(errMsg);
      }
    };

    validateToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!token) {
      setFormError('Missing password reset token. Please request a new link.');
      return;
    }

    if (newPassword.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match. Please verify and try again.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/auth/reset-password', {
        token: token.trim(),
        newPassword,
        confirmPassword,
      });

      setStatus('SUCCESS');
      setStatusMessage(res.data?.message || 'Password updated successfully! Redirecting to sign in...');

      setTimeout(() => {
        navigate('/login?reset=true');
      }, 2200);
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        'Failed to reset password. The link may have expired (30-minute limit) or was already used.';
      setFormError(errMsg);

      // If the link is reported invalid or expired upon submit, transition to blocked view
      if (err.response?.status === 400 || err.response?.status === 404 || err.response?.status === 410) {
        setStatus('ALREADY_USED');
        setStatusMessage(errMsg);
      }
    } finally {
      setSubmitting(false);
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
            Choose a strong password to protect your recruitment pipeline, candidate resumes, and account credentials.
          </p>

          <div className="auth-benefits">
            <div className="auth-benefit">
              <span className="benefit-check" aria-hidden="true">
                <i className="bi bi-shield-check"></i>
              </span>
              <span>Encrypted BCrypt Hash Storage</span>
            </div>
            <div className="auth-benefit">
              <span className="benefit-check" aria-hidden="true">
                <i className="bi bi-clock-history"></i>
              </span>
              <span>Strict 30-Minute Token Expiry</span>
            </div>
            <div className="auth-benefit">
              <span className="benefit-check" aria-hidden="true">
                <i className="bi bi-lock-fill"></i>
              </span>
              <span>Immediate Single-Use Deactivation</span>
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

          {/* STATE 1: VALIDATING TOKEN */}
          {status === 'VALIDATING' && (
            <div style={{ textAlign: 'center', padding: '40px 10px' }}>
              <div
                className="spinner-border text-primary"
                role="status"
                style={{ width: '3rem', height: '3rem', marginBottom: '18px', color: 'var(--accent, #FF7900)' }}
              >
                <span className="visually-hidden">Loading...</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Verifying Security Link...
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                Checking link validity and expiration window. Please wait a moment.
              </p>
            </div>
          )}

          {/* STATE 2: EXPIRED OR ALREADY USED / INVALID */}
          {(status === 'EXPIRED' || status === 'ALREADY_USED' || status === 'INVALID') && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: '#fef2f2',
                  color: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.2rem',
                  marginBottom: '18px',
                  border: '1px solid #fecaca',
                }}
              >
                <i className={status === 'EXPIRED' ? 'bi bi-clock-history' : 'bi bi-shield-x'}></i>
              </div>

              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
                {status === 'EXPIRED' ? 'Reset Link Expired' : 'Link Already Used or Invalid'}
              </h1>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.55', marginBottom: '22px' }}>
                {statusMessage ||
                  'This password reset link is invalid, has expired (30-minute window), or has already been used to update your password.'}
              </p>

              {/* SECURITY NOTICE BOX */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '26px',
                  textAlign: 'left',
                  fontSize: '0.84rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="bi bi-shield-check" style={{ color: '#2563eb' }}></i> Security Protections Active
                </div>
                <div>• Password reset links expire automatically after <strong>30 minutes</strong>.</div>
                <div>• Each link is <strong>single-use only</strong> and is permanently invalidated once used.</div>
                <div>• If you already updated your password, this link cannot be reopened.</div>
              </div>

              {/* ACTIONS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link
                  to="/forgot-password"
                  className="btn btn-primary"
                  style={{
                    display: 'inline-block',
                    width: '100%',
                    padding: '12px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #FF7900 0%, #EA580C 100%)',
                    color: '#ffffff',
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(255, 121, 0, 0.25)',
                  }}
                >
                  <i className="bi bi-arrow-repeat" style={{ marginRight: '6px' }}></i> Request New Reset Link
                </Link>

                <Link
                  to="/login"
                  style={{
                    display: 'inline-block',
                    width: '100%',
                    padding: '11px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    border: '1px solid var(--border-color, #cbd5e1)',
                  }}
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}

          {/* STATE 3: SUCCESS */}
          {status === 'SUCCESS' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.12)',
                  color: '#16a34a',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.2rem',
                  marginBottom: '18px',
                }}
              >
                <i className="bi bi-check-circle-fill"></i>
              </div>

              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
                Password Updated!
              </h1>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.55', marginBottom: '22px' }}>
                Your password has been changed successfully. For your security, this reset link has been permanently deactivated.
              </p>

              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '20px',
                  fontSize: '0.85rem',
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <div className="spinner-border spinner-border-sm" role="status"></div>
                <span>Redirecting to sign-in page...</span>
              </div>

              <Link
                to="/login?reset=true"
                className="btn btn-primary"
                style={{
                  display: 'inline-block',
                  width: '100%',
                  padding: '12px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #FF7900 0%, #EA580C 100%)',
                  color: '#ffffff',
                  textDecoration: 'none',
                }}
              >
                Sign In Now
              </Link>
            </div>
          )}

          {/* STATE 4: READY - RENDER RESET FORM */}
          {status === 'READY' && (
            <div>
              <div style={{ marginBottom: '22px', textAlign: 'center' }}>
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
                <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                  Create New Password
                </h1>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  {maskedEmail ? (
                    <>Resetting password for <strong style={{ color: 'var(--text-primary)' }}>{maskedEmail}</strong></>
                  ) : (
                    'Enter your new secure password below to regain access.'
                  )}
                </p>
              </div>

              {/* SECURITY BADGE */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '20px',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <i className="bi bi-clock-history" style={{ color: 'var(--accent, #FF7900)' }}></i>
                <span>Link expires in <strong>30 minutes</strong> &bull; Single-use only</span>
              </div>

              {formError && (
                <div
                  className="alert alert-danger"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '18px',
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fca5a5',
                  }}
                >
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span style={{ flex: 1 }}>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '18px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      marginBottom: '6px',
                      color: 'var(--text-primary)',
                    }}
                  >
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
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      marginBottom: '6px',
                      color: 'var(--text-primary)',
                    }}
                  >
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
                  disabled={submitting}
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
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(255, 121, 0, 0.3)',
                  }}
                >
                  {submitting ? 'Updating Password...' : 'Save New Password & Sign In'}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
