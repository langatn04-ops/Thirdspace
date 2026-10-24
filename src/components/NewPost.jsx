import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import { VIBES } from '../lib/util'

const HIDE_FOR = [[3, 'For 3 hours'], [6, 'For 6 hours'], [24, 'Until tomorrow'], ['forever', 'Forever']]

export default function NewPost({ venues, onSubmit, onClose }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [venueId, setVenueId] = useState('')
  const [vibe, setVibe] = useState('')
  const [caption, setCaption] = useState('')
  const [allow, setAllow] = useState(true)
  const [hideName, setHideName] = useState(null)
  const [busy, setBusy] = useState(false)
  const [shrinking, setShrinking] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!file) return setPreview(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const sorted = [...venues].sort((a, b) => a.name.localeCompare(b.name))
  const ready = file && venueId && vibe

  const submit = async (e) => {
    e.preventDefault()
    if (!ready) return setErr('Add a photo or video, pick the place and choose a vibe.')
    const tooBig = file.size > 50 * 1024 * 1024
    if (tooBig && !file.type.startsWith('video')) return setErr('That photo is over 50 MB. Try a smaller one.')
    setBusy(true)
    setErr('')
    try {
      let upload = file
      if (tooBig) {
        // Loaded only when needed, since the video tools are large.
        const { shrinkVideo } = await import('../lib/shrink')
        setShrinking(0)
        upload = await shrinkVideo(file, (p) => setShrinking(p))
        setShrinking(null)
      }
      await onSubmit({ file: upload, venueId, vibe, caption: caption.trim(), allowComments: allow, hideName })
    } catch (e) {
      setErr(e.message || 'Something went wrong. Try again.')
      setShrinking(null)
      setBusy(false)
    }
  }

  return (
    <Sheet label="New post" onClose={onClose}>
      <div className="pt">
        <b>New post</b>
        <button className="x" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <form className="form" onSubmit={submit}>
        <label className="drop">
          {preview && (file.type.startsWith('video') ? <video src={preview} muted autoPlay loop playsInline /> : <img src={preview} alt="" />)}
          {!preview && <span>Tap to add a photo or video<br /><small>Show people what it’s like right now</small></span>}
          <input type="file" accept="image/*,video/*" aria-label="Photo or video" onChange={(e) => setFile(e.target.files[0] || null)} />
        </label>
        <label className="field">
          Where are you?
          <select value={venueId} onChange={(e) => setVenueId(e.target.value)}>
            <option value="">Choose a place</option>
            {sorted.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
        <div className="field">
          What’s the vibe?
          <div className="vr" style={{ margin: 0, flexWrap: 'wrap' }}>
            {Object.entries(VIBES).map(([k, v]) => (
              <button type="button" key={k} className="chip" aria-pressed={vibe === k} onClick={() => setVibe(k)}>{v.label}</button>
            ))}
          </div>
        </div>
        <label className="field">
          Caption
          <textarea value={caption} maxLength={300} placeholder="What’s happening?" onChange={(e) => setCaption(e.target.value)} />
        </label>
        <div className="own" style={{ margin: 0 }}>
          <span><b>Allow comments</b><br /><small>You can change this later.</small></span>
          <button type="button" className="sw" role="switch" aria-checked={allow} aria-label="Allow comments" onClick={() => setAllow(!allow)} />
        </div>
        <div className="own" style={{ margin: 0 }}>
          <span><b>Post anonymously</b><br /><small>Hide your name so nobody knows you’re here right now.</small></span>
          <button type="button" className="sw" role="switch" aria-checked={!!hideName} aria-label="Post anonymously" onClick={() => setHideName(hideName ? null : 6)} />
        </div>
        {hideName && (
          <div className="field">
            Hide my name
            <div className="vr" style={{ margin: 0, flexWrap: 'wrap' }}>
              {HIDE_FOR.map(([k, label]) => (
                <button type="button" key={k} className="chip" aria-pressed={hideName === k} onClick={() => setHideName(k)}>{label}</button>
              ))}
            </div>
            <small>{hideName === 'forever' ? 'Your name will never be shown on this post.' : 'After that, your name appears on the post.'}</small>
          </div>
        )}
        {err && <p className="err">{err}</p>}
        <button className="save primary" style={{ margin: 0, padding: 14 }} disabled={busy}>{shrinking != null ? `Shrinking video… ${Math.round(shrinking * 100)}%` : busy ? 'Posting…' : 'Share'}</button>
      </form>
    </Sheet>
  )
}
