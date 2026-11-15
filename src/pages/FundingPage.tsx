import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Plus,
  X,
} from 'lucide-react';
import { BankAccount, LedgerEntry, UserAccount } from '../types/broker';
import { formatCurrency, formatSignedCurrency, formatTimestamp } from '../utils/formatters';

interface FundingPageProps {
  user: UserAccount | null;
  cashBalance: number;
  reservedCash: number;
  bankAccounts: BankAccount[];
  ledger: LedgerEntry[];
  onTransferFunds: (params: {
    direction: 'deposit' | 'withdrawal';
    amount: number;
    bankAccountId: string;
  }) => { ok: boolean; message: string };
  onApproveDeposit: (ledgerId: string) => void;
  onAddBankAccount: (institution: string, accountLabel: string, last4: string) => void;
  onGoToTrade: () => void;
  onGoToPortfolio: () => void;
}

const PAGE_SIZE = 2;

export default function FundingPage({
  user,
  cashBalance,
  reservedCash,
  bankAccounts,
  ledger,
  onTransferFunds,
  onApproveDeposit,
  onAddBankAccount,
  onGoToTrade,
  onGoToPortfolio,
}: FundingPageProps) {
  const [modalTransfer, setModalTransfer] = useState<'deposit' | 'withdrawal' | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>(bankAccounts[0]?.id ?? '');
  const [amountInput, setAmountInput] = useState<string>('5000');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'transfers' | 'trades'>('all');
  const [ledgerPage, setLedgerPage] = useState<number>(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [showAddBank, setShowAddBank] = useState(false);
  const [newInstitution, setNewInstitution] = useState('');
  const [newLabel, setNewLabel] = useState('Checking');
  const [newLast4, setNewLast4] = useState('');

  const availableCash = Math.max(0, cashBalance - reservedCash);
  const depositRefCode = `XN-DEP-${user?.accountNumber?.replace('XN-', '') ?? '482910'}`;

  const handleCopyValue = (fieldKey: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedField(fieldKey);
    window.setTimeout(() => {
      setCopiedField((prev) => (prev === fieldKey ? null : prev));
    }, 1800);
  };

  const filteredLedger = useMemo(() => {
    return ledger.filter((entry) => {
      if (ledgerFilter === 'transfers') {
        return entry.type === 'deposit' || entry.type === 'withdrawal';
      }
      if (ledgerFilter === 'trades') {
        return entry.type === 'trade_buy' || entry.type === 'trade_sell';
      }
      return True;
    });
  }, [ledger, ledgerFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLedger.length / PAGE_SIZE));
  const safePage = Math.min(ledgerPage, totalPages - 1);
  const visibleTransactions = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return filteredLedger.slice(start, start + PAGE_SIZE);
  }, [filteredLedger, safePage]);

  useEffect(() => {
    setLedgerPage(0);
  }, [ledgerFilter]);

  useEffect(() => {
    if (!modalTransfer) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalTransfer(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalTransfer]);

  const handleOpenModal = (dir: 'deposit' | 'withdrawal') => {
    setModalTransfer(dir);
    setFeedback(null);
    setShowAddBank(false);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTransfer) return;
    setFeedback(null);
    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedback({ type: 'error', message: 'Enter a valid amount greater than $0.00.' });
      return;
    }

    const res = onTransferFunds({
      direction: modalTransfer,
      amount: Number(amount.toFixed(2)),
      bankAccountId: selectedBankId || bankAccounts[0]?.id,
    });

    if (res.ok) {
      setFeedback({ type: 'success', message: res.message });
      setLedgerFilter('all');
      setLedgerPage(0);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleCreateBank = (e: React.FormEvent) => {
    e.preventDefault();
    const inst = newInstitution.trim();
    const cleanLast4 = newLast4.replace(/\D/g, '').slice(-4);
    if (!inst || cleanLast4.length !== 4) return;
    onAddBankAccount(inst, newLabel.trim() || 'Checking', cleanLast4);
    setNewInstitution('');
    setNewLast4('');
    setShowAddBank(false);
  };

  const selectedBank =
    bankAccounts.find((b) => b.id === selectedBankId) ?? bankAccounts[0];

  return (
    <div className="space-y-6">
      {/* Premium Balance Header */}
      <section className="relative overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm px-5 py-4.5 sm:px-7 sm:py-5.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 overflow-hidden bg-[url('/patterns/grid-pattern.svg')] bg-center bg-no-repeat opacity-8"
        />

        {/* Breathing ambient orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 right-16 w-60 h-60 rounded-full bg-[var(--primary)]/15 blur-3xl animate-ambient-breathe"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 w-56 h-56 rounded-full bg-[var(--secondary)]/15 blur-3xl animate-ambient-breathe"
          style={{ animationDelay: '2.2s' }}
        />

        {/* Mobile corner facets */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-7 -right-7 w-24 h-24 rounded-2xl border border-[var(--border)]/25 bg-gradient-to-br from-[var(--primary)]/15 to-[var(--secondary)]/5 rotate-12 sm:hidden animate-float-slow"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 right-10 w-16 h-16 rounded-xl border border-[var(--border)]/20 bg-[var(--white)]/[0.04] -rotate-12 sm:hidden animate-float-reverse"
        />

        {/* Desktop geometric backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none hidden sm:block absolute right-56 lg:right-72 top-1/2 -translate-y-1/2 w-56 h-36 opacity-85"
        >
          {/* Orbiting dashed ring */}
          <svg viewBox="0 0 180 180" className="absolute -top-6 right-4 w-44 h-44 animate-orbit-slow opacity-45">
            <circle
              cx="90"
              cy="90"
              r="76"
              fill="none"
              stroke="url(#fundingRingGrad)"
              strokeWidth="1.2"
              strokeDasharray="8 12"
            />
            <defs>
              <linearGradient id="fundingRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#818CF8" stopOpacity="0.15" />
              </linearGradient>
            </defs>
          </svg>

          {/* Counter-orbiting inner ring */}
          <svg viewBox="0 0 180 180" className="absolute -top-6 right-4 w-44 h-44 animate-orbit-reverse opacity-35">
            <circle
              cx="90"
              cy="90"
              r="54"
              fill="none"
              stroke="#67E8F9"
              strokeWidth="1"
              strokeDasharray="34 22 10 22"
            />
          </svg>

          {/* Floating frosted glass diamond & squircle facets */}
          <div className="absolute top-2 right-4 w-14 h-14 rounded-xl border border-[var(--border)]/30 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/10 backdrop-blur-xs rotate-12 animate-float-slow" />
          <div className="absolute bottom-1 left-2 w-12 h-12 rounded-xl border border-[var(--border)]/25 bg-gradient-to-tr from-[var(--secondary)]/20 to-[var(--primary)]/10 backdrop-blur-xs -rotate-12 animate-float-reverse" />

          {/* Compact geometric vector bars + ascending flow line */}
          <svg viewBox="0 0 160 80" className="hidden md:block absolute inset-x-4 bottom-2 w-40 h-20 overflow-visible opacity-80">
            <defs>
              <linearGradient id="fundingWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="55%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#A5B4FC" />
              </linearGradient>
            </defs>
            <g className="animate-bar-float" style={{ animationDelay: '0s' }}>
              <rect x="18" y="48" width="8" height="22" rx="3" fill="#38BDF8" fillOpacity="0.35" />
            </g>
            <g className="animate-bar-float" style={{ animationDelay: '0.45s' }}>
              <rect x="42" y="38" width="8" height="32" rx="3" fill="#34D399" fillOpacity="0.45" />
            </g>
            <g className="animate-bar-float" style={{ animationDelay: '0.9s' }}>
              <rect x="66" y="42" width="8" height="28" rx="3" fill="#818CF8" fillOpacity="0.45" />
            </g>
            <g className="animate-bar-float" style={{ animationDelay: '1.35s' }}>
              <rect x="90" y="26" width="8" height="44" rx="3" fill="#22D3EE" fillOpacity="0.55" />
            </g>
            <g className="animate-bar-float" style={{ animationDelay: '1.8s' }}>
              <rect x="114" y="18" width="8" height="52" rx="3" fill="#34D399" fillOpacity="0.65" />
            </g>
            <path
              d="M 12 58 C 34 54, 48 34, 70 38 C 90 42, 106 20, 134 14"
              fill="none"
              stroke="url(#fundingWaveGrad)"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="animate-draw-line"
            />
            <rect
              x="130"
              y="10"
              width="7"
              height="7"
              rx="2"
              transform="rotate(45 133.5 13.5)"
              fill="#67E8F9"
            />
          </svg>
        </div>

        {/* Balance Content */}
        <div className="relative z-10 animate-fade-up">
          <p className="text-xs font-semibold text-[var(--primary)] tracking-wide">
            {user
              ? `${user.name} · Account ${user.accountNumber}`
              : 'Individual Cash Brokerage Account'}
          </p>
          <div className="mt-1 flex items-baseline gap-2.5">
            <h1 className="font-mono tabular-nums text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
              {formatCurrency(cashBalance)}
            </h1>
            <span className="text-xs sm:text-sm font-medium text-[var(--muted-foreground)]">Cash Balance</span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div
          className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0 animate-fade-up"
          style={{ animationDelay: '90ms' }}
        >
          <button
            type="button"
            onClick={onGoToTrade}
            className="group inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-xl shadow-sm hover:from-[var(--primary-100)] hover:via-[var(--secondary-100)] hover:to-[var(--accent-100)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Trade Stocks</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
          <button
            type="button"
            onClick={onGoToPortfolio}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--foreground)] bg-[var(--card)]/20 border border-[var(--border)]/20 rounded-xl hover:from-[var(--white)]/20 hover:to-[var(--white)]/5 transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
          >
            View Portfolio
          </button>
        </div>
      </section>

      {/* Main 2-Column Funding Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Funding Actions */}
        <div className="lg:col-span-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] p-6">
          <h2 className="font-display text-base font-bold text-[var(--foreground)] pb-3.5 border-b border-[var(--border)]">
            Funding & Transfers
          </h2>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              type="button"
              onClick={() => handleOpenModal('deposit')}
              className="py-3 px-4 text-sm font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-xl shadow-xs hover:from-[var(--primary-500)] hover:to-[var(--secondary-500)] transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Deposit</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenModal('withdrawal')}
              className="py-3 px-4 text-sm font-semibold text-[var(--muted)] bg-[var(--subtle)] border border-[var(--border)] rounded-xl hover:bg-[var(--white)] hover:border-[var(--primary)] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Withdraw</span>
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-[var(--border)] space-y-3 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-[var(--muted-foreground)]">
              <span>Primary Bank</span>
              <span className="font-semibold text-[var(--foreground)]">
                {selectedBank
                  ? `${selectedBank.institution} ••••${selectedBank.last4}`
                  : 'None linked'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[var(--muted-foreground)]">
              <span>Transfer Fee</span>
              <span className="font-mono tabular-nums font-semibold text-[var(--secondary)]">$0.00</span>
            </div>
            <div className="flex items-center justify-between text-[var(--muted-foreground)]">
              <span>Settlement</span>
              <span className="font-semibold text-[var(--foreground)]">Instant Buying Power</span>
            </div>
          </div>
        </div>

        {/* Right: Transaction History + Promotional Cards */}
        <div className="lg:col-span-8 space-y-5">
          {/* Transaction History */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-sm sm:text-base font-bold text-[var(--foreground)]">
                Transaction History
              </h2>

              <div className="inline-flex items-center bg-[var(--subtle)] p-1 rounded-xl">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'transfers', label: 'Transfers' },
                    { id: 'trades', label: 'Trades' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setLedgerFilter(tab.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      ledgerFilter === tab.id
                        ? 'bg-[var(--card)] text-[var(--primary)] shadow-2xs'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {visibleTransactions.length === 0 ? (
              <div className="p-7 text-center text-[var(--muted-foreground)]">
                No transactions match this filter.
              </div>
            ) : (
              <>
                <div className="divide-y divide-[var(--border)]">
                  {visibleTransactions.map((entry) => {
                    const isCredit = entry.amount >= 0;
                    const isPending = entry.status === 'pending';
                    const isApproved = entry.status === 'approved';
                    return (
                      <div
                        key={entry.id}
                        className="px-5 py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:bg-[var(--subtle)] transition-colors text-sm"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[var(--foreground)] text-sm truncate">
                              {entry.description}
                            </span>
                            {isPending && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Pending · Under Review</span>
                              </span>
                            )}
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--secondary)]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approved</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                            {formatTimestamp(entry.timestamp)} <span aria-hidden="true">·</span>{' '}
                            {entry.reference}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 ml-auto shrink-0">
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => onApproveDeposit(entry.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-lg shadow-2xs hover:from-[var(--primary-400)] hover:to-[var(--secondary-400)] transition-all whitespace-nowrap cursor-pointer"
                            >
                              Admin Approve
                            </button>
                          )}

                          <div className="text-right font-mono tabular-nums">
                            <div
                              className={`text-sm sm:text-base font-bold ${
                                isPending
                                  ? 'text-[var(--accent)]'
                                  : isCredit
                                    ? 'text-[var(--secondary)]'
                                    : 'text-[var(--foreground)]'
                              }`}
                            >
                              {formatSignedCurrency(entry.amount)}
                            </div>
                            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                              {isPending ? 'Under Review' : `Bal ${formatCurrency(entry.balanceAfter)}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination for 2-item view */}
                {filteredLedger.length > PAGE_SIZE && (
                  <div className="px-5 py-2.5 bg-[var(--subtle)] border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                    <span className="font-mono tabular-nums font-medium">
                      Showing {safePage * PAGE_SIZE + 1}–
                      {Math.min((safePage + 1) * PAGE_SIZE, filteredLedger.length)} of{' '}
                      {filteredLedger.length}
                    </span>
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safePage === 0}
                        onClick={() => setLedgerPage((p) => Math.max(0, p - 1))}
                        aria-label="Previous transactions"
                        className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={safePage >= totalPages - 1}
                        onClick={() => setLedgerPage((p) => Math.min(totalPages - 1, p + 1))}
                        aria-label="Next transactions"
                        className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Promotional Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="bg-gradient-to-b from-[var(--primary)]/5 via-[var(--primary)]/10 to-transparent border border-[var(--primary)]/20 rounded-2xl shadow-[var(--shadow)] p-5 sm:p-6 flex flex-col justify-between"
            >
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-[var(--primary)]">
                  Zero-Commission US Equities
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
                  Put your deposited cash to work immediately with $0.00 commission market and limit orders across leading NASDAQ and NYSE stocks.
                </p>
              </div>
              <button
                type="button"
                onClick={onGoToTrade}
                className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--primary)] bg-white/10 rounded-xl hover:bg-white/15 transition-all cursor-pointer"
              >
                <span>Open Trade Desk</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div
              className="bg-gradient-to-b from-[var(--secondary)]/5 via-[var(--secondary)]/10 to-transparent border border-[var(--secondary)]/20 rounded-2xl shadow-[var(--shadow)] p-5 sm:p-6 flex flex-col justify-between"
            >
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-[var(--secondary)]">
                  Instant ACH Buying Power
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
                  Fund your brokerage account anytime with zero ACH transfer fees and track every position and return in real time from your portfolio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenModal('deposit')}
                className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--secondary)] bg-white/10 rounded-xl hover:bg-white/15 transition-all cursor-pointer"
              >
                <span>Make a Deposit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div
              className="bg-gradient-to-b from-purple-500/5 via-pink-500/10 to-transparent border border-purple-500/20 rounded-2xl shadow-[var(--shadow)] p-5 sm:p-6 flex flex-col justify-between"
            >
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-purple-500">
                  Admin-Verified Accounts
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
                  15% of users have verified accounts for faster deposit processing and priority support.
                </p>
              </div>
              <button
                type="button"
                onClick={() => console.log('View admin panel')}
                className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-purple-500 bg-white/10 rounded-xl hover:bg-white/15 transition-all cursor-pointer"
              >
                <span>View Admin Panel</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div
              className="bg-gradient-to-b from-blue-500/5 via-cyan-500/10 to-transparent border border-blue-500/20 rounded-2xl shadow-[var(--shadow)] p-5 sm:p-6 flex flex-col justify-between"
            >
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-blue-500">
                  24/7 Platform Support
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
                  Instant support for urgent issues — help is available around the clock for all account holders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => console.log('Contact support')}
                className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-blue-500 bg-white/10 rounded-xl hover:bg-white/15 transition-all cursor-pointer"
              >
                <span>Contact Support</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Deposit / Withdraw Popup Modal */}
      {modalTransfer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfer-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--dialog-bg)] backdrop-blur-[var(--dialog-blur)]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalTransfer(null);
          }}
        >
          <div className="w-full max-w-md bg-[var(--modal-bg)] border border-[var(--modal-border)] rounded-2xl shadow-[var(--modal-shadow)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--modal-border)]">
              <h2
                id="transfer-modal-title"
                className="font-display text-lg sm:text-xl font-bold text-[var(--modal-text)]"
              >
                {modalTransfer === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}
              </h2>
              <button
                type="button"
                onClick={() => setModalTransfer(null)}
                aria-label="Close modal"
                className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Switch between Deposit / Withdraw inside popup */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--subtle)] rounded-xl mt-4">
              <button
                type="button"
                onClick={() => {
                  setModalTransfer('deposit');
                  setFeedback(null);
                  setShowAddBank(false);
                }}
                className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                  modalTransfer === 'deposit'
                    ? 'bg-[var(--card)] text-[var(--primary)] shadow-2xs'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                Deposit
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalTransfer('withdrawal');
                  setFeedback(null);
                }}
                className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                  modalTransfer === 'withdrawal'
                    ? 'bg-[var(--card)] text-[var(--foreground)] shadow-2xs'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                Withdraw
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="mt-4 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Copyable Custody Deposit Account Details (shown for Deposit) */}
              {modalTransfer === 'deposit' && (
                <div className="rounded-2xl bg-[var(--modal-card-bg)] border border-[var(--modal-card-border)] p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold text-[var(--foreground)]">
                      Copy Deposit Account Details
                    </div>
                    <span className="text-[11px] font-medium text-[var(--primary)]">
                      Xena Clearing Custody
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                    Transfer your deposit to this custody account, then click Confirm Deposit below for admin review.
                  </p>

                  <div className="space-y-2 pt-1 text-xs">
                    <div className="flex items-center justify-between gap-2 bg-[var(--input)]/90 border border-[var(--border)]/80 rounded-xl px-3 py-2">
                      <div>
                        <div className="text-[11px] text-[var(--muted-foreground)]">Account Number</div>
                        <div className="font-mono tabular-nums font-bold text-[var(--foreground)]">
                          8842 9104 7731
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyValue('acct', '884291047731')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[var(--primary)] bg-gradient-to-r from-[var(--primary-50)] to-[var(--secondary-50)] border border-[var(--primary)]/20 rounded-lg hover:from-[var(--primary-100)] hover:to-[var(--secondary-100)] hover:text-[var(--primary-foreground)] transition-all cursor-pointer shrink-0"
                      >
                        {copiedField === 'acct' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between gap-1.5 bg-[var(--input)]/90 border border-[var(--border)]/80 rounded-xl px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-[11px] text-[var(--muted-foreground)]">Routing (ABA)</div>
                          <div className="font-mono tabular-nums font-bold text-[var(--foreground)] truncate">
                            021000021
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyValue('routing', '021000021')}
                          aria-label="Copy routing number"
                          className="p-1.5 text-[var(--primary)] bg-[var(--primary-50)] border border-[var(--primary)]/20 rounded-lg hover:bg-[var(--primary-100)] hover:text-[var(--primary-foreground)] transition-colors cursor-pointer shrink-0"
                        >
                          {copiedField === 'routing' ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 bg-[var(--input)]/90 border border-[var(--border)]/80 rounded-xl px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-[11px] text-[var(--muted-foreground)]">Reference</div>
                          <div className="font-mono tabular-nums font-bold text-[var(--foreground)] truncate">
                            {depositRefCode}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyValue('ref', depositRefCode)}
                          aria-label="Copy deposit reference"
                          className="p-1.5 text-[var(--primary)] bg-[var(--primary-50)] border border-[var(--primary)]/20 rounded-lg hover:bg-[var(--primary-100)] hover:text-[var(--primary-foreground)] transition-colors cursor-pointer shrink-0"
                        >
                          {copiedField === 'ref' ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Amount Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="modal-transfer-amount" className="text-sm font-semibold text-[var(--muted-foreground)]">
                    Transfer Amount
                  </label>
                  {modalTransfer === 'withdrawal' && (
                    <button
                      type="button"
                      onClick={() => setAmountInput(availableCash.toFixed(2))}
                      className="text-xs font-semibold text-[var(--primary)] hover:underline font-mono tabular-nums cursor-pointer"
                    >
                      Max {formatCurrency(availableCash)}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-lg text-[var(--muted-foreground)] pointer-events-none">
                    $
                  </span>
                  <input
                    id="modal-transfer-amount"
                    type="number"
                    min={1}
                    step={0.01}
                    value={amountInput}
                    onChange={(e) => {
                      setAmountInput(e.target.value);
                      setFeedback(null);
                    }}
                    className="w-full pl-8 pr-4 py-2.5 text-xl font-mono tabular-nums font-bold text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[500, 1000, 5000, 10000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setAmountInput(String(preset));
                        setFeedback(null);
                      }}
                      className="py-1.5 text-xs font-mono tabular-nums font-semibold text-[var(--muted-foreground)] bg-[var(--input)] border border-[var(--border)] rounded-lg hover:bg-[var(--subtle)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                    >
                      +${preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Bank Account (Withdrawal only) */}
              {modalTransfer === 'withdrawal' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="modal-bank-select" className="text-sm font-semibold text-[var(--muted-foreground)]">
                      Destination Bank Account
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddBank((v) => !v)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Bank</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="modal-bank-select"
                      value={selectedBankId}
                      onChange={(e) => setSelectedBankId(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 cursor-pointer"
                    >
                      {bankAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.institution} · {acc.accountLabel} (••••{acc.last4})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Transfer Summary */}
              <div className="pt-3 border-t border-[var(--border)] space-y-2 text-xs sm:text-sm text-[var(--muted-foreground)]">
                <div className="flex items-center justify-between">
                  <span>{modalTransfer === 'deposit' ? 'Custody Account' : 'To'}</span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {modalTransfer === 'deposit'
                      ? `Xena Clearing · ${depositRefCode}`
                      : selectedBank
                        ? `${selectedBank.institution} ••••${selectedBank.last4}`
                        : 'Linked Bank'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Review Status</span>
                  <span
                    className={`font-semibold ${
                      modalTransfer === 'deposit' ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'
                    }`}
                  >
                    {modalTransfer === 'deposit'
                      ? 'Pending Admin Approval'
                      : '1–2 Business Days'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Transfer Fee</span>
                  <span className="font-mono tabular-nums font-semibold text-[var(--secondary)]">$0.00</span>
                </div>
              </div>

              {feedback && (
                <div
                  role="status"
                  className={`p-3 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 ${
                    feedback.type === 'success'
                      ? 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-fg)]'
                      : 'bg-[var(--destructive-bg)] border-[var(--destructive-border)] text-[var(--destructive-fg)]'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--success-fg)] shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[var(--destructive-fg)] shrink-0 mt-0.5" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 text-sm font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-xl shadow-sm hover:from-[var(--primary-100)] hover:via-[var(--secondary-100)] hover:to-[var(--accent-100)] transition-all cursor-pointer"
              >
                {modalTransfer === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
              </button>
            </form>

            {/* Inline Link New Bank Form inside Modal (Withdrawal only) */}
            {modalTransfer === 'withdrawal' && showAddBank && (
              <form
                onSubmit={handleCreateBank}
                className="mt-4 pt-4 border-t border-[var(--border)] space-y-3"
              >
                <div className="text-xs font-bold text-[var(--muted-foreground)]">
                  Link New Bank Account
                </div>
                <input
                  type="text"
                  required
                  value={newInstitution}
                  onChange={(e) => setNewInstitution(e.target.value)}
                  placeholder="Institution (e.g. Citibank)"
                  className="w-full px-3 py-2 text-xs bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Account type"
                    className="w-full px-3 py-2 text-xs bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                  />
                  <input
                    type="text"
                    required
                    maxLength={4}
                    pattern="\d{4}"
                    value={newLast4}
                    onChange={(e) => setNewLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Last 4 digits"
                    className="w-full px-3 py-2 text-xs font-mono bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBank(false)}
                    className="px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-xl hover:from-[var(--primary-100)] hover:via-[var(--secondary-100)] hover:to-[var(--accent-100)] transition-all cursor-pointer"
                  >
                    Link Account
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}