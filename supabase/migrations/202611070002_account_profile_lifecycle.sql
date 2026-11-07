-- Optional account integration foundation. Review/run in isolated Supabase first.
-- This records adult self-attestation; it is NOT verified age assurance.
begin;

-- Profiles are created by the auth trigger, never by client-provided timestamps.
revoke insert(id,display_name,avatar,adult_attested_at) on public.profiles from authenticated;
drop policy profile_insert_self on public.profiles;
alter table public.profiles add constraint profiles_display_name_clean
  check (char_length(display_name) between 2 and 24 and display_name = btrim(display_name) and display_name !~ '[[:cntrl:]<>]');

create function private.create_account_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  account_name text;
begin
  -- Only these display metadata fields are used. Metadata role/admin claims are ignored.
  -- Strict JSON boolean prevents strings such as "false" or "true" being coerced.
  if (new.raw_user_meta_data -> 'age_confirmed') is distinct from 'true'::jsonb then
    raise exception 'Adult self-attestation is required for the private beta.' using errcode = '22023';
  end if;
  if jsonb_typeof(new.raw_user_meta_data -> 'display_name') is distinct from 'string' then
    raise exception 'A display name is required.' using errcode = '22023';
  end if;
  account_name := btrim(new.raw_user_meta_data ->> 'display_name');
  if char_length(account_name) not between 2 and 24 or account_name ~ '[[:cntrl:]<>]' then
    raise exception 'Display names must contain 2–24 characters without control characters or angle brackets.' using errcode = '22023';
  end if;
  insert into public.profiles(id, display_name, avatar, adult_attested_at)
  values (new.id, account_name, 'orbit', now());
  return new;
end;
$$;
revoke all on function private.create_account_profile() from public, anon, authenticated;
create trigger playnex_account_profile_created
  after insert on auth.users
  for each row execute function private.create_account_profile();

-- Changes to auth user metadata do not update adult_attested_at or grant privileges.
-- Existing auth users are deliberately not silently attested/backfilled.
-- Account deletion cascades through auth.users foreign keys in migration 001.
commit;
