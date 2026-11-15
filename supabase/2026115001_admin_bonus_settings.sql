-- ============================================================
-- xena-broker :: Admin, signup bonus & settings
-- Safe to re-run (idempotent).
-- Run AFTER 2026115000_init_tables.sql
-- ============================================================

-- 1. Allow a 'bonus' type (and keep the rest) on the ledger
alter table public.ledger drop constraint if exists ledger_type_check;
alter table public.ledger
  add constraint ledger_type_check
  check (type in ('deposit', 'withdrawal', 'trade', 'adjustment', 'bonus'));

-- A user can only ever receive ONE signup bonus
create unique index if not exists uniq_ledger_bonus_per_user
  on public.ledger (user_id)
  where type = 'bonus';

-- Positions are upserted per (user, symbol)
delete from public.positions a
  using public.positions b
  where a.ctid < b.ctid
    and a.user_id = b.user_id
    and a.symbol = b.symbol;

create unique index if not exists uniq_positions_user_symbol
  on public.positions (user_id, symbol);

-- ============================================================
-- 2. PLATFORM SETTINGS (admin editable)
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
-- Only the service_role key may read/write settings.

-- ============================================================
-- 3. SIGNUP BONUS (granted once per user, server-side)
-- ============================================================
create or replace function public.claim_signup_bonus()
returns numeric
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  bonus numeric := 0;
  enabled boolean := true;
  already integer := 0;
  new_balance numeric := 0;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select
    coalesce((value ->> 'amount')::numeric, 0),
    coalesce((value ->> 'enabled')::boolean, true)
  into bonus, enabled
  from public.platform_settings
  where key = 'welcome_bonus';

  if not enabled or bonus <= 0 then
    return 0;
  end if;

  select count(*) into already
  from public.ledger
  where user_id = uid and type = 'bonus';

  if already > 0 then
    return 0;
  end if;

  insert into public.balances (user_id, cash_balance)
  values (uid, bonus)
  on conflict (user_id)
    do update set cash_balance = public.balances.cash_balance + bonus,
                  updated_at = timezone('utc'::text, now())
  returning cash_balance into new_balance;

  insert into public.ledger (user_id, type, amount, status, method, reference, notes, cash_balance)
  values (uid, 'bonus', bonus, 'completed', 'system', 'XN-BONUS',
          'Welcome sign-up bonus', new_balance);

  return bonus;
end;
$$;

grant execute on function public.claim_signup_bonus() to authenticated, service_role;

-- ============================================================
-- 4. ADMIN LOGIN (checks the bcrypt hash in admin_users)
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
-- 5. ADMIN: INCREASE / DECREASE A USER BALANCE
-- Called with the service_role key from the admin console.
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
  values (p_user_id, 'adjustment', p_delta,
          'completed', 'admin', 'XN-ADJ', coalesce(p_reason, 'Admin adjustment'), new_balance);

  return new_balance;
end;
$$;

grant execute on function public.admin_adjust_balance(uuid, numeric, text) to service_role;

-- ============================================================
-- 6. ADMIN SMOKE TEST (read-only, harmless)
-- ============================================================
do $$
begin
  if not exists (select 1 from public.admin_users) then
    raise notice 'No admin users yet. Create one with:';
    raise notice 'insert into public.admin_users (email, password_hash) values (''admin@xenabroker.com'', crypt(''admin123'', gen_salt(''bf'')));';
  end if;
end;
$$;

-- ============================================================
-- DONE
-- ============================================================
