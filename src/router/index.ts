import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../stores/auth'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import MusicAuthLayout from '../components/MusicAuthLayout.vue'
import AppShell from '../components/AppShell.vue'
import ProfileView from '../views/ProfileView.vue'
import SecurityView from '../views/SecurityView.vue'
import UsersView from '../views/UsersView.vue'
import MusicView from '../music/MusicView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'music', component: MusicView },
    { path: '/login', component: MusicAuthLayout, children: [{ path: '', name: 'login', component: LoginView }] },
    { path: '/register', component: MusicAuthLayout, children: [{ path: '', name: 'register', component: RegisterView }] },
    { path: '/account', component: AppShell, meta: { requiresAuth: true }, children: [
      { path: '', name: 'account', component: ProfileView },
      { path: '/security', name: 'security', component: SecurityView },
      { path: '/users', name: 'users', component: UsersView, meta: { admin: true } },
    ] },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async to => {
  try { await auth.init() } catch { return to.name === 'login' ? true : { name: 'login' } }
  if (to.meta.requiresAuth && !auth.session.value) return { name: 'login' }
  if (to.name === 'login' && auth.session.value) {
    const redirect = typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/') && !to.query.redirect.startsWith('//') ? to.query.redirect : '/account'
    return redirect
  }
  if (to.meta.admin) {
    await auth.loadProfile()
    if (!auth.isAdmin.value) return { name: 'account' }
  }
})
