import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import AnalysisResult from '../../components/common/AnalysisResult';
import CustomSelect from '../../components/common/CustomSelect';
import { useAuth } from '../../context/AuthContext';
import { useBulkScan } from '../../context/BulkScanContext';

const ResumeAnalyzer = () => {
  const { user } = useAuth();
  const {
    isSeekerAnalyzing,
    seekerMinimized,
    seekerProgress,
    seekerAnalysisResult,
    seekerError,
    startSeekerAnalysis,
    minimizeSeekerAnalysis,
    restoreSeekerAnalysis,
  } = useBulkScan();
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
  const [showUploadForm, setShowUploadForm] = useState(false);
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

  // Sync background analysis results from context
  useEffect(() => {
    if (seekerAnalysisResult) {
      setAnalysis(seekerAnalysisResult);
      setShowUploadForm(false);
      if (seekerAnalysisResult.fallbackUsed) {
        setSuccessMessage(
          `Analysis completed using ${seekerAnalysisResult.aiProvider}. (Note: ${seekerAnalysisResult.fallbackReason || 'Defaulted to local engine'})`
        );
      } else {
        setSuccessMessage(
          `Resume successfully analyzed with ${seekerAnalysisResult.aiProvider || 'AI'}${seekerAnalysisResult.modelUsed ? ' (' + seekerAnalysisResult.modelUsed + ')' : ''}!`
        );
      }
    }
  }, [seekerAnalysisResult]);

  useEffect(() => {
    if (seekerError) {
      setErrorMessage(`Analysis Failed: ${seekerError}`);
    }
  }, [seekerError]);

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

    try {
      const activeEmail = user?.email
        ? user.email.trim().toLowerCase()
        : (typeof window !== 'undefined'
            ? (sessionStorage.getItem('smarthire_user_email') || localStorage.getItem('smarthire_user_email') || '')
            : '');

      const formData = new FormData();
      if (file) formData.append('resumeFile', file);
      if (analysis?.resumeId) formData.append('resumeId', analysis.resumeId);
      formData.append('jobRole', effectiveRole);
      formData.append('jobDescription', jobDescription);
      formData.append('aiProvider', aiProvider);
      if (selectedModel) formData.append('model', selectedModel);
      if (activeEmail) formData.append('email', activeEmail);

      const effectiveEngineName = `${currentProvider?.name || 'Local AI Engine'}${selectedModel && selectedModel !== 'auto' ? ` (${selectedModel})` : ''}`;

      const result = await startSeekerAnalysis({
        formData,
        fileName: file?.name || 'Selected Resume Document',
        targetRole: effectiveRole,
        engineName: effectiveEngineName,
      });

      if (result) {
        setAnalysis(result);
        setShowUploadForm(false);
        if (result.fallbackUsed) {
          setSuccessMessage(
            `Analysis completed using ${result.aiProvider}. (Note: ${result.fallbackReason || 'Defaulted to local engine'})`
          );
        } else {
          setSuccessMessage(
            `Resume successfully analyzed with ${result.aiProvider || 'AI'}${result.modelUsed ? ' (' + result.modelUsed + ')' : ''}!`
          );
        }
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Resume analysis encountered an error. Please try again.';
      setErrorMessage(`Analysis Failed: ${errorMsg}`);
    }
  };

  const currentProvider = providers.find((p) => p.id === aiProvider);
  const availableModels = currentProvider?.installedModels || [];

  const roleOptions = useMemo(() => [
    ...(dbJobs.length > 0
      ? [
          { isHeader: true, label: 'Active Vacancies (Database)' },
          ...dbJobs.map((j) => ({
            value: j.title,
            label: `${j.title} (${j.department || 'Tech'} - ${j.location || 'Remote'})`,
            badge: 'Active Vacancy',
          })),
        ]
      : []),
    { isHeader: true, label: 'Software Engineering & Development' },
    { value: 'Java Developer', label: 'Java Developer' },
    { value: 'Spring Boot Developer', label: 'Spring Boot Developer' },
    { value: 'Backend Developer', label: 'Backend Developer' },
    { value: 'Frontend Developer', label: 'Frontend Developer' },
    { value: 'Full Stack Developer', label: 'Full Stack Developer' },
    { value: 'MERN Stack Developer', label: 'MERN Stack Developer' },
    { value: 'Software Engineer', label: 'Software Engineer' },
    { value: 'Android Developer', label: 'Android Developer' },

    { isHeader: true, label: 'Data & Artificial Intelligence' },
    { value: 'Data Analyst', label: 'Data Analyst' },
    { value: 'Data Scientist', label: 'Data Scientist' },
    { value: 'Data Engineer', label: 'Data Engineer' },
    { value: 'Machine Learning Engineer', label: 'Machine Learning Engineer' },
    { value: 'AI Engineer', label: 'AI Engineer' },

    { isHeader: true, label: 'Cloud, DevOps & Quality Assurance' },
    { value: 'DevOps Engineer', label: 'DevOps Engineer' },
    { value: 'Cloud Engineer', label: 'Cloud Engineer' },
    { value: 'AWS Engineer', label: 'AWS Engineer' },
    { value: 'QA Automation Engineer', label: 'QA Automation Engineer' },
    { value: 'Cybersecurity Analyst', label: 'Cybersecurity Analyst' },

    { isHeader: true, label: 'Product, Business & Management' },
    { value: 'Business Analyst', label: 'Business Analyst' },
    { value: 'Project Manager', label: 'Project Manager' },
    { value: 'Product Manager', label: 'Product Manager' },
    { value: 'HR Executive', label: 'HR Executive' },

    { isHeader: true, label: 'Custom' },
    { value: 'Other', label: 'Other / Custom Job Role' },
  ], [dbJobs]);

  const providerOptions = useMemo(() => {
    return providers.map((p) => ({
      value: p.id,
      label: p.name,
      badge: p.available ? '● Available' : '(Ready)',
    }));
  }, [providers]);

  const modelOptions = useMemo(() => {
    if (aiProvider === 'gemini') {
      return [{ value: 'auto', label: 'Auto (Any Working Gemini Model)', icon: <i className="bi bi-stars text-accent"></i> }];
    }
    if (availableModels.length > 0) {
      return availableModels.map((m) => ({ value: m, label: m }));
    }
    return [{ value: currentProvider?.recommendedModel || 'default', label: currentProvider?.recommendedModel || 'Default Model' }];
  }, [aiProvider, availableModels, currentProvider]);

  const fileSizeFormatted = file
    ? file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(1)} KB`
    : '';

  const isEvaluating = isSeekerAnalyzing && !seekerMinimized;

  // High-Tech Dedicated Scanning View during processing
  if (isEvaluating) {
    return (
      <div style={{ maxWidth: '900px', margin: '24px auto', padding: '10px 16px' }}>
        <style>{`
          @keyframes scanLaser {
            0% { top: 0%; opacity: 0.8; box-shadow: 0 0 10px #ff7900; }
            50% { top: 88%; opacity: 1; box-shadow: 0 0 18px #10b981; }
            100% { top: 0%; opacity: 0.8; box-shadow: 0 0 10px #ff7900; }
          }
          @keyframes sonarPulse {
            0% { transform: scale(0.96); box-shadow: 0 0 0 0 rgba(255, 121, 0, 0.4); }
            70% { transform: scale(1.02); box-shadow: 0 0 0 14px rgba(255, 121, 0, 0); }
            100% { transform: scale(0.96); box-shadow: 0 0 0 0 rgba(255, 121, 0, 0); }
          }
          @keyframes progressStripes {
            0% { background-position: 0 0; }
            100% { background-position: 36px 0; }
          }
          @keyframes pipelineStepPulse {
            0%, 100% { transform: scale(1); opacity: 0.85; }
            50% { transform: scale(1.04); opacity: 1; }
          }
        `}</style>

        {/* Top Header Row with Breadcrumbs & Minimize Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <nav className="breadcrumb" style={{ margin: 0 }}>
            <Link to="/dashboard">Dashboard</Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">AI Evaluation in Progress</span>
          </nav>

          <button
            type="button"
            onClick={minimizeSeekerAnalysis}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '20px',
              padding: '6px 14px',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
            title="Minimize to floating widget and continue working"
          >
            <i className="bi bi-dash-lg"></i> Minimize
          </button>
        </div>

        <div
          className="card"
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '44px 32px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* Top Right Minimize Icon inside Card as well */}
          <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
            <button
              type="button"
              onClick={minimizeSeekerAnalysis}
              className="btn btn-ghost btn-sm"
              style={{
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              title="Minimize to floating widget"
            >
              <i className="bi bi-dash-lg"></i> Minimize
            </button>
          </div>

          {/* Animated Scanner Preview */}
          <div
            style={{
              position: 'relative',
              width: '90px',
              height: '110px',
              margin: '0 auto 24px',
              background: 'var(--bg-secondary)',
              border: '2px solid var(--border-strong)',
              borderRadius: '12px',
              padding: '16px 12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflow: 'hidden',
              animation: 'sonarPulse 2.5s infinite',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, transparent, #ff7900, #10b981, transparent)',
                boxShadow: '0 0 14px #ff7900',
                animation: 'scanLaser 2.2s ease-in-out infinite',
                zIndex: 2,
              }}
            ></div>
            <div style={{ width: '60%', height: '5px', background: 'var(--border-strong)', borderRadius: '3px' }}></div>
            <div style={{ width: '90%', height: '4px', background: 'var(--border-color)', borderRadius: '2px' }}></div>
            <div style={{ width: '85%', height: '4px', background: 'var(--border-color)', borderRadius: '2px' }}></div>
            <div style={{ width: '75%', height: '4px', background: 'var(--border-color)', borderRadius: '2px' }}></div>
            <div style={{ width: '95%', height: '4px', background: 'var(--border-color)', borderRadius: '2px' }}></div>
            <div style={{ width: '70%', height: '4px', background: 'var(--border-color)', borderRadius: '2px' }}></div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--accent-light)',
              padding: '6px 16px',
              borderRadius: '20px',
              marginBottom: '14px',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#ff7900',
                display: 'inline-block',
                boxShadow: '0 0 10px #ff7900',
                animation: 'pulse 1s infinite',
              }}
            ></span>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.04em' }}>
              EVALUATING RESUME WITH AI
            </span>
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 8px', color: 'var(--text-primary)' }}>
            Processing: {seekerProgress.fileName || file?.name || 'Selected Resume Document'}
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: '0 auto 28px', maxWidth: '600px' }}>
            Target Career Profile: <strong style={{ color: 'var(--text-primary)' }}>{seekerProgress.targetRole || targetRole}</strong> • Evaluation Engine:{' '}
            <strong style={{ color: 'var(--accent)' }}>
              {seekerProgress.engineName || currentProvider?.name || 'Local AI Engine'}
            </strong>
          </p>

          {/* Animated Striped Progress Bar with Dynamic Percentage */}
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              margin: '0 auto 10px',
              height: '12px',
              background: 'var(--border-color)',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${seekerProgress.percentage || 25}%`,
                height: '100%',
                background:
                  'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent), linear-gradient(90deg, #ff7900 0%, #10b981 100%)',
                backgroundSize: '28px 28px, 100% 100%',
                animation: 'progressStripes 1s linear infinite',
                transition: 'width 0.4s ease',
              }}
            ></div>
          </div>
          <div style={{ maxWidth: '680px', margin: '0 auto 24px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Stage: <strong style={{ color: 'var(--accent)' }}>{seekerProgress.stepName || 'Evaluating...'}</strong></span>
            <strong style={{ color: 'var(--text-primary)' }}>{seekerProgress.percentage || 25}% Completed</strong>
          </div>

          {/* Multi-Stage Pipeline Stages */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              maxWidth: '680px',
              margin: '0 auto 24px',
              padding: '16px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: (seekerProgress.step || 1) >= 1 ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: (seekerProgress.step || 1) === 1 ? 700 : 500 }}>
              <i className="bi bi-file-earmark-text text-primary" style={{ display: 'block', fontSize: '1.4rem', marginBottom: '4px' }}></i>
              <strong>1. OCR &amp; Text</strong>
            </div>
            <div style={{ fontSize: '0.78rem', color: (seekerProgress.step || 1) >= 2 ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: (seekerProgress.step || 1) === 2 ? 700 : 500 }}>
              <i className="bi bi-code-slash text-warning" style={{ display: 'block', fontSize: '1.4rem', marginBottom: '4px' }}></i>
              <strong>2. Skills &amp; Gaps</strong>
            </div>
            <div style={{ fontSize: '0.78rem', color: (seekerProgress.step || 1) >= 3 ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: (seekerProgress.step || 1) === 3 ? 700 : 500 }}>
              <i className="bi bi-cpu-fill text-accent" style={{ display: 'block', fontSize: '1.4rem', marginBottom: '4px' }}></i>
              <strong>3. Deep Evaluation</strong>
            </div>
            <div style={{ fontSize: '0.78rem', color: (seekerProgress.step || 1) >= 4 ? '#10b981' : 'var(--text-secondary)', fontWeight: (seekerProgress.step || 1) === 4 ? 700 : 500 }}>
              <i className="bi bi-database-fill-check text-success" style={{ display: 'block', fontSize: '1.4rem', marginBottom: '4px' }}></i>
              <strong>4. Synthesis &amp; Save</strong>
            </div>
          </div>

          {/* Minimize button inside card */}
          <div>
            <button
              type="button"
              onClick={minimizeSeekerAnalysis}
              className="btn btn-outline-secondary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '24px',
                padding: '8px 20px',
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              <i className="bi bi-window-stack"></i> Minimize to Background (Work while AI scans)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Background Analysis Active Banner */}
      {isSeekerAnalyzing && seekerMinimized && (
        <div
          className="alert"
          style={{
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            borderRadius: '12px',
            border: '1.5px solid var(--accent)',
            background: 'var(--bg-card)',
            boxShadow: '0 4px 14px rgba(255, 121, 0, 0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#ff7900',
                display: 'inline-block',
                boxShadow: '0 0 8px #ff7900',
                animation: 'pulse 1s infinite',
              }}
            ></span>
            <div>
              <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                AI Resume Evaluation Running in Background
              </strong>
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                Analyzing <strong>{seekerProgress.fileName}</strong> • Stage: {seekerProgress.stepName} ({seekerProgress.percentage}%)
              </small>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={restoreSeekerAnalysis}
            style={{ borderRadius: '20px', padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="bi bi-arrows-angle-expand"></i> Expand Live View
          </button>
        </div>
      )}
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
          <h1 className="page-title">{analysis ? 'Resume & Career Match Analysis' : 'Resume Analyzer'}</h1>
          <p className="page-subtitle">
            {analysis
              ? `ATS evaluation report for ${analysis.candidateName || 'Candidate'} against ${analysis.targetJobRole || targetRole}.`
              : 'Upload your resume to evaluate ATS compatibility, extract skills, and match against target career profiles.'}
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {analysis && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setShowUploadForm((prev) => !prev);
                if (!showUploadForm) {
                  setTimeout(() => {
                    document.getElementById('uploadFormSection')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              }}
            >
              <i className="bi bi-cloud-arrow-up"></i> {showUploadForm ? 'Hide Upload Form' : 'Scan Another Resume'}
            </button>
          )}
          <Link className="btn btn-secondary" to="/dashboard/analyzerhistory">
            <i className="bi bi-clock-history"></i> View Analysis History
          </Link>
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

      {/* 1. REPORT AT THE TOP WHEN ANALYSIS EXISTS */}
      {analysis && (
        <section id="analysisResultsContainer" data-tour="ats-score-card" style={{ marginBottom: '32px' }}>
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

      {/* 2. UPLOAD FORM & SIDEBAR (Visible when no analysis yet OR when toggled with "Scan Another Resume") */}
      {(!analysis || showUploadForm) && (
        <div id="uploadFormSection" style={{ animation: 'fadeIn 0.3s ease' }}>
          {analysis && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                marginBottom: '16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                <i className="bi bi-file-earmark-arrow-up" style={{ color: 'var(--accent)', marginRight: '8px' }}></i>
                Scan Another Resume or Re-evaluate with Different Parameters
              </strong>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowUploadForm(false)}
                style={{ color: 'var(--text-muted)' }}
              >
                <i className="bi bi-x-lg"></i> Close Form
              </button>
            </div>
          )}

          {!analysis && (
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
                          <span style={{ color: 'var(--accent)', textDecoration: 'underline' }}>browse file</span>
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
                    <CustomSelect
                      id="jobRole"
                      value={targetRole}
                      onChange={(selectedVal) => {
                        setTargetRole(selectedVal);
                      }}
                      options={roleOptions}
                      placeholder="Select Target Job Role..."
                      searchable={true}
                    />
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

                  <div className="ai-engine-grid">
                    {/* Provider Selector */}
                    <div style={{ minWidth: 0 }}>
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
                      <CustomSelect
                        id="aiProviderSelect"
                        value={aiProvider}
                        onChange={(newProv) => {
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
                        options={providerOptions}
                        placeholder="Select AI Provider..."
                      />
                    </div>

                    {/* Model Selector */}
                    <div style={{ minWidth: 0 }}>
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
                      <CustomSelect
                        id="modelSelect"
                        value={selectedModel}
                        onChange={(newModel) => setSelectedModel(newModel)}
                        options={modelOptions}
                        placeholder="Select Model..."
                        disabled={aiProvider !== 'gemini' && availableModels.length === 0}
                      />
                    </div>
                  </div>

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
                    <i className="bi bi-cpu"></i> Analyze My Resume
                  </button>
                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    Processing is performed securely. File extraction supports text and OCR parsers.
                  </p>
                </div>
              </form>
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
        </div>
      )}
    </div>
  );
};

export default ResumeAnalyzer;
