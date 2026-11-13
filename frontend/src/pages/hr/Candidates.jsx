import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import CustomSelect from '../../components/common/CustomSelect';
import ConfirmPopover from '../../components/common/ConfirmPopover';
import EmptyState from '../../components/common/EmptyState';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useBulkScan } from '../../context/BulkScanContext';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const Candidates = () => {
  const { user } = useAuth();
  const { fetchNotifications } = useNotifications();
  const {
    isScreening,
    isMinimized,
    modalOpen,
    setModalOpen,
    batchFinished,
    progress,
    selectedFiles,
    setSelectedFiles,
    associatedJobId,
    setAssociatedJobId,
    aiProvider,
    setAiProvider,
    aiModel,
    setAiModel,
    geminiModel,
    setGeminiModel,
    geminiKey,
    setGeminiKey,
    duplicateAlert,
    setDuplicateAlert,
    startBatchScreening,
    minimizeScan,
    restoreScan,
    resetBatchModal,
  } = useBulkScan();

  const [candidates, setCandidates] = useState([]);
  const [dbJobs, setDbJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedScore, setSelectedScore] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [appsRes, jobsRes] = await Promise.allSettled([
        api.get('/dashboard/applications'),
        api.get('/jobs'),
      ]);

      if (appsRes.status === 'fulfilled') {
        const list = Array.isArray(appsRes.value?.data)
          ? appsRes.value.data
          : appsRes.value?.data?.applications || [];
        setCandidates(list);
      }

      if (jobsRes.status === 'fulfilled') {
        const list = jobsRes.value.data?.jobs || (Array.isArray(jobsRes.value.data) ? jobsRes.value.data : []);
        setDbJobs(list);
        if (list.length > 0 && !associatedJobId) {
          setAssociatedJobId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
    }
  }, [associatedJobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time synchronization without manual refresh
  useRealtimeSync(fetchData);

  // Auto-refresh candidate pool when background bulk scan finishes
  useEffect(() => {
    const handleScanDone = () => {
      fetchData();
    };
    window.addEventListener('smarthire:bulk-scan-complete', handleScanDone);
    return () => window.removeEventListener('smarthire:bulk-scan-complete', handleScanDone);
  }, [fetchData]);

  const filterRoles = [
    { value: '', label: 'All Applied Jobs' },
    ...Array.from(
      new Set([
        ...dbJobs.map((j) => j.title),
        ...candidates.map((c) => c.targetJobRole).filter(Boolean),
      ])
    ).map((r) => ({ value: r, label: r })),
  ];

  const scoreOptions = [
    { value: '', label: 'All Match Scores', icon: <i className="bi bi-filter"></i> },
    { value: 'high', label: 'Top Match (85%+)', badge: '85%+', icon: <i className="bi bi-award-fill text-success"></i> },
    { value: 'mid', label: 'Moderate Match (65-84%)', badge: '65-84%', icon: <i className="bi bi-shield-check text-warning"></i> },
    { value: 'low', label: 'Low Match (<65%)', badge: '<65%', icon: <i className="bi bi-exclamation-circle text-danger"></i> },
  ];

  const toggleShortlist = async (id, e) => {
    e?.stopPropagation();
    try {
      const res = await api.post(`/dashboard/candidates/${id}/shortlist`);
      const updatedShortlisted = res.data?.shortlisted;
      setCandidates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, shortlisted: updatedShortlisted ?? !c.shortlisted } : c))
      );
      setActionSuccess('Candidate shortlist status updated.');
      setTimeout(() => setActionSuccess(''), 2500);
    } catch (err) {
      setCandidates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, shortlisted: !c.shortlisted } : c))
      );
    }
  };

  // Handle Multi-file Drop & Selection with Smart Deduplication
  const handleFilesAdded = (filesList) => {
    if (!filesList || filesList.length === 0) return;
    const valid = Array.from(filesList).filter((f) => {
      const ext = f.name.toLowerCase();
      return (
        ext.endsWith('.pdf') ||
        ext.endsWith('.docx') ||
        ext.endsWith('.doc') ||
        ext.endsWith('.txt')
      );
    });

    let dupCount = 0;
    setSelectedFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name.toLowerCase()}_${f.size}`));
      const nonDuplicates = [];

      for (const file of valid) {
        const key = `${file.name.toLowerCase()}_${file.size}`;
        if (existingKeys.has(key)) {
          dupCount++;
        } else {
          existingKeys.add(key);
          nonDuplicates.push(file);
        }
      }

      if (dupCount > 0) {
        setDuplicateAlert(`${dupCount} duplicate file(s) omitted to prevent redundant processing.`);
        setTimeout(() => setDuplicateAlert(''), 6000);
      }

      return [...prev, ...nonDuplicates];
    });
  };

  const handleRemoveFile = (index, e) => {
    e?.stopPropagation();
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleClearAllFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeDeleteCandidate = async (id, name) => {
    try {
      const res = await api.delete(`/dashboard/candidates/${id}`);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setActionSuccess(res.data?.message || `Candidate "${name || 'Candidate'}" removed successfully from database.`);
      setTimeout(() => setActionSuccess(''), 4500);
    } catch (err) {
      console.error('Delete candidate failed via dashboard endpoint:', err);
      try {
        const res = await api.delete(`/analysis/${id}`);
        setCandidates((prev) => prev.filter((c) => c.id !== id));
        setActionSuccess(res.data?.message || `Candidate "${name || 'Candidate'}" removed successfully.`);
        setTimeout(() => setActionSuccess(''), 4500);
      } catch (fallbackErr) {
        console.error('Delete fallback failed:', fallbackErr);
        setActionSuccess(fallbackErr.response?.data?.message || err.response?.data?.message || 'Failed to delete candidate.');
        setTimeout(() => setActionSuccess(''), 4500);
      }
    }
  };

  // Trigger background batch AI screening via global BulkScanContext
  const handleStartBatchScreening = () => {
    if (selectedFiles.length === 0) return;

    const targetJob = dbJobs.find((j) => String(j.id) === String(associatedJobId)) || dbJobs[0];
    const effectiveModel = aiProvider === 'gemini'
      ? (geminiModel || 'gemini-2.5-flash')
      : (aiProvider === 'ollama' ? (aiModel || 'qwen3:4b') : null);

    startBatchScreening({
      files: selectedFiles,
      job: targetJob,
      provider: aiProvider,
      model: effectiveModel,
      geminiApiKey: aiProvider === 'gemini' ? geminiKey : null,
    });
  };

  const filtered = candidates.filter((item) => {
    const text = `${item.candidateName || ''} ${item.candidateEmail || ''} ${(item.keySkills || []).join(' ')}`.toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase().trim());
    const matchesRole = !selectedRole || item.targetJobRole?.toLowerCase().includes(selectedRole.toLowerCase());
    const score = item.overallScore || 0;
    let matchesScore = true;
    if (selectedScore === 'high') matchesScore = score >= 85;
    else if (selectedScore === 'mid') matchesScore = score >= 65 && score < 85;
    else if (selectedScore === 'low') matchesScore = score < 65;

    return matchesSearch && matchesRole && matchesScore;
  });

  const shortlistedCount = candidates.filter((c) => c.shortlisted).length;
  const targetJobObj = dbJobs.find((j) => String(j.id) === String(associatedJobId)) || dbJobs[0];

  return (
    <div className="fade-in">
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Candidate Pool</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Candidate Management &amp; Screening</h1>
          <p className="page-subtitle">
            Review AI-screened candidate profiles, match scores, and parsed resume credentials.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            id="btnOpenBulkUpload"
            data-tour="bulk-upload-btn"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.preventDefault();
              setModalOpen(true);
              setIsMinimized(false);
            }}
          >
            <i className="bi bi-cloud-arrow-up"></i> Bulk Upload Resumes
            {isScreening && (
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  display: 'inline-block',
                  marginLeft: '8px',
                  animation: 'pulse 1.2s infinite',
                }}
              ></span>
            )}
          </button>
          <Link className="btn btn-secondary" to="/dashboard/candidates/archived" id="btnArchivedCandidates" title="View recently deleted and archived candidates">
            <i className="bi bi-archive"></i> Recently Deleted / Archived
          </Link>
          <Link className="btn btn-primary" to="/dashboard/shortlist">
            <i className="bi bi-star"></i> Shortlisted ({shortlistedCount})
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <div className="alert alert-success" role="alert" style={{ marginBottom: '16px' }}>
          <i className="bi bi-check-circle"></i> {actionSuccess}
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <article className="card" data-tour="candidates-search-card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 280px', minWidth: 'min(260px, 100%)', position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            >
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search candidates by name, email, or extracted skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: '1 1 auto' }}>
            <div style={{ minWidth: 'min(180px, 100%)', flex: '1 1 180px' }}>
              <CustomSelect
                value={selectedRole}
                onChange={(val) => setSelectedRole(val)}
                options={filterRoles}
                placeholder="All Applied Jobs"
              />
            </div>

            <div style={{ minWidth: 'min(180px, 100%)', flex: '1 1 180px' }}>
              <CustomSelect
                value={selectedScore}
                onChange={(val) => setSelectedScore(val)}
                options={scoreOptions}
                placeholder="All Match Scores"
              />
            </div>
          </div>
        </div>
      </article>

      {/* Candidate Pool Table */}
      <article className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px' }}>
            <SkeletonLoader count={5} type="row" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="table-responsive" data-tour="candidates-table">
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <i className="bi bi-star"></i>
                  </th>
                  <th>Candidate</th>
                  <th>Target Job Role</th>
                  <th>Match Score</th>
                  <th>Experience</th>
                  <th>Key Skills Evidenced</th>
                  <th>Pipeline Stage</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cand) => (
                  <tr key={cand.id}>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px', color: cand.shortlisted ? '#f59e0b' : 'var(--text-muted)' }}
                        onClick={(e) => toggleShortlist(cand.id, e)}
                        title={cand.shortlisted ? 'Remove from shortlist' : 'Shortlist candidate'}
                      >
                        <i className={`bi ${cand.shortlisted ? 'bi-star-fill' : 'bi-star'}`}></i>
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                          }}
                        >
                          {(cand.candidateName || 'C')
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {cand.candidateName || 'Unnamed Candidate'}
                          </strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {cand.candidateEmail || 'No email provided'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {(cand.targetJobRole || 'Software Professional').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          color:
                            cand.overallScore >= 80
                              ? '#10b981'
                              : cand.overallScore >= 65
                              ? 'var(--accent)'
                              : '#ef4444',
                          background:
                            cand.overallScore >= 80
                              ? 'rgba(16, 185, 129, 0.12)'
                              : cand.overallScore >= 65
                              ? 'var(--accent-light)'
                              : 'rgba(239, 68, 68, 0.12)',
                        }}
                      >
                        {cand.overallScore || 0}%
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {cand.totalExperience || cand.experience || 'Entry Level'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(cand.keySkills || cand.matchedSkills || []).slice(0, 3).map((skill, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {typeof skill === 'string' ? skill : skill.skill || 'Skill'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      >
                        {cand.displayStage || cand.stage || 'Under Review'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <Link to={`/dashboard/candidates/${cand.id}`} className="btn btn-secondary btn-sm">
                          View Profile
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)', padding: '4px 8px' }}
                          title="Delete Candidate Record"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteConfirm({
                              anchorEl: e.currentTarget,
                              id: cand.id,
                              name: cand.candidateName || 'Candidate',
                            });
                          }}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="bi-people"
            title="No Candidates Found"
            description={
              searchQuery || selectedRole || selectedScore
                ? 'No candidates match your current filter criteria. Try resetting filters.'
                : 'No resumes have been screened yet. Upload candidates to populate the database.'
            }
            actionLabel={searchQuery || selectedRole || selectedScore ? 'Clear Filters' : 'Bulk Upload Resumes'}
            onAction={
              searchQuery || selectedRole || selectedScore
                ? () => {
                    setSearchQuery('');
                    setSelectedRole('');
                    setSelectedScore('');
                  }
                : () => setModalOpen(true)
            }
          />
        )}
      </article>

      {/* BULK UPLOAD & LIVE AI SCREENING MODAL */}
      {modalOpen && (
        <div
          className="modal-overlay is-open modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
          }}
          onClick={() => {
            if (!isScreening) resetBatchModal();
          }}
        >
          <div
            className="modal-dialog card"
            style={{
              maxWidth: isScreening || batchFinished ? '680px' : '580px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: 'var(--bg-primary)',
              padding: 'clamp(14px, 3vw, 24px)',
              transition: 'all 0.3s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              @keyframes scanLaser {
                0% { top: 0%; opacity: 0.8; box-shadow: 0 0 10px #ff7900; }
                50% { top: 88%; opacity: 1; box-shadow: 0 0 16px #10b981; }
                100% { top: 0%; opacity: 0.8; box-shadow: 0 0 10px #ff7900; }
              }
              @keyframes sonarPulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 121, 0, 0.4); }
                70% { transform: scale(1.02); box-shadow: 0 0 0 12px rgba(255, 121, 0, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 121, 0, 0); }
              }
              @keyframes progressStripes {
                0% { background-position: 0 0; }
                100% { background-position: 36px 0; }
              }
              @keyframes pipelineStepPulse {
                0%, 100% { transform: scale(1); opacity: 0.85; }
                50% { transform: scale(1.05); opacity: 1; }
              }
              @keyframes cardSlideIn {
                from { opacity: 0; transform: translateY(14px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--accent-light)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                  }}
                >
                  <i className="bi bi-cloud-arrow-up-fill"></i>
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                    {isScreening
                      ? 'AI Batch Screening in Progress'
                      : batchFinished
                      ? 'Batch Screening Completed'
                      : 'Bulk Upload Candidate Resumes'}
                  </h3>
                  <small style={{ color: 'var(--text-secondary)' }}>
                    Target Vacancy: <strong>{targetJobObj?.title || 'Selected Job'}</strong>
                  </small>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {isScreening && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => minimizeScan()}
                    title="Minimize and run in background"
                  >
                    <i className="bi bi-dash-lg"></i> Minimize
                  </button>
                )}
                {!isScreening && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={resetBatchModal}
                    style={{ fontSize: '1.2rem', cursor: 'pointer' }}
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>

            {/* SCREEN 1: FILE SELECTION & CONFIGURATION (Before upload) */}
            {!isScreening && !batchFinished && (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
                  Select multiple candidate resumes (PDF, DOCX, TXT). The system will automatically parse candidate
                  credentials, extract technical skills, and calculate ATS match scores against the selected vacancy.
                </p>

                {/* Job Vacancy Selector */}
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Associate to Vacancy <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <CustomSelect
                    value={associatedJobId}
                    onChange={(val) => setAssociatedJobId(val)}
                    options={dbJobs.map((j) => ({
                      value: j.id,
                      label: `${j.title} (${j.department || 'Tech'}) - ${j.openings || 1} open`,
                    }))}
                    placeholder="Select Target Vacancy..."
                  />
                </div>

                {/* STRICT LOCAL AI MODEL SELECTION */}
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      Local AI Screening Engine
                    </label>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.12)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <i className="bi bi-shield-lock-fill"></i> 100% Offline &amp; Deep Local Analysis
                    </span>
                  </div>

                  <CustomSelect
                    value={aiProvider}
                    onChange={(val) => setAiProvider(val)}
                    options={[
                      {
                        value: 'local',
                        label: 'Local High-Precision NLP Engine (Deep ATS Scoring, Fast & Deterministic)',
                        badge: 'Fast & Offline',
                        icon: <i className="bi bi-cpu-fill text-primary"></i>,
                      },
                      {
                        value: 'gemini',
                        label: 'Google Gemini AI (High-Accuracy Neural Cloud Evaluation & Deep ATS Insights)',
                        badge: 'Server Key',
                        icon: <i className="bi bi-stars text-info"></i>,
                      },
                      {
                        value: 'ollama',
                        label: 'Local Ollama Deep LLM (Generative Neural ATS Reasoning & Extraction)',
                        badge: 'Local Neural',
                        icon: <i className="bi bi-robot text-accent"></i>,
                      },
                    ]}
                  />

                  {/* Gemini Server Environment confirmation banner (API Key input removed) */}
                  {aiProvider === 'gemini' && (
                    <div
                      style={{
                        marginTop: '10px',
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <i className="bi bi-shield-check text-success" style={{ fontSize: '1.1rem' }}></i>
                      <span>
                        Gemini AI screening is enabled using the server-configured environment API key.
                      </span>
                    </div>
                  )}

                  {/* Model variant selector if Ollama is selected */}
                  {aiProvider === 'ollama' && (
                    <div style={{ marginTop: '10px' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                        Local Ollama Model Variant:
                      </label>
                      <CustomSelect
                        value={aiModel}
                        onChange={(val) => setAiModel(val)}
                        options={[
                          {
                            value: 'qwen3:4b',
                            label: 'qwen3:4b (Installed - 4B High-Speed Reasoning Model)',
                            icon: <i className="bi bi-hdd-network"></i>,
                          },
                          {
                            value: 'codellama:latest',
                            label: 'codellama:latest (Installed - 7B Deep Technical Code & Resume Model)',
                            icon: <i className="bi bi-code-slash"></i>,
                          },
                        ]}
                      />
                    </div>
                  )}

                  {/* Enterprise Privacy & Zero-Quota Notice */}
                  <div
                    style={{
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      marginTop: '10px',
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <i className="bi bi-shield-check text-primary" style={{ fontSize: '1rem' }}></i>
                    <span>
                      Bulk screening runs with automated batch parsing, extracting candidate credentials and scoring ATS relevance against the target role.
                    </span>
                  </div>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  accept=".pdf,.doc,.docx,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    handleFilesAdded(e.target.files);
                  }}
                />

                {/* Duplicate Alert Banner */}
                {duplicateAlert && (
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      color: '#d97706',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      marginBottom: '14px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      animation: 'fadeIn 0.3s ease',
                    }}
                  >
                    <i className="bi bi-shield-exclamation text-warning" style={{ fontSize: '1.1rem' }}></i>
                    <span>{duplicateAlert}</span>
                  </div>
                )}

                {/* Drag & Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFilesAdded(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: isDragging ? '2px dashed var(--accent)' : '2px dashed var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    padding: '28px 20px',
                    textAlign: 'center',
                    marginBottom: '18px',
                    background: isDragging ? 'var(--accent-light)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <i
                    className="bi bi-cloud-arrow-up"
                    style={{ fontSize: '2.4rem', color: 'var(--accent)', display: 'block', marginBottom: '8px' }}
                  ></i>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>
                    Drag &amp; drop multiple resumes here, or{' '}
                    <span style={{ color: 'var(--accent)', textDecoration: 'underline' }}>browse</span>
                  </strong>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Supports bulk PDF, DOCX, DOC &amp; TXT files (Max 15MB per file)
                  </p>
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        Selected Resumes ({selectedFiles.length})
                      </strong>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleClearAllFiles}
                        style={{ color: 'var(--danger)', fontSize: '0.78rem', padding: '2px 8px' }}
                      >
                        Clear All
                      </button>
                    </div>

                    <div
                      style={{
                        maxHeight: '160px',
                        overflowY: 'auto',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-secondary)',
                        padding: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      {selectedFiles.map((f, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--bg-card)',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '0.82rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            <i className="bi bi-file-earmark-pdf-fill" style={{ color: 'var(--accent)' }}></i>
                            <span
                              style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: 'min(320px, 45vw)',
                              }}
                            >
                              {f.name}
                            </span>
                            <small style={{ color: 'var(--text-muted)' }}>
                              ({(f.size / 1024).toFixed(0)} KB)
                            </small>
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => handleRemoveFile(idx, e)}
                            style={{ color: 'var(--danger)', padding: '0 4px', fontSize: '0.9rem' }}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={resetBatchModal}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={selectedFiles.length === 0}
                    onClick={handleStartBatchScreening}
                    style={{ fontWeight: 700 }}
                  >
                    <i className="bi bi-cpu"></i> Upload &amp; Screen ({selectedFiles.length} Resumes)
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 2: LIVE BATCH SCREENING IN PROGRESS (HR Live Monitor with High-Tech Laser Scanning Animation) */}
            {isScreening && (
              <div>
                {/* Visual Progress & Holographic Laser Scanning Console */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    border: '1px solid var(--border-color)',
                    marginBottom: '20px',
                  }}
                >
                  {/* Top Row: Scanner Preview + File Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {/* High-Tech Animated Document Scanner Icon */}
                    <div
                      style={{
                        position: 'relative',
                        width: '64px',
                        height: '76px',
                        background: 'var(--bg-card)',
                        border: '2px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '10px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        overflow: 'hidden',
                        animation: 'sonarPulse 2.5s infinite',
                        flexShrink: 0,
                      }}
                    >
                      {/* Laser Beam sweeping up and down */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: '3px',
                          background: 'linear-gradient(90deg, transparent, #ff7900, #10b981, transparent)',
                          boxShadow: '0 0 10px #ff7900',
                          animation: 'scanLaser 2s ease-in-out infinite',
                          zIndex: 2,
                        }}
                      ></div>
                      {/* Simulated Resume Text Skeleton Lines */}
                      <div style={{ width: '60%', height: '4px', background: 'var(--border-strong)', borderRadius: '2px' }}></div>
                      <div style={{ width: '90%', height: '3px', background: 'var(--border-color)', borderRadius: '2px' }}></div>
                      <div style={{ width: '80%', height: '3px', background: 'var(--border-color)', borderRadius: '2px' }}></div>
                      <div style={{ width: '70%', height: '3px', background: 'var(--border-color)', borderRadius: '2px' }}></div>
                      <div style={{ width: '85%', height: '3px', background: 'var(--border-color)', borderRadius: '2px' }}></div>
                    </div>

                    {/* Scanning Text Details */}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#ff7900',
                              display: 'inline-block',
                              boxShadow: '0 0 8px #ff7900',
                              animation: 'pulse 1s infinite',
                            }}
                          ></span>
                          AI Screening Resume {progress.current} of {progress.total}
                        </span>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent)' }}>
                          {progress.percentage}%
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginBottom: '3px',
                        }}
                      >
                        Active File: <strong style={{ color: 'var(--text-primary)' }}>{progress.currentFileName}</strong>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Target Vacancy: <strong>{targetJobObj?.title || 'Selected Vacancy'}</strong> • Engine: <strong>{aiProvider === 'gemini' ? `Google Gemini (${geminiModel})` : (aiProvider === 'ollama' ? `Local Ollama (${aiModel})` : 'Local Deep NLP')}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Animated Striped Laser Progress Bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '10px',
                      background: 'var(--border-color)',
                      borderRadius: '5px',
                      overflow: 'hidden',
                      marginBottom: '14px',
                    }}
                  >
                    <div
                      style={{
                        width: `${progress.percentage}%`,
                        height: '100%',
                        background: 'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent), linear-gradient(90deg, #ff7900 0%, #10b981 100%)',
                        backgroundSize: '28px 28px, 100% 100%',
                        animation: 'progressStripes 1s linear infinite',
                        transition: 'width 0.4s ease',
                      }}
                    ></div>
                  </div>

                  {/* Multi-Stage Processing Pipeline Indicators */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                      gap: '8px',
                      padding: '10px 12px',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      marginBottom: '14px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', animation: 'pipelineStepPulse 2.5s infinite' }}>
                      <i className="bi bi-file-earmark-text text-primary" style={{ display: 'block', fontSize: '1.1rem', marginBottom: '2px' }}></i>
                      <span>1. OCR &amp; Text</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', animation: 'pipelineStepPulse 2.5s infinite' }}>
                      <i className="bi bi-code-slash text-warning" style={{ display: 'block', fontSize: '1.1rem', marginBottom: '2px' }}></i>
                      <span>2. Skills &amp; Gaps</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', animation: 'pipelineStepPulse 2.5s infinite' }}>
                      <i className="bi bi-cpu-fill text-accent" style={{ display: 'block', fontSize: '1.1rem', marginBottom: '2px' }}></i>
                      <span>3. Local ATS AI</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', animation: 'pipelineStepPulse 2.5s infinite' }}>
                      <i className="bi bi-database-fill-check text-success" style={{ display: 'block', fontSize: '1.1rem', marginBottom: '2px' }}></i>
                      <span>4. Resumes Table</span>
                    </div>
                  </div>

                  {/* Status Badges: Analyzed vs Remaining vs Deduplicated */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        padding: '6px 14px',
                      }}
                    >
                      <i className="bi bi-check-circle-fill"></i> {progress.completed} Analyzed &amp; Saved
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#f59e0b',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        padding: '6px 14px',
                      }}
                    >
                      <i className="bi bi-hourglass-split"></i> {progress.remaining} Remaining
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(59, 130, 246, 0.12)',
                        color: 'var(--primary)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        padding: '6px 14px',
                      }}
                    >
                      <i className="bi bi-shield-check"></i> Deduplicated
                    </span>
                  </div>
                </div>

                {/* Live Real-time Stream of Processed Candidates */}
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--text-primary)' }}>
                    Live Processed Stream ({progress.results.length}/{progress.total})
                  </h4>
                  <div
                    style={{
                      maxHeight: '220px',
                      overflowY: 'auto',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {progress.results.map((res, i) => (
                      <div
                        key={i}
                        style={{
                          background: 'var(--bg-card)',
                          borderRadius: '6px',
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          border: '1px solid var(--border-color)',
                          animation: 'fadeIn 0.3s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              color: res.status === 'success' ? '#10b981' : '#ef4444',
                              fontSize: '1.1rem',
                            }}
                          >
                            <i
                              className={
                                res.status === 'success'
                                  ? 'bi bi-check-circle-fill'
                                  : 'bi bi-exclamation-circle-fill'
                              }
                            ></i>
                          </span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                {res.candidateName}
                              </strong>
                              {res.providerUsed && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  {res.providerUsed}
                                </span>
                              )}
                            </div>
                            <small style={{ color: 'var(--text-muted)', display: 'block' }}>{res.fileName}</small>
                            {res.skills && res.skills.length > 0 && (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                {res.skills.slice(0, 3).map((sk, sIdx) => (
                                  <span
                                    key={sIdx}
                                    style={{
                                      fontSize: '0.68rem',
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      background: 'rgba(59, 130, 246, 0.08)',
                                      color: 'var(--text-secondary)',
                                      border: '1px solid rgba(59, 130, 246, 0.15)',
                                    }}
                                  >
                                    {typeof sk === 'string' ? sk : sk.skill || 'Skill'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {res.status === 'success' ? (
                          <span
                            className="badge"
                            style={{
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              color:
                                res.score >= 75
                                  ? '#10b981'
                                  : res.score >= 55
                                  ? 'var(--accent)'
                                  : '#ef4444',
                              background:
                                res.score >= 75
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : res.score >= 55
                                  ? 'var(--accent-light)'
                                  : 'rgba(239, 68, 68, 0.15)',
                            }}
                          >
                            {res.score}% {res.matchLevel}
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>
                            Failed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 3: BATCH SCREENING COMPLETED */}
            {batchFinished && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontSize: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <i className="bi bi-check-lg"></i>
                </div>

                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                  Batch Screening Completed!
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0 0 20px' }}>
                  Successfully processed and evaluated <strong>{progress.completed}</strong> of{' '}
                  <strong>{progress.total}</strong> candidate resumes for vacancy{' '}
                  <strong>{targetJobObj?.title || 'Selected Vacancy'}</strong>.
                </p>

                {/* Recruiter Notification Confirmation Banner */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 18px',
                    textAlign: 'left',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <span style={{ fontSize: '1.4rem', color: 'var(--accent)' }}>
                    <i className="bi bi-bell-fill"></i>
                  </span>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block' }}>
                      HR Recruiter Notification Dispatched
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      A real-time notification has been sent to <strong>{user?.email || 'your account'}</strong>. Your
                      notification bell indicator has been updated.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={resetBatchModal}
                  style={{ padding: '12px', fontWeight: 700, width: '100%', fontSize: '0.95rem' }}
                >
                  <i className="bi bi-people-fill"></i> View All Candidates in Pool
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Popover Action Confirmation (Replaces native browser window.confirm) */}
      {deleteConfirm && (
        <ConfirmPopover
          anchorEl={deleteConfirm.anchorEl}
          title="Delete Candidate?"
          message={`Are you sure you want to permanently delete "${deleteConfirm.name}" and their resume from the database?`}
          confirmText="Delete"
          cancelText="Cancel"
          danger={true}
          onConfirm={() => {
            executeDeleteCandidate(deleteConfirm.id, deleteConfirm.name);
            setDeleteConfirm(null);
          }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

export default Candidates;
