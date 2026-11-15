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

const WHEEL_PRIZES = [
  { label: '$25', amount: 25, color: '#3B82F6' },
  { label: '$100', amount: 100, color: '#10B981' },
  { label: '$10', amount: 10, color: '#64748B' },
  { label: '$250', amount: 250, color: '#8B5CF6' },
  { label: '$50', amount: 50, color: '#06B6D4' },
  { label: '$500', amount: 500, color: '#0891B2' },
] as const;

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
    const chosenIdx = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const segmentAngle = 360 / WHEEL_PRIZES.length;
    const centerOfWedge = chosenIdx * segmentAngle + segmentAngle / 2;
    const targetRotation = 360 * 5 + (360 - centerOfWedge);

    setIsSpinning(true);
    setWheelRotation(targetRotation);

    window.setTimeout(() => {
      const won = WHEEL_PRIZES[chosenIdx].amount;
      setIsSpinning(false);
      setSpinPrize(won);
      onCreditBonus(won, `Daily Spin Reward (${formatCurrency(won, 0)})`, 'XN-DAILYSPIN');
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
          <div className="relative h-44 sm:h-48 overflow-hidden bg-[var-modal-header-bg]">
            {!imgError ? (
              <img
                src={tradingDeskImg}
                alt="Xena Broker dual-monitor equities trading workstation"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var-modal-header-bg]">
                <TrendingUp className="w-12 h-12 text-[var(--modal-icon)]/60" />
              </div>
            )}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[var(--modal-header-bg)]/90 via-[var(--modal-header-bg)]/35 to-transparent"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close platform overview"
              className="absolute top-3.5 right-3.5 p-1.5 rounded-xl text-[var(--modal-text)] bg-[var(--modal-button-bg)] hover:bg-[var(--modal-button-bg-hover)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-4 left-5 right-5 text-[var(--modal-text)]">
              <div className="text-xs font-semibold text-[var(--modal-accent)]">About the Platform</div>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight">
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

      {/* 3. Daily Spin Wheel Modal (Auto-shown once every 24 hours) */}
      {activeModal === 'daily_spin' && (
        <div className="animate-modal-pop w-full max-w-md overflow-hidden rounded-3xl bg-[var(--modal-bg)] border border-[var(--modal-border)] shadow-[var(--modal-shadow)]">
          <div className="relative overflow-hidden bg-gradient-to-br from-[var(--modal-header-bg)] via-[var(--modal-header-bg2)] to-[var(--modal-accent)] text-[var(--modal-header-fg)] px-6 py-5">
            <button
              type="button"
              onClick={() => {
                if (!isSpinning) onClose();
              }}
              aria-label="Close daily spin"
              disabled={isSpinning}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-[var(--modal-text)] hover:text-[var(--modal-text-hover)] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-xs font-semibold text-[var(--modal-accent)]">24-Hour Member Reward</div>
            <h2 className="font-display text-xl font-extrabold text-[var(--modal-header-fg)] tracking-tight">
              Daily Cash Spin
            </h2>
            <p className="text-xs text-[var(--modal-body)] mt-1">
              Spin once every 24 hours to win up to $500.00 in brokerage buying power.
            </p>
          </div>

          <div className="p-6 flex flex-col items-center">
            {/* Pointer + Wheel */}
            <div className="relative w-60 h-60 sm:w-64 sm:h-64 flex items-center justify-center">
              {/* Top Pointer */}
              <div
                aria-hidden="true"
                className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-[var(--modal-accent)] drop-shadow-sm"
              />

              {/* Rotating Wheel SVG */}
              <div
                className="w-full h-full rounded-full p-1.5 bg-[var(--modal-wheel-bg)] shadow-lg"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: isSpinning
                    ? 'transform 3.2s cubic-bezier(0.12, 0.85, 0.18, 1)'
                    : 'none',
                }}
              >
                <svg viewBox="0 0 220 220" className="w-full h-full rounded-full">
                  {WHEEL_PRIZES.map((seg, i) => {
                    const segAngle = 360 / WHEEL_PRIZES.length;
                    const startAngle = i * segAngle;
                    const endAngle = startAngle + segAngle;
                    const midAngle = startAngle + segAngle / 2;
                    const labelPos = polarToCartesian(110, 110, 68, midAngle);

                    return (
                      <g key={seg.label}>
                        <path
                          d={buildWedgePath(110, 110, 108, startAngle, endAngle)}
                          fill={seg.color}
                          stroke="#FFFFFF"
                          strokeWidth="2"
                        />
                        <text
                          x={labelPos.x}
                          y={labelPos.y}
                          fill="#FFFFFF"
                          fontSize="14"
                          fontWeight="800"
                          fontFamily="JetBrains Mono, monospace"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${midAngle}, ${labelPos.x}, ${labelPos.y})`}
                        >
                          {seg.label}
                        </text>
                      </g>
                    );
                  })}
                  <circle cx="110" cy="110" r="22" fill="#0F172A" stroke="#FFFFFF" strokeWidth="3" />
                  <text
                    x="110"
                    y="111"
                    fill="#FFFFFF"
                    fontSize="9"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    XENA
                  </text>
                </svg>
              </div>
            </div>

            {spinPrize !== null ? (
              <div className="w-full mt-5 space-y-3 text-center">
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[var(--modal-success-bg)] to-[var(--modal-success-bg2)] border border-[var(--modal-success-border)] text-[var(--modal-success-fg)]">
                  <div className="text-xs font-semibold text-[var(--modal-success-fg)]">Reward Credited</div>
                  <div className="font-mono tabular-nums text-2xl font-extrabold text-[var(--modal-success-fg)] mt-0.5">
                    +{formatCurrency(spinPrize)}
                  </div>
                  <div className="text-xs text-[var(--modal-body)] mt-1">
                    Added to your Cash Balance · Next spin available in 24 hours.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 px-4 text-sm font-semibold text-[var-modal-button-fg] bg-gradient-to-r from-[var(--modal-button-bg1)] via-[var(--modal-button-bg2)] to-[var(--modal-button-bg3)] rounded-xl shadow-sm hover:from-[var(--modal-button-bg1-hover)] hover:via-[var(--modal-button-bg2-hover)] hover:to-[var(--modal-button-bg3-hover)] transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="w-full mt-5 space-y-2.5">
                <button
                  type="button"
                  onClick={handleSpinWheel}
                  disabled={isSpinning}
                  className="w-full py-3 px-4 text-sm font-semibold text-[var(--modal-button-fg)] bg-gradient-to-r from-[var(--modal-button-bg1)] via-[var(--modal-button-bg2)] to-[var(--modal-button-bg3)] rounded-xl shadow-sm hover:from-[var(--modal-button-bg1-hover)] hover:via-[var(--modal-button-bg2-hover)] hover:to-[var(--modal-button-bg3-hover)] disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                  <span>{isSpinning ? 'Spinning...' : 'Spin Now'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSpinning}
                  className="w-full py-2.5 px-4 text-xs sm:text-sm font-medium text-[var(--modal-button-alt)] bg-gradient-to-r from-[var(--modal-button-alt-bg1)] to-[var(--modal-button-alt-bg2)]/80 rounded-xl hover:from-[var(--modal-button-alt-bg1-hover)] hover:to-[var(--modal-button-alt-bg2-hover)] transition-all cursor-pointer disabled:opacity-40"
                >
                  Skip for today
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}