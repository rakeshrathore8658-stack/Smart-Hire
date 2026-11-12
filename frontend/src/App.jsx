import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout & Common
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import TopLoadingBar from './components/common/TopLoadingBar';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import NotFound from './pages/errors/NotFound';

// Shared Pages
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Help from './pages/Help';

// Job Seeker Pages
import SeekerDashboard from './pages/seeker/Dashboard';
import ResumeAnalyzer from './pages/seeker/ResumeAnalyzer';
import AnalyzerHistory from './pages/seeker/AnalyzerHistory';
import JobRoles from './pages/seeker/JobRoles';
import ResumeImprovement from './pages/seeker/ResumeImprovement';
import SkillsGap from './pages/seeker/SkillsGap';

// HR Recruiter Pages
import HrDashboard from './pages/hr/HrDashboard';
import JobManagement from './pages/hr/JobManagement';
import JobForm from './pages/hr/JobForm';
import JobDetails from './pages/hr/JobDetails';
import Applications from './pages/hr/Applications';
import Candidates from './pages/hr/Candidates';
import CandidateDetails from './pages/hr/CandidateDetails';
import Shortlist from './pages/hr/Shortlist';
import Interviews from './pages/hr/Interviews';
import Feedback from './pages/hr/Feedback';
import Reports from './pages/hr/Reports';

function RoleDashboard() {
  const { isHr } = useAuth();
  return isHr ? <HrDashboard /> : <SeekerDashboard />;
}

export default function App() {
  return (
    <>
      <TopLoadingBar />
      <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Authenticated Dashboard Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Dynamic Role Dashboard */}
        <Route index element={<RoleDashboard />} />

        {/* Job Seeker Portal Features */}
        <Route path="resumeanalyzer" element={<ResumeAnalyzer />} />
        <Route path="analyzerhistory" element={<AnalyzerHistory />} />
        <Route path="jobroles" element={<JobRoles />} />
        <Route path="resumeimprovement" element={<ResumeImprovement />} />
        <Route path="skillsgap" element={<SkillsGap />} />

        {/* HR Recruiter Portal Features */}
        <Route path="hr" element={<HrDashboard />} />
        <Route path="jobs" element={<JobManagement />} />
        <Route path="jobs/new" element={<JobForm />} />
        <Route path="jobs/create" element={<JobForm />} />
        <Route path="jobs/:id/edit" element={<JobForm />} />
        <Route path="jobs/:id" element={<JobDetails />} />
        <Route path="applications" element={<Applications />} />
        <Route path="candidates" element={<Candidates />} />
        <Route path="candidates/:id" element={<CandidateDetails />} />
        <Route path="shortlist" element={<Shortlist />} />
        <Route path="interviews" element={<Interviews />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="reports" element={<Reports />} />

        {/* Shared Account & Preferences */}
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="help" element={<Help />} />
      </Route>

      {/* Direct ATS Checker alias */}
      <Route
        path="/ats-checker"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ResumeAnalyzer />} />
      </Route>

      {/* Fallback 404 Page */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}
