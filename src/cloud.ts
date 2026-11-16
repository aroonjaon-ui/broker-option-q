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
  kyc_status?: string | null;
  kyc_document_name?: string | null;
  kyc_submitted_at?: string | null;
  kyc_rejection_reason?: string | null;
  account_frozen?: boolean | null;
  frozen_reason?: string | null;
}

export interface CloudSnapshot {
  profile: CloudProfile | null;
  cashBalance: number;
  reservedCash: number;
  positions: Record<string, { symbol: string; shares: number; avgCost: number }>;
  bonusAwarded: boolean;
  kycStatus: string;
  kycDocumentName: string | null;
  kycSubmittedAt: string | null;
  kycRejectionReason: string | null;
  accountFrozen: boolean;
  frozenReason: string;
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

export const updateCloudPassword = async (newPassword: string) => {
  if (!isSupabaseConfigured()) return notConfigured;
  if (newPassword.length < 6) {
    return { ok: false as const, message: 'Password must be at least 6 characters.' };
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    return { ok: false as const, message: 'Please sign in again before changing your password.' };
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
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
    kycStatus: String(profileRes.data?.kyc_status ?? 'unverified'),
    kycDocumentName: (profileRes.data?.kyc_document_name as string | null) ?? null,
    kycSubmittedAt: (profileRes.data?.kyc_submitted_at as string | null) ?? null,
    kycRejectionReason: (profileRes.data?.kyc_rejection_reason as string | null) ?? null,
    accountFrozen: Boolean(profileRes.data?.account_frozen),
    frozenReason: String(profileRes.data?.frozen_reason ?? ''),
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
  const { data, error } = await supabase
    .from('ledger')
    .insert({
      user_id: params.userId,
      type: 'deposit',
      amount: params.amount,
      status: 'pending',
      method: params.method ?? 'bank',
      reference: params.reference ?? null,
      notes: params.notes ?? null,
      cash_balance: 0,
    })
    .select('id')
    .single();
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, id: data?.id as string | undefined };
};

export const submitWithdrawalRequest = async (params: {
  userId: string;
  amount: number;
  method?: string;
  reference?: string;
}) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { data, error } = await supabase
    .from('ledger')
    .insert({
      user_id: params.userId,
      type: 'withdrawal',
      amount: params.amount,
      status: 'pending',
      method: params.method ?? 'bank',
      reference: params.reference ?? null,
      cash_balance: 0,
    })
    .select('id')
    .single();
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, id: data?.id as string | undefined };
};

export interface MyLedgerRow {
  id: string;
  type: string;
  amount: number;
  status: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  cashBalance: number;
  createdAt: string;
}

/** The signed-in user's own ledger rows (RLS-scoped). */
export const fetchMyLedger = async (userId: string) => {
  if (!isSupabaseConfigured()) return { ok: false as const, rows: [] as MyLedgerRow[] };
  const { data, error } = await supabase
    .from('ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return { ok: false as const, rows: [] as MyLedgerRow[], message: error.message };
  return {
    ok: true as const,
    rows: (data ?? []).map((r) => ({
      id: String(r.id),
      type: String(r.type ?? ''),
      amount: Number(r.amount ?? 0),
      status: String(r.status ?? 'pending'),
      method: (r.method as string | null) ?? null,
      reference: (r.reference as string | null) ?? null,
      notes: (r.notes as string | null) ?? null,
      cashBalance: Number(r.cash_balance ?? 0),
      createdAt: String(r.created_at ?? new Date().toISOString()),
    })),
  };
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
  kycStatus: string;
  kycDocumentName: string | null;
  kycSubmittedAt: string | null;
  accountFrozen: boolean;
  frozenReason: string;
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
    kycVerified: p.kyc_status ? p.kyc_status === 'verified' : Boolean(p.has_completed_profile),
    kycStatus: p.kyc_status ?? (p.has_completed_profile ? 'verified' : 'unverified'),
    kycDocumentName: p.kyc_document_name ?? null,
    kycSubmittedAt: p.kyc_submitted_at ?? null,
    accountFrozen: Boolean(p.account_frozen),
    frozenReason: p.frozen_reason ?? '',
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

export const adminSetKyc = async (
  userId: string,
  status: 'verified' | 'rejected' | 'unverified',
  reason?: string
) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { error } = await admin()
    .from('profiles')
    .update({
      kyc_status: status,
      kyc_rejection_reason: status === 'rejected' ? reason ?? 'Document could not be verified.' : null,
      kyc_reviewed_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
};

export const adminGetKycDocument = async (userId: string) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { data, error } = await admin()
    .from('profiles')
    .select('kyc_document, kyc_document_name, kyc_status, kyc_submitted_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return { ok: false as const, message: error.message };
  return {
    ok: true as const,
    document: (data?.kyc_document as string | null) ?? null,
    name: (data?.kyc_document_name as string | null) ?? null,
    status: (data?.kyc_status as string | null) ?? 'unverified',
    submittedAt: (data?.kyc_submitted_at as string | null) ?? null,
  };
};

export const adminSetFrozen = async (userId: string, frozen: boolean, reason?: string) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { error } = await admin()
    .from('profiles')
    .update({
      account_frozen: frozen,
      frozen_reason: frozen ? reason ?? 'Account under review.' : null,
    })
    .eq('user_id', userId);
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
};

/* ============================================================
 * KYC SUBMISSION (user side)
 * ============================================================ */

export const pushKyc = async (params: {
  userId: string;
  status: 'pending' | 'verified' | 'unverified';
  documentDataUrl?: string;
  documentName?: string;
}) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const payload: Record<string, unknown> = {
    kyc_status: params.status,
    kyc_submitted_at: new Date().toISOString(),
    kyc_rejection_reason: null,
  };
  if (params.documentDataUrl) {
    payload.kyc_document = params.documentDataUrl;
    payload.kyc_document_name = params.documentName ?? 'id-document.jpg';
  }
  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('user_id', params.userId);
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
};

/* ============================================================
 * LIVE SUPPORT CHAT
 * ============================================================ */

export interface ChatMessage {
  id: string;
  userId: string;
  sender: 'user' | 'agent';
  message: string;
  readStatus: boolean;
  createdAt: string;
}

export interface ChatThread {
  userId: string;
  email: string;
  name: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

const mapChat = (row: Record<string, unknown>): ChatMessage => ({
  id: String(row.id),
  userId: String(row.user_id),
  sender: row.sender === 'agent' ? 'agent' : 'user',
  message: String(row.message ?? ''),
  readStatus: Boolean(row.read_status),
  createdAt: String(row.created_at ?? new Date().toISOString()),
});

export const fetchChatMessages = async (userId: string) => {
  if (!isSupabaseConfigured()) return { ok: false as const, messages: [] as ChatMessage[] };
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) return { ok: false as const, messages: [] as ChatMessage[], message: error.message };
  return { ok: true as const, messages: (data ?? []).map(mapChat) };
};

export const sendChatMessage = async (userId: string, message: string) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { error } = await supabase
    .from('chat_messages')
    .insert({ user_id: userId, sender: 'user', message });
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
};

export const adminListChatThreads = async () => {
  if (!isSupabaseConfigured()) return notConfigured;
  const db = admin();
  const [messagesRes, profilesRes] = await Promise.all([
    db.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(600),
    db.from('profiles').select('user_id, email, first_name, last_name'),
  ]);
  if (messagesRes.error) return { ok: false as const, message: messagesRes.error.message };

  const profiles = new Map<string, { email: string; name: string }>();
  for (const p of profilesRes.data ?? []) {
    profiles.set(p.user_id, {
      email: p.email ?? '',
      name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
    });
  }

  const threads = new Map<string, ChatThread>();
  for (const row of messagesRes.data ?? []) {
    const uid = row.user_id as string;
    const existing = threads.get(uid);
    if (!existing) {
      const p = profiles.get(uid);
      threads.set(uid, {
        userId: uid,
        email: p?.email ?? '',
        name: p?.name ?? '',
        lastMessage: String(row.message ?? ''),
        lastAt: String(row.created_at ?? ''),
        unread: 0,
      });
    }
    if (row.sender === 'user' && !row.read_status) {
      const t = threads.get(uid)!;
      t.unread += 1;
    }
  }

  return { ok: true as const, threads: [...threads.values()] };
};

export const adminFetchChatThread = async (userId: string) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { data, error } = await admin()
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(300);
  if (error) return { ok: false as const, message: error.message, messages: [] as ChatMessage[] };
  return { ok: true as const, messages: (data ?? []).map(mapChat) };
};

export const adminSendChatReply = async (userId: string, message: string) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { error } = await admin()
    .from('chat_messages')
    .insert({ user_id: userId, sender: 'agent', message, read_status: true });
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
};

export const adminMarkChatRead = async (userId: string) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { error } = await admin()
    .from('chat_messages')
    .update({ read_status: true })
    .eq('user_id', userId)
    .eq('sender', 'user')
    .eq('read_status', false);
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
 * CUSTODY DEPOSIT DETAILS
 * ============================================================ */

export interface CustodySettings {
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  referencePrefix: string;
}

export const DEFAULT_CUSTODY_SETTINGS: CustodySettings = {
  bankName: 'Xena Clearing Custody',
  accountNumber: '8842 9104 7731',
  routingNumber: '021000021',
  referencePrefix: 'XN-DEP',
};

export const getCustodySettings = async (): Promise<CustodySettings> => {
  if (!isSupabaseConfigured()) return DEFAULT_CUSTODY_SETTINGS;
  const { data } = await admin()
    .from('platform_settings')
    .select('value')
    .eq('key', 'custody_account')
    .maybeSingle();
  const value = (data?.value ?? {}) as Partial<CustodySettings>;
  return { ...DEFAULT_CUSTODY_SETTINGS, ...value };
};

export const adminSetCustodySettings = async (settings: CustodySettings) => {
  if (!isSupabaseConfigured()) return notConfigured;
  const { error } = await admin()
    .from('platform_settings')
    .upsert(
      {
        key: 'custody_account',
        value: settings,
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
