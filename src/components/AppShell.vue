<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowUpRight, ChevronRight, KeyRound, LayoutGrid, LogOut, ShieldCheck, UserRound, UsersRound } from '@lucide/vue'
import { auth } from '../stores/auth'
import { errorMessage } from '../lib/validation'

const router = useRouter()
const { profile, session, isAdmin, profileError } = auth
const leaving = ref(false)
const error = ref('')
const initials = computed(() => (profile.value?.full_name || session.value?.user.email || 'A').slice(0, 2).toUpperCase())
async function logout() {
  leaving.value = true
  error.value = ''
  try { await auth.signOut(); await router.replace('/login') }
  catch (e) { error.value = errorMessage(e) }
  finally { leaving.value = false }
}
</script>

<template>
  <div class="app-layout">
    <aside class="sidebar">
      <RouterLink class="brand" to="/account"><span class="brand-mark">a<span>.</span></span> account<span class="brand-dot">.</span></RouterLink>
      <div class="workspace"><span class="workspace-icon"><LayoutGrid :size="18" /></span><div><strong>Không gian cá nhân</strong><small>Quản lý tài khoản</small></div><ChevronRight :size="15" /></div>
      <p class="nav-label">KHÔNG GIAN LÀM VIỆC</p>
      <nav aria-label="Điều hướng chính">
        <RouterLink to="/account"><UserRound :size="19" />Tài khoản của tôi</RouterLink>
        <RouterLink to="/security"><KeyRound :size="19" />Mật khẩu & bảo mật</RouterLink>
        <RouterLink v-if="isAdmin" to="/users"><UsersRound :size="19" />Quản lý người dùng<span class="nav-badge">Admin</span></RouterLink>
      </nav>
      <div class="sidebar-bottom">
        <div class="security-note"><ShieldCheck :size="21" /><strong>An tâm trong từng kết nối</strong><p>Tài khoản và quyền truy cập của bạn được bảo vệ bởi Supabase.</p><a href="https://supabase.com/docs/guides/auth" target="_blank" rel="noopener noreferrer">Tìm hiểu thêm <ArrowUpRight :size="14" /></a></div>
        <button class="logout" :disabled="leaving" @click="logout"><LogOut :size="18" />{{ leaving ? 'Đang đăng xuất…' : 'Đăng xuất' }}</button>
        <p v-if="error" class="message error" role="alert">{{ error }}</p>
      </div>
    </aside>
    <div class="main-area">
      <header class="topbar"><div class="breadcrumb">Không gian làm việc <ChevronRight :size="14" /><span>Cài đặt tài khoản</span></div><div class="header-user"><span class="connection"><i></i>Đã kết nối</span><span class="avatar small">{{ initials }}</span></div></header>
      <main>
        <div v-if="profileError" class="message error" role="alert">{{ profileError }} <button class="text-button" @click="auth.loadProfile">Thử lại</button></div>
        <RouterView />
      </main>
      <footer><span>© {{ new Date().getFullYear() }} Account. Một nơi cho tài khoản của bạn.</span><span><span class="footer-dot"></span> Powered by Supabase</span></footer>
    </div>
  </div>
</template>
