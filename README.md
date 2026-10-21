# Math Practice App

A browser-based math practice application for children ages 7–12, built with React,
TypeScript, and Vite. Requirements and the development checklist are in
[`docs/Specification.md`](docs/Specification.md) and [`docs/TODO.md`](docs/TODO.md).

## Current scope

Phases 1–19 establish the development tools, shared domain types, responsive
application layout, home page, routing, practice configuration, and a tested
question-generation service with multiple-choice answers and interactive cards.
Students can configure practice, select an answer, flip a card, and mark how they
did. Sessions advance automatically, keep self-reported totals and attempts in
memory, and finish with a session summary and navigation actions. Settings,
session history, attempts, and aggregate totals persist in browser local storage.
The statistics page shows overall, operation, difficulty, recent-session, and
mistake/mastery statistics with a confirmed reset. Application settings control sound,
animation, explanations, and practice defaults. Self-reported mistakes create
deduplicated, persistent patterns. A similar-question service generates related
review questions within the original difficulty. Personalized review sessions
prioritize active mistakes and persist self-reported mastery progress. Practice
also includes focused-card number shortcuts, accessible announcements, centered
responsive cards, and optional encouraging messages after recorded self-reports.
Active cards recover after refresh, with saved selections and revealed answers.
Navigation prompts let students stay, pause practice, or end their session.
Failure handling preserves valid saved records, uses validated fallback cards,
and offers friendly retry/home actions when a page or practice step cannot finish.
Phase 20 expands the automated coverage and adds reproducible Chrome accessibility
and browser-restart checks. Human screen-reader testing and accessibility-result
review remain unfinished; see the [testing audit](docs/testing-audit.md).

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
- `npm run check:responsive`: launch a temporary Vite server and isolated Chrome
  profile to check desktop, tablet, mobile, touch targets, and session behavior.
  Requires Chrome or Chromium; use `CHROME_BIN` for a custom executable path.
- `npm run check:session-recovery`: use the same isolated runner to check native
  refresh prompts, exact card recovery, Back/Forward, and safe navigation.
- `npm run check:errors`: inject corrupt JSON, denied storage, quota failures, and
  invalid randomness into a disposable browser profile and verify recovery.
- `npm run check:accessibility`: run local axe-core scans, a native keyboard-only
  session, motion combinations, and genuine 200% Chrome zoom. Incomplete axe
  results are reported separately for human review.
- `npm run check:browser-persistence`: close/relaunch Chrome three times using the
  same temporary profile and verify live cards, mastery, completed history, and reset.

See [the responsive checks and visual changes](docs/responsive-checks.md) for
screen sizes, optional screenshots, and manual device checks. The remaining
manual accessibility checks are listed in [the accessibility audit](docs/accessibility-audit.md).
See [session recovery and navigation checks](docs/session-recovery.md) for saved
state, failure recovery, browser limitations, and manual checks.
The [error-handling audit](docs/error-handling.md) describes the failure cases,
retry limits, fallback policies, data preservation, and test simulations.
The [Phase 20 testing audit](docs/testing-audit.md) maps requirements to tests and
separates passed, fixed, and unexecuted checks. All browser scripts use automated
Chrome/Chromium checks; they do not establish manual or cross-browser verification.

The accessibility script writes its detailed report to
`/tmp/math-practice-accessibility.json`. Set `ACCESSIBILITY_REPORT_PATH` to change
the destination. Axe-core is a development dependency and runs locally; it is not
loaded by the child-facing application or included in its production bundle.

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
│   ├── common/             # Shared buttons, icons, and question progress
│   ├── layout/
│   ├── practice/           # Setup selectors and interactive question cards
│   ├── settings/           # Accessible preference checkboxes
│   └── statistics/         # Reusable metrics, breakdowns, and session history
├── config/                 # Practice options and arithmetic difficulty rules
├── hooks/                  # Titles, practice configuration, and reduced motion
├── pages/                  # Home, setup, practice, summary, placeholders, fallback
├── services/               # Arithmetic, sessions, mistake tracking, and storage
├── test/                   # Shared test setup and session fixtures
├── types/                  # Questions, sessions, mistakes, statistics, settings
├── utils/                  # Randomness, IDs, validation, and session summaries
├── index.css
└── main.tsx
```

Empty feature folders contain `.gitkeep` placeholders. Card interaction state is
keyed to the question, and the session context retains selection, reveal state,
and attempts. Active cards, session history, mistakes, and mastery progress are
stored locally and restored on startup.

## Routes and navigation

React Router's `createBrowserRouter` and `RouterProvider` wrap the application in
`src/main.tsx`, enabling navigation blocking for links and browser history.
`src/app/AppRoutes.tsx` defines the following routes:

| Route               | Page                                        |
| ------------------- | ------------------------------------------- |
| `/`                 | Home                                        |
| `/practice/setup`   | Practice configuration form                 |
| `/practice/session` | Active session, or redirect to setup        |
| `/practice/summary` | Completed-session totals                    |
| `/statistics`       | Statistics overview and session history     |
| `/settings`         | Preferences, defaults, and clear-all action |
| Any unmatched path  | Friendly fallback with a return-home link   |

Navigation links are styled as large buttons, so browser history and
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

New setup uses saved practice defaults. The original defaults are no math skills,
Level 1: Beginner, and 10 questions. Students can select individual skills or use Mixed operations to
select all four; selecting Mixed operations again clears all four. Difficulty
and session length use native radio groups, and skills use native checkboxes.
Selected states include checked controls, borders, and text. Keyboard users can
use Tab, Space, and arrow keys to make their choices.

Start Session stays disabled until at least one skill and a difficulty are chosen.
An accompanying status message explains what is needed. Validation also runs
on form submission and at the shared-state boundary.

`AppProvider` stores a validated `PracticeConfiguration` snapshot in React
Context. The session page displays that plan. **Explore Practice** and the summary's
**Change Settings** restore it for editing; other entries to setup use the saved
defaults. Local draft changes do not alter the saved plan until
Start Session is selected again. Starting creates a unique session and generates
the first card from that plan. Session overrides never change saved defaults.
Direct visits to setup use the saved defaults and offer **Resume Session** when
a saved practice exists. Replacing an unfinished session requires confirmation.

The configuration model uses a nonempty operations tuple, one of the four
difficulty levels, and a length of 5, 10, 20, or `continuous`. It is separate from
the session-history model. Finite sessions contain 5, 10, or 20 recorded attempts;
continuous sessions keep generating cards until the student ends practice.

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
The service is independent of React; the practice page uses it to create a card.

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
question.

## Interactive question cards

`AnswerChoice`, `CardFront`, `CardBack`, and `QuestionCard` are reusable practice
components. `ProgressBar` presents the supplied question position with an
accessible label and value; it is omitted for continuous practice. It represents
position, not a count of recorded results.

The card begins with no selected answer and a disabled Flip Card button. Answer
buttons use native keyboard activation and `aria-pressed`; one choice is
highlighted at a time. Students can change their answer until flipping. The back
shows the original question, correct answer, selected answer, and an
operation-specific explanation. Only **I Got It Right** or **I Got It Wrong**
emits `onSelfReport({ questionId, selectedAnswer, selfReportedCorrect })`.
The child's report is respected even when it differs from arithmetic correctness.
Selecting an answer and flipping never emit a result.

Both report buttons lock after one report, including rapid repeated events.
Changing the question ID resets selection, flip state, and the report lock.
Focus moves to the reveal heading after flipping and to the new question when
its ID changes. Inactive faces are hidden from assistive technology, inert, and
have disabled controls, preventing keyboard access or further answer changes.

The CSS flip uses aligned grid faces and hides their reverse surfaces to prevent
mirrored text. Interaction does not depend on animation timing. Device reduced
motion is observed initially and when it changes; CSS also applies the preference.
A **Card animation** checkbox disables the flip effect. This preference persists
between visits and cannot override device reduced motion.

The card emits selection and reveal callbacks separately from self-reports.
Session-backed cards restore their selected answer and reveal state when the
student returns from another page. Synchronous interaction locks keep rapid
answer changes, flips, and repeated reports consistent even in one React batch.

Component and integration tests cover selection changes, zero answers, flip
gating, explanations, self-report semantics, duplicate prevention, reset and
focus behavior, keyboard navigation, reduced-motion changes, listener cleanup,
animation settings, progress, generation recovery, and saving only accepted results.

## Practice sessions

`src/services/practiceSession.ts` creates sessions and applies explicit actions
for selecting, revealing, reporting, retrying, and ending. Each session stores a
unique ID, start/completion timestamps, operations, difficulty, session length,
zero-based question index, active state, totals, and completed attempts. Each
attempt retains its question data, selected answer, self-reported result, IDs,
and timestamp. Session totals always satisfy `attempted = correct + incorrect`.

`AppProvider` owns the session in Context. Its synchronous snapshot is committed
before React renders so multiple callbacks in the same batch cannot record the
same question twice. Transitions reject stale session/question IDs, answers that
do not match the selection, reports before reveal, and already-recorded attempts.
Question generation and ID creation run outside React state updater callbacks.

Only a valid self-report appends an attempt and changes the totals. It then
generates the next card, increments the question position, and clears selection
and reveal state. The existing question-ID reset restores the card front and
focus. A short fade introduces new cards; reduced motion and the animation
setting disable it.

Repeat avoidance tries at most eight questions. It treats reversed addition and
multiplication operands as the same fact. If every sampled question repeats the
previous fact, it uses a valid repeated fact with a fresh ID rather than looping.
Generated questions are checked against the session's operations and difficulty.
Invalid results and thrown errors consume a budget of three failed generation
calls within the existing eight-call repeat limit. Exhaustion uses a separately
validated fallback for the same skills and level. Review fallbacks remain related
to their original pattern. If the fallback also fails, the card shows **Try Again**
and **Return Home**, preserving accepted attempts. Preparing a result and its
mistake/statistics changes succeeds before replacing live state; failures leave
the revealed card available for a self-report retry.

Finite sessions stop immediately after their configured attempt count, record a
completion timestamp, and navigate to their summary. Continuous sessions omit
fixed progress and offer **End Session**.
Ending with a selected but unreported card asks for confirmation; the unfinished
card is excluded from the summary. An empty session can end with zero attempts.

Direct navigation without a session redirects to setup with a friendly explanation
and a home action. Completed sessions go to
their summary, and opening the summary during active practice returns to the
current card. Active cards survive route changes and refreshes, including the
question ID, option order, selected answer, reveal state, progress, and review
queue. Leaving the card offers **Keep Practicing**, **Leave for Now**, or
**End Session and Leave**. Other pages offer **Resume Session** while it is active.

Tests cover all finite lengths, continuous practice beyond 20 attempts, exact
completion, disagreement with arithmetic correctness, rapid and stale callbacks,
Strict Mode batching, selection/reveal gating, repeat exhaustion, duplicate IDs,
generation recovery, navigation resume, and pending-card end confirmation.

## Session summaries

`calculateSessionSummary` derives attempted, correct, and incorrect counts from
recorded attempts. Accuracy uses the student's self-reports, rounded to the nearest
whole percentage, and is `0%` for an empty session. Operations practiced include
only operations with completed attempts; the selected difficulty is also shown.
The review count includes every completed attempt with `source: 'mistake-review'`.
Regular practice currently produces zero review attempts.

**Practice Again** starts a fresh session with the completed session's operations,
difficulty, and length. A synchronous session-ID guard prevents rapid clicks from
starting multiple sessions. **Change Settings** returns to `/practice/setup` with
the previous choices restored. **View Statistics** opens the statistics dashboard,
and **Return Home** opens `/`. **Practice Mistakes** opens review setup with an
eligible skill/level plan and is disabled with an explanation when no active
patterns remain. Practice Again preserves review mode while matching patterns
remain; after mastering them all, it opens regular setup for a new adventure.

Completion is recorded once: inactive sessions reject later reports,
end requests, and retries, preserving the original completion timestamp and
preventing further question generation. Rendering or revisiting a summary only
reads the completed snapshot. Persistence upserts one metadata record per session
ID and appends each recorded attempt once.

Tests cover empty and rounded accuracy, self-report semantics, practiced
operations, review counts, summary navigation, repeated visits, all session
lengths, rapid restarts, and repeated completion events.

## Local data persistence

`src/services/storage.ts` wraps guarded JSON reads and writes. It catches errors
when accessing storage, reading, parsing, serializing, or writing. Read results
distinguish absent, invalid, and unavailable data; writes also identify quota
failures. Identical serialized values are not written again.

`progressPersistence.ts` loads and saves independently validated categories:

| Key                            | Data                                        |
| ------------------------------ | ------------------------------------------- |
| `mathPractice.settings`        | All `AppSettings` fields                    |
| `mathPractice.sessions`        | Latest 100 session metadata records         |
| `mathPractice.attempts`        | All completed attempts                      |
| `mathPractice.statistics`      | Overall, operation, and difficulty totals   |
| `mathPractice.version`         | `{ "version": 1 }`                          |
| `mathPractice.mistakePatterns` | Validated, deduplicated mistake patterns    |
| `mathPractice.activeSession`   | Versioned live card and progress checkpoint |

Attempts include selected answers, self-reports, arithmetic, difficulty, source,
session/question/attempt IDs, and timestamps. Selecting or revealing an answer
does not save a result. Starting a session saves metadata; self-reports update
metadata, attempts, totals, and mistake patterns; ending saves the completion
timestamp. Capping recent session metadata does not remove attempts or reduce
aggregate totals.

Validation checks settings, supported operations and lengths, arithmetic bounds,
nonnegative integer answers, dates, IDs, duplicate attempts, session totals, and
consistent aggregate groups. Missing categories use defaults. A corrupt category
recovers independently without deleting other categories or unrelated keys.
Partially damaged attempt/session lists retain valid records and reject duplicate
identities without summing their counts. Mistake lists retain their existing
record-level salvage and mastery rules. Invalid preference objects reset only
the settings category.
Missing, corrupt, or lagging statistics are rebuilt from readable attempts,
including same-sized caches with inconsistent operation, difficulty, or result
counts. Larger consistent aggregates survive loss of attempt details.

Unversioned data is version 0. The initial migration accepts independently
validated category shapes and upgrades the metadata to version 1. A migration
registry provides the place for later version-by-version conversions. Unsupported
newer versions, corrupt version metadata, and inaccessible storage on startup
disable writes to protect data; reload after resolving the problem. Version
metadata is written only after every category saves successfully.

Storage failures leave practice usable in memory and show an accessible, friendly
warning. A live session's complete recovery checkpoint saves before category
writes, so a failed category write restores consistent attempts, totals, and
mastery from that checkpoint. A failed checkpoint write stops category writes;
practice continues in memory with the save warning. Completion first writes a
checkpoint with no active session, then saves categories and removes recovery
state. Interrupted cleanup cannot resurrect a completed card. Outside active
recovery, categories remain independent and a lagging statistics cache is repaired
from valid attempts on startup. Clearing browser data removes saved progress.

The settings page and the practice card-animation control use persisted
preferences. No backend is involved.

Tests cover JSON round trips, validation, corruption in each category, missing
data, migration/version protection, quota and access failures, partial writes,
recovery, history retention, Strict Mode, duplicate prevention, settings, and
history surviving application remounts.

## Statistics

`src/utils/statistics.ts` contains pure calculations for overall, operation, and
difficulty totals. The same functions update and rebuild the persisted aggregate
cache, preserving earlier totals when attempt details have been lost. Counts use
the child's self-reports, including when their selected answer differs from the
correct answer. Accuracy is `correct / attempted × 100`, with `0%` for zero
attempts; displayed percentages round to the nearest whole number.

The statistics page displays overall metrics, cards for every operation and all
four difficulty levels, and recent sessions sorted by start time, newest first.
Session cards show local dates/times, configured operations, difficulty, totals,
and accuracy. Completed, in-progress, and unfinished sessions are labeled
explicitly. Empty history and unused operation/difficulty groups have clear empty
states. A current session's **Continue Practice** link returns to its card.
Responsive grids adapt from four to two to one column, while history metrics and
details stack on small screens.

**Reset Statistics** opens the browser's native confirmation dialog with the
specified prompt. Cancellation leaves progress unchanged. Confirmation clears
attempts, session records, and all aggregate counts in memory and local storage.
Settings, schema metadata, mistake-pattern data, and unrelated storage keys stay
unchanged. Reset also invalidates the active session and stale callbacks so they
cannot restore erased history; the current setup choices remain in memory.

If the reset cannot be saved, the page explains that saved history may return
after a reload and keeps the reset action available to retry. The existing global
storage warning also remains visible. Reset is disabled when there is no history
to clear and no failed reset to retry.

Tests cover all sixteen operation/difficulty combinations, mixed totals,
self-report semantics, accuracy and rounding, zero attempts, ordering, preserved
aggregate history, populated/empty components, confirmation cancellation and
acceptance, keyboard activation, durable reset, preference preservation, save
failure/retry, live updates, and invalidation of active-session callbacks.

## Advanced mistake statistics

The statistics page includes a **Mistakes and mastery** section with active and
mastered pattern counts, similar review questions attempted, and correct review
answers. `src/utils/mistakeStatistics.ts` derives these values from validated saved
records without introducing another persisted cache. Review totals count attempts
with `source: 'mistake-review'`, including legacy unattributed history. Correct
review answers use `selfReportedCorrect`, regardless of the selected option.
Current mastery counters are not used as historical review totals because an
incorrect report resets those counters.

The most frequently missed operation uses the sum of saved `incorrectCount`
values for each original operation, including mastered patterns. An incorrect
inverse review therefore contributes to its original pattern's operation. All
operations tied for the highest positive count are shown; empty data has no
winner. Counts are not added again from attempt history.

**Active** and **Mastered** buttons show separate lists of frequently missed
number facts. Each list sorts numerically by incorrect count, descending. Equal
counts share a competition rank (`1, 1, 3`); recent misses appear first within a
tie, followed by stable operation, operand, difficulty, and ID ordering. Facts at
different difficulty levels remain separate patterns. Each card includes the
equation and correct answer, difficulty, incorrect count, local last-missed
date/time, recorded mastery status, and an accessible progress bar.

Progress uses the configured mastery threshold and preserves the recorded status
when that threshold changes. Mastered records remain complete; active records do
not become mastered merely by viewing statistics. Progress bars stay bounded
while showing the true saved correct-review count. Both views provide friendly
empty states, and the review action opens the existing Mistake Review setup.

Reset Statistics clears review attempt totals with the other attempt history;
saved patterns, their miss counts, and mastery remain. The page explains this
distinction. Clear All Application Data on Settings erases those saved patterns.
The new section uses the existing card styles, colors, typography, and responsive
grids. Tests cover aggregation, self-report semantics, inverse attribution,
sorting and ties, status separation, thresholds, empty states, live mastery
transitions, keyboard filters, and reset/reload behavior.

## Application settings

The settings page saves sound, card-animation, explanation visibility, default
operations, difficulty, and session length automatically through the validated
settings API. Defaults are sound off, animation/explanations on, no selected
operations, Beginner difficulty, and 10 questions. An empty default skill list is
allowed; students must choose a skill on setup before starting. Native checkboxes
and radios support keyboard use and expose selected states in text and color.

New sessions begin with saved defaults. Explicitly editing the current session
preserves its plan, while **Practice Again** repeats the completed plan. Individual
session changes do not overwrite defaults. Changing presentation preferences does
not alter the current question, selected answer, or recorded totals. Explanations
can be hidden while correct/selected answers remain visible. Device reduced-motion
preferences always take precedence over the animation setting.

Optional sound uses the browser's Web Audio API without assets, external services,
or dependencies. It is off by default and plays the same quiet, 0.18-second sine
tone after either accepted self-report. Loading, changing settings, selecting,
flipping, and duplicate callbacks never play it. Contexts close when playback
ends; unsupported audio and failures are silent, and resuming a suspended context
has a one-second timeout.

`AppSettings.masteryThreshold` remains a positive integer in the underlying model,
validated and persisted with the other settings. Its original value is the named
`DEFAULT_MASTERY_THRESHOLD` constant in `src/config/storage.ts` (3). Updating other
preferences preserves a custom threshold. Review uses this saved value; the
child-facing settings page does not expose a mastery-threshold control.

**Clear All Application Data** uses a strong native confirmation warning. On
confirmation it invalidates the active session, clears the setup snapshot, and
removes all seven known `mathPractice.*` keys, including active recovery, mistake patterns, and schema
metadata. It restores the original settings and empty progress, initializes fresh
version-1 data, and returns home. Other applications' keys remain untouched.
Cancellation leaves everything unchanged.

If deletion fails, the app stays on Settings with a clear warning and a retry
action. Practice is reset in memory, but some saved data may return after a reload.
Automatic writes stay disabled after a partial deletion so old snapshots cannot
refill erased keys. A successful explicit retry enables saving again. An explicit
clear can also reset corrupt or unsupported-version data.

Tests cover saving/loading, all session lengths, default precedence and overrides,
live presentation preferences, keyboard controls, custom mastery thresholds,
sound opt-in and duplicate prevention, audio cleanup/failures, clear confirmation,
rapid clicks, partial deletion, retry, original defaults, unrelated key protection,
and invalidation of old session callbacks.

## Mistake tracking

`src/services/mistakeTracking.ts` records regular-practice mistakes only for
newly accepted attempts whose `selfReportedCorrect` is `false`. A wrong selection,
flipping the card, or ending an unreported card creates no mistake. A correct
selection reported as wrong does create one; an incorrect selection reported as
right does not. The persisted attempt ledger and synchronous session guards
prevent repeated callbacks, completion, and snapshot saves from counting twice.

Regular-practice pattern identity is operation, ordered operands, and difficulty.
Repeated mistakes across questions and sessions retain the same pattern ID,
increment `incorrectCount`, and use the attempt's timestamp for `lastIncorrectAt`.
New patterns start with count 1, `similarCorrectCount: 0`, and `mastered: false`.
A repeated incorrect report resets similar-correct progress and reopens mastery.
Reversed operands are separate patterns that can produce related review questions.
Regular correct reports do not advance similar-question mastery.

Patterns save under `mathPractice.mistakePatterns` and load at startup. Validation
checks every required field, safe integer counters, ISO timestamps, operation,
difficulty, and the existing arithmetic constraints. Malformed records are
discarded individually, retaining valid patterns and other progress, with the
existing friendly recovery warning. Duplicate stored snapshots retain the first
stable ID, the latest snapshot's review state, and the largest incorrect count;
counts are not summed because snapshots may overlap. An ID collision across
different facts discards the later conflicting record.

This optional category fits schema version 1 without changing older category
shapes. An absent category starts empty; historical attempts are not replayed or
backfilled. Storage write failures keep patterns usable in memory and show the
existing save warning. The active-session checkpoint includes attempts, patterns,
and totals together so partial category writes recover without replaying mistakes
or mastery changes. Later successful saves repair the independent categories.
Reset Statistics preserves patterns; Clear All Application Data erases them and
starts an empty collection.

Tests cover all sixteen operation/difficulty combinations, required fields, zero
answers, stable IDs, repeated mistakes, mastery reset, identity boundaries,
self-report disagreement, rapid replays, card interactions, remounts, malformed
records, duplicate recovery, category isolation, and storage failures/retry.

## Similar question generation

`src/services/similarQuestionGenerator.ts` exports
`generateSimilarQuestion(pattern, options?)` and
`createSimilarQuestionGenerator(options?)`. The first generates one question; the
second returns a generator function with its own recent-question history. Each
question comes from a validated mistake pattern and includes a fresh ID, four
shuffled unique answer choices, `source: 'mistake-review'`, and
`mistakePatternId: pattern.id`.

The strategies preserve a concrete relationship to the original mistake:

| Strategy                       | Original mistake | Example related question | Relationship                                     |
| ------------------------------ | ---------------- | ------------------------ | ------------------------------------------------ |
| Nearby numbers                 | `8 × 7 = 56`     | `8 × 6 = 48`             | A neighboring multiplication fact                |
| Reversed operands              | `8 × 7 = 56`     | `7 × 8 = 56`             | Same factors and product                         |
| Multiplication/division family | `8 × 7 = 56`     | `56 ÷ 8 = 7`             | Undo multiplication using the same three numbers |
| Division/multiplication family | `56 ÷ 7 = 8`     | `7 × 8 = 56`             | Rebuild the dividend from divisor and quotient   |
| Addition/subtraction family    | `3 + 4 = 7`      | `7 − 3 = 4`              | Remove one addend to recover the other           |
| Subtraction/addition family    | `7 − 3 = 4`      | `3 + 4 = 7`              | Recombine the removed amount and remainder       |

Nearby candidates change either or both operands by at most two. Division also
uses nearby divisors and quotients (within two) to form exact dividends. Every
candidate passes the existing arithmetic validator at `pattern.difficulty`;
negative subtraction, zero divisors, fractions, and out-of-range facts are
discarded. Reversal applies only to addition and multiplication. Fact families
include both inverse equations and the alternate subtraction/division member
where valid. The exact original question is always excluded.
The optional `allowedOperations` list filters inverse questions to the session's
selected skills as well.

A related fact can be mathematically correct and still exceed the level's limits.
For example, Level 1 permits `10 + 10`, but `20 − 10` exceeds its subtraction
operand range. Automatic selection uses another valid strategy in that case.
The optional `strategy` value (`nearby`, `reversed`, or `fact-family`) restricts
generation to that strategy; an unavailable strategy throws
`SimilarQuestionGenerationError` with `attempts: 0` instead of changing difficulty.

Use a generator instance for repeated calls:

```ts
const nextReviewQuestion = createSimilarQuestionGenerator()
const question = nextReviewQuestion(pattern)
```

Each instance remembers copies of its last five arithmetic fact identities,
independent of IDs and choice order. It prefers facts outside that recent window
across all strategies. If every candidate is recent, it reuses the least recently
seen fact. A strategy with just one valid candidate necessarily repeats it.
History stays local to the instance and advances only after successful generation.
The standalone function is stateless; supply `recentQuestions` (oldest first) to
apply the same policy using caller-owned history. Only the last five entries count.

Candidate enumeration is finite, including fallback selection. ID, randomness,
and answer-choice failures retry three times by default, with the existing hard
limit of ten configurable attempts. Errors retain the attempt count and cause;
invalid patterns/options fail before generation. The `random` and `createId`
options allow reproducible tests. This service generates review cards; result
tracking updates mastery separately after an accepted self-report.

Tests exercise each strategy, all operation/level combinations, zero and boundary
facts, unavailable inverse families, history exhaustion, mutation isolation, and
bounded failures. Four seeded batches generate 128 original patterns for every
operation/level pair and test both automatic and nearby review generation:
16,384 related questions in total. Independent assertions check arithmetic,
numeric limits, similarity, metadata, IDs, choices, and shuffled answer positions.
Failures report the seed, sample, original pattern, generated question, random
draws, and replay command.

## Personalized mistake review

Setup offers **Regular Practice** and **Mistake Review** with keyboard-accessible
radios and a count of active patterns. Review is disabled with an explanation
when there are none. Students select skills, a level, and a session length as
usual; review uses only unmastered patterns matching those skills and level.
It displays the matching count and blocks starting a plan with no matches.
Related inverse questions must also use a selected operation.

`src/services/mistakeReview.ts` calculates priority as:

```text
2 × log2(incorrectCount + 1)
  + 3 / (1 + daysSinceLastIncorrect / 7)
  + 3 / (1 + similarCorrectCount)
```

Each factor independently increases priority for frequent/recent misses or little
successful review. Scores are grouped into integer bands, with random ordering
inside a band. A review round visits each matching active pattern once in priority
order before rebuilding the queue. This mixes patterns without starving a less
frequent one. Mastered patterns leave the queue immediately, and the next round
avoids starting with the just-reviewed pattern when alternatives exist.

Every review card and new review attempt retains the original `mistakePatternId`,
including when an inverse question changes the operation. Correct self-reports
increment that original pattern's `similarCorrectCount`; selecting or revealing
an answer does nothing. An incorrect review self-report increments the original
pattern's miss count, updates its timestamp, resets similar-correct progress, and
clears mastery. It does not create a second pattern for the generated related
fact or update another record whose operands happen to match that fact.

The saved `masteryThreshold` defaults to 3. Reaching it marks the pattern mastered,
so mastery requires that many correct review self-reports since its last
incorrect report. Regular correct reports do not advance mastery. A later
incorrect regular-practice report of the original pattern reactivates its stable
record with cleared progress. Pattern changes are computed from newly accepted
attempts only; synchronous guards and the attempt ledger prevent repeated clicks
or snapshot saves from incrementing mastery twice.

Review supports 5, 10, 20, and continuous sessions. It also finishes early when
all matching patterns are mastered, showing a supportive summary and the actual
number of review attempts completed. The next card is generated against projected
mastery from the just-recorded result, so it cannot target a newly mastered
pattern. Generation failures retain the accepted attempt, retry within a fixed
budget, and use a related fallback. If no valid fallback is available, a retry
action appears; retry never recounts the attempt. Continuous review also supports End Session.

Session metadata optionally stores `mode`; review attempts optionally store the
original pattern ID, preserving version-1 compatibility with older records.
Legacy review history without attribution remains readable but cannot update or
guess a parent pattern. New review attempts always have attribution. Mastery
persists under the existing mistake-pattern key, survives refreshes, and remains
usable in memory if saving fails. Reset Statistics preserves it; Clear All
Application Data removes it. Active-card recovery preserves review attribution
and the remaining pattern queue after refresh.

Unit and integration tests cover priority factors/ties, filtered rounds, inverse
attribution, custom thresholds, mastery and reactivation, incorrect-selected but
self-reported-correct answers, the reverse disagreement, duplicate clicks,
generation failure/retry, storage failure/retry, reloads, keyboard setup, summary
navigation, early completion, and fixed-length review restarts.

## Shared types

- `question.ts`: operations, difficulty levels, question sources, and questions.
- `session.ts`: sessions, attempts, runtime state, summaries, and session actions.
- `practiceConfiguration.ts`: validated choices passed from setup to session state.
- `mistake.ts`: mistake patterns and mastery progress.
- `statistics.ts`: overall/operation/difficulty totals and derived mistake rankings.
- `settings.ts`: application preferences, practice defaults, and mastery threshold.
- `persistence.ts`: stored progress categories and the versioned recovery checkpoint.

Attempts retain both the selected answer and the self-reported result. Runtime
validation covers practice configuration, complete questions, persisted settings,
attempts, sessions, statistics, and mistake patterns.
