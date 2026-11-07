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
        <span className="cnt">
          <span className="n"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>{p.likes}</span>
          {p.allowComments ? <span className="n"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" /></svg>{comments}</span> : null}
        </span>
      </div>
    </button>
  )
}
