import { afterEach, expect, test, vi } from 'vitest'
import { playPracticeSound } from './practiceSound'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function fakeAudio() {
  const oscillator = {
    type: 'sine',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as (() => void) | null,
  }
  const gain = {
    gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  }
  const audio = {
    state: 'running',
    currentTime: 2,
    destination: {},
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gain),
    resume: vi.fn(async () => {
      audio.state = 'running'
    }),
    close: vi.fn(async () => {
      audio.state = 'closed'
    }),
  }
  const constructor = vi.fn(function () {
    return audio
  })
  vi.stubGlobal('AudioContext', constructor)
  return { audio, oscillator, gain, constructor }
}

test('plays one short quiet sine tone and closes its audio context when it ends', async () => {
  const { audio, oscillator, gain, constructor } = fakeAudio()
  await playPracticeSound()
  expect(constructor).toHaveBeenCalledTimes(1)
  expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(523.25, 2)
  expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0, 2)
  expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.035, 2.015)
  expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 2.18)
  expect(oscillator.start).toHaveBeenCalledWith(2)
  expect(oscillator.stop).toHaveBeenCalledWith(2.18)
  expect(audio.close).not.toHaveBeenCalled()
  oscillator.onended!()
  expect(audio.close).toHaveBeenCalledTimes(1)
})

test('resumes suspended audio before playing', async () => {
  const { audio, oscillator } = fakeAudio()
  audio.state = 'suspended'
  await playPracticeSound()
  expect(audio.resume).toHaveBeenCalledTimes(1)
  expect(oscillator.start).toHaveBeenCalledTimes(1)
  oscillator.onended!()
})

test('unsupported audio is a silent no-op', async () => {
  vi.stubGlobal('AudioContext', undefined)
  await expect(playPracticeSound()).resolves.toBeUndefined()
})

test('audio construction failure never interrupts practice', async () => {
  vi.stubGlobal(
    'AudioContext',
    vi.fn(function () {
      throw new Error('No device')
    }),
  )
  await expect(playPracticeSound()).resolves.toBeUndefined()
})

test('a rejected resume closes the context without playing', async () => {
  const { audio, oscillator } = fakeAudio()
  audio.state = 'suspended'
  audio.resume.mockRejectedValue(new Error('Blocked'))
  await expect(playPracticeSound()).resolves.toBeUndefined()
  expect(audio.close).toHaveBeenCalledTimes(1)
  expect(oscillator.start).not.toHaveBeenCalled()
})

test('node creation and cleanup failures are contained', async () => {
  const { audio } = fakeAudio()
  audio.createOscillator.mockImplementation(() => {
    throw new Error('Unavailable')
  })
  audio.close.mockRejectedValue(new Error('Already closed'))
  await expect(playPracticeSound()).resolves.toBeUndefined()
})

test('a browser that never resumes audio has a bounded wait and releases its context', async () => {
  vi.useFakeTimers()
  const { audio, oscillator } = fakeAudio()
  audio.state = 'suspended'
  audio.resume.mockImplementation(() => new Promise(() => {}))
  const playing = playPracticeSound()
  await vi.advanceTimersByTimeAsync(1000)
  await expect(playing).resolves.toBeUndefined()
  expect(audio.close).toHaveBeenCalledTimes(1)
  expect(oscillator.start).not.toHaveBeenCalled()
})
