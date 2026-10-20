import type { DifficultyLevel, MathOperation } from '../types/question'

export interface IntegerRange {
  readonly min: number
  readonly max: number
}

export interface DifficultyRules {
  readonly addition: {
    readonly operands: IntegerRange
    readonly maximumAnswer: number
  }
  readonly subtraction: { readonly operands: IntegerRange }
  readonly multiplication: {
    readonly factorPairs: readonly {
      readonly first: IntegerRange
      readonly second: IntegerRange
    }[]
  }
  readonly division: {
    readonly divisors: IntegerRange
    readonly dividends: IntegerRange
    readonly quotients?: IntegerRange
  }
}

export const QUESTION_SYMBOLS: Readonly<Record<MathOperation, string>> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
}

// User-agreed defaults for gaps in Section 7, separate from its stated bounds.
export const UNSPECIFIED_RANGE_DEFAULTS = {
  beginnerDivisionQuotients: { min: 0, max: 5 },
  easyDivisionQuotients: { min: 0, max: 10 },
  advancedDivisionDividends: { min: 145, max: 1000 },
  advancedAdditionSubtractionMinimum: 10,
  oneDigitMultiplicationFactors: { min: 0, max: 9 },
} as const

const oneDigit = UNSPECIFIED_RANGE_DEFAULTS.oneDigitMultiplicationFactors
const twoDigit = { min: 10, max: 99 } as const

/** Inclusive Section 7 boundaries. Digit-based factor families allow either order. */
export const difficultyRules: Readonly<
  Record<DifficultyLevel, DifficultyRules>
> = {
  1: {
    addition: { operands: { min: 0, max: 10 }, maximumAnswer: 20 },
    subtraction: { operands: { min: 0, max: 10 } },
    multiplication: {
      factorPairs: [{ first: { min: 0, max: 5 }, second: { min: 0, max: 5 } }],
    },
    division: {
      divisors: { min: 1, max: 5 },
      dividends: { min: 0, max: 25 },
      quotients: UNSPECIFIED_RANGE_DEFAULTS.beginnerDivisionQuotients,
    },
  },
  2: {
    addition: { operands: { min: 0, max: 50 }, maximumAnswer: 100 },
    subtraction: { operands: { min: 0, max: 50 } },
    multiplication: {
      factorPairs: [
        { first: { min: 0, max: 10 }, second: { min: 0, max: 10 } },
      ],
    },
    division: {
      divisors: { min: 1, max: 10 },
      dividends: { min: 0, max: 100 },
      quotients: UNSPECIFIED_RANGE_DEFAULTS.easyDivisionQuotients,
    },
  },
  3: {
    addition: { operands: { min: 0, max: 100 }, maximumAnswer: 200 },
    subtraction: { operands: { min: 0, max: 100 } },
    multiplication: {
      factorPairs: [
        { first: oneDigit, second: oneDigit },
        { first: oneDigit, second: twoDigit },
      ],
    },
    division: {
      divisors: { min: 1, max: 12 },
      dividends: { min: 0, max: 144 },
    },
  },
  4: {
    addition: {
      operands: {
        min: UNSPECIFIED_RANGE_DEFAULTS.advancedAdditionSubtractionMinimum,
        max: 1000,
      },
      maximumAnswer: 2000,
    },
    subtraction: {
      operands: {
        min: UNSPECIFIED_RANGE_DEFAULTS.advancedAdditionSubtractionMinimum,
        max: 1000,
      },
    },
    multiplication: {
      factorPairs: [
        { first: twoDigit, second: oneDigit },
        { first: twoDigit, second: twoDigit },
      ],
    },
    division: {
      divisors: { min: 1, max: 99 },
      dividends: UNSPECIFIED_RANGE_DEFAULTS.advancedDivisionDividends,
    },
  },
}
