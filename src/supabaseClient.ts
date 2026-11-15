/**
 * Supabase Client Configuration for xena-broker
 * 
 * Auto-configured with provided Supabase credentials.
 * Will auto-detect from environment variables on deployment,
 * but uses provided credentials as default.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { UserAccount, UserProfile, Position, Balance, ChatMessage, AdminUser } from './types/broker';

// **PROVIDED SUPABASE CREDENTIALS** (from user)
// These will be used as default configuration
const SUPABASE_URL = 'https://ocuwuecmmpztqksqsmsp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdXd1ZWNtbXB6dHFrc3FzbXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3NDMzOTIsImV4cCI6MjExMDMxOTM5Mn0.1enKEqB4nYDcU4yVYgOI-ZErOH8NoRmbco8RKu2U8aM';

// Also provided service role key for admin operations
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdXd1ZWNtbXB6dHFrc3FzbXNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDc0MzM5MiwiZXhwIjoyMTEwMzE5MzkyfQ.qTEvMTmeyPrqWYvwRs8P4gAVzOiR0RVXyR5mZPIRz_Y';

// ============================================================
// Automatic Configuration Detection
// ============================================================

function getSupabaseConfig() {
  // 1. Check if running in a test/development mode with provided keys
  // If explicit URL/key are set, use them
  if (SUPABASE_URL && SUPABASE_URL !== 'https://your-project.supabase.co') {
    return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, source: 'provided' };
  }

  // 2. Check environment variables (Vercel/Netlify)
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey && envUrl !== 'https://your-project.supabase.co') {
    return { url: envUrl, key: envKey, source: 'environment' };
  }

  // 3. Fallback to provided keys
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, source: 'provided' };
  }

  // 4. No configuration available
  return { url: null, key: null, source: 'none' };
}

// Initialize configuration
const config = getSupabaseConfig();

// Create Supabase client
let supabase: ReturnType<typeof createClient>;

try {
  if (config.url && config.key) {
    supabase = createClient(config.url, config.key);
    console.log(`🔗 Supabase initialized via ${config.source}: ${config.url}`);
  } else {
    // Fallback - show error in console
    supabase = createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
    console.warn('⚠️ Supabase configuration missing. Using placeholder.');
    console.warn(
      '   Provided URL: ' + SUPABASE_URL,
      '   Provided Key: ' + (SUPABASE_ANON_KEY ? 'set' : 'missing')
    );
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error);
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
}

/**
 * Export the supabase client - always available
 */
export { supabase };

/**
 * Check if Supabase is configured (using provided or environment keys)
 */
export const isSupabaseConfigured = (): boolean => {
  return !!( 
    SUPABASE_URL && 
    SUPABASE_URL !== 'https://your-project.supabase.co' &&
    SUPABASE_ANON_KEY && 
    SUPABASE_ANON_KEY !== 'your-anon-public-key'
  );
};

/**
 * Get the current Supabase project URL source
 */
export const getConfigSource = (): string => {
  const config = getSupabaseConfig();
  return config.source || 'not-configured';
}

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
      message: 'Supabase not configured. Please check setup.',
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
      message: 'Supabase not configured.',
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
    return { ok: true };
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
};

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async () => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'Supabase not configured. Google OAuth requires Supabase setup.',
    };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/auth/callback',
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
 // ADMIN FUNCTIONS (using service role key)
 // ============================================================ */

/** Get all users with their profiles */
export const getAllUsers = async () => {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase not configured.' };
  }

  // Use service role key for admin operations
  const adminSupa = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE
  );

  const { data, error } = await adminSupa
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
    return { ok: false, message: 'Supabase not configured.' };
  }

  // Use service role key
  const adminSupa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

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

  // Use service role key for admin operations
  const adminSupa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  const { data, error } = await adminSupa
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

  // Use service role key for admin operations
  const adminSupa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  // Update the ledger status
  const { error: ledgerError } = await adminSupa
    .from('ledger')
    .update({ status: 'approved' })
    .eq('id', ledgerId);

  if (ledgerError) {
    return { ok: false, message: 'Error approving deposit: ' + ledgerError.message };
  }

  // Get the user_id from the ledger entry
  const { data: ledgerEntry, error: ledgerSelectError } = await adminSupa
    .from('ledger')
    .select('user_id, cash_balance')
    .eq('id', ledgerId)
    .single();

  if (ledgerSelectError) {
    return { ok: true, message: 'Deposit approved (balance update skipped)' };
  }

  // Update the balance
  const newBalance = Math.max(0, Number(ledgerEntry?.cash_balance ?? 0) + amount);

  const { error: balanceError } = await adminSupa
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

  // Use service role key
  const adminSupa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  // Update the ledger status
  const { error: ledgerError } = await adminSupa
    .from('ledger')
    .update({ status: 'completed' })
    .eq('id', ledgerId);

  if (ledgerError) {
    return { ok: false, message: 'Error processing withdrawal: ' + ledgerError.message };
  }

  // Get the user_id from the ledger entry
  const { data: ledgerEntry, error: ledgerSelectError } = await adminSupa
    .from('ledger')
    .select('user_id, cash_balance')
    .eq('id', ledgerId)
    .single();

  if (ledgerSelectError) {
    return { ok: true, message: 'Withdrawal processed' };
  }

  // Deduct from balance
  const newBalance = Math.max(0, Number(ledgerEntry?.cash_balance ?? 0) - amount);

  const { error: balanceError } = await adminSupa
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
export const getLedgerEntries = async (
  filters?: {
    type?: string;
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }
) => {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase not configured.' };
  }

  const { data, error } = await supabase.from('ledger').select(`
    *,
    auth.users (email)
  `);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, entries: data };
};

/**
 * ============================================================
 // EXPORT HELPERS
 // ============================================================ */

/** Export the supabase client (with anon key for client, service role for admin) */
export { supabase };

/**
 * Hook for tracking auth state changes
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initSupabase = async () => {
      if (isSupabaseConfigured()) {
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

  return { user, loading };
};

/**
 * Hook for tracking profile completion
 */
export const useProfile = (userId?: string) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedProfile, setHasCompleted] = useState(false);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) {
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
  }, [userId, isSupabaseConfigured]);

  return { profile, loading, hasCompletedProfile };
};

/**
 * Default export - Supabase client
 */
export default supabase;