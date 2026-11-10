import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';

export default function JobForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id && id !== 'new' && id !== 'create');

  const [formData, setFormData] = useState({
    title: '',
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

  const [loading, setLoading] = useState(isEdit);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isEdit) {
      const fetchJob = async () => {
        try {
          const res = await api.get(`/jobs/${id}`);
          if (res.data) {
            setFormData({
              title: res.data.title || '',
              department: res.data.department || 'Engineering',
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
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Department <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  className="form-control"
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px' }}
                >
                  <option value="Engineering">Engineering / Software</option>
                  <option value="Product">Product & Design</option>
                  <option value="Data">Data Science & Analytics</option>
                  <option value="Infrastructure">DevOps & Cloud Infrastructure</option>
                  <option value="Sales">Sales & Marketing</option>
                </select>
              </div>
            </div>

            <div className="grid-1-1" style={{ gap: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Employment Type
                </label>
                <select
                  className="form-control"
                  value={formData.employmentType}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px' }}
                >
                  <option value="Full-time">Full-time Permanent</option>
                  <option value="Contract">Contract / Contingent</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                </select>
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
