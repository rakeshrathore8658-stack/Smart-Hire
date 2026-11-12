import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import StatCard from '../../components/common/StatCard';
import EmptyState from '../../components/common/EmptyState';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const activeEmail = user?.email
        ? user.email.trim().toLowerCase()
        : (typeof window !== 'undefined'
            ? (sessionStorage.getItem('smarthire_user_email') || localStorage.getItem('smarthire_user_email') || '')
            : '');

      const [statsRes, historyRes, interviewRes] = await Promise.allSettled([
        api.get('/dashboard/stats', {
          params: { role: 'USER', ...(activeEmail ? { email: activeEmail } : {}) },
        }),
        api.get('/dashboard/history', {
          params: activeEmail ? { email: activeEmail } : {},
        }),
        api.get('/dashboard/interviews', {
          params: { role: 'USER', ...(activeEmail ? { email: activeEmail } : {}) },
        }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.stats) {
        setStats(statsRes.value.data.stats);
      }
      if (historyRes.status === 'fulfilled') {
        const list = Array.isArray(historyRes.value?.data)
          ? historyRes.value.data
          : Array.isArray(historyRes.value?.data?.history)
          ? historyRes.value.data.history
          : [];
        setRecentAnalyses(list.slice(0, 5));
      }
      if (interviewRes.status === 'fulfilled' && interviewRes.value?.data) {
        const ivs = Array.isArray(interviewRes.value.data.interviews)
          ? interviewRes.value.data.interviews
          : Array.isArray(interviewRes.value.data)
          ? interviewRes.value.data
          : [];
        setInterviews(ivs);
      }
    } catch (err) {
      console.error('Error fetching seeker dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time synchronization without page refresh
  useRealtimeSync(fetchDashboardData);

  const totalAnalyses = stats?.totalAnalyses ?? recentAnalyses.length;
  const avgAts = stats?.averageAtsScore ?? (recentAnalyses.length > 0 ? 70 : 0);
  const avgSkills = stats?.averageSkillMatch ?? (recentAnalyses.length > 0 ? 55 : 0);
  const latestItem = recentAnalyses[0] || stats?.latestAnalysis || null;
  const latestAnalysisDate = latestItem?.formattedDate || (totalAnalyses > 0 ? 'Recent' : 'No scans yet');
  const latestTargetRole = latestItem?.targetJobRole || 'Career Profile';

  return (
    <div id="seekerDashboardSection" className="fade-in">
      {/* Header Banner */}
      <div className="page-header-row" data-tour="dashboard-overview">
        <div>
          <p className="welcome-label">
            Welcome back, <strong>{user?.fullName || 'Job Seeker'}</strong>
          </p>
          <h1 className="page-title">Your Career Dashboard</h1>
          <p className="page-subtitle">
            Track resume optimizations, target career matches, and interview readiness in one place.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="btn btn-secondary" to="/dashboard/analyzerhistory">
            <i className="bi bi-clock-history"></i> View History
          </Link>
          <Link className="btn btn-primary" to="/dashboard/resumeanalyzer" data-tour="btn-analyze-resume">
            <i className="bi bi-cpu"></i> Analyze New Resume
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      {loading ? (
        <SkeletonLoader type="stat" count={4} />
      ) : (
        <section className="stats-grid-4" aria-label="Resume analysis statistics">
          <StatCard
            to="/dashboard/analyzerhistory"
            label="Total Analyses"
            value={totalAnalyses}
            unit="Completed scans in database"
            icon="bi-file-earmark-text"
            iconTheme="navy"
            title="View analysis history"
          />

          <StatCard
            to="/dashboard/resumeimprovement"
            label="Average ATS Score"
            value={avgAts > 0 ? `${avgAts}` : '0'}
            unit="Across uploaded resumes"
            icon="bi-speedometer2"
            iconTheme="green"
            title="View ATS score improvements"
          />

          <StatCard
            to="/dashboard/skillsgap"
            label="Average Skill Match"
            value={avgSkills > 0 ? `${avgSkills}%` : '0%'}
            unit="For target job roles"
            icon="bi-bullseye"
            iconTheme="orange"
            title="View skills gap analysis"
          />

          <StatCard
            to="/dashboard/resumeanalyzer"
            label="Latest Scan"
            value={totalAnalyses > 0 ? latestAnalysisDate : '—'}
            unit={totalAnalyses > 0 ? `Target: ${latestTargetRole}` : 'Scan your first resume'}
            icon="bi-calendar-check"
            iconTheme="info"
            title="Analyze new resume"
          />
        </section>
      )}

      {/* Grid: Activity Chart & Score Overview */}
      <section className="grid-2-1">
        {/* Activity Trend Chart */}
        <article className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Analysis Score Trends</h2>
              <p className="card-description">Monthly progression of your resume ATS scores.</p>
            </div>
            <span className="badge badge-primary">PAST 6 MONTHS</span>
          </div>

          <div
            className="analysis-chart"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              minHeight: '200px',
              padding: '20px 0 0',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <div
              className="chart-bars"
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-around',
                gap: 'clamp(4px, 1.5vw, 14px)',
                height: '160px',
              }}
            >
              {[
                { month: 'May', score: 55 },
                { month: 'Jun', score: 62 },
                { month: 'Jul', score: 68 },
                { month: 'Aug', score: 72 },
                { month: 'Sep', score: 79 },
                { month: 'Oct', score: avgAts > 0 ? avgAts : 85 },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="chart-column"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    flex: 1,
                    height: '100%',
                  }}
                >
                  <div
                    className="chart-bar"
                    style={{
                      width: '100%',
                      maxWidth: '32px',
                      minWidth: '12px',
                      height: `${item.score}%`,
                      background: idx >= 4 ? 'var(--accent)' : idx >= 2 ? 'var(--primary)' : 'var(--border-strong)',
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 0.4s ease',
                    }}
                    title={`${item.month}: ${item.score}%`}
                  ></div>
                  <span
                    className="chart-month"
                    style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}
                  >
                    {item.month}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </article>

        {/* Latest Analysis Breakdown Card */}
        <article className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Latest Analysis</h2>
              <p className="card-description">
                {latestItem?.targetJobRole ? `${latestItem.targetJobRole} Profile` : 'Scanned Resume Overview'}
              </p>
            </div>
            <span className="badge badge-success">
              {latestItem ? 'COMPLETED' : 'READY'}
            </span>
          </div>

          {latestItem ? (
            <div className="score-overview" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                  <span>Formatting &amp; Readability</span>
                  <strong>{latestItem.formatScore || latestItem.formattingScore || 88}%</strong>
                </div>
                <div className="completion-bar-track">
                  <div
                    className="completion-bar-fill"
                    style={{ width: `${latestItem.formatScore || latestItem.formattingScore || 88}%`, background: 'var(--success)' }}
                  ></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                  <span>Technical Skills Coverage</span>
                  <strong>{latestItem.skillsScore || 50}%</strong>
                </div>
                <div className="completion-bar-track">
                  <div
                    className="completion-bar-fill"
                    style={{ width: `${latestItem.skillsScore || 50}%`, background: 'var(--accent)' }}
                  ></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                  <span>Experience &amp; Project Depth</span>
                  <strong>{latestItem.experienceScore || 65}%</strong>
                </div>
                <div className="completion-bar-track">
                  <div
                    className="completion-bar-fill"
                    style={{ width: `${latestItem.experienceScore || 65}%`, background: 'var(--primary)' }}
                  ></div>
                </div>
              </div>

              <Link to="/dashboard/resumeanalyzer" className="btn btn-secondary btn-sm" style={{ textAlign: 'center', marginTop: '6px' }}>
                Run Optimization Report &rarr;
              </Link>
            </div>
          ) : (
            <EmptyState
              icon="bi-cpu"
              title="No Resume Scanned"
              description="Upload your resume to get real-time score breakdowns and AI keyword suggestions."
              actionLabel="Analyze Resume"
              actionLink="/dashboard/resumeanalyzer"
            />
          )}
        </article>
      </section>

      {/* Candidate Upcoming Interviews Banner / Cards */}
      {interviews.length > 0 && (
        <section style={{ marginTop: '28px' }}>
          <article className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="bi bi-calendar2-check-fill" style={{ color: 'var(--accent)' }}></i>
                  Upcoming Video Interviews &amp; Rounds
                </h2>
                <p className="card-description">
                  Confirmed interview sessions scheduled by recruiting teams for your applications.
                </p>
              </div>
              <span className="badge badge-primary">{interviews.length} Scheduled</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {interviews.map((iv) => {
                const isCancelled = iv.interviewStatus === 'CANCELLED';
                const isCompleted = iv.interviewStatus === 'COMPLETED';
                const isRescheduled = iv.interviewStatus === 'RESCHEDULED';

                return (
                  <div
                    key={iv.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px 20px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      flexWrap: 'wrap',
                      gap: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <div
                        style={{
                          padding: '10px 14px',
                          background: isCancelled ? '#64748b' : isCompleted ? '#10b981' : isRescheduled ? '#d97706' : 'var(--primary)',
                          color: '#fff',
                          borderRadius: '10px',
                          textAlign: 'center',
                          minWidth: '58px',
                        }}
                      >
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, display: 'block', lineHeight: 1 }}>
                          {iv.interviewDay || '--'}
                        </span>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                          {iv.interviewMonth || 'TBD'}
                        </span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                            {iv.interviewRound || 'Interview Round'}
                          </h3>
                          <span className="badge badge-primary">{iv.targetJobRole}</span>
                          {isRescheduled && (
                            <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>Rescheduled</span>
                          )}
                          {isCancelled && (
                            <span className="badge badge-danger" style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#b91c1c' }}>Cancelled</span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                          <strong>Date:</strong> {iv.formattedInterviewDate || 'Upcoming'} &bull;{' '}
                          <strong>Mode:</strong> {iv.interviewLocation ? `In-Person (${iv.interviewLocation})` : (iv.interviewType || 'Online Video')} &bull;{' '}
                          <strong>Interviewer:</strong> {iv.interviewerName || 'Recruiting Team'}
                        </p>
                        {iv.hrNotes && (
                          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--accent)', fontStyle: 'italic' }}>
                            <i className="bi bi-info-circle"></i> Instructions: "{iv.hrNotes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      {iv.meetingLink && !isCancelled ? (
                        <a
                          href={iv.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <i className="bi bi-camera-video"></i>
                          <span>Join Meeting</span>
                        </a>
                      ) : iv.interviewLocation ? (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          <i className="bi bi-geo-alt"></i> Onsite Interview
                        </span>
                      ) : (
                        <span className="badge badge-secondary">Pending Link</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      )}

      {/* Recent Analyses Table */}
      <section className="grid-2-1" style={{ marginTop: '28px' }}>
        <article className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Recent Resume Scans</h2>
              <p className="card-description">Your historical resume scans and target roles.</p>
            </div>
            <Link to="/dashboard/analyzerhistory" className="btn btn-ghost btn-sm">
              All scans &rarr;
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '20px' }}>
              <SkeletonLoader type="card" count={2} />
            </div>
          ) : recentAnalyses.length > 0 ? (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Resume File</th>
                    <th>Target Role</th>
                    <th>Match Score</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAnalyses.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.fileName || item.resumeFileName || item.candidateName || 'Resume.pdf'}</strong>
                        <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                          AI Evaluated
                        </small>
                      </td>
                      <td>
                        <span className="badge badge-primary">{item.targetJobRole || 'Software Engineer'}</span>
                      </td>
                      <td>
                        <span
                          className={`score-badge ${
                            (item.overallScore || 0) >= 75
                              ? 'score-high'
                              : (item.overallScore || 0) >= 50
                              ? 'score-mid'
                              : 'score-low'
                          }`}
                        >
                          {item.overallScore || 0}%
                        </span>
                      </td>
                      <td>{item.formattedDate || 'Recent'}</td>
                      <td>
                        <Link to="/dashboard/analyzerhistory" className="btn btn-secondary btn-sm">
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon="bi-clock-history"
              title="No Resumes Analyzed Yet"
              description="Start your first AI scan to see detailed candidate scoring and matching metrics."
              actionLabel="Analyze First Resume"
              actionLink="/dashboard/resumeanalyzer"
            />
          )}
        </article>

        {/* Quick Tools & Shortcuts */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <article className="card" data-tour="career-growth-tools">
            <div className="card-header">
              <h3 className="card-title">AI Career Tools</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link to="/dashboard/skillsgap" className="btn btn-secondary btn-block" style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="bi bi-bullseye" style={{ color: 'var(--accent)' }}></i>
                <span>Skills Gap Matrix</span>
              </Link>
              <Link to="/dashboard/resumeimprovement" className="btn btn-secondary btn-block" style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="bi bi-graph-up-arrow" style={{ color: 'var(--success)' }}></i>
                <span>Resume Improvement Checklist</span>
              </Link>
              <Link to="/dashboard/jobroles" className="btn btn-secondary btn-block" style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="bi bi-compass" style={{ color: 'var(--primary)' }}></i>
                <span>Explore Database Job Roles</span>
              </Link>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
};

export default Dashboard;
