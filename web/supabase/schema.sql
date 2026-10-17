-- GM Vault Bakeoff 1 database
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

-- PROFILES: one row per user (F2). Supabase keeps email + password in auth.users.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  profile_picture text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Read own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Update own profile" on public.profiles for update using (auth.uid() = id);

-- Automatically create a profile when someone signs up.
-- The name comes from the sign-up form (options.data.name).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'New user'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- CAMPAIGNS (F4)
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  gm_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaigns_gm_id_idx on public.campaigns (gm_id);

-- Row Level Security: each GM can only see and change their own campaigns.
alter table public.campaigns enable row level security;
create policy "GM reads own campaigns"   on public.campaigns for select using (auth.uid() = gm_id);
create policy "GM creates campaigns"     on public.campaigns for insert with check (auth.uid() = gm_id);
create policy "GM updates own campaigns" on public.campaigns for update
  using (auth.uid() = gm_id) with check (auth.uid() = gm_id);
create policy "GM deletes own campaigns" on public.campaigns for delete using (auth.uid() = gm_id);
