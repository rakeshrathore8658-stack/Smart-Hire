import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isMobileOpen, isCollapsed, toggleSidebar, closeSidebar, closeMobileOnly }) => {
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const isHr = role === 'HR' || role === 'RECRUITER';

  const handleLogout = async () => {
    if (closeMobileOnly) closeMobileOnly();
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className={`dashboard-sidebar ${isMobileOpen ? 'is-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      id="dashboardSidebar"
      aria-label="Dashboard navigation"
    >
      {/* SmartHire Brand & Collapse Toggle Button */}
      <div className="sidebar-header-row">
        <Link className="dashboard-brand" to="/dashboard" onClick={closeMobileOnly} title="SmartHire Home">
          <span className="brand-mark" aria-hidden="true">///</span>
          <span className="brand-name">
            SmartHire<span className="brand-accent">.</span>
          </span>
        </Link>
        {(!isCollapsed || isMobileOpen) && (
          <button
            type="button"
            className="sidebar-collapse-btn"
            id="sidebarCloseBtn"
            onClick={() => {
              if (window.innerWidth <= 900) {
                closeSidebar();
              } else {
                toggleSidebar();
              }
            }}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <i className="bi bi-chevron-left"></i>
          </button>
        )}
      </div>

      {/* Role Indicator Pill */}
      <div className="sidebar-role-indicator">
        <span className={`sidebar-role-badge ${isHr ? 'role-hr' : 'role-seeker'}`}>
          <i className={`bi ${isHr ? 'bi-briefcase' : 'bi-person-badge'} badge-icon`}></i>
          <span className="role-text">{isHr ? 'RECRUITER PORTAL' : 'JOB SEEKER PORTAL'}</span>
        </span>
      </div>

      {/* Navigation Scroll Container */}
      <div className="sidebar-nav-container">
        {/* Job Seeker Navigation */}
        {!isHr && (
          <div className="sidebar-role-menu" id="seekerSidebarNav">
            <div className="sidebar-section-label">WORKSPACE</div>
            <nav className="sidebar-nav" aria-label="Job Seeker Navigation">
              <NavLink
                to="/dashboard"
                end
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileOnly}
                title="Dashboard Overview"
                data-tour="nav-dashboard"
              >
                <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-speedometer2"></i></span>
                <span className="sidebar-link-text">Dashboard</span>
              </NavLink>

              <NavLink
                to="/dashboard/resumeanalyzer"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileOnly}
                title="AI Resume Analyzer"
                data-tour="nav-resumeanalyzer"
              >
                <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-cpu"></i></span>
                <span className="sidebar-link-text">Resume Analyzer</span>
                <span className="nav-badge-pill">AI</span>
              </NavLink>

              <NavLink
                to="/dashboard/analyzerhistory"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileOnly}
                title="Analyzer Scan History"
                data-tour="nav-analyzerhistory"
              >
                <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-clock-history"></i></span>
                <span className="sidebar-link-text">Analyzer History</span>
              </NavLink>

              <NavLink
                to="/dashboard/jobroles"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileOnly}
                title="Target Job Profiles"
                data-tour="nav-jobroles"
              >
                <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-compass"></i></span>
                <span className="sidebar-link-text">Job Roles</span>
              </NavLink>

              <NavLink
                to="/dashboard/resumeimprovement"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileOnly}
                title="Resume Improvement Guide"
                data-tour="nav-resumeimprovement"
              >
                <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-graph-up-arrow"></i></span>
                <span className="sidebar-link-text">Resume Improvement</span>
              </NavLink>

              <NavLink
                to="/dashboard/skillsgap"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileOnly}
                title="Skills Gap Matrix"
                data-tour="nav-skillsgap"
              >
                <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-bullseye"></i></span>
                <span className="sidebar-link-text">Skills Gap Analysis</span>
              </NavLink>
            </nav>
          </div>
        )}

        {/* HR / Recruiter Navigation */}
        {isHr && (
          <div className="sidebar-role-menu" id="hrSidebarNav">
            <div className="sidebar-section-label">TALENT ACQUISITION</div>
            <nav className="sidebar-nav" aria-label="Recruiter Navigation">
              <NavLink
                to="/dashboard"
                end
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileOnly}
                title="Recruiter Command Center"
                data-tour="nav-dashboard"
              >
                <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-speedometer2"></i></span>
                <span className="sidebar-link-text">HR Dashboard</span>
              </NavLink>

              <NavLink
                to="/dashboard/jobs"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileOnly}
                title="Manage Job Vacancies"
                data-tour="nav-jobs"
              >
                <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-briefcase"></i></span>
                <span className="sidebar-link-text">Job Management</span>
              </NavLink>

              <NavLink
                to="/dashboard/jobroles"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileOnly}
                title="Job Roles &amp; ATS Profiles"
                data-tour="nav-jobroles"
              >
                <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-compass"></i></span>
                <span className="sidebar-link-text">Job Roles &amp; Profiles</span>
              </NavLink>

              <NavLink
                to="/dashboard/candidates"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileOnly}
                title="Candidate Database"
                data-tour="nav-candidates"
              >
                <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-people"></i></span>
                <span className="sidebar-link-text">Candidates</span>
                <span className="nav-badge-pill">AI Match</span>
              </NavLink>

              <NavLink
                to="/dashboard/applications"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileOnly}
                title="Pipeline Applications"
                data-tour="nav-applications"
              >
                <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-inbox"></i></span>
                <span className="sidebar-link-text">Applications</span>
              </NavLink>

              <NavLink
                to="/dashboard/shortlist"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileOnly}
                title="Shortlisted Candidates"
                data-tour="nav-shortlist"
              >
                <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-star"></i></span>
                <span className="sidebar-link-text">Shortlisted</span>
              </NavLink>

              <NavLink
                to="/dashboard/candidates/archived"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileOnly}
                title="Archived &amp; Recently Deleted Candidates"
              >
                <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-archive"></i></span>
                <span className="sidebar-link-text">Archived Pool</span>
              </NavLink>

              <NavLink
                to="/dashboard/interviews"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileOnly}
                title="Interview Schedule"
                data-tour="nav-interviews"
              >
                <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-calendar2-week"></i></span>
                <span className="sidebar-link-text">Interviews</span>
              </NavLink>

              <NavLink
                to="/dashboard/feedback"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileOnly}
                title="Scorecards &amp; Feedback"
                data-tour="nav-feedback"
              >
                <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-chat-square-text"></i></span>
                <span className="sidebar-link-text">Interview Feedback</span>
              </NavLink>

              <NavLink
                to="/dashboard/reports"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileOnly}
                title="Recruitment Analytics"
                data-tour="nav-reports"
              >
                <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-bar-chart-line"></i></span>
                <span className="sidebar-link-text">Recruitment Reports</span>
              </NavLink>
            </nav>
          </div>
        )}

        {/* Account & Preferences (Shared) */}
        <div className="sidebar-section-label sidebar-section-spaced">ACCOUNT &amp; PREFERENCES</div>
        <nav className="sidebar-nav" aria-label="Account Navigation">
          <NavLink
            to="/dashboard/profile"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={closeMobileOnly}
            title="User Profile"
          >
            <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-person"></i></span>
            <span className="sidebar-link-text">Profile</span>
          </NavLink>

          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={closeMobileOnly}
            title="Platform Settings"
          >
            <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-gear"></i></span>
            <span className="sidebar-link-text">Settings</span>
          </NavLink>

          <NavLink
            to="/dashboard/notifications"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={closeMobileOnly}
            title="Notification Center"
          >
            <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-bell"></i></span>
            <span className="sidebar-link-text">Notifications</span>
          </NavLink>

          <NavLink
            to="/dashboard/help"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={closeMobileOnly}
            title="Help & Support Docs"
          >
            <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-question-circle"></i></span>
            <span className="sidebar-link-text">Help &amp; Support</span>
          </NavLink>
        </nav>

        {/* Sidebar Bottom Action / Promotion Card */}
        <div className="sidebar-bottom">
          {!isHr ? (
            <div className="sidebar-help-card">
              <span className="help-icon" aria-hidden="true"><i className="bi bi-stars"></i></span>
              <h3>Ready for your next role?</h3>
              <p>Analyze your resume against top industry profiles to stand out.</p>
              <Link to="/dashboard/resumeanalyzer" onClick={closeMobileOnly}>
                Start ATS Scan &rarr;
              </Link>
            </div>
          ) : (
            <div className="sidebar-help-card">
              <span className="help-icon" aria-hidden="true"><i className="bi bi-people"></i></span>
              <h3>Hire smarter &amp; faster</h3>
              <p>Screen resumes with AI match scores and structured interview feedback.</p>
              <Link to="/dashboard/jobs/new" onClick={closeMobileOnly}>
                Post New Vacancy &rarr;
              </Link>
            </div>
          )}

          <button
            type="button"
            className="sidebar-link sidebar-logout"
            onClick={handleLogout}
            title="Sign Out of SmartHire"
          >
            <span className="sidebar-icon" aria-hidden="true"><i className="bi bi-box-arrow-right"></i></span>
            <span className="sidebar-link-text">Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default React.memo(Sidebar);
