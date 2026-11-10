import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

const Register = () => {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');

  const [role, setRole] = useState('USER');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [careerRole, setCareerRole] = useState(roleParam || 'Java Developer');
  const [companyName, setCompanyName] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbJobs, setDbJobs] = useState([]);

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const fetchJobs = async () => {
      try {
        const res = await api.get('/jobs');
        const list = res.data?.jobs || (Array.isArray(res.data) ? res.data : []);
        if (isMounted && list.length > 0) {
          setDbJobs(list);
          if (roleParam) {
            const found = list.find((j) => j.title.toLowerCase() === roleParam.toLowerCase());
            if (found) setCareerRole(found.title);
          }
        }
      } catch (err) {}
    };
    fetchJobs();
    return () => {
      isMounted = false;
    };
  }, [roleParam]);

  const isHr = role === 'HR';

  const handleRoleSelect = (selected) => {
    setRole(selected);
    setErrorMessage('');
  };

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  };

  const strength = getPasswordStrength();
  const strengthColor =
    strength <= 25 ? 'var(--danger)' : strength <= 50 ? 'var(--accent)' : 'var(--success)';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify and try again.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber ? phoneNumber.trim() : null,
        password,
        confirmPassword,
        role: isHr ? 'HR' : 'USER',
        careerRole: isHr ? (department || 'HR / Recruiter') : careerRole,
        targetRole: isHr ? null : careerRole,
        companyName: isHr ? companyName.trim() : null,
        department: isHr ? department : null,
        termsAccepted: true,
      };

      const data = await register(payload);
      if (data.user?.role === 'HR' || data.user?.role === 'RECRUITER') {
        navigate('/dashboard/hr');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Registration failed. Please check your details.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">
      {/* LEFT VISUAL BRANDING (Desktop Only) */}
      <section className="register-visual">
        <Link className="register-brand" to="/" aria-label="SmartHire Home">
          <span className="brand-mark" aria-hidden="true">///</span>
          <span>
            SmartHire<span style={{ color: 'var(--accent)' }}>.</span>
          </span>
        </Link>

        <div className="register-visual-content">
          <span
            className="badge"
            style={{ background: 'var(--accent)', color: '#FFFFFF', marginBottom: '8px' }}
          >
            GET STARTED
          </span>
          <h1 id="visualTitle">
            {isHr ? 'Scale your tech' : 'Build a stronger'} <br />
            <span>{isHr ? 'hiring pipeline.' : 'career profile.'}</span>
          </h1>
          <p id="visualDesc">
            {isHr
              ? 'Create your recruiter account to publish jobs, automate resume screening, and manage candidate workflows.'
              : 'Create your account to unlock instant ATS resume scoring, uncover skills gap insights, and target your dream job roles.'}
          </p>

          {!isHr ? (
            <div className="register-benefits" id="seekerBenefits">
              <div className="register-benefit">
                <span className="register-benefit-icon" aria-hidden="true">
                  <i className="bi bi-cpu"></i>
                </span>
                <div>
                  <strong>Instant ATS Compatibility Scoring</strong>
                  <small>Check resume structure, keywords, and readability.</small>
                </div>
              </div>
              <div className="register-benefit">
                <span className="register-benefit-icon" aria-hidden="true">
                  <i className="bi bi-bullseye"></i>
                </span>
                <div>
                  <strong>Skills Gap Analysis &amp; Career Match</strong>
                  <small>Compare against Java, MERN, Cloud, and Data profiles.</small>
                </div>
              </div>
              <div className="register-benefit">
                <span className="register-benefit-icon" aria-hidden="true">
                  <i className="bi bi-graph-up-arrow"></i>
                </span>
                <div>
                  <strong>Actionable Resume Roadmaps</strong>
                  <small>Step-by-step suggestions to boost recruiter callbacks.</small>
                </div>
              </div>
            </div>
          ) : (
            <div className="register-benefits" id="hrBenefits">
              <div className="register-benefit">
                <span className="register-benefit-icon" aria-hidden="true">
                  <i className="bi bi-briefcase"></i>
                </span>
                <div>
                  <strong>Job Requisition Management</strong>
                  <small>Post open vacancies with targeted skill requirements.</small>
                </div>
              </div>
              <div className="register-benefit">
                <span className="register-benefit-icon" aria-hidden="true">
                  <i className="bi bi-robot"></i>
                </span>
                <div>
                  <strong>Bulk AI Resume Candidate Screening</strong>
                  <small>Automatically rank applicants by role match percentage.</small>
                </div>
              </div>
              <div className="register-benefit">
                <span className="register-benefit-icon" aria-hidden="true">
                  <i className="bi bi-calendar-event"></i>
                </span>
                <div>
                  <strong>Interview Pipeline &amp; Structured Feedback</strong>
                  <small>Coordinate interview rounds and standardized scorecards.</small>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ color: '#B9C8DC', fontSize: '0.8rem' }}>
          &copy; {new Date().getFullYear()} SmartHire. AI-Powered Resume Analyzer &amp; Recruitment Platform.
        </div>
      </section>

      {/* RIGHT REGISTRATION PANEL (Responsive Light/Dark) */}
      <section className="register-panel">
        <div className="register-top">
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

          {/* Mobile Brand */}
          <div className="register-mobile-brand">
            <Link
              className="register-brand"
              to="/"
              style={{ color: 'var(--text-primary) !important' }}
            >
              <span className="brand-mark" style={{ color: 'var(--accent)' }}>///</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                SmartHire<span style={{ color: 'var(--accent)' }}>.</span>
              </span>
            </Link>
          </div>
        </div>

        <div className="register-box">
          {/* REGISTRATION ERROR NOTIFICATION */}
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
                <strong style={{ display: 'block', fontSize: '0.9rem' }}>
                  Registration Failed
                </strong>
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
            JOIN SMARTHIRE
          </span>
          <h2 className="register-heading">Create Account</h2>
          <p className="register-description">
            Select your role to configure your personalized dashboard.
          </p>

          {/* ROLE SELECTION STEP */}
          <div className="role-selector-container">
            <span className="role-selector-label">I AM JOINING AS:</span>
            <div className="role-options-grid">
              {/* Option 1: Job Seeker */}
              <div
                className={`role-option-card ${!isHr ? 'selected' : ''}`}
                id="cardJobSeeker"
                onClick={() => handleRoleSelect('USER')}
                role="button"
                tabIndex={0}
              >
                <div>
                  <div className="role-option-header">
                    <span className="role-icon" style={{ color: 'var(--accent)' }}>
                      <i className="bi bi-person-badge"></i>
                    </span>
                    <strong>Job Seeker</strong>
                  </div>
                  <small>Analyze resumes &amp; get job ready</small>
                </div>
              </div>

              {/* Option 2: HR / Recruiter */}
              <div
                className={`role-option-card ${isHr ? 'selected' : ''}`}
                id="cardHrRecruiter"
                onClick={() => handleRoleSelect('HR')}
                role="button"
                tabIndex={0}
              >
                <div>
                  <div className="role-option-header">
                    <span className="role-icon" style={{ color: 'var(--accent)' }}>
                      <i className="bi bi-briefcase"></i>
                    </span>
                    <strong>HR / Recruiter</strong>
                  </div>
                  <small>Post jobs &amp; hire top talent</small>
                </div>
              </div>
            </div>
          </div>

          {/* REGISTRATION FORM */}
          <form id="registerForm" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                className="form-control"
                placeholder="Enter your full name"
                required
                minLength={2}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            {/* Email & Phone Number Grid */}
            <div className="register-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="email" id="emailLabel">
                  Email Address
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

              <div className="form-group">
                <label className="form-label" htmlFor="phoneNumber">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  className="form-control"
                  placeholder="+91 "
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Password and Confirm Password */}
            <div className="register-grid">
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
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
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
                <div className="password-strength">
                  <div
                    className="password-strength-bar"
                    id="pwdStrengthBar"
                    style={{ width: `${strength}%`, backgroundColor: strengthColor }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="password-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    className="form-control"
                    placeholder="Repeat password"
                    minLength={8}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* DYNAMIC ROLE FIELDS */}
            {!isHr ? (
              <div className="form-group" id="seekerField">
                <label className="form-label" htmlFor="careerRole">
                  Primary Target Career Role
                </label>
                <select
                  id="careerRole"
                  name="careerRole"
                  className="form-select"
                  value={careerRole}
                  onChange={(e) => setCareerRole(e.target.value)}
                >
                  {dbJobs.length > 0 && (
                    <optgroup label="Available Vacancies (Database)">
                      {dbJobs.map((j) => (
                        <option key={j.id} value={j.title}>
                          {j.title} ({j.department})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="General Career Profiles">
                    <option value="Java Developer">Java Developer</option>
                    <option value="Spring Boot Developer">Spring Boot Developer</option>
                    <option value="Full Stack Developer">Full Stack MERN Developer</option>
                    <option value="DevOps Engineer">DevOps &amp; Cloud Engineer</option>
                    <option value="Data Analyst">Data Analyst / Scientist</option>
                    <option value="Other">Other Profile</option>
                  </optgroup>
                </select>
              </div>
            ) : (
              <div id="hrFields">
                <div className="form-group">
                  <label className="form-label" htmlFor="companyName">
                    Company / Organization Name
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    className="form-control"
                    placeholder="e.g. ITSoftLab Technologies"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="department">
                    Hiring Department
                  </label>
                  <select
                    id="department"
                    name="department"
                    className="form-select"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="Engineering">Engineering / IT</option>
                    <option value="Product">Product &amp; Design</option>
                    <option value="Talent Acquisition">Talent Acquisition / HR</option>
                    <option value="Executive">Executive Leadership</option>
                  </select>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary btn-block"
              id="btnSubmitRegister"
              disabled={loading}
              style={{
                padding: '12px',
                fontSize: '0.95rem',
                fontWeight: 700,
                marginTop: '10px',
                width: '100%',
              }}
            >
              {loading
                ? 'Creating Account...'
                : isHr
                ? 'Register as HR / Recruiter & Open Dashboard →'
                : 'Register as Job Seeker & Open Dashboard →'}
            </button>

            <p
              style={{
                textAlign: 'center',
                marginTop: '20px',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}
            >
              Already have an account?{' '}
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

export default Register;
