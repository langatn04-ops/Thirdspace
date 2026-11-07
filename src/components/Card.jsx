import Media from './Media'
import { VIBES, timeAgo } from '../lib/util'
import { STALE_COLOR, isFresh } from '../lib/vibes'

export function videoBadge(p) {
  if (p.mediaType !== 'video') return null
  const d = p.fakeVideo
  return <div className="vbd">▶{d ? ` 0:${String(d).padStart(2, '0')}` : ''}</div>
}

// Posts older than 90 minutes no longer say what it's like now, so their vibe
// goes grey and shows when it was posted instead.
export default function Card({ p, venue, comments, onOpen }) {
  const fresh = isFresh(p)
  return (
    <button className={'card' + (fresh ? '' : ' old')} onClick={() => onOpen(p.id)} style={{ '--vc': fresh ? VIBES[p.vibe].color : STALE_COLOR }}>
      <Media p={p}>
        <div className="ov" />
      </Media>
      <div className="pill"><i />{fresh ? VIBES[p.vibe].label : `${VIBES[p.vibe].label} · ${timeAgo(p.createdAt)}`}</div>
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
