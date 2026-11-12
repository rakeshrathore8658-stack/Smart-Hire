import React, { useState, useEffect } from 'react';
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
  const [googleLoading, setGoogleLoading] = useState(false);

  const { login, fetchCurrentUser } = useAuth();
  const navigate = useNavigate();

  const isLogout = searchParams.get('logout') === 'true';
  const isReset = searchParams.get('reset') === 'true';

  const isHr = selectedRole === 'HR';

  // Listen for Google OAuth callback results from Spring Boot backend
  useEffect(() => {
    const oauthError = searchParams.get('oauth_error') || searchParams.get('error');
    if (oauthError) {
      if (oauthError === 'portal_mismatch') {
        const portal = isHr ? 'Job Seeker' : 'HR / Recruiter';
        setErrorMessage(`Role Conflict: Ye account ${portal} portal ke liye registered hai. Ek email address ke corresponding sirf or sirf ek hi dashboard (${portal}) me sign in kar sakte hain. Please ${portal} portal select karke sign in karein.`);
      } else {
        setErrorMessage(decodeURIComponent(oauthError));
      }
    }

    const oauthSuccess = searchParams.get('oauth_success') === 'true' || searchParams.get('oauth') === 'success';
    if (oauthSuccess) {
      const emailParam = searchParams.get('email');
      const roleParam = searchParams.get('role');
      const nameParam = searchParams.get('name');
      const tokenParam = searchParams.get('token') || searchParams.get('access_token');

      if (tokenParam && tokenParam.trim()) {
        try {
          sessionStorage.setItem('token', tokenParam.trim());
          sessionStorage.setItem('smarthire_token', tokenParam.trim());
          localStorage.setItem('token', tokenParam.trim());
          localStorage.setItem('smarthire_token', tokenParam.trim());
        } catch (_) {}
      }

      if (emailParam) {
        const u = {
          email: emailParam,
          fullName: nameParam || emailParam.split('@')[0],
          role: roleParam || 'USER',
        };
        try {
          sessionStorage.setItem('smarthire_user_email', emailParam.toLowerCase());
          sessionStorage.setItem('smarthire_user', JSON.stringify(u));
          localStorage.setItem('smarthire_user_email', emailParam.toLowerCase());
          localStorage.setItem('smarthire_user', JSON.stringify(u));
        } catch (_) {}
      }

      fetchCurrentUser().then(() => {
        if (roleParam === 'HR' || roleParam === 'RECRUITER') {
          navigate('/dashboard/hr', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }).catch(() => {
        if (roleParam === 'HR' || roleParam === 'RECRUITER') {
          navigate('/dashboard/hr', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      });
    }
  }, [searchParams]);

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
      if (err.response?.status === 405) {
        setErrorMessage(
          'Backend connection error (405 Method Not Allowed). If deployed on Vercel, please set VITE_API_BASE_URL to your Render backend URL in Vercel Project Settings and redeploy. If running locally, please ensure Spring Boot is running on port 8080.'
        );
      } else {
        setErrorMessage(
          err.response?.data?.message || err.message || 'Incorrect email or password entered. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Real Google OAuth 2.0 Authorization Flow Redirect
  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setErrorMessage('');
    const targetRole = isHr ? 'HR' : 'USER';
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

    try {
      document.cookie = `smarthire_oauth_role=${targetRole}; path=/; max-age=600; SameSite=Lax`;
      document.cookie = `smarthire_oauth_origin=${encodeURIComponent(currentOrigin)}; path=/; max-age=600; SameSite=Lax`;
      sessionStorage.setItem('smarthire_oauth_role', targetRole);
      sessionStorage.setItem('smarthire_oauth_origin', currentOrigin);
    } catch (_) {}

    // In production (Vercel), VITE_API_BASE_URL points to Render backend
    // In local development, defaults to 'http://localhost:8080'
    const rawApi = import.meta.env.VITE_API_BASE_URL;
    let backendUrl = 'http://localhost:8080';
    if (rawApi && rawApi.trim()) {
      const clean = rawApi.trim().replace(/\/+$/, '');
      backendUrl = clean.endsWith('/api') ? clean.slice(0, -4) : clean;
    }

    // Redirect to Spring Security standard OAuth2 authorization endpoint with origin & role
    window.location.href = `${backendUrl}/oauth2/authorization/google?role=${targetRole}&origin=${encodeURIComponent(currentOrigin)}`;
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
              disabled={loading || googleLoading}
              style={{ padding: '12px', fontSize: '0.95rem', fontWeight: 700, width: '100%' }}
            >
              {loading
                ? 'Signing In...'
                : isHr
                ? 'Log In as HR / Recruiter & Open Dashboard \u2192'
                : 'Log In as Job Seeker & Open Dashboard \u2192'}
            </button>

            {/* Divider */}
            <div className="auth-divider">
              <span>OR</span>
            </div>

            {/* Real Google OAuth 2.0 Authorization Button */}
            <button
              type="button"
              className="btn-google-auth"
              id="btnGoogleLogin"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              title={`Continue with Google as ${isHr ? 'HR / Recruiter' : 'Job Seeker'}`}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>
                {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
              </span>
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
