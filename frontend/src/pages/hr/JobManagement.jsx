import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import ConfirmPopover from '../../components/common/ConfirmPopover';
import CustomSelect from '../../components/common/CustomSelect';

const JobManagement = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const user = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('smarthire_user') || localStorage.getItem('smarthire_user') || '{}');
    } catch (_) {
      return {};
    }
  }, []);

  const defaultCompany = user?.companyName?.trim() || 'SmartHire Technologies';

  // Form State
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState(defaultCompany);
  const [department, setDepartment] = useState('Engineering');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [openings, setOpenings] = useState(1);
  const [minExp, setMinExp] = useState(2);
  const [maxExp, setMaxExp] = useState(5);
  const [location, setLocation] = useState('Remote / Hybrid');
  const [salaryRange, setSalaryRange] = useState('Competitive');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [formError, setFormError] = useState('');

  // Dynamic Departments State
  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customDeptInput, setCustomDeptInput] = useState('');
  const [customDeptError, setCustomDeptError] = useState('');

  const fetchDepartments = async () => {
    setLoadingDepts(true);
    let deptList = [];
    try {
      try {
        const res = await api.get('/jobs/departments');
        if (res.data) {
          deptList = Array.isArray(res.data) ? res.data : (res.data.departments || []);
        }
      } catch (endpointErr) {
        const jobsRes = await api.get('/jobs');
        const jobs = jobsRes.data?.jobs || (Array.isArray(jobsRes.data) ? jobsRes.data : []);
        deptList = Array.from(new Set(jobs.map((j) => j.department?.trim()).filter(Boolean)));
      }

      if (!deptList || deptList.length === 0) {
        deptList = ['Engineering', 'Product & Design', 'Data Science & Analytics', 'DevOps & Cloud Infrastructure', 'Sales & Marketing'];
      }

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

  const handleAddCustomDept = async () => {
    const trimmed = customDeptInput.trim();
    if (!trimmed) {
      setCustomDeptError('Please enter a valid department name.');
      return;
    }

    const existing = departments.find(
      (d) => d.toLowerCase() === trimmed.toLowerCase()
    );

    const deptToUse = existing || trimmed;

    if (!existing) {
      const updated = [...departments, deptToUse].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );
      setDepartments(updated);

      try {
        await api.post('/jobs/departments', { name: deptToUse });
      } catch (err) {
      }
    }

    setDepartment(deptToUse);
    setCustomDeptInput('');
    setCustomDeptError('');
    setShowAddCustom(false);
  };

  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs');
      const list = res.data?.jobs || (Array.isArray(res.data) ? res.data : []);
      setJobs(list);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchDepartments();
  }, []);

  const openCreateModal = () => {
    setEditingJob(null);
    setTitle('');
    setCompanyName(defaultCompany);
    setDepartment(departments.length > 0 ? departments[0] : 'Engineering');
    setEmploymentType('Full-time');
    setOpenings(1);
    setMinExp(2);
    setMaxExp(5);
    setLocation('Remote / Hybrid');
    setSalaryRange('Competitive');
    setDescription('');
    setRequiredSkills('');
    setFormError('');
    setShowAddCustom(false);
    setCustomDeptInput('');
    setCustomDeptError('');
    setModalOpen(true);
  };

  const openEditModal = (job) => {
    setEditingJob(job);
    setTitle(job.title || '');
    setCompanyName(job.companyName || defaultCompany);
    const currentDept = job.department || 'Engineering';
    setDepartment(currentDept);
    setDepartments((prev) => {
      if (currentDept && !prev.some((d) => d.toLowerCase() === currentDept.toLowerCase())) {
        return [currentDept, ...prev];
      }
      return prev;
    });
    setEmploymentType(job.employmentType || 'Full-time');
    setOpenings(job.openings || 1);
    setMinExp(job.minExperience || 0);
    setMaxExp(job.maxExperience || 5);
    setLocation(job.location || 'Remote / Hybrid');
    setSalaryRange(job.salaryRange || 'Competitive');
    setDescription(job.description || '');
    setRequiredSkills(job.requiredSkills || '');
    setFormError('');
    setShowAddCustom(false);
    setCustomDeptInput('');
    setCustomDeptError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    const payload = {
      title,
      companyName: companyName.trim() || defaultCompany,
      department,
      employmentType,
      openings: parseInt(openings, 10),
      minExperience: parseInt(minExp, 10),
      maxExperience: parseInt(maxExp, 10),
      location,
      salaryRange,
      description,
      requiredSkills,
      status: 'Open',
    };

    try {
      if (editingJob && editingJob.id) {
        await api.put(`/jobs/${editingJob.id}`, payload);
      } else {
        await api.post('/jobs', payload);
      }
      setModalOpen(false);
      fetchJobs();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save job requisition.');
    }
  };

  const executeDelete = async (id) => {
    try {
      await api.delete(`/jobs/${id}`);
      fetchJobs();
    } catch (err) {
      console.error('Failed to delete job:', err);
    }
  };

  const departmentOptions = useMemo(() => {
    const opts = departments.map((d) => ({ value: d, label: d }));
    if (department && !departments.some((d) => d.toLowerCase() === department.toLowerCase())) {
      opts.unshift({ value: department, label: department });
    }
    opts.push({
      value: '__ADD_NEW__',
      label: '✨ + Add New Custom Department...',
      badge: 'Custom',
      icon: <i className="bi bi-plus-circle" style={{ color: 'var(--accent)' }}></i>,
    });
    return opts;
  }, [departments, department]);

  const employmentTypeOptions = [
    { value: 'Full-time', label: 'Full-time' },
    { value: 'Part-time', label: 'Part-time' },
    { value: 'Contract', label: 'Contract' },
    { value: 'Internship', label: 'Internship' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
            Job Requisitions Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Create and maintain role requirements, skill criteria, and active vacancies across departments.
          </p>
        </div>

        <Link
          to="/dashboard/jobs/new"
          className="btn btn-primary"
          data-tour="create-job-btn"
          style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textDecoration: 'none' }}
        >
          <i className="bi bi-plus-circle"></i> Create Job Requisition
        </Link>
      </div>

      {/* Jobs List */}
      <div className="card" data-tour="jobs-table-card" style={{ padding: 0, borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading job vacancies...
          </div>
        ) : jobs.length > 0 ? (
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Job Title &amp; Dept</th>
                  <th style={{ padding: '14px 20px', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Experience</th>
                  <th style={{ padding: '14px 20px', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Openings</th>
                  <th style={{ padding: '14px 20px', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Applicants</th>
                  <th style={{ padding: '14px 20px', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.94rem' }}>{job.title}</strong>
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                        {job.companyName ? <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{job.companyName} &bull; </span> : null}
                        {job.department} &bull; {job.location || 'Remote'}
                      </small>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-primary)' }}>
                      {job.minExperience} - {job.maxExperience} yrs
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-primary)' }}>
                      {job.openings}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                        {job.applicantsCount || 0}
                      </span>
                      <small style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                        ({job.shortlistedCount || 0} shortlisted)
                      </small>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.12)', color: '#059669', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        {job.status || 'OPEN'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(job)}
                        style={{ padding: '6px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', marginRight: '8px', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        <i className="bi bi-pencil"></i> Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteConfirm({
                            anchorEl: e.currentTarget,
                            id: job.id,
                            title: job.title || 'Job Vacancy',
                          });
                        }}
                        style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No job requisitions found. Click "Create Job Requisition" to add one.
          </div>
        )}
      </div>

      {/* Modal for Create / Edit */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {editingJob ? 'Edit Job Requisition' : 'Create New Job Requisition'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', color: '#dc2626', fontSize: '0.84rem', marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Job Title <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Java Spring Boot Developer"
                  className="form-control"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Hiring Company / Organization <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  {defaultCompany && companyName !== defaultCompany && (
                    <button
                      type="button"
                      onClick={() => setCompanyName(defaultCompany)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', padding: 0 }}
                    >
                      Reset ({defaultCompany})
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp, Tech Mahindra"
                  className="form-control"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                  Defaults to your HR company ({defaultCompany}), or specify client/other.
                </small>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
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
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: 0,
                        }}
                      >
                        + Add Custom
                      </button>
                    )}
                  </div>
                  <CustomSelect
                    id="modalJobDepartment"
                    value={department}
                    onChange={(val) => {
                      if (val === '__ADD_NEW__') {
                        setShowAddCustom(true);
                        setCustomDeptInput('');
                        setCustomDeptError('');
                      } else {
                        setDepartment(val);
                      }
                    }}
                    options={departmentOptions}
                    placeholder={loadingDepts ? 'Loading departments...' : 'Select Department'}
                    searchable={departments.length > 4}
                    disabled={loadingDepts}
                  />

                  {showAddCustom ? (
                    <div style={{ marginTop: '8px', padding: '10px', background: 'var(--bg-secondary, rgba(99, 102, 241, 0.05))', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Department name"
                          value={customDeptInput}
                          onChange={(e) => { setCustomDeptInput(e.target.value); if (customDeptError) setCustomDeptError(''); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomDept(); } }}
                          style={{ flex: 1, padding: '6px 10px', fontSize: '0.82rem' }}
                          autoFocus
                        />
                        <button type="button" className="btn btn-primary" onClick={handleAddCustomDept} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                          Add
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddCustom(false)} style={{ padding: '6px 8px', fontSize: '0.8rem' }}>
                          &times;
                        </button>
                      </div>
                      {customDeptError && <small style={{ color: 'var(--danger)', fontSize: '0.72rem' }}>{customDeptError}</small>}
                    </div>
                  ) : (
                    <div style={{ marginTop: '4px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => { setShowAddCustom(true); setCustomDeptError(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', padding: 0 }}
                      >
                        + Add Custom Department
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Employment Type
                  </label>
                  <CustomSelect
                    id="modalJobEmploymentType"
                    value={employmentType}
                    onChange={(val) => setEmploymentType(val)}
                    options={employmentTypeOptions}
                    placeholder="Select Employment Type"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 90px), 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Openings
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={openings}
                    onChange={(e) => setOpenings(e.target.value)}
                    className="form-control"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Min Exp (Yrs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minExp}
                    onChange={(e) => setMinExp(e.target.value)}
                    className="form-control"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Max Exp (Yrs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={maxExp}
                    onChange={(e) => setMaxExp(e.target.value)}
                    className="form-control"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Remote / Hybrid / Bangalore"
                  className="form-control"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Required Skills (Comma separated)
                </label>
                <input
                  type="text"
                  value={requiredSkills}
                  onChange={(e) => setRequiredSkills(e.target.value)}
                  placeholder="Java, Spring Boot, MySQL, REST APIs, Git"
                  className="form-control"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Role Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key responsibilities and expectations for this vacancy..."
                  className="form-control"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, cursor: 'pointer' }}
                >
                  {editingJob ? 'Update Requisition' : 'Save & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Popover Action Confirmation */}
      {deleteConfirm && (
        <ConfirmPopover
          anchorEl={deleteConfirm.anchorEl}
          title="Delete Job Vacancy?"
          message={`Are you sure you want to permanently delete the vacancy for "${deleteConfirm.title}"?`}
          confirmText="Delete"
          cancelText="Cancel"
          danger={true}
          onConfirm={() => {
            executeDelete(deleteConfirm.id);
            setDeleteConfirm(null);
          }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

export default JobManagement;
