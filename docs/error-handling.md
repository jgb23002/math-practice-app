# Phase 19: Error handling and recovery audit

The audit follows Specification Sections 17–18 and TODO items 76–78. The
specification, arithmetic ranges, and self-report rules remain unchanged.

## Audited failures

| Failure                                  | Handling and verification                                                                                                                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Corrupted localStorage JSON              | Guarded parsing resets only the unreadable category. Tests corrupt each of settings, attempts, sessions, mistakes, and statistics independently, then check unaffected categories and unrelated application keys.                                            |
| Invalid settings                         | Existing field validators reject invalid booleans, operations, difficulty, session length, and mastery threshold. Only preferences reset to defaults; history and mastery remain.                                                                            |
| Invalid attempts                         | Valid records survive alongside malformed entries. Invalid arithmetic, fractional/negative selections, timestamps, metadata, duplicate attempt IDs, and duplicate session/question pairs are discarded. No attempt is inferred or replayed.                  |
| Invalid sessions                         | Valid session metadata survives neighboring malformed records; duplicate IDs keep the first valid record. Attempts and other categories remain independent.                                                                                                  |
| Invalid mistake patterns                 | Existing record-level recovery retains valid patterns, merges overlapping snapshots without summing misses, and preserves their recorded mastery. Tests include invalid counts and duplicate facts.                                                          |
| Corrupted statistics                     | Rebuild from readable attempts when the cache is malformed or undercounts overall, result, operation, or difficulty totals. Consistent larger aggregates can include older missing detail and remain intact.                                                 |
| Invalid active recovery                  | Keep the existing checkpoint validation and atomic recovery protocol. Ignore an unreadable checkpoint while preserving readable categories. A checkpoint warning cannot hide the warning that an unsupported schema disables saving.                         |
| Question-generation exceptions           | Retry within a fixed budget, then use a validated fallback for the same plan. A failed fallback shows friendly retry/home actions while retaining marked answers.                                                                                            |
| Duplicate/missing/invalid answer choices | Reject the whole candidate before display, retry, and validate any fallback against the same four-choice and arithmetic rules.                                                                                                                               |
| Missing session or summary               | Redirect to setup with a specific friendly explanation and Return Home. A summary requested during active practice still returns to that card.                                                                                                               |
| Storage access or quota failures         | Guard access/read/write/delete. Continue in memory with the save warning; retain the existing checkpoint-before-category ordering and failed-clear safeguards. Unsupported versions remain read-only.                                                        |
| Unexpected navigation                    | Keep the friendly unknown-route page, active-card resume notice, and leave confirmation. A failed end action cannot falsely confirm leaving or silently replace the active session.                                                                          |
| Unexpected render/router failure         | Replace raw technical screens with a friendly error component, retry where applicable, and Return Home. A page boundary keeps navigation and provider state available. An outer boundary covers provider initialization; the router has a custom error page. |
| Optional feedback randomization          | Use a fixed encouraging message when randomization fails, so accepting a result cannot break the next card's feedback. Existing varied-message behavior remains tested.                                                                                      |

## Retry and fallback policy

The underlying arithmetic and similar-question generators retain their default
three attempts, configurable hard maximum of ten, and typed errors for standalone
callers. The session layer also validates every returned candidate, including
the ID, arithmetic, difficulty, allowed operation, source, review attribution, and
four unique nonnegative integer choices with exactly one correct answer.

The session layer accepts at most **three failed generator calls** per requested
card and at most **eight calls total** when avoiding a repeated valid fact. A
low-level call may itself make its existing bounded retries. If a valid repeated
candidate is the only available result, it remains usable with a fresh question
ID. Otherwise, exhaustion attempts one fallback. No fallback relaxes the selected
difficulty, division constraints, or nonnegative subtraction.

Regular fallback facts are independent of the random generator and random
distractor service. They cover all four operations and levels, rotate through
enabled operations in mixed practice, and alternate valid operands. Nearby
integer choices always contain three distinct incorrect answers. Their order
uses the new UUID's entropy independently of a failing arithmetic random source.

Review fallbacks select from the existing finite related-fact candidates. They
exclude the original fact, respect allowed operations and difficulty, prefer
facts outside recent history, and retain `source: 'mistake-review'` and the
original `mistakePatternId`. Failure never substitutes an unrelated regular
question or silently marks a pattern mastered. If identity creation or fallback
validation also fails, the session retains its counts and exposes manual retry.

Only explicit self-reports count. Preparing an attempt, next card, mistake change,
and statistics update happens before committing either live snapshot. A preparation
exception leaves the previous card and progress intact; its self-report buttons
remain available for retry. Persisting a result still uses the Phase 18 checkpoint
protocol to prevent replay after an interrupted category write.

## Friendly errors and diagnostics

`ErrorMessage` provides semantic alert content, readable styling, keyboard-accessible
actions, and a safe home link. Full-page fallbacks focus the heading and set the
page title. Error boundaries have their own fallback outside the failed subtree;
retry is user-driven rather than an automatic render loop. Navigating away resets
the page boundary. Stored generation-error strings are never shown directly;
the UI uses fixed child-appropriate copy instead.

Known settings/start/report/end exceptions are handled in their action paths.
[React error boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
handle rendering errors; they do not replace event-handler or asynchronous error
handling. The custom [router error page](https://reactrouter.com/how-to/error-boundary)
replaces the router's developer-facing default. Neither fallback renders an
exception's message, stack, component stack, or arbitrary stored error text.

`reportDevelopmentError` logs context and diagnostics to the local console only
in development, suppresses expected fault-test noise, and emits nothing in
production. It adds no tracking, backend, or external error-reporting service.
Storage diagnostics identify category statuses and repairs without dumping saved
records. New dependencies are unnecessary.

## Simulation and verification

```bash
npm test
npm run lint
npm run format:check
npm run build
npm run check:errors
npm run check:session-recovery
npm run check:responsive
```

Focused automated suites:

- `progressPersistence.errors.test.ts` supplies malformed JSON and invalid fields,
  mixed valid/invalid lists, duplicate identities, conflicting statistics caches,
  unsupported schema versions, and a throwing storage getter. It checks that
  valid categories and unrelated keys survive reload and save.
- `practiceSession.errors.test.ts` injects throwing generators, malformed returned
  objects, duplicate choices, and an invalid fallback. Tests verify exact retry
  limits, all 16 operation/level combinations, review boundaries including zero,
  review attribution, mixed fallbacks, choice order, and terminal retry state.
- `App.errors.test.tsx` mounts the actual app in Strict Mode with localStorage.
  It exercises missing routes/state, category corruption, fallback cards,
  unavailable storage, a failed start, a failed mistake update, a failed end,
  and a page render exception. It checks friendly copy, safe navigation,
  unchanged checkpoints after failed preparation, and exact-once successful retry.
- `ErrorBoundary.test.tsx` throws during rendering and from a router loader,
  verifies that no raw stack appears, and tests retry without data erasure.
- Existing storage/recovery suites cover blocked access, serialization failures,
  quota limits, interrupted category writes, corrupt checkpoints, partial deletion,
  refresh recovery, and duplicate-report prevention. Existing feedback tests remain
  alongside new invalid/throwing-randomness cases. Diagnostics are tested under
  development, production, and test environments.

`npm run check:errors` launches the existing disposable Chrome/Vite runner. It
injects corrupt category JSON into the isolated profile, patches storage methods
to throw `SecurityError` or `QuotaExceededError` before app startup, and supplies
`NaN` randomness to force real generator/fallback paths. It checks preserved
unrelated data, continued self-report progression, home navigation, and **nine
error/recovery layouts at 320×568**, including touch targets and overflow. Existing
user data is untouched. Chrome/Chromium must be installed; `CHROME_BIN` can select
its executable. The runner stops its processes and deletes the temporary profile.

The native Phase 18 recovery/navigation suite and the 133-state responsive suite
remain regression checks. Browser storage can still be disabled, cleared, or full;
in that case the app cannot promise durable progress and explains the limitation.
Manual checks remain for browser-specific permission behavior, screen-reader
announcements, OS font scaling, and 200% zoom on the new error screens.
