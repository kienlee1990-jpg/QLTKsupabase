<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Check, Eye, EyeOff, MailCheck, UserRound } from '@lucide/vue'
import { auth } from '../stores/auth'
import { isConfigured } from '../lib/supabase'
import { errorMessage, passwordError } from '../lib/validation'

const fullName = ref('')
const email = ref('')
const password = ref('')
const confirmation = ref('')
const visible = ref(false)
const busy = ref(false)
const error = ref('')
const success = ref(false)
const router = useRouter()

async function submit() {
  error.value = ''
  success.value = false
  if (fullName.value.trim().length < 2 || fullName.value.trim().length > 100) {
    error.value = 'Tên hiển thị cần từ 2 đến 100 ký tự.'
    return
  }
  const passwordProblem = passwordError(password.value, confirmation.value)
  if (passwordProblem) { error.value = passwordProblem; return }

  busy.value = true
  try {
    const result = await auth.signUp(email.value, password.value, fullName.value)
    if (result.confirmationRequired) success.value = true
    else await router.replace('/')
  } catch (e) { error.value = errorMessage(e) }
  finally { busy.value = false }
}
</script>

<template>
  <section class="music-auth-card music-register-card">
    <RouterLink class="music-auth-back" to="/">← <span>Về trang nghe nhạc</span></RouterLink>
    <span class="music-auth-icon"><UserRound :size="22" /></span>
    <span class="music-auth-eyebrow">BẮT ĐẦU HÀNH TRÌNH</span>
    <h2>Tạo tài khoản mới</h2>
    <p class="music-auth-intro">Lưu những giai điệu thân quen vào thư viện của bạn.</p>

    <div v-if="!isConfigured" class="message setup" role="status"><strong>Chưa kết nối Supabase</strong><p>Hãy kiểm tra cấu hình kết nối Supabase của website.</p></div>
    <div v-if="success" class="music-auth-success" role="status"><MailCheck :size="20" /><span><b>Kiểm tra hộp thư của bạn</b><small>Nhấn liên kết xác nhận trong email để hoàn tất đăng ký.</small></span></div>

    <form class="music-auth-form" @submit.prevent="submit">
      <label class="music-auth-field" for="register-name">Tên hiển thị
        <input id="register-name" v-model="fullName" type="text" autocomplete="name" placeholder="Tên của bạn" required minlength="2" maxlength="100" />
      </label>
      <label class="music-auth-field" for="register-email">Địa chỉ email
        <input id="register-email" v-model="email" type="email" autocomplete="email" placeholder="ban@example.com" required maxlength="254" />
      </label>
      <label class="music-auth-field" for="register-password">Mật khẩu
        <span class="music-auth-password"><input id="register-password" v-model="password" :type="visible ? 'text' : 'password'" autocomplete="new-password" placeholder="Ít nhất 8 ký tự, gồm chữ và số" required minlength="8" /><button type="button" :aria-label="visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'" :aria-pressed="visible" @click="visible = !visible"><EyeOff v-if="visible" :size="18" /><Eye v-else :size="18" /></button></span>
      </label>
      <label class="music-auth-field" for="register-confirm">Nhập lại mật khẩu
        <input id="register-confirm" v-model="confirmation" type="password" autocomplete="new-password" placeholder="Nhập lại mật khẩu" required minlength="8" />
      </label>
      <p v-if="error" class="message error" role="alert">{{ error }}</p>
      <button type="submit" class="music-auth-submit" :disabled="busy || !isConfigured">{{ busy ? 'Đang tạo tài khoản…' : 'Tạo tài khoản' }}<ArrowRight :size="17" /></button>
    </form>
    <p class="music-auth-switch">Đã có tài khoản? <RouterLink to="/login">Đăng nhập</RouterLink></p>
    <div class="music-auth-safe"><Check :size="15" /> Tài khoản mới mặc định là người nghe</div>
  </section>
</template>
