import { fitsInterest } from './search'

const HOUR = 3600 * 1000
// How much each vibe counts towards a pick when it was posted in the last few hours.
const LIVE = { lit: 6, busy: 4, chill: 3, dead: 0 }
const QUIET_INTERESTS = ['coffee', 'parks', 'sea']

// Picks a place for tonight. Places that fit the chosen interests and have a
// good vibe right now are most likely, favourites get a nudge, and there's
// always some chance so "Try another" gives something new.
export function pickSurprise({ venues, latest, interests, favourites, skip }) {
  const wantsQuiet = interests.length && interests.every((k) => QUIET_INTERESTS.includes(k))
  const pool = venues
    .filter((v) => !skip.includes(v.id))
    .map((v) => {
      const p = latest[v.id]
      const matched = interests.filter((k) => fitsInterest(v, p, k))
      if (interests.length && !matched.length) return null
      const fresh = p && Date.now() - new Date(p.createdAt).getTime() < 4 * HOUR
      let weight = 1
      if (fresh) weight += wantsQuiet && p.vibe === 'chill' ? 6 : LIVE[p.vibe] ?? 1
      if (favourites.has(v.id)) weight += 2
      weight += matched.length
      return { v, p: fresh ? p : null, matched, weight }
    })
    .filter(Boolean)
  if (!pool.length) return null
  let r = Math.random() * pool.reduce((s, x) => s + x.weight, 0)
  return pool.find((x) => (r -= x.weight) < 0) || pool[pool.length - 1]
}
