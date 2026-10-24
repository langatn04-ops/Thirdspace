import Media from './Media'
import { VIBES } from '../lib/util'

export function videoBadge(p) {
  if (p.mediaType !== 'video') return null
  const d = p.fakeVideo
  return <div className="vbd">▶{d ? ` 0:${String(d).padStart(2, '0')}` : ''}</div>
}

export default function Card({ p, venue, comments, onOpen }) {
  return (
    <button className="card" onClick={() => onOpen(p.id)} style={{ '--vc': VIBES[p.vibe].color }}>
      <Media p={p}>
        <div className="ov" />
      </Media>
      <div className="pill"><i />{VIBES[p.vibe].label}</div>
      {videoBadge(p)}
      <div className="meta">
        <div>
          <b>{venue?.name || 'Somewhere in Dublin'}</b>
          <span>{venue?.address}</span>
        </div>
        <span>♥ {p.likes}{p.allowComments ? <>&nbsp; 💬 {comments}</> : null}</span>
      </div>
    </button>
  )
}
