import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const [searchParams] = useSearchParams();
  const [selectedRole, setSelectedRole] = useState('USER');
  const [email, setEmail] = useState(searchParams.get('username') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const isLogout = searchParams.get('logout') === 'true';
  const isReset = searchParams.get('reset') === 'true';

  const isHr = selectedRole === 'HR';

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const data = await login(email, password, selectedRole);
      if (data.user?.role === 'HR' || data.user?.role === 'RECRUITER') {
        navigate('/dashboard/hr');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Incorrect email or password entered. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      {/* LEFT VISUAL BRANDING (Always Dark Navy) */}
      <section className="auth-visual">
        <Link className="auth-brand" to="/" aria-label="SmartHire Home">
          <span className="brand-mark" aria-hidden="true">///</span>
          <span>
            SmartHire<span style={{ color: 'var(--accent)' }}>.</span>
          </span>
        </Link>

        <div className="auth-visual-content">
          <h1 id="visualTitle">
            {isHr ? 'Streamline Hiring.' : 'Analyze. Improve.'} <br />
            <span>{isHr ? 'Discover Top Talent.' : 'Get Job Ready.'}</span>
          </h1>
          <p id="visualDesc">
            {isHr
              ? 'Post open requisitions, review candidate match scores, coordinate multi-stage interview workflows, and hire faster.'
              : 'Sign in to your account to review saved resume analyses, track job role matches, and improve your ATS score.'}
          </p>

          <div className="auth-benefits">
            <div className="auth-benefit">
              <span className="benefit-check" aria-hidden="true">
                <i className="bi bi-check2"></i>
              </span>
              <span>AI-Powered Resume ATS Compatibility Scanning</span>
            </div>
            <div className="auth-benefit">
              <span className="benefit-check" aria-hidden="true">
                <i className="bi bi-check2"></i>
              </span>
              <span>Multi-Domain Career Skill Profiling</span>
            </div>
            <div className="auth-benefit">
              <span className="benefit-check" aria-hidden="true">
                <i className="bi bi-check2"></i>
              </span>
              <span>Structured Recruiter Interview Workflows</span>
            </div>
          </div>
        </div>

        <div style={{ color: '#B9C8DC', fontSize: '0.8rem' }}>
          &copy; {new Date().getFullYear()} SmartHire. AI Resume Analyzer &amp; Recruitment Platform.
        </div>
      </section>

      {/* RIGHT LOGIN FORM PANEL (Responsive Light/Dark) */}
      <section className="auth-form-panel">
        <div className="auth-top-actions">
          <Link
            to="/"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            &larr; Back to Home
          </Link>
        </div>

        <div className="auth-box">
          {/* PASSWORD RESET NOTIFICATION */}
          {isReset && (
            <div
              className="alert alert-success"
              style={{
                marginBottom: '22px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--success-bg)',
                color: 'var(--success)',
                border: '1px solid rgba(22, 132, 91, 0.3)',
              }}
            >
              <span style={{ fontSize: '1.3rem', display: 'flex' }} aria-hidden="true">
                <i className="bi bi-shield-check"></i>
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem' }}>
                  Password Reset Successfully
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Your password has been updated. Please sign in with your new credentials.
                </span>
              </div>
            </div>
          )}

          {/* LOGOUT SUCCESS NOTIFICATION */}
          {isLogout && (
            <div
              className="alert alert-success"
              style={{
                marginBottom: '22px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--success-bg)',
                color: 'var(--success)',
                border: '1px solid rgba(22, 132, 91, 0.3)',
              }}
            >
              <span style={{ fontSize: '1.3rem', display: 'flex' }} aria-hidden="true">
                <i className="bi bi-check-circle-fill"></i>
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem' }}>
                  Logged Out Successfully
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  You have safely signed out of your SmartHire account.
                </span>
              </div>
            </div>
          )}

          {/* LOGIN ERROR NOTIFICATION */}
          {errorMessage && (
            <div
              className="alert alert-danger"
              id="loginErrorAlert"
              style={{
                marginBottom: '22px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
              }}
            >
              <span style={{ fontSize: '1.4rem', display: 'flex', marginTop: '2px' }} aria-hidden="true">
                <i className="bi bi-shield-x"></i>
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.92rem', marginBottom: '3px' }}>
                  Authentication Failed
                </strong>
                <span style={{ fontSize: '0.85rem', lineHeight: 1.5, display: 'block' }}>
                  {errorMessage}
                </span>
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
            &bull; SIGN IN
          </span>
          <h2 className="auth-heading">Welcome Back</h2>
          <p className="auth-description" id="loginDesc">
            Choose your role to access your personalized portal.
          </p>

          {/* ROLE SELECTION CARDS */}
          <div className="role-selector-container">
            <span className="role-selector-label">LOG IN AS:</span>
            <div className="role-options-grid">
              {/* Option 1: Job Seeker */}
              <div
                className={`role-option-card ${!isHr ? 'selected' : ''}`}
                id="cardLoginSeeker"
                onClick={() => handleRoleSelect('USER')}
                role="button"
                tabIndex={0}
              >
                <span style={{ fontSize: '1.4rem', color: 'var(--accent)', display: 'flex' }} aria-hidden="true">
                  <i className="bi bi-person-badge"></i>
                </span>
                <div>
                  <strong>Job Seeker</strong>
                  <small>Candidate Portal</small>
                </div>
              </div>

              {/* Option 2: HR / Recruiter */}
              <div
                className={`role-option-card ${isHr ? 'selected' : ''}`}
                id="cardLoginHr"
                onClick={() => handleRoleSelect('HR')}
                role="button"
                tabIndex={0}
              >
                <span style={{ fontSize: '1.4rem', color: 'var(--accent)', display: 'flex' }} aria-hidden="true">
                  <i className="bi bi-briefcase"></i>
                </span>
                <div>
                  <strong>HR / Recruiter</strong>
                  <small>Employer Portal</small>
                </div>
              </div>
            </div>
          </div>

          {/* LOGIN FORM */}
          <form id="loginForm" onSubmit={handleSubmit}>
            {/* Email / Username */}
            <div className="form-group">
              <label className="form-label" htmlFor="username" id="usernameLabel">
                Email Address
              </label>
              <input
                type="email"
                id="username"
                name="username"
                className="form-control"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className="form-control"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  id="togglePassword"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '22px',
                fontSize: '0.84rem',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  name="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />{' '}
                Remember me
              </label>
              <Link
                to="/forgot-password"
                style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary btn-block"
              id="btnLoginSubmit"
              disabled={loading}
              style={{ padding: '12px', fontSize: '0.95rem', fontWeight: 700, width: '100%' }}
            >
              {loading
                ? 'Signing In...'
                : isHr
                ? 'Log In as HR / Recruiter & Open Dashboard →'
                : 'Log In as Job Seeker & Open Dashboard →'}
            </button>

            <p
              style={{
                textAlign: 'center',
                marginTop: '24px',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}
            >
              Don't have an account?{' '}
              <Link
                to="/register"
                style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}
              >
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
};

export default Login;
