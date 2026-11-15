-- Supabase Database Initialization Migration
-- Creates all required tables for xena-broker application

-- ============================================================
-- 1. PROFILES TABLE
-- Stores user profile data including profile completion status
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  country text not null default '',
  has_completed_profile boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable row level security
alter table public.profiles enable row level security;

-- Create trigger to update updated_at on profile updates
create or replace function public.handle_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_profiles_updated_at();

-- RLS Policies for profiles
-- Users can read/write only their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = user_id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = user_id);

create policy "Admins can manage all profiles" on public.profiles
  for all using (exists (select 1 from public.admin_users where admin_users.email = current_setting('app.jwt.claims', true).email));

-- ============================================================
-- 2. BALANCES TABLE
-- Stores user cash balances and reserved cash
-- ============================================================

create table if not exists public.balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users on delete cascade,
  cash_balance numeric(15,2) default 0 not null,
  reserved_cash numeric(15,2) default 0 not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.balances enable row level security;

-- Trigger for updated_at
create or replace function public.handle_balances_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger balances_updated_at
  before update on public.balances
  for each row
  execute function public.handle_balances_updated_at();

-- RLS Policies for balances
create policy "Users can view own balance" on public.balances
  for select using (auth.uid() = user_id);

create policy "Users can update own balance" on public.balances
  for update using (auth.uid() = user_id);

create policy "Admins can manage all balances" on public.balances
  for all using (exists (select 1 from public.admin_users where admin_users.email = current_setting('app.jwt.claims', true).email));

-- ============================================================
-- 3. POSITIONS TABLE
-- Stores user stock positions and holdings
-- ============================================================

create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  symbol text not null,
  shares integer default 0 not null,
  avg_cost numeric(12,2) default 0 not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.positions enable row level security;

-- Trigger for updated_at
create or replace function public.handle_positions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger positions_updated_at
  before update on public.positions
  for each row
  execute function public.handle_positions_updated_at();

-- RLS Policies for positions
create policy "Users can view own positions" on public.positions
  for select using (auth.uid() = user_id);

create policy "Users can insert own positions" on public.positions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own positions" on public.positions
  for update using (auth.uid() = user_id);

create policy "Admins can manage all positions" on public.positions
  for all using (exists (select 1 from public.admin_users where admin_users.email = current_setting('app.jwt.claims', true).email));

-- ============================================================
-- 4. CHAT_MESSAGES TABLE
-- Stores chat messages for user support/communication
-- ============================================================

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  sender text not null default 'user', -- 'user' or 'admin'
  message text not null,
  read_status boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.chat_messages enable row level security;

-- Trigger for updated_at (though chat_messages uses created_at)
create or replace function public.handle_chat_messages_updated_at()
returns trigger as $$
begin
  -- Chat messages typically don't update, but keep consistency
  return new;
end;
$$ language plpgsql security definer;

-- RLS Policies for chat_messages
create policy "Users can view own messages" on public.chat_messages
  for select using (auth.uid() = user_id);

create policy "Users can insert own messages" on public.chat_messages
  for insert with check (auth.uid() = user_id);

create policy "Admins can view all messages" on public.chat_messages
  for select using (exists (select 1 from public.admin_users where admin_users.email = current_setting('app.jwt.claims', true).email));

create policy "Admins can update message read status" on public.chat_messages
  for update using (exists (select 1 from public.admin_users where admin_users.email = current_setting('app.jwt.claims', true).email));

-- ============================================================
-- 5. ADMIN_USERS TABLE
-- Stores admin user accounts with permissions
-- ============================================================

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  permissions jsonb default '{"can_manage_deposits": true, "can_manage_withdrawals": true, "can_manage_kyc": true, "can_manage_users": true, "can_view_ledger": true, "can_manage_settings": true}'::jsonb
);

alter table public.admin_users enable row level security;

-- RLS Policies for admin_users
create policy "Admins can manage own record" on public.admin_users
  for all using (email = current_setting('app.jwt.claims', true).email);

-- ============================================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================================

-- Profiles indexes
create index idx_profiles_user_id on public.profiles (user_id);
create index idx_profiles_has_completed on public.profiles (has_completed_profile);

-- Balances indexes
create index idx_balances_user_id on public.balances (user_id);

-- Positions indexes
create index idx_positions_user_id on public.positions (user_id);
create index idx_positions_symbol on public.positions (symbol);

-- Chat messages indexes
create index idx_chat_messages_user_id on public.chat_messages (user_id);
create index idx_chat_messages_created on public.chat_messages (created_at);

-- Admin users indexes
create unique index idx_admin_users_email on public.admin_users (email);

-- Enable realtime for important tables (if using Supabase realtime)
-- alter publication superset add table public.profiles;
-- alter publication superset add table public.balances;
-- alter publication superset add table public.positions;
-- alter publication superset add table public.chat_messages;
-- alter publication superset add table public.admin_users;

comment on table public.profiles is 'User profile data with profile completion tracking';
comment on table public.balances is 'User cash balances and reserved cash';
comment on table public.positions is 'User stock positions and holdings';
comment on table public.chat_messages is 'Chat messages for user support';
comment on table public.admin_users is 'Admin user accounts with permissions';

grant all on all tables to authenticated;
grant all on all tables to service_role;