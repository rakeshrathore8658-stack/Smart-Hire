import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBulkScan } from '../../context/BulkScanContext';

const FloatingBulkScanWidget = () => {
  const {
    isScreening,
    isMinimized,
    progress,
    targetJob,
    restoreScan,
    isSeekerAnalyzing,
    seekerMinimized,
    seekerProgress,
    restoreSeekerAnalysis,
  } = useBulkScan();

  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  // Check which background task is active
  const isHrActive = isScreening && (isMinimized || location.pathname !== '/dashboard/candidates');
  const isSeekerActive = isSeekerAnalyzing && (seekerMinimized || location.pathname !== '/dashboard/resumeanalyzer');

  if (!isHrActive && !isSeekerActive) return null;

  return (
    <div
      className="floating-bulk-scanner-root"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'auto',
      }}
    >
      <style>{`
        @keyframes radarSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(255, 121, 0, 0.55); }
          70% { box-shadow: 0 0 0 14px rgba(255, 121, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 121, 0, 0); }
        }
        @keyframes floatUpDown {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes progressStripes {
          0% { background-position: 0 0; }
          100% { background-position: 30px 0; }
        }
        .floating-bulk-pill:hover {
          transform: scale(1.03) !important;
          box-shadow: 0 14px 32px rgba(255, 121, 0, 0.45) !important;
        }
      `}</style>

      {/* JOB SEEKER SINGLE RESUME ANALYSIS WIDGET */}
      {isSeekerActive && (
        <>
          {isHovered && (
            <div
              onClick={restoreSeekerAnalysis}
              style={{
                marginBottom: '12px',
                width: 'min(360px, calc(100vw - 36px))',
                background: 'var(--bg-card, #1e293b)',
                border: '1.5px solid var(--accent, #ff7900)',
                borderRadius: '16px',
                boxShadow: '0 20px 45px -8px rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                padding: '16px 18px',
                color: 'var(--text-primary, #f8fafc)',
                cursor: 'pointer',
                animation: 'floatUpDown 3s ease-in-out infinite',
                transition: 'all 0.25s ease',
              }}
              title="Click to expand full live analysis"
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'var(--accent-light, rgba(255, 121, 0, 0.15))',
                      color: 'var(--accent, #ff7900)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.95rem',
                    }}
                  >
                    <i className="bi bi-cpu-fill"></i>
                  </span>
                  <div>
                    <strong style={{ fontSize: '0.9rem', display: 'block', lineHeight: 1.2 }}>
                      AI Resume Evaluation
                    </strong>
                    <small style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #94a3b8)' }}>
                      Target: {seekerProgress.targetRole || 'Career Profile'}
                    </small>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.14)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 6px #10b981',
                    }}
                  ></span>
                  ANALYZING
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                    Stage: <strong>{seekerProgress.stepName}</strong>
                  </span>
                  <strong style={{ color: 'var(--accent, #ff7900)', fontWeight: 700 }}>
                    {seekerProgress.percentage}%
                  </strong>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    background: 'var(--border-color, rgba(255, 255, 255, 0.1))',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${seekerProgress.percentage}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #ff7900 0%, #10b981 100%)',
                      backgroundSize: '30px 30px',
                      backgroundImage:
                        'linear-gradient(45deg, rgba(255,255,255,0.18) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.18) 75%, transparent 75%, transparent)',
                      animation: 'progressStripes 1s linear infinite',
                      transition: 'width 0.4s ease',
                      borderRadius: '999px',
                    }}
                  ></div>
                </div>
              </div>

              {/* Details Meta */}
              <div
                style={{
                  background: 'var(--bg-primary, rgba(0, 0, 0, 0.2))',
                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  marginBottom: '10px',
                  fontSize: '0.78rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', overflow: 'hidden' }}>
                  <i className="bi bi-file-earmark-pdf text-danger"></i>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    File: <strong>{seekerProgress.fileName}</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <i className="bi bi-robot text-primary"></i>
                  <span>Engine: {seekerProgress.engineName}</span>
                </div>
              </div>

              {/* Click hint */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--accent, #ff7900)',
                  borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                  paddingTop: '8px',
                }}
              >
                <i className="bi bi-arrows-angle-expand"></i> Click to expand live evaluation view
              </div>
            </div>
          )}

          {/* Floating Action Pill */}
          <button
            type="button"
            onClick={restoreSeekerAnalysis}
            className="floating-bulk-pill"
            style={{
              background: 'var(--bg-card, #1e293b)',
              color: 'var(--text-primary, #f8fafc)',
              border: '2px solid var(--accent, #ff7900)',
              borderRadius: '999px',
              boxShadow: '0 8px 24px rgba(255, 121, 0, 0.35)',
              padding: '8px 16px 8px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              animation: 'pulseGlow 2.2s infinite',
            }}
            title="Resume Evaluation is running in the background. Click to expand."
          >
            {/* Animated Radar Scanner Icon */}
            <span
              style={{
                position: 'relative',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--accent-light, rgba(255, 121, 0, 0.15))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent, #ff7900)',
                fontSize: '1.1rem',
              }}
            >
              <i className="bi bi-cpu-fill"></i>
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '-2px',
                  right: '-2px',
                  bottom: '-2px',
                  borderRadius: '50%',
                  border: '2px dashed var(--accent, #ff7900)',
                  animation: 'radarSpin 4s linear infinite',
                  opacity: 0.85,
                }}
              ></span>
            </span>

            {/* Text and Counter */}
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                  Evaluating Resume...
                </span>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 6px #10b981',
                  }}
                ></span>
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #94a3b8)' }}>
                {seekerProgress.stepName || 'Processing'} ({seekerProgress.percentage}%)
              </span>
            </div>

            <span
              style={{
                marginLeft: '4px',
                color: 'var(--accent, #ff7900)',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <i className="bi bi-chevron-up"></i>
            </span>
          </button>
        </>
      )}

      {/* HR BULK SCAN WIDGET */}
      {isHrActive && !isSeekerActive && (
        <>
          {isHovered && (
            <div
              onClick={restoreScan}
              style={{
                marginBottom: '12px',
                width: 'min(360px, calc(100vw - 36px))',
                background: 'var(--bg-card, #1e293b)',
                border: '1.5px solid var(--accent, #ff7900)',
                borderRadius: '16px',
                boxShadow: '0 20px 45px -8px rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                padding: '16px 18px',
                color: 'var(--text-primary, #f8fafc)',
                cursor: 'pointer',
                animation: 'floatUpDown 3s ease-in-out infinite',
                transition: 'all 0.25s ease',
              }}
              title="Click to expand full screening view"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'var(--accent-light, rgba(255, 121, 0, 0.15))',
                      color: 'var(--accent, #ff7900)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.95rem',
                    }}
                  >
                    <i className="bi bi-cpu-fill"></i>
                  </span>
                  <div>
                    <strong style={{ fontSize: '0.9rem', display: 'block', lineHeight: 1.2 }}>
                      AI Bulk Screening
                    </strong>
                    <small style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #94a3b8)' }}>
                      Target: {targetJob?.title || 'Target Vacancy'}
                    </small>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.14)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 6px #10b981',
                    }}
                  ></span>
                  RUNNING
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>Overall Progress</span>
                  <strong style={{ color: 'var(--accent, #ff7900)', fontWeight: 700 }}>
                    {progress.percentage || 0}%
                  </strong>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    background: 'var(--border-color, rgba(255, 255, 255, 0.1))',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${progress.percentage || 0}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #ff7900 0%, #10b981 100%)',
                      backgroundSize: '30px 30px',
                      backgroundImage:
                        'linear-gradient(45deg, rgba(255,255,255,0.18) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.18) 75%, transparent 75%, transparent)',
                      animation: 'progressStripes 1s linear infinite',
                      transition: 'width 0.4s ease',
                      borderRadius: '999px',
                    }}
                  ></div>
                </div>
              </div>

              {/* Stats Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  background: 'var(--bg-primary, rgba(0, 0, 0, 0.2))',
                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  marginBottom: '12px',
                  textAlign: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #94a3b8)', display: 'block' }}>
                    Completed
                  </span>
                  <strong style={{ fontSize: '1rem', color: '#10b981', fontWeight: 700 }}>
                    {progress.completed || 0}
                  </strong>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', borderRight: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #94a3b8)', display: 'block' }}>
                    Remaining
                  </span>
                  <strong style={{ fontSize: '1rem', color: 'var(--accent, #ff7900)', fontWeight: 700 }}>
                    {progress.remaining !== undefined ? progress.remaining : 0}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #94a3b8)', display: 'block' }}>
                    Total
                  </span>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary, #f8fafc)', fontWeight: 700 }}>
                    {progress.total || 0}
                  </strong>
                </div>
              </div>

              {/* Current File */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.76rem',
                  color: 'var(--text-secondary, #94a3b8)',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  marginBottom: '10px',
                }}
              >
                <i className="bi bi-file-earmark-arrow-up text-primary"></i>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Scanning: <strong>{progress.currentFileName || 'Processing...'}</strong>
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--accent, #ff7900)',
                  borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                  paddingTop: '8px',
                }}
              >
                <i className="bi bi-arrows-angle-expand"></i> Click to expand full screening modal
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={restoreScan}
            className="floating-bulk-pill"
            style={{
              background: 'var(--bg-card, #1e293b)',
              color: 'var(--text-primary, #f8fafc)',
              border: '2px solid var(--accent, #ff7900)',
              borderRadius: '999px',
              boxShadow: '0 8px 24px rgba(255, 121, 0, 0.35)',
              padding: '8px 16px 8px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              animation: 'pulseGlow 2.2s infinite',
            }}
            title="AI Bulk Screening is running in the background. Click to expand."
          >
            <span
              style={{
                position: 'relative',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--accent-light, rgba(255, 121, 0, 0.15))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent, #ff7900)',
                fontSize: '1.1rem',
              }}
            >
              <i className="bi bi-cpu-fill"></i>
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '-2px',
                  right: '-2px',
                  bottom: '-2px',
                  borderRadius: '50%',
                  border: '2px dashed var(--accent, #ff7900)',
                  animation: 'radarSpin 4s linear infinite',
                  opacity: 0.85,
                }}
              ></span>
            </span>

            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                  Screening Resumes
                </span>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 6px #10b981',
                  }}
                ></span>
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #94a3b8)' }}>
                {progress.completed || 0}/{progress.total || 0} Done ({progress.percentage || 0}%)
              </span>
            </div>

            <span
              style={{
                marginLeft: '4px',
                color: 'var(--accent, #ff7900)',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <i className="bi bi-chevron-up"></i>
            </span>
          </button>
        </>
      )}
    </div>
  );
};

export default FloatingBulkScanWidget;
