import React from 'react';
import { AlertTriangle, Info, Trash2, HelpCircle, X } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi',
  message = 'Apakah Anda yakin?',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type = 'warning', // warning | danger | info
}) => {
  if (!isOpen) return null;

  const config = {
    danger: {
      icon: <Trash2 size={28} />,
      iconBg: '#fef2f2',
      iconColor: '#EF4444',
      ring: 'rgba(239,68,68,0.15)',
      btnBg: '#EF4444',
      btnHover: '#dc2626',
      btnRing: 'rgba(239,68,68,0.25)',
    },
    warning: {
      icon: <AlertTriangle size={28} />,
      iconBg: '#fffbeb',
      iconColor: '#F59E0B',
      ring: 'rgba(245,158,11,0.15)',
      btnBg: '#F59E0B',
      btnHover: '#d97706',
      btnRing: 'rgba(245,158,11,0.25)',
    },
    info: {
      icon: <Info size={28} />,
      iconBg: '#eff6ff',
      iconColor: '#0F4C81',
      ring: 'rgba(15,76,129,0.12)',
      btnBg: '#0F4C81',
      btnHover: '#0a3460',
      btnRing: 'rgba(15,76,129,0.25)',
    },
  };

  const c = config[type] || config.warning;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,30,50,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9998,
        animation: 'fadeIn 0.2s ease both',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 20,
          padding: '36px 32px 28px',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 24px 64px rgba(15,30,50,0.22), 0 8px 24px rgba(15,30,50,0.1)',
          animation: 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) both',
          position: 'relative',
        }}
      >
        {/* Close X */}
        <button
          onClick={onClose}
          aria-label="Tutup dialog"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: '#f1f5f9',
            border: 'none',
            borderRadius: 8,
            padding: 6,
            cursor: 'pointer',
            color: '#94a3b8',
            display: 'flex',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#e2e8f0';
            e.currentTarget.style.color = '#64748b';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: c.iconBg,
              boxShadow: `0 0 0 10px ${c.ring}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: c.iconColor,
            }}
          >
            {c.icon}
          </div>
        </div>

        {/* Title */}
        <h3
          style={{
            textAlign: 'center',
            fontSize: 20,
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: 10,
          }}
        >
          {title}
        </h3>

        {/* Message */}
        <p
          style={{
            textAlign: 'center',
            color: '#64748b',
            fontSize: 14,
            lineHeight: 1.65,
            marginBottom: 28,
          }}
        >
          {message}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 0',
              border: '2px solid #e2e8f0',
              borderRadius: 12,
              background: 'white',
              color: '#475569',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#94a3b8';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            {cancelText}
          </button>

          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: '12px 0',
              border: 'none',
              borderRadius: 12,
              background: c.btnBg,
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: `0 4px 12px ${c.btnRing}`,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = c.btnHover;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = c.btnBg;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
