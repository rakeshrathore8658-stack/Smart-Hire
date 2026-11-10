import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export default function NotFound() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="error-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
      {/* Error Navbar */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 36px',
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '1.35rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            textDecoration: 'none',
          }}
        >
          <span style={{ color: 'var(--accent)', fontSize: '1.5rem', letterSpacing: '-2px' }}>///</span>
          SmartHire.
        </Link>

        <button
          type="button"
          className="btn-theme-toggle"
          onClick={toggleTheme}
          title="Toggle Theme"
          style={{
            background: 'none',
            border: '1px solid var(--border-color)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          <i className={isDark ? 'bi bi-sun' : 'bi bi-moon'}></i>
        </button>
      </nav>

      {/* Error Container */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px' }}>
        <div
          style={{
            width: '100%',
            maxWidth: '620px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            padding: '44px 40px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, var(--accent) 0%, var(--primary) 100%)',
            }}
          />

          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              margin: '0 auto 20px',
              display: 'grid',
              placeItems: 'center',
              fontSize: '2.2rem',
              background: 'var(--bg-secondary)',
              border: '2px solid var(--border-color)',
              color: 'var(--accent)',
            }}
          >
            <i className="bi bi-compass"></i>
          </div>

          <div
            style={{
              fontSize: '4.8rem',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.05em',
              color: 'var(--accent)',
              marginBottom: '12px',
            }}
          >
            404
          </div>

          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              marginBottom: '12px',
            }}
          >
            Page Not Found
          </h1>

          <p
            style={{
              fontSize: '0.96rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '28px',
              maxWidth: '460px',
              margin: '0 auto 28px',
            }}
          >
            The requested page or resource could not be found. Please check the address or return to the SmartHire
            dashboard.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/dashboard" className="btn btn-primary" style={{ padding: '10px 24px' }}>
              <i className="bi bi-house-door"></i> Back to Dashboard
            </Link>
            <Link to="/dashboard/help" className="btn btn-secondary" style={{ padding: '10px 20px' }}>
              <i className="bi bi-question-circle"></i> Help & Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
