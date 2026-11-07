-- Run against a LOCAL database only: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data)
values
 ('00000000-0000-0000-0000-000000000001', 'admin@test.invalid', '{}'),
 ('00000000-0000-0000-0000-000000000002', 'user@test.invalid', '{"role":"admin"}'),
 ('00000000-0000-0000-0000-000000000003', 'other@test.invalid', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-000000000001';

select is((select role::text from public.profiles where id = '00000000-0000-0000-0000-000000000002'), 'user', 'Metadata cannot grant admin');
select ok(not has_table_privilege('anon', 'public.profiles', 'SELECT'), 'Anonymous cannot read profiles');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.profiles), 1, 'User sees only own profile');
select lives_ok($$update public.profiles set full_name = 'Updated' where id = '00000000-0000-0000-0000-000000000002'$$, 'User can update own name');
select throws_ok($$update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-000000000002'$$, '42501', null, 'User cannot directly change role');
select throws_ok($$select public.set_user_role('00000000-0000-0000-0000-000000000003', 'admin')$$, '42501', null, 'User cannot invoke admin RPC');
with changed as (update public.profiles set full_name = 'Hacked' where id = '00000000-0000-0000-0000-000000000003' returning id)
select is((select count(*)::int from changed), 0, 'User cannot change another profile');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from public.profiles), 3, 'Admin sees all accounts');
select lives_ok($$select public.set_user_role('00000000-0000-0000-0000-000000000003', 'admin')$$, 'Admin can change another role');
select throws_ok($$select public.set_user_role('00000000-0000-0000-0000-000000000001', 'user')$$, '42501', null, 'Admin cannot demote self');

select * from finish();
rollback;
