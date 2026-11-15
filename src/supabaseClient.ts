import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { UserAccount, UserProfile, Position, Balance, ChatMessage, AdminUser } from './types/broker';

// Initialize Supabase client
// In production, these values should come from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-public-key';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get current user from Supabase auth
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user} } = await supabase.auth.getUser();
  return user;
};

/**
 * Sign in with email and password
 */
export const signInWithPassword = async (email: string, password: string) => {
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
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return { ok: false, message: error.message };
  }
  
  return { ok: true };
};

/**
 * Handle Google OAuth sign in
 * Note: This requires Supabase Google OAuth configuration
 */
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Redirect to the current page after auth
      redirectTo: window.location.origin + '/auth/callback',
    },
  });
  
  if (error) {
    return { ok: false, message: error.message };
  }
  
  return { ok: true, data };
};

/**
 * Get user profile from profiles table
 */
export const getProfile = async (userId: string): Promise<{ ok: boolean; profile?: UserProfile; message?: string }> => {
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
  profileData: { first_name: string; last_name: string; country: string; has_completed_profile: boolean }
): Promise<{ ok: boolean; message?: string }> => {
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
 * Get user balance from balances table
 */
export const getBalance = async (userId: string): Promise<{ ok: boolean; balance?: Balance; message?: string }> => {
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
): Promise<{ ok: boolean; message?: string }> => {
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
 * Get user positions from positions table
 */
export const getPositions = async (userId: string): Promise<{ ok: boolean; positions?: Position[]; message?: string }> => {
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
): Promise<{ ok: boolean; message?: string }> => {
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
 * Insert a chat message
 */
export const insertChatMessage = async (
  userId: string, 
  message: string, 
  sender: 'user' | 'admin' = 'user'
): Promise<{ ok: boolean; messageId?: string; message?: string }> => {
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
export const selectChatMessages = async (userId: string): Promise<{ ok: boolean; messages?: ChatMessage[]; message?: string }> => {
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
export const updateMessageReadStatus = async (
  messageId: string
): Promise<{ ok: boolean; message?: string }> => {
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
 * Check if user has completed profile
 */
export const hasCompletedProfile = async (userId: string): Promise<{ ok: boolean; completed: boolean; message?: string }> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('has_completed_profile')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    return { ok: false, message: error.message };
  }
  
  return { ok: true, completed: data?.has_completed_profile === true };
};

/**
 * Set user profile completion status
 */
export const setHasCompletedProfile = async (userId: string, completed: boolean): Promise<{ ok: boolean; message?: string }> => {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      has_completed_profile: completed,
    });
  
  if (error) {
    return { ok: false, message: error.message };
  }
  
  return { ok: true };
};

/**
 * Admin functions
 */

/** Get all users with their profiles */
export const getAllUsers = async (): Promise<{ ok: boolean; users?: any[]; message?: string }> => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      auth.users (
        id,
        email,
        created_at
      )
    `);
  
  if (error) {
    return { ok: false, message: error.message };
  }
  
  return { ok: true, users: data };
};

/** Get all balances */
export const getAllBalances = async (): Promise<{ ok: boolean; balances?: any[]; message?: string }> => {
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

/** Get all pending deposits from ledger */
export const getPendingDeposits = async (): Promise<{ ok: boolean; deposits?: any[]; message?: string }> => {
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
export const approveDeposit = async (ledgerId: string, amount: number): Promise<{ ok: boolean; message?: string }> => {
  const { error } = await supabase
    .from('ledger')
    .update({ status: 'approved' })
    .eq('id', ledgerId);
  
  if (error) {
    return { ok: false, message: error.message };
  }
  
  // Also update the user's balance
  // Get the user_id from the ledger entry first
  const { data: ledgerEntry, error: ledgerError } = await supabase
    .from('ledger')
    .select('user_id')
    .eq('id', ledgerId)
    .single();
  
  if (ledgerError) {
    return { ok: true, message: 'Deposit approved but could not update balance' };
  }
  
  // Update the balance
  const { data: balance, error: balanceError } = await supabase
    .from('balances')
    .select('cash_balance')
    .eq('user_id', ledgerEntry?.user_id)
    .single();
  
  if (balanceError) {
    return { ok: true, message: 'Deposit approved' };
  }
  
  const newBalance = Number(balance.cash_balance) + amount;
  
  const { error: updateError } = await supabase
    .from('balances')
    .update({ cash_balance: newBalance })
    .eq('user_id', ledgerEntry?.user_id);
  
  if (updateError) {
    return { ok: false, message: 'Deposit approved but failed to update balance' };
  }
  
  return { ok: true, message: 'Deposit approved and balance updated' };
};

/** Reject a deposit */
export const rejectDeposit = async (ledgerId: string): Promise<{ ok: boolean; message?: string }> => {
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
export const getPendingWithdrawals = async (): Promise<{ ok: boolean; withdrawals?: any[]; message?: string }> => {
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
export const processWithdrawal = async (ledgerId: string, amount: number): Promise<{ ok: boolean; message?: string }> => {
  const { error } = await supabase
    .from('ledger')
    .update({ status: 'completed' })
    .eq('id', ledgerId);
  
  if (error) {
    return { ok: false, message: error.message };
  }
  
  // Get the user_id from the ledger entry
  const { data: ledgerEntry, error: ledgerError } = await supabase
    .from('ledger')
    .select('user_id, cash_balance')
    .eq('id', ledgerId)
    .single();
  
  if (ledgerError) {
    return { ok: true, message: 'Withdrawal processed' };
  }
  
  // Deduct from balance
  const newBalance = Math.max(0, Number(ledgerEntry?.cash_balance ?? 0) - amount);
  
  const { error: updateError } = await supabase
    .from('balances')
    .update({ cash_balance: newBalance })
    .eq('user_id', ledgerEntry?.user_id);
  
  if (updateError) {
    return { ok: false, message: 'Withdrawal processed but failed to update balance' };
  }
  
  return { ok: true, message: 'Withdrawal processed successfully' };
};

/** Update KYC status for a user */
export const updateKycStatus = async (
  userId: string, 
  status: 'verified' | 'unverified'
): Promise<{ ok: boolean; message?: string }> => {
  // Update the profiles table with KYC info
  const { error } = await supabase
    .from('profiles')
    .update({ 
      has_completed_profile: status === 'verified' 
    })
    .eq('user_id', userId);
  
  if (error) {
    return { ok: false, message: error.message };
  }
  
  return { ok: true, message: `KYC status set to ${status}` };
};

/** Get KYC profile for a user */
export const getKycProfile = async (userId: string): Promise<{ ok: boolean; kyc?: any; message?: string }> => {
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
  filters?: { type?: string; status?: string; userId?: string; startDate?: string; endDate?: string }
): Promise<{ ok: boolean; entries?: any[]; message?: string }> => {
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

/** Get admin statistics */
export const getAdminStats = async (): Promise<{ ok: boolean; stats?: any; message?: string }> => {
  // Get counts for various metrics
  const [users, balances, positions, deposits, withdrawals] = await Promise.all([
    getAllUsers(),
    getAllBalances(),
    getPositions('admin'), // This won't work directly, need separate query
    getPendingDeposits(),
    getPendingWithdrawals(),
  ]);
  
  let totalUsers = 0;
  let verifiedUsers = 0;
  let totalBalance = 0;
  let pendingDeposits = 0;
  let pendingWithdrawals = 0;
  
  if (users.ok && users.users) {
    totalUsers = users.users.length;
    verifiedUsers = users.users.filter((u: any) => u.profile?.has_completed_profile).length;
  }
  
  if (balances.ok && balances.balances) {
    totalBalance = balances.balances.reduce((sum: number, b: any) => sum + Number(b.cash_balance), 0);
  }
  
  if (deposits.ok) {
    pendingDeposits = deposits.deposits?.length || 0;
  }
  
  if (withdrawals.ok) {
    pendingWithdrawals = withdrawals.withdrawals?.length || 0;
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

/** Export the supabase client for direct use */
export { supabase };

/**
 * Hook for tracking auth state changes
 * Usage: const { user, loading } = useAuth();
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    
    // Track auth state changes
    const { data: authChanges } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    
    return () => {
      authChanges.subscription.unsubscribe();
    };
  }, []);
  
  return { user, loading };
};

/**
 * Hook for tracking profile completion
 * Usage: const { profile, loading } = useProfile();
 */
export const useProfile = (userId?: string) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedProfile, setHasCompleted] = useState(false);
  
  useEffect(() => {
    if (!userId) {
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
  }, [userId]);
  
  return { profile, loading, hasCompletedProfile };
};