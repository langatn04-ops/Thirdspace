// Finding places by name or by interest ("indian food", "chill walk in a park").

export const INTERESTS = [
  ['food', 'Food', 'restaurant food brunch'],
  ['indian', 'Indian', 'indian curry'],
  ['coffee', 'Coffee', 'cafe coffee'],
  ['pubs', 'Pubs', 'pub bar'],
  ['clubs', 'Clubs', 'club nightclub dancing'],
  ['music', 'Live music', 'live-music gigs trad concerts jazz'],
  ['comedy', 'Comedy', 'comedy'],
  ['parks', 'Parks & walks', 'park walk'],
  ['sea', 'Beaches & sea', 'beach sea swimming'],
  ['tourist', 'Tourist spots', 'tourist historic museum landmark'],
]

// Words that say nothing about the place.
const STOP = new Set('a an and the in on at for to of with near me my some somewhere place places spot spots good best nice where go want looking find dublin'.split(' '))

// Other ways people say the same thing.
const SAME = {
  walks: 'walk', walking: 'walk', stroll: 'walk', hike: 'walk', parks: 'park',
  curry: 'indian', coffee: 'cafe', cafes: 'cafe', brunch: 'brunch', breakfast: 'brunch', eat: 'food', dinner: 'restaurant', lunch: 'food', restaurants: 'restaurant',
  pubs: 'pub', pint: 'pub', pints: 'pub', guinness: 'pub', drinks: 'bar', bars: 'bar', cocktail: 'cocktails',
  club: 'club', clubs: 'club', clubbing: 'club', dance: 'dancing', party: 'nightlife', night: 'nightlife',
  gig: 'gigs', concert: 'concerts', band: 'live-music', bands: 'live-music', music: 'live-music', trad: 'trad',
  laugh: 'comedy', laughs: 'comedy', standup: 'comedy', funny: 'comedy',
  beach: 'beach', beaches: 'beach', swim: 'swimming', seaside: 'sea',
  tourist: 'tourist', tourists: 'tourist', sightseeing: 'tourist', sights: 'tourist', history: 'historic', museums: 'museum',
  quiet: 'chill', relaxed: 'chill', relax: 'chill', calm: 'chill',
}

const plain = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '')

// The words a search is looking for, after dropping filler and folding synonyms.
function searchWords(query) {
  const words = plain(query).replace(/live music/g, 'live-music').split(/[^a-z0-9-]+/).filter((w) => w && !STOP.has(w))
  return [...new Set(words.map((w) => SAME[w] || w))]
}

// What kind of place it is: category, interest words and current vibe.
const kindOf = (v, p) => plain([v.category, ...(v.tags || []).map((t) => t.replace(/ /g, '-')), p?.vibe].join(' '))

// Whether a place fits an interest from INTERESTS.
export function fitsInterest(v, p, key) {
  const words = INTERESTS.find(([k]) => k === key)?.[2].split(' ') || []
  const kind = kindOf(v, p)
  return words.some((w) => kind.includes(w))
}

// Ranks places by how many of the words they match. With an interest picked,
// a place must match it.
export function searchPlaces(venues, latest, query, interest) {
  const words = searchWords(query)
  const wanted = INTERESTS.find(([k]) => k === interest)?.[2].split(' ') || []
  if (!words.length && !wanted.length) return null
  const scored = []
  for (const v of venues) {
    const p = latest[v.id]
    // An interest only looks at what kind of place it is, so "Pubs" doesn't
    // pick up Temple Bar Square by its name.
    const kind = kindOf(v, p)
    const text = plain([v.name, v.address, p?.caption].join(' ')) + ' ' + kind
    const has = (w) => text.includes(w) || (w === 'cafe' && text.includes('coffee'))
    if (wanted.length && !wanted.some((w) => kind.includes(w))) continue
    const score = words.filter(has).length + (plain(v.name).includes(plain(query).trim()) && query.trim() ? 5 : 0)
    if (words.length && !score) continue
    scored.push({ v, p, score })
  }
  // Best match first, then places with something happening right now.
  return scored.sort((a, b) => b.score - a.score || (b.p ? 1 : 0) - (a.p ? 1 : 0) || a.v.name.localeCompare(b.v.name))
}
