# Phase 21: Performance and data management

Measured on 2026-10-21 using an Apple M2 macOS host, Node 24.14.1 and headless
Chrome 155.0.8059.85. The specification and storage schema remain unchanged.
Phase 22 is outside this work.

## Rendering and saving changes

The rendering audit found these avoidable costs:

- Selecting/revealing rebuilt global attempt arrays and session metadata despite
  recording no result. Those actions now update only live session state and its
  recovery checkpoint. Re-selecting the same answer is a no-op. Starting,
  recording, ending, and changing preferences still update their relevant data.
- An action saved synchronously and then saved again in a progress/session effect;
  Reset Statistics saved an additional time. Accepted actions now save once,
  synchronously, preserving immediate-refresh and rapid-click protection. Mount
  initialization and explicit navigation saves remain. Strict Mode can still run
  the initial mount effect twice; identical storage writes remain idempotent.
- A recovery checkpoint validated the whole history, then category saving
  validated it again. A private writer reuses the validation result within that
  same synchronous call. Each later checkpoint is fully revalidated, even when
  passed the same object. Independent category saves retain their own validation
  and partial-failure recovery behavior. There is no persistent validation cache.
- Provider callbacks changed identity on every render, reattaching navigation
  safety listeners. Actions now have stable callbacks using current refs.
  Unchanged settings avoid saves and progress updates. Status/error consumers use
  a separate memoized context, so routine session changes do not rerender the
  application content wrapper or storage warning.
- Mistake-statistics calculation scanned attempts and sorted patterns every time
  the Active/Mastered filter changed. It now uses `useMemo` with attempts/patterns
  as dependencies. Recent-session sorting is memoized separately. Overall totals
  already use incremental stored aggregates; they are not recounted per render.

Question generation remains in explicit session actions. The rare recovery path
that reconciles a stale cursor with newer durable attempts now generates its next
card in a recovery effect, outside React initialization/rendering. Server-render
and rerender tests verify that rendering does not generate questions or recount
accepted attempts.

## Production measurements

The baseline was the unchanged Phase 20 production build. Both builds used the
same deterministic 5,000-attempt/100-session fixture, isolated browser profiles,
disabled HTTP cache, and a loopback Vite preview server. No other test suites ran
during the recorded benchmark runs. CPU throttling uses Chrome's 4× slowdown;
this is a simulation, not a physical slower-device test. Network latency was not
throttled.

Each load result is the median of five fresh-document navigations. The ready
timestamp is recorded when a mutation observer sees the actual page heading,
excluding the temporary loading heading. It measures DOM readiness, not LCP,
paint completion, or completion of subsequent passive effects. Interaction times
measure the synchronous `.click()` call, including the save handler; they exclude
paint and later passive effects. There are five selection/reveal samples and
four self-report samples. Four reports precede a refresh of the revealed fifth
card, which must recover with all 5,004 attempts intact.

| Metric                                  |  Before |    After |
| --------------------------------------- | ------: | -------: |
| Initial JavaScript, raw bytes           | 412,573 |  397,487 |
| Initial JavaScript, gzip bytes          | 124,412 |  121,261 |
| Initial CSS, raw bytes                  |  40,496 |   29,466 |
| Initial CSS, gzip bytes                 |   8,377 |    6,782 |
| Initially rendered recent-session cards |     100 |       20 |
| Home DOM ready, normal CPU              | 28.8 ms |  29.4 ms |
| Home DOM ready, 4× CPU                  | 71.2 ms |  74.9 ms |
| Cold Statistics DOM ready, normal CPU   | 32.0 ms |  39.7 ms |
| Cold Statistics DOM ready, 4× CPU       | 85.0 ms | 120.0 ms |
| Select answer handler, 4× CPU           | 75.9 ms |  58.4 ms |
| Reveal answer handler, 4× CPU           | 79.5 ms |  53.5 ms |
| Record self-report handler, 4× CPU      | 83.0 ms |  63.7 ms |

Initial JavaScript decreased 3.7%, initial CSS 27.2%, and interaction handler
medians decreased approximately 23–33%. Home readiness is similar within the
observed variation; a faster home load is not established. Cold Statistics is
slower because its JavaScript/CSS download occurs on demand. Successful page
modules remain cached during subsequent in-app navigation.

The loading implementation uses an effect, a successful-module cache, an
accessible heading/status, unmount cancellation, and the existing error boundary.
This avoids the roughly 300 ms reveal delay observed with an initial React
Suspense implementation while retaining separate page bundles. Failed downloads
show friendly recovery actions and can be explicitly retried.

Gzip sizes above use Node's `gzipSync` consistently on both builds; Vite's console
can report slightly different gzip estimates. Total emitted JavaScript is
415,500 raw bytes after splitting, versus 412,573 before: splitting reduces the
initial download, not the total code needed to visit every page. The build
manifest and browser resource entries verify that Home downloads neither deferred
page. Settings/Statistics CSS is deferred with those pages.

Raw samples, ranges, resource sizes, and storage writes are retained in
[`performance-baseline.json`](performance-baseline.json) and
[`performance-current.json`](performance-current.json). Timings are small local
samples and are not universal latency guarantees.

## Large histories and storage

Automated storage tests round-trip **5,000 and 10,000 historical attempts**, plus
review fixtures, without losing overall/operation/difficulty totals, review
totals, mistake counts, or mastery. They also verify recovery, exactly-once
recording, metadata limits, larger cached aggregate preservation after missing
details, and rejection of a newly invalid divisor in a reused progress object.
The 10,000-attempt tests use an in-memory storage adapter, not a browser quota.

The production Chrome check actually saves 5,000 historical attempts, selects and
reveals five cards, records four new self-reports, and refreshes. All 5,004
attempts and the revealed card recover, with no storage warning.

Measured string storage estimates, including key names:

| State/category                                    | Estimated bytes |
| ------------------------------------------------- | --------------: |
| Initial 5,000-attempt history, no active session  |       3,057,284 |
| Active practice after four more recorded attempts |       6,124,062 |
| Active recovery checkpoint                        |       3,064,154 |
| Individual-attempt category                       |       3,005,796 |
| Session metadata                                  |          52,418 |
| Settings                                          |             434 |
| Aggregate statistics                              |           1,134 |
| Mistake patterns (empty in browser benchmark)     |              60 |
| Schema version                                    |              66 |

These are **2 × JavaScript string code units**, not measured disk usage or a
browser-capacity claim. The checkpoint duplicates history to preserve atomic
recovery if independent category writes fail. That duplication is intentional
and remains the largest storage cost. Idempotent category writes avoid calling
`setItem` when serialized content has not changed. JSON serialization and full
checkpoint validation still grow with history size.

Existing storage retains the newest 100 session metadata records. The page now
initially renders 20, with an accessible Show More Sessions action to expand the
retained history. This display limit does not discard any attempt or recalculate
aggregate totals from only visible sessions.

**No old attempts are summarized or archived.** The tested browser workload
saved successfully, so data removal/schema changes would be premature. The two
conditional archiving TODO items remain unchecked. Future archiving would need a
versioned migration preserving overall, operation, difficulty, review, and
mastery totals, parent-pattern attribution, and the complete active-session
ledger. The existing friendly storage-full/unavailable behavior remains, with
progress usable in memory and no silent history deletion.

## Dependencies, assets, and verification

All three production dependencies are used. Development dependencies support
compilation, linting, formatting, tests, or the browser audits;
`@testing-library/dom` is retained as the React Testing Library peer dependency.
No unused package was found or removed, and no dependency was added. The obsolete
`FeaturePlaceholder` component and 62 lines of its unused CSS were removed.
There are no public image assets to compress. Existing system fonts, inline
icons, and CSS decorations require zero font/image downloads, confirmed by the
production browser check.

Passed:

- **1,305 tests in 65 files**, no failed/skipped/pending cases. Affected provider
  tests were also rerun after the final no-op-setting adjustment.
- ESLint, Prettier, TypeScript (through `build`), and production build.
- Production performance, deferred-resource, and 5,004-attempt recovery checks.
- 133 responsive states, native session/navigation recovery, nine error-recovery
  layouts, and three clean Chrome process restarts.
- 37 axe scans with zero violations, native keyboard flow, motion settings, and
  actual 200% Chrome zoom. All 37 scans still contain incomplete contrast results
  requiring human review; no manual contrast review is claimed.

No executed checks remain failed. Physical slower devices, manual screen-reader
review, school-network measurements, Safari, Firefox, and Edge were not tested.
The physical slower-device TODO remains unchecked; the completed 4× CPU
simulation is reported separately.

Reproduce with:

```bash
npm test
npm run lint
npm run format:check
npm run build
PERFORMANCE_REPORT=/tmp/math-practice-performance.json npm run check:performance
npm run check:responsive
npm run check:session-recovery
npm run check:errors
npm run check:browser-persistence
npm run check:accessibility
```

The browser checks use disposable profiles and temporary local servers. They do
not read existing student/browser data, and do not download a browser. Set
`CHROME_BIN` if Chrome/Chromium is installed at a different path.
