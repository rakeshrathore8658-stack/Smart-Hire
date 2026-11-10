import React from 'react';
import { Link } from 'react-router-dom';

const StatCard = ({
  to,
  label,
  value,
  unit,
  icon,
  iconTheme = 'navy', // 'navy', 'orange', 'green', 'purple', 'info'
  trend = null, // e.g. "+12% this week"
  trendType = 'up', // 'up', 'down', 'neutral'
  title = '',
  className = '',
}) => {
  const CardWrapper = to ? Link : 'div';
  const wrapperProps = to
    ? { to, className: `stat-card stat-card-interactive ${className}`, title }
    : { className: `stat-card ${className}`, title };

  return (
    <CardWrapper {...wrapperProps}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className={`stat-icon icon-${iconTheme}`}>
          <i className={`bi ${icon}`}></i>
        </span>
      </div>
      <div className="stat-value-row">
        <span className="stat-value">{value}</span>
        {trend && (
          <span className={`stat-trend trend-${trendType}`}>
            <i className={`bi bi-arrow-${trendType === 'up' ? 'up-short' : 'down-short'}`}></i>
            {trend}
          </span>
        )}
      </div>
      {unit && <span className="stat-unit">{unit}</span>}
    </CardWrapper>
  );
};

export default StatCard;
