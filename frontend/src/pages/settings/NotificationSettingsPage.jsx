import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SettingsLayout from './SettingsLayout';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/client';

// Robust DateTime Formatter with Exact Seconds & UTC Offset Parsing
const formatActualDateTimeWithSeconds = (dateValue) => {
  if (!dateValue) return '--';
  try {
    let dateStr = String(dateValue).trim();
    // If ISO date string has no timezone indicator, append 'Z' so browser treats it as UTC
    if (dateStr.includes('T') && !dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.match(/-\d\d:\d\d$/)) {
      dateStr = `${dateStr}Z`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateValue);

    return d.toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return String(dateValue);
  }
};

// Clean human-readable message parser (strips any raw HTML and trims cleanly)
const cleanNotificationText = (msg) => {
  if (!msg) return '';
  if (msg.includes('<') && msg.includes('>')) {
    let text = msg
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*[\/]?>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 220 ? text.substring(0, 217) + '...' : text;
  }
  return msg;
};

export default function NotificationSettingsPage() {
  const { user, isHr } = useAuth();
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'candidate';
  const currentTab = ['candidate', 'hr', 'email-history', 'app-history'].includes(tabParam)
    ? tabParam
    : 'candidate';

  // Candidate Preferences State (HR Only)
  const [candidatePrefs, setCandidatePrefs] = useState([]);
  const [loadingCandidate, setLoadingCandidate] = useState(isHr);
  const [savingCandidate, setSavingCandidate] = useState(false);

  // HR Personal Preferences State (HR Only)
  const [hrPrefs, setHrPrefs] = useState([]);
  const [loadingHr, setLoadingHr] = useState(isHr);
  const [savingHr, setSavingHr] = useState(false);

  // History States (HR Only)
  const [emailHistory, setEmailHistory] = useState([]);
  const [loadingEmailHistory, setLoadingEmailHistory] = useState(false);
  const [emailSearchQuery, setEmailSearchQuery] = useState('');

  const [appHistory, setAppHistory] = useState([]);
  const [loadingAppHistory, setLoadingAppHistory] = useState(false);
  const [appSearchQuery, setAppSearchQuery] = useState('');

  // Job Seeker In-App Preferences State (Job Seeker Only)
  const defaultSeekerInAppPrefs = [
    {
      id: 'SHORTLIST',
      title: 'Job Application Shortlisted',
      desc: 'Instant in-app alert when an HR recruiter reviews and shortlists your resume for an open vacancy.',
      icon: 'bi-star-fill',
      iconColor: '#f59e0b',
      enabled: true,
    },
    {
      id: 'INTERVIEW_SCHEDULED',
      title: 'Interview Round Scheduled',
      desc: 'Real-time alert with date, meeting link, and interview stage info.',
      icon: 'bi-calendar-event-fill',
      iconColor: '#0284c7',
      enabled: true,
    },
    {
      id: 'INTERVIEW_CANCELLED',
      title: 'Interview Rescheduled / Cancelled',
      desc: 'Immediate alert when scheduled interview timing or meeting room is modified.',
      icon: 'bi-calendar-x-fill',
      iconColor: '#dc2626',
      enabled: true,
    },
    {
      id: 'INTERVIEW_FEEDBACK',
      title: 'Interview Feedback & Scorecard',
      desc: 'Notification when evaluation feedback or technical score is shared by the interviewer.',
      icon: 'bi-chat-left-text-fill',
      iconColor: '#0ea5e9',
      enabled: true,
    },
    {
      id: 'STATUS_UPDATE',
      title: 'Application Status Updates',
      desc: 'In-app notification when application status advances (Review, Screening, Shortlisted, Offered).',
      icon: 'bi-arrow-repeat',
      iconColor: '#8b5cf6',
      enabled: true,
    },
    {
      id: 'OFFER_HIRED',
      title: 'Job Offer & Selection Confirmation',
      desc: 'Alert when an official selection letter, offer status, or hiring confirmation is published.',
      icon: 'bi-award-fill',
      iconColor: '#16a34a',
      enabled: true,
    },
    {
      id: 'JOB_INSIGHTS',
      title: 'Matching Job Role Insights',
      desc: 'Smart recommendations for new vacancies matching your target career role and key skills.',
      icon: 'bi-briefcase-fill',
      iconColor: '#6366f1',
      enabled: true,
    },
    {
      id: 'RESUME_SCAN',
      title: 'AI Resume ATS Scan & Score Updates',
      desc: 'Alert when AI completes ATS resume parsing, match percentage, and skill gap scoring.',
      icon: 'bi-cpu-fill',
      iconColor: '#ec4899',
      enabled: true,
    },
  ];

  const [seekerInAppPrefs, setSeekerInAppPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem('jobseeker_inapp_prefs_' + (user?.email || 'default'));
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return defaultSeekerInAppPrefs;
  });
  const [loadingSeeker, setLoadingSeeker] = useState(!isHr);
  const [savingSeeker, setSavingSeeker] = useState(false);

  const [alert, setAlert] = useState(null); // { type: 'success' | 'danger' | 'info', message: '' }

  // Load Candidate Preferences (HR)
  const fetchCandidatePrefs = async () => {
    try {
      setLoadingCandidate(true);
      const res = await api.get('/hr/notification-preferences');
      if (res.data && res.data.preferences) {
        setCandidatePrefs(res.data.preferences);
      }
    } catch (err) {
      console.warn('Could not load candidate notification preferences:', err);
    } finally {
      setLoadingCandidate(false);
    }
  };

  // Load HR Personal Preferences (HR)
  const fetchHrPrefs = async () => {
    try {
      setLoadingHr(true);
      const res = await api.get('/hr/notification-preferences/personal');
      if (res.data && res.data.preferences) {
        setHrPrefs(res.data.preferences);
      }
    } catch (err) {
      console.warn('Could not load HR personal notification preferences:', err);
    } finally {
      setLoadingHr(false);
    }
  };

  // Load Sent Email History (HR)
  const fetchEmailHistory = async () => {
    try {
      setLoadingEmailHistory(true);
      let res;
      try {
        res = await api.get('/hr/notification-preferences/history/email');
      } catch (e1) {
        console.warn('Falling back to /dashboard/notification-history/email:', e1?.message);
        res = await api.get('/dashboard/notification-history/email');
      }
      if (res && res.data) {
        const list = Array.isArray(res.data.history)
          ? res.data.history
          : Array.isArray(res.data.rawQueue)
          ? res.data.rawQueue
          : Array.isArray(res.data.deliveryLogs)
          ? res.data.deliveryLogs
          : [];
        setEmailHistory(list);
      }
    } catch (err) {
      console.warn('Could not load sent email history:', err);
    } finally {
      setLoadingEmailHistory(false);
    }
  };

  // Load In-App Notification History (HR)
  const fetchAppHistory = async () => {
    try {
      setLoadingAppHistory(true);
      let res;
      try {
        res = await api.get('/hr/notification-preferences/history/app');
      } catch (e1) {
        console.warn('Falling back to /dashboard/notification-history/app:', e1?.message);
        res = await api.get('/dashboard/notification-history/app');
      }
      if (res && res.data) {
        setAppHistory(Array.isArray(res.data.history) ? res.data.history : []);
      }
    } catch (err) {
      console.warn('Could not load app notification history:', err);
    } finally {
      setLoadingAppHistory(false);
    }
  };

  // Silent background fetchers (does not toggle loading spinner to prevent UI flicker)
  const fetchAppHistorySilent = async () => {
    try {
      let res;
      try {
        res = await api.get('/hr/notification-preferences/history/app');
      } catch (e1) {
        res = await api.get('/dashboard/notification-history/app');
      }
      if (res && res.data && Array.isArray(res.data.history)) {
        setAppHistory(res.data.history);
      }
    } catch (_) {}
  };

  const fetchEmailHistorySilent = async () => {
    try {
      let res;
      try {
        res = await api.get('/hr/notification-preferences/history/email');
      } catch (e1) {
        res = await api.get('/dashboard/notification-history/email');
      }
      if (res && res.data) {
        const list = Array.isArray(res.data.history)
          ? res.data.history
          : Array.isArray(res.data.rawQueue)
          ? res.data.rawQueue
          : Array.isArray(res.data.deliveryLogs)
          ? res.data.deliveryLogs
          : [];
        setEmailHistory(list);
      }
    } catch (_) {}
  };

  // Load Job Seeker Preferences
  const fetchSeekerPrefs = async () => {
    try {
      setLoadingSeeker(true);
      const res = await api.get('/settings');
      if (res.data) {
        setSeekerInAppPrefs((prev) =>
          prev.map((item) => {
            if (item.id === 'RESUME_SCAN' && res.data.notifResumeScan !== undefined) {
              return { ...item, enabled: Boolean(res.data.notifResumeScan) };
            }
            if (item.id === 'JOB_INSIGHTS' && res.data.notifJobInsights !== undefined) {
              return { ...item, enabled: Boolean(res.data.notifJobInsights) };
            }
            if (item.id === 'INTERVIEW_SCHEDULED' && res.data.notifInterviewUpdates !== undefined) {
              return { ...item, enabled: Boolean(res.data.notifInterviewUpdates) };
            }
            return item;
          })
        );
      }
    } catch (err) {
      console.warn('Could not load seeker preferences:', err);
    } finally {
      setLoadingSeeker(false);
    }
  };

  useEffect(() => {
    if (isHr) {
      if (currentTab === 'email-history') {
        fetchEmailHistory();
      } else if (currentTab === 'app-history') {
        fetchAppHistory();
      } else if (currentTab === 'hr') {
        fetchHrPrefs();
      } else {
        fetchCandidatePrefs();
      }
    } else {
      fetchSeekerPrefs();
    }
  }, [isHr, currentTab]);

  // Real-Time Synchronization Listener for HR Notification History (Auto-updates Read status without refresh)
  useEffect(() => {
    if (!isHr) return;

    const handleRealtimeSync = (data) => {
      if (!data) return;

      // 1. Instant optimistic update when candidate marks notification read
      if (data.event === 'NOTIFICATION_READ') {
        const notifId = data.notificationId;
        const targetEmail = data.userEmail ? data.userEmail.trim().toLowerCase() : null;

        setAppHistory((prev) =>
          prev.map((item) => {
            const matchesId = notifId && (
              String(item.id) === String(notifId) ||
              item.id === `queue_${notifId}` ||
              String(item.notificationId) === String(notifId)
            );
            const matchesEmail = targetEmail && (
              item.userEmail?.toLowerCase() === targetEmail ||
              item.recipientEmail?.toLowerCase() === targetEmail
            );

            if (matchesId || (data.action === 'UPDATE_ALL' && matchesEmail)) {
              return {
                ...item,
                isRead: true,
                status: 'READ',
              };
            }
            return item;
          })
        );

        // Fetch fresh state in background shortly after
        setTimeout(() => {
          fetchAppHistorySilent();
        }, 500);
      }

      // 2. Refetch if new notification sent or candidate pipeline state changed
      if (
        data.event === 'NOTIFICATION_SENT' ||
        data.event === 'STAGE_UPDATED' ||
        data.event === 'INTERVIEW_SCHEDULED' ||
        data.event === 'INTERVIEW_CANCELLED'
      ) {
        if (currentTab === 'app-history') fetchAppHistorySilent();
        if (currentTab === 'email-history') fetchEmailHistorySilent();
      }
    };

    // Listen to custom DOM event dispatched by NotificationSocket
    const onDomSync = (e) => handleRealtimeSync(e.detail);
    window.addEventListener('smarthire:sync', onDomSync);

    // Listen to cross-tab BroadcastChannel for same-browser instant sync
    let bc = null;
    try {
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        bc = new BroadcastChannel('smarthire_sync_channel');
        bc.onmessage = (e) => handleRealtimeSync(e.data);
      }
    } catch (_) {}

    // Auto-refresh when tab gains focus or becomes visible
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        if (currentTab === 'app-history') fetchAppHistorySilent();
        if (currentTab === 'email-history') fetchEmailHistorySilent();
      }
    };
    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);

    // Live background polling interval (every 4 seconds when HR is on app-history tab)
    let pollTimer = null;
    if (currentTab === 'app-history') {
      pollTimer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchAppHistorySilent();
        }
      }, 4000);
    } else if (currentTab === 'email-history') {
      pollTimer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchEmailHistorySilent();
        }
      }, 6000);
    }

    return () => {
      window.removeEventListener('smarthire:sync', onDomSync);
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      if (pollTimer) clearInterval(pollTimer);
      if (bc) {
        try {
          bc.close();
        } catch (_) {}
      }
    };
  }, [isHr, currentTab]);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
    setAlert(null);
  };

  // Job Seeker In-App Actions
  const handleToggleSeeker = (id) => {
    setSeekerInAppPrefs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const handleBulkSeekerInApp = (enable) => {
    setSeekerInAppPrefs((prev) => prev.map((item) => ({ ...item, enabled: enable })));
  };

  const handleSaveSeekerPrefs = async () => {
    try {
      setSavingSeeker(true);
      setAlert(null);

      const resumeScan = seekerInAppPrefs.find((p) => p.id === 'RESUME_SCAN')?.enabled ?? true;
      const jobInsights = seekerInAppPrefs.find((p) => p.id === 'JOB_INSIGHTS')?.enabled ?? true;
      const interviewUpdates = seekerInAppPrefs.find((p) => p.id === 'INTERVIEW_SCHEDULED')?.enabled ?? true;
      const statusAlerts = seekerInAppPrefs.find((p) => p.id === 'STATUS_UPDATE')?.enabled ?? true;

      await api.post('/settings/preferences', {
        notifResumeScan: resumeScan,
        notifJobInsights: jobInsights,
        notifInterviewUpdates: interviewUpdates,
        applicationStatusAlerts: statusAlerts,
      });

      try {
        localStorage.setItem(
          'jobseeker_inapp_prefs_' + (user?.email || 'default'),
          JSON.stringify(seekerInAppPrefs)
        );
      } catch (e) {}

      setAlert({
        type: 'success',
        message: 'Job Seeker in-app notification preferences saved successfully! Only chosen alerts will appear in your dashboard.',
      });
      setTimeout(() => setAlert(null), 5000);
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to save notification preferences. Please try again.',
      });
    } finally {
      setSavingSeeker(false);
    }
  };

  // Candidate toggle
  const handleToggleCandidate = (eventType, channel) => {
    setCandidatePrefs((prev) =>
      prev.map((item) => {
        if (item.eventType === eventType) {
          if (channel === 'email') return { ...item, emailEnabled: !item.emailEnabled };
          if (channel === 'inApp') return { ...item, inAppEnabled: !item.inAppEnabled };
        }
        return item;
      })
    );
  };

  // Bulk actions for Candidate
  const handleBulkCandidateEmail = (enable) => {
    setCandidatePrefs((prev) => prev.map((item) => ({ ...item, emailEnabled: enable })));
  };
  const handleBulkCandidateInApp = (enable) => {
    setCandidatePrefs((prev) => prev.map((item) => ({ ...item, inAppEnabled: enable })));
  };

  // Save Candidate Preferences
  const handleSaveCandidate = async () => {
    try {
      setSavingCandidate(true);
      setAlert(null);
      const res = await api.put('/hr/notification-preferences', { preferences: candidatePrefs });
      if (res.data?.preferences) {
        setCandidatePrefs(res.data.preferences);
      }
      setAlert({
        type: 'success',
        message: 'Candidate notification preferences saved successfully to PostgreSQL database.',
      });
      setTimeout(() => setAlert(null), 5000);
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to save candidate notification preferences.',
      });
    } finally {
      setSavingCandidate(false);
    }
  };

  // Reset Candidate to Defaults
  const handleResetCandidate = async () => {
    if (!window.confirm('Reset candidate notification preferences back to system defaults (all enabled)?')) return;
    try {
      setSavingCandidate(true);
      setAlert(null);
      const res = await api.post('/hr/notification-preferences/reset');
      if (res.data?.preferences) {
        setCandidatePrefs(res.data.preferences);
      }
      setAlert({
        type: 'info',
        message: 'Candidate notification preferences have been reset to default values.',
      });
      setTimeout(() => setAlert(null), 4000);
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to reset preferences.',
      });
    } finally {
      setSavingCandidate(false);
    }
  };

  // HR Personal toggle
  const handleToggleHr = (eventType, channel) => {
    setHrPrefs((prev) =>
      prev.map((item) => {
        if (item.eventType === eventType) {
          if (channel === 'email') return { ...item, emailEnabled: !item.emailEnabled };
          if (channel === 'inApp') return { ...item, inAppEnabled: !item.inAppEnabled };
        }
        return item;
      })
    );
  };

  // Bulk actions for HR Personal
  const handleBulkHrEmail = (enable) => {
    setHrPrefs((prev) => prev.map((item) => ({ ...item, emailEnabled: enable })));
  };
  const handleBulkHrInApp = (enable) => {
    setHrPrefs((prev) => prev.map((item) => ({ ...item, inAppEnabled: enable })));
  };

  // Save HR Personal Preferences
  const handleSaveHr = async () => {
    try {
      setSavingHr(true);
      setAlert(null);
      const res = await api.put('/hr/notification-preferences/personal', { preferences: hrPrefs });
      if (res.data?.preferences) {
        setHrPrefs(res.data.preferences);
      }
      setAlert({
        type: 'success',
        message: 'HR personal notification preferences saved successfully.',
      });
      setTimeout(() => setAlert(null), 5000);
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to save HR notification preferences.',
      });
    } finally {
      setSavingHr(false);
    }
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'CANDIDATE_SHORTLISTED':
        return <i className="bi bi-star-fill" style={{ color: '#f59e0b' }}></i>;
      case 'REMOVED_FROM_SHORTLIST':
        return <i className="bi bi-star" style={{ color: '#64748b' }}></i>;
      case 'CANDIDATE_REJECTED':
        return <i className="bi bi-x-circle-fill" style={{ color: '#ef4444' }}></i>;
      case 'INTERVIEW_SCHEDULED':
        return <i className="bi bi-calendar-event-fill" style={{ color: '#0284c7' }}></i>;
      case 'INTERVIEW_CANCELLED':
        return <i className="bi bi-calendar-x-fill" style={{ color: '#dc2626' }}></i>;
      case 'INTERVIEW_FEEDBACK':
        return <i className="bi bi-chat-left-text-fill" style={{ color: '#0ea5e9' }}></i>;
      case 'CANDIDATE_HIRED':
        return <i className="bi bi-award-fill" style={{ color: '#16a34a' }}></i>;
      case 'NEW_APPLICATION_RECEIVED':
        return <i className="bi bi-file-earmark-check-fill" style={{ color: '#FF7900' }}></i>;
      case 'INTERVIEW_ACCEPTED_BY_CANDIDATE':
        return <i className="bi bi-check-circle-fill" style={{ color: '#10b981' }}></i>;
      case 'CRITICAL_SYSTEM_ALERT':
        return <i className="bi bi-shield-exclamation" style={{ color: '#f97316' }}></i>;
      default:
        return <i className="bi bi-bell-fill" style={{ color: 'var(--accent)' }}></i>;
    }
  };

  const offTrackColor = isDark ? '#334155' : '#cbd5e1';

  return (
    <SettingsLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Navigation Sub-Tabs (HR Recruiters Only) */}
        {isHr && (
          <div className="settings-inner-subtabs">
            <button
              type="button"
              onClick={() => handleTabChange('candidate')}
              className="settings-inner-subtab-btn"
              style={{
                background: currentTab === 'candidate' ? 'var(--card-bg)' : 'transparent',
                color: currentTab === 'candidate' ? 'var(--accent, #ea580c)' : 'var(--text-secondary)',
                borderBottom: currentTab === 'candidate' ? '3px solid var(--accent, #ea580c)' : '3px solid transparent',
              }}
            >
              <i className="bi bi-envelope-paper"></i>
              <span>Notify Preferences (Candidate)</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  background: currentTab === 'candidate' ? 'rgba(234, 88, 12, 0.15)' : 'var(--bg-secondary)',
                  color: currentTab === 'candidate' ? 'var(--accent, #ea580c)' : 'var(--text-muted)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                7 Events
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('hr')}
              className="settings-inner-subtab-btn"
              style={{
                background: currentTab === 'hr' ? 'var(--card-bg)' : 'transparent',
                color: currentTab === 'hr' ? 'var(--accent, #ea580c)' : 'var(--text-secondary)',
                borderBottom: currentTab === 'hr' ? '3px solid var(--accent, #ea580c)' : '3px solid transparent',
              }}
            >
              <i className="bi bi-person-badge"></i>
              <span>HR Notification Preferences</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  background: currentTab === 'hr' ? 'rgba(234, 88, 12, 0.15)' : 'var(--bg-secondary)',
                  color: currentTab === 'hr' ? 'var(--accent, #ea580c)' : 'var(--text-muted)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                In-App Alerts
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('email-history')}
              className="settings-inner-subtab-btn"
              style={{
                background: currentTab === 'email-history' ? 'var(--card-bg)' : 'transparent',
                color: currentTab === 'email-history' ? '#059669' : 'var(--text-secondary)',
                borderBottom: currentTab === 'email-history' ? '3px solid #059669' : '3px solid transparent',
              }}
            >
              <i className="bi bi-envelope-check"></i>
              <span>Sent Email History</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  background: currentTab === 'email-history' ? 'rgba(5, 150, 105, 0.15)' : 'var(--bg-secondary)',
                  color: currentTab === 'email-history' ? '#059669' : 'var(--text-muted)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                {emailHistory.length} Sent
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('app-history')}
              className="settings-inner-subtab-btn"
              style={{
                background: currentTab === 'app-history' ? 'var(--card-bg)' : 'transparent',
                color: currentTab === 'app-history' ? '#0284c7' : 'var(--text-secondary)',
                borderBottom: currentTab === 'app-history' ? '3px solid #0284c7' : '3px solid transparent',
              }}
            >
              <i className="bi bi-app-indicator"></i>
              <span>App Notification History</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  background: currentTab === 'app-history' ? 'rgba(2, 132, 199, 0.15)' : 'var(--bg-secondary)',
                  color: currentTab === 'app-history' ? '#0284c7' : 'var(--text-muted)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                {appHistory.length} Alerts
              </span>
            </button>
          </div>
        )}

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
              border: alert.type === 'success' ? '1px solid #86efac' : alert.type === 'danger' ? '1px solid #fca5a5' : '1px solid #93c5fd',
              backgroundColor: alert.type === 'success' ? (isDark ? 'rgba(22, 101, 52, 0.25)' : '#f0fdf4') : (isDark ? 'rgba(185, 28, 28, 0.25)' : '#fef2f2'),
              color: alert.type === 'success' ? (isDark ? '#86efac' : '#166534') : (isDark ? '#fca5a5' : '#991b1b'),
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

        {/* ========================================================================= */}
        {/* JOB SEEKER IN-APP NOTIFICATION PREFERENCES VIEW (JOB SEEKER ONLY)         */}
        {/* ========================================================================= */}
        {!isHr && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Quick Bulk Actions Bar */}
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '14px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  In-App Notification Preferences:
                </span>
                <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                  Select the real-time in-app alerts you want to receive on your dashboard. (Email notifications are turned off).
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleBulkSeekerInApp(true)}
                  className="btn btn-outline-primary btn-sm"
                  style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '6px' }}
                >
                  <i className="bi bi-bell"></i> Enable All In-App
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSeekerInApp(false)}
                  className="btn btn-outline-secondary btn-sm"
                  style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '6px' }}
                >
                  <i className="bi bi-bell-slash"></i> Disable All In-App
                </button>
              </div>
            </div>

            {/* In-App Table Card */}
            <div
              className="card"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                padding: 0,
              }}
            >
              {loadingSeeker ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="spinner-border spinner-border-sm" role="status" style={{ marginRight: '8px' }}></div>
                  Loading in-app notification preferences...
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', width: '70%' }}>
                          NOTIFICATION TYPE &amp; RECRUITMENT EVENT
                        </th>
                        <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', width: '30%' }}>
                          <i className="bi bi-bell" style={{ marginRight: '6px', color: 'var(--accent, #ea580c)' }}></i>
                          In-App Notification
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {seekerInAppPrefs.map((item, idx) => (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: idx === seekerInAppPrefs.length - 1 ? 'none' : '1px solid var(--border-color)',
                          }}
                        >
                          <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                  fontSize: '1rem',
                                  color: item.iconColor,
                                }}
                              >
                                <i className={`bi ${item.icon}`}></i>
                              </span>
                              <span>{item.title}</span>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                                  color: isDark ? '#93c5fd' : '#1d4ed8',
                                  border: isDark ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid #bfdbfe',
                                }}
                              >
                                In-App Only
                              </span>
                            </div>
                            <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginTop: '4px', marginLeft: '42px' }}>
                              {item.desc}
                            </div>
                          </td>

                          {/* In-App Toggle (Single Switch, NO EMAIL) */}
                          <td style={{ padding: '16px 20px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', margin: 0, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.enabled)}
                                  onChange={() => handleToggleSeeker(item.id)}
                                  style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: item.enabled ? 'var(--accent, #ea580c)' : offTrackColor,
                                    borderRadius: '34px',
                                    transition: '0.2s',
                                  }}
                                >
                                  <span
                                    style={{
                                      position: 'absolute',
                                      content: '""',
                                      height: '20px',
                                      width: '20px',
                                      left: item.enabled ? '24px' : '3px',
                                      bottom: '3px',
                                      backgroundColor: 'white',
                                      borderRadius: '50%',
                                      transition: '0.2s',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                    }}
                                  ></span>
                                </span>
                              </label>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: item.enabled ? 'var(--accent, #ea580c)' : 'var(--text-muted)' }}>
                                {item.enabled ? 'ENABLED' : 'OFF'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer Save Button */}
              <div
                style={{
                  padding: '16px 20px',
                  background: 'var(--table-header-bg)',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={handleSaveSeekerPrefs}
                  disabled={savingSeeker}
                  className="btn btn-primary"
                  style={{
                    background: 'var(--accent, #ea580c)',
                    borderColor: 'var(--accent, #ea580c)',
                    padding: '8px 24px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {savingSeeker ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      Saving Preferences...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle"></i> Save Notification Preferences
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-SECTION 1: CANDIDATE NOTIFY PREFERENCES (HR ONLY)                     */}
        {/* ========================================================================= */}
        {isHr && currentTab === 'candidate' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Quick Bulk Actions Bar */}
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Candidate Preferences:
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                  Decide whether candidates receive automated email &amp; in-app notifications per event.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleBulkCandidateEmail(true)}
                  className="btn btn-outline-primary btn-sm"
                  style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px' }}
                >
                  <i className="bi bi-envelope-check"></i> Enable All Email
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkCandidateEmail(false)}
                  className="btn btn-outline-secondary btn-sm"
                  style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px' }}
                >
                  <i className="bi bi-envelope-x"></i> Disable All Email
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkCandidateInApp(true)}
                  className="btn btn-outline-primary btn-sm"
                  style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px' }}
                >
                  <i className="bi bi-bell"></i> Enable All In-App
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkCandidateInApp(false)}
                  className="btn btn-outline-secondary btn-sm"
                  style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px' }}
                >
                  <i className="bi bi-bell-slash"></i> Disable All In-App
                </button>
              </div>
            </div>

            {/* Candidate Preferences Table */}
            <div
              className="card"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                padding: 0,
              }}
            >
              {loadingCandidate ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="spinner-border spinner-border-sm" role="status" style={{ marginRight: '8px' }}></div>
                  Loading candidate preferences...
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', width: '50%' }}>
                          RECRUITMENT EVENT
                        </th>
                        <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', width: '25%' }}>
                          <i className="bi bi-envelope" style={{ marginRight: '6px', color: 'var(--accent)' }}></i>
                          Candidate Email Preferences
                        </th>
                        <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', width: '25%' }}>
                          <i className="bi bi-bell" style={{ marginRight: '6px', color: '#0284c7' }}></i>
                          Candidate In-App Preferences
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidatePrefs.map((item, idx) => (
                        <tr
                          key={item.eventType}
                          style={{
                            borderBottom: idx === candidatePrefs.length - 1 ? 'none' : '1px solid var(--border-color)',
                          }}
                        >
                          <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {getEventIcon(item.eventType)}
                              <span>{item.eventLabel || item.eventType}</span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              {item.description}
                            </div>
                          </td>

                          {/* Email Toggle */}
                          <td style={{ padding: '16px 20px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', margin: 0, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.emailEnabled)}
                                  onChange={() => handleToggleCandidate(item.eventType, 'email')}
                                  style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: item.emailEnabled ? 'var(--accent, #ea580c)' : offTrackColor,
                                    borderRadius: '34px',
                                    transition: '0.2s',
                                  }}
                                >
                                  <span
                                    style={{
                                      position: 'absolute',
                                      content: '""',
                                      height: '20px',
                                      width: '20px',
                                      left: item.emailEnabled ? '24px' : '3px',
                                      bottom: '3px',
                                      backgroundColor: 'white',
                                      borderRadius: '50%',
                                      transition: '0.2s',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                    }}
                                  ></span>
                                </span>
                              </label>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: item.emailEnabled ? 'var(--accent, #ea580c)' : 'var(--text-muted)' }}>
                                {item.emailEnabled ? 'ENABLED' : 'OFF'}
                              </span>
                            </div>
                          </td>

                          {/* In-App Toggle */}
                          <td style={{ padding: '16px 20px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', margin: 0, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.inAppEnabled)}
                                  onChange={() => handleToggleCandidate(item.eventType, 'inApp')}
                                  style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: item.inAppEnabled ? '#0284c7' : offTrackColor,
                                    borderRadius: '34px',
                                    transition: '0.2s',
                                  }}
                                >
                                  <span
                                    style={{
                                      position: 'absolute',
                                      content: '""',
                                      height: '20px',
                                      width: '20px',
                                      left: item.inAppEnabled ? '24px' : '3px',
                                      bottom: '3px',
                                      backgroundColor: 'white',
                                      borderRadius: '50%',
                                      transition: '0.2s',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                    }}
                                  ></span>
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

              {/* Bottom Actions Footer */}
              <div
                style={{
                  padding: '16px 20px',
                  background: 'var(--table-header-bg)',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={handleResetCandidate}
                  disabled={savingCandidate}
                  className="btn btn-outline-secondary btn-sm"
                  style={{ borderRadius: '6px' }}
                >
                  <i className="bi bi-arrow-counterclockwise"></i> Reset to Defaults
                </button>

                <button
                  type="button"
                  onClick={handleSaveCandidate}
                  disabled={savingCandidate}
                  className="btn btn-primary"
                  style={{
                    background: 'var(--accent, #ea580c)',
                    borderColor: 'var(--accent, #ea580c)',
                    padding: '8px 22px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {savingCandidate ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      Saving Preferences...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle"></i> Save Candidate Preferences
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-SECTION 2: HR NOTIFICATION PREFERENCES (HR ONLY)                       */}
        {/* ========================================================================= */}
        {isHr && currentTab === 'hr' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Quick Bulk Actions Bar */}
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  HR In-App Notification Preferences:
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                  Configure what real-time bell alerts and dashboard badges YOU receive as a recruiter.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleBulkHrInApp(true)}
                  className="btn btn-outline-primary btn-sm"
                  style={{ fontSize: '0.8rem', padding: '5px 12px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="bi bi-bell-fill"></i> Enable All In-App
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkHrInApp(false)}
                  className="btn btn-outline-secondary btn-sm"
                  style={{ fontSize: '0.8rem', padding: '5px 12px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="bi bi-bell-slash"></i> Disable All In-App
                </button>
              </div>
            </div>

            {/* HR Preferences Table */}
            <div
              className="card"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                padding: 0,
              }}
            >
              {loadingHr ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="spinner-border spinner-border-sm" role="status" style={{ marginRight: '8px' }}></div>
                  Loading HR in-app preferences...
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', width: '70%' }}>
                          RECRUITER EVENT
                        </th>
                        <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', width: '30%' }}>
                          <i className="bi bi-bell-fill" style={{ marginRight: '6px', color: '#0284c7' }}></i>
                          HR In-App Notifications
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {hrPrefs.map((item, idx) => (
                        <tr
                          key={item.eventType}
                          style={{
                            borderBottom: idx === hrPrefs.length - 1 ? 'none' : '1px solid var(--border-color)',
                          }}
                        >
                          <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {getEventIcon(item.eventType)}
                              <span>{item.eventLabel || item.eventType}</span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              {item.description}
                            </div>
                          </td>

                          {/* HR In-App Toggle */}
                          <td style={{ padding: '16px 20px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', margin: 0, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.inAppEnabled)}
                                  onChange={() => handleToggleHr(item.eventType, 'inApp')}
                                  style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: item.inAppEnabled ? '#0284c7' : offTrackColor,
                                    borderRadius: '34px',
                                    transition: '0.2s',
                                  }}
                                >
                                  <span
                                    style={{
                                      position: 'absolute',
                                      content: '""',
                                      height: '20px',
                                      width: '20px',
                                      left: item.inAppEnabled ? '24px' : '3px',
                                      bottom: '3px',
                                      backgroundColor: 'white',
                                      borderRadius: '50%',
                                      transition: '0.2s',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                    }}
                                  ></span>
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

              {/* Bottom Actions Footer */}
              <div
                style={{
                  padding: '16px 20px',
                  background: 'var(--table-header-bg)',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={handleSaveHr}
                  disabled={savingHr}
                  className="btn btn-primary"
                  style={{
                    background: 'var(--accent, #ea580c)',
                    borderColor: 'var(--accent, #ea580c)',
                    padding: '8px 22px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {savingHr ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      Saving HR Preferences...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle"></i> Save HR Preferences
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-SECTION 3: SENT EMAIL NOTIFICATION HISTORY (HR ONLY)                  */}
        {/* ========================================================================= */}
        {isHr && currentTab === 'email-history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Toolbar */}
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <i className="bi bi-envelope-check-fill" style={{ color: '#059669', marginRight: '6px' }}></i>
                  Sent Candidate Email History
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                  Recruiter-isolated log of automated interview invitations, status updates, and candidate notices.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <i
                    className="bi bi-search"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}
                  ></i>
                  <input
                    type="text"
                    value={emailSearchQuery}
                    onChange={(e) => setEmailSearchQuery(e.target.value)}
                    placeholder="Search candidate, email, event..."
                    className="form-control form-control-sm"
                    style={{ paddingLeft: '30px', height: '32px', minWidth: '220px', borderRadius: '6px' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchEmailHistory}
                  disabled={loadingEmailHistory}
                  className="btn btn-outline-secondary btn-sm"
                  style={{ height: '32px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className={`bi bi-arrow-clockwise ${loadingEmailHistory ? 'spin' : ''}`}></i>
                  Refresh
                </button>
              </div>
            </div>

            {/* Email History Table */}
            <div
              className="card"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                padding: 0,
              }}
            >
              {loadingEmailHistory ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="spinner-border spinner-border-sm" role="status" style={{ marginRight: '8px' }}></div>
                  Loading sent email history...
                </div>
              ) : emailHistory.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    <i className="bi bi-inbox"></i>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    No Sent Email History Yet
                  </h4>
                  <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Candidate interview invites and shortlist emails dispatched by your recruiter account will be recorded here.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', width: '25%' }}>
                          RECIPIENT CANDIDATE
                        </th>
                        <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', width: '35%' }}>
                          EMAIL SUBJECT &amp; EVENT
                        </th>
                        <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', width: '15%' }}>
                          STATUS
                        </th>
                        <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', width: '25%' }}>
                          DISPATCHED AT
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailHistory
                        .filter((item) => {
                          if (!emailSearchQuery.trim()) return true;
                          const q = emailSearchQuery.toLowerCase();
                          return (
                            (item.recipientName && item.recipientName.toLowerCase().includes(q)) ||
                            (item.recipientEmail && item.recipientEmail.toLowerCase().includes(q)) ||
                            (item.subject && item.subject.toLowerCase().includes(q)) ||
                            (item.eventType && item.eventType.toLowerCase().includes(q))
                          );
                        })
                        .map((item, idx) => {
                          const isSuccess = item.status === 'SENT' || item.status === 'SUCCESS';
                          const isFailed = item.status === 'FAILED';
                          const isPending = item.status === 'PENDING' || item.status === 'RETRY_PENDING';
                          const isSuppressed = item.status === 'DISABLED';
                          const formattedDate = formatActualDateTimeWithSeconds(item.createdAt);

                          return (
                            <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                  {item.recipientName || 'Candidate'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  {item.recipientEmail}
                                </div>
                              </td>

                              <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                  {item.subject || item.eventType || 'Candidate Recruitment Notice'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    {item.eventType || 'EMAIL_EVENT'}
                                  </span>
                                  {item.errorMessage && (
                                    <span style={{ fontSize: '0.72rem', color: '#dc2626' }}>
                                      &bull; {item.errorMessage}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td style={{ padding: '14px 18px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    background: isSuccess
                                      ? (isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5')
                                      : isFailed
                                      ? (isDark ? 'rgba(220, 38, 38, 0.2)' : '#fef2f2')
                                      : isPending
                                      ? (isDark ? 'rgba(217, 119, 6, 0.2)' : '#fffbeb')
                                      : (isDark ? 'rgba(100, 116, 139, 0.2)' : '#f1f5f9'),
                                    color: isSuccess ? '#059669' : isFailed ? '#dc2626' : isPending ? '#d97706' : '#64748b',
                                  }}
                                >
                                  <i className={`bi ${isSuccess ? 'bi-check-circle-fill' : isFailed ? 'bi-x-circle-fill' : isPending ? 'bi-clock-fill' : 'bi-dash-circle'}`}></i>
                                  {item.status || 'SENT'}
                                </span>
                              </td>

                              <td style={{ padding: '14px 18px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.83rem', color: 'var(--text-primary)' }}>
                                  {formattedDate}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  <i className="bi bi-clock me-1"></i>Actual Sent Time
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-SECTION 4: CANDIDATE APP NOTIFICATION HISTORY (HR ONLY)               */}
        {/* ========================================================================= */}
        {isHr && currentTab === 'app-history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Toolbar */}
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <i className="bi bi-app-indicator" style={{ color: '#0284c7', marginRight: '6px' }}></i>
                  Candidate In-App Notification History
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                  Audit log of candidate dashboard notifications pushed in real-time by your recruiter profile.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <i
                    className="bi bi-search"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}
                  ></i>
                  <input
                    type="text"
                    value={appSearchQuery}
                    onChange={(e) => setAppSearchQuery(e.target.value)}
                    placeholder="Search candidate, role, message..."
                    className="form-control form-control-sm"
                    style={{ paddingLeft: '30px', height: '32px', minWidth: '220px', borderRadius: '6px' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchAppHistory}
                  disabled={loadingAppHistory}
                  className="btn btn-outline-secondary btn-sm"
                  style={{ height: '32px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className={`bi bi-arrow-clockwise ${loadingAppHistory ? 'spin' : ''}`}></i>
                  Refresh
                </button>
              </div>
            </div>

            {/* In-App History Table */}
            <div
              className="card"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                padding: 0,
              }}
            >
              {loadingAppHistory ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="spinner-border spinner-border-sm" role="status" style={{ marginRight: '8px' }}></div>
                  Loading in-app notification history...
                </div>
              ) : appHistory.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    <i className="bi bi-bell-slash"></i>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    No In-App Candidate Notifications
                  </h4>
                  <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    In-app notifications dispatched to candidates upon interview scheduling or shortlisting will be displayed here.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', width: '25%' }}>
                          CANDIDATE
                        </th>
                        <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', width: '45%' }}>
                          NOTIFICATION TITLE &amp; MESSAGE
                        </th>
                        <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', width: '12%' }}>
                          STATUS
                        </th>
                        <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', width: '18%' }}>
                          PUSHED AT
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {appHistory
                        .filter((item) => {
                          if (!appSearchQuery.trim()) return true;
                          const q = appSearchQuery.toLowerCase();
                          return (
                            (item.candidateName && item.candidateName.toLowerCase().includes(q)) ||
                            (item.userEmail && item.userEmail.toLowerCase().includes(q)) ||
                            (item.recipientEmail && item.recipientEmail.toLowerCase().includes(q)) ||
                            (item.title && item.title.toLowerCase().includes(q)) ||
                            (item.message && item.message.toLowerCase().includes(q)) ||
                            (item.jobTitle && item.jobTitle.toLowerCase().includes(q)) ||
                            (item.eventType && item.eventType.toLowerCase().includes(q))
                          );
                        })
                        .map((item, idx) => {
                          const formattedDate = formatActualDateTimeWithSeconds(item.createdAt);
                          const cleanMsg = cleanNotificationText(item.message);
                          const eType = String(item.eventType || '').toUpperCase();
                          const isShortlist = eType.includes('SHORTLIST');
                          const isCancel = eType.includes('CANCEL') || eType.includes('REJECT');
                          const isInterview = eType.includes('INTERVIEW') || eType.includes('SCHEDULE');
                          const isHired = eType.includes('HIRE') || eType.includes('OFFER');

                          const eventIcon = isShortlist
                            ? 'bi-star-fill'
                            : isCancel
                            ? 'bi-calendar-x-fill'
                            : isInterview
                            ? 'bi-calendar-check-fill'
                            : isHired
                            ? 'bi-award-fill'
                            : 'bi-bell-fill';

                          const eventColor = isShortlist
                            ? '#d97706'
                            : isCancel
                            ? '#dc2626'
                            : isInterview
                            ? '#0284c7'
                            : isHired
                            ? '#059669'
                            : '#64748b';

                          const candInitial = (item.candidateName || item.userEmail || 'C').charAt(0).toUpperCase();

                          return (
                            <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '8px',
                                      background: 'linear-gradient(135deg, #FF7900, #EA580C)',
                                      color: '#ffffff',
                                      fontWeight: 800,
                                      fontSize: '0.88rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {candInitial}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                      {item.candidateName || 'Candidate'}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                      {item.userEmail || item.recipientEmail || '--'}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      background: isDark ? 'rgba(255,255,255,0.06)' : 'var(--bg-secondary)',
                                      color: eventColor,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                                    }}
                                  >
                                    <i className={`bi ${eventIcon}`}></i>
                                    {item.eventType || 'IN_APP_ALERT'}
                                  </span>

                                  {item.jobTitle && (
                                    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                      <i className="bi bi-briefcase me-1"></i>
                                      {item.jobTitle}
                                    </span>
                                  )}
                                </div>

                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                  {item.title || 'Recruitment Notice'}
                                </div>

                                <div
                                  style={{
                                    fontSize: '0.82rem',
                                    color: 'var(--text-secondary)',
                                    lineHeight: 1.45,
                                    background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                  }}
                                >
                                  {cleanMsg || 'Candidate alert dispatched to candidate portal.'}
                                </div>
                              </td>

                              <td style={{ padding: '14px 18px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '5px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    background: item.isRead || item.status === 'READ'
                                      ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7')
                                      : (isDark ? 'rgba(2, 132, 199, 0.2)' : '#e0f2fe'),
                                    color: item.isRead || item.status === 'READ' ? '#166534' : '#0369a1',
                                  }}
                                >
                                  <i className={`bi ${item.isRead || item.status === 'READ' ? 'bi-check2-all' : 'bi-send-check'}`}></i>
                                  {item.isRead || item.status === 'READ' ? 'Read by Candidate' : 'Delivered to In-App'}
                                </span>
                              </td>

                              <td style={{ padding: '14px 18px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.83rem', color: 'var(--text-primary)' }}>
                                  {formattedDate}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  <i className="bi bi-clock me-1"></i>Actual Dispatched
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
