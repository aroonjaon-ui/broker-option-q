/**
 * Cloud persistence + admin API for xena-broker.
 *
 * Regular user data goes through the anon client (RLS enforced by the
 * policies in supabase/*.sql). Admin operations use the service_role key,
 * which bypasses RLS, and are gated behind admin_login().
 */

import { createClient } from '@supabase/supabase-js';
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  isSupabaseConfigured,
  supabase,
} from './supabaseClient';

const notConfigured = { ok: false as const, message: 'Supabase is not configured.' };

function admin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface CloudProfile {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  country: string;
  has_completed_profile: boolean;
}

export interface CloudSnapshot {
  profile: CloudProfile | null;
  cashBalance: number;
  reservedCash: number;
  positions: Record<string, { symbol: string; shares: number; avgCost: number }>;
  bonusAwarded: boolean;
}

/* ============================================================
 * AUTH / USER SESSION
 * ============================================================ */

export const getSessionUser = async () => {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
};

export const signUpCloud = async (email: string, password: string) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false as const, message: error.message };
  return {
    ok: true as const,
    userId: data.user?.id ?? null,
    needsEmailConfirmation: !data.session,
  };
};

export const signInCloud = async (email: string, password: string) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, userId: data.user?.id ?? null };
};

export const signOutCloud = async () => {
  if (!isSupabaseConfigured()) return;
  await supabase.auth.signOut();
};

/**
 * Make sure the profile + balance rows exist for this user and hand out the
 * one-time signup bonus. Safe to call on every login.
 */
export const ensureCloudUser = async (params: {
  userId: string;
  email: string;
  name?: string;
  country?: string;
}) => {
  if (!isSupabaseConfigured()) return notConfigured;

  const parts = (params.name ?? '').trim().split(/\s+/);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ');

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      user_id: params.userId,
      email: params.email,
      first_name: firstName,
      last_name: lastName,
      country: params.country ?? '',
    },
    { onConflict: 'user_id', ignoreDuplicates: true }
  );

  if (profileError && profileError.code !== '23505') {
    console.warn('[cloud] profile upsert:', profileError.message);
  }

  const { error: balanceError } = await supabase
    .from('balances')
    .upsert({ user_id: params.userId }, { onConflict: 'user_id', ignoreDuplicates: true });

  if (balanceError && balanceError.code !== '23505') {
    console.warn('[cloud] balance upsert:', balanceError.message);
  }

  const { data: bonus, error: bonusError } = await supabase.rpc('claim_signup_bonus');
  if (bonusError) {
    console.warn('[cloud] bonus:', bonusError.message);
  }

  return { ok: true as const, bonus: Number(bonus ?? 0) };
};

export const pullSnapshot = async (userId: string): Promise<CloudSnapshot | null> => {
  if (!isSupabaseConfigured()) return null;

  const [profileRes, balanceRes, positionsRes, bonusRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('balances').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('positions').select('*').eq('user_id', userId),
    supabase.from('ledger').select('id').eq('user_id', userId).eq('type', 'bonus').limit(1),
  ]);

  const positions: CloudSnapshot['positions'] = {};
  for (const row of positionsRes.data ?? []) {
    const shares = Number(row.shares ?? 0);
    if (shares > 0) {
      positions[row.symbol] = {
        symbol: row.symbol,
        shares,
        avgCost: Number(row.avg_cost ?? 0),
      };
    }
  }

  return {
    profile: (profileRes.data as CloudProfile | null) ?? null,
    cashBalance: Number(balanceRes.data?.cash_balance ?? 0),
    reservedCash: Number(balanceRes.data?.reserved_cash ?? 0),
    positions,
    bonusAwarded: (bonusRes.data?.length ?? 0) > 0,
  };
};

export const pushBalance = async (
  userId: string,
  cashBalance: number,
  reservedCash: number
) => {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from('balances').upsert(
    {
      user_id: userId,
      cash_balance: cashBalance,
      reserved_cash: reservedCash,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) console.warn('[cloud] pushBalance:', error.message);
};

export const pushPositions = async (
  userId: string,
  positions: Record<string, { symbol: string; shares: number; avgCost: number }>
) => {
  if (!isSupabaseConfigured()) return;
  const rows = Object.values(positions).map((p) => ({
    user_id: userId,
    symbol: p.symbol,
    shares: p.shares,
    avg_cost: p.avgCost,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from('positions')
      .upsert(rows, { onConflict: 'user_id,symbol' });
    if (error) console.warn('[cloud] pushPositions:', error.message);
  }

  const keep = Object.keys(positions);
  const { data: existing } = await supabase
    .from('positions')
    .select('symbol')
    .eq('user_id', userId);

  const stale = (existing ?? [])
    .map((r) => r.symbol as string)
    .filter((s) => !keep.includes(s));

  if (stale.length > 0) {
    await supabase
      .from('positions')
      .delete()
      .eq('user_id', userId)
      .in('symbol', stale);
  }
};

export const pushProfile = async (
  userId: string,
  data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    country?: string;
    hasCompletedProfile?: boolean;
  }
) => {
  if (!isSupabaseConfigured()) return;
  const payload: Record<string, unknown> = { user_id: userId };
  if (data.email !== undefined) payload.email = data.email;
  if (data.firstName !== undefined) payload.first_name = data.firstName;
  if (data.lastName !== undefined) payload.last_name = data.lastName;
  if (data.country !== undefined) payload.country = data.country;
  if (data.hasCompletedProfile !== undefined)
    payload.has_completed_profile = data.hasCompletedProfile;

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });
  if (error) console.warn('[cloud] pushProfile:', error.message);
};

/* ============================================================
 * MONEY REQUESTS (written by the user, reviewed by an admin)
 * ============================================================ */

export const submitDepositRequest = async (params: {
  userId: string;
  amount: number;
  method?: string;
  reference?: string;
  notes?: string;
}) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { error } = await supabase.from('ledger').insert({
    user_id: params.userId,
    type: 'deposit',
    amount: params.amount,
    status: 'pending',
    method: params.method ?? 'bank',
    reference: params.reference ?? null,
    notes: params.notes ?? null,
    cash_balance: 0,
  });
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
};

export const submitWithdrawalRequest = async (params: {
  userId: string;
  amount: number;
  method?: string;
  reference?: string;
}) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { error } = await supabase.from('ledger').insert({
    user_id: params.userId,
    type: 'withdrawal',
    amount: params.amount,
    status: 'pending',
    method: params.method ?? 'bank',
    reference: params.reference ?? null,
    cash_balance: 0,
  });
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
};

/* ============================================================
 * ADMIN API
 * ============================================================ */

export const adminLogin = async (email: string, password: string) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { data, error } = await supabase.rpc('admin_login', {
    p_email: email,
    p_password: password,
  });
  if (error) return { ok: false as const, message: error.message };
  if (!data) return { ok: false as const, message: 'Invalid admin email or password.' };
  return { ok: true as const };
};

export interface AdminUserRow {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  kycVerified: boolean;
  cashBalance: number;
  reservedCash: number;
  positions: number;
}

export const adminListUsers = async () => {
  if (!isSupabaseConfigured()) return notConfigured;
  const db = admin();

  const [profilesRes, balancesRes, positionsRes] = await Promise.all([
    db.from('profiles').select('*').order('created_at', { ascending: false }),
    db.from('balances').select('*'),
    db.from('positions').select('user_id, shares'),
  ]);

  if (profilesRes.error) return { ok: false as const, message: profilesRes.error.message };

  const balances = new Map<string, { cash: number; reserved: number }>();
  for (const b of balancesRes.data ?? []) {
    balances.set(b.user_id, {
      cash: Number(b.cash_balance ?? 0),
      reserved: Number(b.reserved_cash ?? 0),
    });
  }

  const positionCounts = new Map<string, number>();
  for (const p of positionsRes.data ?? []) {
    if (Number(p.shares ?? 0) > 0) {
      positionCounts.set(p.user_id, (positionCounts.get(p.user_id) ?? 0) + 1);
    }
  }

  const users: AdminUserRow[] = (profilesRes.data ?? []).map((p) => ({
    userId: p.user_id,
    email: p.email ?? '',
    firstName: p.first_name ?? '',
    lastName: p.last_name ?? '',
    country: p.country ?? '',
    kycVerified: Boolean(p.has_completed_profile),
    cashBalance: balances.get(p.user_id)?.cash ?? 0,
    reservedCash: balances.get(p.user_id)?.reserved ?? 0,
    positions: positionCounts.get(p.user_id) ?? 0,
  }));

  return { ok: true as const, users };
};

export const adminAdjustBalance = async (
  userId: string,
  delta: number,
  reason: string
) => {
  if (!isSupabaseConfigured()) return notConfigured;
  if (!Number.isFinite(delta) || delta === 0) {
    return { ok: false as const, message: 'Enter a non-zero amount.' };
  }

  const db = admin();
  const { data, error } = await db.rpc('admin_adjust_balance', {
    p_user_id: userId,
    p_delta: delta,
    p_reason: reason || 'Admin adjustment',
  });

  if (error) {
    // Fallback if the RPC is missing (e.g. migration not run yet)
    const { data: current } = await db
      .from('balances')
      .select('cash_balance')
      .eq('user_id', userId)
      .maybeSingle();

    const next = Math.max(0, Number(current?.cash_balance ?? 0) + delta);
    const { error: writeError } = await db
      .from('balances')
      .upsert({ user_id: userId, cash_balance: next }, { onConflict: 'user_id' });

    if (writeError) return { ok: false as const, message: writeError.message };

    await db.from('ledger').insert({
      user_id: userId,
      type: 'adjustment',
      amount: delta,
      status: 'completed',
      method: 'admin',
      reference: 'XN-ADJ',
      notes: reason || 'Admin adjustment',
      cash_balance: next,
    });

    return { ok: true as const, newBalance: next };
  }

  return { ok: true as const, newBalance: Number(data ?? 0) };
};

export const adminSetKyc = async (userId: string, verified: boolean) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { error } = await admin()
    .from('profiles')
    .update({ has_completed_profile: verified })
    .eq('user_id', userId);
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
};

export interface AdminLedgerRow {
  id: string;
  userId: string;
  type: string;
  amount: number;
  status: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export const adminListLedger = async (filters?: {
  type?: string;
  status?: string;
  userId?: string;
}) => {
  if (!isSupabaseConfigured()) return notConfigured;
  let query = admin().from('ledger').select('*').order('created_at', { ascending: false }).limit(300);

  if (filters?.type) query = query.eq('type', filters.type);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.userId) query = query.eq('user_id', filters.userId);

  const { data, error } = await query;
  if (error) return { ok: false as const, message: error.message };

  const rows: AdminLedgerRow[] = (data ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    type: r.type,
    amount: Number(r.amount ?? 0),
    status: r.status,
    method: r.method ?? null,
    reference: r.reference ?? null,
    notes: r.notes ?? null,
    createdAt: r.created_at,
  }));

  return { ok: true as const, rows };
};

async function creditDeposit(ledgerId: string) {
  const db = admin();
  const { data: entry, error } = await db
    .from('ledger')
    .select('*')
    .eq('id', ledgerId)
    .maybeSingle();

  if (error || !entry) {
    return { ok: false as const, message: error?.message ?? 'Ledger entry not found.' };
  }
  if (entry.status !== 'pending') {
    return { ok: false as const, message: `This request is already ${entry.status}.` };
  }

  const { data: balanceRow } = await db
    .from('balances')
    .select('cash_balance')
    .eq('user_id', entry.user_id)
    .maybeSingle();

  const next = Number((Number(balanceRow?.cash_balance ?? 0) + Number(entry.amount)).toFixed(2));

  const { error: balError } = await db
    .from('balances')
    .upsert(
      { user_id: entry.user_id, cash_balance: next, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (balError) return { ok: false as const, message: balError.message };

  const { error: ledError } = await db
    .from('ledger')
    .update({ status: 'approved', cash_balance: next })
    .eq('id', ledgerId);
  if (ledError) return { ok: false as const, message: ledError.message };

  return { ok: true as const, newBalance: next };
}

export const adminApproveDeposit = creditDeposit;

export const adminRejectDeposit = async (ledgerId: string) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { error } = await admin()
    .from('ledger')
    .update({ status: 'rejected' })
    .eq('id', ledgerId)
    .eq('status', 'pending');
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
};

export const adminCompleteWithdrawal = async (ledgerId: string) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const db = admin();
  const { data: entry, error } = await db
    .from('ledger')
    .select('*')
    .eq('id', ledgerId)
    .maybeSingle();

  if (error || !entry) {
    return { ok: false as const, message: error?.message ?? 'Ledger entry not found.' };
  }
  if (entry.status !== 'pending') {
    return { ok: false as const, message: `This request is already ${entry.status}.` };
  }

  // The user's client already holds the funds when the request is made,
  // so completing the payout must not debit the balance a second time.
  const { error: ledError } = await db
    .from('ledger')
    .update({ status: 'completed' })
    .eq('id', ledgerId);
  if (ledError) return { ok: false as const, message: ledError.message };

  return { ok: true as const };
};

/* ============================================================
 * SETTINGS
 * ============================================================ */

export const adminGetSettings = async () => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { data, error } = await admin().from('platform_settings').select('*');
  if (error) return { ok: false as const, message: error.message };

  const welcome = (data ?? []).find((r) => r.key === 'welcome_bonus');
  return {
    ok: true as const,
    welcomeBonus: Number(welcome?.value?.amount ?? 0),
    welcomeBonusEnabled: welcome?.value?.enabled !== false,
  };
};

export const adminSetWelcomeBonus = async (amount: number, enabled: boolean) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { error } = await admin()
    .from('platform_settings')
    .upsert(
      {
        key: 'welcome_bonus',
        value: { amount, enabled },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
};

/* ============================================================
 * STATS
 * ============================================================ */

export const adminStats = async () => {
  if (!isSupabaseConfigured()) return notConfigured;
  const [usersRes, pendingRes, ledgerRes] = await Promise.all([
    adminListUsers(),
    admin().from('ledger').select('type, status'),
    admin().from('ledger').select('amount, type'),
  ]);

  if (!usersRes.ok) return usersRes;

  const pendingDeposits = (pendingRes.data ?? []).filter(
    (r) => r.status === 'pending' && r.type === 'deposit'
  ).length;
  const pendingWithdrawals = (pendingRes.data ?? []).filter(
    (r) => r.status === 'pending' && r.type === 'withdrawal'
  ).length;

  const totalBalances = usersRes.users.reduce((sum, u) => sum + u.cashBalance, 0);

  return {
    ok: true as const,
    stats: {
      totalUsers: usersRes.users.length,
      verifiedUsers: usersRes.users.filter((u) => u.kycVerified).length,
      totalBalances,
      pendingDeposits,
      pendingWithdrawals,
      ledgerEntries: ledgerRes.data?.length ?? 0,
    },
  };
};
