import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify and try again.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/forgot-password', {
        email,
        newPassword,
        confirmPassword,
      });
      navigate('/login?reset=true');
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Unable to reset password. Please verify the email.'
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
            Reset your password securely to regain access to your saved resume analysis history,
            candidate pipeline, and career benchmarks.
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
                <i className="bi bi-lock"></i>
              </span>
              <span>Protected Account Authentication</span>
            </div>
            <div className="auth-benefit">
              <span className="benefit-check" aria-hidden="true">
                <i className="bi bi-arrow-repeat"></i>
              </span>
              <span>Instant Password Synchronization</span>
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
            }}
          >
            &larr; Back to Login
          </Link>
        </div>

        <div className="auth-box">
          {/* ERROR NOTIFICATION */}
          {errorMessage && (
            <div
              className="alert alert-danger"
              style={{
                marginBottom: '22px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
              }}
            >
              <span style={{ fontSize: '1.3rem', display: 'flex' }} aria-hidden="true">
                <i className="bi bi-exclamation-triangle-fill"></i>
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem' }}>Reset Failed</strong>
                <span style={{ fontSize: '0.8rem' }}>{errorMessage}</span>
              </div>
            </div>
          )}

          <span
            className="eyebrow"
            style={{
              color: 'var(--accent)',
              fontWeight: 800,
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              display: 'block',
            }}
          >
            SECURITY RECOVERY
          </span>
          <h2 className="auth-heading">Reset Password</h2>
          <p className="auth-description">
            Enter your registered email address along with your new password.
          </p>

          {/* RESET FORM */}
          <form id="forgotPasswordForm" onSubmit={handleSubmit}>
            {/* Email Address */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Registered Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-control"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* New Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="newPassword">
                New Password
              </label>
              <div className="password-wrapper">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  className="form-control"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  id="toggleNewPwd"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                >
                  {showNewPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <div className="password-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  className="form-control"
                  placeholder="Repeat new password"
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  id="toggleConfirmPwd"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{
                padding: '12px',
                fontSize: '0.95rem',
                fontWeight: 700,
                marginTop: '10px',
                width: '100%',
              }}
            >
              {loading ? 'Updating Password...' : 'Update Password & Return to Login →'}
            </button>

            <p
              style={{
                textAlign: 'center',
                marginTop: '24px',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}
            >
              Remember your password?{' '}
              <Link
                to="/login"
                style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}
              >
                Log in
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
};

export default ForgotPassword;
