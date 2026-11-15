-- ============================================================
-- XENA BROKER — COMPLETE SUPABASE SETUP
-- Paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run more than once (idempotent).
-- Creates: profiles, balances, positions, chat_messages,
--          ledger, admin_users, platform_settings, RLS,
--          signup bonus (once per user), admin login + admin
--          balance adjustments, and the first admin account.
-- ============================================================

-- 1. EXTENSIONS ------------------------------------------------
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- 2. updated_at trigger helper ---------------------------------
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
-- 3. ADMIN_USERS (must exist before is_admin())
-- ============================================================
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz default timezone('utc'::text, now()),
  permissions jsonb default '{"can_manage_deposits": true, "can_manage_withdrawals": true, "can_manage_kyc": true, "can_manage_users": true, "can_view_ledger": true, "can_manage_settings": true}'::jsonb
);

alter table public.admin_users enable row level security;
-- No policy on purpose: only the service_role key (bypasses RLS) may read it.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a
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

alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Admins can manage all profiles" on public.profiles;
create policy "Admins can manage all profiles"
  on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

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
  on public.balances for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own balance" on public.balances;
create policy "Users can insert own balance"
  on public.balances for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own balance" on public.balances;
create policy "Users can update own balance"
  on public.balances for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Admins can manage all balances" on public.balances;
create policy "Admins can manage all balances"
  on public.balances for all
  using (public.is_admin()) with check (public.is_admin());

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
  on public.positions for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own positions" on public.positions;
create policy "Users can insert own positions"
  on public.positions for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own positions" on public.positions;
create policy "Users can update own positions"
  on public.positions for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own positions" on public.positions;
create policy "Users can delete own positions"
  on public.positions for delete using (auth.uid() = user_id);

drop policy if exists "Admins can manage all positions" on public.positions;
create policy "Admins can manage all positions"
  on public.positions for all
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists trg_positions_updated_at on public.positions;
create trigger trg_positions_updated_at
  before update on public.positions
  for each row execute function public.set_updated_at();

-- One row per user + symbol so positions can be upserted
delete from public.positions a
  using public.positions b
  where a.ctid < b.ctid
    and a.user_id = b.user_id
    and a.symbol = b.symbol;

create unique index if not exists uniq_positions_user_symbol
  on public.positions (user_id, symbol);

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
  on public.chat_messages for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own messages" on public.chat_messages;
create policy "Users can insert own messages"
  on public.chat_messages for insert with check (auth.uid() = user_id);

drop policy if exists "Admins can view all messages" on public.chat_messages;
create policy "Admins can view all messages"
  on public.chat_messages for select using (public.is_admin());

drop policy if exists "Admins can update message read status" on public.chat_messages;
create policy "Admins can update message read status"
  on public.chat_messages for update
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 8. LEDGER (deposits, withdrawals, bonuses, adjustments)
-- ============================================================
create table if not exists public.ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null default 'deposit',
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

-- allow the 'bonus' type on both new and previously-created tables
alter table public.ledger drop constraint if exists ledger_type_check;
alter table public.ledger
  add constraint ledger_type_check
  check (type in ('deposit', 'withdrawal', 'trade', 'adjustment', 'bonus'));

-- a user can only ever receive ONE signup bonus
create unique index if not exists uniq_ledger_bonus_per_user
  on public.ledger (user_id)
  where type = 'bonus';

alter table public.ledger enable row level security;

drop policy if exists "Users can view own ledger" on public.ledger;
create policy "Users can view own ledger"
  on public.ledger for select using (auth.uid() = user_id);

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
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists trg_ledger_updated_at on public.ledger;
create trigger trg_ledger_updated_at
  before update on public.ledger
  for each row execute function public.set_updated_at();

-- ============================================================
-- 9. PLATFORM SETTINGS (admin editable)
-- ============================================================
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default timezone('utc'::text, now())
);

insert into public.platform_settings (key, value)
values ('welcome_bonus', '{"amount": 500, "enabled": true}'::jsonb)
on conflict (key) do nothing;

alter table public.platform_settings enable row level security;
-- Service role only (admin console). The bonus function is security definer.

-- ============================================================
-- 10. SIGNUP BONUS — granted exactly once per user
-- ============================================================
create or replace function public.grant_welcome_bonus(p_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  bonus numeric := 0;
  enabled boolean := true;
  already integer := 0;
  new_balance numeric := 0;
begin
  if p_user_id is null then
    return 0;
  end if;

  select
    coalesce((value ->> 'amount')::numeric, 0),
    coalesce((value ->> 'enabled')::boolean, true)
  into bonus, enabled
  from public.platform_settings
  where key = 'welcome_bonus';

  if not enabled or coalesce(bonus, 0) <= 0 then
    return 0;
  end if;

  select count(*) into already
  from public.ledger
  where user_id = p_user_id and type = 'bonus';

  if already > 0 then
    return 0;
  end if;

  insert into public.balances (user_id, cash_balance)
  values (p_user_id, bonus)
  on conflict (user_id)
    do update set cash_balance = public.balances.cash_balance + bonus,
                  updated_at = timezone('utc'::text, now())
  returning cash_balance into new_balance;

  insert into public.ledger (user_id, type, amount, status, method, reference, notes, cash_balance)
  values (p_user_id, 'bonus', bonus, 'completed', 'system', 'XN-BONUS',
          'Welcome sign-up bonus', new_balance);

  return bonus;
end;
$$;

create or replace function public.claim_signup_bonus()
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return 0;
  end if;
  return public.grant_welcome_bonus(uid);
end;
$$;

grant execute on function public.claim_signup_bonus() to authenticated, service_role;
grant execute on function public.grant_welcome_bonus(uuid) to service_role;

-- 10b. Auto-provision every new signup + grant the bonus at signup time
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do nothing;

  insert into public.balances (user_id, cash_balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  perform public.grant_welcome_bonus(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 10c. Backfill: every existing user without a bonus gets one (once)
do $$
declare
  r record;
begin
  for r in
    select u.id
    from auth.users u
    where not exists (
      select 1 from public.ledger l
      where l.user_id = u.id and l.type = 'bonus'
    )
  loop
    perform public.grant_welcome_bonus(r.id);
  end loop;
end;
$$;

-- ============================================================
-- 11. ADMIN LOGIN (bcrypt check against admin_users)
-- ============================================================
create or replace function public.admin_login(p_email text, p_password text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.admin_users a
    where lower(a.email) = lower(trim(p_email))
      and a.password_hash = crypt(p_password, a.password_hash)
  );
$$;

grant execute on function public.admin_login(text, text) to anon, authenticated, service_role;

-- ============================================================
-- 12. ADMIN: INCREASE / DECREASE A USER BALANCE
-- ============================================================
create or replace function public.admin_adjust_balance(
  p_user_id uuid,
  p_delta numeric,
  p_reason text default 'Admin adjustment'
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance numeric := 0;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_delta = 0 then
    select cash_balance into new_balance from public.balances where user_id = p_user_id;
    return coalesce(new_balance, 0);
  end if;

  insert into public.balances (user_id, cash_balance)
  values (p_user_id, greatest(0, p_delta))
  on conflict (user_id)
    do update set cash_balance = greatest(0, public.balances.cash_balance + p_delta),
                  updated_at = timezone('utc'::text, now())
  returning cash_balance into new_balance;

  insert into public.ledger (user_id, type, amount, status, method, reference, notes, cash_balance)
  values (p_user_id, 'adjustment', p_delta, 'completed', 'admin', 'XN-ADJ',
          coalesce(p_reason, 'Admin adjustment'), new_balance);

  return new_balance;
end;
$$;

grant execute on function public.admin_adjust_balance(uuid, numeric, text) to service_role;

-- ============================================================
-- 13. INDEXES + GRANTS
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

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;

comment on table public.profiles is 'User profile data with profile completion tracking';
comment on table public.balances is 'User cash balances and reserved cash';
comment on table public.positions is 'User stock positions and holdings';
comment on table public.chat_messages is 'Chat messages for user support';
comment on table public.admin_users is 'Admin user accounts with permissions';
comment on table public.ledger is 'Deposit / withdrawal / bonus / adjustment ledger';
comment on table public.platform_settings is 'Platform-wide settings (welcome bonus, etc.)';

-- ============================================================
-- 14. FIRST ADMIN ACCOUNT
-- email:    admin@xenabroker.com
-- password: admin123   <-- CHANGE THIS before going live
-- The upsert REPLACES any existing hash for this email, so the
-- password below always works after running this script.
-- ============================================================
insert into public.admin_users (email, password_hash)
values ('admin@xenabroker.com', crypt('admin123', gen_salt('bf')))
on conflict (email) do update set password_hash = excluded.password_hash;

-- Make PostgREST pick up the new RPCs immediately
notify pgrst, 'reload schema';

-- ============================================================
-- 15. VERIFY (last result set is shown by the SQL editor)
-- ============================================================
select 'profiles'         as object, count(*)::text as rows from public.profiles
union all select 'balances',        count(*)::text from public.balances
union all select 'positions',       count(*)::text from public.positions
union all select 'ledger',          count(*)::text from public.ledger
union all select 'bonuses granted', count(*)::text from public.ledger where type = 'bonus'
union all select 'admins',          count(*)::text from public.admin_users
union all select 'settings',        count(*)::text from public.platform_settings;
