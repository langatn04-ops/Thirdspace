import { useState } from 'react'
import Card from './Card'
import { supabase } from '../lib/supabase'
import Turnstile, { TURNSTILE_KEY } from './Turnstile'

function AuthForm({ toast }) {
  const [mode, setMode] = useState('in')
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

  if (sentTo)
    return (
      <div className="auth">
        <div className="form">
          <h3>Check your email</h3>
          <p className="off">We sent a link to <b>{sentTo}</b>. Tap it to confirm your account, then come back and sign in.</p>
          <p className="off">Can’t see it? Look in your spam or promotions folder.</p>
          <button type="button" className="save primary" style={{ margin: 0, padding: 14 }} onClick={() => { setSentTo(''); setMode('in') }}>Back to sign in</button>
        </div>
      </div>
    )

  return (
    <div className="auth">
      <form className="form" onSubmit={submit}>
        <h3>{mode === 'in' ? 'Welcome back' : 'Join Third Space'}</h3>
        <p className="off">{mode === 'in' ? 'Sign in to post, comment and save places.' : 'Make an account to post, comment and save places.'}</p>
        {mode === 'up' && (
          <label className="field">Username
            <input value={username} required minLength={2} maxLength={30} autoComplete="username" onChange={(e) => setUsername(e.target.value)} />
          </label>
        )}
        <label className="field">Email
          <input type="email" value={email} required autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">Password
          <input type="password" value={password} required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {mode === 'up' && (
          <label className="tick">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
            <span>I’m 18 or over</span>
          </label>
        )}
        <Turnstile onToken={setCaptcha} resetKey={tries} />
        {err && <p className="err">{err}</p>}
        <button className="save primary" style={{ margin: 0, padding: 14 }} disabled={busy}>
          {busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" className="link" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr('') }}>
          {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      </form>
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
  if (supabase && !user) return <AuthForm toast={toast} />

  const mine = posts.filter((p) => p.userId === (user?.id ?? 'you'))
  const savedPosts = posts.filter((p) => saved.has(p.id))
  const likes = mine.reduce((s, p) => s + p.likes, 0)
  const list = tab === 'saved' ? savedPosts : mine

  return (
    <>
      <div className="prof">
        <div className="ring">
          <div className="av" style={{ background: 'linear-gradient(135deg,#00c2a8,#ff6f91)' }}>{name[0].toUpperCase()}</div>
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
