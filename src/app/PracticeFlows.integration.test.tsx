import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { STORAGE_KEYS } from '../config/storage'
import TestRouter from '../test/TestRouter'
import { seededRandom } from '../test/seededRandom'
import type { SessionRecoverySnapshot } from '../types/persistence'
import type { Question } from '../types/question'
import type { PracticeAttempt } from '../types/session'
import type { AppStatistics } from '../types/statistics'
import type { MistakePattern } from '../types/mistake'
import App from './App'

afterEach(() => vi.restoreAllMocks())

function mount(path = '/practice/setup') {
  return render(
    <StrictMode>
      <TestRouter initialEntries={[path]}>
        <App />
      </TestRouter>
    </StrictMode>,
  )
}
const attempts = (): PracticeAttempt[] =>
  JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)
const patterns = (): MistakePattern[] =>
  JSON.parse(localStorage.getItem(STORAGE_KEYS.mistakePatterns)!)
const active = (): NonNullable<SessionRecoverySnapshot['session']> =>
  JSON.parse(localStorage.getItem(STORAGE_KEYS.activeSession)!).session

function independentAnswer(q: Question) {
  return q.operation === 'addition'
    ? q.firstOperand + q.secondOperand
    : q.operation === 'subtraction'
      ? q.firstOperand - q.secondOperand
      : q.operation === 'multiplication'
        ? q.firstOperand * q.secondOperand
        : q.firstOperand / q.secondOperand
}
function expectNumbers(
  container: HTMLElement,
  attempted: number,
  correct: number,
  incorrect: number,
) {
  for (const [label, value] of [
    ['Attempted', attempted],
    ['Correct', correct],
    ['Incorrect', incorrect],
  ] as const)
    expect(
      within(container).getByText(label).nextElementSibling,
    ).toHaveTextContent(new RegExp(`^${value}$`))
}
function expectLedger() {
  const saved = attempts()
  const stats: AppStatistics = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.statistics)!,
  )
  const correct = saved.filter((a) => a.selfReportedCorrect).length
  expect(stats).toMatchObject({
    attempted: saved.length,
    correct,
    incorrect: saved.length - correct,
  })
  expect(new Set(saved.map((a) => a.id)).size).toBe(saved.length)
  expect(
    new Set(saved.map((a) => JSON.stringify([a.sessionId, a.questionId]))).size,
  ).toBe(saved.length)
  for (const operation of [
    'addition',
    'subtraction',
    'multiplication',
    'division',
  ] as const) {
    const group = saved.filter((a) => a.operation === operation)
    expect(stats.byOperation[operation]).toEqual({
      attempted: group.length,
      correct: group.filter((a) => a.selfReportedCorrect).length,
      incorrect: group.filter((a) => !a.selfReportedCorrect).length,
    })
  }
  for (const level of [1, 2, 3, 4] as const) {
    const group = saved.filter((a) => a.difficulty === level)
    expect(stats.byDifficulty[level]).toEqual({
      attempted: group.length,
      correct: group.filter((a) => a.selfReportedCorrect).length,
      incorrect: group.filter((a) => !a.selfReportedCorrect).length,
    })
  }
}
async function choosePlan(
  user: ReturnType<typeof userEvent.setup>,
  mixed = false,
  level = 1,
  length: 5 | 20 | 'continuous' = 5,
) {
  if (mixed)
    await user.click(screen.getByRole('button', { name: /Mixed operations/ }))
  else await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(
    screen.getByRole('radio', { name: new RegExp(`^Level ${level}:`) }),
  )
  await user.click(
    screen.getByRole('radio', {
      name:
        length === 'continuous' ? 'Continuous practice' : `${length} questions`,
    }),
  )
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
}
async function mark(
  user: ReturnType<typeof userEvent.setup>,
  correct: boolean,
  rapid = false,
) {
  const session = active(),
    q = session.currentQuestion!
  const count = attempts().length
  const context = JSON.stringify({
    sessionId: session.id,
    questionIndex: session.currentQuestionIndex,
    question: q,
  })
  expect(q.correctAnswer, context).toBe(independentAnswer(q))
  expect(new Set(q.choices).size, context).toBe(4)
  expect(
    q.choices.filter((choice) => choice === q.correctAnswer),
    context,
  ).toHaveLength(1)
  expect(
    q.choices.every((choice) => Number.isSafeInteger(choice) && choice >= 0),
    context,
  ).toBe(true)
  if (q.operation === 'division') {
    expect(q.secondOperand, context).toBeGreaterThan(0)
    expect(q.firstOperand % q.secondOperand, context).toBe(0)
  }
  expect(screen.getByRole('heading', { name: q.displayText })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
  // Deliberately disagree with the arithmetic; only the explicit mark counts.
  const selected = correct
    ? q.choices.find((choice) => choice !== q.correctAnswer)!
    : q.correctAnswer
  await user.click(screen.getByRole('button', { name: `Answer ${selected}` }))
  expect(attempts()).toHaveLength(count)
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  expect(attempts()).toHaveLength(count)
  const report = screen.getByRole('button', {
    name: correct ? 'I Got It Right' : 'I Got It Wrong',
  })
  if (rapid) {
    const opposite = screen.getByRole('button', {
      name: correct ? 'I Got It Wrong' : 'I Got It Right',
    })
    act(() => {
      fireEvent.click(report)
      fireEvent.click(opposite)
      fireEvent.click(report)
    })
  } else await user.click(report)
  expect(attempts(), context).toHaveLength(count + 1)
  expect(attempts().at(-1), context).toMatchObject({
    sessionId: session.id,
    questionId: q.id,
    selectedAnswer: selected,
    selfReportedCorrect: correct,
    operation: q.operation,
    difficulty: q.difficulty,
    source: q.source,
  })
  expectLedger()
  return q
}

test.each([true, false])(
  'complete real addition session with every self-report correct=%s survives a remount',
  async (correct) => {
    vi.spyOn(Math, 'random').mockImplementation(
      seededRandom(correct ? 20001 : 20002),
    )
    const user = userEvent.setup(),
      view = mount()
    await choosePlan(user)
    for (let index = 0; index < 5; index++) {
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-valuenow',
        String(index + 1),
      )
      await mark(user, correct, index === 4)
    }
    expect(
      screen.getByRole('heading', { name: 'A place to celebrate' }),
    ).toBeVisible()
    expectNumbers(
      screen.getByLabelText('Session totals'),
      5,
      correct ? 5 : 0,
      correct ? 0 : 5,
    )
    expect(screen.getByRole('group', { name: 'Accuracy' })).toHaveTextContent(
      correct ? '100%' : '0%',
    )
    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
    expect(patterns().reduce((sum, p) => sum + p.incorrectCount, 0)).toBe(
      correct ? 0 : 5,
    )
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions)!),
    ).toHaveLength(1)
    view.unmount()
    mount('/statistics')
    expectNumbers(
      screen.getByRole('region', { name: 'All your practice' }),
      5,
      correct ? 5 : 0,
      correct ? 0 : 5,
    )
    expectLedger()
  },
)

test.each([1, 2, 3, 4])(
  'real mixed-operation level %s session completes with consistent per-operation/per-level statistics',
  async (level) => {
    const seed = 20100 + level
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(seed))
    const user = userEvent.setup()
    mount()
    await choosePlan(user, true, level, 20)
    for (let index = 0; index < 20; index++)
      await mark(user, index % 3 !== 0, index === 10)
    expect(
      new Set(attempts().map((a) => a.operation)),
      `seed=${seed}, replay: npm test -- src/app/PracticeFlows.integration.test.tsx -t 'level ${level}'`,
    ).toEqual(
      new Set(['addition', 'subtraction', 'multiplication', 'division']),
    )
    expect(attempts().every((a) => a.difficulty === level)).toBe(true)
    expectNumbers(screen.getByLabelText('Session totals'), 20, 13, 7)
    expect(screen.getByRole('group', { name: 'Accuracy' })).toHaveTextContent(
      '65%',
    )
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    expectNumbers(
      screen.getByRole('region', { name: 'All your practice' }),
      20,
      13,
      7,
    )
    expectLedger()
  },
  15000,
)

test('real continuous session passes 20 attempts, cancels ending, and excludes the pending card from completion', async () => {
  vi.spyOn(Math, 'random').mockImplementation(seededRandom(20200))
  const confirm = vi
    .spyOn(window, 'confirm')
    .mockReturnValueOnce(false)
    .mockReturnValueOnce(true)
  const user = userEvent.setup()
  mount()
  await choosePlan(user, true, 2, 'continuous')
  for (let index = 0; index < 21; index++) await mark(user, index % 2 === 0)
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  const pending = active().currentQuestion!
  await user.click(
    screen.getByRole('button', { name: `Answer ${pending.choices[0]}` }),
  )
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(screen.getByRole('button', { name: 'End Session' }))
  expect(active().isActive).toBe(true)
  expect(attempts()).toHaveLength(21)
  await user.click(screen.getByRole('button', { name: 'End Session' }))
  expect(confirm).toHaveBeenCalledTimes(2)
  expectNumbers(screen.getByLabelText('Session totals'), 21, 11, 10)
  expect(screen.getByRole('group', { name: 'Accuracy' })).toHaveTextContent(
    '52%',
  )
  expect(attempts().some((a) => a.questionId === pending.id)).toBe(false)
  expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
  expectLedger()
}, 15000)

test('ending an untouched real continuous session produces a zero-attempt summary without a false mistake or leave warning', async () => {
  vi.spyOn(Math, 'random').mockImplementation(seededRandom(20201))
  const confirm = vi.spyOn(window, 'confirm')
  const user = userEvent.setup()
  mount()
  await choosePlan(user, false, 1, 'continuous')
  await user.click(screen.getByRole('button', { name: 'End Session' }))
  expectNumbers(screen.getByLabelText('Session totals'), 0, 0, 0)
  expect(screen.getByRole('group', { name: 'Accuracy' })).toHaveTextContent(
    '0%',
  )
  expect(
    screen.getByText('Operations practiced').nextElementSibling,
  ).toHaveTextContent('No completed questions')
  expect(attempts()).toEqual([])
  expect(patterns()).toEqual([])
  expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
  expect(confirm).not.toHaveBeenCalled()
  const unload = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(unload)
  expect(unload.defaultPrevented).toBe(false)
  expectLedger()
})

test('new mistake → real review → refresh a revealed card → third correct review masters → confirmed reset preserves mastery and preferences', async () => {
  vi.spyOn(Math, 'random').mockImplementation(seededRandom(20300))
  const user = userEvent.setup()
  let view = mount()
  const settingsBefore = localStorage.getItem(STORAGE_KEYS.settings)
  localStorage.setItem('unrelated.application', 'keep')
  await choosePlan(user, false, 2)
  const original = await mark(user, false)
  for (let index = 0; index < 4; index++) await mark(user, true)
  expect(patterns()).toHaveLength(1)
  const originalPattern = patterns()[0]
  expect(originalPattern).toMatchObject({
    operation: original.operation,
    firstOperand: original.firstOperand,
    secondOperand: original.secondOperand,
    incorrectCount: 1,
    similarCorrectCount: 0,
    mastered: false,
  })
  await user.click(screen.getByRole('button', { name: 'Practice Mistakes' }))
  expect(screen.getByRole('radio', { name: 'Mistake Review' })).toBeChecked()
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
  for (let index = 1; index <= 2; index++) {
    const q = await mark(user, true)
    expect(q.mistakePatternId).toBe(originalPattern.id)
    expect([q.firstOperand, q.secondOperand]).not.toEqual([
      original.firstOperand,
      original.secondOperand,
    ])
    expect(patterns()[0]).toMatchObject({
      similarCorrectCount: index,
      mastered: false,
    })
  }
  const last = active(),
    q = last.currentQuestion!
  const selected = q.choices.find((choice) => choice !== q.correctAnswer)!
  await user.click(screen.getByRole('button', { name: `Answer ${selected}` }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  const checkpoint = localStorage.getItem(STORAGE_KEYS.activeSession)
  view.unmount()
  view = mount('/practice/session')
  expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBe(checkpoint)
  expect(screen.getByRole('button', { name: 'I Got It Right' })).toBeVisible()
  expect(screen.getByText('Your answer').nextElementSibling).toHaveTextContent(
    String(selected),
  )
  expect(attempts()).toHaveLength(7)
  expect(patterns()[0]).toMatchObject({
    similarCorrectCount: 2,
    mastered: false,
  })
  const right = screen.getByRole('button', { name: 'I Got It Right' }),
    wrong = screen.getByRole('button', { name: 'I Got It Wrong' })
  act(() => {
    fireEvent.click(right)
    fireEvent.click(wrong)
    fireEvent.click(right)
  })
  expectNumbers(screen.getByLabelText('Session totals'), 3, 3, 0)
  expect(
    screen.getByText('Mistake-review questions completed').nextElementSibling,
  ).toHaveTextContent('3')
  expect(patterns()[0]).toMatchObject({
    id: originalPattern.id,
    incorrectCount: 1,
    similarCorrectCount: 3,
    mastered: true,
  })
  expect(attempts().filter((a) => a.source === 'mistake-review')).toHaveLength(
    3,
  )
  expectLedger()
  await user.click(screen.getByRole('link', { name: 'View Statistics' }))
  expectNumbers(
    screen.getByRole('region', { name: 'All your practice' }),
    8,
    7,
    1,
  )
  const mistakes = screen.getByRole('region', { name: 'Mistakes and mastery' })
  for (const [label, value] of [
    ['Active mistake patterns', 0],
    ['Mastered mistake patterns', 1],
    ['Similar review questions attempted', 3],
    ['Correct review answers', 3],
  ] as const)
    expect(
      within(mistakes).getByText(label).nextElementSibling,
    ).toHaveTextContent(String(value))
  const confirm = vi
    .spyOn(window, 'confirm')
    .mockReturnValueOnce(false)
    .mockReturnValueOnce(true)
  const beforeCancel = JSON.stringify(localStorage)
  await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
  expect(JSON.stringify(localStorage)).toBe(beforeCancel)
  await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
  expect(confirm).toHaveBeenCalledTimes(2)
  expectNumbers(
    screen.getByRole('region', { name: 'All your practice' }),
    0,
    0,
    0,
  )
  expect(patterns()[0]).toMatchObject({
    mastered: true,
    similarCorrectCount: 3,
  })
  expect(localStorage.getItem(STORAGE_KEYS.settings)).toBe(settingsBefore)
  expect(localStorage.getItem('unrelated.application')).toBe('keep')
  view.unmount()
  mount('/statistics')
  expectNumbers(
    screen.getByRole('region', { name: 'All your practice' }),
    0,
    0,
    0,
  )
  expect(attempts()).toEqual([])
  await user.click(screen.getByRole('button', { name: 'Mastered (1)' }))
  expect(
    screen.getByRole('list', { name: 'Mastered mistake patterns' }),
  ).toBeVisible()
  expectLedger()
}, 15000)
