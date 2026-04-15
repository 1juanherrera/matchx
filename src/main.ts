import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { initTheme } from './composables/useTheme'
import { startMockServer } from './mocks'
import { registerIcons } from './plugins/icons'

initTheme()

startMockServer().then(() => {
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  registerIcons(app)
  app.mount('#app')
})
