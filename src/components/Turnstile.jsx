import { useEffect, useRef } from 'react'

// Cloudflare Turnstile: a free, usually invisible "are you a person?" check
// that stops bots making accounts. Only shown once VITE_TURNSTILE_SITE_KEY is
// set in Vercel (and CAPTCHA protection is switched on in Supabase).
export const TURNSTILE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

let loading
function loadScript() {
  loading ||= new Promise((done, fail) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => done(window.turnstile)
    s.onerror = fail
    document.head.appendChild(s)
  })
  return loading
}

// Calls onToken with a fresh token, or null when it expires. Changing resetKey
// asks for a new token (each one can only be used once).
export default function Turnstile({ onToken, resetKey }) {
  const box = useRef(null)
  const id = useRef(null)
  useEffect(() => {
    if (!TURNSTILE_KEY) return
    let gone = false
    loadScript().then((ts) => {
      if (gone || !box.current) return
      id.current = ts.render(box.current, {
        sitekey: TURNSTILE_KEY,
        callback: onToken,
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
      })
    }).catch(() => onToken(null))
    return () => {
      gone = true
      if (id.current != null) window.turnstile?.remove(id.current)
      id.current = null
    }
  }, [])
  useEffect(() => {
    if (resetKey && id.current != null) { onToken(null); window.turnstile?.reset(id.current) }
  }, [resetKey])
  return TURNSTILE_KEY ? <div ref={box} className="captcha" /> : null
}
