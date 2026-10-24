import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Chips from './Chips'
import Media from './Media'
import { FavButton } from './PostSheet'
import { VIBES, categoryIcon, timeAgo } from '../lib/util'

const DUBLIN = [53.3435, -6.2655]

export default function MapView({ venues, posts, filter, setFilter, onOpen, isFav, onFavourite }) {
  const el = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)
  const [sel, setSel] = useState(null)

  // Each venue takes the vibe of its most recent post (posts arrive newest first).
  const latest = useMemo(() => {
    const m = {}
    posts.forEach((p) => { if (!m[p.venueId]) m[p.venueId] = p })
    return m
  }, [posts])

  const shown = venues.filter((v) => filter === 'all' || latest[v.id]?.vibe === filter)

  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: false }).setView(DUBLIN, 14)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    return () => map.current.remove()
  }, [])

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
      <p className="lede">Tap a pin to see what’s happening there now.</p>
      <Chips filter={filter} setFilter={setFilter} />
      <div className="map" ref={el} aria-label="Map of Dublin venues" />
      <div className="leg">
        {counts.map(([k, n]) => (
          <span key={k} style={{ '--vc': VIBES[k].color }}><i />{VIBES[k].label} <b>{n}</b></span>
        ))}
        <span style={{ '--vc': '#aeaeb2' }}><i />No posts yet</span>
      </div>
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
    </>
  )
}
