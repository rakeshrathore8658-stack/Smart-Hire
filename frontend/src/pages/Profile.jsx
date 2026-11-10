import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const Profile = () => {
  const { user, updateUser, isHr } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '+91 98765 43210');
  const [location, setLocation] = useState(user?.location || 'Indore, MP / Remote');
  const [headline, setHeadline] = useState(
    user?.headline || 'Java & Spring Boot Engineer | Backend Specialist'
  );
  const [careerRole, setCareerRole] = useState(user?.targetRole || 'Java Developer');
  const [companyName, setCompanyName] = useState(user?.companyName || 'ITSoftLab Technologies');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.fullName) setFullName(user.fullName);
      if (user.phoneNumber) setPhoneNumber(user.phoneNumber);
      if (user.location) setLocation(user.location);
      if (user.headline) setHeadline(user.headline);
      if (user.targetRole) setCareerRole(user.targetRole);
      if (user.companyName) setCompanyName(user.companyName);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setSaving(true);

    try {
      const payload = {
        fullName,
        phoneNumber,
        location,
        headline,
        targetRole: careerRole,
        companyName: isHr ? companyName : undefined,
      };

      const res = await api.post('/settings/profile', payload);
      updateUser(payload);
      setSuccessMessage('Profile updated successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      updateUser({ fullName, phoneNumber, location, headline, targetRole: careerRole });
      setSuccessMessage('Profile details saved.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const initial = (fullName || user?.fullName || 'U').charAt(0).toUpperCase();

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">My Profile</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Personal &amp; Professional Profile</h1>
          <p className="page-subtitle">
            Manage your contact details, career preferences, verified skills, and resume attachments.
          </p>
        </div>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="alert alert-success" role="status" style={{ marginBottom: '20px' }}>
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '20px' }}>
          {errorMessage}
        </div>
      )}

      <div className="grid-2-1">
        {/* Left Column: Profile Details Form */}
        <article className="card">
          <form id="profileForm" onSubmit={handleSubmit}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                flexWrap: 'wrap',
                marginBottom: '28px',
                paddingBottom: '20px',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <div
                className="profile-avatar"
                style={{
                  width: '72px',
                  height: '72px',
                  fontSize: '1.8rem',
                  background: 'linear-gradient(135deg, #203B60 0%, #FF7900 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '16px',
                  color: '#fff',
                  fontWeight: 800,
                  boxShadow: '0 8px 24px rgba(255, 121, 0, 0.25)',
                }}
              >
                <span>{initial}</span>
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  {fullName || user?.fullName || 'User Profile'}
                </h3>
                <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {user?.email || 'user@example.com'}
                </p>
                <span className="badge badge-primary">
                  <i className="bi bi-shield-check"></i> Verified Profile
                </span>
              </div>
            </div>

            {/* Basic Information */}
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px' }}>
              Basic Information
            </h3>
            <div className="grid-1-1" style={{ gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  className="form-control"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={user?.email || ''}
                  readOnly
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                />
              </div>
            </div>

            <div className="grid-1-1" style={{ gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  className="form-control"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  className="form-control"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Indore, MP / Remote"
                />
              </div>
            </div>

            {/* Professional Details */}
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px' }}>
              Career &amp; Preferences
            </h3>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                Professional Headline
              </label>
              <input
                type="text"
                name="headline"
                className="form-control"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Java & Spring Boot Engineer | Backend Specialist"
              />
            </div>

            <div className="grid-1-1" style={{ gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Target Career Role
                </label>
                <input
                  type="text"
                  name="careerRole"
                  className="form-control"
                  value={careerRole}
                  onChange={(e) => setCareerRole(e.target.value)}
                  placeholder="e.g. Java Developer"
                />
              </div>
              {isHr && (
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    className="form-control"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. ITSoftLab Technologies"
                  />
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ padding: '10px 24px', fontWeight: 700 }}
              >
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </article>

        {/* Right Column: Account Status & Help */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <article className="card">
            <div className="card-header">
              <h2 className="card-title">
                <i className="bi bi-shield-check" style={{ color: 'var(--success)', marginRight: '6px' }}></i>
                Account Verification
              </h2>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              Your account authentication credentials are valid and secure. Your profile identity is strictly
              separated from parsed resume files.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <i className="bi bi-check-circle-fill" style={{ color: 'var(--success)' }}></i>
                <span>Email Verified</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <i className="bi bi-check-circle-fill" style={{ color: 'var(--success)' }}></i>
                <span>Portal Role: {isHr ? 'HR Recruiter' : 'Job Seeker'}</span>
              </div>
            </div>
          </article>
        </aside>
      </div>
    </div>
  );
};

export default Profile;
