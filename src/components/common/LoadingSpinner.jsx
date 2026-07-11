import React from 'react';

const LoadingSpinner = ({
  fullScreen = false,
  size = 'md',
  color = 'primary',
  message = 'Memuat...',
}) => {
  const sizeMap = {
    sm: { ring: 20, border: 2, text: '12px' },
    md: { ring: 36, border: 3, text: '14px' },
    lg: { ring: 52, border: 4, text: '16px' },
  };

  const { ring, border } = sizeMap[size] || sizeMap.md;

  const borderColor =
    color === 'white'
      ? `rgba(255,255,255,0.25)`
      : `rgba(15, 76, 129, 0.15)`;
  const topColor =
    color === 'white' ? 'white' : '#0F4C81';

  const SpinnerRing = () => (
    <div
      style={{
        width: ring,
        height: ring,
        borderRadius: '50%',
        border: `${border}px solid ${borderColor}`,
        borderTopColor: topColor,
        animation: 'spin 0.75s linear infinite',
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.94)',
          zIndex: 9999,
          backdropFilter: 'blur(4px)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0F4C81, #1a6ab5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            boxShadow: '0 8px 24px rgba(15,76,129,0.25)',
            animation: 'bounce-in 0.5s cubic-bezier(0.36,0.07,0.19,0.97) both',
            overflow: 'hidden',
            backgroundColor: '#fff'
          }}
        >
          <img src="/dentiva-logo.png" alt="Dentiva Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        {/* Dual Ring Spinner (lg) */}
        <div style={{ position: 'relative', width: 52, height: 52 }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '4px solid rgba(15,76,129,0.10)',
              borderTopColor: '#0F4C81',
              animation: 'spin 0.85s linear infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 6,
              borderRadius: '50%',
              border: '3px solid rgba(0,180,216,0.15)',
              borderBottomColor: '#00B4D8',
              animation: 'spin 1.1s linear infinite reverse',
            }}
          />
        </div>

        <p
          style={{
            marginTop: 18,
            color: '#475569',
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}
        >
          {message}
        </p>
        <p
          style={{
            marginTop: 4,
            color: '#94a3b8',
            fontSize: 12,
          }}
        >
          Dentiva · Klinik Gigi
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: size === 'sm' ? '12px' : '28px',
        gap: 10,
      }}
    >
      <SpinnerRing />
      {message && size !== 'sm' && (
        <p style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
