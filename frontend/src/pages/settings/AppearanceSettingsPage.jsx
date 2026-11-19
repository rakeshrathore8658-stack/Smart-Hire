import React, { useState } from 'react';
import SettingsLayout from './SettingsLayout';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/client';

export default function AppearanceSettingsPage() {
  const { isHr } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const [successMessage, setSuccessMessage] = useState('');

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme, true);
    setSuccessMessage(`Theme updated to ${newTheme === 'dark' ? 'Dark Mode' : 'Light Mode'} successfully.`);
    try {
      await api.post('/settings/theme', { theme: newTheme });
    } catch (e) {
      console.warn('Could not persist theme to server:', e);
    }
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <SettingsLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Success Alert */}
        {successMessage && (
          <div
            className="alert alert-success"
            style={{
              padding: '14px 18px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              border: '1px solid #86efac',
              backgroundColor: isDark ? 'rgba(22, 101, 52, 0.25)' : '#f0fdf4',
              color: isDark ? '#86efac' : '#166534',
            }}
          >
            <i className="bi bi-check-circle-fill"></i>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Theme Selection Card */}
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
              Visual Theme &amp; Display Preferences
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {isHr
                ? 'Choose how Smart-Hire looks to you across all recruiter views and candidate scorecards.'
                : 'Choose how Smart-Hire looks to you across your candidate dashboard, resume analyzers, and job recommendations.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Light Mode Card */}
            <div
              onClick={() => handleThemeChange('light')}
              style={{
                cursor: 'pointer',
                borderRadius: '12px',
                border: !isDark ? '2px solid var(--accent, #ea580c)' : '1px solid var(--border-color)',
                background: !isDark ? 'rgba(234, 88, 12, 0.08)' : 'var(--bg-secondary)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                transition: 'all 0.2s ease',
                boxShadow: !isDark ? '0 4px 14px rgba(234, 88, 12, 0.15)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: !isDark ? '#ffedd5' : 'var(--bg-card)',
                      color: '#ea580c',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <i className="bi bi-sun-fill"></i>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Light Mode
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Clean, high-clarity interface</span>
                  </div>
                </div>

                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: !isDark ? '6px solid var(--accent, #ea580c)' : '2px solid var(--border-color)',
                    background: !isDark ? '#ffffff' : 'transparent',
                  }}
                ></div>
              </div>

              {/* Preview Illustration */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ height: '8px', width: '40%', background: '#0f172a', borderRadius: '4px' }}></div>
                <div style={{ height: '6px', width: '70%', background: '#94a3b8', borderRadius: '4px' }}></div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <div style={{ height: '22px', flex: 1, background: '#f1f5f9', borderRadius: '4px' }}></div>
                  <div style={{ height: '22px', width: '40px', background: '#ea580c', borderRadius: '4px' }}></div>
                </div>
              </div>
            </div>

            {/* Dark Mode Card */}
            <div
              onClick={() => handleThemeChange('dark')}
              style={{
                cursor: 'pointer',
                borderRadius: '12px',
                border: isDark ? '2px solid var(--accent, #ea580c)' : '1px solid var(--border-color)',
                background: isDark ? 'rgba(234, 88, 12, 0.12)' : 'var(--bg-secondary)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                transition: 'all 0.2s ease',
                boxShadow: isDark ? '0 4px 14px rgba(234, 88, 12, 0.18)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: isDark ? '#334155' : 'var(--bg-card)',
                      color: isDark ? '#fbbf24' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <i className="bi bi-moon-stars-fill"></i>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Dark Mode
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reduced eye-strain in low light</span>
                  </div>
                </div>

                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: isDark ? '6px solid var(--accent, #ea580c)' : '2px solid var(--border-color)',
                    background: isDark ? '#ffffff' : 'transparent',
                  }}
                ></div>
              </div>

              {/* Preview Illustration */}
              <div
                style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ height: '8px', width: '40%', background: '#f8fafc', borderRadius: '4px' }}></div>
                <div style={{ height: '6px', width: '70%', background: '#64748b', borderRadius: '4px' }}></div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <div style={{ height: '22px', flex: 1, background: '#1e293b', borderRadius: '4px' }}></div>
                  <div style={{ height: '22px', width: '40px', background: '#ea580c', borderRadius: '4px' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
