import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  BookOpen,
  Check,
  FileText,
  Headset,
  Landmark,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Snowflake,
  Unlock,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  AdminLedgerRow,
  AdminUserRow,
  ChatMessage,
  ChatThread,
  CustodySettings,
  DEFAULT_CUSTODY_SETTINGS,
  adminAdjustBalance,
  adminApproveDeposit,
  adminCompleteWithdrawal,
  adminFetchChatThread,
  adminGetKycDocument,
  adminGetSettings,
  adminListChatThreads,
  adminListLedger,
  adminListUsers,
  adminLogin,
  adminMarkChatRead,
  adminRejectDeposit,
  adminSendChatReply,
  adminSetCustodySettings,
  adminSetFrozen,
  adminSetKyc,
  adminSetWelcomeBonus,
  adminStats,
  getCustodySettings,
} from '../cloud';
import { formatCurrency } from '../utils/formatters';

type AdminTab =
  | 'overview'
  | 'users'
  | 'kyc'
  | 'deposits'
  | 'withdrawals'
  | 'support'
  | 'ledger'
  | 'settings';

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
  { id: 'kyc', label: 'KYC', icon: BadgeCheck },
  { id: 'deposits', label: 'Deposits', icon: ArrowDownToLine },
  { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine },
  { id: 'support', label: 'Support', icon: MessageCircle },
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
  const [adjustLabel, setAdjustLabel] = useState('Trade profit');
  const [adjustBusy, setAdjustBusy] = useState(false);

  const [bonusAmount, setBonusAmount] = useState('500');
  const [bonusEnabled, setBonusEnabled] = useState(true);
  const [settingsBusy, setSettingsBusy] = useState(false);

  const [ledgerType, setLedgerType] = useState('all');
  const [ledgerStatus, setLedgerStatus] = useState('all');

  const [kycReview, setKycReview] = useState<AdminUserRow | null>(null);
  const [kycDoc, setKycDoc] = useState<string | null>(null);
  const [kycDocName, setKycDocName] = useState<string | null>(null);
  const [kycDocBusy, setKycDocBusy] = useState(false);
  const [kycReason, setKycReason] = useState('');
  const [kycBusy, setKycBusy] = useState(false);

  const [freezeFor, setFreezeFor] = useState<AdminUserRow | null>(null);
  const [freezeReason, setFreezeReason] = useState('');
  const [freezeBusy, setFreezeBusy] = useState(false);

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [threadUserId, setThreadUserId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<ChatMessage[]>([]);
  const [replyDraft, setReplyDraft] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);

  const [custodyForm, setCustodyForm] = useState<CustodySettings>(DEFAULT_CUSTODY_SETTINGS);
  const [custodyBusy, setCustodyBusy] = useState(false);

  const flash = useCallback((kind: 'ok' | 'error', text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(null), 4500);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [statsRes, usersRes, ledgerRes, settingsRes, threadsRes, custodyRes] = await Promise.all([
      adminStats(),
      adminListUsers(),
      adminListLedger(),
      adminGetSettings(),
      adminListChatThreads(),
      getCustodySettings(),
    ]);
    setLoading(false);

    if (statsRes.ok) setStats(statsRes.stats);
    if (usersRes.ok) setUsers(usersRes.users);
    if (ledgerRes.ok) setLedger(ledgerRes.rows);
    if (threadsRes.ok) setThreads(threadsRes.threads);
    if (custodyRes) setCustodyForm(custodyRes);
    if (settingsRes.ok) {
      setBonusAmount(String(settingsRes.welcomeBonus));
      setBonusEnabled(settingsRes.welcomeBonusEnabled);
    }

    const firstError = [statsRes, usersRes, ledgerRes, settingsRes, threadsRes].find((r) => !r.ok);
    if (firstError && 'message' in firstError) flash('error', firstError.message as string);
  }, [flash]);

  useEffect(() => {
    if (authed) void refresh();
  }, [authed, refresh]);

  // Live support desk polling while the Support tab is open.
  useEffect(() => {
    if (!authed || tab !== 'support') return;
    const tick = async () => {
      const list = await adminListChatThreads();
      if (list.ok) setThreads(list.threads);
      if (threadUserId) {
        const t = await adminFetchChatThread(threadUserId);
        if (t.ok) setThreadMessages(t.messages);
      }
    };
    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [authed, tab, threadUserId]);

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
    setAdjustLabel('Trade profit');
  };

  const submitAdjust = async (sign: 1 | -1) => {
    if (!adjustFor) return;
    const amount = Number(adjustAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      flash('error', 'Enter an amount greater than zero.');
      return;
    }
    const label = adjustLabel.trim() || (sign > 0 ? 'Manual credit' : 'Manual debit');
    const note = adjustReason.trim() ? `${label} · ${adjustReason.trim()}` : label;
    setAdjustBusy(true);
    const res = await adminAdjustBalance(adjustFor.userId, sign * amount, note);
    setAdjustBusy(false);

    if (!res.ok) {
      flash('error', res.message);
      return;
    }
    flash(
      'ok',
      `${sign > 0 ? 'Credited' : 'Debited'} ${formatCurrency(amount)} ${sign > 0 ? 'to' : 'from'} ${adjustFor.email || 'user'} — ${label}. New balance ${formatCurrency(res.newBalance)}.`
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

  const openKycReview = async (user: AdminUserRow) => {
    setKycReview(user);
    setKycDoc(null);
    setKycDocName(null);
    setKycReason('');
    setKycDocBusy(true);
    const res = await adminGetKycDocument(user.userId);
    setKycDocBusy(false);
    if (res.ok) {
      setKycDoc(res.document);
      setKycDocName(res.name);
    } else {
      flash('error', res.message);
    }
  };

  const reviewKyc = async (status: 'verified' | 'rejected') => {
    if (!kycReview) return;
    setKycBusy(true);
    const res = await adminSetKyc(kycReview.userId, status, kycReason);
    setKycBusy(false);
    if (!res.ok) {
      flash('error', res.message);
      return;
    }
    flash(
      'ok',
      status === 'verified'
        ? `KYC approved for ${kycReview.email || 'user'}.`
        : `KYC rejected for ${kycReview.email || 'user'}.`
    );
    setKycReview(null);
    await refresh();
  };

  const openFreeze = (user: AdminUserRow) => {
    setFreezeFor(user);
    setFreezeReason(user.frozenReason || '');
  };

  const applyFreeze = async (frozen: boolean) => {
    if (!freezeFor) return;
    setFreezeBusy(true);
    const res = await adminSetFrozen(freezeFor.userId, frozen, freezeReason);
    setFreezeBusy(false);
    if (!res.ok) {
      flash('error', res.message);
      return;
    }
    flash('ok', `${frozen ? 'Froze' : 'Unfroze'} ${freezeFor.email || 'account'}.`);
    setFreezeFor(null);
    setFreezeReason('');
    await refresh();
  };

  const openThread = useCallback(
    async (uid: string) => {
      setThreadUserId(uid);
      setReplyDraft('');
      const res = await adminFetchChatThread(uid);
      if (res.ok) setThreadMessages(res.messages);
      void adminMarkChatRead(uid);
    },
    []
  );

  const sendReply = async () => {
    if (!threadUserId || !replyDraft.trim() || replyBusy) return;
    const body = replyDraft.trim();
    setReplyBusy(true);
    const res = await adminSendChatReply(threadUserId, body);
    setReplyBusy(false);
    if (!res.ok) {
      flash('error', res.message);
      return;
    }
    setReplyDraft('');
    const t = await adminFetchChatThread(threadUserId);
    if (t.ok) setThreadMessages(t.messages);
    const list = await adminListChatThreads();
    if (list.ok) setThreads(list.threads);
  };

  const saveCustody = async () => {
    setCustodyBusy(true);
    const res = await adminSetCustodySettings(custodyForm);
    setCustodyBusy(false);
    if (!res.ok) {
      flash('error', res.message);
      return;
    }
    flash('ok', 'Deposit custody details updated. Users see them in the deposit popup.');
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
                        <div className="flex flex-col items-start gap-1">
                          <button
                            type="button"
                            onClick={() => void openKycReview(u)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-semibold cursor-pointer ${
                              u.kycStatus === 'verified'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : u.kycStatus === 'pending'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : u.kycStatus === 'rejected'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {u.kycStatus === 'verified' ? (
                              <Check className="w-3 h-3" />
                            ) : u.kycStatus === 'pending' ? (
                              <FileText className="w-3 h-3" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            {u.kycStatus === 'verified'
                              ? 'Verified'
                              : u.kycStatus === 'pending'
                                ? 'Review'
                                : u.kycStatus === 'rejected'
                                  ? 'Rejected'
                                  : 'Unverified'}
                          </button>
                          {u.accountFrozen && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                              <Snowflake className="w-2.5 h-2.5" /> Frozen
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                        {formatCurrency(u.cashBalance)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openAdjust(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                            title="Increase or decrease balance and add a transaction"
                          >
                            <Plus className="w-3 h-3" />
                            <Minus className="w-3 h-3" /> Balance
                          </button>
                          <button
                            type="button"
                            onClick={() => openFreeze(u)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                              u.accountFrozen
                                ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                            title={u.accountFrozen ? 'Unfreeze account' : 'Freeze account for KYC/review'}
                          >
                            {u.accountFrozen ? (
                              <>
                                <Unlock className="w-3 h-3" /> Unfreeze
                              </>
                            ) : (
                              <>
                                <Snowflake className="w-3 h-3" /> Freeze
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'kyc' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">KYC review queue</h2>
            <span className="text-xs text-slate-500">
              {users.filter((u) => u.kycStatus === 'pending').length} pending ·{' '}
              {users.filter((u) => u.kycStatus === 'verified').length} verified
            </span>
          </div>

          {users.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No users yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">User</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Submitted</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Document</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...users]
                    .sort((a, b) => {
                      const rank = (s: string) =>
                        s === 'pending' ? 0 : s === 'rejected' ? 1 : s === 'verified' ? 3 : 2;
                      return rank(a.kycStatus) - rank(b.kycStatus);
                    })
                    .map((u) => (
                      <tr key={u.userId} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">
                            {`${u.firstName} ${u.lastName}`.trim() || 'Unnamed user'}
                          </p>
                          <p className="text-xs text-slate-500">{u.email || u.userId}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {u.kycSubmittedAt ? new Date(u.kycSubmittedAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {u.kycDocumentName ? (
                            <span className="inline-flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              {u.kycDocumentName}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-semibold capitalize ${statusClasses(u.kycStatus)}`}
                          >
                            {u.kycStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex flex-wrap justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => void openKycReview(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
                            >
                              <FileText className="w-3 h-3" /> Review
                            </button>
                            <button
                              type="button"
                              onClick={() => openFreeze(u)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                                u.accountFrozen
                                  ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {u.accountFrozen ? (
                                <>
                                  <Unlock className="w-3 h-3" /> Unfreeze
                                </>
                              ) : (
                                <>
                                  <Snowflake className="w-3 h-3" /> Freeze
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'support' && (
        <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Live chats</h2>
              <span className="text-[11px] text-slate-500">{threads.length}</span>
            </div>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
              {threads.length === 0 ? (
                <p className="p-4 text-xs text-slate-500">
                  No conversations yet. User messages from the CS button appear here.
                </p>
              ) : (
                threads.map((t) => (
                  <button
                    key={t.userId}
                    type="button"
                    onClick={() => void openThread(t.userId)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 cursor-pointer ${
                      threadUserId === t.userId ? 'bg-slate-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {t.name || t.email || t.userId.slice(0, 8)}
                      </p>
                      {t.unread > 0 && (
                        <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                          {t.unread}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{t.lastMessage}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {t.lastAt ? new Date(t.lastAt).toLocaleString() : ''}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-[420px]">
            {threadUserId ? (
              <>
                <div className="px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                  <Headset className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-bold text-slate-900">
                    {threads.find((t) => t.userId === threadUserId)?.name ||
                      threads.find((t) => t.userId === threadUserId)?.email ||
                      'Conversation'}
                  </p>
                  <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live
                  </span>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-4 py-3 max-h-[320px]">
                  {threadMessages.length === 0 ? (
                    <p className="text-xs text-slate-500">No messages in this conversation yet.</p>
                  ) : (
                    threadMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-sm ${
                            m.sender === 'agent'
                              ? 'rounded-br-md bg-slate-900 text-white'
                              : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          {m.message}
                          <div
                            className={`mt-1 text-[10px] ${
                              m.sender === 'agent' ? 'text-slate-400' : 'text-slate-400'
                            }`}
                          >
                            {new Date(m.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendReply();
                  }}
                  className="border-t border-slate-200 p-3 flex items-center gap-2"
                >
                  <input
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    placeholder="Reply as Xena Support…"
                    className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15"
                  />
                  <button
                    type="submit"
                    disabled={!replyDraft.trim() || replyBusy}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                  >
                    {replyBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                <MessageCircle className="w-8 h-8 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">Select a conversation</p>
                <p className="text-xs text-slate-500">
                  Replies are delivered live to the user&apos;s Support chat.
                </p>
              </div>
            )}
          </div>
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
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <Landmark className="w-4 h-4 text-slate-500" /> Deposit custody details
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              These details appear in every user&apos;s deposit popup. Edit them here whenever the
              receiving account changes.
            </p>

            <div className="mt-4 space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Bank / custodian</label>
                <input
                  value={custodyForm.bankName}
                  onChange={(e) => setCustodyForm({ ...custodyForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Account number</label>
                <input
                  value={custodyForm.accountNumber}
                  onChange={(e) => setCustodyForm({ ...custodyForm, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Routing (ABA)</label>
                  <input
                    value={custodyForm.routingNumber}
                    onChange={(e) => setCustodyForm({ ...custodyForm, routingNumber: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ref. prefix</label>
                  <input
                    value={custodyForm.referencePrefix}
                    onChange={(e) => setCustodyForm({ ...custodyForm, referencePrefix: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void saveCustody()}
              disabled={custodyBusy}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
            >
              {custodyBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save custody details
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

      {kycReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">KYC review</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {`${kycReview.firstName} ${kycReview.lastName}`.trim() || 'Unnamed user'} ·{' '}
                  {kycReview.email || kycReview.userId.slice(0, 8)}
                </p>
                <p className="text-xs text-slate-400">
                  Current status: <span className="capitalize">{kycReview.kycStatus}</span>
                  {kycReview.kycSubmittedAt
                    ? ` · submitted ${new Date(kycReview.kycSubmittedAt).toLocaleString()}`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setKycReview(null)}
                className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {kycDocBusy ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading document…
                </div>
              ) : kycDoc ? (
                <div className="space-y-2">
                  <img
                    src={kycDoc}
                    alt="KYC document"
                    className="max-h-64 w-full rounded-lg border border-slate-200 bg-white object-contain"
                  />
                  <a
                    href={kycDoc}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Open full size{kycDocName ? ` · ${kycDocName}` : ''}
                  </a>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No document uploaded for this user. You can still approve the identity if it was
                  verified out-of-band.
                </p>
              )}
            </div>

            <label className="block text-xs font-semibold text-slate-600 mt-4 mb-1.5">
              Rejection reason (optional)
            </label>
            <input
              value={kycReason}
              onChange={(e) => setKycReason(e.target.value)}
              placeholder="e.g. Photo is blurred — please re-upload"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
            />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void reviewKyc('verified')}
                disabled={kycBusy}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
              >
                {kycBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Approve KYC
              </button>
              <button
                type="button"
                onClick={() => void reviewKyc('rejected')}
                disabled={kycBusy}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 cursor-pointer"
              >
                {kycBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {freezeFor && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <Snowflake className="w-4 h-4 text-sky-600" />
                  {freezeFor.accountFrozen ? 'Unfreeze account' : 'Freeze account'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{freezeFor.email || freezeFor.userId}</p>
              </div>
              <button
                type="button"
                onClick={() => setFreezeFor(null)}
                className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-600">
              {freezeFor.accountFrozen
                ? 'Unfreezing restores deposits, withdrawals and trading immediately.'
                : 'Freezing locks deposits, withdrawals and trading until you unfreeze the account. Use this for KYC or fraud review.'}
            </p>

            {!freezeFor.accountFrozen && (
              <>
                <label className="block text-xs font-semibold text-slate-600 mt-4 mb-1.5">
                  Reason shown to the user
                </label>
                <input
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  placeholder="e.g. KYC document under review"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                />
              </>
            )}

            <button
              type="button"
              onClick={() => void applyFreeze(!freezeFor.accountFrozen)}
              disabled={freezeBusy}
              className={`mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-white disabled:opacity-60 cursor-pointer ${
                freezeFor.accountFrozen
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {freezeBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : freezeFor.accountFrozen ? (
                <Unlock className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              {freezeFor.accountFrozen ? 'Unfreeze account' : 'Freeze account'}
            </button>
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
              Transaction label
            </label>
            <select
              value={adjustLabel}
              onChange={(e) => setAdjustLabel(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 cursor-pointer"
            >
              <option value="Trade profit">Trade profit</option>
              <option value="Trade loss">Trade loss</option>
              <option value="Bonus">Bonus</option>
              <option value="Deposit correction">Deposit correction</option>
              <option value="Withdrawal correction">Withdrawal correction</option>
              <option value="Account correction">Account correction</option>
              <option value="Manual adjustment">Manual adjustment</option>
            </select>

            <label className="block text-xs font-semibold text-slate-600 mt-3 mb-1.5">
              Note (optional)
            </label>
            <input
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. AAPL swing trade — 12 Nov"
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
