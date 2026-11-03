import { useEffect, useRef, useState } from 'react'
import Sheet from './Sheet'
import Media from './Media'
import { VIBES, backdrop, timeAgo } from '../lib/util'

const Heart = () => (
  <svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z" /></svg>
)

// Sample videos have no file, so play/pause animates the colour backdrop instead.
function FakeVideo({ p, onDoubleTap, pop }) {
  const [run, setRun] = useState(false)
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!run) return
    const id = setInterval(() => setT((x) => (x + 0.25) % p.fakeVideo), 250)
    return () => clearInterval(id)
  }, [run, p.fakeVideo])
  return (
    <>
      <div className="pic" onDoubleClick={onDoubleTap}>
        <Media p={p} running={run}>{pop}</Media>
        <button className={'pbtn' + (run ? ' run' : '')} aria-label={run ? 'Pause video' : 'Play video'} onClick={() => setRun(!run)}>
          {run ? '❚❚' : '▶'}
        </button>
      </div>
      <div style={{ height: 3, background: 'var(--line)' }}>
        <i style={{ display: 'block', height: '100%', width: `${(t / p.fakeVideo) * 100}%`, background: 'var(--accent)' }} />
      </div>
    </>
  )
}

// Press and hold (or right-click) on one of your own comments to delete it.
function useLongPress(onLong) {
  const timer = useRef(null)
  const stop = () => clearTimeout(timer.current)
  return {
    onPointerDown: () => { stop(); timer.current = setTimeout(onLong, 500) },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e) => { e.preventDefault(); stop(); onLong() },
  }
}

function Comment({ c, p, mine, onDelete }) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const press = useLongPress(() => mine && setAsking(true))
  return (
    <div className={'cmt' + (mine ? ' mine' : '')} {...(mine ? press : {})}>
      <div className="av" style={backdrop(p.colors)}>{c.who[0].toUpperCase()}</div>
      <div style={{ flex: 1 }}>
        <b>{c.who}</b>
        {c.verdict && <span className={'vd ' + c.verdict}>{c.verdict === 'good' ? 'Worth it' : 'Not great'}</span>}
        <small>{timeAgo(c.createdAt)}</small>
        <p>{c.body}</p>
        {asking && (
          <div className="row ask">
            <span>Delete this comment?</span>
            <button className="save primary" disabled={busy} onClick={async () => { setBusy(true); await onDelete(c); setBusy(false); setAsking(false) }}>Delete</button>
            <button className="link" onClick={() => setAsking(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Comments({ p, list, me, canPost, onPost, onDelete, onNeedSignIn }) {
  const [v, setV] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  if (!p.allowComments)
    return (
      <div className="cm">
        <h4>Comments</h4>
        <p className="off">The poster has turned comments off for this post.</p>
      </div>
    )
  const post = async () => {
    if (!canPost) return onNeedSignIn()
    const x = text.trim()
    if (!x) return
    setBusy(true)
    const done = await onPost(x, v)
    setBusy(false)
    if (done) { setText(''); setV('') }
  }
  return (
    <div className="cm">
      <h4>Comments{list ? ` (${list.length})` : ''}</h4>
      {!list ? (
        <p className="off">Loading comments…</p>
      ) : list.length ? (
        list.map((c) => <Comment key={c.id} c={c} p={p} mine={!!me && c.userId === me} onDelete={onDelete} />)
      ) : (
        <p className="off" style={{ marginBottom: 6 }}>No comments yet. If you’re there, tell people what it’s like.</p>
      )}
      <div className="vr">
        {[['good', 'Worth it'], ['bad', 'Not great']].map(([k, label]) => (
          <button key={k} className="chip" aria-pressed={v === k} onClick={() => setV(v === k ? '' : k)}>{label}</button>
        ))}
      </div>
      <div className="cin">
        <input value={text} maxLength={300} placeholder="Add a comment" aria-label="Add a comment"
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && post()} />
        <button className="save" style={{ margin: 0 }} disabled={busy} onClick={post}>Post</button>
      </div>
    </div>
  )
}

const REASONS = [
  ['bullying', 'Bullying or harassment'],
  ['private', 'Shows me or someone without asking'],
  ['threat', 'Threats or violence'],
  ['sexual', 'Nudity or sexual content'],
  ['spam', 'Spam, fake or misleading'],
  ['other', 'Something else'],
]

// Report and block, at the bottom of every post that isn't yours.
function Safety({ p, onReport, onBlock }) {
  const [open, setOpen] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (fn) => { setBusy(true); await fn(); setBusy(false) }
  if (open === 'report')
    return (
      <div className="safe">
        <b>What’s wrong with this post?</b>
        <small>The poster isn’t told who reported it. You won’t see it again.</small>
        <div className="why">
          {REASONS.map(([k, label]) => (
            <button key={k} className="chip" aria-pressed={reason === k} onClick={() => setReason(k)}>{label}</button>
          ))}
        </div>
        <div className="row">
          <button className="save primary" disabled={!reason || busy} onClick={() => run(() => onReport(reason))}>Send report</button>
          <button className="link" onClick={() => setOpen(null)}>Cancel</button>
        </div>
      </div>
    )
  if (open === 'block')
    return (
      <div className="safe">
        <b>Block {p.who}?</b>
        <small>You won’t see their posts or comments any more. They won’t be told.</small>
        <div className="row">
          <button className="save primary" disabled={busy} onClick={() => run(onBlock)}>Block</button>
          <button className="link" onClick={() => setOpen(null)}>Cancel</button>
        </div>
      </div>
    )
  return (
    <div className="safe links">
      <button className="link" onClick={() => setOpen('report')}>Report post</button>
      {/* No block on anonymous posts: it would give away who posted them. */}
      {!p.anonymous && p.userId && <button className="link" onClick={() => setOpen('block')}>Block {p.who}</button>}
    </div>
  )
}

export function FavButton({ on, onClick }) {
  return <button className={'fav' + (on ? ' on' : '')} aria-pressed={on} onClick={onClick}>{on ? '★ Favourite' : '☆ Favourite'}</button>
}

export default function PostSheet({ p, venue, mine, liked, saved, fav, comments, canPost, onLike, onSave, onFavourite, onComment, onAllowComments, onReport, onBlock, onNeedSignIn, onClose, me, onDelete, onDeleteComment }) {
  const [deleting, setDeleting] = useState(false)
  const popRef = useRef(null)
  const doubleTap = () => {
    if (!liked) onLike()
    const o = popRef.current
    o.classList.remove('go'); void o.offsetWidth; o.classList.add('go')
  }
  const pop = <div className="pop" ref={popRef}>♥</div>
  return (
    <Sheet label={`Post at ${venue?.name || 'a venue'}`} onClose={onClose}>
      <div className="pt">
        <div className="av" style={backdrop(p.colors)}>{(venue?.name || '?')[0]}</div>
        <div><b>{p.who}</b>{p.byVenue && <span className="vlabel">Venue</span>}<small>{timeAgo(p.createdAt)} at {venue?.name}</small></div>
        <button className="x" aria-label="Close" onClick={onClose}>×</button>
      </div>
      {p.fakeVideo ? (
        <FakeVideo p={p} onDoubleTap={doubleTap} pop={pop} />
      ) : (
        <div className="pic" onDoubleClick={doubleTap}>
          <Media p={p} controls>{pop}</Media>
        </div>
      )}
      <div className="act">
        <button className={'ib' + (liked ? ' on' : '')} aria-label="Like" aria-pressed={liked} onClick={onLike}>
          <Heart /><span>{p.likes}</span>
        </button>
        <button className={'save' + (saved ? ' on' : '')} onClick={onSave}>{saved ? 'Saved' : 'Save'}</button>
      </div>
      {mine && p.underReview && (
        <div className="own review">
          <span><b>Hidden while we check it</b><br /><small>A few people reported this post, so only you can see it for now. We check reports within 24 hours.</small></span>
        </div>
      )}
      {mine && (
        <div className="own">
          <span><b>Allow comments</b><br /><small>This is your post, so you decide.</small></span>
          <button className="sw" role="switch" aria-checked={p.allowComments} aria-label="Allow comments"
            onClick={() => onAllowComments(!p.allowComments)} />
        </div>
      )}
      {mine && (deleting ? (
        <div className="safe" style={{ margin: '12px 16px 0' }}>
          <b>Delete this post?</b>
          <small>The photo or video, its comments and likes are deleted too. This can’t be undone.</small>
          <div className="row">
            <button className="save primary" onClick={onDelete}>Delete post</button>
            <button className="link" onClick={() => setDeleting(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <p className="del" style={{ margin: '10px 16px 0', textAlign: 'left' }}><button className="link" onClick={() => setDeleting(true)}>Delete post</button></p>
      ))}
      <div className="body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3>{venue?.name}</h3>
          {venue && <FavButton on={fav} onClick={onFavourite} />}
        </div>
        <small style={{ color: 'var(--mute)' }}>{venue?.address}, Dublin &nbsp;·&nbsp; {VIBES[p.vibe].label}</small>
        {p.caption && <p>{p.caption}</p>}
      </div>
      <Comments p={p} list={comments} me={me} canPost={canPost} onPost={onComment} onDelete={onDeleteComment} onNeedSignIn={onNeedSignIn} />
      {!mine && <Safety key={p.id} p={p} onReport={onReport} onBlock={onBlock} />}
    </Sheet>
  )
}
