import { supabase } from './supabase'
import { sampleData } from './sample'
import { normVibe, palette, ratioFor } from './util'

const ok = (res) => (res.error ? [] : res.data || [])

async function usernames(ids) {
  ids = [...new Set(ids.filter(Boolean))]
  if (!ids.length) return {}
  const rows = ok(await supabase.from('profiles').select('id, username, avatar_url').in('id', ids))
  const map = {}
  rows.forEach((u) => (map[u.id] = { name: u.username || 'someone', avatar: u.avatar_url }))
  return map
}

function normVenue(v) {
  return { id: v.id, name: v.name, address: v.address || '', category: v.category || '', tags: v.tags || [], lat: Number(v.latitude), lng: Number(v.longitude) }
}

function normArticle(a) {
  return {
    id: a.id, venueId: a.venue_id, title: a.title, dek: a.dek || '', author: a.author_name || 'Third Space',
    rating: a.rating || 0, minutes: a.read_minutes || 3, body: String(a.body || '').split(/\n\s*\n/).filter(Boolean),
  }
}

// "feed" hides who made anonymous posts. Before it exists, read posts directly.
async function loadPosts() {
  const latest = (from) => supabase.from(from).select('*').order('created_at', { ascending: false }).limit(100)
  const res = await latest('feed')
  return res.error ? latest('posts') : res
}

const noFavourites = { favourites: new Map(), seenAt: null }

// Places the person has favourited (venue id → when) and when they last opened Updates.
// Both are empty until the favourite-places SQL has been run.
async function loadFavourites(user) {
  if (!user) return noFavourites
  const [f, r] = await Promise.all([
    supabase.from('favourite_places').select('venue_id, created_at').eq('user_id', user.id).then(ok),
    supabase.from('update_reads').select('seen_at').eq('user_id', user.id).then(ok),
  ])
  return { favourites: new Map(f.map((x) => [x.venue_id, x.created_at])), seenAt: r[0]?.seen_at || null }
}

export async function loadAll(user) {
  if (!supabase) return { ...sampleData(), ...noFavourites }
  const [v, p, a, fav] = await Promise.all([
    supabase.from('venues').select('*'),
    loadPosts(),
    supabase.from('journal_articles').select('*').order('published_at', { ascending: false }),
    loadFavourites(user),
  ])
  if (v.error) throw v.error
  if (p.error) throw p.error
  const venues = v.data.map(normVenue).filter((x) => !isNaN(x.lat) && !isNaN(x.lng))
  const articles = ok(a).map(normArticle)

  if (!p.data.length) {
    // Nothing posted yet: show sample posts, but post to the real venues.
    const s = sampleData()
    return { ...s, ...fav, articles: articles.length ? articles : s.articles, postVenues: venues }
  }

  // Anonymous posts come back with no author_id, except to the person who posted them.
  p.data.forEach((r) => { if ('author_id' in r) r.user_id = r.author_id })
  const ids = p.data.map((r) => r.id)
  const [users, likes, comments, saves] = await Promise.all([
    usernames(p.data.map((r) => r.user_id)),
    supabase.from('likes').select('post_id, user_id').in('post_id', ids).then(ok),
    supabase.from('comments').select('post_id').in('post_id', ids).then(ok),
    user ? supabase.from('saves').select('post_id').eq('user_id', user.id).then(ok) : [],
  ])
  const count = (rows) => rows.reduce((m, r) => ((m[r.post_id] = (m[r.post_id] || 0) + 1), m), {})
  const likeCount = count(likes)
  const commentCount = count(comments)

  const posts = p.data.map((r, i) => ({
    id: r.id,
    venueId: r.venue_id,
    vibe: normVibe(r.vibe_tag),
    caption: r.caption || '',
    who: r.anonymous ? 'Anonymous' : users[r.user_id]?.name || 'someone',
    avatar: r.anonymous ? null : users[r.user_id]?.avatar,
    userId: r.user_id,
    createdAt: r.created_at,
    likes: likeCount[r.id] || 0,
    commentCount: commentCount[r.id] || 0,
    ar: ratioFor(i),
    colors: palette(r.id),
    mediaUrl: r.media_url,
    mediaType: r.media_type || (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(r.media_url || '') ? 'video' : 'image'),
    allowComments: r.allow_comments !== false,
    anonymous: !!r.anonymous,
  }))

  return {
    venues, posts, articles, comments: {},
    liked: new Set(likes.filter((l) => user && l.user_id === user.id).map((l) => l.post_id)),
    saved: new Set(saves.map((s) => s.post_id)),
    ...fav,
    sample: false,
  }
}

export async function loadComments(postId) {
  const rows = ok(await supabase.from('comments').select('*').eq('post_id', postId).order('created_at'))
  const users = await usernames(rows.map((r) => r.user_id))
  return rows.map((r) => ({ id: r.id, postId, who: users[r.user_id]?.name || 'someone', verdict: r.verdict, body: r.body, createdAt: r.created_at }))
}

export async function addComment({ postId, userId, body, verdict }) {
  const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: userId, body, verdict: verdict || null })
  if (error) throw error
}

export async function setLike(postId, userId, on) {
  const q = supabase.from('likes')
  const { error } = on ? await q.insert({ post_id: postId, user_id: userId }) : await q.delete().match({ post_id: postId, user_id: userId })
  if (error) throw error
}

export async function setSave(postId, userId, on) {
  const q = supabase.from('saves')
  const { error } = on ? await q.insert({ post_id: postId, user_id: userId }) : await q.delete().match({ post_id: postId, user_id: userId })
  if (error) throw error
}

export async function setFavourite(venueId, userId, on) {
  const q = supabase.from('favourite_places')
  const { error } = on ? await q.insert({ venue_id: venueId, user_id: userId }) : await q.delete().match({ venue_id: venueId, user_id: userId })
  if (error) throw error
}

export async function markUpdatesSeen(userId) {
  const { error } = await supabase.from('update_reads').upsert({ user_id: userId, seen_at: new Date().toISOString() })
  if (error) throw error
}

export async function setAllowComments(postId, allow) {
  const { error } = await supabase.from('posts').update({ allow_comments: allow }).eq('id', postId)
  if (error) throw error
}

// hideName is how many hours to keep the poster's name hidden, 'forever', or null.
export async function createPost({ userId, venue, file, vibe, caption, allowComments, hideName }) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  // Anonymous files go in a shared folder so their address doesn't name the poster.
  const path = hideName ? `anon/${crypto.randomUUID()}.${ext}` : `${userId}/${Date.now()}.${ext}`
  const up = await supabase.storage.from('media').upload(path, file, { contentType: file.type })
  if (up.error) throw up.error
  const mediaUrl = supabase.storage.from('media').getPublicUrl(path).data.publicUrl
  const row = {
    user_id: userId, venue_id: venue.id, media_url: mediaUrl, caption,
    // Each post stores where it was taken, so it uses the venue's position.
    latitude: venue.lat, longitude: venue.lng,
    media_type: file.type.startsWith('video') ? 'video' : 'image',
    allow_comments: allowComments, vibe_tag: vibe,
    expires_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
  }
  if (hideName) row.name_hidden_until = hideName === 'forever' ? 'infinity' : new Date(Date.now() + hideName * 3600 * 1000).toISOString()
  // The original posts table limits some columns to its own words: "photo"
  // rather than "image", and "quiet" for the Dead vibe. Retry with those.
  const fallbacks = { media_type: { image: 'photo' }, vibe_tag: { dead: 'quiet' } }
  for (;;) {
    const { error } = await supabase.from('posts').insert(row)
    if (!error) return
    const col = error.code === '23514' && Object.keys(fallbacks).find((c) => error.message.includes(c))
    const alt = col && fallbacks[col][row[col]]
    if (!alt) throw error
    row[col] = alt
  }
}
