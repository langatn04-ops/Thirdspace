import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import * as api from './lib/api'
import Home from './components/Home'
import MapView from './components/MapView'
import Journal from './components/Journal'
import Profile from './components/Profile'
import PostSheet from './components/PostSheet'
import ArticleSheet from './components/ArticleSheet'
import NewPost from './components/NewPost'
import Updates from './components/Updates'

const TABS = [
  ['home', 'Home', <path key="h" d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />],
  ['map', 'Map', <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>],
  ['post'],
  ['journal', 'Journal', <><path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z" /><path d="M4 20a2 2 0 0 0 2 2h13v-4" /></>],
  ['me', 'Profile', <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>],
]

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('home')
  const [filter, setFilter] = useState('all')
  const [openPost, setOpenPost] = useState(null)
  const [openArticle, setOpenArticle] = useState(null)
  const [composing, setComposing] = useState(false)
  // While Updates is open, when it was last opened before, so new posts stay marked.
  const [updatesSince, setUpdatesSince] = useState(undefined)
  const [toastText, setToastText] = useState('')

  const toast = useCallback((t) => {
    setToastText(t)
    clearTimeout(toast.h)
    toast.h = setTimeout(() => setToastText(''), 2500)
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  const reload = useCallback(() => {
    api.loadAll(user).then(setData).catch((e) => setError(e.message || 'Could not load Third Space.'))
  }, [user])
  useEffect(reload, [reload])

  // Coming back to the app fetches what's new, so the Updates count stays current.
  useEffect(() => {
    const back = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', back)
    return () => document.removeEventListener('visibilitychange', back)
  }, [reload])

  const live = supabase && data && !data.sample
  const venueOf = (p) => data.venues.find((v) => v.id === p.venueId)
  const commentCount = (p) => data.comments[p.id]?.length ?? p.commentCount ?? 0
  const latest = (venueId) => data.posts.find((p) => p.venueId === venueId)
  const name = user?.user_metadata?.username || user?.email?.split('@')[0] || 'You'

  const patch = (fn) => setData((d) => ({ ...d, ...fn(d) }))
  const patchPost = (id, fn) => patch((d) => ({ posts: d.posts.map((p) => (p.id === id ? { ...p, ...fn(p) } : p)) }))

  const needSignIn = (why) => {
    setOpenPost(null)
    setTab('me')
    toast(`Sign in to ${why}.`)
  }

  const showPost = async (id) => {
    setOpenArticle(null)
    setOpenPost(id)
    if (live && !data.comments[id]) {
      const list = await api.loadComments(id)
      patch((d) => ({ comments: { ...d.comments, [id]: list } }))
    }
  }

  const toggle = async (p, key, setter, why) => {
    if (live && !user) return needSignIn(why)
    const on = !data[key].has(p.id)
    const flip = (yes) => patch((d) => {
      const s = new Set(d[key])
      yes ? s.add(p.id) : s.delete(p.id)
      return { [key]: s }
    })
    flip(on)
    if (key === 'liked') patchPost(p.id, (x) => ({ likes: x.likes + (on ? 1 : -1) }))
    if (key === 'saved' && on) toast('Saved to your profile')
    if (!live) return
    try {
      await setter(p.id, user.id, on)
    } catch {
      flip(!on)
      if (key === 'liked') patchPost(p.id, (x) => ({ likes: x.likes + (on ? -1 : 1) }))
      toast('That didn’t save. Try again.')
    }
  }

  const comment = async (p, body, verdict) => {
    if (!live) {
      const c = { id: Date.now(), postId: p.id, who: name, verdict, body, createdAt: new Date().toISOString() }
      patch((d) => ({ comments: { ...d.comments, [p.id]: [...(d.comments[p.id] || []), c] } }))
      return true
    }
    try {
      await api.addComment({ postId: p.id, userId: user.id, body, verdict })
      const list = await api.loadComments(p.id)
      patch((d) => ({ comments: { ...d.comments, [p.id]: list } }))
      return true
    } catch {
      toast('Your comment didn’t post. Try again.')
      return false
    }
  }

  const allowComments = async (p, allow) => {
    patchPost(p.id, () => ({ allowComments: allow }))
    if (!live) return
    try {
      await api.setAllowComments(p.id, allow)
    } catch {
      patchPost(p.id, () => ({ allowComments: !allow }))
      toast('That didn’t save. Try again.')
    }
  }

  const isFav = (venueId) => data.favourites.has(venueId)
  const favourite = async (venueId) => {
    if (live && !user) return needSignIn('favourite places')
    const on = !isFav(venueId)
    const flip = (yes) => patch((d) => {
      const m = new Map(d.favourites)
      yes ? m.set(venueId, new Date().toISOString()) : m.delete(venueId)
      return { favourites: m }
    })
    flip(on)
    if (on) toast('Added to your places. New posts will show in Updates.')
    if (!live) return
    try {
      await api.setFavourite(venueId, user.id, on)
    } catch {
      flip(!on)
      toast('That didn’t save. Try again.')
    }
  }

  // Posts by other people at favourite places. A post is new if it came after
  // Updates was last opened and after the place was favourited.
  const time = (t) => (t ? new Date(t).getTime() : 0)
  const updates = data
    ? data.posts.filter((p) => isFav(p.venueId) && !(user && p.userId === user.id)).map((p) => ({ p, venue: venueOf(p) }))
    : []
  const isNew = (since) => (p) => time(p.createdAt) > Math.max(time(since), time(data.favourites.get(p.venueId)))
  const unread = data ? updates.filter(({ p }) => isNew(data.seenAt)(p)).length : 0

  const openUpdates = () => {
    if (live && !user) return needSignIn('get updates from your favourite places')
    setUpdatesSince(data.seenAt)
    patch(() => ({ seenAt: new Date().toISOString() }))
    if (live) api.markUpdatesSeen(user.id).catch(() => {})
  }

  const startPost = () => {
    if (!supabase) return toast('Posting works once the app is connected to the database.')
    if (!user) return needSignIn('post')
    setComposing(true)
  }

  const submitPost = async ({ venueId, ...form }) => {
    const venue = (data.postVenues || data.venues).find((v) => v.id === venueId)
    await api.createPost({ userId: user.id, venue, ...form })
    setComposing(false)
    toast('Posted. Thanks for sharing!')
    setTab('home')
    reload()
  }

  const go = (k) => {
    if (k === 'post') return startPost()
    setTab(k)
    window.scrollTo(0, 0)
  }

  let page
  if (error) page = <p className="empty">{error}</p>
  else if (!data) page = <p className="empty">Loading what’s on…</p>
  else if (tab === 'map') page = <MapView venues={data.venues} posts={data.posts} filter={filter} setFilter={setFilter} onOpen={showPost} isFav={isFav} onFavourite={favourite} />
  else if (tab === 'journal') page = <Journal articles={data.articles} latest={latest} onOpenArticle={setOpenArticle} />
  else if (tab === 'me') page = <Profile user={user} name={name} posts={data.posts} saved={data.saved} venueOf={venueOf} commentCount={commentCount} onOpen={showPost} toast={toast} />
  else page = <Home posts={data.posts} venueOf={venueOf} commentCount={commentCount} filter={filter} setFilter={setFilter} onOpen={showPost} sample={data.sample} />

  const post = data && openPost && data.posts.find((p) => p.id === openPost)
  const article = data && openArticle && data.articles.find((a) => a.id === openArticle)

  return (
    <>
      <div className="wrap">
        <header className="mast">
          <h1>Third Space</h1><p>Dublin, right now</p>
          {data && (
            <button className="bell" aria-label={unread ? `Updates, ${unread} new` : 'Updates'} onClick={openUpdates}>
              <svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
              {!!unread && <b>{unread > 9 ? '9+' : unread}</b>}
            </button>
          )}
        </header>
        <main>{page}</main>
      </div>
      <nav className="tabs" aria-label="Main">
        {TABS.map(([k, label, icon]) =>
          k === 'post' ? (
            <button key={k} className="add" aria-label="Post a photo or video" onClick={startPost}>
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          ) : (
            <button key={k} className="tab" aria-current={tab === k ? 'page' : undefined} onClick={() => go(k)}>
              <svg viewBox="0 0 24 24">{icon}</svg>{label}
            </button>
          ),
        )}
      </nav>
      {post && (
        <PostSheet
          p={post}
          venue={venueOf(post)}
          mine={post.userId === (user?.id ?? 'you')}
          liked={data.liked.has(post.id)}
          saved={data.saved.has(post.id)}
          fav={isFav(post.venueId)}
          onFavourite={() => favourite(post.venueId)}
          comments={live ? data.comments[post.id] : data.comments[post.id] || []}
          canPost={!live || !!user}
          onLike={() => toggle(post, 'liked', api.setLike, 'like posts')}
          onSave={() => toggle(post, 'saved', api.setSave, 'save posts')}
          onComment={(body, verdict) => comment(post, body, verdict)}
          onAllowComments={(allow) => allowComments(post, allow)}
          onNeedSignIn={() => needSignIn('comment')}
          onClose={() => setOpenPost(null)}
        />
      )}
      {article && (
        <ArticleSheet a={article} post={latest(article.venueId)} onClose={() => setOpenArticle(null)} onOpenPost={showPost} />
      )}
      {updatesSince !== undefined && (
        <Updates
          posts={updates}
          isNew={isNew(updatesSince)}
          places={data.venues.filter((v) => isFav(v.id))}
          onOpen={(id) => { setUpdatesSince(undefined); showPost(id) }}
          onUnfavourite={favourite}
          onClose={() => setUpdatesSince(undefined)}
        />
      )}
      {composing && <NewPost venues={data.postVenues || data.venues} onSubmit={submitPost} onClose={() => setComposing(false)} />}
      {toastText && <div className="toast" role="status">{toastText}</div>}
    </>
  )
}
