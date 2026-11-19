import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ResumePreviewModal from '../../components/common/ResumePreviewModal';
import api from '../../api/client';

const normalizeApplicant = (data) => {
  if (!data) return null;

  // Unpack nested DTO components if present (/api/hr/applications/:id)
  const cand = data.candidate || {};
  const job = data.job || {};
  const ats = data.ats || {};
  const res = data.resume || {};
  const scr = data.screening || {};

  // Extract extra fields if analysisJson is present
  let extra = {};
  if (typeof data.analysisJson === 'string') {
    try {
      extra = JSON.parse(data.analysisJson);
    } catch (_) {}
  } else if (data.analysisJson && typeof data.analysisJson === 'object') {
    extra = data.analysisJson;
  }

  const candidateName = data.candidateName || cand.name || extra.candidateName || extra.candidate?.name || 'Unknown Candidate';
  const candidateEmail = data.candidateEmail || cand.email || extra.candidateEmail || extra.candidate?.email || '';
  const candidatePhone = data.candidatePhone || cand.phoneNumber || extra.candidatePhone || extra.candidate?.phoneNumber || '';
  const candidateLocation = data.candidateLocation || cand.location || extra.candidateLocation || extra.candidate?.location || '';
  const candidateExperience = data.candidateExperience || cand.experience || extra.candidateExperience || extra.candidate?.totalExperience || '';
  const targetJobRole = data.targetJobRole || job.title || extra.targetJobRole || 'Target Role';

  const atsScore = data.atsScore !== undefined
    ? Number(data.atsScore)
    : (ats.score !== undefined
      ? Number(ats.score)
      : (data.overallScore !== undefined
        ? Number(data.overallScore)
        : (ats.overallScore !== undefined ? Number(ats.overallScore) : (extra.overallScore ? Number(extra.overallScore) : 0))));

  const overallScore = atsScore;
  const skillsScore = data.skillsScore !== undefined ? Number(data.skillsScore) : (ats.skillsScore !== undefined ? Number(ats.skillsScore) : (extra.skillsScore ? Number(extra.skillsScore) : 0));
  const experienceScore = data.experienceScore !== undefined ? Number(data.experienceScore) : (ats.experienceScore !== undefined ? Number(ats.experienceScore) : (extra.experienceScore ? Number(extra.experienceScore) : 0));
  const formattingScore = data.formattingScore !== undefined ? Number(data.formattingScore) : (data.formatScore !== undefined ? Number(data.formatScore) : (ats.formattingScore !== undefined ? Number(ats.formattingScore) : (extra.formattingScore ? Number(extra.formattingScore) : 0)));
  const projectsScore = data.projectsScore !== undefined ? Number(data.projectsScore) : (extra.projectsScore ? Number(extra.projectsScore) : Math.round(overallScore * 0.95));
  const educationScore = data.educationScore !== undefined ? Number(data.educationScore) : (extra.educationScore ? Number(extra.educationScore) : Math.round(overallScore * 0.9));
  const keywordScore = data.keywordScore !== undefined ? Number(data.keywordScore) : (extra.keywordScore ? Number(extra.keywordScore) : Math.round(overallScore * 0.85));

  const resumeUrl = data.resumeUrl || res.resumeUrl || extra.resumeUrl || '';
  const resumePublicId = data.resumePublicId || res.resumePublicId || extra.resumePublicId || '';
  const resumeFileName = data.resumeFileName || res.fileName || data.fileName || extra.resumeFileName || extra.fileName || 'Resume.pdf';
  const resumeId = data.resumeId || res.id || extra.resumeId || null;

  const stage = data.stage || data.displayStage || data.applicationStatus || 'Under Review';
  const screeningCompleted = data.screeningCompleted !== undefined
    ? Boolean(data.screeningCompleted)
    : Boolean(scr.submitted);

  const rawResponses = (data.screeningResponses && data.screeningResponses.length > 0)
    ? data.screeningResponses
    : (scr.responses && scr.responses.length > 0)
      ? scr.responses
      : [];

  const screeningResponses = rawResponses.map((r, i) => ({
    questionId: r.questionId || (i + 1),
    questionText: r.questionText || r.question || `Screening Question ${i + 1}`,
    questionType: r.questionType || 'TEXT',
    answerText: r.answerText || r.answer || '',
    answeredAt: r.answeredAt || null,
    required: r.required !== undefined ? r.required : true
  }));

  const matchedSkills = data.matchedSkills || ats.matchedSkills || data.matchedSkillsList || extra.matchedSkillsList || [];
  const missingSkills = data.missingSkills || ats.missingSkills || data.missingSkillsList || extra.missingSkillsList || [];

  return {
    ...data,
    candidateName,
    candidateEmail,
    candidatePhone,
    candidateLocation,
    candidateExperience,
    targetJobRole,
    atsScore,
    overallScore,
    skillsScore,
    experienceScore,
    formattingScore,
    projectsScore,
    educationScore,
    keywordScore,
    resumeUrl,
    resumePublicId,
    resumeFileName,
    resumeId,
    stage,
    screeningCompleted,
    screeningResponses,
    matchedSkills,
    missingSkills
  };
};

export default function ApplicantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionAlert, setActionAlert] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewModal, setPreviewModal] = useState({ open: false, type: 'pdf' });

  const fetchApplicantDetails = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      let rawData = null;

      try {
        const res = await api.get(`/hr/applications/${id}`);
        rawData = res.data;
      } catch (err) {
        console.warn('Failed to fetch from /api/hr/applications/' + id + ', falling back to candidate endpoint:', err);
      }

      if (!rawData) {
        const fallbackRes = await api.get(`/dashboard/candidates/${id}`);
        rawData = fallbackRes.data;
        if (rawData && !rawData.resumeUrl) {
          try {
            const hrRes = await api.get(`/hr/applications/${id}`);
            if (hrRes.data?.resume?.resumeUrl) {
              rawData.resumeUrl = hrRes.data.resume.resumeUrl;
              rawData.resumeFileName = hrRes.data.resume.fileName;
            }
          } catch (_) {}
        }
      }

      setApplicant(normalizeApplicant(rawData));
    } catch (fallbackErr) {
      console.error('Failed to load applicant profile:', fallbackErr);
      setErrorMsg('Failed to load applicant profile. The record may not exist or access is restricted.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicantDetails();
  }, [id]);

  const handleStatusChange = async (newStage, isShortlisted = false) => {
    try {
      setActionLoading(true);
      setActionAlert(null);
      await api.post(`/hr/applications/${id}/status`, {
        stage: newStage,
        shortlisted: isShortlisted
      });
      setActionAlert({ type: 'success', message: `Applicant status updated to "${newStage}". Notification email dispatched if SMTP is configured.` });
      fetchApplicantDetails();
    } catch (err) {
      setActionAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Error updating status.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading complete applicant profile and screening answers...</p>
      </div>
    );
  }

  if (errorMsg || !applicant) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 16px' }}>
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '8px' }}></i>
          {errorMsg || 'Applicant details could not be retrieved.'}
        </div>
        <Link to="/dashboard/applications" className="btn btn-secondary">
          ← Back to Applications List
        </Link>
      </div>
    );
  }

  const overallScore = applicant.atsScore !== undefined ? applicant.atsScore : (applicant.overallScore || 0);
  const scoreClass = overallScore >= 75 ? 'score-high' : overallScore >= 60 ? 'score-mid' : 'score-low';
  const hasCloudinaryResume = Boolean(applicant.resumeUrl);

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <Link to="/dashboard/applications">Applications</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{applicant.candidateName || 'Applicant Profile'}</span>
      </nav>

      {actionAlert && (
        <div className={`alert alert-${actionAlert.type}`} role="alert" style={{ marginBottom: '20px' }}>
          <i className={`bi ${actionAlert.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`} style={{ marginRight: '8px' }}></i>
          {actionAlert.message}
        </div>
      )}

      {/* Profile Header Card */}
      <div className="card" style={{ marginBottom: '24px', border: '1px solid var(--border)' }}>
        <div className="card-body" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent) 0%, #312e81 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 700
                }}
              >
                {applicant.candidateName ? applicant.candidateName.slice(0, 2).toUpperCase() : 'CA'}
              </div>
              <div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px 0' }}>
                  {applicant.candidateName || 'Unknown Candidate'}
                </h1>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {applicant.candidateEmail && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="bi bi-envelope"></i>
                      <a href={`mailto:${applicant.candidateEmail}`}>{applicant.candidateEmail}</a>
                    </span>
                  )}
                  {applicant.candidatePhone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="bi bi-telephone"></i>
                      <span>{applicant.candidatePhone}</span>
                    </span>
                  )}
                  {applicant.candidateLocation && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="bi bi-geo-alt"></i>
                      <span>{applicant.candidateLocation}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Score & Stage Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  ATS Score
                </div>
                <span className={`score-badge ${scoreClass}`} style={{ fontSize: '1.1rem', padding: '4px 12px' }}>
                  {overallScore}%
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Stage
                </div>
                <span className="badge badge-primary" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                  {applicant.stage || applicant.displayStage || 'Under Review'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Source
                </div>
                {(applicant.applicationSource || '').toUpperCase() === 'JOB_SEEKER' ? (
                  <span
                    className="badge"
                    title="Candidate applied directly via Job Seeker Portal"
                    style={{
                      background: 'rgba(59, 130, 246, 0.12)',
                      color: '#2563eb',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      fontSize: '0.82rem',
                      padding: '5px 10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 700,
                    }}
                  >
                    <i className="bi bi-globe2"></i> Job Seeker
                  </span>
                ) : (
                  <span
                    className="badge"
                    title="Resume scanned or uploaded by HR Recruiter"
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      color: '#d97706',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      fontSize: '0.82rem',
                      padding: '5px 10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 700,
                    }}
                  >
                    <i className="bi bi-person-workspace"></i> HR Scan
                  </span>
                )}
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

          {/* Quick Actions Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {hasCloudinaryResume ? (
                <button
                  type="button"
                  onClick={() => setPreviewModal({ open: true, type: 'pdf' })}
                  className="btn btn-outline-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="View Cloud Resume in Current Tab"
                >
                  <i className="bi bi-cloud-arrow-down"></i> View Cloud Resume
                </button>
              ) : applicant.resumeId ? (
                <button
                  type="button"
                  onClick={() => setPreviewModal({ open: true, type: 'pdf' })}
                  className="btn btn-outline-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="View Stored Resume Document in Current Tab"
                >
                  <i className="bi bi-file-earmark-pdf"></i> View Resume
                </button>
              ) : (
                <button type="button" className="btn btn-outline-secondary btn-sm" disabled>
                  <i className="bi bi-file-earmark-x"></i> Resume URL Not Stored
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {applicant.shortlisted || applicant.stage === 'Shortlisted' ? (
                <button
                  type="button"
                  className="btn btn-outline-warning btn-sm"
                  onClick={() => handleStatusChange('Under Review', false)}
                  disabled={actionLoading}
                  title="Remove candidate from shortlist"
                >
                  <i className="bi bi-star-fill" style={{ color: '#f59e0b' }}></i> Remove from Shortlist
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm"
                  onClick={() => handleStatusChange('Shortlisted', true)}
                  disabled={actionLoading}
                  title="Shortlist candidate"
                >
                  <i className="bi bi-star"></i> Shortlist
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleStatusChange('Interview Scheduled', true)}
                disabled={actionLoading}
              >
                <i className="bi bi-calendar-event"></i> Schedule Interview
              </button>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => handleStatusChange('Rejected', false)}
                disabled={actionLoading}
              >
                <i className="bi bi-x-circle"></i> Reject
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: If candidate submitted screening responses, show them alongside ATS Breakdown.
          If NO screening responses exist (e.g. HR uploaded/scanned resumes), do not show screening questionnaire card. */}
      {applicant.screeningResponses && applicant.screeningResponses.length > 0 ? (
        <div className="grid-2-1" style={{ gap: '24px' }}>
          {/* Screening Responses Section */}
          <div>
            <div className="card" style={{ border: '1px solid var(--border)', height: '100%' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="bi bi-ui-checks" style={{ color: 'var(--accent)' }}></i>
                  Candidate Pre-Screening Responses
                </h3>
                <span className="badge badge-success">
                  <i className="bi bi-check-circle" style={{ marginRight: '4px' }}></i>
                  Completed
                </span>
              </div>

              <div className="card-body" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {applicant.screeningResponses.map((sr, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-light, #f8fafc)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '14px 16px'
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--accent)', marginRight: '6px' }}>Q{idx + 1}.</span>
                        {sr.questionText || 'Question'}
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)', padding: '8px 12px', background: '#ffffff', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        {sr.answerText || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No answer provided</span>}
                      </div>
                      {sr.answeredAt && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>
                          Submitted: {new Date(sr.answeredAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ATS Evaluation & Skills Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Category Scores */}
            <div className="card" style={{ border: '1px solid var(--border)' }}>
              <div className="card-header">
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>ATS Category Breakdown</h3>
              </div>
              <div className="card-body" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { label: 'Skills Alignment', val: applicant.skillsScore || applicant.categoryScores?.skills || 0 },
                    { label: 'Experience Depth', val: applicant.experienceScore || applicant.categoryScores?.experience || 0 },
                    { label: 'Projects Relevance', val: applicant.projectsScore || applicant.categoryScores?.projects || 0 },
                    { label: 'Education & Certs', val: applicant.educationScore || applicant.categoryScores?.education || 0 },
                    { label: 'Keyword Density', val: applicant.keywordScore || applicant.categoryScores?.keywords || 0 },
                    { label: 'ATS Format & Layout', val: applicant.formattingScore || applicant.categoryScores?.formatting || 0 }
                  ].map((cat, idx) => (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span>{cat.label}</span>
                        <strong>{cat.val}%</strong>
                      </div>
                      <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, Math.max(0, cat.val))}%`,
                            background: cat.val >= 75 ? 'var(--success, #10b981)' : cat.val >= 50 ? 'var(--warning, #f59e0b)' : 'var(--danger, #ef4444)'
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Matched & Missing Skills */}
            <div className="card" style={{ border: '1px solid var(--border)' }}>
              <div className="card-header">
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Skills Assessment</h3>
              </div>
              <div className="card-body" style={{ padding: '16px' }}>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Matched Skills:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(applicant.matchedSkills || applicant.matchedSkillsList || []).map((s, idx) => (
                      <span key={idx} className="badge badge-success" style={{ fontSize: '0.78rem' }}>
                        {typeof s === 'string' ? s : s.skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Identified Gaps:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(applicant.missingSkills || applicant.missingSkillsList || []).map((s, idx) => (
                      <span key={idx} className="badge badge-warning" style={{ fontSize: '0.78rem' }}>
                        {typeof s === 'string' ? s : s.skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid-1-1" style={{ gap: '24px' }}>
          {/* Category Scores */}
          <div className="card" style={{ border: '1px solid var(--border)' }}>
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>ATS Category Breakdown</h3>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Skills Alignment', val: applicant.skillsScore || applicant.categoryScores?.skills || 0 },
                  { label: 'Experience Depth', val: applicant.experienceScore || applicant.categoryScores?.experience || 0 },
                  { label: 'Projects Relevance', val: applicant.projectsScore || applicant.categoryScores?.projects || 0 },
                  { label: 'Education & Certs', val: applicant.educationScore || applicant.categoryScores?.education || 0 },
                  { label: 'Keyword Density', val: applicant.keywordScore || applicant.categoryScores?.keywords || 0 },
                  { label: 'ATS Format & Layout', val: applicant.formattingScore || applicant.categoryScores?.formatting || 0 }
                ].map((cat, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                      <span>{cat.label}</span>
                      <strong>{cat.val}%</strong>
                    </div>
                    <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.max(0, cat.val))}%`,
                          background: cat.val >= 75 ? 'var(--success, #10b981)' : cat.val >= 50 ? 'var(--warning, #f59e0b)' : 'var(--danger, #ef4444)'
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Matched & Missing Skills */}
          <div className="card" style={{ border: '1px solid var(--border)' }}>
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Skills Assessment</h3>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Matched Skills:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(applicant.matchedSkills || applicant.matchedSkillsList || []).map((s, idx) => (
                    <span key={idx} className="badge badge-success" style={{ fontSize: '0.78rem' }}>
                      {typeof s === 'string' ? s : s.skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Identified Gaps:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(applicant.missingSkills || applicant.missingSkillsList || []).map((s, idx) => (
                    <span key={idx} className="badge badge-warning" style={{ fontSize: '0.78rem' }}>
                      {typeof s === 'string' ? s : s.skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-App Resume Preview Modal (Current Tab) */}
      <ResumePreviewModal
        isOpen={previewModal.open}
        onClose={() => setPreviewModal({ open: false, type: 'pdf' })}
        candidateName={applicant?.candidateName || 'Applicant'}
        resumeUrl={applicant?.resumeUrl || (applicant?.resumeId ? `/api/resumes/${applicant.resumeId}/view` : '')}
        resumeFileName={applicant?.resumeFileName || `${applicant?.candidateName || 'Applicant'}_Resume`}
        initialType={previewModal.type}
      />
    </div>
  );
}
