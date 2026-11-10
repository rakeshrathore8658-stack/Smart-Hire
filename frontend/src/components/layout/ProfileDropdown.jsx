import React, { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOnboarding } from '../../context/OnboardingContext';

const ProfileDropdown = ({ isOpen, onClose }) => {
  const { user, role, logout } = useAuth();
  const { restartTour } = useOnboarding();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const isHr = role === 'HR' || role === 'RECRUITER';
  const initial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U';

  // Calculate profile completion percentage dynamically
  const calculateCompletion = () => {
    let score = 0;
    let total = 4;
    if (user?.fullName) score++;
    if (user?.email) score++;
    if (user?.phoneNumber) score++;
    if (isHr ? user?.companyName : user?.careerRole) score++;
    return Math.round((score / total) * 100);
  };

  const completionPercent = calculateCompletion();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  if (!isOpen) return null;

  return (
    <div className="profile-dropdown-menu floating-card" ref={dropdownRef} role="dialog" aria-label="User Account Menu">
      {/* User Header Profile Card */}
      <div className="profile-card-header">
        <div className="profile-card-user-info">
          <div className="profile-card-avatar" aria-hidden="true">
            {initial}
          </div>
          <div className="profile-card-details">
            <h4 className="profile-card-name">{user?.fullName || 'User Account'}</h4>
            <span className="profile-card-email" title={user?.email}>
              {user?.email || 'user@smarthire.ai'}
            </span>
            <div className="profile-card-badge-row">
              <span className={`profile-role-badge ${isHr ? 'role-hr' : 'role-seeker'}`}>
                <i className={`bi ${isHr ? 'bi-briefcase' : 'bi-person-badge'}`}></i>
                {isHr ? 'HR Recruiter' : 'Job Seeker'}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Completion Meter */}
        <div className="profile-completion-box">
          <div className="completion-top">
            <span className="completion-label">
              <i className="bi bi-shield-check"></i> Profile Completion
            </span>
            <span className="completion-percent">{completionPercent}%</span>
          </div>
          <div className="completion-bar-track">
            <div
              className="completion-bar-fill"
              style={{
                width: `${completionPercent}%`,
                background: completionPercent >= 80 ? 'var(--success)' : 'var(--accent)',
              }}
            ></div>
          </div>
          {completionPercent < 100 && (
            <Link
              to="/dashboard/profile"
              onClick={onClose}
              className="completion-link"
            >
              Complete profile to unlock all features &rarr;
            </Link>
          )}
        </div>
      </div>

      <div className="dropdown-divider"></div>

      {/* Navigation Options */}
      <nav className="profile-nav-list" aria-label="Profile navigation">
        <Link to="/dashboard/profile" onClick={onClose} className="profile-nav-item">
          <span className="nav-item-icon"><i className="bi bi-person"></i></span>
          <div className="nav-item-text">
            <span className="nav-item-title">My Profile</span>
            <span className="nav-item-sub">Personal details &amp; resume info</span>
          </div>
        </Link>

        <Link to="/dashboard/settings" onClick={onClose} className="profile-nav-item">
          <span className="nav-item-icon"><i className="bi bi-gear"></i></span>
          <div className="nav-item-text">
            <span className="nav-item-title">Account Settings</span>
            <span className="nav-item-sub">Security, password &amp; preferences</span>
          </div>
        </Link>

        <Link to="/dashboard/notifications" onClick={onClose} className="profile-nav-item">
          <span className="nav-item-icon"><i className="bi bi-bell"></i></span>
          <div className="nav-item-text">
            <span className="nav-item-title">Notifications</span>
            <span className="nav-item-sub">Alerts &amp; activity updates</span>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => {
            onClose();
            restartTour();
          }}
          className="profile-nav-item"
          style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
        >
          <span className="nav-item-icon"><i className="bi bi-compass"></i></span>
          <div className="nav-item-text">
            <span className="nav-item-title">Product Tour</span>
            <span className="nav-item-sub">Interactive feature walkthrough</span>
          </div>
        </button>

        <Link to="/dashboard/help" onClick={onClose} className="profile-nav-item">
          <span className="nav-item-icon"><i className="bi bi-question-circle"></i></span>
          <div className="nav-item-text">
            <span className="nav-item-title">Help &amp; Support</span>
            <span className="nav-item-sub">FAQs, documentation &amp; guides</span>
          </div>
        </Link>
      </nav>

      <div className="dropdown-divider"></div>

      {/* Sign Out Section */}
      <div className="profile-card-footer">
        <button
          type="button"
          className="profile-signout-action"
          onClick={handleLogout}
        >
          <span className="signout-icon"><i className="bi bi-box-arrow-right"></i></span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default ProfileDropdown;
