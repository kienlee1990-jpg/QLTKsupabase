<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Eye, EyeOff, Headphones, Music2 } from '@lucide/vue'
import { auth } from '../stores/auth'
import { isConfigured } from '../lib/supabase'
import { errorMessage } from '../lib/validation'

const email = ref('')
const password = ref('')
const visible = ref(false)
const busy = ref(false)
const error = ref('')
const router = useRouter()

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await auth.signIn(email.value, password.value)
    const redirect = router.currentRoute.value.query.redirect
    const destination = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
    await router.replace(destination)
  } catch (e) { error.value = errorMessage(e) }
  finally { busy.value = false }
}
</script>

<template>
  <section class="music-auth-card">
    <RouterLink class="music-auth-back" to="/">← <span>Về trang nghe nhạc</span></RouterLink>
    <span class="music-auth-icon"><Headphones :size="22" /></span>
    <span class="music-auth-eyebrow">GÓC RIÊNG CỦA BẠN</span>
    <h2>Chào bạn trở lại</h2>
    <p class="music-auth-intro">Đăng nhập để tiếp tục hành trình âm nhạc.</p>

    <div v-if="!isConfigured" class="message setup" role="status"><strong>Chưa kết nối Supabase</strong><p>Hãy kiểm tra cấu hình kết nối Supabase của website.</p></div>
    <form class="music-auth-form" @submit.prevent="submit">
      <label class="music-auth-field" for="login-email">Địa chỉ email
        <input id="login-email" v-model="email" type="email" autocomplete="username" placeholder="ban@example.com" required maxlength="254" />
      </label>
      <label class="music-auth-field" for="login-password">Mật khẩu
        <span class="music-auth-password"><input id="login-password" v-model="password" :type="visible ? 'text' : 'password'" autocomplete="current-password" placeholder="Nhập mật khẩu của bạn" required /><button type="button" :aria-label="visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'" :aria-pressed="visible" @click="visible = !visible"><EyeOff v-if="visible" :size="18" /><Eye v-else :size="18" /></button></span>
      </label>
      <p v-if="error" class="message error" role="alert">{{ error }}</p>
      <button type="submit" class="music-auth-submit" :disabled="busy || !isConfigured">{{ busy ? 'Đang đăng nhập…' : 'Đăng nhập' }}<ArrowRight :size="17" /></button>
    </form>
    <p class="music-auth-switch">Chưa có tài khoản? <RouterLink to="/register">Tạo tài khoản</RouterLink></p>
    <div class="music-auth-safe"><Music2 :size="15" /> Tài khoản được bảo vệ bởi Supabase</div>
  </section>
</template>
