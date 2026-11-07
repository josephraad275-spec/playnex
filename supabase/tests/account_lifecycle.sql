-- UNEXECUTED template: run as migration owner in a disposable local Supabase DB.
-- Requires BOTH migrations. All test users/data are rolled back.
-- Does not validate live Auth email delivery or remote provider behavior.
begin;
insert into auth.users(id,email,raw_user_meta_data)
values
 ('fabc0000-0000-4000-8000-000000000001','playnex-test-a@example.invalid','{"display_name":"  Alpha  ","age_confirmed":true,"role":"admin","adult_attested_at":"2000-01-01"}'),
 ('fabc0000-0000-4000-8000-000000000002','playnex-test-b@example.invalid','{"display_name":"Beta","age_confirmed":true}');

do $$
begin
  if not exists(select 1 from public.profiles where id = 'fabc0000-0000-4000-8000-000000000001' and display_name = 'Alpha' and avatar = 'orbit' and adult_attested_at >= transaction_timestamp()) then
    raise exception 'Profile was not safely initialized';
  end if;
  if exists(select 1 from private.user_roles where user_id = 'fabc0000-0000-4000-8000-000000000001') then
    raise exception 'User metadata granted administrative role';
  end if;
  begin
    insert into auth.users(id,raw_user_meta_data) values (gen_random_uuid(),'{"display_name":"Young","age_confirmed":false}');
    raise exception 'False age attestation accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    insert into auth.users(id,raw_user_meta_data) values (gen_random_uuid(),'{"display_name":"String","age_confirmed":"true"}');
    raise exception 'Nonboolean age attestation accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    insert into auth.users(id,raw_user_meta_data) values (gen_random_uuid(),'{"display_name":"<script>","age_confirmed":true}');
    raise exception 'Markup display name accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    insert into auth.users(id,raw_user_meta_data) values (gen_random_uuid(),'{"display_name":"   ","age_confirmed":true}');
    raise exception 'Blank name accepted';
  exception when invalid_parameter_value then null;
  end;
end $$;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"fabc0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$
begin
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'Own-profile RLS exposed another account';
  end if;
  update public.profiles set display_name = 'Alpha updated' where id = 'fabc0000-0000-4000-8000-000000000001';
  if not found then raise exception 'Own profile update blocked'; end if;
  update public.profiles set display_name = 'Stolen' where id = 'fabc0000-0000-4000-8000-000000000002';
  if found then raise exception 'Another account profile changed'; end if;
  begin
    update public.profiles set adult_attested_at = now() where id = 'fabc0000-0000-4000-8000-000000000001';
    raise exception 'Client may rewrite adult attestation';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.profiles(id,display_name) values (gen_random_uuid(),'Forged');
    raise exception 'Client may create arbitrary profile';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Auth deletion must cascade private profile and remove entitlement/block data.
insert into public.entitlements(user_id,product_id) values ('fabc0000-0000-4000-8000-000000000001','test-product');
insert into public.blocks(blocker_id,blocked_id) values ('fabc0000-0000-4000-8000-000000000001','fabc0000-0000-4000-8000-000000000002');
delete from auth.users where id = 'fabc0000-0000-4000-8000-000000000001';
do $$
begin
  if exists(select 1 from public.profiles where id = 'fabc0000-0000-4000-8000-000000000001') or
     exists(select 1 from public.entitlements where user_id = 'fabc0000-0000-4000-8000-000000000001') or
     exists(select 1 from public.blocks where blocker_id = 'fabc0000-0000-4000-8000-000000000001') then
    raise exception 'Account deletion left associated data';
  end if;
end $$;
rollback;
