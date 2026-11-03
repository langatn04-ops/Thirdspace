import { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output } from 'mediabunny'

// Phones hide extra details inside photos and videos, including the exact GPS
// spot where they were taken, which could give away someone's home. These make
// a clean copy with only the picture and sound, before anything is uploaded.

const LONG_SIDE = 2560

// Redraws the photo, which keeps only the pixels. The browser turns it the
// right way up first, since the "which way up" note is dropped too.
export async function cleanPhoto(file) {
  let img
  try {
    img = await createImageBitmap(file)
  } catch (e) {
    console.warn('Could not read photo', e)
    throw new Error('This browser can’t read that photo. Try a JPG or PNG.')
  }
  const scale = Math.min(1, LONG_SIDE / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff' // see-through parts of a PNG would otherwise turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  img.close?.()
  const blob = await new Promise((done) => canvas.toBlob(done, 'image/jpeg', 0.9))
  if (!blob) throw new Error('Something went wrong getting that photo ready. Try again.')
  return new File([blob], file.name.replace(/\.[^.]*$/, '') + '.jpg', { type: 'image/jpeg' })
}

// Copies the video and sound into a new file without re-encoding (so it's
// quick and looks the same), leaving out every hidden detail.
export async function cleanVideo(file) {
  const fail = () => new Error('This browser couldn’t get that video ready. Try another clip, or post from your phone’s browser.')
  try {
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS })
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() })
    const conversion = await Conversion.init({ input, output, tags: {}, showWarnings: false })
    if (!conversion.isValid || !conversion.utilizedTracks.some((t) => t.isVideoTrack())) {
      console.warn('Could not copy video', conversion.discardedTracks.map((d) => d.reason))
      throw fail()
    }
    await conversion.execute()
    return new File([output.target.buffer], file.name.replace(/\.[^.]*$/, '') + '.mp4', { type: 'video/mp4' })
  } catch (e) {
    console.warn('Video copy failed', e)
    throw fail()
  }
}
