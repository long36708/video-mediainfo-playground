import { createRouter, createWebHistory } from 'vue-router'
import MediaInfoTest from '@/views/MediaInfoTest.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'MediaInfoTest',
      component: MediaInfoTest,
    },
  ],
})

export default router
