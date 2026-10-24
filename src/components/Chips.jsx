import { VIBES } from '../lib/util'

export default function Chips({ filter, setFilter }) {
  const opts = [['all', 'All'], ...Object.entries(VIBES).map(([k, v]) => [k, v.label])]
  return (
    <div className="chips" role="group" aria-label="Filter by vibe">
      {opts.map(([k, label]) => (
        <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>
      ))}
    </div>
  )
}
