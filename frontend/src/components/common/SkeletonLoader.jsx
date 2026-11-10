import React from 'react';

const SkeletonLoader = ({ type = 'card', count = 3, className = '' }) => {
  if (type === 'table-row') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <tr key={i} className="skeleton-row">
            <td colSpan="6">
              <div className="skeleton-line full"></div>
            </td>
          </tr>
        ))}
      </>
    );
  }

  if (type === 'stat') {
    return (
      <div className={`stats-grid-skeleton ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="stat-card skeleton-card">
            <div className="skeleton-line short"></div>
            <div className="skeleton-line big"></div>
            <div className="skeleton-line tiny"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`skeleton-container ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line medium"></div>
          <div className="skeleton-line full"></div>
          <div className="skeleton-line short"></div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
