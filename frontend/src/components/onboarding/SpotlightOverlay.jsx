import React, { useEffect } from 'react';
import { useOnboarding } from '../../context/OnboardingContext';

export default function SpotlightOverlay() {
  const {
    isActive,
    targetRect,
    sidebarRect,
    nextStep,
    prevStep,
    skipTour,
  } = useOnboarding();

  // Keyboard navigation: Escape (Skip), Right Arrow (Next), Left Arrow (Back)
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        skipTour();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, prevStep, skipTour]);

  if (!isActive) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  const hasTarget =
    Boolean(targetRect) &&
    targetRect.width > 10 &&
    targetRect.height > 10 &&
    targetRect.right > 15 &&
    targetRect.left < vw - 15;

  // Cutout coordinates clamped strictly to visible viewport bounds
  const x = hasTarget ? Math.max(4, targetRect.left) : 0;
  const y = hasTarget ? Math.max(4, targetRect.top) : 0;
  const width = hasTarget ? Math.max(0, Math.min(vw - x - 4, targetRect.width)) : 0;
  const height = hasTarget ? Math.max(0, Math.min(vh - y - 4, targetRect.height)) : 0;
  const rx = 12;

  // Sidebar / Slider bar navigation item cutout coordinates
  const hasSidebarTarget =
    Boolean(sidebarRect) &&
    sidebarRect.width > 10 &&
    sidebarRect.height > 10 &&
    sidebarRect.right > 15 &&
    sidebarRect.left < vw - 15;

  const sidebarX = hasSidebarTarget ? Math.max(4, sidebarRect.left) : 0;
  const sidebarY = hasSidebarTarget ? Math.max(4, sidebarRect.top) : 0;
  const sidebarWidth = hasSidebarTarget ? Math.max(0, Math.min(vw - sidebarX - 4, sidebarRect.width)) : 0;
  const sidebarHeight = hasSidebarTarget ? Math.max(0, Math.min(vh - sidebarY - 4, sidebarRect.height)) : 0;
  const sidebarRx = 10;

  return (
    <>
      {/* SVG Fullscreen Cutout Mask */}
      <div className="smarthire-spotlight-backdrop" aria-hidden="true">
        <svg
          className="smarthire-spotlight-svg"
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
        >
          <defs>
            <mask id="smarthire-spotlight-mask">
              {/* White background covers everything */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Black cutout reveals the target element */}
              {hasTarget && (
                <rect
                  className="smarthire-spotlight-cutout"
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  rx={rx}
                  ry={rx}
                  fill="black"
                />
              )}
              {/* Black cutout reveals the sidebar navigation link */}
              {hasSidebarTarget && (
                <rect
                  className="smarthire-spotlight-cutout smarthire-sidebar-cutout"
                  x={sidebarX}
                  y={sidebarY}
                  width={sidebarWidth}
                  height={sidebarHeight}
                  rx={sidebarRx}
                  ry={sidebarRx}
                  fill="black"
                />
              )}
            </mask>
          </defs>

          {/* Masked Translucent Overlay */}
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(15, 23, 42, 0.65)"
            mask="url(#smarthire-spotlight-mask)"
          />
        </svg>
      </div>

      {/* Animated SmartHire Orange Spotlight Highlight Ring */}
      {hasTarget && (
        <div
          className="smarthire-spotlight-ring"
          style={{
            top: `${y}px`,
            left: `${x}px`,
            width: `${width}px`,
            height: `${height}px`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Animated SmartHire Orange Spotlight Highlight Ring for Sidebar Navigation Link */}
      {hasSidebarTarget && (
        <div
          className="smarthire-spotlight-ring smarthire-sidebar-highlight-ring"
          style={{
            top: `${sidebarY}px`,
            left: `${sidebarX}px`,
            width: `${sidebarWidth}px`,
            height: `${sidebarHeight}px`,
          }}
          aria-hidden="true"
        >
          <span className="smarthire-sidebar-pulse-dot" />
        </div>
      )}
    </>
  );
}
