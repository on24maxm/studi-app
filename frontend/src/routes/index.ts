import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import DashboardView from '../views/DashboardView.vue'
import { useAuthStore } from '../stores/authStore.ts';


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: "/login"
    },
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
      meta: { hideNavbar: true, requiresAuth: true }
    },
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !(authStore.isAuthenticated)) {
    next({name: 'login'});
  }
  else {
    next();
  }
})

export default router