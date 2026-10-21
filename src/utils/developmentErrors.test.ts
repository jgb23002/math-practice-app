import { afterEach, expect, test, vi } from 'vitest'
import { reportDevelopmentError } from './developmentErrors'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

test('logs useful diagnostics locally during development', () => {
  vi.stubEnv('DEV', true)
  vi.stubEnv('MODE', 'development')
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  const error = new Error('Failure details')
  reportDevelopmentError('Question generation', error)
  expect(log).toHaveBeenCalledWith('[Math Practice] Question generation', error)
})

test.each(['production', 'test'])(
  'omits development diagnostics in %s',
  (mode) => {
    vi.stubEnv('DEV', mode !== 'production')
    vi.stubEnv('MODE', mode)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    reportDevelopmentError('Question generation', new Error('Failure details'))
    expect(log).not.toHaveBeenCalled()
  },
)
