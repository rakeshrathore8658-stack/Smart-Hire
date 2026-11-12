import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import SkeletonLoader from '../../components/common/SkeletonLoader';

const JobRoles = () => {
  const { isHr } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [dbErrorMessage, setDbErrorMessage] = useState('');

  const mapDbJob = (job) => {
    let domainCode = 'software';
    let domainLabel = job.department || 'Software Engineering';
    const dept = (job.department || '').toLowerCase();
    const title = (job.title || '').toLowerCase();

    if (dept.includes('data') || title.includes('data') || title.includes('ai') || title.includes('nlp')) {
      domainCode = 'data';
      domainLabel = 'Data & AI';
    } else if (
      dept.includes('infra') ||
      dept.includes('cloud') ||
      dept.includes('devops') ||
      title.includes('cloud') ||
      title.includes('devops')
    ) {
      domainCode = 'cloud';
      domainLabel = 'Cloud & DevOps';
    } else if (dept.includes('product') || dept.includes('business') || dept.includes('sales')) {
      domainCode = 'business';
      domainLabel = 'Product & Business';
    }

    let iconClass = 'bi-briefcase';
    if (title.includes('java')) iconClass = 'bi-filetype-java';
    else if (title.includes('spring')) iconClass = 'bi-layers';
    else if (title.includes('react') || title.includes('mern') || title.includes('full stack'))
      iconClass = 'bi-code-slash';
    else if (title.includes('ai') || title.includes('nlp') || title.includes('machine learning'))
      iconClass = 'bi-robot';
    else if (domainCode === 'cloud') iconClass = 'bi-cloud';
    else if (domainCode === 'data') iconClass = 'bi-database';

    const skillsList = job.requiredSkills
      ? job.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean)
      : ['Java', 'Spring Boot', 'SQL'];

    return {
      id: job.id,
      title: job.title,
      domainCode,
      domainLabel,
      status: job.status || 'Open',
      targetAtsScore: '80%+',
      minExperience: job.minExperience || 2,
      maxExperience: job.maxExperience || 5,
      location: job.location || 'Remote / Hybrid',
      iconClass,
      iconColor: 'var(--accent)',
      description: job.description || 'Design and develop robust applications using modern software architectures.',
      skillsList,
      openings: job.openings,
      salaryRange: job.salaryRange,
    };
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setDbError(false);
    setDbErrorMessage('');
    try {
      const res = await api.get('/jobs');
      const list = res.data?.jobs || (Array.isArray(res.data) ? res.data : []);
      setJobs(list.map(mapDbJob));
    } catch (err) {
      console.warn('Failed to load active jobs from database:', err);
      setJobs([]);
      setDbError(true);
      setDbErrorMessage(
        err.response?.data?.message ||
        'Unable to connect to the database to fetch live job requisitions. The database may be offline or uninitialized.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filteredJobs = jobs.filter((job) => {
    const matchesDomain = selectedDomain === 'all' || job.domainCode === selectedDomain;
    const search = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !search ||
      job.title.toLowerCase().includes(search) ||
      (job.description && job.description.toLowerCase().includes(search)) ||
      (job.skillsList && job.skillsList.some((s) => s.toLowerCase().includes(search)));
    return matchesDomain && matchesSearch;
  });

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Job Roles</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Explore Career Profiles & Vacancies</h1>
          <p className="page-subtitle">
            Live active job requisitions directly synced from the database. Benchmark your resume against target skills
            and screening criteria.
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!isHr ? (
            <Link className="btn btn-primary" to="/dashboard/resumeanalyzer">
              <i className="bi bi-cpu"></i> Start Resume Scan
            </Link>
          ) : (
            <>
              <Link className="btn btn-primary" to="/dashboard/jobs/create">
                <i className="bi bi-plus-lg"></i> Post New Job
              </Link>
              <Link className="btn btn-secondary" to="/dashboard/jobs">
                <i className="bi bi-briefcase"></i> Job Management
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Domain Filters Toolbar */}
      <article className="card" data-tour="roles-filter" style={{ marginBottom: '24px', padding: '16px 20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          {/* Domain Filter Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm ${selectedDomain === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedDomain('all')}
              style={selectedDomain === 'all' ? { background: 'var(--primary)', color: '#ffffff' } : {}}
            >
              All Profiles ({jobs.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${selectedDomain === 'software' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedDomain('software')}
              style={selectedDomain === 'software' ? { background: 'var(--primary)', color: '#ffffff' } : {}}
            >
              Software & Engineering
            </button>
            <button
              type="button"
              className={`btn btn-sm ${selectedDomain === 'data' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedDomain('data')}
              style={selectedDomain === 'data' ? { background: 'var(--primary)', color: '#ffffff' } : {}}
            >
              Data & AI
            </button>
            <button
              type="button"
              className={`btn btn-sm ${selectedDomain === 'cloud' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedDomain('cloud')}
              style={selectedDomain === 'cloud' ? { background: 'var(--primary)', color: '#ffffff' } : {}}
            >
              Cloud & DevOps
            </button>
            <button
              type="button"
              className={`btn btn-sm ${selectedDomain === 'business' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedDomain('business')}
              style={selectedDomain === 'business' ? { background: 'var(--primary)', color: '#ffffff' } : {}}
            >
              Product & Business
            </button>
          </div>

          {/* Search Box */}
          <div style={{ minWidth: '260px', flex: 1, maxWidth: '340px' }}>
            <input
              type="search"
              placeholder="Search by job title, skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>
        </div>
      </article>

      {/* Job Roles Card Grid */}
      <div
        className="grid-1-1"
        id="rolesGrid"
        data-tour="roles-grid"
      >
        {loading ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <SkeletonLoader type="card" count={4} />
          </div>
        ) : dbError ? (
          <article
            className="card"
            style={{
              gridColumn: '1 / -1',
              padding: '48px 24px',
              textAlign: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--danger)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
                fontSize: '1.8rem',
              }}
            >
              <i className="bi bi-database-exclamation"></i>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Database Connection Inactive
            </h3>
            <p style={{ maxWidth: '520px', margin: '0 auto 20px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {dbErrorMessage || 'Unable to connect to the database to fetch live job requisitions. Please ensure the backend database is active and reachable.'}
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={fetchJobs}
            >
              <i className="bi bi-arrow-clockwise"></i> Retry Connection
            </button>
          </article>
        ) : jobs.length === 0 ? (
          <article
            className="card"
            style={{
              gridColumn: '1 / -1',
              padding: '48px 24px',
              textAlign: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(255, 121, 0, 0.12)',
                color: 'var(--accent)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
                fontSize: '1.8rem',
              }}
            >
              <i className="bi bi-briefcase"></i>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              No Active Job Requisitions
            </h3>
            <p style={{ maxWidth: '520px', margin: '0 auto 20px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              There are currently no job openings published in the database. New positions will appear here once posted by the recruitment team.
            </p>
            {isHr ? (
              <Link to="/dashboard/jobs/create" className="btn btn-primary btn-sm">
                <i className="bi bi-plus-lg"></i> Post New Job Opening
              </Link>
            ) : (
              <Link to="/dashboard/resumeanalyzer" className="btn btn-primary btn-sm">
                <i className="bi bi-cpu"></i> Analyze Resume Against Standard Profiles
              </Link>
            )}
          </article>
        ) : filteredJobs.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <i className="bi bi-search" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}></i>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
              No Matching Job Openings Found
            </h3>
            <p style={{ fontSize: '0.88rem', marginBottom: '16px' }}>
              Try adjusting your domain filter or search query.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSelectedDomain('all');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <article
              key={job.id}
              className="card job-role-card"
            >
              {/* Fixed Top Header */}
              <div className="job-card-header">
                {/* Header Badges */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span className="badge badge-primary">{job.domainLabel}</span>
                  <span className="badge badge-success">
                    {job.status === 'Open' ? 'Active Requisition' : job.status}
                  </span>
                </div>

                {/* Role Title & Icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '1.45rem',
                      flexShrink: 0,
                      background: 'rgba(255, 121, 0, 0.12)',
                      color: job.iconColor || 'var(--accent)',
                    }}
                  >
                    <i className={`bi ${job.iconClass || 'bi-briefcase'}`}></i>
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        margin: 0,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={job.title}
                    >
                      {job.title}
                    </h2>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
                      <small style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.78rem' }}>
                        Target ATS: {job.targetAtsScore}
                      </small>
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                        &bull; {job.minExperience}-{job.maxExperience} yrs
                      </small>
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                        &bull; {job.location}
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dedicated Scrollable Job Description */}
              <div className="job-desc-scroll">
                <p style={{ margin: 0 }}>
                  {job.description}
                </p>
              </div>

              {/* Dedicated Must-Have Skills Section (Always Visible) */}
              <div className="job-skills-section">
                <strong className="job-skills-title">
                  Must-Have Skills:
                </strong>
                <div className="job-skills-list">
                  {job.skillsList &&
                    job.skillsList.map((skill, index) => (
                      <span
                        key={index}
                        className="skill-tag skill-matched"
                        style={{
                          padding: '3px 8px',
                          fontSize: '0.74rem',
                          borderRadius: '4px',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                </div>
              </div>

              {/* Fixed Bottom Action Buttons */}
              <div className="job-card-footer">
                <Link
                  to={`/dashboard/resumeanalyzer?role=${encodeURIComponent(job.title)}`}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', textAlign: 'center' }}
                >
                  <i className="bi bi-cpu"></i> Scan Resume for Role
                </Link>
                {isHr && (
                  <Link
                    to={`/dashboard/jobs/${job.id}`}
                    className="btn btn-ghost btn-sm"
                    title="View Requisition Details"
                  >
                    <i className="bi bi-eye"></i>
                  </Link>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};

export default JobRoles;
