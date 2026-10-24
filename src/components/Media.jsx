import { backdrop } from '../lib/util'

// A post's photo or video. Sample posts have no file, so they show a colour backdrop.
export default function Media({ p, ar, controls, running, children }) {
  const fake = !p.mediaUrl
  const cls = 'ph' + (fake ? ' fake' : '') + (running ? ' run' : '')
  return (
    <div className={cls} style={{ '--ar': ar || p.ar, ...backdrop(p.colors) }}>
      {p.mediaUrl &&
        (p.mediaType === 'video' ? (
          controls ? (
            <video src={p.mediaUrl} controls playsInline preload="metadata" />
          ) : (
            <video src={p.mediaUrl} muted loop autoPlay playsInline preload="metadata" />
          )
        ) : (
          <img src={p.mediaUrl} alt={p.caption} loading="lazy" />
        ))}
      {children}
    </div>
  )
}
