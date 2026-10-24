import { useState } from 'react'
import Sheet from './Sheet'
import Media from './Media'
import { FavButton } from './PostSheet'
import { INTERESTS } from '../lib/search'
import { pickSurprise } from '../lib/surprise'
import { VIBES, categoryIcon, timeAgo } from '../lib/util'

const KEY = 'ts-interests'
const remembered = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
}

// "Surprise me tonight": pick some interests, get one place to go.
export default function Surprise({ venues, latest, favourites, isFav, onFavourite, onOpenPost, onShowOnMap, onClose }) {
  const [interests, setInterests] = useState(remembered)
  const [pick, setPick] = useState(null)
  const [seen, setSeen] = useState([])

  const toggle = (k) => {
    const next = interests.includes(k) ? interests.filter((x) => x !== k) : [...interests, k]
    setInterests(next)
    setSeen([])
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* not saved, still works */ }
  }

  const go = () => {
    const args = { venues, latest, interests, favourites }
    let skip = seen
    let got = pickSurprise({ ...args, skip })
    // Seen everything that fits: start again, but not with the same place twice in a row.
    if (!got && seen.length) {
      skip = pick ? [pick.v.id] : []
      got = pickSurprise({ ...args, skip }) || pickSurprise({ ...args, skip: [] })
    }
    setPick(got || false)
    if (got) setSeen(skip === seen ? [...seen, got.v.id] : [got.v.id])
  }

  const label = (k) => INTERESTS.find(([x]) => x === k)?.[1]
  const why = pick && [
    pick.p ? `${VIBES[pick.p.vibe].label} right now · posted ${timeAgo(pick.p.createdAt)}` : 'No posts in the last few hours',
    pick.matched.length ? `Good for ${pick.matched.map(label).join(', ').toLowerCase()}` : null,
    isFav(pick.v.id) ? 'One of your places' : null,
  ].filter(Boolean)

  return (
    <Sheet label="Surprise me tonight" onClose={onClose}>
      <div className="pt">
        <b>Surprise me tonight</b>
        <button className="x" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <div className="body">
        <p className="off">What are you in the mood for? Pick any, or none for anything goes.</p>
        <div className="vr" style={{ flexWrap: 'wrap' }}>
          {INTERESTS.map(([k, l]) => (
            <button key={k} className="chip" aria-pressed={interests.includes(k)} onClick={() => toggle(k)}>{l}</button>
          ))}
        </div>
        {pick === null && <button className="save primary big" onClick={go}>✨ Surprise me</button>}
        {pick === false && <p className="off" style={{ marginTop: 16 }}>Nothing fits those yet. Try fewer interests.</p>}
        {pick && (
          <div className="pick" style={{ '--vc': pick.p ? VIBES[pick.p.vibe].color : '#aeaeb2' }}>
            {pick.p ? <Media p={pick.p} ar="4/3" /> : <div className="ph none">{categoryIcon(pick.v.category)}</div>}
            <small>Tonight, go to</small>
            <h2>{pick.v.name}</h2>
            <p className="off">{pick.v.address}</p>
            <ul>{why.map((w) => <li key={w}>{w}</li>)}</ul>
            <div className="row">
              {pick.p ? (
                <button className="save primary" onClick={() => onOpenPost(pick.p.id)}>See what’s happening</button>
              ) : (
                <button className="save primary" onClick={() => onShowOnMap(pick.v.id)}>Show on map</button>
              )}
              <button className="save" onClick={go}>Try another</button>
              <FavButton on={isFav(pick.v.id)} onClick={() => onFavourite(pick.v.id)} />
            </div>
          </div>
        )}
        {pick === false && <button className="save primary big" onClick={go}>✨ Try again</button>}
      </div>
    </Sheet>
  )
}
