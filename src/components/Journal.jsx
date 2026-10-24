import { backdrop, palette, stars } from '../lib/util'
import Media from './Media'

function Cover({ a, latest }) {
  const p = latest(a.venueId)
  return p ? <Media p={p} ar="4/5" /> : <div className="ph" style={{ '--ar': '4/5', ...backdrop(palette(a.id)) }} />
}

export default function Journal({ articles, latest, onOpenArticle }) {
  if (!articles.length) return <p className="empty">No reviews yet.</p>
  const [lead, ...rest] = articles
  return (
    <>
      <h2 className="sec top">Journal</h2>
      <p className="lede">Reviews of Dublin places, written by people who went.</p>
      <button className="cover" onClick={() => onOpenArticle(lead.id)}>
        <Cover a={lead} latest={latest} />
        <div className="ov" />
        <div className="cv">
          <small>Review by {lead.author}</small>
          <h2>{lead.title}</h2>
          <p>{lead.dek}</p>
        </div>
      </button>
      <div style={{ marginTop: 18 }}>
        {rest.map((a) => (
          <button key={a.id} className="ar" onClick={() => onOpenArticle(a.id)}>
            <Cover a={a} latest={latest} />
            <div>
              <h3>{a.title}</h3>
              <p>{a.dek}</p>
              <small>
                <span className="stars" aria-label={`${a.rating} out of 5`}>{stars(a.rating)}</span> {a.minutes} min read
              </small>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}
