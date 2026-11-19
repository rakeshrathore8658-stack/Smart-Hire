import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [alert, setAlert] = useState(null); // { type: 'success' | 'danger' | 'info', message: '' }

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const res = await api.get('/hr/notification-preferences');
      if (res.data && res.data.preferences) {
        setPreferences(res.data.preferences);
      }
    } catch (err) {
      console.warn('Failed to load notification preferences:', err);
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Could not load notification preferences. Please try refreshing.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const handleToggle = (eventType, channel) => {
    setPreferences((prev) =>
      prev.map((item) => {
        if (item.eventType === eventType) {
          if (channel === 'email') {
            return { ...item, emailEnabled: !item.emailEnabled };
          } else if (channel === 'inApp') {
            return { ...item, inAppEnabled: !item.inAppEnabled };
          }
        }
        return item;
      })
    );
  };

  const handleBulkEmail = (enable) => {
    setPreferences((prev) => prev.map((item) => ({ ...item, emailEnabled: enable })));
  };

  const handleBulkInApp = (enable) => {
    setPreferences((prev) => prev.map((item) => ({ ...item, inAppEnabled: enable })));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setAlert(null);
      const res = await api.put('/hr/notification-preferences', { preferences });
      if (res.data && res.data.preferences) {
        setPreferences(res.data.preferences);
      }
      setAlert({
        type: 'success',
        message: 'Notification preferences saved successfully to PostgreSQL database.',
      });
      setTimeout(() => setAlert(null), 5000);
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to save notification preferences.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all notification preferences back to standard system defaults (all enabled)?')) {
      return;
    }
    try {
      setResetting(true);
      setAlert(null);
      const res = await api.post('/hr/notification-preferences/reset');
      if (res.data && res.data.preferences) {
        setPreferences(res.data.preferences);
      }
      setAlert({
        type: 'info',
        message: 'Notification preferences have been reset to default values.',
      });
      setTimeout(() => setAlert(null), 4000);
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to reset preferences.',
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="dashboard-content-page" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="breadcrumb" style={{ marginBottom: '16px', fontSize: '0.85rem' }}>
        <ol style={{ display: 'flex', listStyle: 'none', padding: 0, margin: 0, gap: '8px', color: 'var(--text-muted)' }}>
          <li><Link to="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Dashboard</Link></li>
          <li>/</li>
          <li><Link to="/dashboard/settings" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Settings</Link></li>
          <li>/</li>
          <li style={{ color: 'var(--accent)', fontWeight: 600 }}>Notification Preferences</li>
        </ol>
      </nav>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
            <i className="bi bi-sliders" style={{ color: 'var(--accent)', marginRight: '10px' }}></i>
            Notification Preferences
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Manage automatic email and in-app notifications for candidate application events. Choose how and when SmartHire communicates with candidates.
          </p>
        </div>

        {/* Global Save Button */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={loading || saving || resetting}
            className="btn btn-outline-secondary btn-sm"
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="bi bi-arrow-counterclockwise"></i>
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving || resetting}
            className="btn btn-primary"
            style={{
              padding: '8px 20px',
              fontWeight: 700,
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #FF7900 0%, #EA580C 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-check2"></i>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className={`alert alert-${alert.type}`}
          role="alert"
          style={{
            padding: '14px 18px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            border: alert.type === 'success' ? '1px solid #86efac' : alert.type === 'danger' ? '1px solid #fca5a5' : '1px solid #93c5fd',
            backgroundColor: alert.type === 'success' ? '#f0fdf4' : alert.type === 'danger' ? '#fef2f2' : '#eff6ff',
            color: alert.type === 'success' ? '#166534' : alert.type === 'danger' ? '#991b1b' : '#1e40af',
          }}
        >
          <i className={`bi ${alert.type === 'success' ? 'bi-check-circle-fill' : alert.type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'}`}></i>
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

      {/* Bulk Action Controls */}
      <div
        style={{
          background: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          Quick Bulk Actions:
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleBulkEmail(true)}
            className="btn btn-outline-primary btn-sm"
            style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px' }}
          >
            <i className="bi bi-envelope-check"></i> Enable All Email
          </button>
          <button
            type="button"
            onClick={() => handleBulkEmail(false)}
            className="btn btn-outline-secondary btn-sm"
            style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px' }}
          >
            <i className="bi bi-envelope-x"></i> Disable All Email
          </button>
          <button
            type="button"
            onClick={() => handleBulkInApp(true)}
            className="btn btn-outline-primary btn-sm"
            style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px' }}
          >
            <i className="bi bi-bell"></i> Enable All In-App
          </button>
          <button
            type="button"
            onClick={() => handleBulkInApp(false)}
            className="btn btn-outline-secondary btn-sm"
            style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px' }}
          >
            <i className="bi bi-bell-slash"></i> Disable All In-App
          </button>
        </div>
      </div>

      {/* Preferences Table Card */}
      <div
        className="card"
        style={{
          background: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner-border spinner-border-sm" role="status" style={{ marginRight: '8px' }}></div>
            Loading notification preferences...
          </div>
        ) : preferences.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No preference settings found.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--table-header-bg, #f8fafc)', borderBottom: '2px solid var(--border-color, #e2e8f0)' }}>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', width: '50%' }}>
                    Notification Event
                  </th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', width: '25%' }}>
                    <i className="bi bi-envelope" style={{ marginRight: '6px', color: 'var(--accent)' }}></i>
                    Email Notification
                  </th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', width: '25%' }}>
                    <i className="bi bi-bell" style={{ marginRight: '6px', color: '#0284c7' }}></i>
                    In-App Notification
                  </th>
                </tr>
              </thead>
              <tbody>
                {preferences.map((item, idx) => (
                  <tr
                    key={item.eventType}
                    style={{
                      borderBottom: idx === preferences.length - 1 ? 'none' : '1px solid var(--border-color, #f1f5f9)',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Event Name & Description */}
                    <td style={{ padding: '18px 20px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getEventIcon(item.eventType)}
                        <span>{item.eventLabel || item.eventType}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                        {item.description}
                      </div>
                    </td>

                    {/* Email Toggle */}
                    <td style={{ padding: '18px 20px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <label className="custom-switch" style={{ cursor: 'pointer', position: 'relative', display: 'inline-block', width: '46px', height: '24px' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(item.emailEnabled)}
                            onChange={() => handleToggle(item.eventType, 'email')}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              cursor: 'pointer',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: item.emailEnabled ? 'var(--accent, #FF7900)' : '#cbd5e1',
                              transition: '0.2s',
                              borderRadius: '24px',
                            }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                content: '',
                                height: '18px',
                                width: '18px',
                                left: item.emailEnabled ? '25px' : '3px',
                                bottom: '3px',
                                backgroundColor: 'white',
                                transition: '0.2s',
                                borderRadius: '50%',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              }}
                            />
                          </span>
                        </label>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: item.emailEnabled ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {item.emailEnabled ? 'ENABLED' : 'OFF'}
                        </span>
                      </div>
                    </td>

                    {/* In-App Toggle */}
                    <td style={{ padding: '18px 20px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <label className="custom-switch" style={{ cursor: 'pointer', position: 'relative', display: 'inline-block', width: '46px', height: '24px' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(item.inAppEnabled)}
                            onChange={() => handleToggle(item.eventType, 'inApp')}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              cursor: 'pointer',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: item.inAppEnabled ? '#0284c7' : '#cbd5e1',
                              transition: '0.2s',
                              borderRadius: '24px',
                            }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                content: '',
                                height: '18px',
                                width: '18px',
                                left: item.inAppEnabled ? '25px' : '3px',
                                bottom: '3px',
                                backgroundColor: 'white',
                                transition: '0.2s',
                                borderRadius: '50%',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              }}
                            />
                          </span>
                        </label>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: item.inAppEnabled ? '#0284c7' : 'var(--text-muted)' }}>
                          {item.inAppEnabled ? 'ENABLED' : 'OFF'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving}
          className="btn btn-primary"
          style={{
            padding: '10px 24px',
            fontWeight: 700,
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #FF7900 0%, #EA580C 100%)',
            color: '#ffffff',
            border: 'none',
          }}
        >
          {saving ? 'Saving Preferences...' : 'Save Notification Preferences'}
        </button>
      </div>
    </div>
  );
}

function getEventIcon(eventType) {
  switch (eventType) {
    case 'NEW_APPLICATION_RECEIVED':
      return <i className="bi bi-file-earmark-check-fill" style={{ color: '#FF7900' }}></i>;
    case 'CANDIDATE_SHORTLISTED':
      return <i className="bi bi-star-fill" style={{ color: '#eab308' }}></i>;
    case 'REMOVED_FROM_SHORTLIST':
      return <i className="bi bi-star" style={{ color: '#94a3b8' }}></i>;
    case 'CANDIDATE_REJECTED':
      return <i className="bi bi-x-circle-fill" style={{ color: '#ef4444' }}></i>;
    case 'INTERVIEW_SCHEDULED':
      return <i className="bi bi-calendar2-check-fill" style={{ color: '#FF7900' }}></i>;
    case 'INTERVIEW_CANCELLED':
      return <i className="bi bi-calendar2-x-fill" style={{ color: '#dc2626' }}></i>;
    case 'INTERVIEW_FEEDBACK':
      return <i className="bi bi-chat-square-text-fill" style={{ color: '#0284c7' }}></i>;
    case 'CANDIDATE_HIRED':
      return <i className="bi bi-award-fill" style={{ color: '#10b981' }}></i>;
    default:
      return <i className="bi bi-bell-fill" style={{ color: 'var(--accent)' }}></i>;
  }
}
