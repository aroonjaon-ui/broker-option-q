import { useId } from 'react';

interface BrandLogoProps {
  /** Size of the symbol in pixels. */
  size?: number;
  /** Show the Xena Broker wordmark beside the symbol. */
  showWordmark?: boolean;
  /** Use light wordmark colours (for dark backgrounds). */
  dark?: boolean;
  className?: string;
}

/**
 * Xena Broker brand mark: a deep-navy rounded tile with two crossing
 * ascending strokes and a growth arrow, paired with the wordmark.
 */
export default function BrandLogo({
  size = 34,
  showWordmark = true,
  dark = false,
  className = '',
}: BrandLogoProps) {
  const uid = useId().replace(/:/g, '');
  const tileId = `xena-tile-${uid}`;
  const strokeId = `xena-stroke-${uid}`;
  const arrowId = `xena-arrow-${uid}`;

  return (
    <span className={`inline-flex shrink-0 items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        role="img"
        aria-label="Xena Broker"
        className="shrink-0 drop-shadow-[0_2px_6px_rgba(6,24,43,0.25)]"
      >
        <defs>
          <linearGradient id={tileId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#123A5C" />
            <stop offset="100%" stopColor="#06182B" />
          </linearGradient>
          <linearGradient id={strokeId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#0EA5A4" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id={arrowId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7DD3FC" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="46" height="46" rx="12" fill={`url(#${tileId})`} />
        <rect
          x="1.5"
          y="1.5"
          width="45"
          height="45"
          rx="11.5"
          fill="none"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="1"
        />
        <path
          d="M13 14 L35 34"
          stroke={`url(#${strokeId})`}
          strokeWidth="5.2"
          strokeLinecap="round"
        />
        <path
          d="M35 15 L15 33"
          stroke="rgba(125,211,252,0.92)"
          strokeWidth="5.2"
          strokeLinecap="round"
        />
        <path
          d="M28 11.5 H36.5 V20"
          fill="none"
          stroke={`url(#${arrowId})`}
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark && (
        <span
          className={`font-display font-extrabold tracking-tight whitespace-nowrap ${
            dark ? 'text-white' : 'text-slate-900'
          }`}
          style={{ fontSize: Math.round(size * 0.58) }}
        >
          Xena <span className={dark ? 'text-blue-400' : 'text-emerald-600'}>Broker</span>
        </span>
      )}
    </span>
  );
}
