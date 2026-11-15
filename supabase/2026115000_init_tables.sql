-- ============================================================
-- xena-broker :: Supabase schema
-- Safe to re-run (idempotent). Run the whole thing in SQL Editor.
-- ============================================================

-- 1. EXTENSIONS
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- 2. SHARED HELPER: updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- ============================================================
-- 3. ADMIN_USERS  (created first: is_admin() depends on it)
-- ============================================================
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz default timezone('utc'::text, now()),
  permissions jsonb default '{"can_manage_deposits": true, "can_manage_withdrawals": true, "can_manage_kyc": true, "can_manage_users": true, "can_view_ledger": true, "can_manage_settings": true}'::jsonb
);

alter table public.admin_users enable row level security;
-- No policy on purpose: only the service_role key (which bypasses RLS)
-- may read admin_users. This also avoids recursive RLS lookups.

-- Admin check used by the admin policies below.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.email = (auth.jwt() ->> 'email')
  );
$$;

-- ============================================================
-- 4. PROFILES
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users (id) on delete cascade,
  email text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  country text not null default '',
  has_completed_profile boolean not null default false,
  created_at timestamptz default timezone('utc'::text, now()),
  updated_at timestamptz default timezone('utc'::text, now())
);

-- in case the table already existed from an earlier run
alter table public.profiles add column if not exists email text not null default '';

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins can manage all profiles" on public.profiles;
create policy "Admins can manage all profiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- 5. BALANCES
-- ============================================================
create table if not exists public.balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users (id) on delete cascade,
  cash_balance numeric(15,2) not null default 0,
  reserved_cash numeric(15,2) not null default 0,
  updated_at timestamptz default timezone('utc'::text, now())
);

alter table public.balances enable row level security;

drop policy if exists "Users can view own balance" on public.balances;
create policy "Users can view own balance"
  on public.balances for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own balance" on public.balances;
create policy "Users can insert own balance"
  on public.balances for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own balance" on public.balances;
create policy "Users can update own balance"
  on public.balances for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins can manage all balances" on public.balances;
create policy "Admins can manage all balances"
  on public.balances for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists trg_balances_updated_at on public.balances;
create trigger trg_balances_updated_at
  before update on public.balances
  for each row execute function public.set_updated_at();

-- ============================================================
-- 6. POSITIONS
-- ============================================================
create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null,
  shares integer not null default 0,
  avg_cost numeric(12,2) not null default 0,
  updated_at timestamptz default timezone('utc'::text, now())
);

alter table public.positions enable row level security;

drop policy if exists "Users can view own positions" on public.positions;
create policy "Users can view own positions"
  on public.positions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own positions" on public.positions;
create policy "Users can insert own positions"
  on public.positions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own positions" on public.positions;
create policy "Users can update own positions"
  on public.positions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own positions" on public.positions;
create policy "Users can delete own positions"
  on public.positions for delete
  using (auth.uid() = user_id);

drop policy if exists "Admins can manage all positions" on public.positions;
create policy "Admins can manage all positions"
  on public.positions for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists trg_positions_updated_at on public.positions;
create trigger trg_positions_updated_at
  before update on public.positions
  for each row execute function public.set_updated_at();

-- ============================================================
-- 7. CHAT_MESSAGES
-- ============================================================
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sender text not null default 'user',
  message text not null,
  read_status boolean not null default false,
  created_at timestamptz default timezone('utc'::text, now())
);

alter table public.chat_messages enable row level security;

drop policy if exists "Users can view own messages" on public.chat_messages;
create policy "Users can view own messages"
  on public.chat_messages for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own messages" on public.chat_messages;
create policy "Users can insert own messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

drop policy if exists "Admins can view all messages" on public.chat_messages;
create policy "Admins can view all messages"
  on public.chat_messages for select
  using (public.is_admin());

drop policy if exists "Admins can update message read status" on public.chat_messages;
create policy "Admins can update message read status"
  on public.chat_messages for update
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 8. LEDGER  (used by admin deposit / withdrawal / ledger screens)
-- ============================================================
create table if not exists public.ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null default 'deposit'
    check (type in ('deposit', 'withdrawal', 'trade', 'adjustment')),
  amount numeric(15,2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'completed', 'failed')),
  method text,
  reference text,
  cash_balance numeric(15,2) not null default 0,
  notes text,
  created_at timestamptz default timezone('utc'::text, now()),
  updated_at timestamptz default timezone('utc'::text, now())
);

alter table public.ledger enable row level security;

drop policy if exists "Users can view own ledger" on public.ledger;
create policy "Users can view own ledger"
  on public.ledger for select
  using (auth.uid() = user_id);

drop policy if exists "Users can request own deposit or withdrawal" on public.ledger;
create policy "Users can request own deposit or withdrawal"
  on public.ledger for insert
  with check (
    auth.uid() = user_id
    and type in ('deposit', 'withdrawal')
    and status = 'pending'
  );

drop policy if exists "Admins can manage all ledger" on public.ledger;
create policy "Admins can manage all ledger"
  on public.ledger for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists trg_ledger_updated_at on public.ledger;
create trigger trg_ledger_updated_at
  before update on public.ledger
  for each row execute function public.set_updated_at();

-- ============================================================
-- 9. INDEXES
-- ============================================================
create index if not exists idx_profiles_user_id on public.profiles (user_id);
create index if not exists idx_profiles_has_completed on public.profiles (has_completed_profile);
create index if not exists idx_balances_user_id on public.balances (user_id);
create index if not exists idx_positions_user_id on public.positions (user_id);
create index if not exists idx_positions_symbol on public.positions (symbol);
create index if not exists idx_chat_messages_user_id on public.chat_messages (user_id);
create index if not exists idx_chat_messages_created on public.chat_messages (created_at);
create index if not exists idx_ledger_user_id on public.ledger (user_id);
create index if not exists idx_ledger_status on public.ledger (status);
create index if not exists idx_ledger_type on public.ledger (type);

-- ============================================================
-- 10. COMMENTS
-- ============================================================
comment on table public.profiles is 'User profile data with profile completion tracking';
comment on table public.balances is 'User cash balances and reserved cash';
comment on table public.positions is 'User stock positions and holdings';
comment on table public.chat_messages is 'Chat messages for user support';
comment on table public.admin_users is 'Admin user accounts with permissions';
comment on table public.ledger is 'Deposit / withdrawal / trade ledger entries';

-- ============================================================
-- 11. GRANTS
-- Correct PostgreSQL syntax: ALL TABLES requires IN SCHEMA.
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;

-- ============================================================
-- DONE
-- ============================================================
