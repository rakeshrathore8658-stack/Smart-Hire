import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import CustomSelect from '../../components/common/CustomSelect';
import JobQuestionBuilder from '../../components/hr/JobQuestionBuilder';

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
    screeningEnabled: false,
    atsThreshold: 60,
  });

  const [isCustomEmployment, setIsCustomEmployment] = useState(false);
  const [customEmploymentInput, setCustomEmploymentInput] = useState('');

  const [departments, setDepartments] = useState([]);
  const [customDepartments, setCustomDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newDeptInput, setNewDeptInput] = useState('');
  const [addingDept, setAddingDept] = useState(false);
  const [deletingDept, setDeletingDept] = useState('');
  const [addDeptError, setAddDeptError] = useState('');
  const [deptActionMsg, setDeptActionMsg] = useState('');

  const [loading, setLoading] = useState(isEdit);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [screeningQuestions, setScreeningQuestions] = useState([]);

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
          if (res.data.customDepartments && Array.isArray(res.data.customDepartments)) {
            setCustomDepartments(res.data.customDepartments);
          }
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
            const fetchedEmp = res.data.employmentType || 'Full-time';
            const isStandardEmp = ['Full-time', 'Contract', 'Part-time', 'Internship'].includes(fetchedEmp);
            if (!isStandardEmp && fetchedEmp.trim()) {
              setIsCustomEmployment(true);
              setCustomEmploymentInput(fetchedEmp);
            }
            setFormData({
              title: res.data.title || '',
              companyName: res.data.companyName || defaultCompany,
              department: fetchedDept,
              employmentType: fetchedEmp,
              openings: res.data.openings || 1,
              minExperience: res.data.minExperience || 2,
              maxExperience: res.data.maxExperience || 8,
              location: res.data.location || 'Remote / Hybrid',
              salaryRange: res.data.salaryRange || 'Competitive',
              requiredSkills: res.data.requiredSkills || '',
              description: res.data.description || '',
              status: res.data.status || 'Open',
              screeningEnabled: Boolean(res.data.screeningEnabled),
              atsThreshold: res.data.atsThreshold != null ? res.data.atsThreshold : 60,
            });
            // Ensure this job's department is present in departments list
            setDepartments((prev) => {
              if (fetchedDept && !prev.some((d) => d.toLowerCase() === fetchedDept.toLowerCase())) {
                return [fetchedDept, ...prev];
              }
              return prev;
            });

            // Fetch attached screening questions
            try {
              const qRes = await api.get(`/jobs/${id}/questions`);
              if (qRes.data?.questions) {
                setScreeningQuestions(qRes.data.questions);
              }
            } catch (qErr) {
              console.warn('Could not fetch questions for job:', qErr);
            }
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

  // Handle adding new custom department at runtime via modal
  const handleCreateNewDepartment = async (e) => {
    if (e) e.preventDefault();
    const trimmed = newDeptInput.trim();
    if (!trimmed) {
      setAddDeptError('Please enter a department name.');
      return;
    }

    setAddingDept(true);
    setAddDeptError('');
    try {
      await api.post('/jobs/departments', { name: trimmed });

      // Immediate optimistic update
      setDepartments((prev) => {
        if (!prev.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
          return [...prev, trimmed].sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
          );
        }
        return prev;
      });

      setCustomDepartments((prev) => {
        if (!prev.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
          return [...prev, trimmed].sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
          );
        }
        return prev;
      });

      // Automatically select new department in form
      setFormData((prev) => ({ ...prev, department: trimmed }));

      // Broadcast sync to JobRoles and JobManagement
      try {
        if (typeof window !== 'undefined') {
          const payload = { event: 'DEPARTMENT_CREATED', department: trimmed };
          window.dispatchEvent(new CustomEvent('smarthire:sync', { detail: payload }));
          if (window.BroadcastChannel) {
            const ch = new BroadcastChannel('smarthire_sync_channel');
            ch.postMessage(payload);
            ch.close();
          }
        }
      } catch (_) {}

      setNewDeptInput('');
      setShowAddDeptModal(false);
    } catch (err) {
      // Even if network/server issue, keep optimistic update and selection
      setDepartments((prev) => {
        if (!prev.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
          return [...prev, trimmed].sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
          );
        }
        return prev;
      });
      setCustomDepartments((prev) => {
        if (!prev.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
          return [...prev, trimmed].sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
          );
        }
        return prev;
      });
      setFormData((prev) => ({ ...prev, department: trimmed }));
      setNewDeptInput('');
      setShowAddDeptModal(false);
    } finally {
      setAddingDept(false);
    }
  };

  // Handle deleting department at runtime with applicant validation
  const handleDeleteDepartment = async (deptName) => {
    if (!window.confirm(`Are you sure you want to delete the job field '${deptName}'?\n\nNote: If any candidate has applied to jobs under this field, deletion will be blocked.`)) {
      return;
    }

    setDeletingDept(deptName);
    setAddDeptError('');
    setDeptActionMsg('');
    try {
      const res = await api.delete(`/jobs/departments/${encodeURIComponent(deptName)}`);
      const msg = res.data?.message || `Department '${deptName}' deleted successfully.`;
      setDeptActionMsg(msg);

      // Remove from departments and customDepartments
      setDepartments((prev) => prev.filter((d) => d.toLowerCase() !== deptName.toLowerCase()));
      setCustomDepartments((prev) => prev.filter((d) => d.toLowerCase() !== deptName.toLowerCase()));

      // Reset selection if currently active
      if (formData.department && formData.department.toLowerCase() === deptName.toLowerCase()) {
        const remaining = departments.filter((d) => d.toLowerCase() !== deptName.toLowerCase());
        setFormData((prev) => ({ ...prev, department: remaining.length > 0 ? remaining[0] : '' }));
      }

      // Broadcast sync to JobRoles and other tabs
      try {
        if (typeof window !== 'undefined') {
          const payload = { event: 'DEPARTMENT_DELETED', department: deptName };
          window.dispatchEvent(new CustomEvent('smarthire:sync', { detail: payload }));
          if (window.BroadcastChannel) {
            const ch = new BroadcastChannel('smarthire_sync_channel');
            ch.postMessage(payload);
            ch.close();
          }
        }
      } catch (_) {}
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to delete department '${deptName}'.`;
      setAddDeptError(msg);
      if (!showAddDeptModal) {
        alert(msg);
      }
    } finally {
      setDeletingDept('');
    }
  };

  const departmentOptions = useMemo(() => {
    const opts = departments.map((dept) => {
      const isCustom = customDepartments.some((cd) => cd.toLowerCase() === dept.toLowerCase());
      return {
        value: dept,
        label: dept,
        badge: isCustom ? 'Custom' : undefined,
      };
    });
    if (formData.department && !departments.some((d) => d.toLowerCase() === formData.department.toLowerCase())) {
      const isCustom = customDepartments.some((cd) => cd.toLowerCase() === formData.department.toLowerCase());
      opts.unshift({
        value: formData.department,
        label: formData.department,
        badge: isCustom ? 'Custom' : undefined,
      });
    }
    return opts;
  }, [departments, customDepartments, formData.department]);

  const standardEmploymentTypes = [
    { value: 'Full-time', label: 'Full-time Permanent' },
    { value: 'Contract', label: 'Contract / Contingent' },
    { value: 'Part-time', label: 'Part-time' },
    { value: 'Internship', label: 'Internship' },
  ];

  const employmentTypeOptions = useMemo(() => {
    const opts = [...standardEmploymentTypes];
    if (
      formData.employmentType &&
      !standardEmploymentTypes.some((t) => t.value === formData.employmentType) &&
      formData.employmentType !== '__CUSTOM__'
    ) {
      opts.unshift({ value: formData.employmentType, label: `${formData.employmentType} (Custom)` });
    }
    opts.push({
      value: '__CUSTOM__',
      label: '✏️ + Type Custom Employment Type...',
      badge: 'Custom',
    });
    return opts;
  }, [formData.employmentType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      let savedJobId = id;
      if (isEdit) {
        await api.put(`/jobs/${id}`, formData);
        setSuccessMsg('Job requisition updated successfully.');
      } else {
        const res = await api.post('/jobs', formData);
        savedJobId = res.data?.job?.id || res.data?.id;
        setSuccessMsg('New job requisition published successfully.');
      }

      if (savedJobId && formData.screeningEnabled && screeningQuestions.length > 0) {
        try {
          await api.post(`/jobs/${savedJobId}/questions`, screeningQuestions);
        } catch (qErr) {
          console.warn('Could not save screening questions:', qErr);
        }
      }

      try {
        if (typeof window !== 'undefined') {
          const syncPayload = { event: isEdit ? 'JOB_UPDATED' : 'JOB_CREATED', department: formData.department };
          window.dispatchEvent(new CustomEvent('smarthire:sync', { detail: syncPayload }));
          if (window.BroadcastChannel) {
            const ch = new BroadcastChannel('smarthire_sync_channel');
            ch.postMessage(syncPayload);
            ch.close();
          }
        }
      } catch (_) {}

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, margin: 0 }}>
                      Department <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => {
                        setShowAddDeptModal(true);
                        setAddDeptError('');
                        setDeptActionMsg('');
                        setNewDeptInput('');
                      }}
                      style={{
                        borderStyle: 'dashed',
                        fontSize: '0.78rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                      title="Add new job field or manage/delete existing fields"
                    >
                      <i className="bi bi-plus-circle"></i> + Add Field
                    </button>
                  </div>
                </div>
                <CustomSelect
                  id="jobDepartmentSelect"
                  value={formData.department}
                  onChange={(val) => setFormData({ ...formData, department: val })}
                  options={departmentOptions}
                  placeholder={loadingDepts ? 'Loading departments...' : 'Select Department'}
                  searchable={departments.length > 4}
                  disabled={loadingDepts}
                />
              </div>
            </div>

            <div className="grid-1-1" style={{ gap: '16px' }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, margin: 0 }}>
                    Employment Type
                  </label>
                  {isCustomEmployment && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomEmployment(false);
                        setFormData({ ...formData, employmentType: 'Full-time' });
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary, #6366f1)',
                        cursor: 'pointer',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        padding: 0,
                      }}
                    >
                      &larr; Standard Types
                    </button>
                  )}
                </div>

                {!isCustomEmployment ? (
                  <CustomSelect
                    id="jobEmploymentTypeSelect"
                    value={formData.employmentType}
                    onChange={(val) => {
                      if (val === '__CUSTOM__') {
                        setIsCustomEmployment(true);
                        setCustomEmploymentInput('');
                      } else {
                        setFormData({ ...formData, employmentType: val });
                      }
                    }}
                    options={employmentTypeOptions}
                    placeholder="Select Employment Type"
                  />
                ) : (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type custom employment type (e.g. Freelance, Trainee, Consultant)..."
                      value={customEmploymentInput}
                      onChange={(e) => {
                        setCustomEmploymentInput(e.target.value);
                        setFormData({ ...formData, employmentType: e.target.value });
                      }}
                      autoFocus
                      style={{ width: '100%', padding: '10px 14px', fontSize: '0.875rem' }}
                    />
                  </div>
                )}
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

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

          {/* Section 5: Candidate Pre-Screening Questionnaire */}
          <div style={{ marginBottom: '28px' }}>
            <span className="badge badge-primary">SECTION 5</span>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '6px 0 16px' }}>
              Dynamic Screening Questions
            </h2>

            {/* Modern Toggle Switch Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: formData.screeningEnabled ? 'rgba(99, 102, 241, 0.06)' : 'var(--bg-secondary, #f8fafc)',
                border: `1.5px solid ${formData.screeningEnabled ? 'var(--primary, #6366f1)' : 'var(--border-color, #e2e8f0)'}`,
                borderRadius: '12px',
                marginBottom: '20px',
                transition: 'all 0.25s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: formData.screeningEnabled ? 'var(--primary, #6366f1)' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '1.25rem',
                  }}
                >
                  <i className={formData.screeningEnabled ? 'bi bi-patch-question-fill' : 'bi bi-slash-circle'}></i>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--text-primary)' }}>
                    Enable Candidate Pre-Screening Questionnaire
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {formData.screeningEnabled
                      ? 'ON: Candidates qualifying the ATS score threshold will be required to answer questions.'
                      : 'OFF: Questionnaire is disabled for this job. Applicants proceed directly without pre-screening.'}
                  </div>
                </div>
              </div>

              {/* iOS style Toggle Switch */}
              <label style={{ position: 'relative', display: 'inline-block', width: '52px', height: '28px', margin: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!formData.screeningEnabled}
                  onChange={(e) => setFormData({ ...formData, screeningEnabled: e.target.checked })}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: formData.screeningEnabled ? 'var(--primary, #6366f1)' : '#cbd5e1',
                    borderRadius: '28px',
                    transition: '0.25s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      height: '22px',
                      width: '22px',
                      left: formData.screeningEnabled ? '26px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.25s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  />
                </span>
              </label>
            </div>

            {formData.screeningEnabled ? (
              <>
                {/* Modern ATS Threshold Benchmark Selector */}
                <div
                  style={{
                    background: 'var(--bg-card, #ffffff)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '18px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="bi bi-speedometer2" style={{ color: 'var(--primary, #6366f1)' }}></i>
                        ATS Resume Qualification Benchmark
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Job seekers must achieve this score on AI Resume Analysis to unlock and submit the pre-screening form.
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: 'var(--primary, #6366f1)',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                      }}
                    >
                      <i className="bi bi-check2-circle"></i> Requires: {formData.atsThreshold || 60}%+ Score
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {[60, 65, 70, 75, 80].map((score) => {
                      const isSelected = formData.atsThreshold === score;
                      return (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setFormData({ ...formData, atsThreshold: score })}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid var(--primary, #6366f1)' : '1px solid var(--border-color)',
                            background: isSelected ? 'var(--primary, #6366f1)' : 'var(--bg-secondary, #f8fafc)',
                            color: isSelected ? '#ffffff' : 'var(--text-primary)',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {score}% {score === 60 ? '(Standard)' : score === 75 ? '(Recommended)' : score === 80 ? '(Strict)' : ''}
                        </button>
                      );
                    })}

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Custom Benchmark:</span>
                      <div style={{ position: 'relative', width: '90px' }}>
                        <input
                          type="number"
                          min="30"
                          max="100"
                          value={formData.atsThreshold}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            setFormData({ ...formData, atsThreshold: val });
                          }}
                          className="form-control"
                          style={{ padding: '5px 22px 5px 8px', fontSize: '0.82rem', textAlign: 'center', fontWeight: 700 }}
                        />
                        <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <JobQuestionBuilder
                  questions={screeningQuestions}
                  setQuestions={setScreeningQuestions}
                  atsThreshold={formData.atsThreshold}
                />
              </>
            ) : (
              <div
                style={{
                  padding: '28px 20px',
                  textAlign: 'center',
                  background: 'var(--bg-secondary, #f8fafc)',
                  border: '1.5px dashed var(--border-color)',
                  borderRadius: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                <i className="bi bi-shield-slash" style={{ fontSize: '2rem', display: 'block', marginBottom: '8px', opacity: 0.6 }}></i>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  Screening Questionnaire is Disabled for this Job
                </div>
                <div style={{ fontSize: '0.82rem', marginTop: '4px', maxWidth: '440px', margin: '4px auto 0' }}>
                  Turn ON the toggle above if you want to require applicants scoring {formData.atsThreshold || 60}%+ on ATS evaluation to fill pre-screening answers.
                </div>
              </div>
            )}
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

      {/* Modal Dialog: Add New Job Field / Department */}
      {showAddDeptModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setShowAddDeptModal(false)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              borderRadius: 'var(--radius-lg, 12px)',
              background: 'var(--bg-card, #ffffff)',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
              margin: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="bi bi-tags" style={{ color: 'var(--accent, #6366f1)' }}></i>
                Add & Manage Job Fields
              </h3>
              <button
                type="button"
                onClick={() => setShowAddDeptModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.3rem', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Create a new job field / department at runtime, or manage and delete existing fields. Fields with 0 applicants can be safely removed.
            </p>

            {addDeptError && (
              <div className="alert alert-danger" style={{ padding: '8px 12px', fontSize: '0.82rem', marginBottom: '14px' }}>
                <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '6px' }}></i>
                {addDeptError}
              </div>
            )}

            {deptActionMsg && (
              <div className="alert alert-success" style={{ padding: '8px 12px', fontSize: '0.82rem', marginBottom: '14px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                <i className="bi bi-check-circle-fill" style={{ marginRight: '6px' }}></i>
                {deptActionMsg}
              </div>
            )}

            <form onSubmit={handleCreateNewDepartment}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Field / Department Name *
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Cybersecurity, QA & Testing, Human Resources"
                  value={newDeptInput}
                  onChange={(e) => {
                    setNewDeptInput(e.target.value);
                    if (addDeptError) setAddDeptError('');
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAddDeptModal(false)}
                  disabled={addingDept}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={addingDept || !newDeptInput.trim()}
                >
                  {addingDept ? 'Creating...' : 'Create & Apply Field'}
                </button>
              </div>
            </form>

            {/* List of ALL Available Job Fields with Delete Option (Recruiter Isolated) */}
            <div style={{ marginTop: '22px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  All Available Job Fields / Departments ({departments.length})
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-secondary, #f1f5f9)', padding: '2px 8px', borderRadius: '4px' }}>
                  HR Isolated
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                You can delete any field having 0 applicants. Fields with active candidate applications are protected from accidental deletion.
              </p>

              {departments.length === 0 ? (
                <div style={{ padding: '14px', textAlign: 'center', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  No job fields currently available. Use the form above to add a new field.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                  {departments.map((deptName) => {
                    const isCustom = customDepartments.some((cd) => cd.toLowerCase() === deptName.toLowerCase());
                    return (
                      <div
                        key={deptName}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: 'var(--bg-secondary, #f8fafc)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="bi bi-tag-fill" style={{ color: 'var(--primary, #6366f1)', fontSize: '0.78rem' }}></i>
                          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {deptName}
                          </span>
                          {isCustom && (
                            <span style={{ fontSize: '0.68rem', padding: '1px 6px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', borderRadius: '4px', fontWeight: 600 }}>
                              Custom
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-danger"
                          onClick={() => handleDeleteDepartment(deptName)}
                          disabled={deletingDept === deptName}
                          title={`Delete field '${deptName}'`}
                          style={{
                            padding: '3px 10px',
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            background: 'rgba(239, 68, 68, 0.06)',
                            borderRadius: '5px',
                            cursor: 'pointer',
                          }}
                        >
                          <i className="bi bi-trash3"></i> {deletingDept === deptName ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
