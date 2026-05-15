import { createRouter, createWebHistory } from 'vue-router'
import ArtistView from '@/views/ArtistView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/sessions' },
    { path: '/artists', name: 'artists', component: ArtistView },
    {
      path: '/sessions',
      name: 'sessions',
      component: () => import('@/views/SessionView.vue'),
    },
    {
      path: '/booths',
      name: 'booths',
      component: () => import('@/views/BoothsView.vue'),
    },
    {
      path: '/stages',
      name: 'stages',
      component: () => import('@/views/StagesView.vue'),
    },
  ],
})

export default router
