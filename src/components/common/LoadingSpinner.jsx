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

  const SpinnerRing = () => (
    <div
      className={color === 'white' ? 'border-white/25 border-t-white' : 'border-[var(--color-accent)]/15 border-t-[var(--color-accent)]'}
      style={{
        width: ring,
        height: ring,
        borderRadius: '50%',
        borderWidth: `${border}px`,
        borderStyle: 'solid',
        animation: 'spin 0.75s linear infinite',
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center z-[9999] backdrop-blur-[4px] bg-[var(--color-bg)]/95"
      >
        {/* Logo */}
        <div
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-5 overflow-hidden bg-white shadow-xl shadow-[var(--color-accent)]/20 animate-bounce-in"
        >
          <img src="/dentiva-logo.png" alt="Dentiva Logo" className="w-full h-full object-cover" />
        </div>

        {/* Dual Ring Spinner (lg) */}
        <div className="relative w-[52px] h-[52px]">
          <div
            className="absolute inset-0 rounded-full border-4 border-solid border-[var(--color-accent)]/10 border-t-[var(--color-accent)]"
            style={{
              animation: 'spin 0.85s linear infinite',
            }}
          />
          <div
            className="absolute inset-[6px] rounded-full border-[3px] border-solid border-[var(--color-accent-secondary)]/15 border-b-[var(--color-accent-secondary)]"
            style={{
              animation: 'spin 1.1s linear infinite reverse',
            }}
          />
        </div>

        <p className="mt-[18px] text-[var(--color-text)] text-[15px] font-medium tracking-[0.01em]">
          {message}
        </p>
        <p className="mt-1 text-[var(--color-muted)] text-[12px]">
          Dentiva · Klinik Gigi
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-[10px] ${size === 'sm' ? 'p-[12px]' : 'p-[28px]'}`}
    >
      <SpinnerRing />
      {message && size !== 'sm' && (
        <p className="text-[var(--color-muted)] text-[13px] font-medium">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
