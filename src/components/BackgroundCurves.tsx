import React from 'react';

export const BackgroundCurves: React.FC = () => {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Subtle radial ambient pools at outer edges */}
      <div
        className="absolute -top-40 -left-32 w-[560px] h-[560px] rounded-full opacity-35 dark:opacity-55 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(var(--accent-rgb), 0.22) 0%, rgba(var(--accent-deep-rgb), 0.08) 50%, transparent 72%)',
        }}
      />
      <div
        className="absolute top-[22%] -right-40 w-[520px] h-[520px] rounded-full opacity-25 dark:opacity-45 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(var(--accent-rgb), 0.18) 0%, rgba(var(--accent-deep-rgb), 0.06) 52%, transparent 75%)',
        }}
      />
      <div
        className="absolute bottom-[-180px] left-[25%] w-[680px] h-[420px] rounded-full opacity-20 dark:opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(var(--accent-rgb), 0.16) 0%, rgba(var(--accent-deep-rgb), 0.05) 55%, transparent 75%)',
        }}
      />

      {/* Flowing outer-edge light trails */}
      <svg
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="none"
        className="w-full h-full opacity-40 dark:opacity-80"
      >
        <defs>
          <linearGradient id="accentTrailLeft" x1="0" y1="150" x2="720" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" style={{ stopColor: 'var(--accent-bright)' }} stopOpacity="0.85" />
            <stop offset="50%" style={{ stopColor: 'var(--accent-primary)' }} stopOpacity="0.4" />
            <stop offset="100%" style={{ stopColor: 'var(--accent-primary)' }} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="accentTrailRight" x1="1440" y1="220" x2="820" y2="780" gradientUnits="userSpaceOnUse">
            <stop offset="0%" style={{ stopColor: 'var(--accent-bright)' }} stopOpacity="0.85" />
            <stop offset="55%" style={{ stopColor: 'var(--accent-primary)' }} stopOpacity="0.35" />
            <stop offset="100%" style={{ stopColor: 'var(--accent-deep)' }} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="accentTrailBottom" x1="0" y1="780" x2="1440" y2="820" gradientUnits="userSpaceOnUse">
            <stop offset="0%" style={{ stopColor: 'var(--accent-bright)' }} stopOpacity="0.65" />
            <stop offset="50%" style={{ stopColor: 'var(--accent-primary)' }} stopOpacity="0.8" />
            <stop offset="100%" style={{ stopColor: 'var(--accent-bright)' }} stopOpacity="0.55" />
          </linearGradient>
          <filter id="softAccentGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Top-left sweeping arc */}
        <path
          d="M-60 280 C 160 120, 420 90, 760 88"
          stroke="url(#accentTrailLeft)"
          strokeWidth="1.6"
          filter="url(#softAccentGlow)"
        />
        <path
          d="M-40 330 C 130 220, 260 165, 480 128"
          stroke="url(#accentTrailLeft)"
          strokeWidth="0.9"
          strokeOpacity="0.55"
        />

        {/* Right side flowing light curve */}
        <path
          d="M1500 185 C 1220 265, 1110 460, 960 760"
          stroke="url(#accentTrailRight)"
          strokeWidth="1.7"
          filter="url(#softAccentGlow)"
        />
        <path
          d="M1480 260 C 1260 360, 1180 540, 1080 860"
          stroke="url(#accentTrailRight)"
          strokeWidth="0.95"
          strokeOpacity="0.5"
        />

        {/* Subtle bottom horizontal horizon arc */}
        <path
          d="M-40 770 C 320 845, 1080 845, 1480 770"
          stroke="url(#accentTrailBottom)"
          strokeWidth="1.2"
          strokeOpacity="0.45"
        />
      </svg>
    </div>
  );
};
