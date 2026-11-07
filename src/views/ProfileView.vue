<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowUpRight, CalendarDays, Check, Mail, ShieldCheck, UserRound } from '@lucide/vue'
import { auth } from '../stores/auth'
import { updateName } from '../services/accounts'
import { errorMessage } from '../lib/validation'

const { profile, session, isAdmin } = auth
const name = ref('')
const busy = ref(false)
const error = ref('')
const success = ref('')
watch(profile, value => { name.value = value?.full_name || '' }, { immediate: true })
const joined = computed(() => {
  const date = profile.value?.created_at || session.value?.user.created_at
  return date ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date)) : '—'
})
async function save() {
  error.value = ''; success.value = ''
  if (!name.value.trim()) { error.value = 'Vui lòng nhập họ và tên.'; return }
  if (!profile.value) { error.value = 'Chưa tải được hồ sơ tài khoản.'; return }
  busy.value = true
  try { profile.value = await updateName(profile.value.id, name.value); success.value = 'Đã lưu thông tin tài khoản.' }
  catch (e) { error.value = errorMessage(e) }
  finally { busy.value = false }
}
function reset() { name.value = profile.value?.full_name || ''; error.value = ''; success.value = '' }
</script>

<template>
  <div class="page-heading"><div><span class="eyebrow">CÀI ĐẶT TÀI KHOẢN</span><h1>Tài khoản của tôi<span class="heading-dot">.</span></h1><p>Thông tin cá nhân và mọi điều thuộc về bạn.</p></div><span class="page-tag"><UserRound :size="15" />Hồ sơ cá nhân</span></div>
  <div class="profile-banner"><div class="banner-decoration" aria-hidden="true"></div><span class="avatar large">{{ (profile?.full_name || session?.user.email || 'A').slice(0, 2).toUpperCase() }}</span><div class="banner-identity"><h2>{{ profile?.full_name || 'Tài khoản của bạn' }}</h2><p>{{ session?.user.email }}</p><span class="role-pill"><ShieldCheck :size="13" />{{ isAdmin ? 'Quản trị viên' : 'Người dùng' }}</span></div><span class="banner-status"><span></span> Tài khoản đang hoạt động</span></div>
  <div class="content-grid">
    <section class="card profile-card"><div class="card-heading"><span class="icon-tile"><UserRound :size="20" /></span><div><h2>Thông tin cá nhân</h2><p>Cập nhật thông tin hiển thị của bạn.</p></div></div>
      <form @submit.prevent="save"><div class="card-body"><div class="field"><label for="full-name">Họ và tên <span class="required">*</span></label><input id="full-name" v-model="name" placeholder="Nhập họ và tên" autocomplete="name" maxlength="100" required :disabled="!profile" /></div><div class="field"><label for="profile-email">Địa chỉ email <span class="label-note">Chỉ đọc</span></label><div class="input-with-icon"><Mail :size="17" /><input id="profile-email" :value="session?.user.email" type="email" disabled /></div><small class="field-help">Email được sử dụng để đăng nhập vào hệ thống.</small></div><div class="field"><label for="profile-role">Vai trò</label><div class="input-with-icon"><ShieldCheck :size="17" /><input id="profile-role" :value="isAdmin ? 'Quản trị viên' : 'Người dùng'" disabled /></div><small class="field-help">Vai trò được cấp bởi quản trị viên hệ thống.</small></div><p v-if="error" class="message error" role="alert">{{ error }}</p><p v-if="success" class="message success" role="status"><Check :size="16" />{{ success }}</p></div><div class="card-footer"><span>Giữ thông tin của bạn luôn chính xác.</span><div class="actions"><button class="button secondary" type="button" :disabled="busy" @click="reset">Hủy thay đổi</button><button class="button primary" :disabled="busy || !profile">{{ busy ? 'Đang lưu…' : 'Lưu thay đổi' }}</button></div></div></form>
    </section>
    <aside class="detail-stack"><section class="card"><div class="compact-heading"><h2>Thông tin tài khoản</h2></div><div class="account-details"><div><span class="detail-icon"><CalendarDays :size="18" /></span><div><small>Ngày tham gia</small><strong>{{ joined }}</strong></div></div><div><span class="detail-icon"><ShieldCheck :size="18" /></span><div><small>Phương thức đăng nhập</small><strong>Email & mật khẩu</strong></div></div></div><div class="account-id"><small>MÃ TÀI KHOẢN</small><code>{{ session?.user.id || '—' }}</code></div></section><section class="tip-card"><span class="icon-tile"><ShieldCheck :size="22" /></span><h3>Bảo mật bắt đầu từ bạn</h3><p>Sử dụng mật khẩu mạnh và cập nhật thường xuyên để giữ tài khoản luôn an toàn.</p><RouterLink to="/security">Quản lý mật khẩu <ArrowUpRight :size="16" /></RouterLink></section></aside>
  </div>
</template>
