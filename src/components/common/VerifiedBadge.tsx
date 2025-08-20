import React from 'react';

/**
 * A professional verified badge inspired by Instagram/YouTube style.
 * Props:
 *   - size: number (default 32)
 *   - tooltip: string (optional)
 */
const VerifiedBadge: React.FC<{ size?: number; tooltip?: string }> = ({ size = 32, tooltip }) => (
  <div
    className="verified-badge-wrapper group"
    style={{ width: size, height: size, position: 'relative', display: 'inline-block' }}
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id="badge-gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4FC3F7" />
          <stop offset="100%" stopColor="#1976D2" />
        </radialGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#4FC3F7" floodOpacity="0.7" />
        </filter>
      </defs>
      <circle
        cx="16"
        cy="16"
        r="14"
        fill="url(#badge-gradient)"
        filter="url(#glow)"
        stroke="#fff"
        strokeWidth="2"
      />
      <path
        d="M11.5 16.5L15 20L21 13.5"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    {tooltip && (
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
        {tooltip}
      </span>
    )}
  </div>
);

export default VerifiedBadge; 