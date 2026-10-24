import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Chips from './Chips'
import Media from './Media'
import { FavButton } from './PostSheet'
import { VIBES, categoryIcon, timeAgo } from '../lib/util'
import { INTERESTS, searchPlaces } from '../lib/search'

const DUBLIN = [53.3435, -6.2655]

export default function MapView({ venues, posts, filter, setFilter, onOpen, isFav, onFavourite, focusSearch, focusVenue }) {
  const el = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)
  const [sel, setSel] = useState(null)
  const [query, setQuery] = useState('')
  const [interest, setInterest] = useState('')
  const input = useRef(null)

  // Each venue takes the vibe of its most recent post (posts arrive newest first).
  const latest = useMemo(() => {
    const m = {}
    posts.forEach((p) => { if (!m[p.venueId]) m[p.venueId] = p })
    return m
  }, [posts])

  const results = useMemo(() => searchPlaces(venues, latest, query, interest), [venues, latest, query, interest])
  const vibeOk = (v) => filter === 'all' || latest[v.id]?.vibe === filter
  const found = results && results.filter(({ v }) => vibeOk(v))
  const shown = useMemo(() => (found ? found.map((r) => r.v) : venues.filter(vibeOk)), [found, venues, filter, latest])

  useEffect(() => { if (focusSearch) input.current?.focus() }, [focusSearch])

  // Zoom the map to fit what the search found.
  useEffect(() => {
    if (!found?.length) return
    map.current.fitBounds(L.latLngBounds(found.map(({ v }) => [v.lat, v.lng])), { padding: [40, 40], maxZoom: 16 })
  }, [query, interest, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (id) => {
    setSel(id)
    el.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: false }).setView(DUBLIN, 14)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    return () => map.current.remove()
  }, [])

  // Opened to show one place, from "Surprise me".
  useEffect(() => {
    const v = focusVenue && venues.find((x) => x.id === focusVenue)
    if (!v) return
    setSel(v.id)
    map.current.setView([v.lat, v.lng], 16)
  }, [focusVenue]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    layer.current.clearLayers()
    shown.forEach((v) => {
      const p = latest[v.id]
      const cls = ['pin', p ? '' : 'none', p?.vibe === 'lit' ? 'lit' : '', sel === v.id ? 'on' : ''].join(' ')
      const color = p ? VIBES[p.vibe].color : '#aeaeb2'
      const size = p ? 36 : 26
      const icon = L.divIcon({
        className: 'ts-pin',
        html: `<div class="${cls}" style="--vc:${color}">${categoryIcon(v.category)}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
      L.marker([v.lat, v.lng], { icon, title: v.name, riseOnHover: true, zIndexOffset: sel === v.id ? 1000 : 0 })
        .on('click', () => setSel(v.id))
        .addTo(layer.current)
    })
  }, [shown, latest, sel])

  const counts = Object.keys(VIBES).map((k) => [k, venues.filter((v) => latest[v.id]?.vibe === k).length])
  const venue = venues.find((v) => v.id === sel)
  const p = venue && latest[venue.id]

  return (
    <>
      <h2 className="sec top">Around you</h2>
      <p className="lede">Search for a place or what you’re in the mood for, or tap a pin.</p>
      <form className="find" role="search" onSubmit={(e) => { e.preventDefault(); input.current.blur() }}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <input ref={input} type="search" value={query} placeholder="Try “indian food” or “chill walk”" aria-label="Search places"
          onChange={(e) => setQuery(e.target.value)} />
        {(query || interest) && <button type="button" className="link" onClick={() => { setQuery(''); setInterest('') }}>Clear</button>}
      </form>
      <div className="chips" role="group" aria-label="Interests" style={{ paddingBottom: 0 }}>
        {INTERESTS.map(([k, label]) => (
          <button key={k} className="chip" aria-pressed={interest === k} onClick={() => setInterest(interest === k ? '' : k)}>{label}</button>
        ))}
      </div>
      <Chips filter={filter} setFilter={setFilter} />
      <div className="map" ref={el} aria-label="Map of Dublin venues" />
      <div className="leg">
        {counts.map(([k, n]) => (
          <span key={k} style={{ '--vc': VIBES[k].color }}><i />{VIBES[k].label} <b>{n}</b></span>
        ))}
        <span style={{ '--vc': '#aeaeb2' }}><i />No posts yet</span>
      </div>
      {found && (
        <p className="found">{found.length ? `${found.length} ${found.length === 1 ? 'place' : 'places'} found` : 'No places match that yet. Try another word or interest.'}</p>
      )}
      {venue && (
        <div className="peek" style={{ '--vc': p ? VIBES[p.vibe].color : '#aeaeb2' }}>
          {p && <Media p={p} ar="4/5" />}
          <div>
            <span className="tag"><i />{p ? `${VIBES[p.vibe].label} · ${timeAgo(p.createdAt)}` : 'No posts yet'}</span>
            <h3>{venue.name}</h3>
            <p>{p ? p.caption : `${venue.address}. Be the first to say what it’s like.`}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {p && <button className="save" onClick={() => onOpen(p.id)}>Open post</button>}
              <FavButton on={isFav(venue.id)} onClick={() => onFavourite(venue.id)} />
            </div>
          </div>
        </div>
      )}
      {found?.map(({ v, p: lp }) => v.id !== sel && (
        <button key={v.id} className="place" onClick={() => pick(v.id)} style={{ '--vc': lp ? VIBES[lp.vibe].color : '#aeaeb2' }}>
          <span className="pi">{categoryIcon(v.category)}</span>
          <span>
            <b>{v.name}</b>
            <small>{v.address}</small>
          </span>
          <span className="tag"><i />{lp ? `${VIBES[lp.vibe].label} · ${timeAgo(lp.createdAt)}` : 'No posts yet'}</span>
        </button>
      ))}
    </>
  )
}
