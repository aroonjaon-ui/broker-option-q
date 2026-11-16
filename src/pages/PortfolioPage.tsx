import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Download,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import {
  AccountMode,
  KycProfile,
  OrderSide,
  Position,
  Stock,
  UserAccount,
} from '../types/broker';
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
  onUpdateProfile: (name: string, email: string) => void;
  onChangePassword: (newPassword: string) => Promise<{ ok: boolean; message?: string }>;
  onLogout: () => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onTradeSymbol: (symbol: string, side: OrderSide) => void;
  onClosePosition: (symbol: string) => void;
  onBrowseMarkets: () => void;
  onNavigateFunding: () => void;
  accountMode: AccountMode;
  accountFrozen: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

function getInitials(name?: string): string {
  if (!name) return 'XB';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function PortfolioPage({
  user,
  kyc,
  onSaveKyc,
  stocks,
  positions,
  cashBalance,
  reservedCash,
  onUpdateProfile,
  onChangePassword,
  onLogout,
  onOpenAuth,
  onTradeSymbol,
  onClosePosition,
  onBrowseMarkets,
  onNavigateFunding,
  accountMode,
  accountFrozen,
  theme,
  onToggleTheme,
}: PortfolioPageProps) {
  const [sortBy, setSortBy] = useState<'value' | 'pnl' | 'symbol'>('value');
  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '');
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(
    null
  );

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
  const [kycDoc, setKycDoc] = useState<{ dataUrl: string; name: string } | null>(() => {
    if (kyc?.documentDataUrl) {
      return { dataUrl: kyc.documentDataUrl, name: kyc.documentName ?? 'ID document' };
    }
    return null;
  });
  const [kycReadBusy, setKycReadBusy] = useState(false);

  const handleKycFile = (file: File | null | undefined) => {
    setKycError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setKycError('Please upload a photo of your ID (JPG, PNG or WEBP).');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setKycError('That image is too large. Please upload a photo under 12 MB.');
      return;
    }
    setKycReadBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 1100;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setKycReadBusy(false);
          setKycError('Could not process that image. Try a different file.');
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        setKycDoc({ dataUrl, name: file.name });
        setKycReadBusy(false);
      };
      img.onerror = () => {
        setKycReadBusy(false);
        setKycError('Could not read that image. Try a different file.');
      };
      img.src = String(reader.result ?? '');
    };
    reader.onerror = () => {
      setKycReadBusy(false);
      setKycError('Could not read that file. Try again.');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setProfileName(user?.name ?? '');
    setProfileEmail(user?.email ?? '');
    if (!kyc?.fullName && user?.name) {
      setKycName(user.name);
    }
  }, [user, kyc?.fullName]);

  useEffect(() => {
    if (kyc?.status === 'verified' || kyc?.status === 'pending') {
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 6) {
      setPasswordMsg({ kind: 'error', text: 'Use at least 6 characters for your new password.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ kind: 'error', text: 'The two passwords do not match.' });
      return;
    }
    setPasswordBusy(true);
    const res = await onChangePassword(newPassword);
    setPasswordBusy(false);
    if (!res.ok) {
      setPasswordMsg({ kind: 'error', text: res.message ?? 'Could not update the password.' });
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    setSettingsMessage('Password updated successfully.');
    setPasswordMsg({
      kind: 'ok',
      text: 'Password changed. Use your new password the next time you sign in.',
    });
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
    if (!kycDoc) {
      setKycError('Upload a clear photo of your ID document so our compliance team can review it.');
      return;
    }

    onSaveKyc({
      status: 'pending',
      fullName: cleanName,
      dateOfBirth: kycDob,
      country: kycCountry.trim() || 'United States',
      idType: kycIdType,
      idLast4: cleanId.slice(-4).toUpperCase(),
      address: cleanAddr,
      submittedAt: new Date().toISOString(),
      documentDataUrl: kycDoc.dataUrl,
      documentName: kycDoc.name,
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
                          <button
                            type="button"
                            onClick={() => onClosePosition(h.symbol)}
                            disabled={accountFrozen}
                            className="px-3 py-1.5 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            title="Sell the full position at market"
                          >
                            Close
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
                              <button
                                type="button"
                                onClick={() => onClosePosition(h.symbol)}
                                disabled={accountFrozen}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                title="Sell the full position at market"
                              >
                                Close
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
                  : kyc?.status === 'pending'
                    ? 'Submitted · awaiting compliance review'
                    : kyc?.status === 'rejected'
                      ? 'Verification was not approved — please resubmit your document.'
                      : 'Complete Know Your Customer (KYC) verification for full brokerage compliance.'}
              </p>
            </div>
          </div>

          {(kyc?.status === 'verified' || kyc?.status === 'pending') && !kycEditing && (
            <button
              type="button"
              onClick={() => setKycEditing(true)}
              className="px-3.5 py-2 text-xs font-semibold text-[var(--muted)] bg-gradient-to-r from-[var(--subtle)] to-[var(--subtle)]/80 border border-[var(--border)] rounded-xl hover:from-[var(--white)]/10 hover:to-[var(--white)]/20 transition-all cursor-pointer"
            >
              {kyc?.status === 'pending' ? 'Update submission' : 'Update KYC Details'}
            </button>
          )}
        </div>

        {kyc?.status === 'pending' && !kycEditing ? (
          <div className="pt-5">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                Pending · awaiting admin approval
              </div>
              <p className="mt-1.5 text-xs sm:text-sm text-amber-800 leading-relaxed">
                Your identity document has been received and is queued for compliance review.
                You will see <strong>KYC Verified</strong> as soon as an admin approves it.
                {kyc.submittedAt ? ` Submitted ${formatTimestamp(kyc.submittedAt)}.` : ''}
              </p>
              {kyc.documentDataUrl && (
                <a
                  href={kyc.documentDataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  View uploaded {kyc.documentName ?? 'ID document'}
                </a>
              )}
            </div>
          </div>
        ) : kyc?.status === 'verified' && !kycEditing ? (
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

            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--input)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-[var(--foreground)]">
                    Upload ID document photo
                  </p>
                  <p className="mt-0.5 text-[11px] sm:text-xs text-[var(--muted-foreground)]">
                    Passport, driver&apos;s licence or national ID · JPG, PNG or WEBP · up to 12 MB.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--card)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted-foreground)] border border-[var(--border)]">
                  Required
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 rounded-xl bg-[var(--card)] border border-[var(--border)] px-3.5 py-2 text-xs sm:text-sm font-semibold text-[var(--foreground)] hover:border-[var(--primary)] transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{kycDoc ? 'Replace photo' : 'Choose photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleKycFile(e.target.files?.[0])}
                  />
                </label>

                {kycReadBusy && (
                  <span className="text-xs text-[var(--muted-foreground)]">Processing image…</span>
                )}

                {kycDoc && !kycReadBusy && (
                  <div className="flex items-center gap-2">
                    <img
                      src={kycDoc.dataUrl}
                      alt="ID document preview"
                      className="h-10 w-14 rounded-lg border border-[var(--border)] object-cover"
                    />
                    <span className="max-w-[160px] truncate text-xs font-medium text-[var(--secondary)]">
                      {kycDoc.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setKycDoc(null)}
                      aria-label="Remove uploaded document"
                      className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--subtle)] hover:text-[var(--foreground)] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
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
                Submit for review
              </button>
              {(kyc?.status === 'verified' || kyc?.status === 'pending') && (
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

            {/* Appearance */}
            <div className="lg:col-span-6 space-y-4 lg:border-l lg:border-[var(--border)] lg:pl-6">
              <h3 className="text-xs sm:text-sm font-bold text-[var(--muted-foreground)]">
                Appearance
              </h3>

              <div className="flex items-center justify-between gap-4 py-2.5">
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-[var(--muted-foreground)]">
                    Dark mode
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Switch the platform to a low-light theme. Your choice is saved on this device.
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={theme === 'dark'}
                  aria-label="Toggle dark mode"
                  onClick={onToggleTheme}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[var(--primary)] border-[var(--primary)]'
                      : 'bg-[var(--input)] border-[var(--border)]'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                      theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {accountMode === 'demo' && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  You are on the demo account with virtual funds. Withdrawals are locked — switch to
                  your real account in the header.
                </p>
              )}

              <div className="pt-4 border-t border-[var(--border)]">
                <h4 className="text-xs sm:text-sm font-bold text-[var(--muted-foreground)]">
                  Change password
                </h4>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  Update the password you use to sign in to your account.
                </p>

                <form onSubmit={handlePasswordSubmit} className="mt-3 space-y-2.5">
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordMsg(null);
                    }}
                    placeholder="New password (min. 6 characters)"
                    className="w-full px-3 py-2 text-sm text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                  />
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordMsg(null);
                    }}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 text-sm text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                  />

                  {passwordMsg && (
                    <p
                      className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                        passwordMsg.kind === 'ok'
                          ? 'border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]'
                          : 'border-[var(--destructive-border)] bg-[var(--destructive-bg)] text-[var(--destructive-fg)]'
                      }`}
                    >
                      {passwordMsg.text}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={passwordBusy}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-xl hover:from-[var(--primary-500)] hover:to-[var(--secondary-500)] disabled:opacity-60 transition-all cursor-pointer"
                  >
                    {passwordBusy ? 'Updating…' : 'Update password'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}