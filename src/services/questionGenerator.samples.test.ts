import { expect, test, vi } from 'vitest'
import type {
  DifficultyLevel,
  MathOperation,
  Question,
} from '../types/question'
import * as questionGenerator from './questionGenerator'

const operations = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
] as const
const levels = [1, 2, 3, 4] as const
const seeds = [0, 1, 0x5eed1234, 0xffffffff] as const
const samplesPerSeed = 1000
const HIGH = 1 - Number.EPSILON

// Independent expectations from Section 7 and the user-approved defaults.
// Do not import production rules: a wrong rule must fail these tests too.
const expected = {
  1: {
    operands: [0, 10],
    maxSum: 20,
    divisorMax: 5,
    dividend: [0, 25],
    quotientMax: 5,
  },
  2: {
    operands: [0, 50],
    maxSum: 100,
    divisorMax: 10,
    dividend: [0, 100],
    quotientMax: 10,
  },
  3: {
    operands: [0, 100],
    maxSum: 200,
    divisorMax: 12,
    dividend: [0, 144],
    quotientMax: 144,
  },
  4: {
    operands: [10, 1000],
    maxSum: 2000,
    divisorMax: 99,
    dividend: [145, 1000],
    quotientMax: 1000,
  },
} as const
const symbols = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
}

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

function invariantErrors(
  value: unknown,
  enabled: readonly MathOperation[],
  difficulty: DifficultyLevel,
  ids: ReadonlySet<string>,
): string[] {
  const errors: string[] = []
  const check = (condition: boolean, message: string) => {
    if (!condition) errors.push(message)
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return ['Question must be a non-null object, not an array.']
  const question = value as Record<string, unknown>
  for (const field of [
    'id',
    'operation',
    'difficulty',
    'firstOperand',
    'secondOperand',
    'correctAnswer',
    'displayText',
    'source',
    'choices',
  ])
    check(Object.hasOwn(question, field), `Missing field: ${field}.`)
  check(
    typeof question.id === 'string' && question.id.trim().length > 0,
    'ID must be a nonempty string.',
  )
  if (typeof question.id === 'string')
    check(!ids.has(question.id), `Repeated ID: ${question.id}.`)
  check(
    enabled.includes(question.operation as MathOperation),
    'Operation must be enabled.',
  )
  check(
    question.difficulty === difficulty,
    'Difficulty must match the request.',
  )
  check(
    question.source === 'regular',
    'Generated questions must have source regular.',
  )
  check(
    question.mistakePatternId === undefined,
    'Regular generation must not invent a mistake pattern.',
  )
  const choices = question.choices
  if (!Array.isArray(choices)) {
    errors.push('Answer choices must be an array.')
  } else {
    check(
      choices.length === 4,
      'Every question must have exactly four choices.',
    )
    check(new Set(choices).size === 4, 'All four choices must be unique.')
    check(
      choices.filter((choice) => choice === question.correctAnswer).length ===
        1,
      'The correct answer must appear exactly once.',
    )
    check(
      Array.from(choices).every(
        (choice) =>
          typeof choice === 'number' &&
          Number.isSafeInteger(choice) &&
          choice >= 0,
      ),
      'All choices must be nonnegative safe integers.',
    )
  }
  const numbers = [
    question.firstOperand,
    question.secondOperand,
    question.correctAnswer,
  ]
  if (
    !numbers.every(
      (number) =>
        typeof number === 'number' &&
        Number.isSafeInteger(number) &&
        number >= 0,
    )
  ) {
    errors.push(
      'Both operands and the answer must be nonnegative safe integers.',
    )
    return errors
  }
  const [first, second, answer] = numbers as number[]
  const operation = question.operation as MathOperation
  check(
    question.displayText === `${first} ${symbols[operation]} ${second} = ?`,
    'Display text must match the operands and operation.',
  )
  const rules = expected[difficulty]
  switch (operation) {
    case 'addition':
    case 'subtraction': {
      const [min, max] = rules.operands
      check(
        first >= min && first <= max,
        `First operand must be in ${min}–${max}.`,
      )
      check(
        second >= min && second <= max,
        `Second operand must be in ${min}–${max}.`,
      )
      if (operation === 'addition') {
        check(answer === first + second, 'Addition answer must equal the sum.')
        check(
          answer <= rules.maxSum,
          `Addition result must be ≤${rules.maxSum}.`,
        )
      } else {
        check(
          first >= second,
          'Subtraction must not have a smaller first operand.',
        )
        check(
          answer === first - second,
          'Subtraction answer must equal the difference.',
        )
      }
      break
    }
    case 'multiplication': {
      check(
        answer === first * second,
        'Multiplication answer must equal the product.',
      )
      const small = Math.min(first, second)
      const large = Math.max(first, second)
      if (difficulty <= 2) {
        const max = difficulty === 1 ? 5 : 10
        check(large <= max, `Both factors must be in 0–${max}.`)
      } else if (difficulty === 3) {
        check(
          small <= 9 && large <= 99,
          'Level 3 requires a one-digit factor and a one- or two-digit factor.',
        )
      } else {
        check(
          large >= 10 && large <= 99 && small <= 99,
          'Level 4 requires a two-digit factor and a one- or two-digit factor.',
        )
      }
      break
    }
    case 'division':
      check(second !== 0, 'Division by zero is forbidden.')
      check(
        second >= 1 && second <= rules.divisorMax,
        `Divisor must be in 1–${rules.divisorMax}.`,
      )
      check(
        first >= rules.dividend[0] && first <= rules.dividend[1],
        `Dividend must be in ${rules.dividend.join('–')}.`,
      )
      check(first % second === 0, 'Division must have no remainder.')
      check(
        Number.isSafeInteger(first / second),
        'Division quotient must be a safe integer.',
      )
      check(
        answer === first / second,
        'Division answer must equal the quotient.',
      )
      check(
        answer <= rules.quotientMax,
        `Quotient must be ≤${rules.quotientMax}.`,
      )
      break
  }
  return errors
}

function failureDetails(
  label: string,
  sample: number,
  draws: readonly number[],
  question: unknown,
): string {
  const testPattern = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return [
    label,
    `sample=${sample} (zero-based)`,
    `randomDraws=${JSON.stringify(draws)}`,
    `question=${JSON.stringify(question, (_key, value: unknown) =>
      typeof value === 'number' && !Number.isFinite(value)
        ? String(value)
        : value,
    )}`,
    `Replay: npm test -- src/services/questionGenerator.samples.test.ts -t '${testPattern}'`,
  ].join('\n')
}

function checkSamples(
  enabled: readonly MathOperation[],
  difficulty: DifficultyLevel,
  seed: number,
  count: number,
  label: string,
) {
  const random = seededRandom(seed)
  const ids = new Set<string>()
  const selected = new Set<MathOperation>()
  const correctPositions = new Set<number>()
  for (let sample = 0; sample < count; sample++) {
    const draws: number[] = []
    let question: unknown
    try {
      question = questionGenerator.generateQuestion(enabled, difficulty, {
        random: () => {
          const value = random()
          draws.push(value)
          return value
        },
        // Replaying a failure reproduces metadata as well as arithmetic.
        createId: () => `${label}:sample=${sample}`,
        // A stress test must expose the first failure rather than retry past it.
        maxAttempts: 1,
      })
    } catch (cause) {
      throw new Error(
        `Generation threw.\n${failureDetails(label, sample, draws, question)}`,
        { cause },
      )
    }
    const errors = invariantErrors(question, enabled, difficulty, ids)
    if (errors.length > 0)
      throw new Error(
        `${errors.join('\n')}\n${failureDetails(label, sample, draws, question)}`,
      )
    const generated = question as Question
    ids.add(generated.id)
    selected.add(generated.operation)
    correctPositions.add(generated.choices.indexOf(generated.correctAnswer))
  }
  expect(ids.size).toBe(count)
  expect(selected).toEqual(new Set(enabled))
  expect(
    correctPositions,
    `All correct-answer positions must be reachable: ${label}`,
  ).toEqual(new Set([0, 1, 2, 3]))
}

test.each(
  operations.flatMap((operation) =>
    levels.flatMap((difficulty) =>
      seeds.map((seed) => ({
        operation,
        difficulty,
        seed,
      })),
    ),
  ),
)(
  '$operation Level $difficulty seed $seed',
  ({ operation, difficulty, seed }) => {
    checkSamples(
      [operation],
      difficulty,
      seed,
      samplesPerSeed,
      `${operation} Level ${difficulty} seed ${seed}`,
    )
  },
)

const selections = Array.from({ length: 15 }, (_, index) =>
  operations.filter((_operation, bit) => (index + 1) & (1 << bit)),
)
test.each(
  selections.flatMap((enabled) =>
    levels.map((difficulty) => ({
      enabled,
      selection: enabled.join('+'),
      difficulty,
    })),
  ),
)(
  'mixed $selection Level $difficulty seed 42',
  ({ enabled, selection, difficulty }) => {
    const frozen = Object.freeze([...enabled])
    checkSamples(
      frozen,
      difficulty,
      42,
      512,
      `mixed ${selection} Level ${difficulty} seed 42`,
    )
    expect(frozen).toEqual(enabled)
  },
)

test.each(levels)('division Level %s every divisor boundary', (difficulty) => {
  const rules = expected[difficulty]
  const ids = new Set<string>()
  for (let divisor = 1; divisor <= rules.divisorMax; divisor++) {
    for (const endpoint of ['minimum', 'maximum'] as const) {
      const draws = [
        (divisor - 0.5) / rules.divisorMax,
        endpoint === 'minimum' ? 0 : HIGH,
      ]
      let index = 0
      const question = questionGenerator.generateDivisionQuestion(difficulty, {
        random: () => draws[Math.min(index++, draws.length - 1)],
        createId: () => `division-${difficulty}-${divisor}-${endpoint}`,
        maxAttempts: 1,
      })
      const quotient =
        endpoint === 'minimum'
          ? Math.ceil(rules.dividend[0] / divisor)
          : Math.min(rules.quotientMax, Math.floor(rules.dividend[1] / divisor))
      const label = `division Level ${difficulty} every divisor boundary`
      const context = `${endpoint} divisor=${divisor}\n${failureDetails(label, divisor, draws, question)}`
      expect(
        invariantErrors(question, ['division'], difficulty, ids),
        context,
      ).toEqual([])
      expect(
        [question.firstOperand, question.secondOperand, question.correctAnswer],
        context,
      ).toEqual([divisor * quotient, divisor, quotient])
      ids.add(question.id)
    }
  }
})

test('a failure reports the seed, sample, random draws, question, and replay command', () => {
  const original = questionGenerator.generateQuestion
  // Inject a bad result after production validation to verify that the sample
  // suite detects it independently and reports the actual offending object.
  const spy = vi
    .spyOn(questionGenerator, 'generateQuestion')
    .mockImplementationOnce((...args) => ({
      ...original(...args),
      secondOperand: 0,
    }))
  try {
    let failure: unknown
    try {
      checkSamples(['division'], 1, 0, 1, 'division Level 1 seed 0')
    } catch (error) {
      failure = error
    }
    expect(failure).toBeInstanceOf(Error)
    const message = (failure as Error).message
    for (const detail of [
      'Division by zero is forbidden.',
      'division Level 1 seed 0',
      'sample=0 (zero-based)',
      'randomDraws=[0.23606797284446657,0.278566908556968,',
      'question={',
      '"secondOperand":0',
      "Replay: npm test -- src/services/questionGenerator.samples.test.ts -t 'division Level 1 seed 0'",
    ])
      expect(message).toContain(detail)
  } finally {
    spy.mockRestore()
  }
})
