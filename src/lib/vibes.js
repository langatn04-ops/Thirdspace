import { VIBES } from './util'

// A place's vibe only counts posts from the last 90 minutes, so the map shows
// what it's like right now, not what it was like earlier.
export const FRESH_MS = 90 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

export const VIBE_EMOJI = { lit: '🔥', busy: '👥', chill: '😌', dead: '💤' }
export const STALE_COLOR = '#aeaeb2'

const age = (p, now) => now - new Date(p.createdAt).getTime()
export const isFresh = (p, now = Date.now()) => !!p && age(p, now) < FRESH_MS

// For each place: its vibe now (the most common in the last 90 minutes, with
// the newest post deciding a tie), how many posts it had in the last hour,
// and its newest post. Places whose newest post is older are "stale".
export function placeVibes(posts, now = Date.now()) {
  const out = {}
  // Posts arrive newest first.
  for (const p of posts) {
    const s = (out[p.venueId] ||= { latest: p, counts: {}, lastHour: 0, live: false, vibe: null })
    if (age(p, now) < FRESH_MS) {
      s.live = true
      s.counts[p.vibe] = (s.counts[p.vibe] || 0) + 1
      if (!s.vibe || s.counts[p.vibe] > s.counts[s.vibe]) s.vibe = p.vibe
    }
    if (age(p, now) < HOUR_MS) s.lastHour += 1
  }
  return out
}

function hoursAgo(iso, now) {
  const mins = Math.max(1, Math.round((now - new Date(iso).getTime()) / 60000))
  if (mins < 90) return `${mins} min ago`
  const h = Math.round(mins / 60)
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}

// What to show for a place, e.g. "🔥 Lit · 5 posts in the last hour" or
// "Last update 3h ago". Colour is grey when the vibe is stale.
export function vibeSummary(s, now = Date.now()) {
  if (!s) return { text: 'No posts yet', color: STALE_COLOR, live: false }
  if (!s.live) return { text: `Last update ${hoursAgo(s.latest.createdAt, now)}`, color: STALE_COLOR, live: false }
  const proof = s.lastHour
    ? `${s.lastHour} ${s.lastHour === 1 ? 'post' : 'posts'} in the last hour`
    : `posted ${hoursAgo(s.latest.createdAt, now)}`
  return { text: `${VIBE_EMOJI[s.vibe]} ${VIBES[s.vibe].label} · ${proof}`, color: VIBES[s.vibe].color, live: true }
}
