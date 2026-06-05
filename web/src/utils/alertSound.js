export const playUrgenceSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const gain = ctx.createGain()
    gain.gain.value = 0.9
    gain.connect(ctx.destination)

    const beep = (start, freq) => {
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = freq
      osc.connect(gain)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + 0.18)
    }

    beep(0, 980)
    beep(0.26, 1180)
    beep(0.52, 980)
    setTimeout(() => ctx.close(), 1200)
  } catch {
    // Browser may block audio before user interaction.
  }
}
