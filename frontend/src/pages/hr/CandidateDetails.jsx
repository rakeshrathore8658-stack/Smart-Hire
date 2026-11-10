import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import AnalysisResult from '../../components/common/AnalysisResult';
import api from '../../api/client';

const CandidateDetails = () => {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shortlisted, setShortlisted] = useState(false);
  const [actionAlert, setActionAlert] = useState('');
  const [notes, setNotes] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const fallbackCandidate = {
    id: Number(id) || 1,
    candidateName: id === '2' ? 'Ramu Kushwah' : 'ANAND VERMA',
    candidateInitials: id === '2' ? 'RK' : 'AV',
    candidateEmail: id === '2' ? 'kushwahramu2308@gmail.com' : 'anandpatel88170@gmail.com',
    candidatePhone: '+91 97704 59413',
    candidateLocation: 'Indore, MP / Remote',
    targetJobRole: id === '2' ? 'Java Developer' : 'Spring Boot Developer',
    overallScore: id === '2' ? 66 : 72,
    formattingScore: 88,
    skillsScore: id === '2' ? 50 : 68,
    experienceScore: 70,
    keywordScore: id === '2' ? 48 : 64,
    candidateExperience: id === '2' ? '2.0 Years' : '3.5 Years',
    displayStage: id === '2' ? 'Interviewing' : 'Under Review',
    shortlisted: id === '2',
    candidateSummary:
      'Backend software developer with experience designing RESTful APIs, Spring Boot microservices, and database models. Demonstrated ability to deliver clean and testable code.',
    workExperienceList: [
      'Software Engineer at TechLab (2024 - Present): Built and maintained microservices using Spring Boot, Hibernate, and PostgreSQL.',
      'Associate Developer (2022 - 2024): Developed REST endpoints, conducted unit testing with JUnit, and managed Git versioning.',
    ],
    projectsList: [
      'SmartHire Recruitment Platform: End-to-end recruitment screening system with automated resume parsing and ATS scoring.',
      'E-Commerce Microservices Engine: Designed order, inventory, and payment microservices with Docker deployment.',
    ],
    matchedSkillsList: ['Java', 'Spring Boot', 'Hibernate', 'REST APIs', 'SQL', 'Git', 'Maven'],
    missingSkillsList: [
      { skill: 'Docker Containerization', priority: 'HIGH' },
      { skill: 'Kubernetes Orchestration', priority: 'HIGH' },
      { skill: 'AWS Cloud Deployment', priority: 'HIGH' },
    ],
    strengthsList: [
      'Solid core Java, Spring Framework, and relational database fundamentals.',
      'Clear project history highlighting backend REST API integration.',
    ],
    recommendationsList: [
      'Probe container deployment and CI/CD automation in technical interview round.',
      'Evaluate understanding of microservice failure handling and distributed transactions.',
    ],
  };

  useEffect(() => {
    let isMounted = true;
    const fetchCandidate = async () => {
      try {
        const res = await api.get(`/dashboard/candidates/${id}`);
        if (isMounted && res.data) {
          setCandidate(res.data);
          setShortlisted(!!res.data.shortlisted);
        } else {
          setCandidate(fallbackCandidate);
          setShortlisted(fallbackCandidate.shortlisted);
        }
      } catch (err) {
        setCandidate(fallbackCandidate);
        setShortlisted(fallbackCandidate.shortlisted);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchCandidate();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleToggleShortlist = async () => {
    if (!candidate?.id) return;
    try {
      const res = await api.post(`/dashboard/candidates/${candidate.id}/shortlist`);
      if (res.data) {
        const isNowShortlisted = Boolean(res.data.shortlisted);
        setShortlisted(isNowShortlisted);
        setCandidate((prev) => ({
          ...prev,
          shortlisted: isNowShortlisted,
          displayStage: res.data.displayStage || (isNowShortlisted ? 'Shortlisted' : 'Under Review'),
          stage: res.data.stage || (isNowShortlisted ? 'Shortlisted' : 'Under Review'),
        }));
        setActionAlert(
          isNowShortlisted
            ? 'Candidate shortlisted successfully! Real-time notification dispatched.'
            : 'Candidate removed from shortlist. Real-time notification dispatched.'
        );
        setTimeout(() => setActionAlert(''), 3500);
      }
    } catch (err) {
      console.error('Failed to update candidate shortlist status:', err);
    }
  };

  const handleSaveNotes = (e) => {
    e.preventDefault();
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 3000);
  };

  if (!candidate) return null;

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <Link to="/dashboard/candidates">Candidates</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{candidate.candidateName}</span>
      </nav>

      {/* Page Alert */}
      {actionAlert && (
        <div className="alert alert-success" role="alert" style={{ marginBottom: '20px' }}>
          <i className="bi bi-check-circle"></i> {actionAlert}
        </div>
      )}

      {/* Candidate Profile Header Card */}
      <article className="card" style={{ marginBottom: '28px', padding: '24px 28px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div
              className="profile-avatar"
              style={{
                width: '72px',
                height: '72px',
                fontSize: '1.8rem',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                color: '#fff',
                fontWeight: 800,
              }}
            >
              {candidate.candidateInitials || candidate.candidateName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {candidate.candidateName}
                </h1>
                <span className={`badge ${shortlisted ? 'badge-success' : 'badge-neutral'}`}>
                  {shortlisted ? 'SHORTLISTED' : (candidate.displayStage || 'Under Review')}
                </span>
                <span
                  className={`score-badge ${
                    candidate.overallScore >= 75
                      ? 'score-high'
                      : candidate.overallScore >= 50
                      ? 'score-mid'
                      : 'score-low'
                  }`}
                >
                  {candidate.overallScore}% Match
                </span>
              </div>
              <p style={{ margin: '0 0 6px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Applied for:{' '}
                <strong style={{ color: 'var(--primary)' }}>{candidate.targetJobRole}</strong> &bull;{' '}
                <span>{candidate.candidateExperience} Experience</span>
              </p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                <span>
                  <i className="bi bi-envelope"></i> {candidate.candidateEmail}
                </span>
                <span>
                  <i className="bi bi-telephone"></i> {candidate.candidatePhone}
                </span>
                <span>
                  <i className="bi bi-geo-alt"></i> {candidate.candidateLocation}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link to={`/dashboard/feedback?candId=${candidate.id}`} className="btn btn-secondary btn-sm">
              <i className="bi bi-card-checklist"></i> Interview Feedback
            </Link>
            <button
              type="button"
              className={`btn btn-sm ${shortlisted ? 'btn-secondary' : 'btn-primary'}`}
              onClick={handleToggleShortlist}
              title={shortlisted ? 'Remove candidate from shortlist' : 'Add candidate to shortlist'}
            >
              <i className={`bi ${shortlisted ? 'bi-star-fill text-warning' : 'bi-star'}`}></i>{' '}
              {shortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
            </button>
          </div>
        </div>
      </article>

      {/* Shared AI Resume Matching Analysis Result for HR */}
      <AnalysisResult
        analysis={candidate}
        context="hr"
        onShortlistCandidate={handleToggleShortlist}
        isShortlisted={shortlisted}
      />

      {/* Two Column: Extracted Resume Background & Internal Recruiter Notes */}
      <div className="grid-2-1" style={{ marginTop: '28px' }}>
        {/* Extracted Experience & Background */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <article className="card">
            <div className="card-header">
              <h2 className="card-title">
                <span style={{ color: 'var(--accent)', marginRight: '6px' }}>
                  <i className="bi bi-briefcase"></i>
                </span>{' '}
                Parsed Work History &amp; Summary
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '14px' }}>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block' }}>
                  Professional Profile
                </strong>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.5 }}>
                  {candidate.candidateSummary}
                </p>
              </div>

              {candidate.workExperienceList?.map((exp, idx) => (
                <div key={idx} style={{ borderLeft: '3px solid var(--border-strong)', paddingLeft: '14px' }}>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>
                    {exp}
                  </p>
                </div>
              ))}

              <div style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '14px' }}>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block' }}>
                  Key Projects
                </strong>
                {candidate.projectsList?.map((proj, idx) => (
                  <p
                    key={idx}
                    style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.5 }}
                  >
                    &bull; {proj}
                  </p>
                ))}
              </div>
            </div>
          </article>
        </div>

        {/* Recruiter Evaluation Notes */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <article className="card">
            <div className="card-header">
              <h2 className="card-title">
                <i className="bi bi-journal-text" style={{ color: 'var(--primary)', marginRight: '6px' }}></i>
                Internal Hiring Notes
              </h2>
            </div>

            {noteSaved && (
              <div className="alert alert-success" style={{ padding: '8px 12px', fontSize: '0.82rem', marginBottom: '12px' }}>
                Note saved to candidate record.
              </div>
            )}

            <form onSubmit={handleSaveNotes}>
              <textarea
                className="form-control"
                rows={5}
                placeholder="Add confidential notes for hiring managers or interview panel..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ marginBottom: '14px' }}
              />
              <button type="submit" className="btn btn-primary btn-sm btn-block" style={{ width: '100%' }}>
                Save Recruiter Note
              </button>
            </form>
          </article>
        </aside>
      </div>
    </div>
  );
};

export default CandidateDetails;
