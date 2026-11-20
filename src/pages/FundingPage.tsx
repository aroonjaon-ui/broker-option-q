import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Landmark,
  Lock,
  Plus,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { AccountMode, BankAccount, LedgerEntry, UserAccount } from '../types/broker';
import { CustodySettings } from '../cloud';
import { formatCurrency, formatSignedCurrency, formatTimestamp } from '../utils/formatters';

interface FundingPageProps {
  user: UserAccount | null;
  cashBalance: number;
  reservedCash: number;
  bankAccounts: BankAccount[];
  ledger: LedgerEntry[];
  custody: CustodySettings;
  accountMode: AccountMode;
  accountFrozen: boolean;
  onTransferFunds: (params: {
    direction: 'deposit' | 'withdrawal';
    amount: number;
    bankAccountId: string;
  }) => { ok: boolean; message: string };
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
  custody,
  accountMode,
  accountFrozen,
  onTransferFunds,
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
  const accountDigits = (user?.accountNumber ?? 'XN-482910').replace(/\D/g, '').slice(-6) || '482910';
  const depositRefCode = `${custody.referencePrefix || 'XN-DEP'}-${accountDigits}`;
  const fundingLocked = accountFrozen || accountMode === 'demo';

  const handleCopyValue = (fieldKey: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedField(fieldKey);
    window.setTimeout(() => {
      setCopiedField((prev) => (prev === fieldKey ? null : prev));
    }, 1800);
  };

  const fundingSummary = useMemo(() => {
    let deposits = 0;
    let withdrawals = 0;
    let pendingAmount = 0;
    let pendingCount = 0;
    ledger.forEach((entry) => {
      const amount = Math.abs(entry.amount);
      if (entry.status === 'pending') {
        pendingAmount += amount;
        pendingCount += 1;
        return;
      }
      if (entry.status === 'rejected') return;
      if (entry.type === 'deposit') deposits += amount;
      if (entry.type === 'withdrawal') withdrawals += amount;
    });
    return { deposits, withdrawals, pendingAmount, pendingCount };
  }, [ledger]);

  const filteredLedger = useMemo(() => {
    return ledger.filter((entry) => {
      if (ledgerFilter === 'transfers') {
        return entry.type === 'deposit' || entry.type === 'withdrawal';
      }
      if (ledgerFilter === 'trades') {
        return entry.type === 'trade_buy' || entry.type === 'trade_sell';
      }
      return true;
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

      {/* Funding Overview */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Funding overview">
        {[
          {
            label: 'Cash Balance',
            value: formatCurrency(cashBalance),
            hint: accountMode === 'demo' ? 'Virtual funds' : 'Settled buying power',
            icon: Wallet,
            accent: 'text-[var(--primary)]',
          },
          {
            label: 'Available to Withdraw',
            value: formatCurrency(availableCash),
            hint: reservedCash > 0 ? `${formatCurrency(reservedCash)} reserved` : 'No reserved cash',
            icon: ArrowDownLeft,
            accent: 'text-[var(--secondary)]',
          },
          {
            label: 'Approved Deposits',
            value: formatCurrency(fundingSummary.deposits),
            hint: 'Lifetime transfers in',
            icon: Landmark,
            accent: 'text-emerald-500',
          },
          {
            label: 'Pending Review',
            value: fundingSummary.pendingCount ? formatCurrency(fundingSummary.pendingAmount) : '—',
            hint: `${fundingSummary.pendingCount} open request${fundingSummary.pendingCount === 1 ? '' : 's'}`,
            icon: Clock,
            accent: 'text-[var(--accent)]',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3.5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                {stat.label}
              </span>
              <stat.icon className={`h-4 w-4 shrink-0 ${stat.accent}`} />
            </div>
            <div className="mt-1.5 font-mono tabular-nums text-lg font-bold text-[var(--foreground)]">
              {stat.value}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{stat.hint}</div>
          </div>
        ))}
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
              disabled={fundingLocked}
              className="py-3 px-4 text-sm font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-xl shadow-xs hover:from-[var(--primary-500)] hover:to-[var(--secondary-500)] transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Deposit</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenModal('withdrawal')}
              disabled={fundingLocked}
              className="py-3 px-4 text-sm font-semibold text-[var(--muted)] bg-[var(--subtle)] border border-[var(--border)] rounded-xl hover:bg-[var(--white)] hover:border-[var(--primary)] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Withdraw</span>
            </button>
          </div>

          {accountMode === 'demo' && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Demo account: practice with virtual funds. Deposits and withdrawals are locked —
              switch to your real account to fund it.
            </p>
          )}
          {accountFrozen && (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
              Account frozen for review. Funding and trading are locked until an admin resolves it.
            </p>
          )}

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

          {/* Deposit reference */}
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Deposit reference
                </div>
                <div className="mt-0.5 font-mono text-sm font-bold text-[var(--foreground)]">
                  {depositRefCode}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyValue('deposit-ref', depositRefCode)}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-[11px] font-semibold text-[var(--primary)] hover:border-[var(--primary)] transition-colors cursor-pointer"
              >
                {copiedField === 'deposit-ref' ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedField === 'deposit-ref' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
              Include this reference with every bank transfer so your deposit is matched to your account.
            </p>
          </div>

          {/* Transfer methods */}
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              Transfer methods
            </div>
            <div className="mt-2.5 space-y-2">
              {[
                { name: 'ACH Transfer', detail: 'No fee · 1–3 business days' },
                { name: 'Wire Transfer', detail: 'No fee · Same business day' },
              ].map((method) => (
                <div key={method.name} className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--subtle)] text-[var(--primary)]">
                    <Landmark className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--foreground)]">{method.name}</div>
                    <div className="text-[11px] text-[var(--muted-foreground)]">{method.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Linked bank accounts */}
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                Linked bank accounts
              </div>
              <button
                type="button"
                onClick={() => setShowAddBank((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add bank
              </button>
            </div>
            <div className="mt-2.5 space-y-1.5">
              {bankAccounts.length === 0 && (
                <p className="text-[11px] text-[var(--muted-foreground)]">No bank accounts linked yet.</p>
              )}
              {bankAccounts.map((acc) => {
                const isActive = selectedBankId
                  ? selectedBankId === acc.id
                  : acc.id === bankAccounts[0]?.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSelectedBankId(acc.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                        : 'border-[var(--border)] hover:border-[var(--primary)]'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
                      <span className="truncate text-xs font-semibold text-[var(--foreground)]">
                        {acc.institution}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--muted-foreground)]">
                      ••••{acc.last4}
                    </span>
                  </button>
                );
              })}
            </div>

            {showAddBank && (
              <form
                onSubmit={handleCreateBank}
                className="mt-3 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--input)] p-2.5"
              >
                <input
                  type="text"
                  required
                  value={newInstitution}
                  onChange={(e) => setNewInstitution(e.target.value)}
                  placeholder="Institution (e.g. Citibank)"
                  className="w-full px-2.5 py-2 text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Account type"
                    className="w-full px-2.5 py-2 text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
                  />
                  <input
                    type="text"
                    required
                    maxLength={4}
                    pattern="\d{4}"
                    value={newLast4}
                    onChange={(e) => setNewLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Last 4 digits"
                    className="w-full px-2.5 py-2 text-xs font-mono bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBank(false)}
                    className="px-2.5 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-lg cursor-pointer"
                  >
                    Link account
                  </button>
                </div>
              </form>
            )}
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
                    const isApproved = entry.status === 'approved' || entry.status === 'completed';
                    const isRejected = entry.status === 'rejected';
                    return (
                      <div
                        key={entry.id}
                        className="px-5 py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:bg-[var(--subtle)] transition-colors text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              isCredit
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-[var(--subtle)] text-[var(--muted-foreground)]'
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[var(--foreground)] text-sm truncate">
                              {entry.description}
                            </span>
                            {isPending && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                  {entry.type === 'withdrawal'
                                    ? 'Pending · awaiting approval'
                                    : 'Pending · awaiting admin review'}
                                </span>
                              </span>
                            )}
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--secondary)]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approved</span>
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--destructive)]">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Rejected</span>
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-[var(--muted-foreground)]">
                            <span>{formatTimestamp(entry.timestamp)}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{entry.reference}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyValue(`ledger-${entry.id}`, entry.reference)}
                              aria-label="Copy transaction reference"
                              className="inline-flex items-center rounded p-0.5 hover:bg-[var(--subtle)] hover:text-[var(--primary)] cursor-pointer"
                            >
                              {copiedField === `ledger-${entry.id}` ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 ml-auto shrink-0">
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
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-purple-500" />
                  <h3 className="font-display text-base sm:text-lg font-bold text-purple-500">
                    Identity Verification
                  </h3>
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
                  Verify your identity with a photo ID to unlock faster transfer reviews and full account access.
                </p>
              </div>
              <button
                type="button"
                onClick={onGoToPortfolio}
                className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-purple-500 bg-white/10 rounded-xl hover:bg-white/15 transition-all cursor-pointer"
              >
                <span>Complete Verification</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div
              className="bg-gradient-to-b from-blue-500/5 via-cyan-500/10 to-transparent border border-blue-500/20 rounded-2xl shadow-[var(--shadow)] p-5 sm:p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-500" />
                  <h3 className="font-display text-base sm:text-lg font-bold text-blue-500">
                    Secure, Segregated Custody
                  </h3>
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
                  Client cash is held with our clearing partner and every transfer is reviewed before it settles.
                </p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-500">
                <Lock className="h-3.5 w-3.5" />
                <span>Bank-level encryption enabled</span>
              </div>
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
          <div className="w-full max-w-md bg-[var(--modal-bg)] border border-[var(--modal-border)] rounded-2xl shadow-[var(--modal-shadow)] max-h-[90vh] overflow-y-auto p-5 sm:p-6">
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

            <form onSubmit={handleTransferSubmit} className="mt-4 space-y-4">
              {/* Compact custody deposit details */}
              {modalTransfer === 'deposit' && (
                <div className="rounded-xl bg-[var(--modal-card-bg)] border border-[var(--modal-card-border)] p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                      Send transfer to
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--primary)]">
                      {custody.bankName}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {[
                      { key: 'acct', label: 'Account', value: custody.accountNumber },
                      { key: 'routing', label: 'Routing', value: custody.routingNumber },
                      { key: 'ref', label: 'Reference', value: depositRefCode },
                    ].map((row) => (
                      <div
                        key={row.key}
                        className="flex items-center justify-between gap-2 rounded-lg bg-[var(--input)]/90 border border-[var(--border)]/80 px-2.5 py-1.5"
                      >
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
                            {row.label}
                          </div>
                          <div className="truncate font-mono font-bold tabular-nums text-[var(--foreground)]">
                            {row.value}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyValue(row.key, row.value.replace(/\s+/g, ''))}
                          aria-label={`Copy ${row.label.toLowerCase()}`}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[var(--primary)] bg-[var(--primary-50)] border border-[var(--primary)]/20 rounded-lg hover:bg-[var(--primary-100)] hover:text-[var(--primary-foreground)] transition-colors cursor-pointer shrink-0"
                        >
                          {copiedField === row.key ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
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

              {/* Compact review note */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
                {modalTransfer === 'deposit'
                  ? 'Confirm after sending the transfer. It shows as Pending and your balance is credited once an admin approves it.'
                  : 'Your withdrawal shows as Pending · awaiting approval and is completed once an admin approves it.'}
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