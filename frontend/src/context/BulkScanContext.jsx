import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';

const BulkScanContext = createContext(null);

export const BulkScanProvider = ({ children }) => {
  const { user } = useAuth();
  const { refreshNotifications } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  // Core Batch Screening States
  const [isScreening, setIsScreening] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [batchFinished, setBatchFinished] = useState(false);

  // Configuration States
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [associatedJobId, setAssociatedJobId] = useState('');
  const [targetJob, setTargetJob] = useState(null);
  const [aiProvider, setAiProvider] = useState('local');
  const [aiModel, setAiModel] = useState('qwen3:4b');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [geminiKey, setGeminiKey] = useState('');
  const [duplicateAlert, setDuplicateAlert] = useState('');

  // Live Progress Metrics
  const [progress, setProgress] = useState({
    total: 0,
    current: 0,
    completed: 0,
    remaining: 0,
    percentage: 0,
    currentFileName: '',
    results: [],
  });

  const abortRef = useRef(false);

  // Job Seeker Single Resume Analysis States
  const [isSeekerAnalyzing, setIsSeekerAnalyzing] = useState(false);
  const [seekerMinimized, setSeekerMinimized] = useState(false);
  const [seekerProgress, setSeekerProgress] = useState({
    step: 1,
    stepName: 'OCR & Text Extraction',
    percentage: 25,
    fileName: '',
    targetRole: '',
    engineName: '',
  });
  const [seekerAnalysisResult, setSeekerAnalysisResult] = useState(null);
  const [seekerError, setSeekerError] = useState(null);
  const seekerTimerRef = useRef(null);

  const startSeekerAnalysis = useCallback(async ({ formData, fileName, targetRole, engineName }) => {
    setIsSeekerAnalyzing(true);
    setSeekerMinimized(false);
    setSeekerAnalysisResult(null);
    setSeekerError(null);

    setSeekerProgress({
      step: 1,
      stepName: 'OCR & Text Extraction',
      percentage: 25,
      fileName: fileName || 'Resume',
      targetRole: targetRole || 'Target Role',
      engineName: engineName || 'Local AI Engine',
    });

    let currentStep = 1;
    if (seekerTimerRef.current) clearInterval(seekerTimerRef.current);
    seekerTimerRef.current = setInterval(() => {
      currentStep++;
      if (currentStep === 2) {
        setSeekerProgress((prev) => ({ ...prev, step: 2, stepName: 'Skills & Gaps Analysis', percentage: 50 }));
      } else if (currentStep === 3) {
        setSeekerProgress((prev) => ({ ...prev, step: 3, stepName: 'Deep ATS Neural Evaluation', percentage: 75 }));
      } else if (currentStep >= 4) {
        setSeekerProgress((prev) => ({ ...prev, step: 4, stepName: 'Synthesis & Database Save', percentage: 92 }));
        clearInterval(seekerTimerRef.current);
      }
    }, 3500);

    try {
      const activeEmail = user?.email
        ? user.email.trim().toLowerCase()
        : (typeof window !== 'undefined'
            ? (sessionStorage.getItem('smarthire_user_email') || localStorage.getItem('smarthire_user_email') || '')
            : '');

      const res = await api.post('/analysis/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(activeEmail ? { 'X-User-Email': activeEmail } : {}),
        },
      });

      if (seekerTimerRef.current) clearInterval(seekerTimerRef.current);

      if (res.data && (res.data.analysis || res.data.id)) {
        const result = res.data.analysis || res.data;
        setSeekerProgress((prev) => ({ ...prev, step: 4, stepName: 'Evaluation Complete', percentage: 100 }));
        setSeekerAnalysisResult(result);
        setIsSeekerAnalyzing(false);
        setSeekerMinimized(false);

        if (refreshNotifications) {
          refreshNotifications();
        }

        try {
          window.dispatchEvent(new CustomEvent('smarthire:seeker-analysis-complete', { detail: result }));
        } catch (_) {}

        return result;
      } else {
        throw new Error('Analysis response was empty from backend.');
      }
    } catch (err) {
      if (seekerTimerRef.current) clearInterval(seekerTimerRef.current);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Resume analysis encountered an error. Please try again.';
      setSeekerError(errorMsg);
      setIsSeekerAnalyzing(false);
      setSeekerMinimized(false);
      throw err;
    }
  }, [user?.email, refreshNotifications]);

  const minimizeSeekerAnalysis = useCallback(() => {
    setSeekerMinimized(true);
  }, []);

  const restoreSeekerAnalysis = useCallback(() => {
    if (location.pathname !== '/dashboard/resumeanalyzer') {
      navigate('/dashboard/resumeanalyzer');
    }
    setSeekerMinimized(false);
  }, [location.pathname, navigate]);

  const clearSeekerAnalysis = useCallback(() => {
    if (seekerTimerRef.current) clearInterval(seekerTimerRef.current);
    setIsSeekerAnalyzing(false);
    setSeekerMinimized(false);
    setSeekerAnalysisResult(null);
    setSeekerError(null);
  }, []);

  // Start Batch AI Screening in the background
  const startBatchScreening = useCallback(async ({ files, job, provider, model, geminiApiKey }) => {
    if (!files || files.length === 0) return;

    abortRef.current = false;
    const filesToScan = [...files];
    const targetJobObj = job || { title: 'Software Engineer', description: '' };
    const jobTitle = targetJobObj.title || 'Software Engineer';
    const jobDesc = targetJobObj.description || '';

    setTargetJob(targetJobObj);
    setIsScreening(true);
    setBatchFinished(false);
    setIsMinimized(false);

    const total = filesToScan.length;
    setProgress({
      total,
      current: 1,
      completed: 0,
      remaining: total,
      percentage: 0,
      currentFileName: filesToScan[0]?.name || 'Resume',
      results: [],
    });

    const collectedResults = [];
    let completedCount = 0;

    for (let i = 0; i < total; i++) {
      if (abortRef.current) {
        console.warn('Batch screening canceled by user.');
        break;
      }

      const currentFile = filesToScan[i];
      setProgress((prev) => ({
        ...prev,
        current: i + 1,
        currentFileName: currentFile.name,
      }));

      try {
        const effectiveProvider = provider || 'local';
        const effectiveModel = effectiveProvider === 'gemini'
          ? (model || 'gemini-2.5-flash')
          : (effectiveProvider === 'ollama' ? (model || 'qwen3:4b') : null);

        const formData = new FormData();
        formData.append('resumeFile', currentFile);
        formData.append('jobRole', jobTitle);
        formData.append('jobDescription', jobDesc);
        formData.append('aiProvider', effectiveProvider);
        if (effectiveModel) {
          formData.append('model', effectiveModel);
        }
        if (effectiveProvider === 'gemini' && geminiApiKey) {
          formData.append('geminiApiKey', geminiApiKey.trim());
        }

        const res = await api.post('/analysis/analyze', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const data = res.data?.analysis || res.data;
        const candidateItem = {
          fileName: currentFile.name,
          candidateName: data?.candidateName || 'Candidate',
          candidateEmail: data?.candidateEmail || '',
          score: data?.overallScore ?? 65,
          matchLevel: data?.matchLevel || (data?.overallScore >= 75 ? 'Strong Match' : 'Moderate Match'),
          skills: data?.matchedSkillsList || (data?.skillsAnalysis?.matchedSkills) || [],
          categoryScores: data?.categoryScores || {},
          providerUsed: effectiveProvider === 'gemini'
            ? `Google Gemini AI (${effectiveModel})`
            : (effectiveProvider === 'ollama' ? `Ollama (${effectiveModel})` : 'Local High-Precision NLP'),
          status: 'success',
        };
        collectedResults.push(candidateItem);
      } catch (err) {
        collectedResults.push({
          fileName: currentFile.name,
          candidateName: 'File ' + (i + 1),
          status: 'error',
          error: err.response?.data?.message || err.message || 'Parsing error',
        });
      }

      completedCount++;
      const pct = Math.round((completedCount / total) * 100);

      setProgress((prev) => ({
        ...prev,
        completed: completedCount,
        remaining: total - completedCount,
        percentage: pct,
        results: [...collectedResults],
      }));
    }

    // Finished: update state immediately so running icon vanishes
    setIsScreening(false);
    setBatchFinished(true);
    setIsMinimized(false);

    // Notify the HR recruiter who initiated the task
    const successfulCount = collectedResults.filter((r) => r.status === 'success').length;
    const hrEmail = user?.email;

    try {
      await api.post('/dashboard/candidates/bulk-upload/notify', {
        jobId: targetJobObj?.id || null,
        jobTitle: jobTitle,
        totalFiles: total,
        successfulCount,
        hrEmail,
      });

      if (refreshNotifications) {
        refreshNotifications();
      }
    } catch (notifErr) {
      console.warn('Could not dispatch HR notification for bulk screening:', notifErr);
    }

    // Trigger candidate pool refresh event
    try {
      window.dispatchEvent(new CustomEvent('smarthire:bulk-scan-complete', {
        detail: {
          jobId: targetJobObj?.id,
          jobTitle,
          total,
          successfulCount,
        },
      }));
    } catch (_) {}
  }, [user, refreshNotifications]);

  // Minimize scanning modal to run in background
  const minimizeScan = useCallback(() => {
    setIsMinimized(true);
    setModalOpen(false);
  }, []);

  // Restore and open scanning view
  const restoreScan = useCallback(() => {
    if (location.pathname !== '/dashboard/candidates') {
      navigate('/dashboard/candidates');
    }
    setIsMinimized(false);
    setModalOpen(true);
  }, [location.pathname, navigate]);

  // Cancel in-flight batch screening
  const cancelBatchScreening = useCallback(() => {
    abortRef.current = true;
    setIsScreening(false);
    setIsMinimized(false);
  }, []);

  // Reset modal state
  const resetBatchModal = useCallback(() => {
    abortRef.current = true;
    setSelectedFiles([]);
    setIsScreening(false);
    setBatchFinished(false);
    setIsMinimized(false);
    setDuplicateAlert('');
    setProgress({
      total: 0,
      current: 0,
      completed: 0,
      remaining: 0,
      percentage: 0,
      currentFileName: '',
      results: [],
    });
    setModalOpen(false);
  }, []);

  const value = {
    isScreening,
    isMinimized,
    modalOpen,
    batchFinished,
    progress,
    selectedFiles,
    associatedJobId,
    targetJob,
    aiProvider,
    aiModel,
    geminiModel,
    geminiKey,
    duplicateAlert,
    setModalOpen,
    setIsMinimized,
    setSelectedFiles,
    setAssociatedJobId,
    setTargetJob,
    setAiProvider,
    setAiModel,
    setGeminiModel,
    setGeminiKey,
    setDuplicateAlert,
    startBatchScreening,
    minimizeScan,
    restoreScan,
    cancelBatchScreening,
    resetBatchModal,

    // Job Seeker Single Resume Analysis States & Actions
    isSeekerAnalyzing,
    seekerMinimized,
    seekerProgress,
    seekerAnalysisResult,
    seekerError,
    startSeekerAnalysis,
    minimizeSeekerAnalysis,
    restoreSeekerAnalysis,
    clearSeekerAnalysis,
  };

  return (
    <BulkScanContext.Provider value={value}>
      {children}
    </BulkScanContext.Provider>
  );
};

export const useBulkScan = () => {
  const context = useContext(BulkScanContext);
  if (!context) {
    throw new Error('useBulkScan must be used within a BulkScanProvider');
  }
  return context;
};
