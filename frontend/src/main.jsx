import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { OnboardingProvider } from './context/OnboardingContext'
import App from './App.jsx'

// Application Stylesheets
import './styles/bootstrap-icons.min.css'
import './styles/style.css'
import './styles/dashboard.css'
import './styles/analyzer.css'
import './styles/ats-checker.css'
import './styles/history.css'
import './styles/hr.css'
import './styles/auth.css'
import './styles/onboarding.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <OnboardingProvider>
              <App />
            </OnboardingProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
