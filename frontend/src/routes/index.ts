import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView
      ,
      meta: { hideNavbar: false }
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView
      ,
      meta: { hideNavbar: false }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { hideNavbar: true }
    },
  ]
})

export default router