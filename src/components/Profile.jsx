import { useState } from 'react'
import Card from './Card'
import Media from './Media'
import { supabase } from '../lib/supabase'
import Turnstile, { TURNSTILE_KEY } from './Turnstile'

const At = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1" /></svg>
const Key = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M15 8l2 2" /></svg>
const Person = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
const Arrow = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>

// Photos that drift behind the welcome screen: the latest posts, tilted.
const SPOTS = [
  { l: '6%', t: '6%', w: '34%', r: -8 }, { l: '58%', t: '3%', w: '38%', r: 6 }, { l: '-6%', t: '34%', w: '30%', r: 4 },
  { l: '74%', t: '36%', w: '30%', r: -5 }, { l: '10%', t: '64%', w: '36%', r: 7 }, { l: '56%', t: '68%', w: '34%', r: -7 },
]
function Collage({ posts }) {
  const pics = posts.slice(0, SPOTS.length)
  return (
    <div className="drift" aria-hidden="true">
      {pics.map((p, i) => (
        <div key={p.id} className="dp" style={{ left: SPOTS[i].l, top: SPOTS[i].t, width: SPOTS[i].w, '--r': `${SPOTS[i].r}deg`, '--d': `${i * -3}s` }}>
          <Media p={p} ar={i % 2 ? '3/4' : '4/5'} />
        </div>
      ))}
    </div>
  )
}

function AuthForm({ posts }) {
  const [mode, setMode] = useState(null) // null = welcome, 'in' = log in, 'up' = sign up
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [adult, setAdult] = useState(false)
  const [captcha, setCaptcha] = useState(null)
  const [tries, setTries] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sentTo, setSentTo] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (mode === 'up' && !adult) return setErr('Third Space is for people aged 18 and over.')
    if (TURNSTILE_KEY && !captcha) return setErr('Please wait a moment while we check you’re a person, then try again.')
    setBusy(true)
    setErr('')
    const captchaToken = captcha || undefined
    const res = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
      : await supabase.auth.signUp({
          email, password,
          options: { captchaToken, data: { username: username.trim(), age_confirmed_at: new Date().toISOString() } },
        })
    setBusy(false)
    setTries((n) => n + 1) // each bot check can only be used once
    if (res.error) return setErr(res.error.message)
    // With email confirmation on, there's no session until they click the link.
    if (mode === 'up' && !res.data.session) setSentTo(email)
  }
  const open = (m) => { setMode(m); setErr('') }

  let card = null
  if (sentTo)
    card = (
      <div className="glass-card">
        <div className="gc-top"><span>Third Space</span></div>
        <h3>Check your email</h3>
        <p className="gc-note">We sent a link to <b>{sentTo}</b>. Tap it to confirm your account, then come back and log in.</p>
        <p className="gc-note">Can’t see it? Look in your spam or promotions folder.</p>
        <button type="button" className="go-pill" onClick={() => { setSentTo(''); open('in') }}>Back to log in <i><Arrow /></i></button>
      </div>
    )
  else if (mode)
    card = (
      <form className="glass-card" onSubmit={submit}>
        <div className="gc-top">
          <button type="button" className="gc-link" onClick={() => open(null)}>Third Space</button>
          <button type="button" className="gc-link strong" onClick={() => open(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'Sign up' : 'Log in'}</button>
        </div>
        <h3>{mode === 'in' ? 'Log in' : 'Sign up'}</h3>
        {mode === 'up' && (
          <label className="pillin"><i><Person /></i>
            <input value={username} required minLength={2} maxLength={30} autoComplete="username" placeholder="username" aria-label="Username" onChange={(e) => setUsername(e.target.value)} />
          </label>
        )}
        <label className="pillin"><i><At /></i>
          <input type="email" value={email} required autoComplete="email" placeholder="e-mail address" aria-label="Email" onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="pillin"><i><Key /></i>
          <input type="password" value={password} required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder="password" aria-label="Password" onChange={(e) => setPassword(e.target.value)} />
        </label>
        {mode === 'up' && (
          <label className="tick">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
            <span>I’m 18 or over</span>
          </label>
        )}
        <Turnstile onToken={setCaptcha} resetKey={tries} />
        {err && <p className="err">{err}</p>}
        <div className="gc-row">
          <small>For people aged 18 and over. Your posts show where you are right now, so only share what you’re happy for others to see.</small>
          <button className="round-go" disabled={busy} aria-label={mode === 'in' ? 'Log in' : 'Create account'}>{busy ? '…' : <Arrow />}</button>
        </div>
        <p className="gc-foot">Please go out responsibly!</p>
      </form>
    )

  return (
    <div className={'welcome' + (card ? ' dim' : '')}>
      <Collage posts={posts} />
      <div className="wm">
        <h1>Third Space</h1>
        <p>Dublin, right now</p>
      </div>
      {card || (
        <div className="wl-actions">
          <button className="wl-btn solid" onClick={() => open('up')}>Sign up</button>
          <button className="wl-btn" onClick={() => open('in')}>Log in</button>
          <p>Third Space is for people aged 18 and over.</p>
        </div>
      )}
    </div>
  )
}

// At the bottom of Profile. Asks once more before deleting, since it can't be undone.
function DeleteAccount({ onDelete }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const go = async () => {
    setBusy(true)
    setErr('')
    try {
      await onDelete()
    } catch (e) {
      console.warn('Delete account failed', e)
      setErr('Your account couldn’t be deleted just now. Try again, or contact us and we’ll do it for you.')
      setBusy(false)
    }
  }
  if (!open) return <p className="del"><button className="link" onClick={() => setOpen(true)}>Delete my account</button></p>
  return (
    <div className="safe del">
      <b>Delete your account?</b>
      <small>This deletes your account and everything you’ve added: posts, photos and videos (anonymous ones too), comments, likes, saves and favourite places. It can’t be undone.</small>
      {err && <p className="err">{err}</p>}
      <div className="row">
        <button className="save primary" disabled={busy} onClick={go}>{busy ? 'Deleting…' : 'Yes, delete everything'}</button>
        <button className="link" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  )
}

export default function Profile({ user, name, posts, saved, venueOf, commentCount, onOpen, toast, onDeleteAccount }) {
  const [tab, setTab] = useState('posts')
  if (supabase && !user) return <AuthForm posts={posts} />

  const mine = posts.filter((p) => p.userId === (user?.id ?? 'you'))
  const savedPosts = posts.filter((p) => saved.has(p.id))
  const likes = mine.reduce((s, p) => s + p.likes, 0)
  const list = tab === 'saved' ? savedPosts : mine

  return (
    <>
      <div className="prof">
        <div className="ring">
          <div className="av" style={{ background: 'var(--panel)', color: 'var(--brass)' }}>{name[0].toUpperCase()}</div>
        </div>
        <div>
          <h2>{name}</h2>
          <p className="off">Dublin · out and about</p>
          {user && <button className="link" style={{ marginTop: 6 }} onClick={() => supabase.auth.signOut()}>Sign out</button>}
        </div>
      </div>
      <div className="stats">
        <div><b>{mine.length}</b><small>Posts</small></div>
        <div><b>{savedPosts.length}</b><small>Saved</small></div>
        <div><b>{likes}</b><small>Likes</small></div>
      </div>
      <div className="seg" role="group" aria-label="Profile section">
        <button aria-pressed={tab === 'posts'} onClick={() => setTab('posts')}>Your posts</button>
        <button aria-pressed={tab === 'saved'} onClick={() => setTab('saved')}>Saved</button>
      </div>
      {list.length ? (
        <div className="grid">
          {list.map((p) => <Card key={p.id} p={p} venue={venueOf(p)} comments={commentCount(p)} onOpen={onOpen} />)}
        </div>
      ) : (
        <p className="empty">{tab === 'saved' ? 'Nothing saved yet. Open a post and tap Save to keep it here.' : 'You haven’t posted yet. Tap + to share what’s happening.'}</p>
      )}
      {user && <DeleteAccount onDelete={onDeleteAccount} />}
    </>
  )
}
