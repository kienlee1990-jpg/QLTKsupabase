import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Real PostgreSQL engine with minimal Auth scaffolding. Supabase integration tests
// remain in supabase/tests; these tests exercise the actual migration without Docker.
describe('database authorization', () => {
  let db: PGlite
  const admin = '00000000-0000-0000-0000-000000000001'
  const user = '00000000-0000-0000-0000-000000000002'
  const other = '00000000-0000-0000-0000-000000000003'

  async function asUser(id: string, sql: string) {
    await db.exec(`set role authenticated; select set_config('request.jwt.claims', '${JSON.stringify({ sub: id, role: 'authenticated' })}', false);`)
    try { return await db.query(sql) } finally { await db.exec('reset role') }
  }

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users (
        id uuid primary key, email text, raw_user_meta_data jsonb default '{}',
        created_at timestamptz default now()
      );
      create function auth.uid() returns uuid language sql stable as $$
        select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
      $$;
      grant usage on schema auth, public to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
    `)
    await db.exec(readFileSync(new URL('../../supabase/migrations/202611080001_accounts.sql', import.meta.url), 'utf8'))
    await db.exec(`
      insert into auth.users(id,email,raw_user_meta_data) values
        ('${admin}', 'admin@test.invalid', '{}'),
        ('${user}', 'user@test.invalid', '{"role":"admin","full_name":"Normal User"}'),
        ('${other}', 'other@test.invalid', '{}');
      update public.profiles set role = 'admin' where id = '${admin}';
    `)
  }, 30000)

  afterAll(async () => { await db?.close() })

  it('creates profiles and ignores role metadata', async () => {
    const result = await db.query<{ role: string; full_name: string }>(`select role, full_name from public.profiles where id = '${user}'`)
    expect(result.rows).toEqual([{ role: 'user', full_name: 'Normal User' }])
  })

  it('denies anonymous reads', async () => {
    await db.exec('set role anon')
    try { await expect(db.query('select * from public.profiles')).rejects.toMatchObject({ code: '42501' }) }
    finally { await db.exec('reset role') }
  })

  it('limits user reads to their own profile', async () => {
    const result = await asUser(user, 'select id from public.profiles')
    expect(result.rows).toEqual([{ id: user }])
  })

  it('allows changing own name', async () => {
    const result = await asUser(user, `update public.profiles set full_name = 'Updated' where id = '${user}' returning full_name`)
    expect(result.rows).toEqual([{ full_name: 'Updated' }])
  })

  it('denies edits to another profile', async () => {
    const result = await asUser(user, `update public.profiles set full_name = 'Hacked' where id = '${other}' returning id`)
    expect(result.rows).toEqual([])
  })

  it('denies role escalation through direct updates', async () => {
    await expect(asUser(user, `update public.profiles set role = 'admin' where id = '${user}'`)).rejects.toMatchObject({ code: '42501' })
  })

  it('denies email edits through profiles API', async () => {
    await expect(asUser(user, `update public.profiles set email = 'changed@test.invalid' where id = '${user}'`)).rejects.toMatchObject({ code: '42501' })
  })

  it('denies users access to the role RPC', async () => {
    await expect(asUser(user, `select public.set_user_role('${other}', 'admin')`)).rejects.toMatchObject({ code: '42501' })
  })

  it('allows admins to read all profiles', async () => {
    const result = await asUser(admin, 'select id from public.profiles')
    expect(result.rows).toHaveLength(3)
  })

  it('allows admin to grant and revoke another role', async () => {
    await asUser(admin, `select public.set_user_role('${other}', 'admin')`)
    expect((await asUser(other, 'select id from public.profiles')).rows).toHaveLength(3)
    await asUser(admin, `select public.set_user_role('${other}', 'user')`)
    expect((await asUser(other, 'select id from public.profiles')).rows).toHaveLength(1)
  })

  it('prevents admin from demoting self', async () => {
    await expect(asUser(admin, `select public.set_user_role('${admin}', 'user')`)).rejects.toMatchObject({ code: '42501' })
  })

  it('syncs email from Auth and removes profile on deletion', async () => {
    await db.exec(`update auth.users set email = 'updated@test.invalid' where id = '${other}'`)
    expect((await db.query(`select email from public.profiles where id = '${other}'`)).rows).toEqual([{ email: 'updated@test.invalid' }])
    await db.exec(`delete from auth.users where id = '${other}'`)
    expect((await db.query(`select id from public.profiles where id = '${other}'`)).rows).toEqual([])
  })
})
