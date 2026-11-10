import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import TourManager from '../onboarding/TourManager';

const DashboardLayout = ({ pageTitle }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('smarthire-sidebar-collapsed') === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth <= 900) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem('smarthire-sidebar-collapsed', String(next));
        return next;
      });
    }
  };

  const closeSidebar = () => {
    if (window.innerWidth <= 900) {
      setIsMobileOpen(false);
    } else {
      setIsCollapsed(true);
      localStorage.setItem('smarthire-sidebar-collapsed', 'true');
    }
  };

  const closeMobileOnly = () => {
    if (window.innerWidth <= 900) {
      setIsMobileOpen(false);
    }
  };

  // Sync body class for mobile drawer to prevent background scrolling
  useEffect(() => {
    if (isMobileOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => {
      document.body.classList.remove('sidebar-open');
    };
  }, [isMobileOpen]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen]);

  // Reset mobile drawer if resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900 && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileOpen]);

  return (
    <div className={`dashboard-layout ${isCollapsed ? 'sidebar-collapsed' : ''} ${isMobileOpen ? 'mobile-sidebar-open' : ''}`}>
      {/* Mobile Drawer Backdrop */}
      <div
        id="sidebarBackdrop"
        className={`sidebar-backdrop ${isMobileOpen ? 'active' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Shared Dashboard Sidebar */}
      <Sidebar
        isMobileOpen={isMobileOpen}
        isCollapsed={isCollapsed}
        toggleSidebar={toggleSidebar}
        closeSidebar={closeSidebar}
        closeMobileOnly={closeMobileOnly}
      />

      {/* Main Content Area */}
      <main className="dashboard-main">
        <Header
          pageTitle={pageTitle}
          toggleSidebar={toggleSidebar}
          isCollapsed={isCollapsed}
          isMobileOpen={isMobileOpen}
        />
        <div className="main-content">
          <Outlet />
        </div>
        <Footer />
      </main>

      {/* Enterprise Animated Spotlight Tour Navigator */}
      <TourManager />
    </div>
  );
};

export default DashboardLayout;
