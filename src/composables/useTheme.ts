import { ref, readonly } from 'vue'

const STORAGE_KEY = 'matchx_theme'
const isDark = ref(true)

const applyTheme = (dark: boolean) => {
  document.documentElement.classList.toggle('light', !dark)
  isDark.value = dark
  localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
}

export const initTheme = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  // Default: dark. Light solo si el usuario lo eligió explícitamente.
  applyTheme(saved !== 'light')
}

export const useTheme = () => {
  const toggle = () => applyTheme(!isDark.value)

  return {
    isDark: readonly(isDark),
    toggle,
  }
}
