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

const SENSITIVE_KEYS = ['nik', 'nama_pasien', 'nama_lengkap', 'alamat', 'alamat_detail', 'no_wa', 'no_telepon', 'diagnosa', 'keluhan', 'ciphertext', 'token', 'password', 'secret', 'auth'];

function sanitizePII(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePII);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(k => lowerKey.includes(k))) {
      sanitized[key] = '[SCRUBBED_PII]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizePII(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

if (isProd && dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (event.extra) {
        event.extra = sanitizePII(event.extra);
      }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(b => {
          if (b.data) b.data = sanitizePII(b.data);
          return b;
        });
      }
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
      }
      return event;
    }
  });
  logger.info('[Sentry] Initialized successfully with PII scrubbing in production.');
} else {
  logger.info('[Sentry] Running in fallback safe console-logging mode.');
}

import { PermissionsProvider } from './contexts/PermissionsContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <PermissionsProvider>
              <ClinicSettingsProvider>
                <App />
              </ClinicSettingsProvider>
            </PermissionsProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
