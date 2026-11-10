import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import StatCard from '../../components/common/StatCard';
import EmptyState from '../../components/common/EmptyState';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const HrDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [topCandidates, setTopCandidates] = useState([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHrDashboardData = useCallback(async () => {
    try {
      const [statsRes, interviewsRes, appsRes] = await Promise.allSettled([
        api.get('/dashboard/stats?role=HR'),
        api.get('/dashboard/interviews'),
        api.get('/dashboard/applications'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.stats) {
        const hrStats = statsRes.value.data.stats;
        setStats(hrStats);

        // Derive top candidates by score if available from recentApplications
        if (Array.isArray(hrStats.recentApplications) && hrStats.recentApplications.length > 0) {
          const sorted = [...hrStats.recentApplications].sort(
            (a, b) => (b.overallScore || 0) - (a.overallScore || 0)
          );
          setTopCandidates(sorted.slice(0, 5));
        }
      }

      // If applications endpoint succeeded and topCandidates wasn't set or has more complete data
      if (appsRes.status === 'fulfilled') {
        const appList = Array.isArray(appsRes.value?.data)
          ? appsRes.value.data
          : appsRes.value?.data?.applications || [];
        if (appList.length > 0) {
          const sorted = [...appList].sort(
            (a, b) => (b.overallScore || 0) - (a.overallScore || 0)
          );
          setTopCandidates(sorted.slice(0, 5));
        }
      }

      if (interviewsRes.status === 'fulfilled' && interviewsRes.value?.data) {
        const ivData = interviewsRes.value.data;
        const ivList = Array.isArray(ivData.interviews)
          ? ivData.interviews
          : Array.isArray(ivData)
          ? ivData
          : [];
        // Filter to upcoming or active rounds
        const upcoming = ivList.filter(
          (item) => item.interviewDay !== '--' || item.stage === 'Interviewing'
        );
        setUpcomingInterviews(upcoming.slice(0, 4));
      }
    } catch (err) {
      console.error('Error loading HR dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHrDashboardData();
  }, [fetchHrDashboardData]);

  // Real-time synchronization without page refresh
  useRealtimeSync(fetchHrDashboardData);

  // Real Database Statistics (No hardcoded fallback numbers!)
  const totalJobs = stats?.totalJobs ?? 0;
  const openJobs = stats?.openJobs ?? 0;
  const totalCandidates = stats?.totalCandidates ?? 0;
  const totalApps = stats?.totalApplications ?? 0;
  const awaitingReview = stats?.underReviewCount ?? 0;
  const shortlisted = stats?.shortlistedCount ?? 0;
  const interviewsCount = stats?.interviewCount ?? 0;
  const offeredCount = stats?.offeredCount ?? 0;
  const hiredCount = stats?.hiredCount ?? 0;

  return (
    <div id="hrDashboardSection" className="fade-in">
      {/* HR Header Banner */}
      <div className="page-header-row">
        <div>
          <p className="welcome-label">
            Recruitment Portal &bull; <strong>{user?.companyName || 'SmartHire Hiring Team'}</strong>
          </p>
          <h1 className="page-title">Recruiter Command Center</h1>
          <p className="page-subtitle">
            Track job vacancies, AI resume candidate screening, interviews, and hiring pipeline.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="btn btn-secondary" to="/dashboard/candidates">
            <i className="bi bi-people"></i> Candidate Database
          </Link>
          <Link className="btn btn-primary" to="/dashboard/jobs/new">
            <i className="bi bi-plus-lg"></i> Create Job Vacancy
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      {loading ? (
        <SkeletonLoader type="stat" count={6} />
      ) : (
        <section className="stats-grid-6" aria-label="Recruitment Overview Metrics" data-tour="hr-stats-grid">
          <StatCard
            to="/dashboard/jobs"
            label="Active Jobs"
            value={totalJobs}
            unit={`${openJobs} open requisitions`}
            icon="bi-briefcase"
            iconTheme="navy"
            title="Open Job Management"
          />

          <StatCard
            to="/dashboard/candidates"
            label="Candidates"
            value={totalCandidates}
            unit="Unique database profiles"
            icon="bi-people"
            iconTheme="info"
            title="Open Candidates Directory"
          />

          <StatCard
            to="/dashboard/applications"
            label="Applications"
            value={totalApps}
            unit="Total pipeline entries"
            icon="bi-inbox"
            iconTheme="purple"
            title="Open Applications Pipeline"
          />

          <StatCard
            to="/dashboard/applications?stage=Under Review"
            label="Awaiting Review"
            value={awaitingReview}
            unit="Needs screening"
            icon="bi-hourglass-split"
            iconTheme="orange"
            title="View Candidates Awaiting Review"
          />

          <StatCard
            to="/dashboard/shortlist"
            label="Shortlisted"
            value={shortlisted}
            unit="High match score"
            icon="bi-star"
            iconTheme="green"
            title="Open Shortlisted Candidates"
          />

          <StatCard
            to="/dashboard/interviews"
            label="Interviews"
            value={interviewsCount}
            unit="Scheduled rounds"
            icon="bi-calendar-event"
            iconTheme="navy"
            title="Open Scheduled Interviews"
          />
        </section>
      )}

      {/* Recruitment Pipeline Funnel */}
      <article className="card pipeline-funnel-card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Recruitment Pipeline Funnel</h2>
            <p className="card-description">Live candidate progress across active hiring stages.</p>
          </div>
          <Link to="/dashboard/reports" className="btn btn-ghost btn-sm">
            View Analytics &rarr;
          </Link>
        </div>

        <div className="pipeline-funnel-grid">
          <Link to="/dashboard/applications" className="funnel-stage-card funnel-card-interactive">
            <span className="funnel-count">{totalApps}</span>
            <span className="funnel-label">Applied</span>
          </Link>
          <Link to="/dashboard/candidates" className="funnel-stage-card funnel-card-interactive">
            <span className="funnel-count">{totalCandidates}</span>
            <span className="funnel-label">AI Screened</span>
          </Link>
          <Link to="/dashboard/shortlist" className="funnel-stage-card funnel-card-interactive">
            <span className="funnel-count">{shortlisted}</span>
            <span className="funnel-label">Shortlisted</span>
          </Link>
          <Link to="/dashboard/interviews" className="funnel-stage-card funnel-card-interactive">
            <span className="funnel-count">{interviewsCount}</span>
            <span className="funnel-label">Interviewing</span>
          </Link>
          <Link to="/dashboard/applications?stage=Offered" className="funnel-stage-card funnel-card-interactive">
            <span className="funnel-count">{offeredCount}</span>
            <span className="funnel-label">Offered</span>
          </Link>
          <Link
            to="/dashboard/applications?stage=Hired"
            className="funnel-stage-card funnel-card-interactive funnel-hired"
          >
            <span className="funnel-count">{hiredCount}</span>
            <span className="funnel-label">Hired</span>
          </Link>
        </div>
      </article>

      {/* Two Column: Top Matched Candidates & Upcoming Interviews */}
      <section className="grid-2-1">
        {/* Top Matched Candidates Table */}
        <article className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Top Matched Candidates</h2>
              <p className="card-description">AI parsed candidates with highest job alignment.</p>
            </div>
            <Link to="/dashboard/candidates" className="btn btn-ghost btn-sm">
              All candidates &rarr;
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '24px' }}>
              <SkeletonLoader type="card" count={2} />
            </div>
          ) : topCandidates.length > 0 ? (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Applied Role</th>
                    <th>Match Score</th>
                    <th>Experience</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topCandidates.map((cand) => (
                    <tr key={cand.id}>
                      <td>
                        <div className="candidate-cell">
                          <div className="candidate-cell-avatar">
                            {cand.candidateInitials ||
                              (cand.candidateName ? cand.candidateName.charAt(0).toUpperCase() : 'C')}
                          </div>
                          <div>
                            <strong className="candidate-name-link">{cand.candidateName}</strong>
                            <small className="candidate-email-muted">
                              {cand.candidateEmail}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-primary">{cand.targetJobRole || 'Software Role'}</span>
                      </td>
                      <td>
                        <span
                          className={`score-badge ${
                            cand.overallScore >= 75
                              ? 'score-high'
                              : cand.overallScore >= 50
                              ? 'score-mid'
                              : 'score-low'
                          }`}
                        >
                          {cand.overallScore || 0}%
                        </span>
                      </td>
                      <td>{cand.candidateExperience || '1-3 yrs'}</td>
                      <td>
                        <Link to={`/dashboard/candidates/${cand.id}`} className="btn btn-secondary btn-sm">
                          Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon="bi-people"
              title="No Candidates Screened Yet"
              description="Upload candidate resumes to start screening against open job roles."
              actionLabel="Upload First Resume"
              actionLink="/dashboard/candidates"
            />
          )}
        </article>

        {/* Upcoming Interviews Widget */}
        <aside className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Upcoming Interviews</h2>
              <p className="card-description">Next rounds &amp; feedback</p>
            </div>
            <Link to="/dashboard/interviews" className="btn btn-ghost btn-sm">
              Manage &rarr;
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '16px' }}>
              <SkeletonLoader type="card" count={2} />
            </div>
          ) : upcomingInterviews.length > 0 ? (
            <div className="interviews-list-col">
              {upcomingInterviews.map((interview) => (
                <div key={interview.id} className="interview-item-card">
                  <div className="interview-item-left">
                    <div className="interview-date-box">
                      <span className="interview-day-num">{interview.interviewDay}</span>
                      <span className="interview-month-label">{interview.interviewMonth}</span>
                    </div>
                    <div>
                      <h4 className="interview-cand-title">{interview.candidateName}</h4>
                      <p className="interview-cand-sub">
                        {interview.interviewRound || 'Technical Round'} &bull; {interview.interviewType || 'Online'}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/dashboard/feedback?candId=${interview.id}`}
                    className="btn btn-secondary btn-sm"
                    title="Evaluate Candidate"
                  >
                    Evaluate
                  </Link>
                </div>
              ))}

              <Link
                to="/dashboard/interviews"
                className="btn btn-outline btn-sm btn-block"
                style={{ marginTop: '8px', textAlign: 'center' }}
              >
                + Schedule Interview
              </Link>
            </div>
          ) : (
            <EmptyState
              icon="bi-calendar2-week"
              title="No Upcoming Interviews"
              description="Shortlist candidates and schedule interviews to see them here."
              actionLabel="Schedule Interview"
              actionLink="/dashboard/interviews"
            />
          )}
        </aside>
      </section>
    </div>
  );
};

export default HrDashboard;
