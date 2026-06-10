// Catálogo curado de música de enfoque + motor de recomendación ligero.
// "Aprende" del gusto del usuario contando reproducciones por género
// (en localStorage) y propone un set que VARÍA en cada refresco,
// ponderado hacia los géneros más escuchados.

export const GENRES = {
  lofi:        { label: 'Lo-fi',      emoji: '🎧', grad: ['#7c3aed', '#c084fc'] },
  jazz:        { label: 'Jazz',       emoji: '🎷', grad: ['#b45309', '#f59e0b'] },
  clasica:     { label: 'Clásica',    emoji: '🎻', grad: ['#0e7490', '#22d3ee'] },
  piano:       { label: 'Piano',      emoji: '🎹', grad: ['#1e3a8a', '#60a5fa'] },
  ambient:     { label: 'Ambient',    emoji: '🌌', grad: ['#4c1d95', '#7c3aed'] },
  naturaleza:  { label: 'Naturaleza', emoji: '🌿', grad: ['#166534', '#4ade80'] },
  synthwave:   { label: 'Synthwave',  emoji: '🌆', grad: ['#be185d', '#f472b6'] },
  electronica: { label: 'Electrónica',emoji: '🎛️', grad: ['#0f766e', '#2dd4bf'] },
}

// Portada con gradiente por género (reemplaza thumbnails poco fiables)
export function generoCover(genero) {
  const g = GENRES[genero]?.grad || ['#534AB7', '#7f77dd']
  return `linear-gradient(135deg, ${g[0]}, ${g[1]})`
}

export const FOCUS_CATALOG = [
  { id: 'cat_lofi1',  nombre: 'Lofi Hip Hop Radio',     url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', genero: 'lofi' },
  { id: 'cat_lofi2',  nombre: '1 A.M Study Session',    url: 'https://www.youtube.com/watch?v=lTRiuFIWV54', genero: 'lofi' },
  { id: 'cat_lofi3',  nombre: 'Coffee Shop Lofi',       url: 'https://www.youtube.com/watch?v=-5KAN9_CzSA', genero: 'lofi' },
  { id: 'cat_synth',  nombre: 'Synthwave Radio',        url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY', genero: 'synthwave' },
  { id: 'cat_jazz1',  nombre: 'Jazz Coffee Shop',       url: 'https://www.youtube.com/watch?v=Dx5qFachd3A', genero: 'jazz' },
  { id: 'cat_jazz2',  nombre: 'Relaxing Jazz Piano',    url: 'https://www.youtube.com/watch?v=neV3EPgvZ3g', genero: 'jazz' },
  { id: 'cat_piano',  nombre: 'Peaceful Piano',         url: 'https://www.youtube.com/watch?v=1RmX7HCmBOQ', genero: 'piano' },
  { id: 'cat_class',  nombre: 'Classical for Focus',    url: 'https://www.youtube.com/watch?v=jgpJVI3tDbY', genero: 'clasica' },
  { id: 'cat_amb',    nombre: 'Deep Focus',             url: 'https://www.youtube.com/watch?v=n61ULEU7CO0', genero: 'ambient' },
  { id: 'cat_rain',   nombre: 'Coding in the Rain',     url: 'https://www.youtube.com/watch?v=mPZkdNFkNps', genero: 'naturaleza' },
  { id: 'cat_nat',    nombre: 'Forest Ambience',        url: 'https://www.youtube.com/watch?v=xNN7iTA57jM', genero: 'naturaleza' },
  { id: 'cat_elec',   nombre: 'Chillstep Focus',        url: 'https://www.youtube.com/watch?v=M5QY2_8704o', genero: 'electronica' },
]

// ── Gusto del usuario (conteo por género) ────────────────────
const TASTE_KEY = 'kairos-music-taste'

export function getTaste() {
  try { return JSON.parse(localStorage.getItem(TASTE_KEY) || '{}') } catch { return {} }
}
export function bumpTaste(genero) {
  if (!genero) return
  const t = getTaste()
  t[genero] = (t[genero] || 0) + 1
  try { localStorage.setItem(TASTE_KEY, JSON.stringify(t)) } catch (_) {}
}

// Top géneros del usuario (para etiquetas tipo "porque te gusta Lo-fi")
export function topGenero() {
  const t = getTaste()
  let best = null, max = 0
  for (const [g, n] of Object.entries(t)) if (n > max) { max = n; best = g }
  return best
}

// ── Recomendación: ponderada por gusto + aleatoriedad (varía) ─
export function recommend(count = 4, excludeId = null) {
  const taste = getTaste()
  return FOCUS_CATALOG
    .filter(t => t.id !== excludeId)
    .map(t => ({ t, w: (taste[t.genero] || 0) * 2 + 1 + Math.random() * 3 }))
    .sort((a, b) => b.w - a.w)
    .slice(0, count)
    .map(s => s.t)
}
