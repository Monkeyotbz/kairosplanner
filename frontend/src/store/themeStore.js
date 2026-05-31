import { create } from 'zustand'

const KEY = 'kairos-theme'

function applyTheme(theme) {
  if (!theme || theme === 'nebula') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

// Apply saved theme immediately on module load (before first render)
applyTheme(localStorage.getItem(KEY) || 'nebula')

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem(KEY) || 'nebula',
  setTheme: (theme) => {
    localStorage.setItem(KEY, theme)
    applyTheme(theme)
    set({ theme })
  },
}))

export const THEMES = [
  {
    id:      'nebula',
    name:    'Nebula',
    desc:    'KAIROS original',
    bg:      '#1e1b2e',
    sidebar: '#1a1625',
    accent:  '#534AB7',
  },
  {
    id:      'studio',
    name:    'Studio',
    desc:    'Ableton inspired',
    bg:      '#1C1C1C',
    sidebar: '#141414',
    accent:  '#FF7200',
  },
  {
    id:      'forest',
    name:    'Forest',
    desc:    'Spotify inspired',
    bg:      '#121212',
    sidebar: '#040404',
    accent:  '#1DB954',
  },
  {
    id:      'ocean',
    name:    'Ocean',
    desc:    'Tidal inspired',
    bg:      '#080808',
    sidebar: '#030303',
    accent:  '#00C6E8',
  },
  {
    id:      'snow',
    name:    'Snow',
    desc:    'Light & minimal',
    bg:      '#F0F0F5',
    sidebar: '#FFFFFF',
    accent:  '#534AB7',
  },
]
