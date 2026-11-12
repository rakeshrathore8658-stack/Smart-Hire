import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * TopLoadingBar
 * Sleek, modern YouTube/GitHub-style top progress bar that animates across the viewport
 * on every page navigation and when API requests are active.
 */
export default function TopLoadingBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const activeRequestsRef = useRef(0);
  const timerRef = useRef(null);

  const startProgress = () => {
    setVisible(true);
    setProgress((prev) => (prev < 20 ? 25 : prev));

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          clearInterval(timerRef.current);
          return 85;
        }
        const step = Math.max(1, Math.floor((90 - prev) / 6));
        return prev + step;
      });
    }, 120);
  };

  const completeProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 350);
  };

  // Route change trigger
  useEffect(() => {
    startProgress();
    const timeout = setTimeout(() => {
      if (activeRequestsRef.current === 0) {
        completeProgress();
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [location.pathname, location.search]);

  // Global API event triggers
  useEffect(() => {
    const handleStart = () => {
      activeRequestsRef.current += 1;
      startProgress();
    };

    const handleEnd = () => {
      activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
      if (activeRequestsRef.current === 0) {
        completeProgress();
      }
    };

    window.addEventListener('smarthire:loading-start', handleStart);
    window.addEventListener('smarthire:loading-end', handleEnd);

    return () => {
      window.removeEventListener('smarthire:loading-start', handleStart);
      window.removeEventListener('smarthire:loading-end', handleEnd);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3.5px',
        zIndex: 999999,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #ff7900 0%, #f59e0b 50%, #10b981 100%)',
          boxShadow: '0 0 10px rgba(255, 121, 0, 0.7), 0 0 5px rgba(16, 185, 129, 0.5)',
          transition: progress === 100 ? 'width 0.2s ease-out, opacity 0.3s ease-out' : 'width 0.25s cubic-bezier(0.1, 0.5, 0.1, 1)',
          opacity: visible ? 1 : 0,
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  );
}
