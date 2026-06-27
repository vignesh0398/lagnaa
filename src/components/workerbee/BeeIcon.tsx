type BeeIconProps = {
  size?: number;
  className?: string;
  animated?: boolean;
};

export function BeeIcon({ size = 28, className = '', animated = false }: BeeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${animated ? 'workerbee-wing-flutter' : ''} ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="beeWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="beeBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      <ellipse
        className={animated ? 'workerbee-wing-left' : undefined}
        cx="14"
        cy="22"
        rx="10"
        ry="6"
        fill="url(#beeWingGrad)"
        opacity="0.9"
      />
      <ellipse
        className={animated ? 'workerbee-wing-right' : undefined}
        cx="34"
        cy="22"
        rx="10"
        ry="6"
        fill="url(#beeWingGrad)"
        opacity="0.9"
      />

      <ellipse cx="24" cy="26" rx="9" ry="11" fill="url(#beeBodyGrad)" />
      <path
        d="M16 22h16M16 27h16M16 32h16"
        stroke="#1e293b"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.55"
      />

      <circle cx="24" cy="14" r="7" fill="url(#beeBodyGrad)" />
      <circle cx="21.5" cy="13" r="1.6" fill="#1e293b" />
      <circle cx="26.5" cy="13" r="1.6" fill="#1e293b" />
      <circle cx="21.8" cy="12.6" r="0.45" fill="#f8fafc" />
      <circle cx="26.8" cy="12.6" r="0.45" fill="#f8fafc" />

      <path d="M20 8.5 L18 4 M28 8.5 L30 4" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="18" cy="4" r="1.2" fill="#1e293b" />
      <circle cx="30" cy="4" r="1.2" fill="#1e293b" />

      <path
        d="M24 37 Q20 42 16 40 M24 37 Q28 42 32 40"
        stroke="#1e293b"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}