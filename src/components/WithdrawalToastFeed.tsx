import { useEffect, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface WithdrawalEvent {
  member: string;
  city: string;
  amount: number;
  method: string;
}

const WITHDRAWAL_EVENTS: WithdrawalEvent[] = [
  { member: 'Olivia K.', city: 'Boston, MA', amount: 2450, method: 'Chase ACH' },
  { member: 'Liam T.', city: 'Chicago, IL', amount: 4820, method: 'Bank Wire' },
  { member: 'Maya R.', city: 'Austin, TX', amount: 1650, method: 'Citibank ACH' },
  { member: 'Noah B.', city: 'Seattle, WA', amount: 5200, method: 'Fidelity ACH' },
  { member: 'Sophia D.', city: 'New York, NY', amount: 3180, method: 'Bank of America' },
  { member: 'Daniel H.', city: 'Denver, CO', amount: 1290, method: 'Wells Fargo ACH' },
  { member: 'Claire W.', city: 'San Diego, CA', amount: 6400, method: 'Instant ACH' },
];

export default function WithdrawalToastFeed() {
  const [cursor, setCursor] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cycleTimer: number | undefined;
    let hideTimer: number | undefined;

    const showNext = () => {
      if (cancelled) return;
      setCursor((prev) => prev + 1);
      setVisible(true);

      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        if (!cancelled) setVisible(false);
      }, 3900);

      cycleTimer = window.setTimeout(showNext, 5000);
    };

    const startTimer = window.setTimeout(showNext, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      if (cycleTimer) window.clearTimeout(cycleTimer);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible || cursor === 0) return null;

  const event = WITHDRAWAL_EVENTS[(cursor - 1) % WITHDRAWAL_EVENTS.length];

  return (
    <div
      aria-live="polite"
      className="fixed bottom-3 left-3 right-3 sm:right-auto sm:bottom-5 sm:left-5 sm:w-[348px] z-[45] pointer-events-none"
    >
      <div
        key={cursor}
        className="pointer-events-auto animate-fade-up flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[var(--card)] border border-[var(--border)]/40 ring-1 ring-white/10 shadow-[0_14px_34px_-6px_rgba(7,13,25,0.55)]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--secondary)] to-[var(--primary)] flex items-center justify-center shrink-0 shadow-xs">
            <ArrowUpRight className="w-4.5 h-4.5 text-[var(--primary-foreground)]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[var(--foreground)] truncate">
              {event.member} <span className="text-[var(--muted-foreground)] font-normal">· {event.city}</span>
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">
              Withdrew{' '}
              <span className="font-mono tabular-nums font-bold text-[var(--secondary)]">
                {formatCurrency(event.amount)}
              </span>{' '}
              <span aria-hidden="true">·</span> {event.method}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Dismiss withdrawal notification"
          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}