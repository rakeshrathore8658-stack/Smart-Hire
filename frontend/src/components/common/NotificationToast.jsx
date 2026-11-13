import React, { useEffect, useState } from 'react';
import { formatTimeAgo, formatExactDateTime } from '../../utils/timeAgo';
import { formatNotificationDisplay } from '../../utils/notificationFormatter';

export default function NotificationToast({ notification, onClose, onClick }) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 6000);
    return () => clearTimeout(timer);
  }, [notification]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!notification) return null;

  const display = formatNotificationDisplay(notification);

  return (
    <>
      <style>{`
        @keyframes toastSlideIn {
          0% {
            transform: translateX(110%) scale(0.9);
            opacity: 0;
          }
          70% {
            transform: translateX(-8px) scale(1.02);
            opacity: 1;
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes toastSlideOut {
          0% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateX(110%) scale(0.85);
            opacity: 0;
          }
        }
        @keyframes toastPulseRing {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 121, 0, 0.5);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(255, 121, 0, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 121, 0, 0);
          }
        }
        @keyframes toastCountdown {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div
        role="alert"
        aria-live="assertive"
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 999998,
          maxWidth: '380px',
          width: 'calc(100vw - 48px)',
          background: 'var(--bg-card, #ffffff)',
          color: 'var(--text-primary, #1e293b)',
          borderRadius: '12px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08)',
          border: '1px solid var(--border-color, rgba(0, 0, 0, 0.1))',
          overflow: 'hidden',
          animation: isClosing ? 'toastSlideOut 0.3s forwards ease-in' : 'toastSlideIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
        }}
        onClick={() => {
          if (onClick) onClick(notification);
          handleClose();
        }}
      >
        <div style={{ padding: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          {/* Animated Glowing Icon */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ff7900 0%, #ea580c 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              flexShrink: 0,
              animation: 'toastPulseRing 2s infinite',
            }}
          >
            <i className={`bi ${display.badge.icon || 'bi-bell-fill'}`}></i>
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#ff7900',
                }}
              >
                {display.badge.text}
              </span>
              <span
                style={{
                  fontSize: '0.74rem',
                  color: 'var(--text-muted, #94a3b8)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title={`Exact Timestamp: ${formatExactDateTime(notification.createdAt)}`}
              >
                <i className="bi bi-clock"></i> {formatTimeAgo(notification.createdAt)}
              </span>
            </div>

            <h4
              style={{
                fontSize: '0.92rem',
                fontWeight: 700,
                margin: '0 0 4px',
                color: 'var(--text-primary, #0f172a)',
                lineHeight: 1.3,
              }}
            >
              {display.title}
            </h4>

            <p
              style={{
                fontSize: '0.82rem',
                margin: 0,
                color: 'var(--text-secondary, #64748b)',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {display.message}
            </p>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              fontSize: '1.1rem',
              cursor: 'pointer',
              padding: '2px',
              lineHeight: 1,
            }}
            aria-label="Close notification"
          >
            &times;
          </button>
        </div>

        {/* 6-second countdown bar */}
        <div
          style={{
            height: '3px',
            background: 'linear-gradient(90deg, #ff7900, #10b981)',
            width: '100%',
            animation: 'toastCountdown 6s linear forwards',
          }}
        />
      </div>
    </>
  );
}
