import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="dashboard-footer">
      <div className="footer-left">
        <span>&copy; {new Date().getFullYear()} <strong>SmartHire</strong>. AI-Powered Resume Analyzer &amp; Recruitment Platform.</span>
      </div>
      <div className="footer-right">
        <Link to="/dashboard/help">Help Center</Link>
        <span className="footer-dot">&bull;</span>
        <Link to="/dashboard/settings">Privacy &amp; Terms</Link>
        <span className="footer-dot">&bull;</span>
        <span className="system-status-indicator">
          <span className="status-dot"></span> System Operational
        </span>
      </div>
    </footer>
  );
};

export default Footer;
