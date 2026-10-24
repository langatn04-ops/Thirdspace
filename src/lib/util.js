export const VIBES = {
  lit: { label: 'Lit', color: '#ff3b30' },
  busy: { label: 'Busy', color: '#ff9f0a' },
  chill: { label: 'Chill', color: '#27a89a' },
  dead: { label: 'Dead', color: '#8e8e93' },
}

// The database has used "quiet" for what the app now calls "dead".
export function normVibe(v) {
  v = String(v || '').toLowerCase()
  if (v === 'quiet') return 'dead'
  return VIBES[v] ? v : 'chill'
}

export function categoryIcon(cat) {
  const c = String(cat || '').toLowerCase()
  if (/comedy/.test(c)) return '🎤'
  if (/tourist|landmark|museum|attraction|culture/.test(c)) return '🏛️'
  if (/bar|pub/.test(c)) return '🍺'
  if (/park|outdoor|garden|beach|pier/.test(c)) return '🌲'
  if (/restaurant|food|cafe|café/.test(c)) return '🍽️'
  if (/event|music|venue|club|street|perform/.test(c)) return '🎵'
  return '📍'
}

const PALETTES = [
  ['#ff2d55', '#7a1fa2', '#1a0b2e'], ['#ffd27a', '#2f8f6b', '#0f3d2e'], ['#ffb347', '#d6336c', '#3b1330'],
  ['#ff9a3c', '#8a2b0f', '#2a0c05'], ['#cfe8a8', '#4f7d4b', '#16301f'], ['#e8b4a0', '#9c3d2e', '#2b0f0c'],
  ['#6a5cff', '#e0338f', '#120a33'], ['#ffb199', '#4b79a1', '#0e2238'], ['#f7d070', '#e4572e', '#34130b'],
  ['#d9c2a0', '#7b5b3a', '#241a10'], ['#00c2a8', '#ff6f91', '#1b1030'],
]
export function palette(seed) {
  let h = 0
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTES[h % PALETTES.length]
}

// Colour stand-in for a photo, used for sample posts and while media loads.
export function backdrop(c) {
  return {
    backgroundImage: `radial-gradient(at 25% 15%,${c[0]},transparent 62%),radial-gradient(at 85% 85%,${c[1]},transparent 60%)`,
    backgroundColor: c[2],
  }
}

const RATIOS = ['4/5', '1/1', '3/4', '4/6', '5/4', '3/4']
export const ratioFor = (i) => RATIOS[i % RATIOS.length]

export function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`
  return `${Math.floor(s / 86400)} d ago`
}

export const stars = (r) => '★★★★★'.slice(0, r) + '☆☆☆☆☆'.slice(0, 5 - r)
export const verdict = (r) => (r >= 4 ? 'Worth it' : r === 3 ? 'Fine' : 'Not great')
