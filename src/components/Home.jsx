import Card from './Card'
import Chips from './Chips'
import Media from './Media'
import { VIBES, backdrop } from '../lib/util'

const SurpriseButton = ({ onClick }) => (
  <button className="surprise" onClick={onClick}>
    <span>✨</span><span>Surprise me tonight<small>We’ll pick a place from what you like and what’s live now</small></span>
  </button>
)

export default function Home({ posts, venueOf, commentCount, filter, setFilter, onOpen, sample, onSurprise }) {
  if (!posts.length) return <><SurpriseButton onClick={onSurprise} /><p className="empty">Nothing posted yet. Tap + to share what’s happening near you.</p></>
  const top = posts.reduce((a, b) => (b.likes > a.likes ? b : a))
  const shown = posts.filter((p) => filter === 'all' || p.vibe === filter)
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
      <button className="cover" onClick={() => onOpen(top.id)} style={{ '--vc': VIBES[top.vibe].color }}>
        <Media p={top}><div className="ov" /></Media>
        <div className="pill"><i />{VIBES[top.vibe].label}</div>
        <div className="cv">
          <small>Most talked about tonight</small>
          <h2>{venueOf(top)?.name}</h2>
          <p>{top.caption}</p>
        </div>
      </button>
      <Chips filter={filter} setFilter={setFilter} />
      <h2 className="sec">More from tonight</h2>
      {shown.length ? (
        <div className="grid">
          {shown.map((p) => <Card key={p.id} p={p} venue={venueOf(p)} comments={commentCount(p)} onOpen={onOpen} />)}
        </div>
      ) : (
        <p className="empty">No one has posted a {VIBES[filter].label.toLowerCase()} spot yet. Be the first.</p>
      )}
    </>
  )
}
