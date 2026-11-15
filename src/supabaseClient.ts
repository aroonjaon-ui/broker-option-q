/**
 * Supabase Client Configuration for xena-broker
 * 
 * This module automatically detects Supabase configuration from:
 * 1. Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 * 2. Vercel/Netlify function environment
 * 3. Fallback to project configuration file
 * 
 * The code will attempt to auto-configure Supabase on first use.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { UserAccount, UserProfile, Position, Balance, ChatMessage, AdminUser } from './types/broker';

// ============================================================
// Automatic Supabase Configuration Detection
// ============================================================

// Try to get Supabase config from various sources in order of preference
function getSupabaseConfig() {
  // 1. Check environment variables (Vite/Next/etc.)
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey && envUrl !== 'https://your-project.supabase.co' && envKey !== 'your-anon-public-key') {
    return { url: envUrl, key: envKey, source: 'environment' };
  }

  // 2. Check if running in a Supabase Edge Function/serverless environment
  // This checks for runtime environment hints
  const runtimeUrl = (global as any).__SUPABASE_RUNTIME_URL;
  const runtimeKey = (global as any).__SUPABASE_RUNTIME_KEY;

  if (runtimeUrl && runtimeKey) {
    return { url: runtimeUrl, key: runtimeKey, source: 'runtime' };
  }

  // 3. Check for Vercel/Netlify environment variables
  // These platforms inject env vars differently
  const vercelUrl = (process as any).env?.VITE_SUPABASE_URL;
  const vercelKey = (process as any).env?.VITE_SUPABASE_ANON_KEY;

  if (vercelUrl && vercelKey) {
    return { url: vercelUrl, key: vercelKey, source: 'vercel' };
  }

  // 4. Check .env file (development only, not included in build)
  // We check window.__ENV__ which may be injected by build tools
  const windowUrl = (window as any).__ENV?.VITE_SUPABASE_URL;
  const windowKey = (window as any).__ENV?.VITE_SUPABASE_ANON_KEY;

  if (windowUrl && windowKey) {
    return { url: windowUrl, key: windowKey, source: 'window-env' };
  }

  // 5. Return null to indicate config needed
  return { url: null, key: null, source: 'none' };
}

// Initialize configuration
const config = getSupabaseConfig();

// Create Supabase client - will show helpful error if not configured
let supabase: ReturnType<typeof createClient>;

try {
  if (config.url && config.key) {
    supabase = createClient(config.url, config.key);
    console.log(`🔗 Supabase initialized via ${config.source}`);
  } else {
    // Create a client that will give helpful errors
    supabase = createClient(
      'https://placeholder.supabase.co',
      'placeholder-anon-key'
    );
    console.warn(
      '⚠️ Supabase not fully configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
    );
    console.warn(
      '   For Vercel: Add these in Project Settings → Environment Variables\n' +
      '   For local development: Create a .env file with your Supabase project URL and anon key'
    );
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error);
  // Fallback client for type safety
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
}

/**
 * Export the supabase client - always available, even if not fully configured
 */
export { supabase };

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url !== 'https://your-project.supabase.co' && key !== 'your-anon-public-key');
};

/**
 * Get the current Supabase project URL source
 */
export const getConfigSource = (): string => {
  const config = getSupabaseConfig();
  return config.source || 'not-configured';
};

/**
 * Initialize Supabase with automatic configuration
 * This can be called from anywhere to re-initialize with new config
 */
export const initializeSupabase = (url?: string, key?: string) => {
  if (url && key) {
    return createClient(url, key);
  }
  return supabase;
};

/**
 * Hook for automatic Supabase initialization
 * Automatically configures from environment or shows setup guide
 */
export const useSupabaseAutoInit = () => {
  const [supabase, setSupabase] = useState<SupabaseClient>(supabase);
  const [configured, setConfigured] = useState(isSupabaseConfigured());
  const [initStatus, setInitStatus] = useState<'idle' | 'checking' | 'configured' | 'error'>('idle');

  useEffect(() => {
    let ignore = false;

    setInitStatus('checking');

    // Check if configured
    if (isSupabaseConfigured()) {
      // Fetch current config and verify connection
      setInitStatus('configured');
    } else {
      setInitStatus('error');
    }

    return () => {
      ignore = true;
    };
  }, []);

  return { supabase, configured, initStatus };
};

/**
 * ============================================================
 // AUTH FUNCTIONS
 // ============================================================ */

/**
 * Sign in with email and password
 */
export const signInWithPassword = async (email: string, password: string) => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, user: data.user };
};

/**
 * Sign up with email and password
 */
export const signUpWithPassword = async (email: string, password: string) => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, user: data.user };
};

/**
 * Sign out (logout)
 */
export const signOut = async () => {
  if (!isSupabaseConfigured()) {
    return { ok: true }; // Mock success if not configured
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
};

/**
 * Sign in with Google OAuth
 * Automatically uses the configured redirect URL
 */
export const signInWithGoogle = async () => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'Supabase not configured. Google OAuth requires Supabase setup.',
    };
  }

  // Auto-detect the redirect URL based on current environment
  const currentOrigin = window.location.origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${currentOrigin}/auth/callback`,
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, data };
};

/**
 * ============================================================
 // PROFILE FUNCTIONS
 // ============================================================ */

/**
 * Get user profile from profiles table
 */
export const getProfile = async (userId: string) => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'Supabase not configured.',
    };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, profile: data as UserProfile };
};

/**
 * Update or create user profile
 */
export const upsertProfile = async (
  userId: string,
  profileData: {
    first_name: string;
    last_name: string;
    country: string;
    has_completed_profile: boolean;
  }
) => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'Supabase not configured.',
    };
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      country: profileData.country,
      has_completed_profile: profileData.has_completed_profile,
    })
    .select()
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
};

/**
 * ============================================================
 // BALANCE FUNCTIONS
 // ============================================================ */

/**
 * Get user balance from balances table
 */
export const getBalance = async (userId: string) => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'Supabase not configured.',
    };
  }

  const { data, error } = await supabase
    .from('balances')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, balance: data as Balance };
};

/**
 * Upsert (create or update) user balance
 */
export const upsertBalance = async (
  userId: string,
  balanceData: { cash_balance: number; reserved_cash: number }
) => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'Supabase not configured.',
    };
  }

  const { data, error } = await supabase
    .from('balances')
    .upsert({
      user_id: userId,
      cash_balance: balanceData.cash_balance,
      reserved_cash: balanceData.reserved_cash,
    })
    .select()
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
};

/**
 * ============================================================
 // POSITION FUNCTIONS
 // ============================================================ */

/**
 * Get user positions from positions table
 */
export const getPositions = async (userId: string) => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'Supabase not configured.',
    };
  }

  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, positions: data as Position[] };
};

/**
 * Upsert (create or update) user position
 */
export const upsertPosition = async (
  userId: string,
  positionData: { symbol: string; shares: number; avg_cost: number }
) => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'Supabase not configured.',
    };
  }

  const { data, error } = await supabase
    .from('positions')
    .upsert({
      user_id: userId,
      symbol: positionData.symbol,
      shares: positionData.shares,
      avg_cost: positionData.avg_cost,
    })
    .select()
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
};

/**
 * ============================================================
 // CHAT FUNCTIONS
 // ============================================================ */

/**
 * Insert a chat message
 */
export const insertChatMessage = async (
  userId: string,
  message: string,
  sender: 'user' | 'admin' = 'user'
) => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'Supabase not configured.',
    };
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      user_id: userId,
      sender,
      message,
      read_status: false,
    })
    .select()
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, messageId: data?.id };
};

/**
 * Select chat messages for a user
 */
export const selectChatMessages = async (userId: string) => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'Supabase not configured.',
    };
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, messages: data as ChatMessage[] };
};

/**
 * Update message read status
 */
export const updateMessageReadStatus = async (messageId: string) => {
  if (!isSupabaseConfigured()) {
    return { ok: true };
  }

  const { error } = await supabase
    .from('chat_messages')
    .update({ read_status: true })
    .eq('id', messageId);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
};

/**
 * ============================================================
 // ADMIN FUNCTIONS
 // ============================================================ */

/** Get all users with their profiles */
export const getAllUsers = async () => {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase not configured.' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      auth.users (id, email, created_at)
    `);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, users: data };
};

/** Get admin statistics */
export const getAdminStats = async () => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'Supabase not configured.',
    };
  };

  // Get counts in parallel
  const [usersResult, balancesResult, depositsResult, withdrawalsResult] = await Promise.all([
    getAllUsers(),
    getAllBalances(),
    getPendingDeposits(),
    getPendingWithdrawals(),
  ]);

  let totalUsers = 0;
  let verifiedUsers = 0;
  let totalBalance = 0;
  let pendingDeposits = 0;
  let pendingWithdrawals = 0;

  if (usersResult.ok && usersResult.users) {
    totalUsers = usersResult.users.length;
    verifiedUsers = usersResult.users.filter(
      (u: any) => u.profile?.has_completed_profile
    ).length;
  }

  if (balancesResult.ok && balancesResult.balances) {
    totalBalance = balancesResult.balances.reduce(
      (sum: number, b: any) => sum + Number(b.cash_balance),
      0
    );
  }

  if (depositsResult.ok) {
    pendingDeposits = depositsResult.deposits?.length || 0;
  }

  if (withdrawalsResult.ok) {
    pendingWithdrawals = withdrawalsResult.withdrawals?.length || 0;
  }

  return {
    ok: true,
    stats: {
      totalUsers,
      verifiedUsers,
      totalBalance: totalBalance.toFixed(2),
      pendingDeposits,
      pendingWithdrawals,
    },
  };
};

/** Get all balances */
export const getAllBalances = async () => {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase not configured.' };
  }

  const { data, error } = await supabase
    .from('balances')
    .select(`
      *,
      auth.users (email)
    `);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, balances: data };
};

/** Get pending deposits from ledger */
export const getPendingDeposits = async () => {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase not configured.' };
  }

  const { data, error } = await supabase
    .from('ledger')
    .select(`
      *,
      auth.users (email)
    `)
    .eq('type', 'deposit')
    .eq('status', 'pending');

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, deposits: data };
};

/** Approve a deposit */
export const approveDeposit = async (ledgerId: string, amount: number) => {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase not configured.' };
  }

  // Update the ledger status
  const { error: ledgerError } = await supabase
    .from('ledger')
    .update({ status: 'approved' })
    .eq('id', ledgerId);

  if (ledgerError) {
    return { ok: false, message: 'Error approving deposit: ' + ledgerError.message };
  }

  // Get the user_id from the ledger entry
  const { data: ledgerEntry, error: ledgerSelectError } = await supabase
    .from('ledger')
    .select('user_id, cash_balance')
    .eq('id', ledgerId)
    .single();

  if (ledgerSelectError) {
    return { ok: true, message: 'Deposit approved (balance update skipped)' };
  }

  // Update the balance
  const newBalance = Math.max(0, Number(ledgerEntry?.cash_balance ?? 0) + amount);

  const { error: balanceError } = await supabase
    .from('balances')
    .update({ cash_balance: newBalance })
    .eq('user_id', ledgerEntry?.user_id);

  if (balanceError) {
    return {
      ok: true,
      message: 'Deposit approved but failed to update balance',
    };
  }

  return { ok: true, message: 'Deposit approved and balance updated' };
};

/** Reject a deposit */
export const rejectDeposit = async (ledgerId: string) => {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase not configured.' };
  }

  const { error } = await supabase
    .from('ledger')
    .update({ status: 'rejected' })
    .eq('id', ledgerId);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: 'Deposit rejected' };
};

/** Get all withdrawals from ledger */
export const getPendingWithdrawals = async () => {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase not configured.' };
  }

  const { data, error } = await supabase
    .from('ledger')
    .select(`
      *,
      auth.users (email)
    `)
    .eq('type', 'withdrawal')
    .eq('status', 'pending');

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, withdrawals: data };
};

/** Process a withdrawal */
export const processWithdrawal = async (ledgerId: string, amount: number) => {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase not configured.' };
  }

  // Update the ledger status
  const { error: ledgerError } = await supabase
    .from('ledger')
    .update({ status: 'completed' })
    .eq('id', ledgerId);

  if (ledgerError) {
    return { ok: false, message: 'Error processing withdrawal: ' + ledgerError.message };
  }

  // Get the user_id from the ledger entry
  const { data: ledgerEntry, error: ledgerSelectError } = await supabase
    .from('ledger')
    .select('user_id, cash_balance')
    .eq('id', ledgerId)
    .single();

  if (ledgerSelectError) {
    return { ok: true, message: 'Withdrawal processed' };
  }

  // Deduct from balance
  const newBalance = Math.max(0, Number(ledgerEntry?.cash_balance ?? 0) - amount);

  const { error: balanceError } = await supabase
    .from('balances')
    .update({ cash_balance: newBalance })
    .eq('user_id', ledgerEntry?.user_id);

  if (balanceError) {
    return {
      ok: false,
      message: 'Withdrawal processed but failed to update balance',
    };
  }

  return { ok: true, message: 'Withdrawal processed successfully' };
};

/** Update KYC status for a user */
export const updateKycStatus = async (userId: string, status: 'verified' | 'unverified') => {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase not configured.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ has_completed_profile: status === 'verified' })
    .eq('user_id', userId);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: `KYC status set to ${status}` };
};

/** Get KYC profile for a user */
export const getKycProfile = async (userId: string) => {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase not configured.' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, kyc: data };
};

/** Get ledger entries with filtering */
export const getLedgerEntries = async (filters?: {
  type?: string;
  status?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase not configured.' };
  }

  let query = supabase.from('ledger').select(`
    *,
    auth.users (email)
  `);

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters?.startDate) {
    query = query.gte('timestamp', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('timestamp', filters.endDate);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, entries: data };
};

/**
 * ============================================================
 // EXPORT HELPERS
 // ============================================================ */

/** Export the supabase client for direct use */
export { supabase };

/**
 * Hook for tracking auth state changes with auto-configuration
 * Usage: const { user, loading, configured } = useSupabaseAutoInit();
 */
export const useSupabase = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(isSupabaseConfigured());

  useEffect(() => {
    // Initialize Supabase client
    const initSupabase = async () => {
      if (isSupabaseConfigured()) {
        // Get initial user
        try {
          const { data: { user} } = await supabase.auth.getUser();
          setUser(user);
        } catch (err) {
          console.error('Error getting user:', err);
        }
      }
      setLoading(false);
    };

    initSupabase();

    // Track auth state changes
    const { data: authChanges } = supabase.auth.onAuthStateChange(
      (event: string, session: any) => {
        if (event === 'SIGNED_IN') {
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      authChanges.subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, loading, configured };
};

/**
 * Hook for tracking profile completion with auto-configuration
 * Usage: const { profile, loading, hasCompletedProfile } = useProfile(userId);
 */
export const useProfile = (userId?: string) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedProfile, setHasCompleted] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (!userId || !supabaseReady) {
      setLoading(false);
      return;
    }

    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data as UserProfile);
          setHasCompleted(data.has_completed_profile === true);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [userId, supabaseReady]);

  return { profile, loading, hasCompletedProfile, supabaseReady };
};

// ============================================================
// EXPORT DEFAULT CLIENT
// ============================================================

export default supabase;