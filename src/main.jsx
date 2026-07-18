import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/common/ToastNotification';
import { ClinicSettingsProvider } from './contexts/ClinicSettingsContext';
import * as Sentry from '@sentry/react';
import logger from './utils/logger';
import './styles/theme.css';
import './styles/index.css';
import './styles/animations.css';

const dsn = import.meta.env.VITE_SENTRY_DSN;
const isProd = import.meta.env.PROD;

if (isProd && dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
  logger.info('[Sentry] Initialized successfully in production environment.');
} else {
  logger.info('[Sentry] Running in fallback safe console-logging mode.');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ClinicSettingsProvider>
              <App />
            </ClinicSettingsProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
