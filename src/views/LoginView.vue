<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from '@lucide/vue'
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
  try { await auth.signIn(email.value, password.value); await router.replace('/account') }
  catch (e) { error.value = errorMessage(e) }
  finally { busy.value = false }
}
</script>

<template>
  <div class="login-layout">
    <section class="login-story">
      <div class="brand light"><span class="brand-mark">a<span>.</span></span> account.</div>
      <div class="story-content"><span class="eyebrow light-eyebrow">ĐƠN GIẢN. AN TOÀN. TRONG TẦM TAY.</span><h1>Một tài khoản.<br />Mọi thứ gọn gàng.</h1><p>Không gian riêng để quản lý thông tin,<br />bảo vệ tài khoản và kiểm soát quyền truy cập.</p><div class="story-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="art-icon"><ShieldCheck :size="66" :stroke-width="1.2" /></div><span class="art-pill"><i></i> Luôn được bảo vệ</span></div></div>
      <span class="story-footer">Được xây dựng với Vue & Supabase</span>
    </section>
    <main class="login-main">
      <div class="login-form-wrap"><span class="icon-tile"><LockKeyhole :size="23" /></span><h2>Chào mừng trở lại</h2><p class="subtitle">Đăng nhập để tiếp tục vào không gian của bạn.</p>
        <div v-if="!isConfigured" class="message setup" role="status"><strong>Thiết lập kết nối</strong><p>Thêm URL và publishable key của Supabase vào tệp <code>.env</code>, chạy migration rồi khởi động lại ứng dụng. Xem hướng dẫn trong README.</p></div>
        <form @submit.prevent="submit">
          <div class="field"><label for="email">Địa chỉ email</label><input id="email" v-model="email" type="email" autocomplete="username" placeholder="ban@example.com" required maxlength="254" /></div>
          <div class="field"><label for="password">Mật khẩu</label><div class="password-input"><input id="password" v-model="password" :type="visible ? 'text' : 'password'" autocomplete="current-password" placeholder="Nhập mật khẩu của bạn" required /><button type="button" :aria-label="visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'" :aria-pressed="visible" @click="visible = !visible"><EyeOff v-if="visible" :size="18" /><Eye v-else :size="18" /></button></div></div>
          <p v-if="error" class="message error" role="alert">{{ error }}</p>
          <button type="submit" class="button primary login-submit" :disabled="busy || !isConfigured">{{ busy ? 'Đang đăng nhập…' : 'Đăng nhập' }}<ArrowRight :size="18" /></button>
        </form>
        <p class="login-help">Chưa có tài khoản hoặc quên mật khẩu?<br /><span>Liên hệ quản trị viên để được hỗ trợ.</span></p>
        <div class="login-security"><ShieldCheck :size="16" />Kết nối an toàn, bảo mật với Supabase Auth</div>
      </div>
    </main>
  </div>
</template>
