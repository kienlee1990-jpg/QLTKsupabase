<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RefreshCw, Search, ShieldCheck, UsersRound, X } from '@lucide/vue'
import { listAccounts, setRole, type Profile, type Role } from '../services/accounts'
import { auth } from '../stores/auth'
import { errorMessage } from '../lib/validation'

const accounts = ref<Profile[]>([])
const loading = ref(true)
const error = ref('')
const success = ref('')
const query = ref('')
const filter = ref('all')
const pending = ref<{ user: Profile; role: Role } | null>(null)
const saving = ref(false)
const dialog = ref<HTMLDialogElement | null>(null)
watch(pending, async value => {
  await nextTick()
  if (value) dialog.value?.showModal()
  else dialog.value?.close()
})
const filtered = computed(() => accounts.value.filter(user => (filter.value === 'all' || user.role === filter.value) && `${user.full_name} ${user.email}`.toLocaleLowerCase('vi').includes(query.value.trim().toLocaleLowerCase('vi'))))
const adminCount = computed(() => accounts.value.filter(user => user.role === 'admin').length)
async function load() {
  loading.value = true; error.value = ''
  try { accounts.value = await listAccounts() }
  catch (e) { error.value = errorMessage(e) }
  finally { loading.value = false }
}
function requestRole(user: Profile, event: Event) {
  const select = event.target as HTMLSelectElement
  const role = select.value as Role
  select.value = user.role
  if (role !== user.role) pending.value = { user, role }
}
async function confirmRole() {
  if (!pending.value) return
  saving.value = true; error.value = ''; success.value = ''
  try {
    await setRole(pending.value.user.id, pending.value.role)
    pending.value = null
    success.value = 'Đã cập nhật quyền truy cập.'
    await load()
  } catch (e) { error.value = errorMessage(e); pending.value = null }
  finally { saving.value = false }
}
onMounted(load)
</script>

<template>
  <div class="page-heading"><div><span class="eyebrow">QUẢN TRỊ HỆ THỐNG</span><h1>Quản lý người dùng<span class="heading-dot">.</span></h1><p>Quản lý thành viên và quyền truy cập trong cùng một nơi.</p></div><span class="page-tag"><ShieldCheck :size="15" />Dành cho quản trị viên</span></div>
  <div class="stats-grid"><div class="stat-card"><span class="icon-tile"><UsersRound :size="21" /></span><div><small>Tổng người dùng</small><strong>{{ loading ? '—' : accounts.length }}</strong></div></div><div class="stat-card"><span class="icon-tile"><ShieldCheck :size="21" /></span><div><small>Quản trị viên</small><strong>{{ loading ? '—' : adminCount }}</strong></div></div><div class="stat-card"><span class="icon-tile neutral"><UsersRound :size="21" /></span><div><small>Người dùng</small><strong>{{ loading ? '—' : accounts.length - adminCount }}</strong></div></div></div>
  <p v-if="error" class="message error" role="alert">{{ error }}</p><p v-if="success" class="message success" role="status">{{ success }}</p>
  <section class="card users-card"><div class="users-toolbar"><div><h2>Danh sách tài khoản</h2><p>Phân quyền truy cập cho từng thành viên.</p></div><button class="button secondary" :disabled="loading" @click="load"><RefreshCw :size="15" />Làm mới</button></div><div class="table-filters"><div class="search-input"><Search :size="18" /><input v-model="query" type="search" aria-label="Tìm người dùng" placeholder="Tìm theo tên hoặc email…" /></div><select v-model="filter" aria-label="Lọc theo vai trò"><option value="all">Tất cả vai trò</option><option value="admin">Quản trị viên</option><option value="user">Người dùng</option></select></div><div class="table-scroll"><table><thead><tr><th>NGƯỜI DÙNG</th><th>VAI TRÒ</th><th>NGÀY THAM GIA</th><th>PHÂN QUYỀN</th></tr></thead><tbody><tr v-if="loading"><td colspan="4" class="empty-state">Đang tải danh sách tài khoản…</td></tr><tr v-else-if="!filtered.length"><td colspan="4" class="empty-state">{{ error ? 'Không tải được dữ liệu. Vui lòng thử lại.' : 'Không tìm thấy tài khoản phù hợp.' }}</td></tr><tr v-for="user in loading ? [] : filtered" :key="user.id"><td><div class="table-person"><span class="avatar small">{{ (user.full_name || user.email).slice(0, 2).toUpperCase() }}</span><div><strong>{{ user.full_name || 'Chưa đặt tên' }}<span v-if="user.id === auth.session.value?.user.id" class="you-tag">Bạn</span></strong><small>{{ user.email }}</small></div></div></td><td><span class="role-pill" :class="{ 'user-role': user.role === 'user' }">{{ user.role === 'admin' ? 'Quản trị viên' : 'Người dùng' }}</span></td><td class="muted">{{ new Date(user.created_at).toLocaleDateString('vi-VN') }}</td><td><select :value="user.role" :disabled="saving || user.id === auth.session.value?.user.id" :aria-label="'Đổi vai trò của ' + user.email" @change="requestRole(user, $event)"><option value="admin">Quản trị viên</option><option value="user">Người dùng</option></select></td></tr></tbody></table></div><div class="table-footer">Hiển thị {{ filtered.length }} / {{ accounts.length }} tài khoản<span>Tạo tài khoản tại Supabase → Authentication → Users.</span></div></section>
  <dialog ref="dialog" class="modal" aria-labelledby="role-dialog-title" @cancel.prevent="!saving && (pending = null)"><template v-if="pending"><button class="modal-close" :disabled="saving" aria-label="Đóng" @click="pending = null"><X :size="20" /></button><span class="icon-tile"><ShieldCheck :size="24" /></span><h2 id="role-dialog-title">Thay đổi quyền truy cập?</h2><p>Bạn đang chuyển <strong>{{ pending.user.email }}</strong> sang vai trò <strong>{{ pending.role === 'admin' ? 'Quản trị viên' : 'Người dùng' }}</strong>.</p><p v-if="pending.role === 'admin'" class="muted">Quản trị viên có thể xem toàn bộ người dùng và thay đổi quyền của họ.</p><div class="actions"><button class="button secondary" :disabled="saving" @click="pending = null">Hủy</button><button class="button primary" :disabled="saving" @click="confirmRole">{{ saving ? 'Đang lưu…' : 'Xác nhận thay đổi' }}</button></div></template></dialog>
</template>
