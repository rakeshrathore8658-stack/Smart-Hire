import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const GoogleAuthModal = ({
  isOpen,
  onClose,
  selectedRole = 'USER',
  onSuccess,
}) => {
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || typeof document === 'undefined') return null;

  const isHr = selectedRole === 'HR' || selectedRole === 'RECRUITER';

  // Quick select accounts matching demo / user workflows
  const quickAccounts = [
    {
      name: 'Rakesh Rathore',
      email: 'rakeshrathore8658@gmail.com',
      avatarText: 'R',
      bgColor: '#ea4335',
    },
    {
      name: 'Anand Verma',
      email: 'anandpatel88170@gmail.com',
      avatarText: 'A',
      bgColor: '#4285f4',
    },
    {
      name: 'Rakesh Rathore (HR Admin)',
      email: 'cs23.rakeshrathore@svceindore.ac.in',
      avatarText: 'R',
      bgColor: '#34a853',
    },
  ];

  const handleSelectAccount = async (account) => {
    setError('');
    setLoading(true);
    try {
      await onSuccess({
        email: account.email,
        name: account.name,
        role: isHr ? 'HR' : 'USER',
        googleId: `google_${Date.now()}`,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes('@')) {
      setError('Please enter a valid Gmail / Google email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const derivedName = customName.trim() || customEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      await onSuccess({
        email: customEmail.trim().toLowerCase(),
        name: derivedName,
        role: isHr ? 'HR' : 'USER',
        googleId: `google_${Date.now()}`,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="google-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="google-modal-card"
        style={{
          width: '100%',
          maxWidth: '430px',
          background: 'var(--bg-card, #ffffff)',
          color: 'var(--text-primary, #1e293b)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          border: '1px solid var(--border-color, #e2e8f0)',
          overflow: 'hidden',
          animation: 'confirmFadeScale 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Google Header */}
        <div style={{ padding: '24px 24px 16px', textAlign: 'center', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <svg viewBox="0 0 24 24" width="36" height="36">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px' }}>Sign in with Google</h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0 }}>
            Choose an account to continue to <strong>SmartHire</strong>
          </p>
          <div style={{ marginTop: '10px' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '12px',
                background: isHr ? 'rgba(255, 121, 0, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                color: isHr ? 'var(--accent)' : '#10b981',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className={`bi ${isHr ? 'bi-briefcase' : 'bi-person-badge'}`}></i>
              Signing in as {isHr ? 'HR / Recruiter' : 'Job Seeker'}
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={{ margin: '14px 20px 0', padding: '10px 14px', borderRadius: '8px', background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', color: 'var(--danger)', fontSize: '0.82rem' }}>
            <i className="bi bi-exclamation-circle" style={{ marginRight: '6px' }}></i> {error}
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '16px 20px' }}>
          {!showManualForm ? (
            <div>
              {/* Account List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {quickAccounts.map((acc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectAccount(acc)}
                    disabled={loading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '12px 14px',
                      width: '100%',
                      background: 'var(--bg-secondary, #f8fafc)',
                      border: '1px solid var(--border-color, #e2e8f0)',
                      borderRadius: '10px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      opacity: loading ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: acc.bgColor,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1rem',
                        flexShrink: 0,
                      }}
                    >
                      {acc.avatarText}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {acc.name}
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {acc.email}
                      </span>
                    </div>
                    <i className="bi bi-chevron-right" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}></i>
                  </button>
                ))}
              </div>

              {/* Use Another Account Button */}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowManualForm(true)}
                disabled={loading}
                style={{ width: '100%', padding: '10px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <i className="bi bi-person-plus"></i> Use another Google account
              </button>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px' }}>
                  Google / Gmail Address <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="yourname@gmail.com"
                  required
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px' }}>
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. John Doe"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowManualForm(false)}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {loading ? 'Authenticating...' : 'Continue with Google'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', background: 'var(--bg-secondary, #f8fafc)', borderTop: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>SmartHire Single Sign-On</span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GoogleAuthModal;
