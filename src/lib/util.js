export const VIBES = {
  lit: { label: 'Lit', color: '#e5533d' },
  busy: { label: 'Busy', color: '#e6a23c' },
  chill: { label: 'Chill', color: '#7fc4a8' },
  dead: { label: 'Dead', color: '#a39a86' },
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
  ['#e5533d', '#7a2a1c', '#1a0f0b'], ['#ffd27a', '#2f8f6b', '#0f3d2e'], ['#ffb347', '#b8452f', '#2b130c'],
  ['#ff9a3c', '#8a2b0f', '#2a0c05'], ['#cfe8a8', '#4f7d4b', '#16301f'], ['#e8b4a0', '#9c3d2e', '#2b0f0c'],
  ['#d9a441', '#8a3b24', '#16100a'], ['#f0b47a', '#2f6b56', '#0c1f19'], ['#f7d070', '#e4572e', '#34130b'],
  ['#d9c2a0', '#7b5b3a', '#241a10'], ['#7fc4a8', '#c4553f', '#10261f'],
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
