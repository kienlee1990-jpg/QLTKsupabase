import { api } from '../lib/supabase'

export type Role = 'admin' | 'user'
export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  created_at: string
}

export async function getProfile(id: string): Promise<Profile> {
  const { data, error } = await api().from('profiles').select('*').eq('id', id).single()
  if (error) throw error
  return data as Profile
}

export async function updateName(id: string, fullName: string) {
  const { data, error } = await api().from('profiles').update({ full_name: fullName.trim() }).eq('id', id).select().single()
  if (error) throw error
  return data as Profile
}

export async function listAccounts(): Promise<Profile[]> {
  const accounts: Profile[] = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await api().from('profiles').select('*')
      .order('created_at', { ascending: false }).order('id').range(offset, offset + pageSize - 1)
    if (error) throw error
    accounts.push(...data as Profile[])
    if (data.length < pageSize) return accounts
  }
}

export async function setRole(id: string, role: Role) {
  const { error } = await api().rpc('set_user_role', { target_user_id: id, new_role: role })
  if (error) throw error
}
