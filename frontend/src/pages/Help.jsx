import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOnboarding } from '../context/OnboardingContext';

const Help = () => {
  const { restartTour } = useOnboarding();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess(true);
    setSubject('');
    setMessage('');
    setTimeout(() => setSuccess(false), 5000);
  };

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Help &amp; Support</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Help &amp; Knowledge Base</h1>
          <p className="page-subtitle">
            Learn how ATS parsers evaluate resumes, discover optimization tips, and get platform support.
          </p>
        </div>
      </div>

      <div className="grid-2-1">
        {/* Left Column: Frequently Asked Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <article className="card">
            <div className="card-header">
              <h2 className="card-title">
                <span style={{ color: 'var(--info)', marginRight: '6px' }}>
                  <i className="bi bi-question-circle"></i>
                </span>{' '}
                Frequently Asked Questions
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <details
                style={{
                  padding: '14px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                }}
                open
              >
                <summary style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  How does SmartHire calculate the ATS Compatibility score?
                </summary>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '10px 0 0' }}>
                  SmartHire parses your document text using Apache Tika and PDFBox, extracts technical
                  keywords, and validates formatting against standard Applicant Tracking System (ATS)
                  parsing rules. Scores consider skill presence, keyword density, section headers, and
                  experience relevancy.
                </p>
              </details>

              <details
                style={{
                  padding: '14px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                }}
              >
                <summary style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Which file formats and sizes are supported?
                </summary>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '10px 0 0' }}>
                  We support standard PDF (.pdf) and Microsoft Word (.doc, .docx, .txt) files up to 10 MB.
                  Documents should contain selectable text rather than scanned raster images.
                </p>
              </details>

              <details
                style={{
                  padding: '14px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                }}
              >
                <summary style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  How do I improve my resume's keyword match?
                </summary>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '10px 0 0' }}>
                  Visit the <Link to="/dashboard/skillsgap">Skills Gap</Link> page to review missing
                  high-priority skills. Incorporate those technologies naturally into your work
                  accomplishments and project descriptions using measurable metrics.
                </p>
              </details>

              <details
                style={{
                  padding: '14px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                }}
              >
                <summary style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  How does the HR Recruiter workflow work?
                </summary>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '10px 0 0' }}>
                  Recruiters can create job vacancies with specific required and preferred skills, bulk
                  upload resumes, and let the AI compute match scores and side-by-side candidate comparisons
                  to shortlist top talent.
                </p>
              </details>
            </div>
          </article>
        </div>

        {/* Right Column: Interactive Tour & Contact Support Form */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Interactive Guided Tour Card */}
          <article className="card" style={{ border: '1px solid rgba(255, 121, 0, 0.25)', background: 'linear-gradient(180deg, rgba(255, 121, 0, 0.04) 0%, rgba(255, 255, 255, 0) 100%)' }}>
            <div className="card-header" style={{ borderBottomColor: 'rgba(255, 121, 0, 0.15)' }}>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent)' }}>
                  <i className="bi bi-compass-fill"></i>
                </span>
                Interactive Guided Tour
              </h2>
              <p className="card-description">New to SmartHire or want a refresher?</p>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              Launch an interactive, spotlight walkthrough that guides you step-by-step through key workflows tailored to your account.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(255, 121, 0, 0.25)'
              }}
              onClick={() => restartTour()}
            >
              <i className="bi bi-play-circle-fill"></i> Launch Spotlight Walkthrough
            </button>
          </article>

          <article className="card">
            <div className="card-header">
              <h2 className="card-title">
                <span style={{ color: 'var(--accent)', marginRight: '6px' }}>
                  <i className="bi bi-envelope"></i>
                </span>{' '}
                Contact Support
              </h2>
              <p className="card-description">Need assistance with analysis or account?</p>
            </div>

            {success && (
              <div
                className="alert alert-success"
                style={{
                  marginBottom: '14px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                }}
              >
                <i className="bi bi-check-circle-fill" style={{ marginRight: '6px' }}></i> Your message has been
                sent to SmartHire support! We will reply within 24 hours.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Subject
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Issue uploading multi-column resume"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Message
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Describe your question or issue in detail..."
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                style={{ width: '100%', padding: '10px 16px', fontWeight: 700 }}
              >
                <i className="bi bi-send"></i> Send Support Request
              </button>
            </form>
          </article>
        </aside>
      </div>
    </div>
  );
};

export default Help;
