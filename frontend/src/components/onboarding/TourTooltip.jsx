import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '../../context/OnboardingContext';

export default function TourTooltip() {
  const {
    isActive,
    currentStepIndex,
    totalSteps,
    currentStep,
    targetRect,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    closeTour,
  } = useOnboarding();

  const tooltipRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: 'bottom' });

  // Compute responsive dynamic positioning
  useEffect(() => {
    if (!isActive || !currentStep) return;

    const computePosition = () => {
      const tooltipEl = tooltipRef.current;
      const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 380;
      const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 240;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 640;
      const margin = isMobile ? 10 : 16;
      const gap = isMobile ? 10 : 14;

      // Center placement when no target or explicitly center
      if (!targetRect || currentStep.placement === 'center' || currentStep.selector === null) {
        setCoords({
          top: Math.max(margin, (vh - tooltipHeight) / 2),
          left: Math.max(margin, (vw - tooltipWidth) / 2),
          placement: 'center',
        });
        return;
      }

      let desiredPlacement = currentStep.placement || 'bottom';
      let calculatedTop = 0;
      let calculatedLeft = 0;

      // Mobile smart positioning: stack above or below target depending on available space
      if (isMobile) {
        const spaceBelow = vh - targetRect.bottom;
        const spaceAbove = targetRect.top;

        if (spaceBelow >= tooltipHeight + gap) {
          calculatedTop = targetRect.bottom + gap;
          desiredPlacement = 'bottom';
        } else if (spaceAbove >= tooltipHeight + gap) {
          calculatedTop = targetRect.top - tooltipHeight - gap;
          desiredPlacement = 'top';
        } else if (spaceBelow >= spaceAbove) {
          calculatedTop = Math.min(vh - tooltipHeight - margin, targetRect.bottom + gap);
          desiredPlacement = 'bottom';
        } else {
          calculatedTop = Math.max(margin, targetRect.top - tooltipHeight - gap);
          desiredPlacement = 'top';
        }
        calculatedLeft = margin;
      } else {
        // Desktop / Tablet positioning
        if (desiredPlacement === 'bottom') {
          calculatedTop = targetRect.bottom + gap;
          calculatedLeft = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;

          // Flip to top if overflow bottom
          if (calculatedTop + tooltipHeight > vh - margin && targetRect.top - tooltipHeight - gap >= margin) {
            calculatedTop = targetRect.top - tooltipHeight - gap;
            desiredPlacement = 'top';
          }
        } else if (desiredPlacement === 'top') {
          calculatedTop = targetRect.top - tooltipHeight - gap;
          calculatedLeft = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;

          // Flip to bottom if overflow top
          if (calculatedTop < margin && targetRect.bottom + tooltipHeight + gap <= vh - margin) {
            calculatedTop = targetRect.bottom + gap;
            desiredPlacement = 'bottom';
          }
        } else if (desiredPlacement === 'right') {
          calculatedLeft = targetRect.right + gap;
          calculatedTop = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;

          // Flip to left or bottom if overflow right
          if (calculatedLeft + tooltipWidth > vw - margin) {
            if (targetRect.left - tooltipWidth - gap >= margin) {
              calculatedLeft = targetRect.left - tooltipWidth - gap;
              desiredPlacement = 'left';
            } else {
              calculatedTop = targetRect.bottom + gap;
              calculatedLeft = targetRect.left;
              desiredPlacement = 'bottom';
            }
          }
        } else if (desiredPlacement === 'left') {
          calculatedLeft = targetRect.left - tooltipWidth - gap;
          calculatedTop = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;

          // Flip to right or bottom if overflow left
          if (calculatedLeft < margin) {
            if (targetRect.right + tooltipWidth + gap <= vw - margin) {
              calculatedLeft = targetRect.right + gap;
              desiredPlacement = 'right';
            } else {
              calculatedTop = targetRect.bottom + gap;
              calculatedLeft = targetRect.left;
              desiredPlacement = 'bottom';
            }
          }
        }
      }

      // Clamp coordinates strictly within viewport bounds
      const clampedLeft = Math.max(margin, Math.min(vw - tooltipWidth - margin, calculatedLeft));
      const clampedTop = Math.max(margin, Math.min(vh - tooltipHeight - margin, calculatedTop));

      setCoords({
        top: clampedTop,
        left: clampedLeft,
        placement: desiredPlacement,
      });
    };

    computePosition();
    const handleReposition = () => requestAnimationFrame(computePosition);
    window.addEventListener('resize', handleReposition, { passive: true });
    window.addEventListener('scroll', handleReposition, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, { capture: true });
    };
  }, [isActive, currentStep, targetRect]);

  if (!isActive || !currentStep) return null;

  const isLastStep = currentStepIndex === totalSteps - 1;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  return (
    <div
      ref={tooltipRef}
      className={`smarthire-tour-tooltip placement-${coords.placement}`}
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
      role="dialog"
      aria-labelledby="smarthire-tour-title"
      aria-describedby="smarthire-tour-desc"
    >
      {/* Tooltip Header: Step Badge & Close Button */}
      <div className="smarthire-tour-header">
        <span className="smarthire-tour-step-badge">
          <i className="bi bi-compass"></i>
          {currentStep.badge || `STEP 0${currentStepIndex + 1} OF ${totalSteps}`}
        </span>
        <button
          type="button"
          className="smarthire-tour-close-btn"
          onClick={closeTour}
          aria-label="Close tour walkthrough"
          title="Close tour"
        >
          &times;
        </button>
      </div>

      {/* Tooltip Title & Description */}
      <h4 id="smarthire-tour-title" className="smarthire-tour-title">
        {currentStep.icon && <i className={`bi ${currentStep.icon}`}></i>}
        <span>{currentStep.title}</span>
      </h4>

      <p id="smarthire-tour-desc" className="smarthire-tour-description">
        {currentStep.description}
      </p>

      {/* Animated Progress Bar */}
      <div
        className="smarthire-tour-progress-track"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          className="smarthire-tour-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Tooltip Footer Actions */}
      <div className="smarthire-tour-footer">
        <button
          type="button"
          className="smarthire-tour-skip-btn"
          onClick={skipTour}
          title="Skip tutorial and explore freely"
        >
          Skip Tour
        </button>

        <div className="smarthire-tour-nav-btns">
          <button
            type="button"
            className="smarthire-tour-back-btn"
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            title="Go to previous step"
          >
            Back
          </button>

          <button
            type="button"
            className="smarthire-tour-next-btn"
            onClick={isLastStep ? completeTour : nextStep}
            title={isLastStep ? 'Finish product tour' : 'Continue to next step'}
          >
            <span>{isLastStep ? 'Finish Tour' : 'Next'}</span>
            <i className={`bi ${isLastStep ? 'bi-check2' : 'bi-arrow-right'}`}></i>
          </button>
        </div>
      </div>
    </div>
  );
}
