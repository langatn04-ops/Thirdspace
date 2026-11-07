import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Chips from './Chips'
import Media from './Media'
import { FavButton } from './PostSheet'
import { VIBES, categoryIcon } from '../lib/util'
import { STALE_COLOR, placeVibes, vibeSummary } from '../lib/vibes'
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

  // Each venue's vibe right now, from its posts in the last 90 minutes.
  // Places with only older posts show grey, with when they last had one.
  const vibes = useMemo(() => placeVibes(posts), [posts])
  const latest = useMemo(() => Object.fromEntries(Object.entries(vibes).map(([id, s]) => [id, s.latest])), [vibes])
  const liveVibe = (id) => (vibes[id]?.live ? vibes[id].vibe : null)

  const results = useMemo(() => searchPlaces(venues, latest, query, interest), [venues, latest, query, interest])
  const vibeOk = (v) => filter === 'all' || liveVibe(v.id) === filter
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
      const vibe = liveVibe(v.id)
      const cls = ['pin', vibe ? '' : 'none', vibe === 'lit' ? 'lit' : '', sel === v.id ? 'on' : ''].join(' ')
      const color = vibe ? VIBES[vibe].color : STALE_COLOR
      const size = vibe ? 36 : 26
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
  }, [shown, vibes, sel])

  const counts = Object.keys(VIBES).map((k) => [k, venues.filter((v) => liveVibe(v.id) === k).length])
  const venue = venues.find((v) => v.id === sel)
  const p = venue && latest[venue.id]
  const now = venue && vibeSummary(vibes[venue.id])

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
        <span style={{ '--vc': STALE_COLOR }}><i />Nothing in the last 90 min</span>
      </div>
      {found && (
        <p className="found">{found.length ? `${found.length} ${found.length === 1 ? 'place' : 'places'} found` : 'No places match that yet. Try another word or interest.'}</p>
      )}
      {venue && (
        <div className="peek" style={{ '--vc': now.color }}>
          {p && <Media p={p} ar="4/5" />}
          <div>
            <span className={'tag' + (now.live ? '' : ' stale')}><i />{now.text}</span>
            <h3>{venue.name}</h3>
            <p>{p ? p.caption : `${venue.address}. Be the first to say what it’s like.`}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {p && <button className="save" onClick={() => onOpen(p.id)}>Open post</button>}
              <FavButton on={isFav(venue.id)} onClick={() => onFavourite(venue.id)} />
            </div>
          </div>
        </div>
      )}
      {found?.map(({ v }) => {
        if (v.id === sel) return null
        const s = vibeSummary(vibes[v.id])
        return (
          <button key={v.id} className="place" onClick={() => pick(v.id)} style={{ '--vc': s.color }}>
            <span className="pi">{categoryIcon(v.category)}</span>
            <span>
              <b>{v.name}</b>
              <small>{v.address}</small>
            </span>
            <span className={'tag' + (s.live ? '' : ' stale')}><i />{s.text}</span>
          </button>
        )
      })}
    </>
  )
}
