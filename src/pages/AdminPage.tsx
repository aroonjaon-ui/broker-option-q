import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  BookOpen,
  Check,
  Loader2,
  LogOut,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  AdminLedgerRow,
  AdminUserRow,
  adminAdjustBalance,
  adminApproveDeposit,
  adminCompleteWithdrawal,
  adminGetSettings,
  adminListLedger,
  adminListUsers,
  adminLogin,
  adminRejectDeposit,
  adminSetKyc,
  adminSetWelcomeBonus,
  adminStats,
} from '../cloud';
import { formatCurrency } from '../utils/formatters';

type AdminTab = 'overview' | 'users' | 'deposits' | 'withdrawals' | 'ledger' | 'settings';

interface AdminPageProps {
  onExit: () => void;
}

interface Stats {
  totalUsers: number;
  verifiedUsers: number;
  totalBalances: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  ledgerEntries: number;
}

const SESSION_KEY = 'xena_admin_session_v1';

const TABS: Array<{ id: AdminTab; label: string; icon: typeof Users }> = [
  { id: 'overview', label: 'Overview', icon: Shield },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'deposits', label: 'Deposits', icon: ArrowDownToLine },
  { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine },
  { id: 'ledger', label: 'Ledger', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function statusClasses(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'approved':
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'rejected':
    case 'failed':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

export default function AdminPage({ onExit }: AdminPageProps) {
  const [authed, setAuthed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [ledger, setLedger] = useState<AdminLedgerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const [search, setSearch] = useState('');
  const [adjustFor, setAdjustFor] = useState<AdminUserRow | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustBusy, setAdjustBusy] = useState(false);

  const [bonusAmount, setBonusAmount] = useState('500');
  const [bonusEnabled, setBonusEnabled] = useState(true);
  const [settingsBusy, setSettingsBusy] = useState(false);

  const [ledgerType, setLedgerType] = useState('all');
  const [ledgerStatus, setLedgerStatus] = useState('all');

  const flash = useCallback((kind: 'ok' | 'error', text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(null), 4500);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [statsRes, usersRes, ledgerRes, settingsRes] = await Promise.all([
      adminStats(),
      adminListUsers(),
      adminListLedger(),
      adminGetSettings(),
    ]);
    setLoading(false);

    if (statsRes.ok) setStats(statsRes.stats);
    if (usersRes.ok) setUsers(usersRes.users);
    if (ledgerRes.ok) setLedger(ledgerRes.rows);
    if (settingsRes.ok) {
      setBonusAmount(String(settingsRes.welcomeBonus));
      setBonusEnabled(settingsRes.welcomeBonusEnabled);
    }

    const firstError = [statsRes, usersRes, ledgerRes, settingsRes].find((r) => !r.ok);
    if (firstError && 'message' in firstError) flash('error', firstError.message as string);
  }, [flash]);

  useEffect(() => {
    if (authed) void refresh();
  }, [authed, refresh]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginBusy(true);
    const res = await adminLogin(email.trim(), password);
    setLoginBusy(false);

    if (!res.ok) {
      setLoginError(res.message);
      return;
    }
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
    setAuthed(true);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setAuthed(false);
    setPassword('');
  };

  const openAdjust = (user: AdminUserRow) => {
    setAdjustFor(user);
    setAdjustAmount('');
    setAdjustReason('');
  };

  const submitAdjust = async (sign: 1 | -1) => {
    if (!adjustFor) return;
    const amount = Number(adjustAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      flash('error', 'Enter an amount greater than zero.');
      return;
    }
    setAdjustBusy(true);
    const res = await adminAdjustBalance(adjustFor.userId, sign * amount, adjustReason);
    setAdjustBusy(false);

    if (!res.ok) {
      flash('error', res.message);
      return;
    }
    flash(
      'ok',
      `${sign > 0 ? 'Increased' : 'Decreased'} ${adjustFor.email} by ${formatCurrency(amount)}. New balance ${formatCurrency(res.newBalance)}.`
    );
    setAdjustFor(null);
    await refresh();
  };

  const handleDeposit = async (row: AdminLedgerRow, approve: boolean) => {
    const res = approve ? await adminApproveDeposit(row.id) : await adminRejectDeposit(row.id);
    if (!res.ok) {
      flash('error', res.message);
      return;
    }
    flash('ok', approve ? 'Deposit approved and credited.' : 'Deposit rejected.');
    await refresh();
  };

  const handleWithdrawal = async (row: AdminLedgerRow, complete: boolean) => {
    const res = complete
      ? await adminCompleteWithdrawal(row.id)
      : await adminRejectDeposit(row.id);
    if (!res.ok) {
      flash('error', res.message);
      return;
    }
    flash('ok', complete ? 'Withdrawal completed and debited.' : 'Withdrawal rejected.');
    await refresh();
  };

  const handleKyc = async (user: AdminUserRow) => {
    const res = await adminSetKyc(user.userId, !user.kycVerified);
    if (!res.ok) {
      flash('error', res.message);
      return;
    }
    flash('ok', `KYC ${user.kycVerified ? 'revoked' : 'verified'} for ${user.email}.`);
    await refresh();
  };

  const saveSettings = async () => {
    const amount = Number(bonusAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      flash('error', 'Enter a valid bonus amount.');
      return;
    }
    setSettingsBusy(true);
    const res = await adminSetWelcomeBonus(amount, bonusEnabled);
    setSettingsBusy(false);
    if (!res.ok) {
      flash('error', res.message);
      return;
    }
    flash('ok', 'Settings saved.');
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q)
    );
  }, [users, search]);

  const deposits = useMemo(() => ledger.filter((r) => r.type === 'deposit'), [ledger]);
  const withdrawals = useMemo(() => ledger.filter((r) => r.type === 'withdrawal'), [ledger]);

  const filteredLedger = useMemo(() => {
    return ledger.filter(
      (r) =>
        (ledgerType === 'all' || r.type === ledgerType) &&
        (ledgerStatus === 'all' || r.status === ledgerStatus)
    );
  }, [ledger, ledgerType, ledgerStatus]);

  if (!authed) {
    return (
      <div className="max-w-md mx-auto py-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-1">
            <span className="w-10 h-10 rounded-xl bg-slate-900 text-white inline-flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Admin Console</h1>
              <p className="text-xs text-slate-500">Restricted access</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Admin email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                placeholder="admin@xenabroker.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginBusy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
            >
              {loginBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {loginBusy ? 'Verifying…' : 'Sign in to admin'}
            </button>

            <button
              type="button"
              onClick={onExit}
              className="w-full text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              ← Back to trading platform
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-slate-900 text-white inline-flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Admin Console</h1>
            <p className="text-xs text-slate-500">
              Deposits, withdrawals, KYC, users, ledger &amp; settings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
          >
            Platform
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`mb-4 text-xs rounded-lg border px-3 py-2 ${
            notice.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${
              tab === id
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
            {id === 'deposits' && (stats?.pendingDeposits ?? 0) > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold">
                {stats?.pendingDeposits}
              </span>
            )}
            {id === 'withdrawals' && (stats?.pendingWithdrawals ?? 0) > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold">
                {stats?.pendingWithdrawals}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Total users', value: String(stats?.totalUsers ?? 0), icon: Users },
            { label: 'KYC verified', value: String(stats?.verifiedUsers ?? 0), icon: BadgeCheck },
            {
              label: 'Custodied cash',
              value: formatCurrency(stats?.totalBalances ?? 0),
              icon: Wallet,
            },
            {
              label: 'Pending deposits',
              value: String(stats?.pendingDeposits ?? 0),
              icon: ArrowDownToLine,
            },
            {
              label: 'Pending withdrawals',
              value: String(stats?.pendingWithdrawals ?? 0),
              icon: ArrowUpFromLine,
            },
            { label: 'Ledger entries', value: String(stats?.ledgerEntries ?? 0), icon: BookOpen },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                <Icon className="w-3.5 h-3.5" /> {label}
              </div>
              <p className="mt-2 text-xl font-bold text-slate-900 tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-slate-200 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email, name or user id"
              className="flex-1 text-sm outline-none placeholder:text-slate-400"
            />
            <span className="text-xs text-slate-500">{filteredUsers.length} shown</span>
          </div>

          {filteredUsers.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">
              No users yet. Users appear here as soon as they sign up.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">User</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Country</th>
                    <th className="text-left px-4 py-2.5 font-semibold">KYC</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Cash balance</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.userId} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {`${u.firstName} ${u.lastName}`.trim() || 'Unnamed user'}
                        </p>
                        <p className="text-xs text-slate-500">{u.email || u.userId}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{u.country || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void handleKyc(u)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-semibold cursor-pointer ${
                            u.kycVerified
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {u.kycVerified ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {u.kycVerified ? 'Verified' : 'Unverified'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                        {formatCurrency(u.cashBalance)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openAdjust(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <Minus className="w-3 h-3" /> Balance
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(tab === 'deposits' || tab === 'withdrawals') && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              {tab === 'deposits' ? 'Deposit requests' : 'Withdrawal requests'}
            </h2>
            <span className="text-xs text-slate-500">
              {(tab === 'deposits' ? deposits : withdrawals).filter((r) => r.status === 'pending').length}{' '}
              pending
            </span>
          </div>

          {(tab === 'deposits' ? deposits : withdrawals).length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Nothing here yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                    <th className="text-left px-4 py-2.5 font-semibold">User</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Amount</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(tab === 'deposits' ? deposits : withdrawals).map((row) => {
                    const owner = users.find((u) => u.userId === row.userId);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-900 font-medium text-xs">
                            {owner?.email || row.userId.slice(0, 8)}
                          </p>
                          <p className="text-[11px] text-slate-400">{row.reference || row.method || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">
                          {formatCurrency(row.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-semibold capitalize ${statusClasses(row.status)}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {row.status === 'pending' ? (
                            <div className="inline-flex gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  void (tab === 'deposits'
                                    ? handleDeposit(row, true)
                                    : handleWithdrawal(row, true))
                                }
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                              >
                                {tab === 'deposits' ? 'Approve' : 'Complete'}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void (tab === 'deposits'
                                    ? handleDeposit(row, false)
                                    : handleWithdrawal(row, false))
                                }
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">No action</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'ledger' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 mr-auto">Ledger</h2>
            <select
              value={ledgerType}
              onChange={(e) => setLedgerType(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white cursor-pointer"
            >
              <option value="all">All types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="bonus">Bonuses</option>
              <option value="adjustment">Adjustments</option>
            </select>
            <select
              value={ledgerStatus}
              onChange={(e) => setLedgerStatus(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white cursor-pointer"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {filteredLedger.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No ledger entries match those filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                    <th className="text-left px-4 py-2.5 font-semibold">User</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Type</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Amount</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLedger.map((row) => {
                    const owner = users.find((u) => u.userId === row.userId);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-700">
                          {owner?.email || row.userId.slice(0, 8)}
                        </td>
                        <td className="px-4 py-2.5 text-xs capitalize">{row.type}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatCurrency(row.amount)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-semibold capitalize ${statusClasses(row.status)}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{row.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-900">Sign-up bonus</h2>
            <p className="text-xs text-slate-500 mt-1">
              Every new user receives this once. Enforced server-side — it cannot be claimed twice.
            </p>

            <label className="block text-xs font-semibold text-slate-600 mt-4 mb-1.5">
              Bonus amount (USD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={bonusAmount}
              onChange={(e) => setBonusAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
            />

            <label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={bonusEnabled}
                onChange={(e) => setBonusEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300"
              />
              Enable signup bonus
            </label>

            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={settingsBusy}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
            >
              {settingsBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save settings
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-900">Security</h2>
            <p className="text-xs text-slate-500 mt-1">
              Admin credentials live in <code className="text-[11px]">public.admin_users</code> with
              bcrypt hashes. Add more admins with:
            </p>
            <pre className="mt-3 text-[11px] leading-relaxed bg-slate-950 text-slate-200 rounded-lg p-3 overflow-x-auto">
{`insert into public.admin_users (email, password_hash)
values ('admin@xenabroker.com',
        crypt('admin123', gen_salt('bf')));`}
            </pre>
            <p className="text-[11px] text-slate-500 mt-3">
              This console uses the service role key, so admin sign-in is the only gate. Keep the
              password out of shared links.
            </p>
          </div>
        </div>
      )}

      {adjustFor && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Adjust balance</h3>
                <p className="text-xs text-slate-500 mt-0.5">{adjustFor.email}</p>
                <p className="text-xs text-slate-400">
                  Current: {formatCurrency(adjustFor.cashBalance)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustFor(null)}
                className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <label className="block text-xs font-semibold text-slate-600 mt-4 mb-1.5">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
            />

            <label className="block text-xs font-semibold text-slate-600 mt-3 mb-1.5">
              Reason (optional)
            </label>
            <input
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="Manual adjustment"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
            />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void submitAdjust(1)}
                disabled={adjustBusy}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
              >
                {adjustBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Increase
              </button>
              <button
                type="button"
                onClick={() => void submitAdjust(-1)}
                disabled={adjustBusy}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 cursor-pointer"
              >
                {adjustBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Minus className="w-3.5 h-3.5" />}
                Decrease
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
