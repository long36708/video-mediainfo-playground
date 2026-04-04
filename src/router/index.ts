import { createRouter, createWebHistory } from 'vue-router'
import MediaInfoTest from '@/views/MediaInfoTest.vue'
import MediaInfoKitTest from '@/views/MediaInfoKitTest.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'MediaInfoTest',
      component: MediaInfoTest,
    },
    {
      path: '/kit',
      name: 'MediaInfoKitTest',
      component: MediaInfoKitTest,
    },
  ],
})

export default router
