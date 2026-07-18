import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 280);
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const success = useCallback((msg, dur) => addToast(msg, 'success', dur), [addToast]);
  const error   = useCallback((msg, dur) => addToast(msg, 'error',   dur), [addToast]);
  const warning = useCallback((msg, dur) => addToast(msg, 'warning', dur), [addToast]);
  const info    = useCallback((msg, dur) => addToast(msg, 'info',    dur), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

const STYLES = {
  success: {
    bg: '#f0fdf4',
    border: '#10B981',
    icon: <CheckCircle size={18} />,
    iconColor: '#059669',
    bar: '#10B981',
  },
  error: {
    bg: '#fef2f2',
    border: '#EF4444',
    icon: <XCircle size={18} />,
    iconColor: '#dc2626',
    bar: '#EF4444',
  },
  warning: {
    bg: '#fffbeb',
    border: '#F59E0B',
    icon: <AlertCircle size={18} />,
    iconColor: '#d97706',
    bar: '#F59E0B',
  },
  info: {
    bg: '#eff6ff',
    border: '#0F4C81',
    icon: <Info size={18} />,
    iconColor: '#0F4C81',
    bar: '#00B4D8',
  },
};

const Toast = ({ toast, onRemove }) => {
  const s = STYLES[toast.type] || STYLES.info;
  const duration = toast.duration || 3500;

  return (
    <div
      style={{
        background: s.bg,
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(15,30,50,0.14), 0 2px 8px rgba(15,30,50,0.08)',
        overflow: 'hidden',
        minWidth: 300,
        maxWidth: 380,
        animation: toast.exiting
          ? 'slideOutRight 0.28s ease-in both'
          : 'slideInRight 0.32s cubic-bezier(0.16,1,0.3,1) both',
        position: 'relative',
      }}
    >
      {/* Main content */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}>
        {/* Icon */}
        <div
          style={{
            color: s.iconColor,
            flexShrink: 0,
            marginTop: 1,
            display: 'flex',
          }}
        >
          {s.icon}
        </div>

        {/* Message */}
        <p
          style={{
            flex: 1,
            fontSize: 13.5,
            fontWeight: 500,
            color: '#1e293b',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {toast.message}
        </p>

        {/* Close */}
        <button
          onClick={() => onRemove(toast.id)}
          aria-label="Tutup notifikasi"
          style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#94a3b8',
            padding: 2,
            display: 'flex',
            borderRadius: 6,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#475569'}
          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
        >
          <X size={15} />
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 3,
          background: s.bar,
          borderRadius: '0 0 0 14px',
          opacity: 0.7,
          animation: `progress-bar ${duration}ms linear both`,
        }}
      />

      {/* Left border accent */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: s.border,
          borderRadius: '14px 0 0 14px',
        }}
      />
    </div>
  );
};

const ToastContainer = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.625rem',
      }}
    >
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

export default ToastProvider;
