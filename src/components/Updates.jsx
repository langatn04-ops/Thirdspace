import Sheet from './Sheet'
import Media from './Media'
import { VIBES, timeAgo } from '../lib/util'

// New posts from the places someone has favourited, newest first.
export default function Updates({ posts, isNew, places, onOpen, onUnfavourite, onClose }) {
  return (
    <Sheet label="Updates" onClose={onClose}>
      <div className="pt">
        <b>Updates from your places</b>
        <button className="x" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <div className="body">
        {!places.length ? (
          <p className="off">Tap <b>☆ Favourite</b> on any place, on the map or on a post. When someone posts there, it shows up here.</p>
        ) : !posts.length ? (
          <p className="off">Nothing new at your places yet. You’ll see posts here as soon as someone shares one.</p>
        ) : (
          posts.map(({ p, venue }) => (
            <button key={p.id} className="ar" onClick={() => onOpen(p.id)}>
              <Media p={p} ar="1/1" />
              <div>
                {isNew(p) && <span className="tag new">New</span>}
                <h3>{venue?.name}</h3>
                {p.caption && <p>{p.caption}</p>}
                <small>{VIBES[p.vibe].label} · {timeAgo(p.createdAt)} · by {p.who}</small>
              </div>
            </button>
          ))
        )}
        {!!places.length && (
          <>
            <h3 className="sub">Your places</h3>
            <div className="vr" style={{ flexWrap: 'wrap' }}>
              {places.map((v) => (
                <span key={v.id} className="chip">
                  {v.name}
                  <button className="unfav" aria-label={`Remove ${v.name} from your places`} onClick={() => onUnfavourite(v.id)}>×</button>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}
