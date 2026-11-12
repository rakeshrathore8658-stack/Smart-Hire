import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Reusable, theme-styled action confirmation popover that anchors directly
 * adjacent to the clicked action button (replaces browser window.confirm).
 */
const ConfirmPopover = ({
  anchorEl,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = true,
  loading = false,
  onConfirm,
  onClose,
}) => {
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: 'bottom' });

  // Calculate coordinates relative to viewport so it never gets clipped by table overflow
  useLayoutEffect(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const popoverWidth = 280;
    const popoverHeight = 140;

    // Check vertical space: prefer bottom, fallback to top if close to bottom
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight + 16 && rect.top > popoverHeight + 16;

    let top = placeAbove
      ? rect.top - popoverHeight - 8
      : rect.bottom + 8;

    // Align to the right edge of anchor button by default (typical for action columns)
    let left = rect.right - popoverWidth;

    // Clamp horizontally to stay within viewport
    if (left < 12) left = 12;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }

    setCoords({
      top: Math.max(10, top),
      left,
      placement: placeAbove ? 'top' : 'bottom',
    });
  }, [anchorEl]);

  // Click outside and Escape key listeners
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        anchorEl &&
        !anchorEl.contains(e.target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorEl, onClose]);

  if (!anchorEl || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={popoverRef}
      className={`action-confirm-popover ${coords.placement}`}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        zIndex: 99999,
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="confirm-popover-content">
        <div className="confirm-popover-header">
          <span className={`confirm-icon ${danger ? 'danger' : 'warning'}`}>
            <i className={`bi ${danger ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'}`}></i>
          </span>
          <div className="confirm-popover-text">
            <h4 className="confirm-popover-title">{title}</h4>
            <p className="confirm-popover-message">{message}</p>
          </div>
        </div>

        <div className="confirm-popover-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm confirm-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'} confirm-btn-ok`}
            onClick={() => {
              if (onConfirm) onConfirm();
            }}
            disabled={loading}
            autoFocus
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '12px', height: '12px', marginRight: '5px' }}></span>
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmPopover;
