import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import SkeletonLoader from '../../components/common/SkeletonLoader';

const JobRoles = () => {
  const { isHr } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [runtimeCreatedDepts, setRuntimeCreatedDepts] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [dbErrorMessage, setDbErrorMessage] = useState('');

  const mapDbJob = (job) => {
    const rawDept = (job.department || 'Engineering').trim();
    const deptLower = rawDept.toLowerCase();
    const title = (job.title || '').toLowerCase();

    let iconClass = 'bi-briefcase';
    if (title.includes('java')) iconClass = 'bi-filetype-java';
    else if (title.includes('spring')) iconClass = 'bi-layers';
    else if (title.includes('react') || title.includes('mern') || title.includes('full stack') || deptLower.includes('engineering') || deptLower.includes('software'))
      iconClass = 'bi-code-slash';
    else if (title.includes('ai') || title.includes('nlp') || title.includes('data') || deptLower.includes('data') || deptLower.includes('ai'))
      iconClass = 'bi-robot';
    else if (deptLower.includes('cloud') || deptLower.includes('devops') || deptLower.includes('infra') || title.includes('cloud') || title.includes('devops'))
      iconClass = 'bi-cloud';
    else if (deptLower.includes('product') || deptLower.includes('design') || deptLower.includes('ui') || deptLower.includes('ux'))
      iconClass = 'bi-palette';
    else if (deptLower.includes('sales') || deptLower.includes('marketing') || deptLower.includes('business'))
      iconClass = 'bi-graph-up-arrow';
    else if (deptLower.includes('security') || deptLower.includes('cyber'))
      iconClass = 'bi-shield-check';
    else if (deptLower.includes('hr') || deptLower.includes('human') || deptLower.includes('people'))
      iconClass = 'bi-people';

    const skillsList = job.requiredSkills
      ? job.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean)
      : ['Java', 'Spring Boot', 'SQL'];

    return {
      id: job.id,
      title: job.title,
      companyName: job.companyName || 'SmartHire Technologies',
      department: rawDept,
      domainCode: rawDept,
      domainLabel: rawDept,
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
      applicantsCount: job.applicantsCount !== undefined ? job.applicantsCount : 0,
      shortlistedCount: job.shortlistedCount !== undefined ? job.shortlistedCount : 0,
      recruiterId: job.recruiterId,
    };
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setDbError(false);
    setDbErrorMessage('');
    try {
      const storedRole = typeof window !== 'undefined'
        ? (sessionStorage.getItem('smarthire_user_role') || localStorage.getItem('smarthire_user_role') || '')
        : '';
      const userIsHr = isHr || storedRole === 'HR' || storedRole === 'RECRUITER';

      // HR sees strictly only their created jobs (/api/jobs)
      // Job Seeker sees all available vacancies across all HRs (/api/jobs?scope=all)
      const endpoint = userIsHr ? '/jobs' : '/jobs?scope=all';

      // Load jobs and dynamic departments concurrently
      const [jobsRes, deptsRes] = await Promise.allSettled([
        api.get(endpoint),
        api.get('/jobs/departments'),
      ]);

      let rawJobs = [];
      if (jobsRes.status === 'fulfilled' && jobsRes.value?.data) {
        rawJobs = jobsRes.value.data.jobs || (Array.isArray(jobsRes.value.data) ? jobsRes.value.data : []);
      } else if (jobsRes.status === 'rejected') {
        throw jobsRes.reason;
      }

      const mapped = rawJobs.map(mapDbJob);
      setJobs(mapped);

      // Collect departments present in live jobs
      const jobDepts = rawJobs.map((j) => (j.department || '').trim()).filter(Boolean);

      // Only include departments that actually exist in live jobs or were explicitly created at runtime by HR
      const combined = [...jobDepts, ...runtimeCreatedDepts];
      const unique = [];
      const seen = new Set();
      combined.forEach((d) => {
        if (d && !seen.has(d.toLowerCase())) {
          seen.add(d.toLowerCase());
          unique.push(d);
        }
      });
      unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      setDepartments(unique);
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
  }, [isHr]);

  useEffect(() => {
    fetchJobs();

    // Cross-tab and in-app real-time synchronization
    const handleSync = (e) => {
      const evt = e?.detail?.event;
      if (evt === 'DEPARTMENT_CREATED' && e?.detail?.department) {
        setRuntimeCreatedDepts((prev) => [...prev, e.detail.department]);
      }
      if (evt === 'DEPARTMENT_DELETED' && e?.detail?.department) {
        setRuntimeCreatedDepts((prev) => prev.filter((d) => d.toLowerCase() !== e.detail.department.toLowerCase()));
        setDepartments((prev) => prev.filter((d) => d.toLowerCase() !== e.detail.department.toLowerCase()));
      }
      if (
        evt === 'DEPARTMENT_CREATED' ||
        evt === 'DEPARTMENT_DELETED' ||
        evt === 'JOB_CREATED' ||
        evt === 'JOB_UPDATED' ||
        evt === 'JOB_DELETED'
      ) {
        fetchJobs();
      }
    };

    window.addEventListener('smarthire:sync', handleSync);
    window.addEventListener('focus', fetchJobs);

    let channel = null;
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      channel = new BroadcastChannel('smarthire_sync_channel');
      channel.onmessage = (msg) => {
        const evt = msg.data?.event;
        if (evt === 'DEPARTMENT_CREATED' && msg.data?.department) {
          setRuntimeCreatedDepts((prev) => [...prev, msg.data.department]);
        }
        if (evt === 'DEPARTMENT_DELETED' && msg.data?.department) {
          setRuntimeCreatedDepts((prev) => prev.filter((d) => d.toLowerCase() !== msg.data.department.toLowerCase()));
          setDepartments((prev) => prev.filter((d) => d.toLowerCase() !== msg.data.department.toLowerCase()));
        }
        if (
          evt === 'DEPARTMENT_CREATED' ||
          evt === 'DEPARTMENT_DELETED' ||
          evt === 'JOB_CREATED' ||
          evt === 'JOB_UPDATED' ||
          evt === 'JOB_DELETED'
        ) {
          fetchJobs();
        }
      };
    }

    return () => {
      window.removeEventListener('smarthire:sync', handleSync);
      window.removeEventListener('focus', fetchJobs);
      if (channel) {
        channel.close();
      }
    };
  }, [fetchJobs]);

  const filteredJobs = jobs.filter((job) => {
    const matchesDomain =
      selectedDomain === 'all' ||
      (job.department && job.department.trim().toLowerCase() === selectedDomain.toLowerCase());
    const search = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !search ||
      job.title.toLowerCase().includes(search) ||
      (job.department && job.department.toLowerCase().includes(search)) ||
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
        <span className="breadcrumb-current">{isHr ? 'Job Roles & Profiles' : 'Job Roles'}</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">{isHr ? 'My Job Roles & Profiles' : 'Explore Career Profiles & Vacancies'}</h1>
          <p className="page-subtitle">
            {isHr
              ? 'Job requisitions and ATS scoring profiles created by your organization. Configure required skill benchmarks, track applicants, and manage pre-screening criteria.'
              : 'Live active job requisitions directly synced from the database. Benchmark your resume against target skills and screening criteria.'}
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
          {/* Dynamic Domain Filter Buttons Aligned with Job Management */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className={`btn btn-sm ${selectedDomain === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedDomain('all')}
              style={selectedDomain === 'all' ? { background: 'var(--primary)', color: '#ffffff' } : {}}
            >
              {isHr ? 'My Roles' : 'All Profiles'} ({jobs.length})
            </button>

            {departments.map((dept) => {
              const count = jobs.filter(
                (j) => (j.department || '').trim().toLowerCase() === dept.toLowerCase()
              ).length;
              const isActive = selectedDomain.toLowerCase() === dept.toLowerCase();
              return (
                <button
                  key={dept}
                  type="button"
                  className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedDomain(isActive ? 'all' : dept)}
                  style={isActive ? { background: 'var(--primary)', color: '#ffffff' } : {}}
                >
                  {dept} {count > 0 ? `(${count})` : ''}
                </button>
              );
            })}
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
              {isHr ? 'No Job Requisitions Created Yet' : 'No Active Job Requisitions'}
            </h3>
            <p style={{ maxWidth: '520px', margin: '0 auto 20px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {isHr
                ? "You haven't posted any job requisitions yet. Create a new job opening with custom screening questions and ATS benchmark."
                : 'There are currently no job openings published in the database. New positions will appear here once posted by the recruitment team.'}
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
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="badge badge-primary">{job.domainLabel}</span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <i className="bi bi-building"></i> {job.companyName}
                    </span>
                    {isHr && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          color: '#2563eb',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <i className="bi bi-people"></i> {job.applicantsCount || 0} Applicants
                      </span>
                    )}
                  </div>
                  <span className={`badge ${job.status === 'Open' ? 'badge-success' : 'badge-secondary'}`}>
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
                      <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className="bi bi-building"></i> {job.companyName}
                      </span>
                      <small style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.78rem' }}>
                        &bull; Target ATS: {job.targetAtsScore}
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
              <div className="job-card-footer" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {isHr ? (
                  <>
                    <Link
                      to={`/dashboard/jobs/${job.id}`}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, minWidth: '130px', textAlign: 'center' }}
                    >
                      <i className="bi bi-sliders"></i> Manage Requisition
                    </Link>
                    <Link
                      to={`/dashboard/candidates`}
                      className="btn btn-outline-primary btn-sm"
                      style={{ flex: 1, minWidth: '110px', textAlign: 'center' }}
                      title="View candidate database"
                    >
                      <i className="bi bi-people"></i> Candidates
                    </Link>
                  </>
                ) : (
                  <Link
                    to={`/dashboard/resumeanalyzer?role=${encodeURIComponent(job.title)}`}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', textAlign: 'center' }}
                  >
                    <i className="bi bi-cpu"></i> Scan Resume for Role
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
