import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

const JobManagement = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
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
  }, []);

  const openCreateModal = () => {
    setEditingJob(null);
    setTitle('');
    setDepartment('Engineering');
    setEmploymentType('Full-time');
    setOpenings(1);
    setMinExp(2);
    setMaxExp(5);
    setLocation('Remote / Hybrid');
    setSalaryRange('Competitive');
    setDescription('');
    setRequiredSkills('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (job) => {
    setEditingJob(job);
    setTitle(job.title || '');
    setDepartment(job.department || 'Engineering');
    setEmploymentType(job.employmentType || 'Full-time');
    setOpenings(job.openings || 1);
    setMinExp(job.minExperience || 0);
    setMaxExp(job.maxExperience || 5);
    setLocation(job.location || 'Remote / Hybrid');
    setSalaryRange(job.salaryRange || 'Competitive');
    setDescription(job.description || '');
    setRequiredSkills(job.requiredSkills || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    const payload = {
      title,
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job vacancy?')) return;
    try {
      await api.delete(`/jobs/${id}`);
      fetchJobs();
    } catch (err) {
      alert('Failed to delete job.');
    }
  };

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
                        onClick={() => handleDelete(job.id)}
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
                  Job Title
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="form-control"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Employment Type
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="form-control"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
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
    </div>
  );
};

export default JobManagement;
