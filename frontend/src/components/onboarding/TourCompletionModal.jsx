import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';

export default function TourCompletionModal() {
  const {
    showCompletionModal,
    setShowCompletionModal,
    isHr,
  } = useOnboarding();
  const navigate = useNavigate();

  if (!showCompletionModal) return null;

  const handleFinish = () => {
    setShowCompletionModal(false);
    if (!isHr) {
      navigate('/dashboard/resumeanalyzer');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="smarthire-welcome-backdrop" role="dialog" aria-modal="true" aria-labelledby="tour-completion-title">
      <div className="smarthire-completion-modal">
        {/* Success Animated Badge */}
        <div className="smarthire-completion-badge">
          <i className="bi bi-patch-check-fill"></i>
        </div>

        {/* Title & Description */}
        <h2 id="tour-completion-title" className="smarthire-completion-title">
          {!isHr ? "You're All Set!" : 'Your Recruiter Workspace is Ready!'}
        </h2>

        <p className="smarthire-completion-description">
          {!isHr
            ? 'You now know how to upload your resume, perform AI analysis, and understand your ATS score.'
            : "Explore SmartHire's recruitment management and AI-powered candidate evaluation features."}
        </p>

        {/* Action Button */}
        <button
          type="button"
          className="smarthire-welcome-btn-primary"
          onClick={handleFinish}
          style={{ maxWidth: '320px', margin: '0 auto' }}
        >
          <i className="bi bi-rocket-takeoff-fill"></i>
          <span>{!isHr ? 'Start Exploring SmartHire' : 'Explore Recruiter Dashboard'}</span>
        </button>
      </div>
    </div>
  );
}
