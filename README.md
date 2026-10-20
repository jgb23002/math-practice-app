# Math Practice App

A browser-based math practice application for children ages 7–12, built with React,
TypeScript, and Vite. Requirements and the development checklist are in
[`docs/Specification.md`](docs/Specification.md) and [`docs/TODO.md`](docs/TODO.md).

## Current scope

Phases 1–5 establish the development tools, shared domain types, responsive
application layout, home page, routing, practice configuration, and a tested
question-generation service with multiple-choice answers. Students can configure
practice and review their choices on the session page. Generated questions are
not displayed yet; interactive cards, statistics, and settings controls belong
to later phases.

## Setup

Use a Node.js version supported by the `engines` field in `package.json`.
The setup has been verified with Node.js 24.14.1 and npm 11.11.0.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. Use Ctrl+C to stop the development server.

## Verification

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

Other commands:

- `npm run lint:fix`: fix automatically resolvable lint issues.
- `npm run format`: format source and configuration files.
- `npm run test:watch`: rerun tests as files change.
- `npm run preview`: serve the production build after `npm run build`.

ESLint checks JavaScript, TypeScript, React hooks, and Fast Refresh exports.
Prettier handles formatting; the supplied assignment documents retain their
original formatting. Vitest shares the Vite configuration and uses jsdom for
React Testing Library tests. DOM matchers and cleanup are configured in
`src/test/setup.ts`.

## Source structure

```text
src/
├── app/                    # Application shell, routes, and navigation tests
├── components/
│   ├── common/
│   ├── layout/
│   ├── practice/
│   └── statistics/
├── config/                 # Practice options and arithmetic difficulty rules
├── hooks/                  # Page titles and access to practice configuration
├── pages/                  # Home, setup, session plan, placeholders, and fallback
├── services/               # Arithmetic, distractors, and shuffled answer choices
├── test/                   # Shared test setup
├── types/                  # Questions, sessions, mistakes, statistics, settings
├── utils/                  # Random integers, shuffling, IDs, and validation
├── index.css
└── main.tsx
```

Empty feature folders contain `.gitkeep` placeholders. Interactive question/attempt
state, settings controls, and statistics calculations are not implemented yet.

## Routes and navigation

React Router's `BrowserRouter` wraps the application in `src/main.tsx`.
`src/app/AppRoutes.tsx` defines the following routes:

| Route               | Page                                        |
| ------------------- | ------------------------------------------- |
| `/`                 | Home                                        |
| `/practice/setup`   | Practice configuration form                 |
| `/practice/session` | Selected plan and practice-card placeholder |
| `/practice/summary` | Session summary placeholder                 |
| `/statistics`       | Statistics placeholder                      |
| `/settings`         | Settings placeholder                        |
| Any unmatched path  | Friendly fallback with a return-home link   |

Navigation actions use real links styled as large buttons, so browser history and
standard keyboard interaction work. The layout includes a skip link, visible
focus indicators, active-page navigation, route-change focus management, and page
titles. CSS decorations are hidden from assistive technology and transitions
respect reduced-motion preferences.

Vite's development and preview servers support direct route visits. When deploying
later, configure the static host to serve `index.html` for application routes so
that refreshing a nested route works.

The component tests cover all six routes, home actions, active navigation,
keyboard navigation, page titles, focus changes, and unknown-route recovery.

## Practice configuration

Setup starts with no math skills or difficulty selected, and a default of 10
questions. Students can select individual skills or use Mixed operations to
select all four; selecting Mixed operations again clears all four. Difficulty
and session length use native radio groups, and skills use native checkboxes.
Selected states include checked controls, borders, and text. Keyboard users can
use Tab, Space, and arrow keys to make their choices.

Start Session stays disabled until at least one skill and a difficulty are chosen.
An accompanying status message explains what is needed. Validation also runs
on form submission and at the shared-state boundary.

`AppProvider` stores a validated `PracticeConfiguration` snapshot in React
Context. The session page displays that plan, and returning to setup restores
the choices for editing. Local draft changes do not alter the saved plan until
Start Session is selected again. Configuration is held in memory; refresh
recovery and local-storage persistence belong to later phases.

The configuration model uses a nonempty operations tuple, one of the four
difficulty levels, and a length of 5, 10, 20, or `continuous`. It is separate from
the session-history model. Submitting setup does not generate questions, record
attempts, initialize session counters, or start a continuous question loop.

Tests cover individual/mixed selection, exclusive radio choices, validation,
configuration transfer and restoration, keyboard interaction, and protection
against invalid or externally mutated configuration values.

## Arithmetic generation

`src/services/questionGenerator.ts` exports `generateQuestion` plus operation-specific
functions. The generator accepts one operation or an array of enabled operations:

```ts
import { generateQuestion } from './services/questionGenerator'

const addition = generateQuestion('addition', 1)
const mixed = generateQuestion(['addition', 'division'], 3)
```

Each result is a complete `Question` containing a UUID, operation, operands,
correct answer, difficulty, display text, `source: 'regular'`, and four shuffled
answer choices. `ArithmeticQuestion` represents the arithmetic core accepted by
the separate answer-choice service before choices are attached.
The service is independent of React and is not wired into the practice page yet.

All numeric bounds are inclusive and live in `src/config/difficulty.ts`:

| Level | Addition / subtraction operands | Multiplication factors        | Division                         |
| ----- | ------------------------------- | ----------------------------- | -------------------------------- |
| 1     | 0–10; addition result ≤20       | Both 0–5                      | Divisor 1–5; quotient 0–5        |
| 2     | 0–50; addition result ≤100      | Both 0–10                     | Divisor 1–10; quotient 0–10      |
| 3     | 0–100                           | 0–9 × 0–9, or 0–9 × 10–99     | Divisor 1–12; dividend 0–144     |
| 4     | 10–1,000                        | 10–99 × 0–9, or 10–99 × 10–99 | Divisor 1–99; dividend 145–1,000 |

The following defaults were agreed for bounds Section 7 does not fully specify:
Level 1 division quotients 0–5; Level 2 quotients 0–10; Level 4 dividends
145–1,000; Level 4 addition/subtraction operands starting at 10; and zero as a
valid one-digit multiplication factor. These are named separately in
`UNSPECIFIED_RANGE_DEFAULTS`; they are implementation choices, not extra text in
the assignment specification. The resulting Level 1/2 dividend caps are 25/100.

Addition caps the second operand so the result stays within its limit. Subtraction
orders its operands so answers stay nonnegative, including Level 4. Multiplication
chooses one of the allowed factor families. Division chooses a nonzero divisor,
then an integer quotient between `ceil(minimumDividend / divisor)` and
`floor(maximumDividend / divisor)`, also applying any configured quotient bounds.
It computes `dividend = divisor × quotient`, which prevents fractional answers.
Level 3 can therefore include `144 ÷ 1`, while `140 ÷ 7` is a valid boundary
example when the divisor does not divide the dividend cap exactly.

For mixed practice, each enabled operation has an equal interval in the random
selection. Unsupported, empty, or duplicate operation selections and invalid
difficulty levels are rejected before generation.

Every generated question passes `getQuestionErrors` before it is returned.
Validation checks safe nonnegative integers, arithmetic correctness, difficulty
boundaries, display text, ID, source metadata, and all four choices. Arithmetic
cores can still be checked separately with `getArithmeticQuestionErrors`.
Generation failures retry three times by default, with a hard limit of ten
configurable attempts, then throw
`QuestionGenerationError` with the attempt count and original cause. Invalid
requests fail immediately. No retry can silently change the selected difficulty.

The `random`, `createId`, and `maxAttempts` options support deterministic tests and
bounded failure handling. Production IDs use secure UUID randomness separately
from the arithmetic RNG; a secure `getRandomValues` fallback supports environments
without `randomUUID`.

Unit tests cover all sixteen operation/level combinations, exact boundaries,
both multiplication families, zero and maximum answers, dividend caps, mixed
selection, invalid data, bounded failures, utilities, and reproducible sample
batches. Shuffling uses Fisher–Yates and leaves the input unchanged.

The extended sample suite checks 4,000 questions for each of the sixteen
operation/level combinations (four fixed seeds), plus 512 questions for every
nonempty enabled-operation subset at every level. It also checks minimum and
maximum quotients for every allowed divisor. Expected boundaries are independent
of the production configuration. Failures include the operation or enabled
subset, difficulty, seed, sample index, random draws, question data, and a replay
command. Every sample also checks exactly four unique nonnegative integer
choices containing the correct answer once. Every seeded batch checks that the
correct answer reaches all four positions. Sample IDs are deterministic; the
original generator tests and UUID utility tests separately exercise production IDs.

Run the service and utility suites together with:

```bash
npm test -- src/services src/utils
```

Malformed-data tests cover every operation and level, each missing required
field, invalid types, unsafe or fractional numbers, incorrect arithmetic, zero
divisors, rounded quotients, negative subtraction, and invalid source metadata.
Complete-question validation also rejects missing, duplicate, negative,
fractional, non-finite, and sparse answer choices.

## Multiple-choice answers

`src/services/answerChoices.ts` exports `generateDistractors` and
`generateAnswerChoices` for a validated `ArithmeticQuestion`. Addition candidates
include omitted addends and carrying mistakes; subtraction includes borrowing
mistakes and confusing subtraction with addition. Multiplication uses adjacent
table facts. Division uses adjacent dividends from the same fact family and
neighboring divisors only when they produce whole answers.

Operation-specific candidates are combined with nearby integers and filtered to
exclude the correct answer, duplicates, negatives, fractions, unsafe numbers,
and remote values. The answer neighborhood has radius
`max(3, min(10, answer), ceil(answer / 4))`; it leaves room for three alternatives
at zero and small answers while permitting nearby table and carrying mistakes.
This is a distractor policy, separate from Section 7's equation boundaries.

Random selection has a default budget of 12 attempts and a configurable hard
limit of 32. If repeated draws do not produce three unique distractors, a finite
scan of the candidate pool fills the remaining spots. The nearby-number pool
guarantees enough alternatives. Invalid random outputs throw instead of looping.
The correct answer is then combined with the three distractors and all four are
shuffled with Fisher–Yates. Neither service mutates the input question.

Tests cover carrying/borrowing mistakes, neighboring facts, zero and small answers,
large factors with a zero product, maximum results, constant random sources,
retry bounds, malformed choices, and all correct-answer positions for an unchanged
question. Phase 6 will add the interactive question card.

## Shared types

- `question.ts`: operations, difficulty levels, question sources, and questions.
- `session.ts`: session length, practice attempts, and practice sessions.
- `practiceConfiguration.ts`: validated choices passed from setup to session state.
- `mistake.ts`: mistake patterns and mastery progress.
- `statistics.ts`: overall, operation, and difficulty totals.
- `settings.ts`: application preferences, practice defaults, and mastery threshold.

Attempts retain both the selected answer and the self-reported result. Runtime
validation currently covers practice configuration and arithmetic questions.
Persistence, settings defaults, and validation for later features belong to their
respective phases.
