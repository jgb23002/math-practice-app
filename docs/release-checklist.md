# Phase 22: Release preparation audit

Audit date: **2026-10-21**. Status: **local release candidate prepared; not
deployed, and manual/cross-browser acceptance remains open**. The specification
has not been changed to make checks pass.

## Acceptance criteria review

All 18 criteria in Section 26 have implemented feature code. The table maps the
implementation to automated evidence; it does not claim every browser or human
accessibility requirement has been verified.

| #   | Acceptance criterion            | Implementation and evidence                                                                                                                                                  |
| --- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Select one or more operations   | Native operation checkboxes and select-all/mixed behavior; `PracticeSetupPage.test.tsx`.                                                                                     |
| 2   | Select a difficulty             | Four levels with descriptions and validation; setup/provider tests.                                                                                                          |
| 3   | Fixed or continuous practice    | 5/10/20/continuous sessions; `practiceSession.test.ts`, `PracticeFlows.integration.test.tsx`; production five-card flow.                                                     |
| 4   | Multiple-choice card            | Reusable card/front/back/answer controls; card component tests and production flow.                                                                                          |
| 5   | Four unique choices             | Generator validation, operation-specific distractors, bounded retries, shuffle tests and sample matrices.                                                                    |
| 6   | Select and flip                 | Selection/reveal state, answer changes before reveal, disabled flip until selection; component and native-keyboard checks.                                                   |
| 7   | Reveal the correct answer       | Question, selected/correct answers and optional explanation on the back; `CardBack.test.tsx` and browser flow.                                                               |
| 8   | Self-report the result          | Only the explicit right/wrong buttons record results; disagreement between selection and self-report is tested.                                                              |
| 9   | Count each attempt once         | Synchronous session guards, card latch, unique attempt/question ledger; rapid-click, stale callback, recovery and production triple-click checks.                            |
| 10  | Create/update mistake patterns  | Deduplicated self-reported misses, counts/timestamps, persisted patterns; mistake-tracking/persistence tests and real browser flows.                                         |
| 11  | Generate similar questions      | Nearby, reversed, inverse and fact-family strategies with attribution/ranges; similar-question sample suites and production review.                                          |
| 12  | Persist after closing/reopening | Three actual clean Chrome process restarts on the production build verify revealed cards, completed history, earned mastery and reset. Other engines remain untested.        |
| 13  | Overall statistics              | Attempted/correct/incorrect/accuracy and safe empty states; statistics unit/component tests and production reset.                                                            |
| 14  | Operation/difficulty statistics | All four operations and levels, independently tested; statistics matrix and page tests.                                                                                      |
| 15  | Confirmed statistics reset      | Native explicit confirmation, cancel/accept coverage and preference/mastery preservation; component and production browser checks.                                           |
| 16  | No account or backend           | Static React app; no login, database, Functions or application API required. Production flows request only same-origin/embedded static resources.                            |
| 17  | Keyboard navigation             | Native Tab/arrows/Enter/Space/1–4 session flow, shortcut scoping and focus tests. Actual spoken screen-reader experience remains manual.                                     |
| 18  | Desktop/tablet/mobile interface | Responsive CSS, 133 Chrome viewport states down to 320px, and production privacy/settings layouts. Physical devices, OS-specific emulators and other engines remain pending. |

The remaining required behavior in Sections 6–23 is covered by the setup,
session/summary, persistence, settings, mistake/review/mastery, statistics,
navigation-safety, failure-recovery, accessibility and performance suites mapped
in [testing-audit.md](testing-audit.md) and [performance.md](performance.md).
No missing functional implementation was found. This is not a claim of complete
WCAG compliance, physical-device usability, or completed public-host acceptance.

Difficulty rules retain the exact stated bounds and the user-approved defaults
for unspecified ranges in `src/config/difficulty.ts`. Initial subtraction stays
nonnegative and division stays integral with nonzero divisors. Level 4 negatives
and remainders are optional/future features, not enabled. Mastery defaults to 3
and is configurable/validated in the settings model, as requested in Phase 11;
there is no child-facing threshold editor. Section 25's accounts, cloud sync,
PWA/offline installation, dashboards, fractions, and other future enhancements
are outside the initial release. Initial loading still requires a static host.

## Privacy and commit/publication review

- Application data models contain arithmetic facts, selections, self-reports,
  timestamps, locally generated random IDs, aggregate totals and preferences.
  They contain no names, contact details, account data or location fields.
- Source review found no application HTTP API calls, analytics/advertising SDKs,
  tracking pixels, third-party embeds, login flow or external practice links.
  Router/framework capability is not the same as an application making API calls.
- The production flow observed **56 same-origin/embedded static requests** across
  direct navigation, sessions, mistakes/review, refresh and browser restarts.
  No observed third-party requests, API uploads, cookies or console errors.
  Network observations cover the exercised flows, not every possible host change.
- Settings now explains local-only progress and that clearing browser data may
  erase it. The persistent footer repeats the data-loss notice on every page.
  Optional audio is synthesized locally. No backend or secret is needed.
- Normal static-file delivery still reaches the hosting provider. Netlify logging,
  dashboard integrations, snippet injection and analytics settings were not
  inspected in an actual account. The site owner must review them before launch;
  this audit does not claim Netlify processes no request metadata.
- `.gitignore` excludes environment files, credentials, Netlify/AWS local state,
  dependencies, builds, logs, coverage and compiler caches. `.env.example`-style
  placeholders remain allowed but are scanned for known credential formats.
- `check:release` reads tracked/untracked commit candidates, separately inspects
  changed staged contents, checks representative ignore rules, and scans all
  production files for known credential patterns. No known secrets were found.
  It does not inspect all Git history, ignored private files, hosting secrets or
  every possible secret format; no claim of a complete security audit is made.
- The final published output contains **8 files**: HTML, Vite's build manifest,
  and six JavaScript/CSS chunks. No source maps, raw source/tests/docs, dependency
  folders, `.env` files or test reports are published. `dist` is ignored by Git.
  Existing performance JSON reports are intentional benchmark evidence in docs,
  not student records or application deployment artifacts.

An obsolete public `.gitkeep` was being copied into `dist`; it was removed along
with the leftover placeholder in the populated statistics source folder. The
first strict production console check caught four fresh-process resource 404s;
adding an embedded SVG favicon resolved them. Console checks were not relaxed to
hide errors. The favicon requires no third-party image request.

## Executed checks

Environment: Node **24.14.1**, npm **11.11.0**, Vitest **5.0.5**, jsdom **29.1.1**,
headless **Chrome 155.0.8059.85** on macOS/Apple M2. All browser checks used
disposable profiles; existing student/browser data was not accessed.

| Check                          | Current result                                                                                                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vitest / React Testing Library | **1,306 tests in 65 files passed**, zero failures, skips or pending cases. Includes the new visible privacy/data-loss test.                                                                                                                                        |
| ESLint / Prettier / TypeScript | Passed; TypeScript also runs in the production build.                                                                                                                                                                                                              |
| Production build               | Passed; eight output files. Initial JS about 397.58 kB, initial CSS about 29.46 kB; Settings/Statistics remain separate chunks.                                                                                                                                    |
| `check:release`                | Passed static/credential-pattern checks, seven direct HTTP/browser route cases, real static assets, fixed session/summary, rapid-click prevention, mistakes, privacy notice, settings refresh, responsive settings, confirmed reset and **15 production layouts**. |
| Production browser restarts    | Three clean Chrome process restarts preserve the revealed card, exactly-once marks, completed sessions, three actual correct reviews earning mastery, preferences and reset statistics. Included in `check:release`.                                               |
| Production privacy / console   | No observed external/API traffic, cookies, runtime exceptions or console errors in the exercised production flows.                                                                                                                                                 |
| `check:responsive`             | **133 states** at 12 desktop/tablet/mobile viewport sizes, minimum 320px; includes layout, touch-target dimensions, rotation and complete sessions.                                                                                                                |
| `check:session-recovery`       | Native refresh cancel/accept, restored selections/reveals, Back/Forward, pause/resume/end and four dialog layouts passed.                                                                                                                                          |
| `check:errors`                 | Corrupted categories, invalid randomness, fallback cards, denied/full storage, missing state and nine error/recovery layouts passed.                                                                                                                               |
| `check:accessibility`          | **37 axe scans, zero violations**; native keyboard session/reset, four motion combinations and actual Chrome 200% zoom passed. **All 37 scans have incomplete contrast results** requiring human review.                                                           |
| `check:performance`            | Production 5,000-attempt workload, normal and 4× CPU simulation, deferred pages, 20-session display limit and revealed-card recovery after four new reports passed. This is not physical slower-device or school-network testing.                                  |
| npm production advisory audit  | `npm audit --omit=dev --audit-level=high` reported **zero known production dependency vulnerabilities** on the audit date. This is limited to npm's current advisory coverage.                                                                                     |
| Netlify configuration          | Build/publish/Node settings and the standard non-forced SPA rewrite checked against official documentation and the release script. Netlify's own edge runtime has not been executed.                                                                               |

**No executed checks remain failed.** The copied placeholder and favicon issues
above were fixed and their production check rerun. Production checks use Vite
preview, not Netlify CLI, an iPad simulator, or another browser engine.
The other browser suites exercise the development build. Earlier phase audit
documents retain historical results and do not replace the current results here.

## Remaining TODO audit

Completed Phase 22 items are limited to privacy review, automated Chrome testing,
all six local production-preparation tasks, and selecting Netlify. The 15 unchecked
items under Suggested First Implementation Sequence duplicated already-tested
features; they are now marked complete as bookkeeping, not new features.
Earlier unexecuted items stay unchecked.

The remaining **16 unchecked tasks** are:

| Phase | Remaining tasks                                                                | Disposition                                                                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 16    | Larger system font sizes                                                       | Test actual OS text/display scaling. Browser default-font and 200% zoom checks do not establish this.                                                                                                  |
| 20    | Screen-reader test; manually review reported issues                            | Use VoiceOver or NVDA and review incomplete contrast findings, focus, reading order and child usability.                                                                                               |
| 21    | Summarize older attempts if necessary; preserve aggregates when archiving      | Conditional work deferred: no history was archived. Several thousand attempts work without discarding detail. Any future archive needs a migration preserving review/mastery and all aggregate totals. |
| 21    | Slower devices                                                                 | Physical slower-device testing remains open; 4× CPU throttling is reported only as simulation.                                                                                                         |
| 22    | Safari; Firefox; Edge                                                          | Those engines were not run.                                                                                                                                                                            |
| 22    | iPad/tablet emulator; mobile device/emulator                                   | Chrome viewport/touch emulation passed. Actual devices or OS-specific device emulators were not used, so these boxes remain unchecked.                                                                 |
| 22    | Deploy production build                                                        | No Netlify project was created or published.                                                                                                                                                           |
| 22    | Verify every route; persistence; responsive behavior; console after deployment | Local checks passed, but these four deployment-stage tasks require the actual public origin.                                                                                                           |

## Netlify configuration and release checklist

`netlify.toml` selects `npm run build`, `dist`, Node 24.14.1 and a `200` rewrite
from `/*` to `/index.html`. `force = false` preserves real static assets. See
[Netlify SPA rewrites](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/#history-pushstate-and-single-page-apps)
and [Node configuration](https://docs.netlify.com/build/configure-builds/manage-dependencies/#node-js-environment).
Use the Git-connected deployment instructions in [README.md](../README.md).
There are no Functions, Identity settings or required application environment
variables. The local smoke check verifies SPA behavior in Vite preview and
checks the configuration text; it does not prove live Netlify rewrites.

- [x] Review every Section 26 acceptance criterion and initial required feature.
- [x] Audit privacy, dependency advisories, commit candidates and generated files.
- [x] Add visible browser-data-loss notices and remove obsolete placeholders.
- [x] Run unit/component/integration, static, build and automated Chrome checks.
- [x] Prepare Netlify build settings and direct-route rewrite configuration.
- [ ] Run a real VoiceOver/NVDA session: question/answer announcements, radio groups,
      focus after reveal/next question, summary, settings, confirmations and reset.
- [ ] Review all incomplete axe contrast results and actual focus/selected states.
      Check 200% zoom and larger native OS fonts with representative content.
- [ ] Test Safari, Firefox and Edge; test an iPad/tablet and phone/device emulator.
      Include real touch, portrait/landscape, sound permission and reduced motion.
- [ ] Try a physical slower device and a representative school/home connection.
- [ ] Review Netlify account privacy settings, logs, plugins, script injection and
      analytics. Keep tracking and advertising integrations disabled.
- [ ] Publish the Git-connected Netlify project, record the HTTPS URL, and verify
      that ordinary visitors need no account/site password.
- [ ] On that origin, open and refresh `/`, `/practice/setup`, `/practice/session`,
      `/practice/summary`, `/statistics`, `/settings` and an unknown URL. Check both
      valid sessions and safe setup redirects when session state is absent.
- [ ] Finish fixed/mixed/continuous sessions, create a mistake, review it to
      mastery, refresh a revealed card and close/reopen the browser. Verify exact
      counts, settings, summary, Reset Statistics and Clear All confirmations.
- [ ] Repeat responsive/keyboard checks on the deployed site. Inspect console and
      Network for errors, broken lazy assets, third-party scripts and progress uploads.

The live site uses its own origin's local storage. Progress from localhost,
another preview URL, browser profile or device does not automatically transfer.
Clearing browser/site data may erase progress; private browsing may not retain it.
No cloud backup/export is promised.

Run the repeatable local checks with:

```bash
npm ci
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npm run check:release
npm run check:responsive
npm run check:session-recovery
npm run check:errors
npm run check:accessibility
npm run check:performance
```

Chrome/Chromium must be installed; set `CHROME_BIN` for a custom executable path.
The accessibility report is `/tmp/math-practice-accessibility.json` by default.
Set `PERFORMANCE_REPORT` to retain fresh performance samples. The release check is
read-only with respect to Git staging and deployment: it does not commit or publish.
