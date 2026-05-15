import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import ArtistView from '@/views/ArtistView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/artists', name: 'artists', component: ArtistView },
    {
      path: '/sessions',
      name: 'sessions',
      component: () => import('@/views/SessionView.vue'),
    },
  ],
})

export default router
