import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email: cleanEmail });
      setEmailSent(true);
      setSuccessMessage(
        res.data?.message || 'A password reset link has been sent to your email address (valid for 30 minutes).'
      );
    } catch (err) {
      setEmailSent(false);
      setErrorMessage(
        err.response?.data?.message || err.message || 'Unable to send password reset link. Please check your email and try again.'
      );
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
            Account Security &amp; <br />
            <span>Access Recovery.</span>
          </h1>
          <p>
            Reset your password securely via email to regain access to your saved resume analysis history, candidate pipeline, and career benchmarks.
          </p>

          <div className="auth-benefits">
            <div className="auth-benefit">
              <span className="benefit-check" aria-hidden="true">
                <i className="bi bi-shield-check"></i>
              </span>
              <span>Encrypted BCrypt Credential Storage</span>
            </div>
            <div className="auth-benefit">
              <span className="benefit-check" aria-hidden="true">
                <i className="bi bi-envelope-check-fill"></i>
              </span>
              <span>One-Time Email Reset Links</span>
            </div>
            <div className="auth-benefit">
              <span className="benefit-check" aria-hidden="true">
                <i className="bi bi-lock-fill"></i>
              </span>
              <span>Automatic Token Expiry Protection</span>
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
          {emailSent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
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
                <i className="bi bi-envelope-check-fill"></i>
              </div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
                Reset Link Sent!
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', lineHeight: '1.55', marginBottom: '24px' }}>
                {successMessage}
              </p>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '24px',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                }}
              >
                ⏱️ <strong>Note:</strong> This link is valid for <strong>30 minutes</strong> and can only be used once. Check your spam or promotions folder if you don't see it within 2 minutes.
              </div>
              <Link
                to="/login"
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
                Return to Sign In
              </Link>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(255, 121, 0, 0.1)',
                    color: 'var(--accent, #FF7900)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    marginBottom: '14px',
                  }}
                >
                  <i className="bi bi-shield-lock-fill"></i>
                </div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                  Forgot Password?
                </h1>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Enter your registered account email and we'll send you a secure link to reset your password.
                </p>
              </div>

              {errorMessage && (
                <div
                  className="alert alert-danger"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '18px',
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fca5a5',
                  }}
                >
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '22px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Registered Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
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
                  {loading ? 'Sending Reset Link...' : 'Send Password Reset Link'}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
