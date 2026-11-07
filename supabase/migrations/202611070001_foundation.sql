-- Prepared foundation; NOT integrated with the in-memory beta server.
-- Apply only to a new, reviewed Supabase project. Never expose service_role keys.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'moderator'))
);
revoke all on private.user_roles from public, anon, authenticated;
create function private.is_admin() returns boolean language sql stable security definer
set search_path = '' as $$
  select exists(select 1 from private.user_roles where user_id = auth.uid() and role = 'admin');
$$;
revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  avatar text not null default 'orbit' check (avatar in ('orbit','comet','nova','moon')),
  adult_attested_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.game_catalog (
  id text primary key,
  metadata jsonb not null check (jsonb_typeof(metadata) = 'object'),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null references public.game_catalog(id),
  phase text not null default 'lobby' check (phase in ('lobby','playing','finished','expired')),
  version bigint not null default 0 check (version >= 0),
  state jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seat smallint not null check (seat in (0,1)),
  ready boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key(room_id,user_id), unique(room_id,seat)
);
create index room_members_user_idx on public.room_members(user_id);
create index rooms_expiry_idx on public.rooms(expires_at);
create table public.room_invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status text not null default 'open' check (status in ('open','reviewing','closed')),
  created_at timestamptz not null default now()
);
create index reports_reporter_idx on public.reports(reporter_id);
create table public.blocks (
  blocker_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id,blocked_id), check (blocker_id <> blocked_id)
);
create table public.entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  expires_at timestamptz,
  granted_at timestamptz not null default now(),
  primary key(user_id,product_id)
);
-- Security-definer avoids self-referencing RLS on room_members.
-- No user-provided identity; it always checks auth.uid().
create function private.is_room_member(target_room uuid) returns boolean language sql stable security definer
set search_path = '' as $$
  select exists(select 1 from public.room_members where room_id = target_room and user_id = auth.uid());
$$;
revoke all on function private.is_room_member(uuid) from public;
grant execute on function private.is_room_member(uuid) to authenticated;

alter table private.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.game_catalog enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_invitations enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.entitlements enable row level security;
revoke all on public.profiles, public.game_catalog, public.rooms, public.room_members,
 public.room_invitations, public.reports, public.blocks, public.entitlements from anon, authenticated;
grant select on public.game_catalog to anon, authenticated;
grant select on public.profiles, public.room_members, public.reports, public.blocks, public.entitlements to authenticated;
-- Raw rooms.state is intentionally not granted: it could contain private trivia answers.
-- A future trusted API must project sanitized state and enforce membership.
grant insert(id,display_name,avatar,adult_attested_at), update(display_name,avatar) on public.profiles to authenticated;
grant insert(reporter_id,reported_user_id,reason) on public.reports to authenticated;
grant insert(blocker_id,blocked_id), delete on public.blocks to authenticated;
-- Separate roles prevent anon invoking the authenticated-only admin helper.
create policy catalog_public_read on public.game_catalog for select to anon using (enabled);
create policy catalog_member_read on public.game_catalog for select to authenticated using (enabled or private.is_admin());
create policy profile_read_self on public.profiles for select to authenticated using (id = auth.uid());
create policy profile_insert_self on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profile_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy members_read on public.room_members for select to authenticated using (private.is_room_member(room_id));
create policy reports_read_self on public.reports for select to authenticated using (reporter_id = auth.uid());
create policy reports_insert_self on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy blocks_read_self on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy blocks_insert_self on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy blocks_delete_self on public.blocks for delete to authenticated using (blocker_id = auth.uid());
create policy entitlements_read_self on public.entitlements for select to authenticated using (user_id = auth.uid());
-- No client write policy exists for roles, catalog, rooms, members, invites or entitlements.
-- Trusted backend transactions must lock rooms FOR UPDATE, validate moves/version,
-- enforce invitation hashes/expiry, blocks, capacity and identity before updating state.
commit;
