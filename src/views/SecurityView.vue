<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Eye, EyeOff, KeyRound, ShieldCheck } from '@lucide/vue'
import { api } from '../lib/supabase'
import { auth } from '../stores/auth'
import { errorMessage, passwordError } from '../lib/validation'

const current = ref('')
const password = ref('')
const confirmation = ref('')
const visible = ref(false)
const busy = ref(false)
const error = ref('')
const success = ref('')
const requirements = computed(() => [
  { label: 'Ít nhất 8 ký tự', met: password.value.length >= 8 },
  { label: 'Bao gồm cả chữ và số', met: /[a-zA-Z]/.test(password.value) && /[0-9]/.test(password.value) },
  { label: 'Mật khẩu xác nhận trùng khớp', met: Boolean(password.value) && password.value === confirmation.value },
])
async function changePassword() {
  error.value = ''; success.value = ''
  const validation = passwordError(password.value, confirmation.value)
  if (validation) { error.value = validation; return }
  if (current.value === password.value) { error.value = 'Mật khẩu mới phải khác mật khẩu hiện tại.'; return }
  const email = auth.session.value?.user.email
  if (!email) { error.value = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'; return }
  busy.value = true
  try {
    const { error: verifyError } = await api().auth.signInWithPassword({ email, password: current.value })
    if (verifyError) throw verifyError
    const { error: updateError } = await api().auth.updateUser({ password: password.value })
    if (updateError) throw updateError
    current.value = ''; password.value = ''; confirmation.value = ''
    success.value = 'Đã đổi mật khẩu thành công. Hãy sử dụng mật khẩu mới cho lần đăng nhập tiếp theo.'
  } catch (e) { error.value = errorMessage(e) }
  finally { busy.value = false }
}
</script>

<template>
  <div class="page-heading"><div><span class="eyebrow">CÀI ĐẶT TÀI KHOẢN</span><h1>Mật khẩu & bảo mật<span class="heading-dot">.</span></h1><p>Chủ động bảo vệ quyền truy cập vào tài khoản của bạn.</p></div><span class="page-tag"><ShieldCheck :size="15" />Bảo mật</span></div>
  <div class="content-grid"><section class="card"><div class="card-heading"><span class="icon-tile"><KeyRound :size="20" /></span><div><h2>Đổi mật khẩu</h2><p>Chọn một mật khẩu mới, mạnh và dễ nhớ với bạn.</p></div></div><form @submit.prevent="changePassword"><div class="card-body"><div class="field"><label for="current-password">Mật khẩu hiện tại</label><input id="current-password" v-model="current" type="password" autocomplete="current-password" required placeholder="Nhập mật khẩu hiện tại" /></div><div class="field"><label for="new-password">Mật khẩu mới</label><div class="password-input"><input id="new-password" v-model="password" :type="visible ? 'text' : 'password'" autocomplete="new-password" required minlength="8" placeholder="Tạo mật khẩu mới" /><button type="button" :aria-label="visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'" :aria-pressed="visible" @click="visible = !visible"><EyeOff v-if="visible" :size="18" /><Eye v-else :size="18" /></button></div></div><div class="field"><label for="confirm-password">Xác nhận mật khẩu mới</label><input id="confirm-password" v-model="confirmation" :type="visible ? 'text' : 'password'" autocomplete="new-password" required placeholder="Nhập lại mật khẩu mới" /></div><p v-if="error" class="message error" role="alert">{{ error }}</p><p v-if="success" class="message success" role="status">{{ success }}</p></div><div class="card-footer"><span>Không chia sẻ mật khẩu với người khác.</span><button class="button primary" :disabled="busy">{{ busy ? 'Đang cập nhật…' : 'Cập nhật mật khẩu' }}</button></div></form></section><aside class="detail-stack"><section class="card"><div class="compact-heading"><h2>Mật khẩu an toàn</h2></div><div class="card-body"><p class="muted">Mật khẩu mới của bạn cần đáp ứng:</p><ul class="requirements"><li v-for="item in requirements" :key="item.label" :class="{ met: item.met }"><Check :size="16" />{{ item.label }}</li></ul></div></section><section class="tip-card"><ShieldCheck :size="24" /><h3>Mỗi tài khoản, một mật khẩu</h3><p>Tránh sử dụng lại mật khẩu từ các dịch vụ khác. Trình quản lý mật khẩu có thể giúp bạn ghi nhớ an toàn.</p></section></aside></div>
</template>
