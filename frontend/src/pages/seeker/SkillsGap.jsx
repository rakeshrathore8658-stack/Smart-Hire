import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client';

const SkillsGap = () => {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');

  const [dbJobs, setDbJobs] = useState([]);
  const [targetProfile, setTargetProfile] = useState(roleParam || 'Java Developer');
  const [loading, setLoading] = useState(true);
  const [userSkills, setUserSkills] = useState(['Java', 'Spring Boot', 'Hibernate', 'SQL', 'Git', 'Maven']);

  const defaultDbJobs = [
    {
      id: 1,
      title: 'Java Developer',
      department: 'Engineering',
      requiredSkills: 'Java, Spring Boot, Hibernate, REST APIs, SQL, Git, Docker, Kubernetes',
    },
    {
      id: 2,
      title: 'Spring Boot Developer',
      department: 'Engineering',
      requiredSkills: 'Spring Boot, Microservices, Docker, PostgreSQL, Kafka, JUnit, AWS',
    },
    {
      id: 3,
      title: 'Full Stack Developer',
      department: 'Engineering',
      requiredSkills: 'React, Node.js, Express, MongoDB, JavaScript, TypeScript, CSS3',
    },
    {
      id: 4,
      title: 'DevOps Engineer',
      department: 'Infrastructure',
      requiredSkills: 'AWS, Docker, Kubernetes, Terraform, CI/CD, Linux, Prometheus',
    },
    {
      id: 5,
      title: 'Data Analyst',
      department: 'Data & Analytics',
      requiredSkills: 'Python, SQL, Tableau, Pandas, Power BI, Statistics, ETL',
    },
  ];

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [jobsRes, historyRes] = await Promise.allSettled([
          api.get('/jobs'),
          api.get('/dashboard/history'),
        ]);

        if (isMounted) {
          if (jobsRes.status === 'fulfilled') {
            const list = jobsRes.value.data?.jobs || (Array.isArray(jobsRes.value.data) ? jobsRes.value.data : []);
            if (list.length > 0) {
              setDbJobs(list);
              if (roleParam) {
                const found = list.find((j) => j.title.toLowerCase() === roleParam.toLowerCase());
                if (found) setTargetProfile(found.title);
              } else if (!targetProfile) {
                setTargetProfile(list[0].title);
              }
            } else {
              setDbJobs(defaultDbJobs);
            }
          }

          if (historyRes.status === 'fulfilled' && historyRes.value.data?.history?.length > 0) {
            const latest = historyRes.value.data.history[0];
            const extracted = latest.matchedSkillsList || latest.matchedSkills || [];
            if (extracted.length > 0) {
              setUserSkills(extracted);
            }
          }
        }
      } catch (err) {
        if (isMounted) setDbJobs(defaultDbJobs);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [roleParam]);

  const activeJobs = dbJobs.length > 0 ? dbJobs : defaultDbJobs;
  const currentJob = activeJobs.find(
    (j) => j.title.toLowerCase() === targetProfile.toLowerCase()
  ) || activeJobs[0];

  const jobSkills = currentJob.requiredSkills
    ? currentJob.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean)
    : ['Java', 'Spring Boot', 'SQL', 'Docker', 'Kubernetes'];

  const verifiedSkills = jobSkills
    .filter((sk) =>
      userSkills.some((us) => us.toLowerCase().includes(sk.toLowerCase()) || sk.toLowerCase().includes(us.toLowerCase()))
    )
    .map((name) => ({ name, proficiency: 'Intermediate - Advanced', verified: true }));

  const missingSkills = jobSkills
    .filter(
      (sk) =>
        !userSkills.some((us) => us.toLowerCase().includes(sk.toLowerCase()) || sk.toLowerCase().includes(us.toLowerCase()))
    )
    .map((name, idx) => ({
      name,
      priority: idx < 2 ? 'HIGH' : 'MEDIUM',
      description: `Required for ${currentJob.title} requisitions and modern production environments.`,
      recommendation: `Add hands-on projects and relevant keywords demonstrating ${name} in your experience section.`,
    }));

  const totalSkills = verifiedSkills.length + missingSkills.length;
  const matchPercent = totalSkills > 0 ? Math.round((verifiedSkills.length / totalSkills) * 100) : 75;

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Skills Gap Analysis</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Skills Gap Analysis</h1>
          <p className="page-subtitle">
            Identify exactly which core and preferred skills are missing from your resume for your target role.
          </p>
        </div>
        <div className="page-header-actions">
          <Link
            className="btn btn-primary"
            to={`/dashboard/resumeanalyzer?role=${encodeURIComponent(currentJob.title)}`}
          >
            <i className="bi bi-cpu"></i> Re-scan for this Job
          </Link>
        </div>
      </div>

      {/* Target Role Selector Bar */}
      <article className="card" style={{ marginBottom: '24px', padding: '18px 24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '1.5rem', color: 'var(--accent)' }}>
              <i className="bi bi-bullseye"></i>
            </span>
            <div>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Evaluating Against Database Role:
              </strong>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Skills benchmark dynamically derived from backend job requisition requirements
              </p>
            </div>
          </div>
          <div style={{ flex: '1 1 240px', minWidth: 'min(280px, 100%)', maxWidth: '380px' }}>
            <select
              className="form-control"
              value={targetProfile}
              onChange={(e) => setTargetProfile(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
              }}
            >
              {activeJobs.map((j) => (
                <option key={j.id} value={j.title}>
                  {j.title} ({j.department})
                </option>
              ))}
            </select>
          </div>
        </div>
      </article>

      {/* Skills Coverage KPIs */}
      <section className="stats-grid-4" style={{ marginBottom: '28px' }}>
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Role Skills Match</span>
            <span className="stat-icon icon-green">
              <i className="bi bi-bullseye"></i>
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {matchPercent}%
          </div>
          <span className="stat-unit">
            {verifiedSkills.length} of {totalSkills} skills verified
          </span>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Verified Present</span>
            <span className="stat-icon icon-navy">
              <i className="bi bi-check-lg"></i>
            </span>
          </div>
          <div className="stat-value">{verifiedSkills.length}</div>
          <span className="stat-unit">Found in resume analysis</span>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Critical Missing Skills</span>
            <span className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
              <i className="bi bi-exclamation-triangle"></i>
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>
            {missingSkills.length}
          </div>
          <span className="stat-unit">Required for {currentJob.title}</span>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Recommended Action</span>
            <span className="stat-icon icon-info">
              <i className="bi bi-lightbulb"></i>
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>
            {missingSkills.length > 0 ? `${Math.min(missingSkills.length, 3)} Topics` : 'Ready to Apply'}
          </div>
          <span className="stat-unit">To achieve 90%+ match score</span>
        </article>
      </section>

      {/* Grid: Verified Skills vs Missing Skills */}
      <div className="grid-1-1" style={{ gap: '24px' }}>
        {/* Present Skills */}
        <article className="card">
          <div className="card-header">
            <div>
              <span className="badge badge-success">
                <i className="bi bi-check2"></i> DETECTED
              </span>
              <h2 className="card-title" style={{ marginTop: '6px' }}>
                Verified Skills Present in Resume
              </h2>
            </div>
            <span className="count-badge count-success">{verifiedSkills.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {verifiedSkills.length > 0 ? (
              verifiedSkills.map((sk, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: 'var(--success)', fontSize: '1.1rem' }}>
                      <i className="bi bi-check-circle-fill"></i>
                    </span>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{sk.name}</strong>
                  </div>
                  <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                    {sk.proficiency}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                No exact skills overlap detected yet for this role.
              </p>
            )}
          </div>
        </article>

        {/* Missing Skills */}
        <article className="card">
          <div className="card-header">
            <div>
              <span className="badge badge-warning">
                <i className="bi bi-exclamation-triangle"></i> ACTION NEEDED
              </span>
              <h2 className="card-title" style={{ marginTop: '6px' }}>
                High-Impact Missing Skills for {currentJob.title}
              </h2>
            </div>
            <span className="count-badge count-warning">{missingSkills.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {missingSkills.length > 0 ? (
              missingSkills.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '14px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.name}</strong>
                    <span className="badge badge-warning">{item.priority} PRIORITY</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                    {item.description}
                  </p>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--accent)',
                      background: 'var(--bg-card)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px dashed var(--accent)',
                    }}
                  >
                    <strong>Suggested Fix:</strong> {item.recommendation}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--success)', fontSize: '0.85rem' }}>
                Awesome! You have all required skills for this position.
              </p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
};

export default SkillsGap;
