async function closeQuietly(context: AudioContext) {
  try {
    if (context.state !== 'closed') await context.close()
  } catch {
    // Sound is optional; a blocked audio device must never interrupt practice.
  }
}

/** A brief, quiet sine tone, called only by an accepted self-report gesture. */
export async function playPracticeSound(): Promise<void> {
  let context: AudioContext | undefined
  let resumeTimeout: ReturnType<typeof setTimeout> | undefined
  try {
    if (typeof window.AudioContext !== 'function') return
    context = new window.AudioContext()
    if (context.state === 'suspended')
      await Promise.race([
        context.resume(),
        new Promise<never>((_resolve, reject) => {
          resumeTimeout = setTimeout(
            () => reject(new Error('Audio stayed paused.')),
            1000,
          )
        }),
      ])
    if (context.state !== 'running') {
      await closeQuietly(context)
      return
    }
    const audio = context
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    const now = audio.currentTime
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(523.25, now)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.035, now + 0.015)
    gain.gain.linearRampToValueAtTime(0, now + 0.18)
    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.onended = () => {
      void closeQuietly(audio)
    }
    oscillator.start(now)
    oscillator.stop(now + 0.18)
  } catch {
    if (context) await closeQuietly(context)
  } finally {
    if (resumeTimeout !== undefined) clearTimeout(resumeTimeout)
  }
}
