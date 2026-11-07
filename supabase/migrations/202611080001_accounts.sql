-- Run once with `supabase db push` or in the Supabase SQL Editor.
begin;

create type public.app_role as enum ('admin', 'user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '' check (char_length(full_name) <= 100),
  role public.app_role not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Do not trust user_metadata for authorization. Only this protected column is used.
create function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "Read own profile or all as admin"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Update own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Column privileges stop direct API requests from modifying role, email or id.
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

create function public.handle_auth_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.profiles (id, email, full_name)
    values (new.id, coalesce(new.email, ''), left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100));
  else
    update public.profiles set email = coalesce(new.email, '') where id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.handle_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_auth_user();
create trigger on_auth_user_email_updated
after update of email on auth.users for each row execute function public.handle_auth_user();

-- Backfill users that existed before this migration. All start with the user role.
insert into public.profiles (id, email, full_name, created_at)
select id, coalesce(email, ''), left(coalesce(raw_user_meta_data ->> 'full_name', ''), 100), created_at
from auth.users on conflict (id) do nothing;

create function public.set_user_role(target_user_id uuid, new_role public.app_role)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  -- Serialize role changes and re-check caller after locking.
  perform pg_advisory_xact_lock(726481922);
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên được thay đổi vai trò.' using errcode = '42501';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'Bạn không thể tự thay đổi vai trò của mình.' using errcode = '42501';
  end if;
  if new_role is null then
    raise exception 'Vai trò không hợp lệ.' using errcode = '22023';
  end if;
  update public.profiles set role = new_role where id = target_user_id;
  if not found then
    raise exception 'Không tìm thấy tài khoản.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_user_role(uuid, public.app_role) from public, anon;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;

commit;
