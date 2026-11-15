import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Compass,
  Gift,
  RotateCw,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export type AppModalKind = 'signup_bonus' | 'platform_info' | 'daily_spin';

interface PlatformModalsProps {
  activeModal: AppModalKind | null;
  userName?: string;
  onClose: () => void;
  onCreditBonus: (amount: number, description: string, reference: string) => void;
  onNavigate: (page: import('../types/broker').PageId) => void;
}

interface WheelPrize {
  label: string;
  amount: number;
  /** Relative chance of landing on this segment. */
  weight: number;
  fill: string;
  text: string;
}

// Muted institutional palette: deep navy / slate with two gold top prizes.
const WHEEL_PRIZES: WheelPrize[] = [
  { label: '$25', amount: 25, weight: 24, fill: '#16293E', text: '#E6EDF5' },
  { label: '$500', amount: 500, weight: 2, fill: '#B9922F', text: '#0E1E2E' },
  { label: '$50', amount: 50, weight: 20, fill: '#1E3A52', text: '#E6EDF5' },
  { label: '$150', amount: 150, weight: 8, fill: '#16293E', text: '#E6EDF5' },
  { label: '$10', amount: 10, weight: 26, fill: '#1E3A52', text: '#E6EDF5' },
  { label: '$250', amount: 250, weight: 4, fill: '#B9922F', text: '#0E1E2E' },
  { label: '$75', amount: 75, weight: 12, fill: '#16293E', text: '#E6EDF5' },
  { label: '$100', amount: 100, weight: 9, fill: '#1E3A52', text: '#E6EDF5' },
];

function pickPrizeIndex(): number {
  const total = WHEEL_PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < WHEEL_PRIZES.length; i += 1) {
    roll -= WHEEL_PRIZES[i].weight;
    if (roll <= 0) return i;
  }
  return 0;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function buildWedgePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export default function PlatformModals({
  activeModal,
  userName,
  onClose,
  onCreditBonus,
  onNavigate,
}: PlatformModalsProps) {
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinPrize, setSpinPrize] = useState<number | null>(null);

  useEffect(() => {
    if (activeModal === 'signup_bonus') {
      setBonusClaimed(false);
    }
    if (activeModal === 'daily_spin') {
      setIsSpinning(false);
      setWheelRotation(0);
      setSpinPrize(null);
    }
  }, [activeModal]);

  useEffect(() => {
    if (!activeModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSpinning) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeModal, isSpinning, onClose]);

  const handleClaimSignupBonus = () => {
    if (bonusClaimed) {
      onClose();
      return;
    }
    onCreditBonus(500, 'Welcome Sign-Up Cash Bonus', 'XN-BONUS500');
    setBonusClaimed(true);
  };

  const handleSpinWheel = () => {
    if (isSpinning || spinPrize !== null) return;
    const chosenIdx = pickPrizeIndex();
    const segmentAngle = 360 / WHEEL_PRIZES.length;
    const centerOfWedge = chosenIdx * segmentAngle + segmentAngle / 2;
    const targetRotation = 360 * 5 + (360 - centerOfWedge);

    setIsSpinning(true);
    setWheelRotation(targetRotation);

    window.setTimeout(() => {
      const won = WHEEL_PRIZES[chosenIdx].amount;
      setIsSpinning(false);
      setSpinPrize(won);
      onCreditBonus(won, `Daily Reward Draw (${formatCurrency(won, 0)})`, 'XN-DAILYSPIN');
    }, 3250);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--dialog-bg)] backdrop-blur-[var(--dialog-blur)]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSpinning) onClose();
      }}
    >
      {/* 1. $500 Sign-Up Welcome Bonus Modal */}
      {activeModal === 'signup_bonus' && (
        <div className="animate-modal-pop w-full max-w-md overflow-hidden rounded-3xl bg-[var(--modal-bg)] border border-[var(--modal-border)] shadow-[var(--modal-shadow)]">
          <div className="relative overflow-hidden bg-[var(--modal-header-bg)] text-[var(--modal-header-fg)] p-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[var(--modal-icon-bg)] blur-2xl"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close bonus popup"
              className="absolute top-4 right-4 p-1.5 rounded-xl text-[var(--modal-text)] hover:text-[var(--modal-text-hover)] hover:bg-[var(--modal-bg-hover)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-10 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[var(--modal-reward-bg)] flex items-center justify-center shadow-md shrink-0">
                <Gift className="w-5 h-5 text-[var(--modal-reward-fg)]" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[var(--modal-reward-fg2)]">
                  New Account Reward
                </div>
                <h2 className="font-display text-xl font-extrabold text-[var(--modal-header-fg)] tracking-tight">
                  $500 Welcome Bonus
                </h2>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm sm:text-[15px] text-[var(--modal-body)] leading-relaxed">
              Welcome{userName ? `, ${userName}` : ''}! Your new Xena Broker account qualifies for a{' '}
              <span className="font-mono tabular-nums font-bold text-[var(--modal-bonus-fg)]">$500.00</span>{' '}
              cash bonus ready to credit straight to your buying power.
            </p>

            <div className="rounded-2xl bg-[var(--modal-card-bg)] border border-[var(--modal-card-border)] p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-[var(--modal-card-fg)]">Instant Cash Credit</div>
                <div className="font-mono tabular-nums text-2xl font-extrabold text-[var(--modal-card-fg2)] mt-0.5">
                  +$500.00
                </div>
              </div>
              <Award className="w-8 h-8 text-[var(--modal-card-accent)] shrink-0" />
            </div>

            {bonusClaimed ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[var(--modal-success-bg)] border border-[var(--modal-success-border)] text-xs sm:text-sm font-medium text-[var(--modal-success-fg)] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--modal-success-fg)] shrink-0" />
                  <span>$500.00 has been added to your Cash Balance!</span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 px-4 text-sm font-semibold text-[var(--modal-button-fg)] bg-gradient-to-r from-[var(--modal-button-bg1)] via-[var(--modal-button-bg2)] to-[var(--modal-button-bg3)] rounded-xl shadow-sm hover:from-[var(--modal-button-bg1-hover)] hover:via-[var(--modal-button-bg2-hover)] hover:to-[var(--modal-button-bg3-hover)] transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleClaimSignupBonus}
                  className="flex-1 py-3 px-4 text-sm font-semibold text-[var(--modal-button-fg)] bg-gradient-to-r from-[var(--modal-button-bg1)] to-[var(--modal-button-bg2)] rounded-xl shadow-sm hover:from-[var(--modal-button-bg1-hover)] hover:to-[var(--modal-button-bg2-hover)] transition-all cursor-pointer"
                >
                  Claim $500 Bonus
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 text-xs sm:text-sm font-medium text-[var(--modal-button-alt)] bg-gradient-to-r from-[var(--modal-button-alt-bg1)] to-[var(--modal-button-alt-bg2)]/80 rounded-xl hover:from-[var(--modal-button-alt-bg1-hover)] hover:to-[var(--modal-button-alt-bg2-hover)] transition-all cursor-pointer"
                >
                  Later
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. About the Platform Overview Modal */}
      {activeModal === 'platform_info' && (
        <div className="animate-modal-pop w-full max-w-lg overflow-hidden rounded-3xl bg-[var(--modal-bg)] border border-[var(--modal-border)] shadow-[var(--modal-shadow)]">
          <div className="relative h-40 sm:h-44 overflow-hidden bg-[#0E1E2E]">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.16]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)',
                backgroundSize: '36px 36px',
              }}
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 400 160"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full opacity-80"
            >
              <defs>
                <linearGradient id="xn-platform-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 124 L40 110 L80 118 L120 94 L160 100 L200 76 L240 84 L280 60 L320 68 L360 42 L400 50 L400 160 L0 160 Z"
                fill="url(#xn-platform-area)"
              />
              <path
                d="M0 124 L40 110 L80 118 L120 94 L160 100 L200 76 L240 84 L280 60 L320 68 L360 42 L400 50"
                fill="none"
                stroke="#10B981"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#0E1E2E] via-[#0E1E2E]/55 to-transparent"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close platform overview"
              className="absolute top-3.5 right-3.5 p-1.5 rounded-xl text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-4 left-5 right-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7DD3C0]">
                About the platform
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
                Built for focused US equities trading
              </h2>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-3 text-xs sm:text-sm text-[var(--modal-body)]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--modal-card-bg)] to-[var(--modal-card-bg2)] text-[var(--modal-accent)] flex items-center justify-center shrink-0 mt-0.5">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--modal-header-fg)]">Interactive TradingView Terminal</div>
                  <p className="mt-0.5">
                    Analyze candlestick and line charts across timeframes and execute market or limit orders in one click.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--modal-card-bg)] to-[var(--modal-card-bg2)] text-[var(--modal-accent)] flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--modal-header-fg)]">Instant Funding & Portfolio Tracking</div>
                  <p className="mt-0.5">
                    Deposit or withdraw cash with $0.00 ACH fees, verify KYC identity, and track live asset allocation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--modal-card-bg)] to-[var(--modal-card-bg2)] text-[var(--modal-accent)] flex items-center justify-center shrink-0 mt-0.5">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--modal-header-fg)]">Curated US Market Coverage</div>
                  <p className="mt-0.5">
                    Filter NASDAQ and NYSE leaders by sector, build your custom watchlist, and export portfolio CSVs anytime.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate('trade');
                }}
                className="flex-1 py-3 px-4 text-sm font-semibold text-[var(--modal-button-fg)] bg-gradient-to-r from-[var(--modal-button-bg1)] via-[var(--modal-button-bg2)] to-[var(--modal-button-bg3)] rounded-xl shadow-sm hover:from-[var(--modal-button-bg1-hover)] hover:via-[var(--modal-button-bg2-hover)] hover:to-[var(--modal-button-bg3-hover)] transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open Trade Desk</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 text-xs sm:text-sm font-medium text-[var(--modal-button-alt)] bg-gradient-to-r from-[var(--modal-button-alt-bg1)] to-[var(--modal-button-alt-bg2)]/80 rounded-xl hover:from-[var(--modal-button-alt-bg1-hover)] hover:to-[var(--modal-button-alt-bg2-hover)] transition-all cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Daily Reward Draw — member-only, once every 24 hours */}
      {activeModal === 'daily_spin' && (
        <div className="animate-modal-pop w-full max-w-md overflow-hidden rounded-3xl bg-[var(--modal-bg)] border border-[var(--modal-border)] shadow-[var(--modal-shadow)]">
          <div className="relative overflow-hidden bg-[#0E1E2E] px-6 pt-5 pb-5 text-white">
            <button
              type="button"
              onClick={() => {
                if (!isSpinning) onClose();
              }}
              aria-label="Close daily reward draw"
              disabled={isSpinning}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-white/70 hover:text-white bg-white/5 hover:bg-white/10 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
              Member reward
            </div>
            <h2 className="font-display text-lg font-bold tracking-tight text-white">
              Daily Reward Draw
            </h2>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              One draw every 24 hours. Rewards are credited to your buying power, up to $500.
            </p>
            <div
              aria-hidden="true"
              className="mt-4 h-px w-full bg-gradient-to-r from-[#C9A227]/60 via-[#C9A227]/15 to-transparent"
            />
          </div>

          <div className="p-6 flex flex-col items-center">
            {/* Rim, pointer and rotating wheel */}
            <div className="relative w-64 h-64 flex items-center justify-center">
              {/* Slim gold pointer */}
              <div
                aria-hidden="true"
                className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center"
              >
                <div className="h-2.5 w-px bg-[#C9A227]/70" />
                <div className="w-0 h-0 border-l-[7px] border-r-[7px] border-t-[13px] border-l-transparent border-r-transparent border-t-[#C9A227] drop-shadow-[0_2px_4px_rgba(2,10,20,0.35)]" />
              </div>

              {/* Bezel */}
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-full border border-[var(--modal-border)] bg-[var(--modal-wheel-bg)] shadow-[0_20px_45px_-24px_rgba(2,10,20,0.65)]"
              />

              {/* Rotating wheel */}
              <div
                className="relative w-[92%] h-[92%] rounded-full"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: isSpinning
                    ? 'transform 3.2s cubic-bezier(0.15, 0.85, 0.16, 1)'
                    : 'none',
                }}
              >
                <svg viewBox="0 0 240 240" className="w-full h-full">
                  {WHEEL_PRIZES.map((prize, i) => {
                    const segAngle = 360 / WHEEL_PRIZES.length;
                    const startAngle = i * segAngle;
                    const endAngle = startAngle + segAngle;
                    const midAngle = startAngle + segAngle / 2;
                    const labelPos = polarToCartesian(120, 120, 78, midAngle);

                    return (
                      <g key={`${prize.label}-${i}`}>
                        <path
                          d={buildWedgePath(120, 120, 116, startAngle, endAngle)}
                          fill={prize.fill}
                          stroke="rgba(248,250,252,0.14)"
                          strokeWidth="1"
                        />
                        <text
                          x={labelPos.x}
                          y={labelPos.y}
                          fill={prize.text}
                          fontSize="12"
                          fontWeight="600"
                          letterSpacing="0.5"
                          fontFamily="JetBrains Mono, ui-monospace, monospace"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${midAngle}, ${labelPos.x}, ${labelPos.y})`}
                        >
                          {prize.label}
                        </text>
                      </g>
                    );
                  })}
                  <circle
                    cx="120"
                    cy="120"
                    r="115"
                    fill="none"
                    stroke="rgba(201,162,39,0.45)"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="120"
                    cy="120"
                    r="27"
                    fill="#0B1A2A"
                    stroke="rgba(201,162,39,0.55)"
                    strokeWidth="1.5"
                  />
                  <text
                    x="120"
                    y="120.5"
                    fill="#C9A227"
                    fontSize="8"
                    fontWeight="700"
                    letterSpacing="1.6"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    XENA
                  </text>
                </svg>
              </div>
            </div>

            {spinPrize !== null ? (
              <div className="w-full mt-6 space-y-3 text-center">
                <div className="p-4 rounded-2xl bg-[var(--modal-card-bg)] border border-[var(--modal-card-border)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--modal-card-fg)]">
                    Reward credited
                  </div>
                  <div className="font-mono tabular-nums text-2xl font-semibold text-[#0E7C66] mt-1">
                    +{formatCurrency(spinPrize)}
                  </div>
                  <div className="text-xs text-[var(--modal-card-fg)] mt-1">
                    Added to your cash balance. Next draw available in 24 hours.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#0E7C66] hover:bg-[#0B6353] rounded-xl transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="w-full mt-6 space-y-2.5">
                <button
                  type="button"
                  onClick={handleSpinWheel}
                  disabled={isSpinning}
                  className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#0E7C66] hover:bg-[#0B6353] rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                  <span>{isSpinning ? 'Drawing…' : 'Start draw'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSpinning}
                  className="w-full py-2.5 px-4 text-xs sm:text-sm font-medium text-[var(--modal-button-alt)] hover:text-[var(--modal-text-hover)] rounded-xl transition-colors cursor-pointer disabled:opacity-40"
                >
                  Not now
                </button>
                <p className="pt-1 text-[10px] leading-relaxed text-[var(--modal-body)] text-center opacity-70">
                  Promotional credits only. Not withdrawable and carry no cash value.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}