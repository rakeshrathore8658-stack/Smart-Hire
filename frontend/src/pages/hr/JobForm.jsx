import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import CustomSelect from '../../components/common/CustomSelect';

export default function JobForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id && id !== 'new' && id !== 'create');

  const user = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('smarthire_user') || localStorage.getItem('smarthire_user') || '{}');
    } catch (_) {
      return {};
    }
  }, []);

  const defaultCompany = user?.companyName?.trim() || 'SmartHire Technologies';

  const [formData, setFormData] = useState({
    title: '',
    companyName: defaultCompany,
    department: 'Engineering',
    employmentType: 'Full-time',
    openings: 1,
    minExperience: 2,
    maxExperience: 5,
    location: 'Remote / Hybrid',
    salaryRange: 'Competitive',
    requiredSkills: '',
    description: '',
    status: 'Open',
  });

  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customDeptInput, setCustomDeptInput] = useState('');
  const [customDeptError, setCustomDeptError] = useState('');

  const [loading, setLoading] = useState(isEdit);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch dynamic departments from DB (API endpoint with fallback to distinct departments from existing jobs)
  const fetchDepartments = async () => {
    setLoadingDepts(true);
    let deptList = [];
    try {
      // 1. Try dedicated departments API
      try {
        const res = await api.get('/jobs/departments');
        if (res.data) {
          deptList = Array.isArray(res.data) ? res.data : (res.data.departments || []);
        }
      } catch (endpointErr) {
        // 2. Fallback to /jobs
        const jobsRes = await api.get('/jobs');
        const jobs = jobsRes.data?.jobs || (Array.isArray(jobsRes.data) ? jobsRes.data : []);
        deptList = Array.from(new Set(jobs.map((j) => j.department?.trim()).filter(Boolean)));
      }

      // If DB has no jobs or departments yet, fallback to clean standard defaults
      if (!deptList || deptList.length === 0) {
        deptList = ['Engineering', 'Product & Design', 'Data Science & Analytics', 'DevOps & Cloud Infrastructure', 'Sales & Marketing'];
      }

      // Deduplicate case-insensitively
      const unique = [];
      const seen = new Set();
      deptList.forEach((d) => {
        if (d && !seen.has(d.toLowerCase())) {
          seen.add(d.toLowerCase());
          unique.push(d);
        }
      });
      unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

      setDepartments(unique);
      return unique;
    } catch (err) {
      const defaults = ['Engineering', 'Product & Design', 'Data Science & Analytics', 'DevOps & Cloud Infrastructure', 'Sales & Marketing'];
      setDepartments(defaults);
      return defaults;
    } finally {
      setLoadingDepts(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (isEdit) {
      const fetchJob = async () => {
        try {
          const res = await api.get(`/jobs/${id}`);
          if (res.data) {
            const fetchedDept = res.data.department || 'Engineering';
            setFormData({
              title: res.data.title || '',
              companyName: res.data.companyName || defaultCompany,
              department: fetchedDept,
              employmentType: res.data.employmentType || 'Full-time',
              openings: res.data.openings || 1,
              minExperience: res.data.minExperience || 2,
              maxExperience: res.data.maxExperience || 8,
              location: res.data.location || 'Remote / Hybrid',
              salaryRange: res.data.salaryRange || 'Competitive',
              requiredSkills: res.data.requiredSkills || '',
              description: res.data.description || '',
              status: res.data.status || 'Open',
            });
            // Ensure this job's department is present in departments list
            setDepartments((prev) => {
              if (fetchedDept && !prev.some((d) => d.toLowerCase() === fetchedDept.toLowerCase())) {
                return [fetchedDept, ...prev];
              }
              return prev;
            });
          }
        } catch (err) {
          setErrorMsg('Failed to load existing job details.');
        } finally {
          setLoading(false);
        }
      };
      fetchJob();
    }
  }, [id, isEdit]);

  // Handle adding new custom department
  const handleAddCustomDept = async () => {
    const trimmed = customDeptInput.trim();
    if (!trimmed) {
      setCustomDeptError('Please enter a valid department name.');
      return;
    }

    // Check if already in list case-insensitively
    const existing = departments.find(
      (d) => d.toLowerCase() === trimmed.toLowerCase()
    );

    const deptToUse = existing || trimmed;

    if (!existing) {
      const updated = [...departments, deptToUse].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );
      setDepartments(updated);

      // Persist to backend
      try {
        await api.post('/jobs/departments', { name: deptToUse });
      } catch (err) {
        // Backend might be pending restart; department will also persist upon job submission
      }
    }

    setFormData((prev) => ({ ...prev, department: deptToUse }));
    setCustomDeptInput('');
    setCustomDeptError('');
    setShowAddCustom(false);
  };

  const departmentOptions = useMemo(() => {
    const opts = departments.map((dept) => ({
      value: dept,
      label: dept,
    }));
    if (formData.department && !departments.some((d) => d.toLowerCase() === formData.department.toLowerCase())) {
      opts.unshift({ value: formData.department, label: formData.department });
    }
    opts.push({
      value: '__ADD_NEW__',
      label: '✨ + Add New Custom Department...',
      badge: 'Custom',
      icon: <i className="bi bi-plus-circle" style={{ color: 'var(--accent)' }}></i>,
    });
    return opts;
  }, [departments, formData.department]);

  const employmentTypeOptions = [
    { value: 'Full-time', label: 'Full-time Permanent' },
    { value: 'Contract', label: 'Contract / Contingent' },
    { value: 'Part-time', label: 'Part-time' },
    { value: 'Internship', label: 'Internship' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (isEdit) {
        await api.put(`/jobs/${id}`, formData);
        setSuccessMsg('Job requisition updated successfully.');
      } else {
        await api.post('/jobs', formData);
        setSuccessMsg('New job requisition published successfully.');
      }
      setTimeout(() => navigate('/dashboard/jobs'), 1200);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error saving job requisition.');
    }
  };

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <Link to="/dashboard/jobs">Jobs</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{isEdit ? 'Edit Vacancy' : 'Create Vacancy'}</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Job Vacancy' : 'Create Job Vacancy'}</h1>
          <p className="page-subtitle">
            Configure position requirements, required skills taxonomy, and screening thresholds for AI matching.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="btn btn-secondary" to="/dashboard/jobs">
            ← Back to Jobs
          </Link>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success" role="status" style={{ marginBottom: '20px' }}>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="alert alert-danger" role="status" style={{ marginBottom: '20px' }}>
          {errorMsg}
        </div>
      )}

      {/* Job Form */}
      <article className="card" style={{ maxWidth: '960px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          {/* Section 1: Position Overview */}
          <div style={{ marginBottom: '28px' }}>
            <span className="badge badge-primary">SECTION 1</span>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '6px 0 16px' }}>Position Overview</h2>

            <div className="grid-1-1" style={{ gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Job Title <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Senior Java Developer"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, margin: 0 }}>
                    Hiring Company / Organization <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  {defaultCompany && formData.companyName !== defaultCompany && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, companyName: defaultCompany })}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.74rem', padding: 0, textDecoration: 'underline' }}
                    >
                      Reset to My Org ({defaultCompany})
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Acme Corp, Tech Mahindra"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px' }}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                  Defaults to your HR registered organization ({defaultCompany}), or enter a client / branch name.
                </small>
              </div>
            </div>

            <div className="grid-1-1" style={{ gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, margin: 0 }}>
                    Department <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  {!showAddCustom && (
                    <button
                      type="button"
                      onClick={() => { setShowAddCustom(true); setCustomDeptError(''); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 0,
                      }}
                    >
                      <i className="bi bi-plus-circle-fill"></i> + Add Custom
                    </button>
                  )}
                </div>

                <CustomSelect
                  id="jobDepartmentSelect"
                  value={formData.department}
                  onChange={(val) => {
                    if (val === '__ADD_NEW__') {
                      setShowAddCustom(true);
                      setCustomDeptInput('');
                      setCustomDeptError('');
                    } else {
                      setFormData({ ...formData, department: val });
                    }
                  }}
                  options={departmentOptions}
                  placeholder={loadingDepts ? 'Loading departments from database...' : 'Select Department'}
                  searchable={departments.length > 4}
                  disabled={loadingDepts}
                />

                {/* Under Department Dropdown: Option / Section to manually add new custom department */}
                {showAddCustom ? (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '12px 14px',
                      background: 'var(--bg-secondary, rgba(99, 102, 241, 0.05))',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md, 8px)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="bi bi-building-add" style={{ color: 'var(--primary)' }}></i> Add New Custom Department
                      </span>
                      <button
                        type="button"
                        onClick={() => { setShowAddCustom(false); setCustomDeptError(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
                        title="Cancel"
                      >
                        &times;
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Human Resources, Finance, QA"
                        value={customDeptInput}
                        onChange={(e) => {
                          setCustomDeptInput(e.target.value);
                          if (customDeptError) setCustomDeptError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomDept();
                          }
                        }}
                        autoFocus
                        style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleAddCustomDept}
                        style={{ padding: '8px 14px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                      >
                        Add & Select
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => { setShowAddCustom(false); setCustomDeptError(''); }}
                        style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                      >
                        Cancel
                      </button>
                    </div>

                    {customDeptError && (
                      <small style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '6px', display: 'block' }}>
                        {customDeptError}
                      </small>
                    )}
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                      Once saved, this department will dynamically appear in the dropdown for all future jobs.
                    </small>
                  </div>
                ) : (
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                      {departments.length} department{departments.length !== 1 ? 's' : ''} loaded from database
                    </small>
                    <button
                      type="button"
                      onClick={() => { setShowAddCustom(true); setCustomDeptError(''); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textDecoration: 'underline',
                        padding: 0,
                      }}
                    >
                      + Manually add department
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid-1-1" style={{ gap: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Employment Type
                </label>
                <CustomSelect
                  id="jobEmploymentTypeSelect"
                  value={formData.employmentType}
                  onChange={(val) => setFormData({ ...formData, employmentType: val })}
                  options={employmentTypeOptions}
                  placeholder="Select Employment Type"
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Number of Openings
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="form-control"
                  value={formData.openings}
                  onChange={(e) => setFormData({ ...formData, openings: parseInt(e.target.value) || 1 })}
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

          {/* Section 2: Experience & Location */}
          <div style={{ marginBottom: '28px' }}>
            <span className="badge badge-primary">SECTION 2</span>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '6px 0 16px' }}>
              Experience & Location Details
            </h2>

            <div className="grid-1-1" style={{ gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Minimum Experience (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  className="form-control"
                  value={formData.minExperience}
                  onChange={(e) => setFormData({ ...formData, minExperience: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Maximum Experience (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  className="form-control"
                  value={formData.maxExperience}
                  onChange={(e) => setFormData({ ...formData, maxExperience: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>
            </div>

            <div className="grid-1-1" style={{ gap: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Workplace Mode / Location
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Remote / Hybrid, Bengaluru"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Salary Range
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. ₹15,00,000 - ₹25,00,000"
                  value={formData.salaryRange}
                  onChange={(e) => setFormData({ ...formData, salaryRange: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

          {/* Section 3: Skills Requirements */}
          <div style={{ marginBottom: '28px' }}>
            <span className="badge badge-primary">SECTION 3</span>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '6px 0 16px' }}>
              Skills Taxonomy for AI Resume Matching
            </h2>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                Required Skills (Must-Have, comma separated) <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Java, Spring Boot, Microservices, SQL, Git, Docker"
                required
                value={formData.requiredSkills}
                onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                style={{ width: '100%', padding: '10px 14px' }}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                Resumes without these skills will be flagged in the candidate screening pipeline.
              </small>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

          {/* Section 4: Detailed Description */}
          <div style={{ marginBottom: '28px' }}>
            <span className="badge badge-primary">SECTION 4</span>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '6px 0 16px' }}>
              Job Description & Responsibilities
            </h2>

            <div className="form-group">
              <textarea
                rows={5}
                className="form-control"
                placeholder="Describe key responsibilities, deliverables, required experience, and qualifications for this vacancy..."
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ width: '100%', padding: '12px 14px', resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Link to="/dashboard/jobs" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary">
              <i className="bi bi-check-lg"></i> {isEdit ? 'Update Requisition' : 'Save & Publish Requisition'}
            </button>
          </div>
        </form>
      </article>
    </div>
  );
}
