-- ============================================================
-- Xena Broker — KYC documents, account freeze & live chat
-- Run this once in the Supabase SQL editor (project ocuwuecmmpztqksqsmsp).
-- Safe to re-run: every statement is idempotent.
-- ============================================================

-- 1. KYC + freeze columns on profiles
alter table public.profiles add column if not exists kyc_status text not null default 'unverified';
alter table public.profiles add column if not exists kyc_document text;
alter table public.profiles add column if not exists kyc_document_name text;
alter table public.profiles add column if not exists kyc_submitted_at timestamptz;
alter table public.profiles add column if not exists kyc_reviewed_at timestamptz;
alter table public.profiles add column if not exists kyc_rejection_reason text;
alter table public.profiles add column if not exists account_frozen boolean not null default false;
alter table public.profiles add column if not exists frozen_reason text;

-- Existing rows: derive a sensible status from the old flag.
update public.profiles
set kyc_status = 'verified'
where kyc_status = 'unverified' and has_completed_profile = true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_kyc_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_kyc_status_check
      check (kyc_status in ('unverified', 'pending', 'verified', 'rejected'));
  end if;
end $$;

create index if not exists idx_profiles_kyc_status on public.profiles (kyc_status);
create index if not exists idx_profiles_frozen on public.profiles (account_frozen);

-- Users may update their own KYC fields (the existing "Users can update own
-- profile" policy already covers this via auth.uid() = user_id).

-- 2. Live chat table (already created by 2026115000_init_tables.sql)
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

create index if not exists idx_chat_messages_user on public.chat_messages (user_id, created_at);

notify pgrst, 'reload schema';
