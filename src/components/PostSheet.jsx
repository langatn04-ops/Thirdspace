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

function Comments({ p, list, canPost, onPost, onNeedSignIn }) {
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
        list.map((c) => (
          <div className="cmt" key={c.id}>
            <div className="av" style={backdrop(p.colors)}>{c.who[0].toUpperCase()}</div>
            <div>
              <b>{c.who}</b>
              {c.verdict && <span className={'vd ' + c.verdict}>{c.verdict === 'good' ? 'Worth it' : 'Not great'}</span>}
              <small>{timeAgo(c.createdAt)}</small>
              <p>{c.body}</p>
            </div>
          </div>
        ))
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

export default function PostSheet({ p, venue, mine, liked, saved, comments, canPost, onLike, onSave, onComment, onAllowComments, onNeedSignIn, onClose }) {
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
        <div><b>{p.who}</b><small>{timeAgo(p.createdAt)} at {venue?.name}</small></div>
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
      {mine && (
        <div className="own">
          <span><b>Allow comments</b><br /><small>This is your post, so you decide.</small></span>
          <button className="sw" role="switch" aria-checked={p.allowComments} aria-label="Allow comments"
            onClick={() => onAllowComments(!p.allowComments)} />
        </div>
      )}
      <div className="body">
        <h3>{venue?.name}</h3>
        <small style={{ color: 'var(--mute)' }}>{venue?.address}, Dublin &nbsp;·&nbsp; {VIBES[p.vibe].label}</small>
        {p.caption && <p>{p.caption}</p>}
      </div>
      <Comments p={p} list={comments} canPost={canPost} onPost={onComment} onNeedSignIn={onNeedSignIn} />
    </Sheet>
  )
}
