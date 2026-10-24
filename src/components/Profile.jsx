import { useState } from 'react'
import Card from './Card'
import { supabase } from '../lib/supabase'

function AuthForm({ toast }) {
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const res = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { username: username.trim() } } })
    setBusy(false)
    if (res.error) return setErr(res.error.message)
    if (mode === 'up' && !res.data.session) toast('Check your email to confirm your account.')
  }

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

export default function Profile({ user, name, posts, saved, venueOf, commentCount, onOpen, toast }) {
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
    </>
  )
}
