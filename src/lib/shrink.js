import { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, Quality } from 'mediabunny'

export const MAX_BYTES = 50 * 1024 * 1024
// Aim under the limit to leave room for the sound and the file's own overhead.
const TARGET_BYTES = 44 * 1024 * 1024
const LONG_SIDE = 1280

const even = (n) => Math.max(2, Math.round(n / 2) * 2)

// Re-encodes a video in the browser so it fits under the upload limit:
// at most 1280 pixels on its long side, with the bitrate set from its length.
// The sound is copied as it is. Throws an error worded for the person posting.
export async function shrinkVideo(file, onProgress) {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS })
  const fail = () => new Error('That video is too big and this browser couldn’t shrink it. Try a shorter clip.')
  let seconds, audio
  try {
    seconds = await input.computeDuration()
    audio = await input.getPrimaryAudioTrack()
  } catch (e) {
    console.warn('Could not read video', e)
    throw fail()
  }
  const audioBits = audio ? 256_000 : 0
  const videoBits = Math.min(4_000_000, Math.floor((TARGET_BYTES * 8) / seconds - audioBits))
  if (videoBits < 300_000) throw new Error(`That video is too long to fit. Try a clip under ${Math.floor((TARGET_BYTES * 8) / (300_000 + audioBits) / 60)} minutes.`)

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() })
  const conversion = await Conversion.init({
    input,
    output,
    video: (track) => {
      const scale = Math.min(1, LONG_SIDE / Math.max(track.displayWidth, track.displayHeight))
      return {
        width: even(track.displayWidth * scale),
        height: even(track.displayHeight * scale),
        fit: 'contain',
        codec: 'avc',
        quality: new Quality({ bitrate: videoBits }),
        forceTranscode: true,
      }
    },
    showWarnings: false,
  })
  if (!conversion.isValid || !conversion.utilizedTracks.some((t) => t.isVideoTrack())) {
    console.warn('Could not convert video', conversion.discardedTracks.map((d) => d.reason))
    throw fail()
  }
  if (onProgress) conversion.onProgress = onProgress
  try {
    await conversion.execute()
  } catch (e) {
    console.warn('Video conversion failed', e)
    throw fail()
  }
  const name = file.name.replace(/\.[^.]*$/, '') + '.mp4'
  const small = new File([output.target.buffer], name, { type: 'video/mp4' })
  if (small.size > MAX_BYTES) throw new Error('That video is still over 50 MB after shrinking. Try a shorter clip.')
  return small
}
