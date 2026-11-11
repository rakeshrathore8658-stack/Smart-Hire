import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import AnalysisResult from '../../components/common/AnalysisResult';

const ResumeAnalyzer = () => {
  const [searchParams] = useSearchParams();
  const analysisId = searchParams.get('id');
  const roleParam = searchParams.get('role');

  const [file, setFile] = useState(null);
  const [targetRole, setTargetRole] = useState(roleParam || 'Java Developer');
  const [customRole, setCustomRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  
  // AI Provider & Model States
  const [aiProvider, setAiProvider] = useState('ollama');
  const [selectedModel, setSelectedModel] = useState('codellama:latest');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [providers, setProviders] = useState([
    {
      id: 'ollama',
      name: 'Local Ollama LLM',
      available: true,
      status: 'AVAILABLE',
      installedModels: ['codellama:latest'],
      recommendedModel: 'codellama:latest',
      description: 'Zero network dependency, private local inference on your GPU/CPU.',
    },
    {
      id: 'local',
      name: 'Smart Rule-Based NLP Engine',
      available: true,
      status: 'AVAILABLE',
      installedModels: ['local-nlp-v2'],
      recommendedModel: 'local-nlp-v2',
      description: 'Deterministic offline skill taxonomy, regex, and keyword scoring.',
    },
    {
      id: 'gemini',
      name: 'Google Gemini AI',
      available: false,
      status: 'DEGRADED',
      installedModels: ['auto'],
      recommendedModel: 'auto',
      description: 'Deep ATS reasoning, resume rewriting, and semantic analysis with automatic multi-model failover.',
    },
  ]);

  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [dbJobs, setDbJobs] = useState([]);

  const fileInputRef = useRef(null);

  // Fetch AI providers status dynamically
  useEffect(() => {
    let isMounted = true;
    const fetchProviders = async () => {
      try {
        const res = await api.get('/ai/providers');
        const rawList = res.data?.providers || (Array.isArray(res.data) ? res.data : []);
        if (isMounted && rawList.length > 0) {
          const formatted = rawList.map((p) => ({
            ...p,
            installedModels: p.models || p.installedModels || [],
            recommendedModel: p.defaultModel || p.recommendedModel || (p.models && p.models[0]),
            description: p.statusMessage || p.description,
          }));
          setProviders(formatted);

          // Default to Ollama if connected and has models, else local
          const ollamaProv = formatted.find((p) => p.id === 'ollama');
          if (ollamaProv && ollamaProv.available && ollamaProv.installedModels.length > 0) {
            setAiProvider('ollama');
            setSelectedModel(ollamaProv.recommendedModel || ollamaProv.installedModels[0]);
          } else {
            const geminiProv = formatted.find((p) => p.id === 'gemini');
            if (geminiProv && geminiProv.available) {
              setAiProvider('gemini');
              setSelectedModel('auto');
            } else {
              setAiProvider('local');
              setSelectedModel('Rule-Based Local Engine v2.0');
            }
          }
        }
      } catch (err) {
        // Fallback to initial state
      }
    };
    fetchProviders();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync selectedModel whenever aiProvider changes
  useEffect(() => {
    const activeProv = providers.find((p) => p.id === aiProvider);
    if (activeProv) {
      if (activeProv.installedModels && activeProv.installedModels.length > 0) {
        setSelectedModel(activeProv.installedModels[0]);
      } else if (activeProv.recommendedModel) {
        setSelectedModel(activeProv.recommendedModel);
      }
    }
  }, [aiProvider, providers]);

  // Fetch active database jobs
  useEffect(() => {
    let isMounted = true;
    const fetchJobs = async () => {
      try {
        const res = await api.get('/jobs');
        const list = res.data?.jobs || (Array.isArray(res.data) ? res.data : []);
        if (isMounted && list.length > 0) {
          setDbJobs(list);
          if (roleParam) {
            const matched = list.find((j) => j.title.toLowerCase() === roleParam.toLowerCase());
            if (matched) {
              setTargetRole(matched.title);
              if (matched.description) setJobDescription(matched.description);
            }
          }
        }
      } catch (err) {
        // graceful fallback
      }
    };
    fetchJobs();
    return () => {
      isMounted = false;
    };
  }, [roleParam]);

  // If ?id=XX is passed, fetch the analysis details
  useEffect(() => {
    if (analysisId) {
      const loadAnalysis = async () => {
        try {
          const res = await api.get(`/analysis/${analysisId}`);
          if (res.data && (res.data.analysis || res.data.id)) {
            const data = res.data.analysis || res.data;
            setAnalysis(data);
            if (data.targetJobRole) setTargetRole(data.targetJobRole);
          }
        } catch (err) {
          setErrorMessage('Could not load analysis #' + analysisId + '.');
        }
      };
      loadAnalysis();
    }
  }, [analysisId]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        setErrorMessage('File size exceeds maximum allowed 10MB limit.');
        return;
      }
      setFile(selected);
      setErrorMessage('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      if (dropped.size > 10 * 1024 * 1024) {
        setErrorMessage('File size exceeds maximum allowed 10MB limit.');
        return;
      }
      setFile(dropped);
      setErrorMessage('');
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!file && !analysis) {
      setErrorMessage('Please select or drop a resume file to analyze.');
      return;
    }

    const effectiveRole = targetRole === 'Other' ? customRole : targetRole;
    if (!effectiveRole) {
      setErrorMessage('Please specify your target job role.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      if (file) formData.append('resumeFile', file);
      if (analysis?.resumeId) formData.append('resumeId', analysis.resumeId);
      formData.append('jobRole', effectiveRole);
      formData.append('jobDescription', jobDescription);
      formData.append('aiProvider', aiProvider);
      if (selectedModel) formData.append('model', selectedModel);
      if (geminiApiKey.trim()) formData.append('geminiApiKey', geminiApiKey.trim());

      const res = await api.post('/analysis/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data && (res.data.analysis || res.data.id)) {
        const result = res.data.analysis || res.data;
        setAnalysis(result);
        if (result.fallbackUsed) {
          setSuccessMessage(
            `Analysis completed using ${result.aiProvider}. (Note: ${result.fallbackReason || 'Defaulted to local engine'})`
          );
        } else {
          setSuccessMessage(
            `Resume successfully analyzed with ${result.aiProvider || 'AI'}${result.modelUsed ? ' (' + result.modelUsed + ')' : ''}!`
          );
        }
      } else {
        throw new Error('Analysis response was empty from backend.');
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Resume analysis encountered an error. Please try again.';
      setErrorMessage(`Analysis Failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const currentProvider = providers.find((p) => p.id === aiProvider);
  const availableModels = currentProvider?.installedModels || [];

  const fileSizeFormatted = file
    ? file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(1)} KB`
    : '';

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Resume Analyzer</span>
      </nav>

      {/* Page Heading */}
      <div className="page-header-row">
        <div>
          <div
            className="eyebrow"
            style={{
              color: 'var(--accent)',
              fontWeight: 800,
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              marginBottom: '6px',
            }}
          >
            <i className="bi bi-cpu"></i> AI-POWERED RESUME EVALUATION
          </div>
          <h1 className="page-title">Resume Analyzer</h1>
          <p className="page-subtitle">
            Upload your resume to evaluate ATS compatibility, extract skills, and match against target
            career profiles.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="btn btn-secondary" to="/dashboard/analyzerhistory">
            <i className="bi bi-clock-history"></i> View Analysis History
          </Link>
        </div>
      </div>

      {/* Helpful Notice */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(110deg, var(--primary-light) 0%, var(--accent-light) 100%)',
          borderColor: 'rgba(32, 59, 96, 0.12)',
          marginBottom: '24px',
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '1.4rem', color: 'var(--accent)' }}>
            <i className="bi bi-bullseye"></i>
          </span>
          <div>
            <strong style={{ color: 'var(--primary)', fontSize: '0.92rem' }}>
              Maximize your analysis accuracy
            </strong>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Select the closest job profile or paste an actual job description to compare your keywords
              and skills against employer requirements.
            </p>
          </div>
        </div>
      </div>

      {/* Server Error / Success Alerts */}
      {errorMessage && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '20px' }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '8px' }}></i>
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="alert alert-success" role="status" style={{ marginBottom: '20px' }}>
          <i className="bi bi-check-circle-fill" style={{ marginRight: '8px' }}></i>
          {successMessage}
        </div>
      )}

      {/* Main Upload & Configuration Grid */}
      <div className="grid-2-1">
        {/* Left Column: Step-by-Step Analyzer Form */}
        <article className="card">
          <form id="resumeAnalyzerForm" onSubmit={handleSubmit}>
            {/* STEP 1: RESUME UPLOAD */}
            <div className="form-section" style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <span className="badge badge-primary">STEP 1 OF 3</span>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Supported: PDF, DOC, DOCX, TXT (Max 10MB)
                </small>
              </div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 4px' }}>
                Upload your Resume
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
                Drag and drop your latest resume file below.
              </p>

              {/* Drag & Drop Zone */}
              <label
                htmlFor="resumeFile"
                className={`resume-dropzone ${isDragging ? 'dragover' : ''}`}
                id="resumeDropzone"
                data-tour="resume-upload-zone"
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                style={{
                  display: 'block',
                  border: isDragging ? '2px dashed var(--accent)' : '2px dashed var(--border-strong)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '32px 20px',
                  textAlign: 'center',
                  background: isDragging ? 'var(--accent-light)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <input
                  type="file"
                  id="resumeFile"
                  name="resumeFile"
                  ref={fileInputRef}
                  accept=".pdf,.doc,.docx,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {!file ? (
                  <div>
                    <span
                      style={{
                        fontSize: '2.5rem',
                        color: 'var(--accent)',
                        display: 'block',
                        marginBottom: '10px',
                      }}
                    >
                      <i className="bi bi-cloud-arrow-up"></i>
                    </span>
                    <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      Drag &amp; drop your resume here, or{' '}
                      <span style={{ color: 'var(--accent)', textDecoration: 'underline' }}>browse</span>
                    </strong>
                    <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Supports PDF, Microsoft Word (.doc, .docx) &amp; Text files
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.8rem', color: 'var(--accent)' }}>
                        <i className="bi bi-file-earmark-pdf-fill"></i>
                      </span>
                      <div style={{ textAlign: 'left' }}>
                        <strong
                          id="selectedFileName"
                          style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-primary)' }}
                        >
                          {file.name}
                        </strong>
                        <span id="selectedFileSize" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {fileSizeFormatted}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      id="removeSelectedFile"
                      className="btn btn-ghost btn-sm"
                      onClick={handleRemoveFile}
                      style={{ color: 'var(--danger)', fontWeight: 700 }}
                    >
                      <i className="bi bi-x-circle"></i> Remove
                    </button>
                  </div>
                )}
              </label>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

            {/* STEP 2: TARGET CAREER ROLE */}
            <div className="form-section" style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <span className="badge badge-primary">STEP 2 OF 3</span>
                <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>* Required</span>
              </div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 4px' }}>
                Target Career Profile
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
                Select the profession you want to analyze your resume against.
              </p>

              <div className="form-group" style={{ marginBottom: '14px' }} data-tour="target-job-role">
                <label
                  htmlFor="jobRole"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}
                >
                  Target Job Role
                </label>
                <select
                  id="jobRole"
                  name="jobRole"
                  className="form-control"
                  value={targetRole}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    setTargetRole(selectedVal);
                    const found = dbJobs.find((j) => j.title?.toLowerCase() === selectedVal?.toLowerCase());
                    if (found && found.description && !jobDescription) {
                      setJobDescription(found.description);
                    }
                  }}
                  required
                >
                  {dbJobs.length > 0 && (
                    <optgroup label="Active Vacancies (Database)">
                      {dbJobs.map((j) => (
                        <option key={j.id} value={j.title}>
                          {j.title} ({j.department} - {j.location})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Software Engineering &amp; Development">
                    <option value="Java Developer">Java Developer</option>
                    <option value="Spring Boot Developer">Spring Boot Developer</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Frontend Developer">Frontend Developer</option>
                    <option value="Full Stack Developer">Full Stack Developer</option>
                    <option value="MERN Stack Developer">MERN Stack Developer</option>
                    <option value="Software Engineer">Software Engineer</option>
                    <option value="Android Developer">Android Developer</option>
                  </optgroup>
                  <optgroup label="Data &amp; Artificial Intelligence">
                    <option value="Data Analyst">Data Analyst</option>
                    <option value="Data Scientist">Data Scientist</option>
                    <option value="Data Engineer">Data Engineer</option>
                    <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                    <option value="AI Engineer">AI Engineer</option>
                  </optgroup>
                  <optgroup label="Cloud, DevOps &amp; Quality Assurance">
                    <option value="DevOps Engineer">DevOps Engineer</option>
                    <option value="Cloud Engineer">Cloud Engineer</option>
                    <option value="AWS Engineer">AWS Engineer</option>
                    <option value="QA Automation Engineer">QA Automation Engineer</option>
                    <option value="Cybersecurity Analyst">Cybersecurity Analyst</option>
                  </optgroup>
                  <optgroup label="Product, Business &amp; Management">
                    <option value="Business Analyst">Business Analyst</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Product Manager">Product Manager</option>
                    <option value="HR Executive">HR Executive</option>
                  </optgroup>
                  <option value="Other">Other / Custom Job Role</option>
                </select>
              </div>

              {targetRole === 'Other' && (
                <div className="form-group" id="customRoleGroup" style={{ marginTop: '10px' }}>
                  <label
                    htmlFor="customJobRole"
                    style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}
                  >
                    Enter Custom Job Title
                  </label>
                  <input
                    type="text"
                    id="customJobRole"
                    name="customJobRole"
                    className="form-control"
                    placeholder="e.g. Embedded Firmware Engineer"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                  />
                </div>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

            {/* STEP 3: OPTIONAL JOB DESCRIPTION */}
            <div className="form-section" style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <span className="badge badge-neutral">STEP 3 OF 3</span>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Optional for tailored match
                </small>
              </div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 4px' }}>
                Job Description (Optional)
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
                Paste the exact job requirements to get a tailored ATS keyword analysis.
              </p>

              <textarea
                id="jobDescription"
                name="jobDescription"
                rows="4"
                className="form-control"
                placeholder="Paste employer job description here: required qualifications, core technologies, responsibilities..."
                maxLength={15000}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '6px',
                }}
              >
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Include technologies and qualifications.
                </small>
                <small id="jobDescriptionCounter" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {jobDescription.length} / 15000
                </small>
              </div>
            </div>

            {/* AI ENGINE & MODEL SETTINGS */}
            <div
              className="form-section"
              data-tour="ai-provider-select"
              style={{
                marginBottom: '24px',
                padding: '16px 18px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <strong
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <i className="bi bi-robot" style={{ color: 'var(--accent)' }}></i> AI Engine &amp; Model Selection
                </strong>
                <span
                  className={`badge ${
                    currentProvider?.available
                      ? 'badge-primary'
                      : 'badge-neutral'
                  }`}
                  style={{ fontSize: '0.72rem' }}
                >
                  {currentProvider?.available ? 'ACTIVE' : 'READY / FALLBACK'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Provider Selector */}
                <div>
                  <label
                    htmlFor="aiProviderSelect"
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      marginBottom: '4px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    AI Provider
                  </label>
                  <select
                    id="aiProviderSelect"
                    name="aiProvider"
                    className="form-control"
                    value={aiProvider}
                    onChange={(e) => {
                      const newProv = e.target.value;
                      setAiProvider(newProv);
                      if (newProv === 'gemini') {
                        setSelectedModel('auto');
                      } else {
                        const target = providers.find((p) => p.id === newProv);
                        if (target) {
                          setSelectedModel(target.recommendedModel || (target.installedModels && target.installedModels[0]) || '');
                        }
                      }
                    }}
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.available ? '● Available' : '(Ready)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model Selector */}
                <div>
                  <label
                    htmlFor="modelSelect"
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      marginBottom: '4px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Specific Model
                  </label>
                  <select
                    id="modelSelect"
                    name="model"
                    className="form-control"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={aiProvider !== 'gemini' && availableModels.length === 0}
                  >
                    {aiProvider === 'gemini' ? (
                      <option value="auto">✨ Auto (Any Working Gemini Model)</option>
                    ) : availableModels.length > 0 ? (
                      availableModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))
                    ) : (
                      <option value={currentProvider?.recommendedModel || 'default'}>
                        {currentProvider?.recommendedModel || 'Default Model'}
                      </option>
                    )}
                  </select>
                </div>
              </div>

              {/* Optional Gemini API Key input if Gemini is selected */}
              {aiProvider === 'gemini' && (
                <div style={{ marginTop: '12px' }}>
                  <label
                    htmlFor="geminiApiKey"
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      marginBottom: '4px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Gemini API Key <small style={{ color: 'var(--text-muted)' }}>(Optional - overrides server key)</small>
                  </label>
                  <input
                    type="password"
                    id="geminiApiKey"
                    name="geminiApiKey"
                    className="form-control"
                    placeholder="AIzaSy... (leave blank to use server environment key)"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                  />
                </div>
              )}

              {/* Provider Info & Health Badge */}
              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.76rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <i
                  className={`bi ${
                    currentProvider?.available
                      ? 'bi-check-circle-fill text-success'
                      : 'bi-info-circle-fill text-primary'
                  }`}
                  style={{ color: currentProvider?.available ? '#10b981' : 'var(--accent)' }}
                ></i>
                <span>
                  {currentProvider?.description || 'Runs locally or in the cloud.'}{' '}
                  {aiProvider === 'ollama' && currentProvider?.available && (
                    <strong style={{ color: '#10b981' }}>(Ollama service running on localhost:11434)</strong>
                  )}
                </span>
              </div>
            </div>

            {/* Submit Action Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                id="analyzeResumeButton"
                data-tour="analyze-submit-button"
                disabled={loading}
                style={{ padding: '12px 20px', fontSize: '0.95rem', fontWeight: 700, width: '100%' }}
              >
                <i className="bi bi-cpu"></i> {loading ? 'Analyzing Document with AI...' : 'Analyze My Resume'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Processing is performed securely. File extraction supports text and OCR parsers.
              </p>
            </div>
          </form>

          {/* HIGH-TECH PROCESSING PROGRESS CONSOLE (Single Resume Scanning Animation) */}
          {loading && (
            <div
              id="analysisProcessing"
              style={{
                marginTop: '24px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                animation: 'fadeIn 0.3s ease',
              }}
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
              `}</style>

              {/* Top Row: Scanner Preview + File Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
                {/* High-Tech Animated Document Scanner Icon */}
                <div
                  style={{
                    position: 'relative',
                    width: '68px',
                    height: '80px',
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
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          background: '#ff7900',
                          display: 'inline-block',
                          boxShadow: '0 0 8px #ff7900',
                          animation: 'pulse 1s infinite',
                        }}
                      ></span>
                      AI Resume Intelligence &amp; ATS Evaluation
                    </span>
                    <span className="badge badge-primary" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      Active
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: '3px',
                    }}
                  >
                    Processing Document: <strong style={{ color: 'var(--text-primary)' }}>{file?.name || 'Selected Resume'}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Target Role: <strong>{targetRole}</strong> • Evaluation Engine: <strong>{currentProvider?.name || 'Local AI Engine'}{selectedModel ? ` (${selectedModel})` : ''}</strong>
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
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent), linear-gradient(90deg, #ff7900 0%, #10b981 100%)',
                    backgroundSize: '28px 28px, 100% 100%',
                    animation: 'progressStripes 1s linear infinite',
                  }}
                ></div>
              </div>

              {/* Multi-Stage Processing Pipeline Indicators */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  padding: '12px',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', animation: 'pipelineStepPulse 2.5s infinite' }}>
                  <i className="bi bi-file-earmark-text text-primary" style={{ display: 'block', fontSize: '1.2rem', marginBottom: '2px' }}></i>
                  <strong>1. OCR &amp; Text</strong>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', animation: 'pipelineStepPulse 2.5s infinite' }}>
                  <i className="bi bi-code-slash text-warning" style={{ display: 'block', fontSize: '1.2rem', marginBottom: '2px' }}></i>
                  <strong>2. Skills &amp; Gaps</strong>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', animation: 'pipelineStepPulse 2.5s infinite' }}>
                  <i className="bi bi-cpu-fill text-accent" style={{ display: 'block', fontSize: '1.2rem', marginBottom: '2px' }}></i>
                  <strong>3. Local ATS AI</strong>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', animation: 'pipelineStepPulse 2.5s infinite' }}>
                  <i className="bi bi-database-fill-check text-success" style={{ display: 'block', fontSize: '1.2rem', marginBottom: '2px' }}></i>
                  <strong>4. Diff &amp; Save</strong>
                </div>
              </div>
            </div>
          )}
        </article>

        {/* Right Column: What You Get & Tips */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Value Proposition Card */}
          <article className="card" data-tour="ai-analysis-highlights">
            <div className="card-header">
              <h2 className="card-title">
                <span style={{ color: 'var(--accent)', marginRight: '6px' }}>
                  <i className="bi bi-bullseye"></i>
                </span>{' '}
                What the AI Analyzes
              </h2>
            </div>
            <ul className="insight-bullet-list">
              <li>
                <strong>ATS Compatibility Score:</strong> Verifies format, sections, fonts, and parser readability.
              </li>
              <li>
                <strong>Skill Extraction &amp; Matching:</strong> Identifies detected skills and maps them against industry taxonomy.
              </li>
              <li>
                <strong>Skills Gap Breakdown:</strong> Highlights high-priority missing skills for the target profile.
              </li>
              <li>
                <strong>Keyword Frequency:</strong> Compares keyword density with typical ATS search filters.
              </li>
              <li>
                <strong>Actionable Suggestions:</strong> Provides targeted bullet points to increase recruiter callback rates.
              </li>
            </ul>
          </article>

          {/* Analysis History & Stored ATS Scores */}
          <article className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <h3 style={{ fontSize: '0.92rem', margin: '0 0 6px', color: 'var(--text-primary)' }}>
              <i className="bi bi-clock-history" style={{ color: 'var(--accent)', marginRight: '4px' }}></i> Saved ATS History
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
              Every analyzed resume and ATS evaluation score is automatically saved to your database history.
            </p>
            <Link className="btn btn-secondary btn-sm btn-block" to="/dashboard/analyzerhistory" style={{ textAlign: 'center' }}>
              <i className="bi bi-journal-text"></i> View All Past Analyses
            </Link>
          </article>
        </aside>
      </div>

      {/* SHARED AI RESUME ANALYSIS RESULTS SECTION */}
      {analysis && (
        <section id="analysisResultsContainer" data-tour="ats-score-card" style={{ marginTop: '32px' }}>
          {analysis.fallbackUsed && (
            <div
              className="alert alert-warning"
              style={{
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#92400e',
                borderRadius: '8px',
                padding: '12px 16px',
              }}
            >
              <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '1.2rem', color: '#f59e0b' }}></i>
              <div>
                <strong>AI Provider Fallback Notice: </strong>
                <span>
                  {analysis.fallbackReason || 'Defaulted to local deterministic NLP engine.'} Analysis completed safely.
                </span>
              </div>
            </div>
          )}
          {/* Duplicate / Diff Status Alert */}
          {analysis.duplicateDetected && !analysis.contentModified && (
            <div
              className="alert alert-info"
              style={{
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                color: 'var(--text-primary)',
                borderRadius: '8px',
                padding: '12px 16px',
              }}
            >
              <i className="bi bi-shield-check text-primary" style={{ fontSize: '1.4rem' }}></i>
              <div>
                <strong>Identical Resume Detected (No Content Changes)</strong>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  This exact resume content and target role already exist in your database. Retrieved your existing saved ATS evaluation without creating redundant database entries.
                </p>
              </div>
            </div>
          )}

          {analysis.contentModified && analysis.differenceSummary && (
            <div
              className="alert alert-success"
              style={{
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#065f46',
                borderRadius: '8px',
                padding: '12px 16px',
              }}
            >
              <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '1.4rem' }}></i>
              <div>
                <strong>Resume Updates Detected &amp; Persisted</strong>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {analysis.differenceSummary}
                </p>
              </div>
            </div>
          )}

          <AnalysisResult analysis={analysis} context="user" />
        </section>
      )}
    </div>
  );
};

export default ResumeAnalyzer;
