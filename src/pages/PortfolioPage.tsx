import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { KycProfile, OrderSide, Position, Stock, UserAccount } from '../types/broker';
import {
  downloadCsv,
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  formatTimestamp,
} from '../utils/formatters';

interface PortfolioPageProps {
  user: UserAccount | null;
  kyc: KycProfile | null;
  onSaveKyc: (profile: KycProfile) => void;
  stocks: Stock[];
  positions: Record<string, Position>;
  cashBalance: number;
  reservedCash: number;
  isLiveQuotes: boolean;
  onToggleLiveQuotes: () => void;
  onUpdateProfile: (name: string, email: string) => void;
  onResetAccount: (mode: 'starter' | 'fresh') => void;
  onLogout: () => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onTradeSymbol: (symbol: string, side: OrderSide) => void;
  onBrowseMarkets: () => void;
  onNavigateFunding: () => void;
}

function getInitials(name?: string): string {
  if (!name) return 'XB';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();

export default function PortfolioPage({
  user,
  kyc,
  onSaveKyc,
  stocks,
  positions,
  cashBalance,
  reservedCash,
  isLiveQuotes,
  onToggleLiveQuotes,
  onUpdateProfile,
  onResetAccount,
  onLogout,
  onOpenAuth,
  onTradeSymbol,
  onBrowseMarkets,
  onNavigateFunding,
}: PortfolioPageProps) {
  const [sortBy, setSortBy] = useState<'value' | 'pnl' | 'symbol'>('value');
  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '');
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<'starter' | 'fresh' | null>(null);

  // KYC Form State
  const [kycEditing, setKycEditing] = useState(kyc?.status !== 'verified');
  const [kycName, setKycName] = useState(kyc?.fullName ?? user?.name ?? '');
  const [kycDob, setKycDob] = useState(kyc?.dateOfBirth ?? '');
  const [kycCountry, setKycCountry] = useState(kyc?.country ?? 'United States');
  const [kycIdType, setKycIdType] = useState<'Passport' | "Driver's License" | 'National ID'>(
    kyc?.idType ?? 'Passport'
  );
  const [kycIdNumber, setKycIdNumber] = useState('');
  const [kycAddress, setKycAddress] = useState(kyc?.address ?? '');
  const [kycError, setKycError] = useState<string | null>(null);

  useEffect(() => {
    setProfileName(user?.name ?? '');
    setProfileEmail(user?.email ?? '');
    if (!kyc?.fullName && user?.name) {
      setKycName(user.name);
    }
  }, [user, kyc?.fullName]);

  useEffect(() => {
    if (kyc?.status === 'verified') {
      setKycEditing(false);
    }
  }, [kyc?.status]);

  const stockMap = useMemo(() => {
    const map = new Map<string, Stock>();
    stocks.forEach((s) => map.set(s.symbol, s));
    return map;
  }, [stocks]);

  const enrichedHoldings = useMemo(() => {
    const list = Object.values(positions)
      .filter((p) => p.shares > 0)
      .map((pos) => {
        const stock = stockMap.get(pos.symbol);
        const lastPrice = stock?.price ?? pos.avgCost;
        const prevClose = stock?.previousClose ?? lastPrice;
        const marketValue = pos.shares * lastPrice;
        const costBasis = pos.shares * pos.avgCost;
        const unrealizedPnl = marketValue - costBasis;
        const unrealizedPct = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;
        const dayChange = pos.shares * (lastPrice - prevClose);
        const dayChangePct = prevClose > 0 ? ((lastPrice - prevClose) / prevClose) * 100 : 0;

        return {
          symbol: pos.symbol,
          name: stock?.name ?? pos.symbol,
          sector: stock?.sector ?? 'Equity',
          shares: pos.shares,
          avgCost: pos.avgCost,
          lastPrice,
          marketValue,
          costBasis,
          unrealizedPnl,
          unrealizedPct,
          dayChange,
          dayChangePct,
        };
      });

    list.sort((a, b) => {
      if (sortBy === 'symbol') return a.symbol.localeCompare(b.symbol);
      if (sortBy === 'pnl') return b.unrealizedPnl - a.unrealizedPnl;
      return b.marketValue - a.marketValue;
    });

    return list;
  }, [positions, stockMap, sortBy]);

  const totalInvestments = enrichedHoldings.reduce((acc, h) => acc + h.marketValue, 0);
  const totalCostBasis = enrichedHoldings.reduce((acc, h) => acc + h.costBasis, 0);
  const totalAccountValue = totalInvestments + cashBalance;
  const totalUnrealizedPnl = totalInvestments - totalCostBasis;
  const totalUnrealizedPct =
    totalCostBasis > 0 ? (totalUnrealizedPnl / totalCostBasis) * 100 : 0;
  const totalDayChange = enrichedHoldings.reduce((acc, h) => acc + h.dayChange, 0);
  const totalDayPct =
    totalAccountValue - totalDayChange > 0
      ? (totalDayChange / (totalAccountValue - totalDayChange)) * 100
      : 0;
  const availableBuyingPower = Math.max(0, cashBalance - reservedCash);

  const allocationSlices = useMemo(() => {
    const slices = enrichedHoldings.map((h, idx) => ({
      label: h.symbol,
      name: h.name,
      value: h.marketValue,
      pct: totalAccountValue > 0 ? (h.marketValue / totalAccountValue) * 100 : 0,
      color: ['#3B82F6', '#10B981', '#8B5CF6', '#F97316', '#EC4899', '#64748B'][idx % 6],
    }));
    if (cashBalance > 0 || slices.length === 0) {
      slices.push({
        label: 'Cash',
        name: 'Settled USD',
        value: cashBalance,
        pct: totalAccountValue > 0 ? (cashBalance / totalAccountValue) * 100 : 100,
        color: '#CBD5E1',
      });
    }
    return slices;
  }, [enrichedHoldings, cashBalance, totalAccountValue]);

  const donutSegments = useMemo(() => {
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return allocationSlices.map((slice) => {
      const length = (slice.pct / 100) * circumference;
      const seg = {
        ...slice,
        radius,
        circumference,
        dashArray: `${length} ${circumference - length}`,
        dashOffset: -offset,
      };
      offset += length;
      return seg;
    });
  }, [allocationSlices]);

  const handleExportCsv = () => {
    downloadCsv(
      'xena-broker-portfolio.csv',
      ['Symbol', 'Company', 'Shares', 'Avg Cost', 'Last Price', 'Market Value', 'Unrealized P&L', 'Return %'],
      enrichedHoldings.map((h) => [
        h.symbol,
        h.name,
        h.shares,
        h.avgCost.toFixed(2),
        h.lastPrice.toFixed(2),
        h.marketValue.toFixed(2),
        h.unrealizedPnl.toFixed(2),
        `${h.unrealizedPct.toFixed(2)}%`,
      ])
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim().includes('@')) return;
    onUpdateProfile(profileName.trim(), profileEmail.trim().toLowerCase());
    setSettingsMessage('Profile details updated.');
  };

  const handleKycSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setKycError(null);

    const cleanName = kycName.trim();
    const cleanId = kycIdNumber.replace(/\s+/g, '');
    const cleanAddr = kycAddress.trim();

    if (cleanName.length < 2) {
      setKycError('Enter your full legal name as shown on your government ID.');
      return;
    }
    if (!kycDob) {
      setKycError('Enter your date of birth.');
      return;
    }
    if (cleanId.length < 4) {
      setKycError('Enter at least the last 4 characters of your ID document number.');
      return;
    }
    if (cleanAddr.length < 5) {
      setKycError('Enter your current residential address.');
      return;
    }

    onSaveKyc({
      status: 'verified',
      fullName: cleanName,
      dateOfBirth: kycDob,
      country: kycCountry.trim() || 'United States',
      idType: kycIdType,
      idLast4: cleanId.slice(-4).toUpperCase(),
      address: cleanAddr,
      verifiedAt: new Date().toISOString(),
    });
    setKycIdNumber('');
    setKycEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Unified Account Profile & 2 Balance Headers Card */}
      <section className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        {/* User Details Strip */}
        <div className="bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] text-[var(--primary-foreground)] px-5 sm:px-7 py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[var(--card)] border border-[var(--border)]/40 shadow-xs flex items-center justify-center font-display text-sm font-extrabold text-[var(--foreground)] shrink-0">
              {getInitials(user?.name)}
            </div>
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold text-[var(--foreground)] tracking-tight">
                {user ? user.name : 'Guest Brokerage Account'}
              </h1>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5">
                {user ? (
                  <>
                    {user.email} <span aria-hidden="true">·</span> Account {user.accountNumber}{' '}
                    <span aria-hidden="true">·</span>{' '}
                    <span
                      className={
                        kyc?.status === 'verified' ? 'text-[var(--secondary)] font-medium' : 'text-[var(--accent)] font-medium'
                      }
                    >
                      {kyc?.status === 'verified' ? 'KYC Verified' : 'KYC Unverified'}
                    </span>
                  </>
                ) : (
                  <>
                    Guest Session <span aria-hidden="true">·</span>{' '}
                    <span
                      className={
                        kyc?.status === 'verified' ? 'text-[var(--secondary)] font-medium' : 'text-[var(--accent)] font-medium'
                      }
                    >
                      {kyc?.status === 'verified' ? 'KYC Verified' : 'KYC Unverified'}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {enrichedHoldings.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[var(--foreground)] bg-[var(--card)]/20 border border-[var(--border)]/20 rounded-xl hover:from-[var(--white)]/25 hover:to-[var(--white)]/10 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}
            {user ? (
              <button
                type="button"
                onClick={onLogout}
                className="px-3.5 py-2 text-xs font-semibold text-[var(--foreground)] bg-[var(--card)]/20 border border-[var(--border)]/20 rounded-xl hover:from-[var(--white)]/20 hover:to-[var(--white)]/5 transition-all cursor-pointer"
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 text-xs font-semibold text-[var(--primary)] bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-xl shadow-xs hover:from-[var(--primary-100)] hover:via-[var(--secondary-100)] hover:to-[var(--accent-100)] transition-all cursor-pointer"
              >
                Sign In / Sign Up
              </button>
            )}
          </div>
        </div>

        {/* Strictly 2 Balance Headers Only */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
          <div className="p-6 sm:p-7 bg-[var(--card)]">
            <div className="text-xs sm:text-sm font-semibold text-[var(--muted-foreground)]">Total Account Value</div>
            <div className="mt-1.5 font-mono tabular-nums text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight">
              {formatCurrency(totalAccountValue)}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm font-mono tabular-nums">
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${
                  totalDayChange >= 0 ? 'text-[var(--secondary)]' : 'text-[var(--destructive)]'
                }`}
              >
                {totalDayChange >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {formatSignedCurrency(totalDayChange)} ({formatPercent(totalDayPct)}) Today
              </span>
              <span className="text-[var(--muted-foreground)]" aria-hidden="true">
                ·
              </span>
              <span
                className={`font-semibold ${
                  totalUnrealizedPnl >= 0 ? 'text-[var(--secondary)]' : 'text-[var(--destructive)]'
                }`}
              >
                {formatSignedCurrency(totalUnrealizedPnl)} ({formatPercent(totalUnrealizedPct)}) All-Time
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-7 bg-[var(--card)]">
            <div>
              <div className="text-xs sm:text-sm font-semibold text-[var(--muted-foreground)]">Cash Balance</div>
              <div className="mt-1.5 font-mono tabular-nums text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight">
                {formatCurrency(cashBalance)}
              </div>
              <div className="mt-2.5 text-xs sm:text-sm text-[var(--muted-foreground)] font-mono tabular-nums">
                {formatCurrency(availableBuyingPower)} available buying power
              </div>
            </div>

            <button
              type="button"
              onClick={onNavigateFunding}
              className="px-4.5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-xl shadow-sm hover:from-[var(--primary-100)] hover:via-[var(--secondary-100)] hover:to-[var(--accent-100)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              Deposit / Withdraw
            </button>
          </div>
        </div>
      </section>

      {/* Holdings + Asset Allocation Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Holdings Panel (8 cols) */}
        <div className="lg:col-span-8 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--card)] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-[var(--foreground)]">
                Stock Holdings ({enrichedHoldings.length})
              </h2>
            </div>

            <div className="flex items-center gap-1 bg-gradient-to-r from-[var(--subtle)] to-[var(--subtle)]/70 p-1 rounded-xl">
              {(
                [
                  { id: 'value', label: 'By Value' },
                  { id: 'pnl', label: 'By Return' },
                  { id: 'symbol', label: 'A–Z' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    sortBy === opt.id
                      ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-[var(--primary-foreground)] shadow-2xs'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {enrichedHoldings.length === 0 ? (
            <div className="p-12 text-center bg-[var(--card)]">
              <h3 className="font-display text-lg font-bold text-[var(--foreground)]">
                No stock holdings yet
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] mt-1.5 max-w-md mx-auto">
                Your cash balance of {formatCurrency(cashBalance)} is ready to invest.
              </p>
              <button
                type="button"
                onClick={onBrowseMarkets}
                className="mt-5 px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-xl shadow-sm hover:from-[var(--primary-100)] hover:via-[var(--secondary-100)] hover:to-[var(--accent-100)] transition-all cursor-pointer"
              >
                Browse Available Stocks
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Responsive Holdings List (< md) */}
              <div className="md:hidden divide-y divide-[var(--border)]">
                {enrichedHoldings.map((h) => {
                  const pnlUp = h.unrealizedPnl >= 0;
                  return (
                    <div key={h.symbol} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => onTradeSymbol(h.symbol, 'buy')}
                          className="text-left cursor-pointer"
                        >
                          <div className="font-display font-extrabold text-base text-[var(--foreground)]">
                            {h.symbol}{' '}
                            <span className="text-xs font-medium text-[var(--muted-foreground)]">
                              · {h.shares} sh
                            </span>
                          </div>
                          <div className="text-xs text-[var(--muted-foreground)]">{h.name}</div>
                        </button>

                        <div className="text-right font-mono tabular-nums">
                          <div className="text-base font-bold text-[var(--foreground)]">
                            {formatCurrency(h.marketValue)}
                          </div>
                          <div
                            className={`text-xs font-semibold ${
                              pnlUp ? 'text-[var(--secondary)]' : 'text-[var(--destructive)]'
                            }`}
                          >
                            {formatSignedCurrency(h.unrealizedPnl)} ({formatPercent(h.unrealizedPct)})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-[var(--border)] text-xs">
                        <span className="text-[var(--muted-foreground)] font-mono tabular-nums">
                          Avg {formatCurrency(h.avgCost)} · Last {formatCurrency(h.lastPrice)}
                        </span>
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onTradeSymbol(h.symbol, 'buy')}
                            className="px-3 py-1.5 font-semibold text-[var(--secondary)] bg-gradient-to-r from-[var(--secondary-100)] to-[var(--secondary-light)]/75 border border-[var(--secondary)] rounded-lg hover:from-[var(--secondary-100)] hover:to-[var(--secondary-light)]/50 transition-all cursor-pointer"
                          >
                            Buy
                          </button>
                          <button
                            type="button"
                            onClick={() => onTradeSymbol(h.symbol, 'sell')}
                            className="px-3 py-1.5 font-semibold text-[var(--destructive)] bg-gradient-to-r from-[var(--destructive-50)] to-[var(--destructive-100)]/75 border border-[var(--destructive)] rounded-lg hover:from-[var(--destructive-50)] hover:to-[var(--destructive-100)]/50 transition-all cursor-pointer"
                          >
                            Sell
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Holdings Table (md+) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--subtle)] via-white to-[var(--subtle)]/50 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      <th className="py-3.5 px-5">Stock</th>
                      <th className="py-3.5 px-3 text-right">Shares</th>
                      <th className="py-3.5 px-3 text-right">Avg Cost</th>
                      <th className="py-3.5 px-3 text-right">Price</th>
                      <th className="py-3.5 px-3 text-right">Market Value</th>
                      <th className="py-3.5 px-3 text-right">Total Return</th>
                      <th className="py-3.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-sm">
                    {enrichedHoldings.map((h) => {
                      const pnlUp = h.unrealizedPnl >= 0;
                      return (
                        <tr key={h.symbol} className="hover:bg-[var(--subtle)] transition-colors">
                          <td className="py-4 px-5">
                            <button
                              type="button"
                              onClick={() => onTradeSymbol(h.symbol, 'buy')}
                              className="text-left group cursor-pointer"
                            >
                              <div className="font-display text-base font-extrabold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                                {h.symbol}
                              </div>
                              <div className="text-xs text-[var(--muted-foreground)] truncate max-w-[160px]">
                                {h.name}
                              </div>
                            </button>
                          </td>
                          <td className="py-4 px-3 text-right font-mono tabular-nums font-medium text-[var(--foreground)]">
                            {h.shares}
                          </td>
                          <td className="py-4 px-3 text-right font-mono tabular-nums text-[var(--muted-foreground)]">
                            {formatCurrency(h.avgCost)}
                          </td>
                          <td className="py-4 px-3 text-right font-mono tabular-nums font-semibold text-[var(--foreground)]">
                            {formatCurrency(h.lastPrice)}
                          </td>
                          <td className="py-4 px-3 text-right font-mono tabular-nums text-base font-bold text-[var(--foreground)]">
                            {formatCurrency(h.marketValue)}
                          </td>
                          <td
                            className={`py-4 px-3 text-right font-mono tabular-nums font-semibold ${
                              pnlUp ? 'text-[var(--secondary)]' : 'text-[var(--destructive)]'
                            }`}
                          >
                            <div>{formatSignedCurrency(h.unrealizedPnl)}</div>
                            <div className="text-xs">{formatPercent(h.unrealizedPct)}</div>
                          </td>
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onTradeSymbol(h.symbol, 'buy')}
                                className="px-3 py-1.5 text-xs font-semibold text-[var(--secondary)] bg-gradient-to-r from-[var(--secondary-100)] to-[var(--secondary-light)]/75 border border-[var(--secondary)] rounded-lg hover:from-[var(--secondary-100)] hover:to-[var(--secondary-light)]/50 transition-all cursor-pointer"
                              >
                                Buy
                              </button>
                              <button
                                type="button"
                                onClick={() => onTradeSymbol(h.symbol, 'sell')}
                                className="px-3 py-1.5 text-xs font-semibold text-[var(--destructive)] bg-gradient-to-r from-[var(--destructive-50)] to-[var(--destructive-100)]/75 border border-[var(--destructive)] rounded-lg hover:from-[var(--destructive-50)] hover:to-[var(--destructive-100)]/50 transition-all cursor-pointer"
                              >
                                Sell
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Asset Allocation Donut Panel (4 cols) */}
        <div className="lg:col-span-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] p-6">
          <div className="pb-3.5 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-display text-base sm:text-lg font-bold text-[var(--foreground)]">
              Allocation
            </h2>
            <span className="text-xs font-medium text-[var(--muted-foreground)] font-mono tabular-nums">
              {enrichedHoldings.length} Stocks · Cash
            </span>
          </div>

          <div className="py-5 flex justify-center">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                <circle
                  cx="70"
                  cy="70"
                  r="56"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="16"
                />
                {donutSegments.map((seg) => (
                  <circle
                    key={seg.label}
                    cx="70"
                    cy="70"
                    r={seg.radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="16"
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">Equities</span>
                <span className="font-mono tabular-nums text-lg font-bold text-[var(--foreground)]">
                  {totalAccountValue > 0
                    ? `${((totalInvestments / totalAccountValue) * 100).toFixed(0)}%`
                    : '0%'}
                </span>
              </div>
            </div>
          </div>

          <div className="divide-y divide-[var(--border)] text-xs sm:text-sm">
            {allocationSlices.map((slice) => (
              <div key={slice.label} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-xs shrink-0"
                    style={{ backgroundColor: slice.color }}
                    aria-hidden="true"
                  />
                  <span className="font-bold text-[var(--foreground)]">{slice.label}</span>
                  <span className="text-[var(--muted-foreground)] truncate text-xs">{slice.name}</span>
                </div>
                <div className="text-right font-mono tabular-nums shrink-0">
                  <span className="font-semibold text-[var(--foreground)]">{slice.pct.toFixed(1)}%</span>
                  <span className="text-[var(--muted-foreground)] ml-2 text-xs">{formatCurrency(slice.value, 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KYC Identity Verification Section */}
      <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] p-6 sm:p-7">
        <div className="pb-4 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                kyc?.status === 'verified'
                  ? 'bg-gradient-to-br from-[var(--secondary)] to-[var(--primary)]/80 text-[var(--secondary)] border border-[var(--secondary)]/20'
                  : 'bg-gradient-to-br from-[var(--accent)] to-[var(--accent-700)]/80 text-[var(--accent)] border border-[var(--accent)]/20'}
              }`}
            >
              {kyc?.status === 'verified' ? <ShieldCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-[var(--foreground)]">
                KYC Identity Verification
              </h2>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5">
                {kyc?.status === 'verified'
                  ? `Verified · ${kyc.idType} ending in ${kyc.idLast4}`
                  : 'Complete Know Your Customer (KYC) verification for full brokerage compliance.'}
              </p>
            </div>
          </div>

          {kyc?.status === 'verified' && !kycEditing && (
            <button
              type="button"
              onClick={() => setKycEditing(true)}
              className="px-3.5 py-2 text-xs font-semibold text-[var(--muted)] bg-gradient-to-r from-[var(--subtle)] to-[var(--subtle)]/80 border border-[var(--border)] rounded-xl hover:from-[var(--white)]/10 hover:to-[var(--white)]/20 transition-all cursor-pointer"
            >
              Update KYC Details
            </button>
          )}
        </div>

        {kyc?.status === 'verified' && !kycEditing ? (
          <div className="pt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs sm:text-sm">
            <div>
              <div className="text-xs font-medium text-[var(--muted-foreground)]">Legal Full Name</div>
              <div className="mt-1 font-bold text-[var(--foreground)]">{kyc.fullName}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--muted-foreground)]">Date of Birth</div>
              <div className="mt-1 font-mono tabular-nums font-medium text-[var(--foreground)]">{kyc.dateOfBirth}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--muted-foreground)]">Government ID</div>
              <div className="mt-1 font-medium text-[var(--foreground)]">
                {kyc.idType} · ••••{kyc.idLast4}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-[var(--muted-foreground)]">Country & Address</div>
              <div className="mt-1 font-medium text-[var(--foreground)] truncate" title={`${kyc.address}, ${kyc.country}`}>
                {kyc.address}, {kyc.country}
              </div>
            </div>
            {kyc.verifiedAt && (
              <div className="sm:col-span-2 lg:col-span-4 pt-3 border-t border-[var(--border)] flex items-center gap-2 text-[var(--secondary)] font-semibold text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Identity verified on {formatTimestamp(kyc.verifiedAt)}</span>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleKycSubmit} className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="kyc-name" className="block text-xs sm:text-sm font-semibold text-[var(--muted-foreground)] mb-1.5">
                  Legal Full Name
                </label>
                <input
                  id="kyc-name"
                  type="text"
                  required
                  value={kycName}
                  onChange={(e) => {
                    setKycName(e.target.value);
                    setKycError(null);
                  }}
                  placeholder="As shown on ID"
                  className="w-full px-3.5 py-2.5 text-sm text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                />
              </div>

              <div>
                <label htmlFor="kyc-dob" className="block text-xs sm:text-sm font-semibold text-[var(--muted-foreground)] mb-1.5">
                  Date of Birth
                </label>
                <input
                  id="kyc-dob"
                  type="date"
                  required
                  value={kycDob}
                  onChange={(e) => {
                    setKycDob(e.target.value);
                    setKycError(null);
                  }}
                  className="w-full px-3.5 py-2.5 text-sm text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                />
              </div>

              <div>
                <label htmlFor="kyc-country" className="block text-xs sm:text-sm font-semibold text-[var(--muted-foreground)] mb-1.5">
                  Country of Residence
                </label>
                <input
                  id="kyc-country"
                  type="text"
                  required
                  value={kycCountry}
                  onChange={(e) => {
                    setKycCountry(e.target.value);
                    setKycError(null);
                  }}
                  className="w-full px-3.5 py-2.5 text-sm text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                />
              </div>

              <div>
                <label htmlFor="kyc-id-type" className="block text-xs sm:text-sm font-semibold text-[var(--muted-foreground)] mb-1.5">
                  Government ID Type
                </label>
                <select
                  id="kyc-id-type"
                  value={kycIdType}
                  onChange={(e) =>
                    setKycIdType(
                      e.target.value as 'Passport' | "Driver's License" | 'National ID'
                    )
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 cursor-pointer"
                >
                  <option value="Passport">Passport</option>
                  <option value="Driver's License">Driver&apos;s License</option>
                  <option value="National ID">National ID</option>
                </select>
              </div>

              <div>
                <label htmlFor="kyc-id-num" className="block text-xs sm:text-sm font-semibold text-[var(--muted-foreground)] mb-1.5">
                  Document Number
                </label>
                <input
                  id="kyc-id-num"
                  type="text"
                  required
                  value={kycIdNumber}
                  onChange={(e) => {
                    setKycIdNumber(e.target.value);
                    setKycError(null);
                  }}
                  placeholder="e.g. A12345678"
                  className="w-full px-3.5 py-2.5 text-sm font-mono text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                />
              </div>

              <div>
                <label htmlFor="kyc-address" className="block text-xs sm:text-sm font-semibold text-[var(--muted-foreground)] mb-1.5">
                  Residential Address
                </label>
                <input
                  id="kyc-address"
                  type="text"
                  required
                  value={kycAddress}
                  onChange={(e) => {
                    setKycAddress(e.target.value);
                    setKycError(null);
                  }}
                  placeholder="Street, City, Postal Code"
                  className="w-full px-3.5 py-2.5 text-sm text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                />
              </div>
            </div>

            {kycError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-[var(--destructive-bg)] border border-[var(--destructive-border)] text-xs sm:text-sm text-[var(--destructive-fg)] flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-[var(--destructive-fg)] shrink-0" />
                <span>{kycError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-xl shadow-sm hover:from-[var(--primary-100)] hover:via-[var(--secondary-100)] hover:to-[var(--accent-100)] transition-all cursor-pointer"
              >
                Submit KYC Verification
              </button>
              {kyc?.status === 'verified' && (
                <button
                  type="button"
                  onClick={() => setKycEditing(false)}
                  className="px-4 py-2.5 text-sm font-medium text-[var(--muted)] bg-gradient-to-r from-[var(--subtle)] to-[var(--subtle)]/80 border border-[var(--border)]/80 rounded-xl hover:from-[var(--white)]/20 hover:to-[var(--white)]/30 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </section>

      {/* Account Settings Section */}
      <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] p-6 sm:p-7">
        <div className="pb-4 border-b border-[var(--border)]">
          <h2 className="font-display text-base sm:text-lg font-bold text-[var(--foreground)]">
            Account Settings
          </h2>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5">
            Update user profile details, live quote streaming, or reset your brokerage balance.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
          {/* Profile Form */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-[var(--muted-foreground)]">User Details</h3>
            {user ? (
              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="settings-name" className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="settings-name"
                      type="text"
                      value={profileName}
                      onChange={(e) => {
                        setProfileName(e.target.value);
                        setSettingsMessage(null);
                      }}
                      className="w-full px-3.5 py-2.5 text-sm text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                    />
                  </div>
                  <div>
                    <label htmlFor="settings-email" className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="settings-email"
                      type="email"
                      value={profileEmail}
                      onChange={(e) => {
                        setProfileEmail(e.target.value);
                        setSettingsMessage(null);
                      }}
                      className="w-full px-3.5 py-2.5 text-sm text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="px-4.5 py-2.5 text-xs sm:text-sm font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-xl shadow-sm hover:from-[var(--primary-100)] hover:via-[var(--secondary-100)] hover:to-[var(--accent-100)] transition-all cursor-pointer"
                  >
                    Save Details
                  </button>
                  {settingsMessage && (
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[var(--secondary)]">
                      <CheckCircle2 className="w-4 h-4" />
                      {settingsMessage}
                    </span>
                  )}
                </div>
              </form>
            ) : (
              <div className="text-xs sm:text-sm text-[var(--muted-foreground)] space-y-3">
                <p>Sign in or create a free account to customize your name and email details.</p>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className="px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--primary)] bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-xl shadow-xs hover:from-[var(--primary-100)] hover:via-[var(--secondary-100)] hover:to-[var(--accent-100)] transition-all cursor-pointer"
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('signup')}
                    className="px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--muted)] bg-gradient-to-r from-[var(--subtle)] to-[var(--primary)]/50 border border-[var(--primary)]/50 rounded-xl hover:from-[var(--subtle)] hover:to-[var(--primary)]/75 transition-all cursor-pointer"
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            )}

            {/* Preferences */}
            <div className="lg:col-span-6 space-y-4 lg:border-l lg:border-[var(--border)] lg:pl-6">
              <h3 className="text-xs sm:text-sm font-bold text-[var(--muted-foreground)]">Preferences & Reset</h3>

              <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--border)]">
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-[var(--muted-foreground)]">Live Price Streaming</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Real-time simulated updates for stock quotes and portfolio value
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleLiveQuotes}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isLiveQuotes
                      ? 'bg-gradient-to-r from-[var(--secondary)] to-[var(--primary)]/80 border-[var(--secondary)] text-[var(--secondary)] hover:from-[var(--secondary-100)] hover:to-[var(--primary-100)]'
                      : 'bg-gradient-to-r from-[var(--subtle)] to-[var(--subtle)]/80 border-[var(--border)] text-[var(--muted)] hover:from-[var(--white)]/20 hover:to-[var(--white)]/30'
                  }`}
                >
                  {isLiveQuotes ? 'Live: On' : 'Live: Paused'}
                </button>
              </div>

              <div className="pt-1">
                <div className="text-xs sm:text-sm font-semibold text-[var(--muted-foreground)] mb-2">Account Reset</div>
                {confirmReset ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm text-[var(--muted-foreground)] mr-1">
                      {confirmReset === 'fresh'
                        ? 'Reset to $100,000 cash?'
                        : 'Restore starter portfolio?'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onResetAccount(confirmReset);
                        setConfirmReset(null);
                        setSettingsMessage('Account reset complete.');
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--destructive)] to-[var(--destructive)]/50 rounded-xl shadow-xs hover:from-[var(--destructive-100)] hover:to-[var(--destructive-50)] transition-all cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(null)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-[var(--muted)] bg-gradient-to-r from-[var(--subtle)] to-[var(--subtle)]/80 rounded-xl hover:from-[var(--white)]/20 hover:to-[var(--white)]/30 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => setConfirmReset('fresh')}
                      className="px-3.5 py-2 text-xs font-semibold text-[var(--muted)] bg-gradient-to-r from-[var(--subtle)] to-[var(--primary)]/50 border border-[var(--primary)]/50 rounded-xl hover:from-[var(--subtle)] hover:to-[var(--primary)]/75 transition-all cursor-pointer"
                    >
                      Reset to $100,000 Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset('starter')}
                      className="px-3.5 py-2 text-xs font-semibold text-[var(--muted)] bg-gradient-to-r from-[var(--subtle)] to-[var(--primary)]/50 border border-[var(--primary)]/50 rounded-xl hover:from-[var(--subtle)] hover:to-[var(--primary)]/75 transition-all cursor-pointer"
                    >
                      Restore Starter Portfolio
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}