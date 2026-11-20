import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Globe2,
  LineChart,
  Lock,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Wallet,
  Zap,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import MiniSparkline from '../components/MiniSparkline';
import tradingDeskImg from '../assets/images/home_trading_desk_1794692664220.jpg';
import phoneTerminalImg from '../assets/images/phone_trading_terminal.png';
import fundingTransferImg from '../assets/images/photo_funding.jpg';
import orderTicketImg from '../assets/images/photo_order.jpg';
import portfolioDashboardImg from '../assets/images/photo_portfolio.jpg';
import { MarketIndex, OrderSide, PageId, Stock, UserAccount } from '../types/broker';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface HomePageProps {
  user: UserAccount | null;
  stocks: Stock[];
  indices?: MarketIndex[];
  cashBalance?: number;
  totalPortfolioValue?: number;
  onNavigate: (page: PageId) => void;
  onTradeSymbol: (symbol: string, side: OrderSide) => void;
}

const ACCOUNT_PLANS = [
  {
    name: 'Demo',
    tagline: 'Practise with zero risk',
    min: 'Free',
    highlight: false,
    features: ['Live demo cash balance', 'Full trade desk & charts', 'Deposit / withdrawal flow', 'Reset your account anytime'],
    cta: 'Launch demo',
    page: 'trade' as PageId,
  },
  {
    name: 'Standard',
    tagline: 'For everyday investors',
    min: '$0 minimum',
    highlight: true,
    features: ['Commission-free US equities', 'Real-time portfolio analytics', 'Bank transfer funding', 'KYC verification & support'],
    cta: 'Open account',
    page: 'signup' as PageId,
  },
  {
    name: 'Active Trader',
    tagline: 'Built for high volume',
    min: '$0 minimum',
    highlight: false,
    features: ['Market & limit orders', 'Working-order cash reserves', 'CSV portfolio exports', 'Priority funding review'],
    cta: 'Start trading',
    page: 'trade' as PageId,
  },
];

const WHY_CARDS = [
  {
    icon: Zap,
    title: 'Fast order execution',
    body: 'Market orders fill instantly against live quotes; limit orders stay working until your price prints.',
  },
  {
    icon: Wallet,
    title: 'Transparent funding',
    body: 'Track every deposit and withdrawal in one ledger. Deposits are credited the moment an admin approves them.',
  },
  {
    icon: BarChart3,
    title: 'Real-time analytics',
    body: 'Unrealised P&L, allocation and cash reserves update as prices move, so you always know where you stand.',
  },
  {
    icon: Lock,
    title: 'Secure account isolation',
    body: 'Each account is stored separately with row-level security, so only you and the admin desk can see your data.',
  },
];

const AWARDS = [
  {
    year: '2026',
    title: 'Best Online Trading Platform',
    org: 'Global Finance Awards',
    category: 'Equities & ETFs',
  },
  {
    year: '2025',
    title: 'Most Trusted Brokerage Brand',
    org: 'FinTech Excellence Awards',
    category: 'Client Trust',
  },
  {
    year: '2025',
    title: 'Best Mobile Trading Experience',
    org: 'TradingTech Awards',
    category: 'Product Design',
  },
  {
    year: '2024',
    title: 'Excellence in Client Support',
    org: 'Broker Review Awards',
    category: 'Customer Service',
  },
  {
    year: '2024',
    title: 'Fastest Order Execution',
    org: 'Markets Summit',
    category: 'Execution Quality',
  },
  {
    year: '2023',
    title: 'Best New Brokerage Brand',
    org: 'Finance Innovators',
    category: 'Brand & Growth',
  },
];

const STEPS = [  {
    n: '01',
    img: fundingTransferImg,
    title: 'Open an account & fund it',
    body: 'Register in seconds, complete your profile, then link a bank account and submit a deposit for review.',
    cta: 'Create account',
    page: 'signup' as PageId,
  },
  {
    n: '02',
    img: orderTicketImg,
    title: 'Place your first trade',
    body: 'Search any US equity, inspect the interactive chart, and send a market or limit order from the trade desk.',
    cta: 'Open trade desk',
    page: 'trade' as PageId,
  },
  {
    n: '03',
    img: portfolioDashboardImg,
    title: 'Track, manage & withdraw',
    body: 'Monitor holdings and working orders, export statements, and withdraw settled cash back to your bank.',
    cta: 'View portfolio',
    page: 'portfolio' as PageId,
  },
];

export default function HomePage({
  user,
  stocks,
  indices = [],
  onNavigate,
  onTradeSymbol,
}: HomePageProps) {
  const phoneStageRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const phoneResetTimer = useRef<number | null>(null);

  const applyPhoneTilt = (clientX: number, clientY: number) => {
    const stage = phoneStageRef.current;
    const phone = phoneRef.current;
    if (!stage || !phone) return;
    const rect = stage.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width - 0.5;
    const py = (clientY - rect.top) / rect.height - 0.5;
    if (phoneResetTimer.current) {
      window.clearTimeout(phoneResetTimer.current);
      phoneResetTimer.current = null;
    }
    phone.classList.remove('xena-phone-float');
    phone.style.transition = 'transform 120ms ease-out';
    phone.style.transform =
      `perspective(1200px) rotateY(${(-16 + px * 24).toFixed(2)}deg) ` +
      `rotateX(${(7 - py * 18).toFixed(2)}deg) ` +
      `rotateZ(${(-5 + px * 5).toFixed(2)}deg) ` +
      `translate3d(${(px * 10).toFixed(1)}px, ${(py * 8).toFixed(1)}px, 0)`;
  };

  const resetPhoneTilt = () => {
    const phone = phoneRef.current;
    if (!phone) return;
    phone.style.transition = 'transform 550ms cubic-bezier(0.16, 1, 0.3, 1)';
    phone.style.transform =
      'perspective(1200px) rotateY(-16deg) rotateX(7deg) rotateZ(-5deg) translate3d(0, 0, 0)';
    phoneResetTimer.current = window.setTimeout(() => {
      phone.style.transition = '';
      phone.style.transform = '';
      phone.classList.add('xena-phone-float');
      phoneResetTimer.current = null;
    }, 560);
  };

  const featuredSymbols = ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'TSLA', 'META'];
  const featured = featuredSymbols
    .map((sym) => stocks.find((s) => s.symbol === sym))
    .filter((s): s is Stock => Boolean(s));

  const previewStock = featured[0] ?? stocks[0];
  const previewChange = previewStock
    ? previewStock.price - previewStock.previousClose
    : 0;
  const previewPct = previewStock ? (previewChange / previewStock.previousClose) * 100 : 0;

  const prevQuoteValues = useRef<Record<string, number>>({});
  const markDirection = (
    items: { key: string; label: string; value: string; pct: number; raw: number }[]
  ) =>
    items.map((item) => {
      const previous = prevQuoteValues.current[item.key];
      const dir =
        previous === undefined || item.raw === previous
          ? 'flat'
          : item.raw > previous
            ? 'up'
            : 'down';
      prevQuoteValues.current[item.key] = item.raw;
      return { ...item, dir };
    });

  const ticker = markDirection([
    ...indices.slice(0, 4).map((i) => ({
      key: i.id,
      label: i.name,
      value: i.isYield ? `${i.value.toFixed(2)}%` : i.value.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      pct: i.changePercent,
      raw: i.value,
    })),
    ...featured.map((s) => ({
      key: s.symbol,
      label: s.symbol,
      value: formatCurrency(s.price),
      pct: ((s.price - s.previousClose) / s.previousClose) * 100,
      raw: s.price,
    })),
  ]);

  // The market strip drifts sideways on its own, but users can still swipe or
  // drag it. Interaction pauses the drift briefly so it never fights the user.
  const tickerScrollerRef = useRef<HTMLDivElement | null>(null);
  const tickerPausedRef = useRef(false);
  const tickerPauseUntilRef = useRef(0);
  const tickerDragRef = useRef({ active: false, startX: 0, startScroll: 0 });

  const pauseTicker = (delay = 1200) => {
    tickerPausedRef.current = true;
    tickerPauseUntilRef.current = performance.now() + delay;
  };

  const resumeTicker = () => {
    tickerPausedRef.current = false;
    tickerPauseUntilRef.current = 0;
  };

  useEffect(() => {
    const el = tickerScrollerRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let last = performance.now();
    let position = el.scrollLeft;
    const drift = (now: number) => {
      const elapsed = Math.min(50, now - last);
      last = now;
      // If the user swiped/dragged, start drifting from their new position.
      if (Math.abs(el.scrollLeft - position) > 2) position = el.scrollLeft;
      if (!tickerPausedRef.current && now >= tickerPauseUntilRef.current) {
        const half = el.scrollWidth / 2;
        if (half > 0) {
          position += elapsed * 0.035;
          if (position >= half) position -= half;
          el.scrollLeft = position;
        }
      }
      frame = requestAnimationFrame(drift);
    };
    frame = requestAnimationFrame(drift);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="-mx-3 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-8">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-[#06182B] text-white">
        {/* Full-width header image — kept visible under a light tint */}
        <img
          src={tradingDeskImg}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-100 brightness-110"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#06182B]/75 via-[#06182B]/45 to-[#06182B]/70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 right-0 h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-24 h-[460px] w-[460px] rounded-full bg-sky-500/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
        />

        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pt-10 pb-12 sm:pt-14 sm:pb-16 lg:pt-20 lg:pb-24 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:grid-cols-[1.05fr_0.95fr] lg:grid-cols-[1.02fr_0.98fr] gap-3 sm:gap-8 lg:gap-16 items-center">
          <div className="min-w-0">
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[9px] leading-tight sm:px-3 sm:py-1.5 sm:text-xs sm:gap-2 font-semibold tracking-wide text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" />
              Commission-free US equities · Instant demo access
            </span>

            <h1 className="mt-4 font-display font-extrabold tracking-tight text-white text-[1.6rem] leading-[1.08] sm:mt-5 sm:text-4xl md:text-[2.8rem] lg:text-[3.6rem] lg:leading-[1.05]">
              Trade global markets{' '}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-sky-400 bg-clip-text text-transparent">
                with confidence
              </span>
            </h1>

            <p className="mt-3 max-w-xl text-[11px] leading-[1.5] sm:mt-5 sm:text-sm md:text-base lg:text-lg lg:leading-relaxed text-slate-300">
              One workspace for funding, execution and portfolio management. Live quotes,
              interactive charts and zero-commission stock trading — with a funding desk that
              reviews every transfer.
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <button
                type="button"
                onClick={() => onNavigate(user ? 'trade' : 'signup')}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 px-3 py-2.5 text-[11px] font-bold text-[#04231A] shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:shadow-emerald-400/30 cursor-pointer sm:w-auto sm:rounded-xl sm:px-6 sm:py-3.5 sm:text-sm lg:text-[15px]"
              >
                {user ? 'Go to trade desk' : 'Open a free account'}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('trade')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-[11px] font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/10 cursor-pointer sm:w-auto sm:rounded-xl sm:px-6 sm:py-3.5 sm:text-sm lg:text-[15px]"
              >
                <LineChart className="w-4 h-4 text-emerald-300" />
                Try the live demo
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-1.5 text-[10px] sm:mt-8 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-3 sm:text-[13px] text-slate-300">
              {['$0 commission on stocks', 'Same-day funding review', 'Demo account included'].map(
                (item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {item}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Cursor-reactive animated phone showing a real trading terminal */}
          <div
            ref={phoneStageRef}
            onMouseMove={(e) => applyPhoneTilt(e.clientX, e.clientY)}
            onMouseLeave={resetPhoneTilt}
            className="relative flex min-w-0 items-center justify-center py-2 sm:py-8"
          >
            <div className="absolute -inset-3 rounded-[3rem] bg-gradient-to-tr from-emerald-500/30 via-transparent to-sky-500/30 blur-3xl animate-ambient-breathe sm:-inset-6" />

            <div
              ref={phoneRef}
              className="xena-phone-float relative w-full max-w-[150px] rounded-[1.8rem] border-[5px] border-[#040C14] bg-[#040C14] p-1 shadow-[0_45px_95px_-20px_rgba(0,0,0,0.95)] ring-1 ring-white/20 sm:max-w-[200px] sm:rounded-[2.3rem] sm:border-[7px] md:max-w-[250px] lg:max-w-[310px] lg:rounded-[2.6rem]"
            >
              <div className="relative aspect-[1/2] w-full overflow-hidden rounded-[1.3rem] bg-[#0A1624] sm:rounded-[2rem]">
                <img
                  src={phoneTerminalImg}
                  alt="Xena Broker trading terminal on a phone"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ticker — auto-drifts sideways, swipe/drag to navigate manually */}
        <div className="relative border-t border-white/10 bg-[#04121F]">
          <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-3 flex items-center gap-4 sm:gap-6">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Markets
            </span>
            <div
              ref={tickerScrollerRef}
              className="xena-ticker flex min-w-0 flex-1 select-none items-center overflow-x-auto cursor-grab active:cursor-grabbing"
              onMouseEnter={() => pauseTicker(0)}
              onMouseLeave={resumeTicker}
              onTouchStart={() => pauseTicker(1500)}
              onTouchEnd={() => pauseTicker(1500)}
              onPointerDown={(e) => {
                if (e.pointerType !== 'mouse') return;
                tickerDragRef.current = {
                  active: true,
                  startX: e.clientX,
                  startScroll: e.currentTarget.scrollLeft,
                };
                pauseTicker(1500);
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const drag = tickerDragRef.current;
                if (!drag.active) return;
                e.currentTarget.scrollLeft = drag.startScroll - (e.clientX - drag.startX);
              }}
              onPointerUp={(e) => {
                tickerDragRef.current.active = false;
                pauseTicker(1200);
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
              }}
              onPointerCancel={() => {
                tickerDragRef.current.active = false;
                pauseTicker(1200);
              }}
            >
              {[0, 1].map((copy) => (
                <div
                  key={copy}
                  aria-hidden={copy === 1 ? true : undefined}
                  className="flex shrink-0 items-center gap-6 pr-6"
                >
                  {ticker.map((item) => (
                    <span
                      key={item.key}
                      className="shrink-0 inline-flex items-baseline gap-2 text-xs"
                    >
                      <span className="font-semibold text-slate-300">{item.label}</span>
                      <span
                        key={`${item.key}-${item.value}`}
                        className={`font-mono tabular-nums text-slate-400 ${
                          item.dir === 'up'
                            ? 'quote-flash-up'
                            : item.dir === 'down'
                              ? 'quote-flash-down'
                              : ''
                        }`}
                      >
                        {item.value}
                      </span>
                      <span
                        className={`font-mono text-[11px] font-semibold tabular-nums ${
                          item.pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatPercent(item.pct)}
                      </span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { value: `${stocks.length}+`, label: 'US stocks & ETFs' },
            { value: '0%', label: 'Commission on equities' },
            { value: 'T+0', label: 'Deposit review cycle' },
            { value: '24/5', label: 'Platform availability' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                {stat.value}
              </p>
              <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ WHY ============ */}
      <section className="bg-[#F8FAFC] py-14 sm:py-18">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
              Why Xena Broker
            </p>
            <h2 className="mt-3 font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              A brokerage workspace that gets out of your way
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              Everything you need to fund, trade and manage a stock portfolio — without the
              clutter of legacy platforms.
            </p>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_CARDS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                  <Icon className="w-5 h-5" />
                </span>
                <h3 className="mt-4 text-[15px] font-bold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ACCOUNT TYPES ============ */}
      <section className="bg-white py-14 sm:py-18 border-y border-slate-200">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                Account types
              </p>
              <h2 className="mt-3 font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Choose the account that fits your strategy
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <BadgeCheck className="w-4 h-4 text-emerald-500" />
              Verified via profile &amp; KYC
            </span>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {ACCOUNT_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${
                  plan.highlight
                    ? 'border-emerald-400 bg-[#06182B] text-white shadow-emerald-500/10'
                    : 'border-slate-200 bg-white text-slate-900'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#04231A]">
                    Most popular
                  </span>
                )}
                <h3 className={`font-display text-xl font-bold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                  {plan.name}
                </h3>
                <p className={`mt-1 text-xs font-medium ${plan.highlight ? 'text-slate-300' : 'text-slate-500'}`}>
                  {plan.tagline}
                </p>
                <p className={`mt-4 font-display text-2xl font-extrabold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                  {plan.min}
                </p>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] leading-snug">
                      <CheckCircle2
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          plan.highlight ? 'text-emerald-400' : 'text-emerald-500'
                        }`}
                      />
                      <span className={plan.highlight ? 'text-slate-300' : 'text-slate-600'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => onNavigate(plan.page)}
                  className={`mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-bold transition-all cursor-pointer ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-300 text-[#04231A] hover:brightness-105'
                      : 'border border-slate-300 bg-white text-slate-800 hover:border-slate-900 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Compare accounts */}
          <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Account feature
                  </th>
                  {ACCOUNT_PLANS.map((plan) => (
                    <th
                      key={plan.name}
                      className={`px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] ${
                        plan.highlight ? 'text-emerald-700' : 'text-slate-600'
                      }`}
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Minimum opening balance', 'Free', '$0', '$0'],
                  ['Commission on US equities', '$0', '$0', '$0'],
                  ['Order types', 'Market', 'Market & limit', 'Market & limit'],
                  ['Cash reserve for working orders', '—', 'Included', 'Included'],
                  ['Portfolio export (CSV)', '—', 'Included', 'Included'],
                  ['Identity verification', 'Not required', 'Required', 'Required'],
                  ['Bank deposits & withdrawals', '—', 'Included', 'Included'],
                  ['Funding review', 'Instant demo credit', 'Same day', 'Priority'],
                ].map((row, index) => (
                  <tr
                    key={row[0]}
                    className={`border-b border-slate-100 last:border-0 ${
                      index % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-slate-700">{row[0]}</td>
                    <td className="px-5 py-3 text-slate-500">{row[1]}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{row[2]}</td>
                    <td className="px-5 py-3 text-slate-600">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="bg-[#F8FAFC] py-14 sm:py-18">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
              How it works
            </p>
            <h2 className="mt-3 font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              From signup to your first position in minutes
            </h2>
          </div>

          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative h-44 overflow-hidden bg-slate-900">
                  <img
                    src={step.img}
                    alt={step.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06182B] via-[#06182B]/30 to-transparent" />
                  <span className="absolute bottom-3 left-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 font-mono text-xs font-bold text-[#04231A]">
                    {step.n}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-[15px] font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-600">{step.body}</p>
                  <button
                    type="button"
                    onClick={() => onNavigate(user && step.page === 'signup' ? 'funding' : step.page)}
                    className="mt-4 inline-flex items-center gap-1 self-start text-[13px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    {step.cta}
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ MARKETS ============ */}
      <section className="bg-white py-14 sm:py-18 border-t border-slate-200">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                Markets
              </p>
              <h2 className="mt-3 font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Popular US equities
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('markets')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800 transition-colors hover:border-slate-900 hover:bg-slate-900 hover:text-white cursor-pointer"
            >
              Browse all {stocks.length} stocks
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((stock) => {
              const change = stock.price - stock.previousClose;
              const pct = (change / stock.previousClose) * 100;
              const up = change >= 0;
              return (
                <div
                  key={stock.symbol}
                  className="rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-400">
                        {stock.exchange} · {stock.sector}
                      </p>
                      <p className="mt-0.5 font-display text-lg font-extrabold text-slate-900">
                        {stock.symbol}
                      </p>
                      <p className="truncate text-xs text-slate-500">{stock.name}</p>
                    </div>
                    <MiniSparkline data={stock.sparkline} isPositive={up} width={92} height={34} />
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="font-mono text-xl font-bold tabular-nums text-slate-900">
                        {formatCurrency(stock.price)}
                      </p>
                      <p
                        className={`text-xs font-semibold tabular-nums ${
                          up ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatPercent(pct)} today
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onTradeSymbol(stock.symbol, 'buy')}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-600 cursor-pointer"
                    >
                      Trade
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ AWARDS ============ */}
      <section className="bg-[#F8FAFC] py-14 sm:py-18 border-t border-slate-200">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
                Awards &amp; recognition
              </p>
              <h2 className="mt-3 font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Xena Broker, recognised by the industry
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600">
                Independent panels and trading publications have recognised our platform for
                execution quality, product design and client service.
              </p>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-white px-5 py-4 shadow-sm">
              <div>
                <div className="flex items-center gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mt-1.5 text-sm font-extrabold text-slate-900">4.9 / 5</p>
                <p className="text-[11px] font-medium text-slate-500">Average client rating</p>
              </div>
            </div>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AWARDS.map((award) => (
              <div
                key={`${award.year}-${award.title}`}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-300 opacity-70 transition-opacity group-hover:opacity-100"
                />
                <div className="flex items-start gap-4">
                  <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-50 ring-1 ring-amber-200">
                    <Trophy className="h-5 w-5 text-amber-600" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
                        {award.year}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        {award.category}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-bold leading-snug text-slate-900">
                      {award.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">{award.org}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, label: 'Segregated client cash' },
              { icon: Lock, label: 'Bank-grade encryption' },
              { icon: BadgeCheck, label: 'KYC verified accounts' },
              { icon: CreditCard, label: 'Transparent fee ledger' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[13px] font-semibold text-slate-700">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="bg-[#06182B] text-white">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-12 sm:py-16 grid gap-8 lg:grid-cols-[1.4fr_1fr] items-center">
          <div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
              Ready to start trading?
            </h2>
            <p className="mt-3 max-w-xl text-sm sm:text-base text-slate-300">
              Open an account, submit a deposit for review and place your first order — all from
              one dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <button
              type="button"
              onClick={() => onNavigate(user ? 'funding' : 'signup')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 px-6 py-3.5 text-sm font-bold text-[#04231A] transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              {user ? 'Fund your account' : 'Open a free account'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('markets')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10 cursor-pointer"
            >
              <Globe2 className="w-4 h-4" />
              Explore markets
            </button>
          </div>
        </div>
      </section>

      {/* ============ RISK WARNING ============ */}
      <section className="bg-white border-t border-slate-200">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-8">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Risk warning
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                Trading US equities involves risk. The value of investments can fall as well as
                rise, and you may get back less than you invested. Past performance is not a
                reliable indicator of future results. Only trade with capital you can afford to
                lose, and read the full terms and fee schedule before opening an account.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
