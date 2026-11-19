import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setSuccess(false);
      setMessage('No verification token provided in the URL. Please check your email link.');
      return;
    }

    const verify = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        setSuccess(true);
        setMessage(res.data?.message || 'Email verified successfully! Your account is now active.');
      } catch (err) {
        setSuccess(false);
        setMessage(
          err.response?.data?.message ||
            'This verification link has expired or is invalid. Please request a new verification email.'
        );
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim() || !resendEmail.includes('@')) {
      setResendMessage({ type: 'danger', text: 'Please enter a valid email address.' });
      return;
    }

    try {
      setResending(true);
      setResendMessage(null);
      const res = await api.post('/auth/resend-verification', { email: resendEmail.trim().toLowerCase() });
      setResendMessage({
        type: 'success',
        text: res.data?.message || 'If an unverified account exists for this email, a new link has been sent.',
      });
      setResendEmail('');
    } catch (err) {
      setResendMessage({
        type: 'danger',
        text: err.response?.data?.message || 'Failed to resend verification link. Please try again.',
      });
    } finally {
      setResending(false);
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
            Account Identity &amp; <br />
            <span>Email Verification.</span>
          </h1>
          <p>
            Verify your email to activate your personal workspace, AI resume scoring, candidate ATS pipelines, and job benchmarks.
          </p>

          <div className="auth-benefits">
            <div className="auth-benefit">
              <span className="benefit-check" aria-hidden="true">
                <i className="bi bi-shield-check"></i>
              </span>
              <span>Protected Account Ownership</span>
            </div>
            <div className="auth-benefit">
              <span className="benefit-check" aria-hidden="true">
                <i className="bi bi-patch-check"></i>
              </span>
              <span>Verified Identity Protection</span>
            </div>
            <div className="auth-benefit">
              <span className="benefit-check" aria-hidden="true">
                <i className="bi bi-lightning-charge"></i>
              </span>
              <span>Full Platform Access Unlocked</span>
            </div>
          </div>
        </div>

        <div style={{ color: '#B9C8DC', fontSize: '0.8rem' }}>
          &copy; {new Date().getFullYear()} SmartHire. AI Resume Analyzer &amp; Recruitment Platform.
        </div>
      </section>

      {/* RIGHT FORM / STATUS PANEL */}
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

        <div className="auth-form-wrapper" style={{ maxWidth: '440px', margin: '0 auto', textAlign: 'center' }}>
          {loading ? (
            <div style={{ padding: '60px 0' }}>
              <div
                className="spinner-border"
                role="status"
                style={{ width: '3rem', height: '3rem', color: 'var(--accent, #FF7900)', marginBottom: '20px' }}
              ></div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                Verifying Your Email...
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                Connecting to SmartHire security services to activate your account.
              </p>
            </div>
          ) : success ? (
            <div style={{ padding: '30px 0' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.12)',
                  color: '#16a34a',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.4rem',
                  marginBottom: '20px',
                }}
              >
                <i className="bi bi-check-circle-fill"></i>
              </div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
                Email Verified! 🎉
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '28px' }}>
                {message}
              </p>
              <Link
                to="/login"
                className="btn btn-primary"
                style={{
                  display: 'inline-block',
                  width: '100%',
                  padding: '12px 24px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #FF7900 0%, #EA580C 100%)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(255, 121, 0, 0.3)',
                }}
              >
                Sign In to Your Dashboard
              </Link>
            </div>
          ) : (
            <div style={{ padding: '20px 0' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.4rem',
                  marginBottom: '16px',
                }}
              >
                <i className="bi bi-exclamation-triangle-fill"></i>
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
                Verification Link Expired
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '24px' }}>
                {message}
              </p>

              {resendMessage && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '0.88rem',
                    textAlign: 'left',
                    background: resendMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    color: resendMessage.type === 'success' ? '#166534' : '#991b1b',
                    border: resendMessage.type === 'success' ? '1px solid #86efac' : '1px solid #fca5a5',
                  }}
                >
                  {resendMessage.text}
                </div>
              )}

              <form onSubmit={handleResend} style={{ textAlign: 'left', marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Enter Your Email to Resend Link:
                </label>
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="name@company.com"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    backgroundColor: 'var(--input-bg, #ffffff)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    marginBottom: '12px',
                  }}
                />
                <button
                  type="submit"
                  disabled={resending}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '11px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: resending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {resending ? 'Sending New Verification Email...' : 'Resend Verification Email'}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
