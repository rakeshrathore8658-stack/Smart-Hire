import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Google One Tap Component
 * Recreates the exact Google One Tap prompt (Google Identity Services)
 * allowing 1-click seamless sign-in for Job Seekers and HR Recruiters.
 */
const GoogleOneTap = ({
  selectedRole = 'USER',
  onSuccess,
  autoShow = true,
  delayMs = 600,
}) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAccountList, setShowAccountList] = useState(false);
  const [customEmailMode, setCustomEmailMode] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

  // Preset accounts matching user environment and demo screenshot
  const presetAccounts = [
    {
      name: 'Rakesh Rathore',
      email: 'rakeshrathore8658@gmail.com',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      initials: 'R',
      bgColor: '#ea4335',
    },
    {
      name: 'Elisa Beckett',
      email: 'elisa.g.beckett@gmail.com',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
      initials: 'E',
      bgColor: '#4285f4',
    },
    {
      name: 'Anand Verma',
      email: 'anandpatel88170@gmail.com',
      avatarUrl: null,
      initials: 'A',
      bgColor: '#10b981',
    },
    {
      name: 'Rakesh (HR Admin)',
      email: 'cs23.rakeshrathore@svceindore.ac.in',
      avatarUrl: null,
      initials: 'R',
      bgColor: '#f59e0b',
    },
  ];

  const [selectedAccount, setSelectedAccount] = useState(presetAccounts[0]);

  useEffect(() => {
    if (!autoShow || dismissed) return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [autoShow, dismissed, delayMs]);

  // Also initialize Google Identity Services (GSI) if a Google Client ID is configured in env
  useEffect(() => {
    const googleClientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID;
    if (googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (response && response.credential) {
              handleGoogleSubmit({
                credential: response.credential,
                role: selectedRole === 'HR' || selectedRole === 'RECRUITER' ? 'HR' : 'USER',
              });
            }
          },
          auto_select: false,
          cancel_on_tap_outside: false,
        });
        window.google.accounts.id.prompt();
      } catch (e) {
        // Fallback to custom One Tap widget
      }
    }
  }, [selectedRole]);

  if (!visible || dismissed || typeof document === 'undefined') {
    return null;
  }

  const isHr = selectedRole === 'HR' || selectedRole === 'RECRUITER';
  const roleName = isHr ? 'HR Recruiter' : 'Job Seeker';
  const firstName = selectedAccount.name ? selectedAccount.name.split(' ')[0] : 'User';
  const siteDomain = typeof window !== 'undefined' ? window.location.hostname || 'smarthire.app' : 'smarthire.app';

  const handleGoogleSubmit = async (payload) => {
    setLoading(true);
    try {
      if (onSuccess) {
        await onSuccess({
          ...payload,
          role: isHr ? 'HR' : 'USER',
        });
      }
      setVisible(false);
    } catch (err) {
      console.error('One Tap Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (customEmailMode) {
      if (!customEmail || !customEmail.includes('@')) return;
      const derivedName = customName.trim() || customEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      handleGoogleSubmit({
        email: customEmail.trim().toLowerCase(),
        name: derivedName,
        googleId: `google_${Date.now()}`,
      });
    } else {
      handleGoogleSubmit({
        email: selectedAccount.email,
        name: selectedAccount.name,
        googleId: `google_${Date.now()}`,
        avatarUrl: selectedAccount.avatarUrl,
      });
    }
  };

  return createPortal(
    <aside
      aria-label="Google One Tap Sign In"
      className="google-one-tap-card"
      style={{
        position: 'fixed',
        top: '20px',
        right: '24px',
        width: '380px',
        maxWidth: 'calc(100vw - 32px)',
        backgroundColor: '#ffffff',
        color: '#202124',
        borderRadius: '16px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.08)',
        zIndex: 999999,
        padding: '18px 20px',
        fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        animation: 'googleOneTapSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Google G Logo */}
          <svg viewBox="0 0 24 24" width="22" height="22" style={{ flexShrink: 0 }}>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#3c4043',
              lineHeight: '1.3',
              letterSpacing: '0.1px',
            }}
          >
            Sign in to <strong>{siteDomain}</strong> with google.com
          </span>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            setDismissed(true);
          }}
          aria-label="Close Google One Tap"
          style={{
            background: 'none',
            border: 'none',
            color: '#5f6368',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background-color 0.15s ease',
            lineHeight: 1,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f3f4')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          &times;
        </button>
      </div>

      {/* Role Badge Indicator */}
      <div style={{ marginBottom: '14px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '10px',
            background: isHr ? '#fff3e0' : '#e6f4ea',
            color: isHr ? '#e65100' : '#137333',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <i className={`bi ${isHr ? 'bi-briefcase' : 'bi-person-badge'}`} style={{ fontSize: '11px' }}></i>
          Logging into {roleName} Portal
        </span>
      </div>

      {/* Account Info Row */}
      {!customEmailMode ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '16px',
            cursor: 'pointer',
            padding: '8px 10px',
            borderRadius: '10px',
            transition: 'background-color 0.15s ease',
          }}
          onClick={() => setShowAccountList(!showAccountList)}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="Click to switch Google account"
        >
          {/* Avatar */}
          {selectedAccount.avatarUrl ? (
            <img
              src={selectedAccount.avatarUrl}
              alt={selectedAccount.name}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                border: '1px solid #dadce0',
              }}
            />
          ) : (
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: selectedAccount.bgColor || '#4285f4',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {selectedAccount.initials || selectedAccount.name.charAt(0)}
            </div>
          )}

          {/* Name & Email */}
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: '14px',
                color: '#202124',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {selectedAccount.name}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#5f6368',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {selectedAccount.email}
            </div>
          </div>

          {/* Dropdown chevron to switch */}
          <div style={{ color: '#5f6368', fontSize: '12px' }}>
            <i className={`bi bi-chevron-${showAccountList ? 'up' : 'down'}`}></i>
          </div>
        </div>
      ) : (
        /* Custom Email Input */
        <div style={{ marginBottom: '14px', textAlign: 'left' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#3c4043', marginBottom: '4px' }}>
            Enter Google / Gmail Account:
          </div>
          <input
            type="email"
            value={customEmail}
            onChange={(e) => setCustomEmail(e.target.value)}
            placeholder="e.g. user@gmail.com"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #dadce0',
              marginBottom: '6px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Full Name (optional)"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #dadce0',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ textAlign: 'right', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => setCustomEmailMode(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#1a73e8',
                fontSize: '12px',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Cancel & Pick Existing
            </button>
          </div>
        </div>
      )}

      {/* Account Switcher Dropdown */}
      {showAccountList && !customEmailMode && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: '12px',
            marginBottom: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            textAlign: 'left',
          }}
        >
          <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: '#5f6368', background: '#f8f9fa' }}>
            SWITCH ACCOUNT:
          </div>
          {presetAccounts.map((acc, idx) => (
            <div
              key={idx}
              onClick={() => {
                setSelectedAccount(acc);
                setShowAccountList(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: idx < presetAccounts.length - 1 ? '1px solid #f1f3f4' : 'none',
                backgroundColor: acc.email === selectedAccount.email ? '#e8f0fe' : '#ffffff',
              }}
              onMouseEnter={(e) => {
                if (acc.email !== selectedAccount.email) e.currentTarget.style.backgroundColor = '#f8f9fa';
              }}
              onMouseLeave={(e) => {
                if (acc.email !== selectedAccount.email) e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: acc.bgColor,
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {acc.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#202124' }}>{acc.name}</div>
                <div style={{ fontSize: '11px', color: '#5f6368' }}>{acc.email}</div>
              </div>
            </div>
          ))}

          {/* Custom account option */}
          <div
            onClick={() => {
              setCustomEmailMode(true);
              setShowAccountList(false);
            }}
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#1a73e8',
              cursor: 'pointer',
              background: '#f8f9fa',
              borderTop: '1px solid #dadce0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="bi bi-person-plus"></i> Use another Google account...
          </div>
        </div>
      )}

      {/* Primary Action Button: "Continue as Elisa" / "Continue as Rakesh" */}
      <button
        type="button"
        onClick={handleContinue}
        disabled={loading}
        style={{
          width: '100%',
          backgroundColor: '#1a73e8',
          color: '#ffffff',
          border: 'none',
          borderRadius: '24px',
          padding: '11px 16px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
          transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = '#1557b0';
        }}
        onMouseLeave={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = '#1a73e8';
        }}
      >
        {loading ? (
          <>
            <span
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid #ffffff',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite',
              }}
            ></span>
            <span>Signing in...</span>
          </>
        ) : (
          `Continue as ${customEmailMode ? 'User' : firstName}`
        )}
      </button>

      {/* Footer Disclaimer Text */}
      <p
        style={{
          fontSize: '11.5px',
          color: '#5f6368',
          lineHeight: '1.45',
          margin: 0,
          textAlign: 'left',
        }}
      >
        To continue, google.com will share your name, email address, and profile picture with this site. See this site's{' '}
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#1a73e8', textDecoration: 'none' }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          privacy policy
        </a>{' '}
        and{' '}
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#1a73e8', textDecoration: 'none' }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          terms of service
        </a>
        .
      </p>
    </aside>,
    document.body
  );
};

export default GoogleOneTap;
