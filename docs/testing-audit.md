# Phase 20: Comprehensive testing audit

Audit date: **2026-10-21**. Scope: all functional requirements in
`Specification.md`, its Sections 21/26, and TODO items 79–82. The specification,
approved numeric defaults, and self-report rules are unchanged. Only the Phase 20
TODO section is updated; performance/release phases remain outside this work.

## Passed checks

| Executed check                                 | Result and limits                                                                                                                                                                                                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest + React Testing Library                 | **1,294 tests in 61 files passed**; zero failures, skips, or pending tests. Baseline was 1,264 tests in 58 files; 30 cases were added.                                                                                                                                 |
| ESLint, Prettier, TypeScript, production build | Passed. No line/branch coverage percentage is claimed.                                                                                                                                                                                                                 |
| `check:responsive`                             | Passed **133 rendered states** across 12 desktop/tablet/mobile viewports, down to 320px. Tests check overflow, touch targets, card layout, rotation, and complete sessions.                                                                                            |
| `check:session-recovery`                       | Passed native refresh cancel/accept, same-card restoration, duplicate prevention, Back/Forward, pause/resume, completion, direct routes, and four dialog layouts.                                                                                                      |
| `check:errors`                                 | Passed injected corrupt categories, unavailable/full storage, invalid randomness, fallback cards, safe navigation, and nine recovery/error layouts at 320px.                                                                                                           |
| `check:browser-persistence`                    | Passed **three clean Chrome process restarts** using the same disposable profile. Exact revealed-card state, results, completed history, earned mastery, reset statistics, preferences, and unrelated keys survive. This is an automated process-close/relaunch check. |
| `check:accessibility`                          | **37 axe-core scans report zero violations**. Native Tab/arrows/digits/Enter/Space complete a five-question session and cancel/confirm statistics reset. All four animation-setting/reduced-motion combinations pass, including hidden-face accessibility-tree checks. |
| Native browser zoom                            | Passed actual Chrome **200% zoom**: CSS viewport changed from 1280px to 640px and pixel ratio from 1 to 2. Checked Home, Setup, Settings, populated Statistics, fallback, both card faces, and Summary; this is not pinch zoom or CSS scaling.                         |

Environment: Node.js **24.14.1**, npm **11.11.0**, Vitest **5.0.5**, jsdom **29.1.1**,
axe-core **4.14.0**, headless **Chrome 155.0.8059.85** on this macOS host. Browser
checks use isolated profiles and a temporary local Vite server, then stop their
processes and remove the profiles. Existing user data is not accessed. Production
compilation is tested separately; browser scripts exercise the development build.

## Failed checks and fixes

**No executed checks remain failed.** The initial axe scan found the serious
`label-content-name-mismatch` rule on answer buttons. Their visible shortcut and
“Pick me”/“Selected” hints were inside a button whose accessible name was only
“Answer N.” Visual hints now sit beside the button inside the same styled target
container, while the button's visible label is the answer number. Its accessible
name, pressed state, shortcut attribute, complete hit area, and selection feedback
remain intact. Hints do not intercept pointer events.

Regression assertions check that numeric labels exclude visual helper text and
preserve shortcut/selection semantics. The affected component/card tests, full
suite, responsive browser checks, and all 37 axe scans were rerun after the fix.
No axe rules were disabled or exclusions added to hide this finding.

The new browser harness also needed two test fixes: waiting for React's route DOM
to finish rendering, and injecting a saved generation error **after** the old
page's valid `beforeunload` save. These were checker timing/injection issues,
not application failures. Their affected checks were rerun successfully.

## Incomplete or unexecuted checks

Zero axe violations is not a completed accessibility review. **All 37 scans have
incomplete color-contrast results**, including short/symbol-only text, overlapping
backgrounds, and partially obscured elements. The report retains rule IDs,
selectors, HTML, check messages, and data. These findings require human review;
they are not silently counted as passed contrast checks or confirmed violations.

The following were **not executed in this phase**:

- Human screen-reader speech/reading-order checks with VoiceOver or NVDA.
- Human review of the incomplete axe results and general visual/usability review.
- Safari, Firefox, Edge, physical phones/tablets, and real touch ergonomics.
- Native OS font/display scaling and browser-specific permission behaviors.
- Slow-device/network benchmarks, large-history performance/archiving, deployment,
  production hosting/direct-route behavior, and the Phase 22 release review.

Phase 20 therefore completes **30 of 32 checkboxes**. “Test with a screen reader”
and “Manually review reported issues” remain unchecked. The earlier unchecked
Phase 16 OS-font item is preserved. Automated keyboard/browser/AX-tree checks
are explicitly not described as human screen-reader or manual browser testing.

## Functional requirements and TODO audit

| Specification / TODO scope           | Evidence and disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sections 1–5; Phase 1                | React/TypeScript/Vite structure, domain interfaces, dev tools, no-account/client storage architecture. Typecheck, lint, build, and test startup pass.                                                                                                                                                                                                                                                                                                                     |
| Sections 6.1–6.2; Phases 2–3         | `App.test.tsx`, `PracticeSetupPage.test.tsx`, `practiceConfiguration.test.ts`, and the new full-app flows verify navigation, welcome/actions, all operation choices/Mixed, four exclusive difficulty levels, lengths 5/10/20/continuous, validation, defaults, and keyboard interaction.                                                                                                                                                                                  |
| Sections 7–9, 18, 20.1; Phases 4–5   | `questionGenerator.test.ts`, `questionGenerator.samples.test.ts`, `answerChoices.test.ts`, `answerChoices.matrix.test.ts`, shuffle/math/ID tests and question-validation tests cover all 16 operation/level pairs, exact independent bounds, nonnegative subtraction, nonzero/exact division, plausible/unique distractors, bounded work, four positions and malformed objects. Previously agreed unspecified bounds remain documented separately from the specification. |
| Sections 6.3, 6.5, 12–13; Phases 6–8 | AnswerChoice/CardFront/CardBack/QuestionCard/ProgressBar tests and practice/session/summary suites cover one selected answer, flip gating, answer changes/locking/reset, explanations, no automatic result on select/reveal, exact-once explicit marks, progress, lengths, ending, summary metrics and all summary actions.                                                                                                                                               |
| Sections 10–11, 20.4; Phase 9        | Storage/validation/persistence/error/recovery suites cover JSON, all model fields, version migration/read-only protection, absent/corrupted categories, valid-record salvage, quota/access failures, settings, session/attempt/history retention and unrelated keys. New clean-process browser restarts verify the previously checked browser-restart requirement directly, beyond remount/refresh tests.                                                                 |
| Sections 6.6, 20.3; Phases 10/15     | Statistics, summaries and mistake-statistics suites cover safe zero accuracy, self-report counts, all operation/level breakdowns, recent ordering, active/mastered filters, ties, miss dates/counts, mastery progress, review metrics, empty states, confirmed reset and preservation of preferences/patterns.                                                                                                                                                            |
| Section 6.7; Phase 11                | Settings/provider/sound suites verify saved preferences, explanations, animation, optional sound, defaults/overrides, feedback preference, and clear-all confirmation/partial-deletion recovery. Mastery threshold remains validated/configurable in the underlying settings model, as requested in Phase 11; it has no child-facing control.                                                                                                                             |
| Sections 6.4, 20.2; Phases 12–14     | Mistake tracking/persistence/mastery/review and similar-question suites verify self-report identity, deduplication, nearby/reversed/inverse/fact-family strategies, boundaries, prioritization/rounds, original attribution, three-correct mastery, custom thresholds, exclusion/reactivation and persisted progress.                                                                                                                                                     |
| Sections 14–15; Phases 16–17         | DOM/component assertions, native keyboard/AX-tree tests, motion matrix, native 200% zoom, 320px and other viewport checks pass. Human contrast, screen-reader, OS scaling and physical-device checks remain as listed above.                                                                                                                                                                                                                                              |
| Sections 16–18; Phases 18–19         | App/navigation/error suites and native recovery/error checks verify direct/missing/unknown routes, leave/stay/pause/end decisions, completed-session cleanup, stale/rapid callbacks, atomic recovery, bounded retries, validated same-plan fallback cards, friendly alerts and safe home actions with no rendered raw exception details.                                                                                                                                  |
| Section 21; Phase 20                 | Required unit, component, integration and edge categories are mapped below. The two human accessibility tasks remain open.                                                                                                                                                                                                                                                                                                                                                |
| Section 22                           | Source audit found no PII entry fields, child-facing external links/ads, analytics, practice-data fetches or backend/login. Storage warning explains device/browser-data loss. Axe is local and development-only. Phase 22 release/privacy review is not marked complete from this source audit.                                                                                                                                                                          |
| Sections 23/25; Phases 21–22         | Performance/archiving, additional browsers, release/deployment and future enhancements are not implemented or newly checked off. Build/test success alone does not establish these requirements.                                                                                                                                                                                                                                                                          |
| Section 24 MVP                       | Functional MVP areas have automated evidence above; outstanding human accessibility/release verification still applies.                                                                                                                                                                                                                                                                                                                                                   |

Acceptance criteria in Section 26 map as follows: **1–3** setup/session suites;
**4–9** card and full-app flows; **10–11** mistake/review/mastery suites; **12**
three real Chrome process restarts; **13–15** statistics/render/reset suites;
**16** client-only source architecture plus local test deployment; **17** native
keyboard journey; **18** viewport-emulated responsive checks. Criteria 17–18 still
need their human/other-browser/device checks before a broad release claim.
Section 27's one-profile, local-device, self-report, integer-division and
nonnegative-subtraction assumptions are retained.

## Testing requirements: specific coverage

| Category                          | Covered cases and principal evidence                                                                                                                                                                                                                                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit: arithmetic/difficulty       | All four operations at all four levels; carrying/borrowing/factor families, zero/min/max, every allowed divisor boundary, no fractional division. Existing seeded sample tests independently assert rules and include failing seed/sample/question/replay information.                                                                          |
| Unit: choices/shuffle             | Existing operation-specific/edge tests plus the new 16-case fixed-fact matrix: two deterministic seeds × 128 generations per operation/level, exactly four unique nonnegative integers, correct answer once, every correct-answer position, multiple orders and unchanged input. Reachability is tested; statistical uniformity is not claimed. |
| Unit: statistics                  | Overall/operation/difficulty/self-report accuracy and empty-safe rounding. New all-correct, all-incorrect, alternating matrices each aggregate 320 attempts across all 16 groups; reorder, seven-item chunks and JSON round trips retain identical totals.                                                                                      |
| Unit: persistence/mistakes/review | Storage serialization/validation/failure suites, mistake identity/update/deduplication, all similarity strategies and range restrictions, priority, attribution, thresholds, mastery/reactivation and no replay.                                                                                                                                |
| Components                        | All operation/difficulty selection behaviors, answer selection/zero, flip gating/front/back/focus, both self-report buttons, progress, completion/summary, empty/populated statistics, Reset/Clear confirmation and dialog focus/cancellation already have tests; label regressions add two new cases.                                          |
| Integration: addition             | Real generator and full app under Strict Mode: five correct reports and five incorrect reports in separate runs, correct summaries, persisted per-group totals, pattern counts and remount.                                                                                                                                                     |
| Integration: mixed                | Real 20-question sessions at each level, all four enabled operations observed with fixed seeds, every accepted attempt checked against its card/selection/report, consistent totals/group statistics, and rapid conflicting clicks counted once.                                                                                                |
| Integration: continuous           | Real mixed practice beyond 20 attempts, cancelled/confirmed ending and exclusion of the unfinished revealed card. An untouched continuous session also ends with safe zero totals, no mistakes and no unload warning.                                                                                                                           |
| Integration: personalized review  | A real regular mistake creates a pattern; two correct reviews remain active; remount a third revealed review; one rapid correct report masters exactly once. Summary/review/overall statistics agree. Reset cancellation changes nothing; confirmed reset and a remount preserve mastered facts, preferences and unrelated keys.                |
| Browser lifecycle                 | Native refresh and Back/Forward tests plus actual Chrome process close/relaunch at a revealed card, after earned mastery/completion, and after a reset. Persisted state is compared across restarts.                                                                                                                                            |
| Edge cases                        | Zero attempts, all correct, all incorrect, missing/corrupt/full/denied storage, invalid plans/navigation/question objects, rapid repeated/mismatched reports, zero divisors, fractional quotients, duplicate distractors, and 320px layouts are covered by the suites above.                                                                    |

The new full-app flows seed arithmetic randomness only; they do **not** mock the
question generator, distractor generator, review generator, storage service, or
provider. Production UUID generation remains separate. Named seeds and question
context make arithmetic failures reproducible; callback/motion tests use narrowly
controlled dependencies where a particular failure or preference must be forced.

## Reproduce the checks

```bash
npm ci
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npm run check:responsive
npm run check:session-recovery
npm run check:errors
npm run check:accessibility
npm run check:browser-persistence
```

Chrome/Chromium must be installed. `CHROME_BIN` can select its executable. Browser
scripts need permission to start a loopback server and browser; no browser is
downloaded. Native zoom uses Chrome's own preference inside the disposable profile
and verifies viewport/pixel-ratio changes. A modified Chromium lacking that API
will fail the check explicitly rather than substituting CSS zoom.

The accessibility JSON report defaults to
`/tmp/math-practice-accessibility.json`; override with `ACCESSIBILITY_REPORT_PATH`.
It retains incomplete findings separately from violations and includes the actual
browser version, native checks, failures and unexecuted checks. An optional Vitest
JSON report can be generated with:

```bash
npm test -- --reporter=default --reporter=json --outputFile.json=/tmp/math-practice-vitest.json
```

Use `npm test -- src/app/PracticeFlows.integration.test.tsx` for the new full-app
journeys. The original sample suites retain their failure replay commands.
Earlier phase audit documents describe earlier runs; their historical results do
not substitute for the current results or the outstanding human checks here.
