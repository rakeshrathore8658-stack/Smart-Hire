import React, { useState, useEffect } from 'react';

const ResumePreviewModal = ({
  isOpen,
  onClose,
  candidateName = 'Candidate',
  resumeUrl = '',
  resumeFileName = '',
  initialType = 'pdf',
}) => {
  const [viewType, setViewType] = useState(initialType);
  const [loading, setLoading] = useState(true);

  // Sync initialType when modal opens
  useEffect(() => {
    if (isOpen) {
      setViewType(initialType);
      setLoading(true);
      // Prevent body scrolling while modal is open
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, initialType]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !resumeUrl) return null;

  const isPdf = resumeUrl.toLowerCase().includes('.pdf');
  const jpgUrl = isPdf ? resumeUrl.replace(/\.pdf(\?.*)?$/i, '.jpg') : resumeUrl;
  const currentUrl = viewType === 'jpg' ? jpgUrl : resumeUrl;

  return (
    <div
      className="resume-preview-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        className="resume-preview-container"
        style={{
          width: '100%',
          maxWidth: '1100px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card, #ffffff)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          animation: 'scaleIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: 'var(--bg-surface, #ffffff)',
            flexWrap: 'wrap',
          }}
        >
          {/* Left: Candidate Info & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--primary, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.15rem',
              }}
            >
              <i className={viewType === 'jpg' ? 'bi bi-image' : 'bi bi-file-earmark-pdf-fill'}></i>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {candidateName}'s Resume
                </h4>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'var(--bg-secondary, #f1f5f9)',
                    color: 'var(--text-secondary, #64748b)',
                  }}
                >
                  {viewType === 'jpg' ? 'Page 1 (JPG)' : 'Cloud PDF'}
                </span>
              </div>
              <small style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Viewing directly in current tab &bull; Cloudinary Hosted
              </small>
            </div>
          </div>

          {/* Center: Switch Between Full PDF & JPG Render (if PDF exists) */}
          {isPdf && (
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-secondary, #f1f5f9)',
                borderRadius: '8px',
                padding: '3px',
                gap: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setViewType('pdf');
                  setLoading(true);
                }}
                className={`btn btn-sm ${viewType === 'pdf' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  fontSize: '0.78rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: viewType === 'pdf' ? 600 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <i className="bi bi-file-earmark-pdf"></i> Cloud PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewType('jpg');
                  setLoading(true);
                }}
                className={`btn btn-sm ${viewType === 'jpg' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  fontSize: '0.78rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: viewType === 'jpg' ? 600 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <i className="bi bi-eye"></i> Preview JPG
              </button>
            </div>
          )}

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href={currentUrl}
              download={resumeFileName || `${candidateName}_Resume.${viewType === 'jpg' ? 'jpg' : 'pdf'}`}
              className="btn btn-sm btn-outline-secondary"
              title="Download File"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', padding: '5px 10px' }}
            >
              <i className="bi bi-download"></i> Download
            </a>
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline-secondary"
              title="Open in new window / tab"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', padding: '5px 10px' }}
            >
              <i className="bi bi-box-arrow-up-right"></i> External
            </a>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={onClose}
              title="Close Preview (Esc)"
              style={{
                width: '32px',
                height: '32px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        {/* Viewer Body Area */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: viewType === 'jpg' ? '#1e293b' : '#334155',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(15, 23, 42, 0.65)',
                color: '#ffffff',
                gap: '12px',
              }}
            >
              <div className="spinner-border text-primary" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
                <span className="visually-hidden">Loading resume...</span>
              </div>
              <span style={{ fontSize: '0.86rem', fontWeight: 500, letterSpacing: '0.3px' }}>
                Rendering {viewType === 'jpg' ? 'Page 1 Preview' : 'Cloud PDF'} in current tab...
              </span>
            </div>
          )}

          {viewType === 'jpg' ? (
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={jpgUrl}
                alt={`${candidateName} Resume Preview`}
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
                style={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
                  background: '#ffffff',
                }}
              />
            </div>
          ) : (
            <iframe
              src={resumeUrl}
              title={`${candidateName} Cloud Resume`}
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#ffffff',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumePreviewModal;
