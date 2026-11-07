import { useEffect, useRef, useState } from 'react'
import Chips from './Chips'
import Media from './Media'
import { VIBES, backdrop, timeAgo } from '../lib/util'
import { STALE_COLOR, isFresh } from '../lib/vibes'

const SurpriseButton = ({ onClick }) => (
  <button className="surprise" onClick={onClick}>
    <span>Surprise me tonight<small>We’ll pick a place from what you like and what’s live now</small></span>
  </button>
)

const Heart = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
const Bubble = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" /></svg>

// How Home lays out posts. People pick one and we remember it on this phone.
const LOOKS = [
  ['spot', 'One at a time', <rect key="r" x="5" y="3" width="14" height="18" rx="3" />],
  ['board', 'Board', <g key="g"><rect x="3" y="3" width="8" height="10" rx="2" /><rect x="13" y="3" width="8" height="6" rx="2" /><rect x="3" y="15" width="8" height="6" rx="2" /><rect x="13" y="11" width="8" height="10" rx="2" /></g>],
]
const KEY = 'ts-home-look'
function useLook() {
  const [look, setLook] = useState(() => {
    try { return localStorage.getItem(KEY) === 'board' ? 'board' : 'spot' } catch { return 'spot' }
  })
  const pick = (k) => {
    setLook(k)
    try { localStorage.setItem(KEY, k) } catch { /* private browsing */ }
  }
  return [look, pick]
}

const vibeOf = (p) => {
  const fresh = isFresh(p)
  return { fresh, color: fresh ? VIBES[p.vibe].color : STALE_COLOR, label: VIBES[p.vibe].label }
}

// Big card that pops up as it scrolls into view.
function Spot({ p, venue, comments, onOpen }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return setShown(true)
    const io = new IntersectionObserver(([e]) => setShown(e.isIntersecting), { rootMargin: '-12% 0px -12% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const v = vibeOf(p)
  return (
    <button ref={ref} className={'spot' + (shown ? ' in' : '')} onClick={() => onOpen(p.id)} style={{ '--vc': v.color }}>
      <div className="spot-pic">
        <Media p={p} ar="4/5"><div className="ov" /></Media>
        <span className="who"><i style={backdrop(p.colors)}>{(p.who || '?')[0].toUpperCase()}</i>{p.who}</span>
        <span className="pill"><i />{v.label}</span>
        <span className="glass"><Heart />{p.likes}{p.allowComments && <><Bubble />{comments}</>}</span>
      </div>
      <div className="spot-txt">
        <b>{venue?.name || 'Somewhere in Dublin'}</b>
        <p>{p.caption}</p>
        <small>{venue?.address}{venue?.address && ' · '}{timeAgo(p.createdAt)}</small>
      </div>
    </button>
  )
}

// Notes-style tile. Every third one is all photo with the name on top.
function Tile({ p, venue, comments, onOpen, full }) {
  const v = vibeOf(p)
  return (
    <button className={'tile' + (full ? ' full' : '')} onClick={() => onOpen(p.id)} style={{ '--vc': v.color }}>
      {full && <Media p={p} ar="3/4"><div className="ov" /></Media>}
      <div className="tile-txt">
        <small><i />{v.label} · {timeAgo(p.createdAt)}</small>
        <b>{venue?.name || 'Somewhere in Dublin'}</b>
        {!full && <p>{p.caption}</p>}
      </div>
      {!full && <Media p={p} ar={p.ar} />}
      {!full && p.allowComments && <span className="tile-n"><Heart />{p.likes}<Bubble />{comments}</span>}
    </button>
  )
}

export default function Home({ posts, venueOf, commentCount, filter, setFilter, onOpen, sample, onSurprise }) {
  const [look, setLook] = useLook()
  if (!posts.length) return <><SurpriseButton onClick={onSurprise} /><p className="empty">Nothing posted yet. Tap + to share what’s happening near you.</p></>
  const shown = posts.filter((p) => filter === 'all' || p.vibe === filter)
  const card = (p, i) => {
    const props = { key: p.id, p, venue: venueOf(p), comments: commentCount(p), onOpen }
    return look === 'board' ? <Tile {...props} full={i % 3 === 2} /> : <Spot {...props} />
  }
  return (
    <>
      {sample && <p className="note">You’re seeing sample posts until the first real ones arrive.</p>}
      <SurpriseButton onClick={onSurprise} />
      <div className="stories">
        {posts.slice(0, 15).map((p) => (
          <button key={p.id} className="st" onClick={() => onOpen(p.id)}>
            <div className="ring">
              <div className="av" style={backdrop(p.colors)}>
                {p.mediaUrl && p.mediaType === 'image' ? <img src={p.mediaUrl} alt="" /> : (venueOf(p)?.name || '?')[0]}
              </div>
            </div>
            <span>{venueOf(p)?.name}</span>
          </button>
        ))}
      </div>
      <div className="feedhead">
        <h2 className="sec">Tonight</h2>
        <div className="look" role="group" aria-label="Home layout">
          {LOOKS.map(([k, label, icon]) => (
            <button key={k} aria-label={label} title={label} aria-pressed={look === k} onClick={() => setLook(k)}>
              <svg viewBox="0 0 24 24">{icon}</svg>
            </button>
          ))}
        </div>
      </div>
      <Chips filter={filter} setFilter={setFilter} />
      {!shown.length ? (
        <p className="empty">No one has posted a {VIBES[filter].label.toLowerCase()} spot yet. Be the first.</p>
      ) : look === 'board' ? (
        <div className="board">
          <div>{shown.map((p, i) => (i % 2 === 0 ? card(p, i) : null))}</div>
          <div>{shown.map((p, i) => (i % 2 === 1 ? card(p, i) : null))}</div>
        </div>
      ) : (
        <div className="spots">{shown.map(card)}</div>
      )}
    </>
  )
}
