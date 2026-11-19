import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import { useTheme } from '../../context/ThemeContext';

export default function DynamicScreeningForm({
  applicationId,
  jobTitle,
  atsScore,
  atsThreshold = 60,
  questions = [],
  onCompleted
}) {
  const { isDark } = useTheme();
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const isSubmittedRef = useRef(false);
  const firstInputRef = useRef(null);

  // 1. Synchronize persistence to localStorage so even browser restart re-opens this modal
  useEffect(() => {
    if (!success && applicationId) {
      try {
        localStorage.setItem(
          'smarthire_pending_screening_form',
          JSON.stringify({
            applicationId,
            jobTitle,
            atsScore,
            atsThreshold,
            questions,
            timestamp: Date.now()
          })
        );
      } catch (e) {}
    } else if (success) {
      try {
        localStorage.removeItem('smarthire_pending_screening_form');
        localStorage.removeItem('smarthire_pending_screening_analysis');
      } catch (e) {}
    }
  }, [applicationId, jobTitle, atsScore, atsThreshold, questions, success]);

  // 2. Strict Browser Close, Tab Close & Reload Guard (beforeunload)
  useEffect(() => {
    if (success) {
      isSubmittedRef.current = true;
      window.onbeforeunload = null;
      return;
    }

    const handleBeforeUnload = (e) => {
      if (isSubmittedRef.current) return;
      e.preventDefault();
      // Setting returnValue to empty string triggers native browser confirmation prompt in Chrome, Edge & Safari
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload, { capture: true });
    window.onbeforeunload = handleBeforeUnload;

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload, { capture: true });
      window.onbeforeunload = null;
    };
  }, [success]);

  // 3. Browser Back / Forward Button Trap (popstate)
  useEffect(() => {
    if (success) return;

    try {
      window.history.pushState({ mandatoryScreening: true }, '', window.location.href);
    } catch (e) {}

    const handlePopState = (e) => {
      if (!isSubmittedRef.current) {
        try {
          window.history.pushState({ mandatoryScreening: true }, '', window.location.href);
        } catch (err) {}
        alert('⚠️ Mandatory Pre-Screening: You cannot navigate away without completing and submitting this screening questionnaire.');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [success]);

  // 4. Lock Background Scroll while Modal is active
  useEffect(() => {
    if (!success) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [success]);

  // 5. Prevent ESC key from closing the mandatory modal
  useEffect(() => {
    if (success) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [success]);

  // 6. Autofocus first input on mount to guarantee immediate user activation gesture
  useEffect(() => {
    const timer = setTimeout(() => {
      if (firstInputRef.current) {
        try {
          firstInputRef.current.focus();
        } catch (e) {}
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Client-side validation for required fields
    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      const qKey = q.id != null ? q.id : idx;
      if (q.required !== false) {
        const ans = answers[qKey];
        if (!ans || !String(ans).trim()) {
          setErrorMsg(`Please answer required question #${idx + 1}: "${q.questionText}"`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      const responsesPayload = questions.map((q, idx) => {
        const qKey = q.id != null ? q.id : idx;
        return {
          questionId: q.id,
          answerText: answers[qKey] ? String(answers[qKey]).trim() : ''
        };
      });

      const res = await api.post(`/applications/${applicationId}/screening-responses`, {
        responses: responsesPayload
      });

      isSubmittedRef.current = true;
      setSuccess(true);
      try {
        localStorage.removeItem('smarthire_pending_screening_form');
        localStorage.removeItem('smarthire_pending_screening_analysis');
      } catch (e) {}
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || 'Error submitting screening responses. Please review answers and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Color Palette specifically tailored for both Dark & Light Themes
  const colors = {
    overlayBg: isDark ? 'rgba(3, 7, 18, 0.88)' : 'rgba(15, 23, 42, 0.82)',
    modalBg: isDark ? '#1E293B' : '#FFFFFF',
    textPrimary: isDark ? '#F8FAFC' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#475569',
    textMuted: isDark ? '#64748B' : '#94A3B8',
    borderColor: isDark ? '#334155' : '#E2E8F0',
    headerBg: isDark
      ? 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)'
      : 'linear-gradient(135deg, #203B60 0%, #142A45 100%)',
    headerBorder: '#FF7900',
    advisoryBg: isDark ? '#2D1A04' : '#FFF7ED',
    advisoryBorder: isDark ? '#7C2D12' : '#FED7AA',
    advisoryText: isDark ? '#FDBA74' : '#9A3412',
    cardBg: isDark ? '#0F172A' : '#F8FAFC',
    cardBorder: isDark ? '#334155' : '#E2E8F0',
    inputBg: isDark ? '#1E293B' : '#FFFFFF',
    inputBorder: isDark ? '#334155' : '#CBD5E1',
    inputText: isDark ? '#F8FAFC' : '#0F172A',
    footerBg: isDark ? '#0F172A' : '#F8FAFC',
    footerBorder: isDark ? '#334155' : '#E2E8F0',
    optionUnselectedBg: isDark ? '#1E293B' : '#FFFFFF',
    optionUnselectedBorder: isDark ? '#334155' : '#E2E8F0',
    optionUnselectedText: isDark ? '#E2E8F0' : '#1E293B',
    optionSelectedBg: isDark ? 'rgba(255, 121, 0, 0.16)' : '#FFF7ED',
    optionSelectedBorder: '#FF7900',
    optionSelectedText: isDark ? '#FF9A3C' : '#C2410C',
  };

  // SUCCESS / CELEBRATION VIEW (Shown inside modal after submission)
  if (success) {
    return (
      <div
        className="screening-modal-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.overlayBg,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          animation: 'fadeIn 0.25s ease'
        }}
      >
        <div
          className="screening-modal-content"
          style={{
            width: '100%',
            maxWidth: '580px',
            backgroundColor: colors.modalBg,
            color: colors.textPrimary,
            borderRadius: '18px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(16, 185, 129, 0.35)',
            border: '2px solid #10b981',
            padding: '40px 32px',
            textAlign: 'center',
            animation: 'confirmFadeScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              width: '84px',
              height: '84px',
              margin: '0 auto 20px',
              borderRadius: '50%',
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              fontSize: '2.8rem',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)'
            }}
          >
            <i className="bi bi-patch-check-fill"></i>
          </div>

          <span
            style={{
              display: 'inline-block',
              background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
              color: isDark ? '#6ee7b7' : '#047857',
              border: isDark ? '1px solid #059669' : '1px solid #a7f3d0',
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '10px'
            }}
          >
            ✓ Mandatory Screening Completed
          </span>

          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: isDark ? '#34d399' : '#065f46', margin: '0 0 10px' }}>
            Responses Submitted Successfully!
          </h3>

          <p style={{ color: isDark ? '#cbd5e1' : '#047857', fontSize: '0.94rem', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto 24px' }}>
            Your answers for <strong>{jobTitle || 'Target Role'}</strong> have been saved and attached to your application.
            Your profile status is now updated to <strong>Screening Completed</strong> and the hiring team has been notified.
          </p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (onCompleted) onCompleted();
            }}
            style={{
              padding: '13px 32px',
              fontWeight: 800,
              fontSize: '0.96rem',
              background: 'linear-gradient(135deg, #FF7900 0%, #EA580C 100%)',
              border: 'none',
              borderRadius: '10px',
              boxShadow: '0 8px 20px rgba(255, 121, 0, 0.35)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer'
            }}
          >
            <i className="bi bi-file-earmark-bar-graph"></i>
            View Detailed ATS Analysis Report &rarr;
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE MANDATORY SCREENING MODAL TAKEOVER
  return (
    <div
      className="screening-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.overlayBg,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
        animation: 'fadeIn 0.25s ease'
      }}
      onClick={(e) => {
        // Prevent dismissal by clicking backdrop
        e.stopPropagation();
      }}
    >
      <div
        className="screening-modal-content"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '92vh',
          backgroundColor: colors.modalBg,
          color: colors.textPrimary,
          borderRadius: '18px',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 121, 0, 0.25)',
          border: `1px solid ${colors.borderColor}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'confirmFadeScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Header with SmartHire Branding */}
        <div
          style={{
            background: colors.headerBg,
            color: '#ffffff',
            padding: '24px 28px',
            position: 'relative',
            borderBottom: `4px solid ${colors.headerBorder}`
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '10px'
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: isDark ? 'rgba(255, 121, 0, 0.16)' : 'rgba(255, 121, 0, 0.2)',
                color: '#FF7900',
                border: '1px solid rgba(255, 121, 0, 0.45)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              🎉 ATS Benchmark Matched ({atsScore || 60}% &ge; {atsThreshold || 60}%)
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.22)',
                color: isDark ? '#fca5a5' : '#ef4444',
                border: isDark ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(239, 68, 68, 0.45)',
                padding: '4px 12px',
                borderRadius: '14px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.04em'
              }}
            >
              <i className="bi bi-lock-fill"></i> MANDATORY RESPONSE
            </span>
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Candidate Pre-Screening Questionnaire
          </h2>
          <p style={{ fontSize: '0.88rem', color: isDark ? '#cbd5e1' : 'rgba(255, 255, 255, 0.85)', margin: '6px 0 0 0' }}>
            Applying for: <strong style={{ color: '#FF7900' }}>{jobTitle || 'Target Job Role'}</strong> &bull; Complete all required questions below to submit your application.
          </p>
        </div>

        {/* Mandatory Advisory Banner */}
        <div
          style={{
            background: colors.advisoryBg,
            borderBottom: `1px solid ${colors.advisoryBorder}`,
            padding: '12px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.84rem',
            color: colors.advisoryText,
            lineHeight: 1.45
          }}
        >
          <i className="bi bi-shield-lock-fill" style={{ fontSize: '1.25rem', color: '#EA580C', flexShrink: 0 }}></i>
          <div>
            <strong>Compulsory Step:</strong> Your ATS score meets the qualification criteria! You must answer all required pre-screening questions to proceed. Closing this window or leaving this page without submitting will cancel your application.
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
            maxHeight: 'calc(92vh - 220px)',
            flex: 1
          }}
        >
          {errorMsg && (
            <div
              className="alert alert-danger"
              style={{
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem'
              }}
            >
              <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '1.1rem', flexShrink: 0 }}></i>
              <div>{errorMsg}</div>
            </div>
          )}

          <form id="screening-modal-form" onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {questions.map((q, idx) => {
                const qKey = q.id != null ? q.id : idx;
                const isAnswered = answers[qKey] && String(answers[qKey]).trim().length > 0;

                return (
                  <div
                    key={qKey}
                    style={{
                      background: colors.cardBg,
                      border: isAnswered ? '1.5px solid #10b981' : `1px solid ${colors.cardBorder}`,
                      borderRadius: '12px',
                      padding: '18px 20px',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      boxShadow: isAnswered ? '0 2px 10px rgba(16, 185, 129, 0.12)' : 'none'
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        fontWeight: 700,
                        fontSize: '0.94rem',
                        marginBottom: '12px',
                        color: colors.textPrimary
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          background: isAnswered ? '#10b981' : (isDark ? '#334155' : '#203B60'),
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          flexShrink: 0
                        }}
                      >
                        {isAnswered ? '✓' : idx + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        {q.questionText}
                        {q.required !== false && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                      </div>
                    </label>

                    {q.questionType === 'MULTIPLE_CHOICE' && q.options && q.options.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                        {q.options.map((opt, optIdx) => {
                          const isSelected = answers[qKey] === opt;
                          return (
                            <label
                              key={optIdx}
                              ref={idx === 0 && optIdx === 0 ? firstInputRef : null}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                background: isSelected ? colors.optionSelectedBg : colors.optionUnselectedBg,
                                border: `1.5px solid ${isSelected ? colors.optionSelectedBorder : colors.optionUnselectedBorder}`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: isSelected ? 700 : 500,
                                color: isSelected ? colors.optionSelectedText : colors.optionUnselectedText,
                                transition: 'all 0.15s ease',
                                boxShadow: isSelected ? '0 2px 8px rgba(255, 121, 0, 0.18)' : 'none'
                              }}
                            >
                              <input
                                type="radio"
                                name={`screening_q_${qKey}`}
                                value={opt}
                                checked={isSelected}
                                onChange={() => handleAnswerChange(qKey, opt)}
                                style={{ accentColor: '#FF7900', cursor: 'pointer', width: '16px', height: '16px' }}
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <textarea
                        ref={idx === 0 ? firstInputRef : null}
                        rows={3}
                        className="form-control"
                        placeholder="Type your response here..."
                        required={q.required !== false}
                        value={answers[qKey] || ''}
                        onChange={(e) => handleAnswerChange(qKey, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          fontSize: '0.9rem',
                          borderRadius: '8px',
                          border: `1px solid ${colors.inputBorder}`,
                          backgroundColor: colors.inputBg,
                          color: colors.inputText,
                          outline: 'none',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </form>
        </div>

        {/* Modal Sticky Footer */}
        <div
          style={{
            padding: '18px 28px',
            borderTop: `1px solid ${colors.footerBorder}`,
            background: colors.footerBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ fontSize: '0.82rem', color: colors.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="bi bi-shield-check" style={{ color: '#10b981', fontSize: '1rem' }}></i>
            <span>
              Compulsory Step &bull; {Object.keys(answers).filter((k) => answers[k] && String(answers[k]).trim()).length} of {questions.length} Answered
            </span>
          </div>

          <button
            type="submit"
            form="screening-modal-form"
            className="btn btn-primary"
            disabled={submitting}
            style={{
              padding: '11px 26px',
              fontWeight: 800,
              fontSize: '0.94rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #FF7900 0%, #EA580C 100%)',
              border: 'none',
              borderRadius: '9px',
              boxShadow: '0 4px 14px rgba(255, 121, 0, 0.35)',
              color: '#ffffff',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            <i className={`bi ${submitting ? 'bi-arrow-repeat bi-spin' : 'bi-send-check-fill'}`}></i>
            {submitting ? 'Submitting Responses...' : 'Submit Questionnaire & Complete Application'}
          </button>
        </div>
      </div>
    </div>
  );
}
