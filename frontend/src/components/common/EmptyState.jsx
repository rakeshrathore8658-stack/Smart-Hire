import React from 'react';
import { Link } from 'react-router-dom';

const EmptyState = ({
  icon = 'bi-inbox',
  title = 'No records found',
  description = 'There is currently no data to display.',
  actionLabel = null,
  actionLink = null,
  onAction = null,
  actionIcon = 'bi-plus-lg',
  className = '',
}) => {
  return (
    <div className={`smarthire-empty-state ${className}`}>
      <div className="empty-state-icon-wrapper">
        <i className={`bi ${icon}`}></i>
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {actionLabel && (
        <div className="empty-state-action">
          {actionLink ? (
            <Link to={actionLink} className="btn btn-primary btn-sm">
              {actionIcon && <i className={`bi ${actionIcon}`}></i>} {actionLabel}
            </Link>
          ) : onAction ? (
            <button type="button" onClick={onAction} className="btn btn-primary btn-sm">
              {actionIcon && <i className={`bi ${actionIcon}`}></i>} {actionLabel}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
