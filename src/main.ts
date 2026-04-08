import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { initTheme } from './composables/useTheme'
import { startMockServer } from './mocks'

initTheme()

startMockServer().then(() => {
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
})
