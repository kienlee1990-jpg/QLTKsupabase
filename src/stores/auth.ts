import { computed, ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { api, supabase } from '../lib/supabase'
import { getProfile, type Profile } from '../services/accounts'

const session = ref<Session | null>(null)
const profile = ref<Profile | null>(null)
const loading = ref(true)
const profileError = ref('')
let initialization: Promise<void> | undefined
let revision = 0
let profileRequest: { id: string; promise: Promise<void> } | undefined

async function loadProfile() {
  const id = session.value?.user.id
  if (!id) {
    ++revision
    profile.value = null
    profileError.value = ''
    profileRequest = undefined
    return
  }
  if (profileRequest?.id === id) return profileRequest.promise
  const currentRevision = ++revision
  if (profile.value?.id !== id) profile.value = null
  profileError.value = ''
  const promise = (async () => {
    try {
      const result = await getProfile(id)
      if (currentRevision === revision) profile.value = result
    } catch {
      if (currentRevision === revision) {
        profile.value = null
        profileError.value = 'Không tải được hồ sơ. Hãy kiểm tra kết nối và chạy migration Supabase.'
      }
    } finally {
      if (currentRevision === revision) profileRequest = undefined
    }
  })()
  profileRequest = { id, promise }
  return promise
}

function init() {
  if (!initialization) initialization = (async () => {
    try {
      if (!supabase) return
      // Keep database requests outside the synchronous Auth event callback.
      supabase.auth.onAuthStateChange((_event, next) => {
        const changed = session.value?.user.id !== next?.user.id
        session.value = next
        if (!next) {
          ++revision
          profile.value = null
          profileRequest = undefined
        } else if (changed) setTimeout(() => { void loadProfile() }, 0)
      })
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      session.value = data.session
      await loadProfile()
    } catch (error) {
      initialization = undefined
      throw error
    } finally { loading.value = false }
  })()
  return initialization
}

async function signIn(email: string, password: string) {
  const { data, error } = await api().auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
  session.value = data.session
  await loadProfile()
}

async function signOut() {
  const { error } = await api().auth.signOut({ scope: 'local' })
  if (error) throw error
  session.value = null
  profile.value = null
  profileRequest = undefined
  ++revision
}

export const auth = {
  session, profile, loading, profileError,
  isAdmin: computed(() => profile.value?.role === 'admin'),
  init, signIn, signOut, loadProfile,
}
