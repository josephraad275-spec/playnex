-- Run with psql as the migration owner AFTER applying the migration in an isolated test DB.
-- This tests schema/privilege invariants, not authenticated multi-user policy behavior.
begin;
do $$
declare t text;
begin
  foreach t in array array['profiles','game_catalog','rooms','room_members','room_invitations','reports','blocks','entitlements'] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then
      raise exception 'RLS disabled on %', t;
    end if;
  end loop;
  if has_table_privilege('authenticated','public.rooms','SELECT') then
    raise exception 'Raw private game state selectable by clients';
  end if;
  if has_table_privilege('anon','public.room_invitations','SELECT') or
     has_table_privilege('authenticated','public.room_invitations','SELECT') then
    raise exception 'Invitation material exposed';
  end if;
  if has_table_privilege('authenticated','private.user_roles','INSERT') or
     has_table_privilege('authenticated','public.entitlements','INSERT') then
    raise exception 'Client may self-grant role or entitlement';
  end if;
  if has_column_privilege('authenticated','public.reports','status','UPDATE') then
    raise exception 'Reporter may modify moderation state';
  end if;
  if has_function_privilege('anon','private.is_admin()','EXECUTE') then
    raise exception 'Anonymous role unexpectedly granted admin helper';
  end if;
end $$;
rollback;
