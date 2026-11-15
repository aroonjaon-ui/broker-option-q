import { useState } from 'react';
import { ArrowRight, Building2, ShieldCheck } from 'lucide-react';
import MiniSparkline from '../components/MiniSparkline';
import fundingVaultImg from '../assets/images/home_funding_vault_1794692664965.jpg';
import tradingDeskImg from '../assets/images/home_trading_desk_1794692664220.jpg';
import portfolioStudioImg from '../assets/images/home_portfolio_studio_1794692664964.jpg';
import { MarketIndex, OrderSide, PageId, Stock, UserAccount } from '../types/broker';
import { formatCurrency, formatPercent, formatSignedCurrency } from '../utils/formatters';

interface HomePageProps {
  user: UserAccount | null;
  stocks: Stock[];
  onNavigate: (page: PageId) => void;
  onTradeSymbol: (symbol: string, side: OrderSide) => void;
}

function WorkflowCardImage({
  src,
  alt,
  stepNumber,
  badgeGradient,
  fallbackGradient,
  FallbackIcon,
}: {
  src: string;
  alt: string;
  stepNumber: string;
  badgeGradient: string;
  fallbackGradient: string;
  FallbackIcon: typeof ShieldCheck;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative h-60 sm:h-64 lg:h-72 w-full overflow-hidden bg-[var(--card)] border-b border-[var(--border)]/75">
      {!failed ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div
          className={`h-full w-full flex items-center justify-center bg-gradient-to-br ${fallbackGradient}`}
        >
          <FallbackIcon className="w-12 h-12 text-white/75" />
        </div>
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/15 to-transparent"
      />
      <div
        className={`absolute bottom-4 left-6 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${badgeGradient} text-white font-mono text-sm font-bold shadow-md ring-1 ring-white/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105`}
      >
        {stepNumber}
      </div>
    </div>
  );
}

export default function HomePage({
  user,
  stocks,
  onNavigate,
  onTradeSymbol,
}: HomePageProps) {
  const featuredSymbols = ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'TSLA', 'META'];
  const featuredStocks = featuredSymbols
    .map((sym) => stocks.find((s) => s.symbol === sym))
    .filter((s): s is Stock => Boolean(s));

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="pt-2">
        <div className="relative overflow-hidden flex flex-col justify-between bg-[var(--background)] text-[var(--foreground)] rounded-3xl p-7 sm:p-10 lg:p-12 shadow-lg border border-[var(--border)]">
          {/* Subtle grid pattern background */}
          <div
            className="absolute inset-0 overflow-hidden bg-[url('/patterns/grid-pattern.svg')] bg-center bg-no-repeat opacity-5"
          />

          {/* Ambient breathing orbs */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[var(--primary)]/15 blur-3xl animate-ambient-breathe"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 left-1/3 w-80 h-80 rounded-full bg-[var(--secondary)]/20 blur-3xl animate-ambient-breathe"
            style={{ animationDelay: '2.5s' }}
          />

          {/* Floating geometric facets corners */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-3xl border border-[var(--border)]/20 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--secondary)]/5 rotate-12 md:hidden animate-float-slow"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-4 right-4 w-20 h-20 rounded-2xl border border-[var(--border)]/10 bg-[var(--white)]/[0.04] -rotate-12 md:hidden animate-float-reverse"
          />

          {/* Desktop sculpture on the right */}
          <div
            aria-hidden="true"
            className="pointer-events-none hidden md:block absolute right-6 lg:right-10 top-1/2 -translate-y-1/2 w-[300px] lg:w-[370px] h-[290px]"
          >
            {/* Central geometric market wave */}
            <div className="absolute inset-x-6 top-11 bottom-11 rounded-2xl border border-[var(--border)]/15 bg-gradient-to-br from-[var(--white)]/[0.09] via-[var(--white)]/[0.04] to-transparent backdrop-blur-sm p-5 flex items-end justify-center animate-float-slow" style={{ animationDelay: '1.2s' }}>
              <svg viewBox="0 0 260 150" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="heroCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="55%" stopColor="#34D399" />
                    <stop offset="100%" stopColor="#A5B4FC" />
                  </linearGradient>
                  <linearGradient id="heroAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Horizontal baseline hairlines */}
                <line x1="8" y1="36" x2="252" y2="36" stroke="white" strokeOpacity="0.08" strokeDasharray="3 5" />
                <line x1="8" y1="78" x2="252" y2="78" stroke="white" strokeOpacity="0.08" strokeDasharray="3 5" />
                <line x1="8" y1="120" x2="252" y2="120" stroke="white" strokeOpacity="0.1" />

                {/* Geometric rising bars */}
                <g className="animate-bar-float" style={{ animationDelay: '0s' }}>
                  <rect x="24" y="92" width="12" height="32" rx="4" fill="#38BDF8" fillOpacity="0.35" />
                </g>
                <g className="animate-bar-float" style={{ animationDelay: '0.4s' }}>
                  <rect x="56" y="76" width="12" height="48" rx="4" fill="#38BDF8" fillOpacity="0.45" />
                </g>
                <g className="animate-bar-float" style={{ animationDelay: '0.8s' }}>
                  <rect x="88" y="84" width="12" height="40" rx="4" fill="#818CF8" fillOpacity="0.45" />
                </g>
                <g className="animate-bar-float" style={{ animationDelay: '1.2s' }}>
                  <rect x="120" y="60" width="12" height="64" rx="4" fill="#34D399" fillOpacity="0.55" />
                </g>
                <g className="animate-bar-float" style={{ animationDelay: '1.6s' }}>
                  <rect x="152" y="48" width="12" height="76" rx="4" fill="#34D399" fillOpacity="0.65" />
                </g>
                <g className="animate-bar-float" style={{ animationDelay: '2s' }}>
                  <rect x="184" y="56" width="12" height="68" rx="4" fill="#38BDF8" fillOpacity="0.55" />
                </g>
                <g className="animate-bar-float" style={{ animationDelay: '2.4s' }}>
                  <rect x="216" y="28" width="12" height="96" rx="4" fill="#22D3EE" fillOpacity="0.75" />
                </g>

                {/* Area fill under trajectory */}
                <path
                  d="M 16 112 C 44 108, 62 72, 94 80 C 122 86, 136 44, 168 46 C 194 48, 212 22, 244 18 L 244 128 L 16 128 Z"
                  fill="url(#heroAreaGrad)"
                />

                {/* Animated ascending curve */}
                <path
                  d="M 16 112 C 44 108, 62 72, 94 80 C 122 86, 136 44, 168 46 C 194 48, 212 22, 244 18"
                  fill="none"
                  stroke="url(#heroCurveGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="animate-draw-line"
                />

                {/* Crisp geometric node diamond at curve peak */}
                <rect
                  x="239"
                  y="13"
                  width="10"
                  height="10"
                  rx="2.5"
                  transform="rotate(45 244 18)"
                  fill="#67E8F9"
                  stroke="#0F1E3D"
                  strokeWidth="2"
                />
              </svg>
            </div>

            {/* Floating rotated diamond glass facet */}
            <div className="absolute top-6 right-10 w-24 h-24 rounded-2xl border border-[var(--border)]/30 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/10 backdrop-blur-xs rotate-12 shadow-lg animate-float-slow" />

            {/* Floating lower-left prism squircle */}
            <div className="absolute bottom-8 left-4 w-20 h-20 rounded-2xl border border-[var(--border)]/25 bg-gradient-to-tr from-[var(--secondary)]/20 to-[var(--primary)]/10 backdrop-blur-xs -rotate-12 animate-float-reverse" />

            {/* Central geometric market wave & candlestick sculpture */}
            <div className="absolute inset-x-6 top-11 bottom-11 rounded-2xl border border-[var(--border)]/15 bg-gradient-to-br from-[var(--white)]/[0.09] via-[var(--white)]/[0.04] to-transparent backdrop-blur-sm p-5 flex items-end justify-center animate-float-slow" style={{ animationDelay: '1.2s' }}>
              <svg viewBox="0 0 260 150" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="heroCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="55%" stopColor="#34D399" />
                    <stop offset="100%" stopColor="#A5B4FC" />
                  </linearGradient>
                  <linearGradient id="heroAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Horizontal baseline hairlines */}
                <line x1="8" y1="36" x2="252" y2="36" stroke="white" strokeOpacity="0.08" strokeDasharray="3 5" />
                <line x1="8" y1="78" x2="252" y2="78" stroke="white" strokeOpacity="0.08" strokeDasharray="3 5" />
                <line x1="8" y1="120" x2="252" y2="120" stroke="white" strokeOpacity="0.1" />

                {/* Geometric rising bars */}
                <g className="animate-bar-float" style={{ animationDelay: '0s' }}>
                  <rect x="24" y="92" width="12" height="32" rx="4" fill="#38BDF8" fillOpacity="0.35" />
                </g>
                <g className="animate-bar-float" style={{ animationDelay: '0.4s' }}>
                  <rect x="56" y="76" width="12" height="48" rx="4" fill="#38BDF8" fillOpacity="0.45" />
                </g>
                <g className="animate-bar-float" style={{ animationDelay: '0.8s' }}>
                  <rect x="88" y="84" width="12" height="40" rx="4" fill="#818CF8" fillOpacity="0.45" />
                </g>
                <g className="animate-bar-float" style={{ animationDelay: '1.2s' }}>
                  <rect x="120" y="60" width="12" height="64" rx="4" fill="#34D399" fillOpacity="0.55" />
                </g>
                <g className="animate-bar-float" style={{ animationDelay: '1.6s' }}>
                  <rect x="152" y="48" width="12" height="76" rx="4" fill="#34D399" fillOpacity="0.65" />
                </g>
                <g className="animate-bar-float" style={{ animationDelay: '2s' }}>
                  <rect x="184" y="56" width="12" height="68" rx="4" fill="#38BDF8" fillOpacity="0.55" />
                </g>
                <g className="animate-bar-float" style={{ animationDelay: '2.4s' }}>
                  <rect x="216" y="28" width="12" height="96" rx="4" fill="#22D3EE" fillOpacity="0.75" />
                </g>

                {/* Area fill under trajectory */}
                <path
                  d="M 16 112 C 44 108, 62 72, 94 80 C 122 86, 136 44, 168 46 C 194 48, 212 22, 244 18 L 244 128 L 16 128 Z"
                  fill="url(#heroAreaGrad)"
                />

                {/* Animated ascending curve */}
                <path
                  d="M 16 112 C 44 108, 62 72, 94 80 C 122 86, 136 44, 168 46 C 194 48, 212 22, 244 18"
                  fill="none"
                  stroke="url(#heroCurveGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="animate-draw-line"
                />

                {/* Crisp geometric node diamond at curve peak */}
                <rect
                  x="239"
                  y="13"
                  width="10"
                  height="10"
                  rx="2.5"
                  transform="rotate(45 244 18)"
                  fill="#67E8F9"
                  stroke="#0F1E3D"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 md:max-w-[58%] lg:max-w-[60%]">
            <p className="text-xs sm:text-sm font-semibold text-[var(--primary)] tracking-wide">
              Xena Broker <span aria-hidden="true">·</span> Commission-Free US Equities
            </p>
            <h1
              className="mt-4 font-display font-extrabold text-[var(--foreground)] tracking-tight max-w-2xl"
              style={{
                fontSize: 'clamp(2.25rem, 4vw, 3.5rem)',
                textWrap: 'balance',
                animationDelay: '70ms',
              }}
            >
              Stock trading and portfolio management built for clarity.
            </h1>
            <p
              className="mt-5 text-base sm:text-[17px] text-[var(--muted-foreground)] leading-relaxed max-w-xl"
              style={{ animationDelay: '140ms' }}
            >
              Select stocks live, inspect interactive TradingView charts, place market or limit orders from your trade desk, and manage cash funding from one clean workspace.
            </p>

            {/* Primary CTA Buttons */}
            <div
              className="animate-fade-up relative z-10 mt-8 pt-6 border-t border-[var(--border)]/15 md:max-w-[62%]"
              style={{ animationDelay: '210ms' }}
            >
              {user ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('trade')}
                    className="group inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-xl shadow-md hover:from-[var(--primary-100)] hover:via-[var(--secondary-100)] hover:to-[var(--accent-100)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Open Trade Terminal</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('funding')}
                    className="px-4.5 py-3 text-sm font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--white)]/15 to-[var(--white)]/5 border border-[var(--white)]/20 rounded-xl hover:from-[var(--white)]/25 hover:to-[var(--white)]/10 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Manage Funding
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('signup')}
                    className="group inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-xl shadow-md hover:from-[var(--primary-100)] hover:via-[var(--secondary-100)] hover:to-[var(--accent-100)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="px-5 py-3 text-sm font-semibold text-[var(--primary)] bg-gradient-to-r from-[var(--white)]/15 to-[var(--white)]/5 border border-[var(--primary)]/20 rounded-xl hover:from-[var(--white)]/25 hover:to-[var(--primary)]/20 hover:text-[var(--primary-foreground)] transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('trade')}
                    className="px-4 py-3 text-sm font-medium text-[var(--primary)] bg-gradient-to-r from-[var(--white)]/10 to-transparent border border-[var(--primary)]/20 rounded-xl hover:text-[var(--primary-foreground)] hover:from-[var(--primary)]/20 hover:to-[var(--primary)]/30 transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Preview Trade Desk
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How Xena Broker Works (01 / 02 / 03) */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
              A direct workflow from funding to execution
            </h2>
            <p className="text-sm sm:text-base text-[var(--muted-foreground)] mt-1.5">
              Everything needed to fund your brokerage account, trade stocks, and monitor positions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 01 - Funding */}
          <div
            className="group relative overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] flex flex-col hover:-translate-y-1 hover:shadow-[var(--elevated)] hover:border-[var(--primary)] transition-all duration-200 animate-fade-up"
            style={{ animationDelay: '100ms' }}
          >
            <WorkflowCardImage
              src={fundingVaultImg}
              alt="Hardware security key and mobile brokerage funding workspace"
              stepNumber="01"
              badgeGradient="from-[var(--primary)] to-[var(--secondary)]"
              fallbackGradient="from-[var(--primary-700)] to-[var(--secondary-700)]"
              FallbackIcon={ShieldCheck}
            />

            <div className="relative flex-1 p-6 sm:p-7 flex flex-col justify-between">
              <h3 className="font-display text-xl font-bold text-[var(--foreground)]">
                Sign Up & Fund Cash
              </h3>
              <p className="mt-2.5 text-[15px] text-[var(--muted-foreground)] leading-relaxed">
                Open your Xena Broker account and go straight to Funding to link a bank account, deposit USD, or withdraw settled cash at any time.
              </p>
              <button
                type="button"
                onClick={() => onNavigate(user ? 'funding' : 'signup')}
                className="group/btn relative z-10 mt-6 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[var(--primary)] bg-gradient-to-r from-[var(--primary-100)] to-[var(--secondary-100)]/80 border border-[var(--primary)]/80 rounded-xl hover:from-[var(--primary)] hover:to-[var(--secondary)] hover:text-[var(--primary-foreground)] hover:border-transparent transition-all duration-200 self-start cursor-pointer"
              >
                <span>{user ? 'Open Funding' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Card 02 - Trading */}
          <div
            className="group relative overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] flex flex-col hover:-translate-y-1 hover:shadow-[var(--elevated)] hover:border-[var(--secondary)] transition-all duration-200 animate-fade-up"
            style={{ animationDelay: '180ms' }}
          >
            <WorkflowCardImage
              src={tradingDeskImg}
              alt="Dual-monitor equities trading workstation displaying live candlestick charts"
              stepNumber="02"
              badgeGradient="from-[var(--secondary)] to-[var(--secondary-light)]"
              fallbackGradient="from-[var(--secondary-700)] to-[var(--secondary-200)]"
              FallbackIcon={ArrowRight}
            />

            <div className="relative flex-1 p-6 sm:p-7 flex flex-col justify-between">
              <h3 className="font-display text-xl font-bold text-[var(--foreground)]">
                Select Stocks & Trade Live
              </h3>
              <p className="mt-2.5 text-[15px] text-[var(--muted-foreground)] leading-relaxed">
                Inspect interactive TradingView candlestick and line charts right on the Trade workspace, and place market or limit orders in seconds.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('trade')}
                className="group/btn relative z-10 mt-6 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[var(--secondary)] bg-gradient-to-r from-[var(--secondary-100)] to-[var(--secondary-light)]/80 border border-[var(--secondary)]/80 rounded-xl hover:from-[var(--secondary)] hover:to-[var(--secondary-light)] hover:text-[var(--primary-foreground)] hover:border-transparent transition-all duration-200 self-start cursor-pointer"
              >
                <span>Go to Trade Desk</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Card 03 - Portfolio */}
          <div
            className="group relative overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] flex flex-col hover:-translate-y-1 hover:shadow-[var(--elevated)] hover:border-[var(--accent)] transition-all duration-200 animate-fade-up"
            style={{ animationDelay: '260ms' }}
          >
            <WorkflowCardImage
              src={portfolioStudioImg}
              alt="Contemporary glass financial research studio and portfolio office"
              stepNumber="03"
              badgeGradient="from-[var(--accent)] to-[var(--primary)]"
              fallbackGradient="from-[var(--accent-700)] to-[var(--primary-700)]"
              FallbackIcon={Building2}
            />

            <div className="relative flex-1 p-6 sm:p-7 flex flex-col justify-between">
              <h3 className="font-display text-xl font-bold text-[var(--foreground)]">
                Track Holdings & Orders
              </h3>
              <p className="mt-2.5 text-[15px] text-[var(--muted-foreground)] leading-relaxed">
                Review open working orders on the Trade desk, monitor real-time unrealized gains and KYC status in your Portfolio, and export CSVs.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('portfolio')}
                className="group/btn relative z-10 mt-6 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[var(--accent)] bg-gradient-to-r from-[var(--accent-100)] to-[var(--primary-100)]/80 border border-[var(--accent)]/80 rounded-xl hover:from-[var(--accent)] hover:to-[var(--primary)] hover:text-[var(--primary-foreground)] hover:border-transparent transition-all duration-200 self-start cursor-pointer"
              >
                <span>View Portfolio</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Stocks Section */}
      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="w-3.5 h-3.5 rounded-sm rotate-45 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] shrink-0"
            />
            <h2 className="font-display text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
              Popular US Equities
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('markets')}
            className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold text-[var(--primary)] bg-gradient-to-r from-[var(--primary-100)] to-[var(--secondary-100)]/80 border border-[var(--primary)]/75 rounded-xl hover:from-[var(--primary)] hover:to-[var(--secondary)] hover:text-[var(--primary-foreground)] hover:border-transparent transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Browse all {stocks.length} stocks</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredStocks.map((stock, idx) => {
            const change = stock.price - stock.previousClose;
            const changePct = (change / stock.previousClose) * 100;
            const isUp = change >= 0;

            return (
              <div
                key={stock.symbol}
                className={`group relative overflow-hidden bg-[var(--card)] border border-[var(--border)]/90 rounded-2xl p-5 sm:p-6 shadow-[var(--shadow)] flex items-center justify-between gap-4 hover:border-[var(--primary)] hover:shadow-[var(--elevated)] transition-all duration-200 animate-fade-up ${
                  isUp
                    ? 'from-[var(--white)] via-[var(--white)] to-emerald-50/45'
                    : 'from-[var(--white)] via-[var(--white)] to-rose-50/40'
                }`}
                style={{ animationDelay: `${80 + idx * 55}ms` }}
              >
                {/* Corner geometric facet */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-3xl rotate-12 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-45 ${
                    isUp
                      ? 'bg-gradient-to-br from-emerald-400/15 to-teal-500/5'
                      : 'bg-gradient-to-br from-rose-400/15 to-red-500/5'
                    }`}
                />

                <div className="relative z-10 min-w-0">
                  <div className="text-xs font-medium text-[var(--muted-foreground)]">
                    {stock.exchange} <span aria-hidden="true">·</span> {stock.sector}
                  </div>
                  <div className="mt-1 font-display text-lg font-extrabold text-[var(--foreground)]">
                    {stock.symbol}
                  </div>
                  <div className="text-xs sm:text-[13px] text-[var(--muted-foreground)] truncate max-w-[160px]">
                    {stock.name}
                  </div>
                  <div className="mt-3 font-mono tabular-nums text-xl font-bold text-[var(--foreground)]">
                    {formatCurrency(stock.price)}
                  </div>
                  <div
                    className={`text-xs sm:text-[13px] font-mono tabular-nums font-semibold ${
                      isUp ? 'text-[var(--secondary)]' : 'text-[var(--destructive)]'
                    }`}
                  >
                    {formatSignedCurrency(change)} ({formatPercent(changePct)})
                  </div>
                </div>

                <div className="relative z-10 flex flex-col items-end justify-between gap-4 shrink-0">
                  <MiniSparkline data={stock.sparkline} isPositive={isUp} width={96} height={36} />
                  <button
                    type="button"
                    onClick={() => onTradeSymbol(stock.symbol, 'buy')}
                    className="px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-xl shadow-2xs hover:from-[var(--primary-500)] hover:via-[var(--secondary-500)] hover:to-[var(--accent-500)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Trade {stock.symbol}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}