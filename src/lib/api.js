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
  return { id: v.id, name: v.name, address: v.address || '', category: v.category || '', lat: Number(v.latitude), lng: Number(v.longitude) }
}

function normArticle(a) {
  return {
    id: a.id, venueId: a.venue_id, title: a.title, dek: a.dek || '', author: a.author_name || 'Third Space',
    rating: a.rating || 0, minutes: a.read_minutes || 3, body: String(a.body || '').split(/\n\s*\n/).filter(Boolean),
  }
}

export async function loadAll(user) {
  if (!supabase) return sampleData()
  const [v, p, a] = await Promise.all([
    supabase.from('venues').select('*'),
    supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('journal_articles').select('*').order('published_at', { ascending: false }),
  ])
  if (v.error) throw v.error
  if (p.error) throw p.error
  const venues = v.data.map(normVenue).filter((x) => !isNaN(x.lat) && !isNaN(x.lng))
  const articles = ok(a).map(normArticle)

  if (!p.data.length) {
    // Nothing posted yet: show sample posts, but post to the real venues.
    const s = sampleData()
    return { ...s, articles: articles.length ? articles : s.articles, postVenues: venues }
  }

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
    who: users[r.user_id]?.name || 'someone',
    avatar: users[r.user_id]?.avatar,
    userId: r.user_id,
    createdAt: r.created_at,
    likes: likeCount[r.id] || 0,
    commentCount: commentCount[r.id] || 0,
    ar: ratioFor(i),
    colors: palette(r.id),
    mediaUrl: r.media_url,
    mediaType: r.media_type || (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(r.media_url || '') ? 'video' : 'image'),
    allowComments: r.allow_comments !== false,
  }))

  return {
    venues, posts, articles, comments: {},
    liked: new Set(likes.filter((l) => user && l.user_id === user.id).map((l) => l.post_id)),
    saved: new Set(saves.map((s) => s.post_id)),
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

export async function setAllowComments(postId, allow) {
  const { error } = await supabase.from('posts').update({ allow_comments: allow }).eq('id', postId)
  if (error) throw error
}

export async function createPost({ userId, venueId, file, vibe, caption, allowComments }) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${userId}/${Date.now()}.${ext}`
  const up = await supabase.storage.from('media').upload(path, file, { contentType: file.type })
  if (up.error) throw up.error
  const mediaUrl = supabase.storage.from('media').getPublicUrl(path).data.publicUrl
  const row = {
    user_id: userId, venue_id: venueId, media_url: mediaUrl, caption,
    media_type: file.type.startsWith('video') ? 'video' : 'image',
    allow_comments: allowComments, vibe_tag: vibe,
    expires_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
  }
  let { error } = await supabase.from('posts').insert(row)
  // Older databases only accept "quiet" for the Dead vibe.
  if (error && error.code === '23514' && vibe === 'dead') ({ error } = await supabase.from('posts').insert({ ...row, vibe_tag: 'quiet' }))
  if (error) throw error
}
