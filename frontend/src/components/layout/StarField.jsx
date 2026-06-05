import { useEffect, useRef } from 'react'
import { useThemeStore } from '../../store/themeStore'
import styles from './StarField.module.css'

const STARS_DESKTOP = 220
const STARS_MOBILE  = 120

// Nebula accent colors per theme
const NEBULA_PALETTES = {
  nebula:  [
    { cx: 0.28, cy: 0.42, r: 0.52, c: 'rgba(83, 74, 183, 0.22)' },
    { cx: 0.72, cy: 0.22, r: 0.40, c: 'rgba(40, 100, 220, 0.16)' },
    { cx: 0.52, cy: 0.72, r: 0.34, c: 'rgba(180, 50, 130, 0.11)' },
    { cx: 0.88, cy: 0.68, r: 0.28, c: 'rgba(50, 170, 220, 0.09)' },
    { cx: 0.12, cy: 0.78, r: 0.26, c: 'rgba(120, 80, 200, 0.12)' },
  ],
  studio:  [
    { cx: 0.30, cy: 0.50, r: 0.50, c: 'rgba(80, 80, 80, 0.20)' },
    { cx: 0.70, cy: 0.30, r: 0.40, c: 'rgba(255, 114, 0, 0.08)' },
    { cx: 0.55, cy: 0.75, r: 0.30, c: 'rgba(60, 60, 80, 0.14)' },
  ],
  forest:  [
    { cx: 0.30, cy: 0.45, r: 0.48, c: 'rgba(20, 80, 40, 0.20)' },
    { cx: 0.70, cy: 0.25, r: 0.38, c: 'rgba(29, 185, 84, 0.07)' },
    { cx: 0.55, cy: 0.75, r: 0.30, c: 'rgba(10, 50, 30, 0.18)' },
  ],
  ocean:   [
    { cx: 0.30, cy: 0.45, r: 0.50, c: 'rgba(0, 80, 120, 0.22)' },
    { cx: 0.70, cy: 0.25, r: 0.38, c: 'rgba(0, 198, 232, 0.08)' },
    { cx: 0.55, cy: 0.75, r: 0.32, c: 'rgba(0, 50, 100, 0.18)' },
  ],
}

const BASE_GRADIENTS = {
  nebula: ['#120f2e', '#060411'],
  studio: ['#111111', '#080808'],
  forest: ['#0a0f0a', '#050805'],
  ocean:  ['#060a10', '#020408'],
}

export default function StarField({ theme: forcedTheme }) {
  const storeTheme = useThemeStore(s => s.theme)
  const theme = forcedTheme ?? storeTheme
  const canvasRef = useRef(null)

  useEffect(() => {
    if (theme === 'snow') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let stars = []

    function init() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      const count = window.innerWidth < 768 ? STARS_MOBILE : STARS_DESKTOP
      stars = Array.from({ length: count }, (_, i) => ({
        x:     Math.random() * canvas.width,
        y:     Math.random() * canvas.height,
        r:     i < 8  ? Math.random() * 1.8 + 1.2 :
               i < 50 ? Math.random() * 0.9 + 0.5 :
                        Math.random() * 0.5 + 0.2,
        base:  Math.random() * 0.35 + 0.35,
        amp:   Math.random() * 0.28 + 0.08,
        phase: Math.random() * Math.PI * 2,
        freq:  Math.random() * 0.5 + 0.2,
        blue:  Math.random() < 0.25,
      }))
    }

    function draw(t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Deep space base
      const [c0, c1] = BASE_GRADIENTS[theme] ?? BASE_GRADIENTS.nebula
      const gBase = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * 0.5, 0,
        canvas.width * 0.5, canvas.height * 0.5, Math.max(canvas.width, canvas.height) * 0.8
      )
      gBase.addColorStop(0, c0)
      gBase.addColorStop(1, c1)
      ctx.fillStyle = gBase
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Nebula clouds
      const nebulae = NEBULA_PALETTES[theme] ?? NEBULA_PALETTES.nebula
      nebulae.forEach(({ cx, cy, r, c }) => {
        const x = canvas.width * cx
        const y = canvas.height * cy
        const g = ctx.createRadialGradient(x, y, 0, x, y, canvas.width * r)
        g.addColorStop(0, c)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      })

      // Stars
      const ts = t * 0.001
      stars.forEach(s => {
        const alpha = Math.max(0, Math.min(1, s.base + Math.sin(ts * s.freq + s.phase) * s.amp))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = s.blue
          ? `rgba(180, 210, 255, ${alpha})`
          : `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }

    init()
    window.addEventListener('resize', init)
    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', init)
    }
  }, [theme])

  if (theme === 'snow') return null
  return <canvas ref={canvasRef} className={styles.canvas} />
}
