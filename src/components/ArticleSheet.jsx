import Sheet from './Sheet'
import { backdrop, palette, stars, verdict } from '../lib/util'
import Media from './Media'

export default function ArticleSheet({ a, post, onClose, onOpenPost }) {
  return (
    <Sheet label={a.title} onClose={onClose}>
      <div className="pt">
        <div><b>{a.author}</b><small>{a.minutes} min read</small></div>
        <button className="x" aria-label="Close" onClick={onClose}>×</button>
      </div>
      {post ? <Media p={post} ar="4/3" /> : <div className="ph" style={{ '--ar': '4/3', ...backdrop(palette(a.id)) }} />}
      <div className="body art">
        <h3>{a.title}</h3>
        <p style={{ color: 'var(--mute)', margin: 0 }}>{a.dek}</p>
        <p><span className="stars" aria-label={`${a.rating} out of 5`}>{stars(a.rating)}</span> {verdict(a.rating)}</p>
        {a.body.map((t, i) => <p key={i}>{t}</p>)}
        {post && <button className="save" style={{ marginTop: 16 }} onClick={() => onOpenPost(post.id)}>See what’s on there now</button>}
      </div>
    </Sheet>
  )
}
