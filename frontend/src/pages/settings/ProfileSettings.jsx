import React, { useState, useEffect } from 'react';
import SettingsLayout from './SettingsLayout';
import CustomSelect from '../../components/common/CustomSelect';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/client';

export default function ProfileSettings() {
  const { user, updateUser, isHr } = useAuth();
  const { isDark } = useTheme();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [location, setLocation] = useState(user?.location || '');
  const [headline, setHeadline] = useState(user?.headline || '');
  const [careerRole, setCareerRole] = useState(user?.careerRole || user?.targetRole || '');
  const [companyName, setCompanyName] = useState(user?.companyName || '');

  // Job Seeker Specific Fields
  const [education, setEducation] = useState(() => {
    try {
      return localStorage.getItem('jobseeker_education_' + (user?.email || 'default')) || 'B.Tech in Computer Science';
    } catch {
      return 'B.Tech in Computer Science';
    }
  });
  const [experienceLevel, setExperienceLevel] = useState(() => {
    try {
      return localStorage.getItem('jobseeker_exp_' + (user?.email || 'default')) || '1-3 Years (Junior)';
    } catch {
      return '1-3 Years (Junior)';
    }
  });
  const [skills, setSkills] = useState(() => {
    try {
      return localStorage.getItem('jobseeker_skills_' + (user?.email || 'default')) || 'Java, Spring Boot, React, PostgreSQL, REST APIs';
    } catch {
      return 'Java, Spring Boot, React, PostgreSQL, REST APIs';
    }
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null); // { type: 'success' | 'danger', message: '' }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get('/settings');
        if (res.data) {
          if (res.data.fullName) setFullName(res.data.fullName);
          if (res.data.email) setEmail(res.data.email);
          if (res.data.phoneNumber) setPhoneNumber(res.data.phoneNumber);
          if (res.data.location) setLocation(res.data.location);
          if (res.data.headline) setHeadline(res.data.headline);
          if (res.data.careerRole) setCareerRole(res.data.careerRole);
          if (res.data.companyName) setCompanyName(res.data.companyName);
        }
      } catch (err) {
        console.warn('Could not fetch settings profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    setSaving(true);

    try {
      const payload = {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        location: location.trim(),
        headline: headline.trim(),
        careerRole: careerRole.trim(),
        companyName: isHr ? companyName.trim() : undefined,
      };

      const res = await api.post('/settings/profile', payload);
      if (res.data?.user) {
        updateUser(res.data.user);
      } else {
        updateUser(payload);
      }

      if (!isHr) {
        try {
          const userKey = user?.email || 'default';
          localStorage.setItem('jobseeker_education_' + userKey, education);
          localStorage.setItem('jobseeker_exp_' + userKey, experienceLevel);
          localStorage.setItem('jobseeker_skills_' + userKey, skills);
        } catch (e) {
          console.warn('Could not persist local candidate extras:', e);
        }
      }

      setAlert({
        type: 'success',
        message: isHr ? 'Recruiter profile updated and saved successfully!' : 'Job Seeker profile & career preferences updated successfully!',
      });
      setTimeout(() => setAlert(null), 4000);
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to update profile settings. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const initial = (fullName || user?.fullName || 'U').charAt(0).toUpperCase();

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    outline: 'none',
  };

  return (
    <SettingsLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* User Identity Card */}
        <div
          className="card"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent, #ea580c), #c2410c)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
            }}
          >
            {initial}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {fullName || user?.fullName || 'Recruiter User'}
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: isHr ? (isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe') : (isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7'),
                  color: isHr ? (isDark ? '#93c5fd' : '#1e40af') : (isDark ? '#fcd34d' : '#92400e'),
                  border: isHr ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                {isHr ? 'HR / Recruiter Portal' : 'Job Seeker Portal'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {email || user?.email || ''} {isHr ? (companyName ? `• ${companyName}` : '') : (careerRole ? `• Target: ${careerRole}` : '')}
            </p>
          </div>
        </div>

        {/* Alert Box */}
        {alert && (
          <div
            className={`alert alert-${alert.type}`}
            style={{
              padding: '14px 18px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              border: alert.type === 'success' ? '1px solid #86efac' : '1px solid #fca5a5',
              backgroundColor: alert.type === 'success' ? (isDark ? 'rgba(22, 101, 52, 0.25)' : '#f0fdf4') : (isDark ? 'rgba(185, 28, 28, 0.25)' : '#fef2f2'),
              color: alert.type === 'success' ? (isDark ? '#86efac' : '#166534') : (isDark ? '#fca5a5' : '#991b1b'),
            }}
          >
            <i className={`bi ${alert.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`}></i>
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

        {/* Profile Edit Form Card */}
        <div
          className="card"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isHr ? 'Personal & Organizational Profile' : 'Job Seeker Personal & ATS Profile'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {isHr
                ? 'Update your identity details, company association, and contact preferences.'
                : 'Update your candidate identity, target job role, education, key technical skills, and career preferences.'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '18px' }}>
              {/* Full Name */}
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rakesh Rathore"
                  required
                  style={inputStyle}
                />
              </div>

              {/* Email (Read only) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', margin: 0, color: 'var(--text-primary)' }}>
                    Primary Account Email
                  </label>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#16a34a',
                      background: isDark ? 'rgba(22, 163, 74, 0.2)' : 'rgba(22, 163, 74, 0.1)',
                      border: '1px solid rgba(22, 163, 74, 0.28)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <i className="bi bi-shield-check"></i> Verified
                  </span>
                </div>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  disabled
                  title={email}
                  style={{
                    ...inputStyle,
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-muted)',
                    cursor: 'not-allowed',
                  }}
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  style={inputStyle}
                />
              </div>

              {/* Location */}
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                  Location / Region
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Indore, MP / Remote"
                  style={inputStyle}
                />
              </div>

              {/* HR ONLY: Company Name */}
              {isHr && (
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                    Company / Organization Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Information Tech"
                    style={inputStyle}
                  />
                </div>
              )}

              {/* Career / Target Role */}
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                  {isHr ? 'Recruitment / Career Role' : 'Target Career Job Role'}
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={careerRole}
                  onChange={(e) => setCareerRole(e.target.value)}
                  placeholder={isHr ? 'e.g. Senior Technical Recruiter' : 'e.g. Java & Spring Boot Developer'}
                  style={inputStyle}
                />
              </div>

              {/* JOB SEEKER ONLY: Highest Education */}
              {!isHr && (
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                    Highest Qualification / Degree
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder="e.g. B.Tech Computer Science / MCA"
                    style={inputStyle}
                  />
                </div>
              )}

              {/* JOB SEEKER ONLY: Experience Level */}
              {!isHr && (
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                    Experience Level
                  </label>
                  <CustomSelect
                    value={experienceLevel}
                    onChange={(val) => setExperienceLevel(val)}
                    options={[
                      { value: 'Fresher / Entry-Level (0-1 yrs)', label: 'Fresher / Entry-Level (0-1 yrs)' },
                      { value: '1-3 Years (Junior)', label: '1-3 Years (Junior)' },
                      { value: '3-5 Years (Mid-Level)', label: '3-5 Years (Mid-Level)' },
                      { value: '5-8 Years (Senior)', label: '5-8 Years (Senior)' },
                      { value: '8+ Years (Lead / Architect)', label: '8+ Years (Lead / Architect)' },
                    ]}
                    placeholder="Select Experience Level"
                  />
                </div>
              )}

              {/* JOB SEEKER ONLY: Key Technical Skills */}
              {!isHr && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                    Key Technical Skills &amp; Competencies
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="e.g. Java, Spring Boot, React, PostgreSQL, Docker, Microservices, REST APIs"
                    style={inputStyle}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                    Tip: Separate multiple skills with commas. These skills will be used for ATS match scoring and job recommendations.
                  </small>
                </div>
              )}
            </div>

            {/* Headline / Bio */}
            <div style={{ marginBottom: '22px' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'var(--text-primary)' }}>
                {isHr ? 'Professional Headline & Bio' : 'Professional Headline & Career Summary'}
              </label>
              <textarea
                className="form-control"
                rows="3"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder={
                  isHr
                    ? 'Share a brief overview of your recruitment focus, technical domains, or background...'
                    : 'Summarize your technical background, core strengths, and what kind of roles you are seeking...'
                }
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              />
            </div>

            {/* Submit Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{
                  background: 'var(--accent, #ea580c)',
                  borderColor: 'var(--accent, #ea580c)',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#ffffff',
                }}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    Saving Profile...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle"></i> {isHr ? 'Save Profile Settings' : 'Save Job Seeker Profile'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SettingsLayout>
  );
}
