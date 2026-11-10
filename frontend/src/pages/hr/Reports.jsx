import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

export default function Reports() {
  const [period, setPeriod] = useState('30days');
  const [report, setReport] = useState({
    totalResumesScreened: 34,
    newResumesThisMonth: 12,
    shortlistConversionRate: 26.5,
    shortlistedCount: 9,
    interviewToOfferRate: 50.0,
    offersCount: 3,
    interviewsCount: 6,
    avgTimeToHireDays: 18,
    timeToHireSubtext: '4 days faster than industry average',
    funnelApplied: 34,
    funnelAppliedPct: 100,
    funnel70Plus: 21,
    funnel70PlusPct: 61.8,
    funnelShortlisted: 9,
    funnelShortlistedPct: 26.5,
    funnelInterviews: 6,
    funnelInterviewsPct: 17.6,
    funnelOffers: 3,
    funnelOffersPct: 8.8,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get(`/dashboard/reports?period=${period}`);
        if (res.data && Object.keys(res.data).length > 0) {
          setReport((prev) => ({ ...prev, ...res.data }));
        }
      } catch (err) {
        // Fallback to initial values
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [period]);

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Metric,Value\n' +
      `Total Resumes Screened,${report.totalResumesScreened}\n` +
      `AI Shortlist Conversion,${report.shortlistConversionRate}%\n` +
      `Interview to Offer Rate,${report.interviewToOfferRate}%\n` +
      `Average Time to Hire,${report.avgTimeToHireDays} Days\n` +
      `Offers Extended,${report.offersCount}\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smarthire_recruitment_report_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Recruitment Reports</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Recruitment Reports & Analytics</h1>
          <p className="page-subtitle">
            Track hiring pipeline conversion, applicant distribution by requisition, and AI screening efficiency.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportCSV}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="bi bi-file-earmark-spreadsheet"></i> Export CSV Report
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <article className="card" style={{ marginBottom: '24px', padding: '14px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Reporting Period:
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setPeriod('30days')}
              style={{
                background: period === '30days' ? 'var(--primary)' : 'var(--bg-secondary)',
                color: period === '30days' ? '#ffffff' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setPeriod('quarter')}
              style={{
                background: period === 'quarter' ? 'var(--primary)' : 'var(--bg-secondary)',
                color: period === 'quarter' ? '#ffffff' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              This Quarter
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setPeriod('ytd')}
              style={{
                background: period === 'ytd' ? 'var(--primary)' : 'var(--bg-secondary)',
                color: period === 'ytd' ? '#ffffff' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              Year to Date
            </button>
          </div>
        </div>
      </article>

      {/* Top Level Metrics */}
      <section className="stats-grid-4" style={{ marginBottom: '28px' }}>
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Total Resumes Screened</span>
            <span className="stat-icon icon-navy">
              <i className="bi bi-file-earmark-text"></i>
            </span>
          </div>
          <div className="stat-value">{report.totalResumesScreened}</div>
          <span className="stat-unit">+{report.newResumesThisMonth} this month</span>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">AI Shortlist Conversion</span>
            <span className="stat-icon icon-green">
              <i className="bi bi-star"></i>
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {report.shortlistConversionRate}%
          </div>
          <span className="stat-unit">{report.shortlistedCount} candidates selected</span>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Interview to Offer Rate</span>
            <span className="stat-icon icon-info">
              <i className="bi bi-graph-up-arrow"></i>
            </span>
          </div>
          <div className="stat-value">{report.interviewToOfferRate}%</div>
          <span className="stat-unit">
            {report.offersCount} offers from {report.interviewsCount} interviews
          </span>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Average Time-to-Hire</span>
            <span className="stat-icon">
              <i className="bi bi-stopwatch"></i>
            </span>
          </div>
          <div className="stat-value">{report.avgTimeToHireDays} Days</div>
          <span className="stat-unit">{report.timeToHireSubtext}</span>
        </article>
      </section>

      {/* Visual Charts Grid */}
      <div className="grid-1-1" style={{ gap: '24px', marginBottom: '28px' }}>
        {/* Pipeline Funnel Chart */}
        <article className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Hiring Pipeline Funnel</h2>
              <p className="card-description">Drop-off and conversion rates per stage.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '4px' }}>
                <span>1. Applied Resumes</span>
                <strong>{report.funnelApplied} ({report.funnelAppliedPct}%)</strong>
              </div>
              <div className="progress">
                <div className="progress-bar progress-bar-info" style={{ width: `${report.funnelAppliedPct}%` }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '4px' }}>
                <span>2. AI Match Passed (70%+)</span>
                <strong>{report.funnel70Plus} ({report.funnel70PlusPct}%)</strong>
              </div>
              <div className="progress">
                <div className="progress-bar" style={{ width: `${report.funnel70PlusPct}%` }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '4px' }}>
                <span>3. Shortlisted for Phone Screen</span>
                <strong>{report.funnelShortlisted} ({report.funnelShortlistedPct}%)</strong>
              </div>
              <div className="progress">
                <div className="progress-bar progress-bar-warning" style={{ width: `${report.funnelShortlistedPct}%` }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '4px' }}>
                <span>4. Technical Interviews</span>
                <strong>{report.funnelInterviews} ({report.funnelInterviewsPct}%)</strong>
              </div>
              <div className="progress">
                <div className="progress-bar progress-bar-warning" style={{ width: `${report.funnelInterviewsPct}%` }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '4px' }}>
                <span>5. Offers Extended & Accepted</span>
                <strong>{report.funnelOffers} ({report.funnelOffersPct}%)</strong>
              </div>
              <div className="progress">
                <div className="progress-bar progress-bar-success" style={{ width: `${report.funnelOffersPct}%` }}></div>
              </div>
            </div>
          </div>
        </article>

        {/* Applicant Distribution by Requisition */}
        <article className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Applicant Distribution by Domain</h2>
              <p className="card-description">Active pipeline talent allocation across departments.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '4px' }}>
                <span>Engineering & Software</span>
                <strong>18 Candidates (52%)</strong>
              </div>
              <div className="progress">
                <div className="progress-bar" style={{ width: '52%' }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '4px' }}>
                <span>Data Science & AI</span>
                <strong>8 Candidates (24%)</strong>
              </div>
              <div className="progress">
                <div className="progress-bar progress-bar-info" style={{ width: '24%' }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '4px' }}>
                <span>Cloud & DevOps Infrastructure</span>
                <strong>5 Candidates (15%)</strong>
              </div>
              <div className="progress">
                <div className="progress-bar progress-bar-warning" style={{ width: '15%' }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '4px' }}>
                <span>Product Management & UI/UX</span>
                <strong>3 Candidates (9%)</strong>
              </div>
              <div className="progress">
                <div className="progress-bar progress-bar-success" style={{ width: '9%' }}></div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
