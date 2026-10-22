# Math Practice App — Development History

## Project Information

**Project:** Math Practice Web Application  
**Repository:** [jgb23002/math-practice-app](https://github.com/jgb23002/math-practice-app)  
**Development Environment:** Visual Studio Code  
**AI Development Tool:** AI coding assistant integrated with VS Code  
**Technology Stack:** React, TypeScript, Vite, CSS, React Router  
**Testing Tools:** Vitest, React Testing Library, ESLint, Prettier, TypeScript, and automated Chrome accessibility checks  
**Storage:** Browser localStorage  
**Deployment Platform:** Netlify

---

## 1. Development Overview

This project was developed as an individual university assignment to create an interactive Math Practice application for children ages 7–12.

The application supports addition, subtraction, multiplication, and division across four difficulty levels. It includes interactive multiple-choice question cards, practice sessions, performance statistics, persistent practice history, mistake tracking, similar-question generation, and personalized mistake review.

Development followed the 22 phases defined in the instructor-provided `TODO.md`.

I used an AI coding assistant to implement features incrementally, generate automated tests, diagnose problems, and review the application against the software specification.

Rather than implementing the complete application in one request, I divided development into smaller phases and used Git commits to record progress.

My development workflow included:

1. Reviewing `specification.md` and `TODO.md`.
2. Planning the implementation with the AI assistant.
3. Requesting implementation of individual phases.
4. Reviewing code changes and AI explanations.
5. Running automated tests and performing manual verification.
6. Reporting actual problems and requesting targeted fixes.
7. Saving AI conversation evidence.
8. Committing meaningful changes to Git.

The Git repository contains an implementation commit for each of the 22 phases, followed by debugging, testing, and documentation commits.

---

## 2. Git Development History

The following table records the original development milestones in chronological order.

Commit hashes and dates were obtained from the local Git history.

| Date       | Commit    | Development Milestone                                      |
| ---------- | --------- | ---------------------------------------------------------- |
| 2026-10-20 | `b398fba` | Phase 1: Configure project and shared types                |
| 2026-10-20 | `44d36e4` | Phase 2: Build home page and navigation                    |
| 2026-10-20 | `c3d2cdc` | Phase 3: Add practice configuration                        |
| 2026-10-20 | `cce219c` | Phase 4: Implement arithmetic question generator           |
| 2026-10-20 | `c053017` | Phase 5: Generate multiple-choice answers                  |
| 2026-10-20 | `00f5c13` | Phase 6: Implement interactive question cards              |
| 2026-10-20 | `c8530e8` | Phase 7: Implement practice session management             |
| 2026-10-20 | `2d29665` | Phase 8: Add session completion summary                    |
| 2026-10-20 | `2d5969a` | Phase 9: Persist practice data locally                     |
| 2026-10-20 | `7703141` | Phase 10: Implement statistics dashboard                   |
| 2026-10-20 | `f2779f0` | Phase 11: Add persistent application settings              |
| 2026-10-20 | `8a8df71` | Phase 12: Track incorrect question patterns                |
| 2026-10-21 | `e80c082` | Phase 13: Generate similar practice questions              |
| 2026-10-21 | `2fa0380` | Phase 14: Implement mistake review and mastery             |
| 2026-10-21 | `e634ad7` | Phase 15: Add advanced mistake statistics                  |
| 2026-10-21 | `db1de3e` | Phase 16: Improve keyboard and screen-reader accessibility |
| 2026-10-21 | `ae4cb02` | Phase 17: Polish responsive child-friendly interface       |
| 2026-10-21 | `2e795d4` | Phase 18: Add session recovery and safe navigation         |
| 2026-10-21 | `062d364` | Phase 19: Add robust error handling                        |
| 2026-10-21 | `c3ea526` | Phase 20: Complete automated and integration tests         |
| 2026-10-21 | `1c62a67` | Phase 21: Optimize performance and data handling           |
| 2026-10-21 | `ccad30e` | Phase 22: Prepare verified production release              |

### Additional Development Commits

| Date       | Commit    | Change                                                 |
| ---------- | --------- | ------------------------------------------------------ |
| 2026-10-21 | `db1ecad` | Fix keyboard answer selection and add regression tests |
| 2026-10-21 | `5332b96` | Add development evidence documentation                 |
| 2026-10-21 | `a98ac6d` | Add AI conversation and verification screenshots       |
| 2026-10-21 | `f3be970` | Finalize repository documentation                      |

Subsequent commits, including deployment updates, can be viewed in the repository's live Git history.

---

## 3. AI-Assisted Development Process

### 3.1 Initial Requirements Analysis

I began by asking the AI assistant to read the provided software specification and implementation TODO list before modifying any files.

The assistant reviewed the application requirements, recommended architecture, development phases, and existing project structure.

I then requested Phase 1 implementation only, including React and TypeScript configuration, ESLint, Prettier, Vitest, React Testing Library, shared interfaces, and the initial application structure.

After implementation, I requested an additional audit against the Phase 1 checklist.

**Evidence:** [Initial Development](evidence/01-initial-development/)

### 3.2 Arithmetic Question Generation

During Phase 4, I asked the AI assistant to implement question generation for all four arithmetic operations and all four difficulty levels.

The implementation needed to enforce mathematical constraints, including nonnegative subtraction results, nonzero divisors, whole-number division answers, and valid operand ranges.

The assistant identified unspecified numeric boundaries and requested clarification before implementing its defaults.

I also requested stronger automated tests for arithmetic boundaries, invalid questions, and division rules.

The agent reported executing extensive seeded generation tests to verify mathematical correctness.

**Evidence:** [Feature Implementation](evidence/02-feature-implementation/)

### 3.3 Personalized Mistake Practice

During Phases 12–14, I used the AI assistant to develop mistake tracking, similar-question generation, and personalized review sessions.

Incorrectly reported questions create persistent mistake patterns. These patterns are used to generate related arithmetic questions.

The review feature tracks correct similar-question responses and marks mistake patterns as mastered when the configured threshold is reached.

The implementation includes automated tests for question validity, mistake attribution, review progress, and mastery transitions.

**Evidence:** [Feature Implementation](evidence/02-feature-implementation/)

---

## 4. Debugging Case Study — Keyboard Accessibility

### Problem Discovery

During manual testing, I identified a keyboard accessibility issue in the interactive question card.

The interface displayed the instruction:

"Keyboard tip: Tab to this card, then press 1–4 to pick an answer."

However, the question card could not be reached as instructed using Tab, and the number keys did not select the answers through that interaction.

### Expected Behavior

- Tab should allow keyboard focus to reach the question card.
- Pressing keys 1–4 should select the corresponding answers.
- The selected answer should become highlighted.
- The Flip Card button should become enabled.
- Answer selection should be locked after flipping.
- Mouse and touch functionality should remain unchanged.

### AI-Assisted Investigation

I provided the AI assistant with a structured bug report describing the expected behavior, actual behavior, reproduction steps, and requirements for the correction.

The assistant identified a focus-management issue in `QuestionCard.tsx`.

The keyboard event handler already existed, but the question card's `<article>` element lacked a `tabIndex`, preventing direct focus through the normal Tab sequence.

### Code Correction

The AI added the following attributes:

```tsx
aria-describedby={questionDescriptionId}
tabIndex={isCardFlipped ? -1 : 0}
```

This allowed the card to receive keyboard focus before flipping while removing it from the normal Tab sequence afterward.

Existing keyboard event handling and mouse/touch interactions were preserved.

### Regression Testing

The AI added regression tests for keyboard focus, number-key selection, visual selection feedback, answer locking, and compatibility with other interaction methods.

The recorded post-fix results were:

| Verification                                     | Result                          |
| ------------------------------------------------ | ------------------------------- |
| Targeted keyboard accessibility tests            | 13 passed                       |
| Full automated test suite                        | 1,311 passed                    |
| Full-suite test files                            | 65 passed                       |
| Failed automated tests                           | 0                               |
| Skipped automated tests                          | 0                               |
| ESLint, formatting, TypeScript, production build | Passed in recorded verification |

Manual browser screenshots were captured showing a visible focus outline on the question card and a selected answer with the Flip Card button enabled.

The screenshots document the visible states; the actual keyboard interaction should also be recorded in the manual testing results.

### Debugging Reflection

This issue demonstrated that the presence of a keyboard event handler does not guarantee accessibility. The component must also be reachable through the intended focus navigation.

The experience reinforced the importance of combining AI-generated automated tests with manual interaction testing.

**Evidence:** [Keyboard Debugging](evidence/03-debugging/keyboard-debugging.md)

**Commit:** `db1ecad` — Fix keyboard answer selection and add regression tests.

---

## 5. Testing and Verification

The application was tested using automated tests, code-quality checks, browser interaction, and selected accessibility and performance checks.

### Automated Testing

The recorded full-suite test execution produced:

| Metric          | Recorded Result |
| --------------- | --------------- |
| Test files      | 65 passed       |
| Automated tests | 1,311 passed    |
| Failed tests    | 0               |
| Skipped tests   | 0               |

The test suite covers arithmetic generation, multiple-choice answers, practice sessions, persistence, statistics, mistake tracking, review, mastery, and component interactions.

### Code Quality

The following commands were used for code-quality verification:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test -- --run
npm run build
```

The captured verification results show successful linting, formatting, TypeScript checking, automated tests, and production build generation.

### Manual Functionality Verification

Manual testing focused on:

- Home-page navigation.
- Practice configuration.
- Interactive arithmetic cards.
- Keyboard accessibility.
- Session progress and summaries.
- Statistics.
- Mistake-review screens.
- Browser refresh and local-storage persistence.

Not every possible browser, physical device, or screen-reader configuration has been independently verified.

### Error Handling

Phase 19 added error-handling and recovery behavior for invalid locally stored data, unavailable storage, missing sessions, and question-generation failures.

Automated tests were used to check these scenarios without intentionally corrupting normal browser progress.

### Performance

Phase 21 introduced performance and data-management improvements, including statistics memoization, reduced redundant saves, deferred loading of selected pages, and management of longer session histories.

The project includes a repeatable performance-check script described in `README.md` and `docs/performance.md`.

### Accessibility

The project includes keyboard accessibility, visible focus indicators, semantic HTML, accessible labels, reduced-motion handling, and screen-reader-friendly announcements.

Automated accessibility checks supplement manual testing but do not establish complete accessibility conformance.

**Evidence:** [Final Verification](evidence/04-final-verification/)

---

## 6. Git and GitHub Verification

The project uses Git for version control and GitHub for repository hosting.

Each of the 22 development phases has a corresponding implementation commit.

Additional commits document debugging, testing, evidence collection, and repository improvements.

The GitHub remote is:

```text
https://github.com/jgb23002/math-practice-app.git
```

The main development branch is:

```text
main
```

The latest confirmed pushed documentation commit in this record is:

```text
f3be970 — Finalize repository documentation
```

The development history and associated changes can be inspected using:

```bash
git log --oneline --reverse
git log --stat
git show --stat db1ecad
git status --short --branch
git remote -v
git rev-list --left-right --count HEAD...origin/main
```

To compare the current local commit with GitHub's live branch:

```bash
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

Matching hashes indicate that the local HEAD matches the remote branch at the time of the comparison.

---

## 7. Repository Documentation

The repository includes:

- `README.md` — Project overview, functionality, installation, testing, architecture, privacy, and deployment.
- `docs/Specification.md` — Instructor-provided software specification.
- `docs/TODO.md` — Implementation phases and development checklist.
- `docs/Development_logs.md` — Development and version-control history.
- `docs/testing-audit.md` — Automated and manual testing review.
- `docs/performance.md` — Performance testing and data management.
- `docs/accessibility-audit.md` — Accessibility review and remaining manual checks.
- `docs/error-handling.md` — Error-handling design and testing.
- `docs/release-checklist.md` — Release verification and acceptance criteria.
- `docs/evidence/` — AI conversation screenshots, implementation evidence, debugging, and verification.

The `.gitignore` excludes dependency folders, build outputs, local environment files, credentials, caches, coverage reports, and local deployment state.

---

## 8. Deployment Status

**Hosting Platform:** Netlify  
**Status:** Pending public deployment and independent verification.

The project contains Netlify configuration for building and publishing the React application.

Documented deployment settings:

- Production branch: `main`
- Build command: `npm run build`
- Publish directory: `dist`
- Node.js version: `24.14.1`

After deployment, the public URL must be tested to verify:

1. The home page loads without a local development server.
2. Practice sessions work on the public website.
3. Statistics and settings pages load.
4. Direct navigation and refresh of nested routes work.
5. Local practice history persists after refreshing the public site.
6. Mistake review and mastery remain functional.
7. Responsive layouts work.
8. No critical errors appear in the browser console.

**Live URL:** To be added after successful deployment.

**Deployment Evidence:** To be added to `docs/evidence/04-final-verification/`.

---

## 9. AI Conversation Evidence

The repository organizes development evidence into four categories:

| Directory                    | Evidence                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `01-initial-development/`    | Initial requirements analysis, implementation requests, project planning, and early verification           |
| `02-feature-implementation/` | Arithmetic generator, testing refinement, and similar-question generation                                  |
| `03-debugging/`              | Keyboard accessibility bug report, AI diagnosis, code correction, regression tests, and manual screenshots |
| `04-final-verification/`     | Automated tests, code-quality checks, production build, application screens, and deployment evidence       |

The final HuskyCT submission will include selected screenshots and AI conversation excerpts in a separate evidence document.

---

## 10. Reflection on AI-Assisted Development

This project demonstrated the benefits and limitations of AI-assisted software development.

AI coding assistance helped organize the application's architecture, generate reusable components, implement arithmetic and review logic, expand automated tests, and diagnose implementation problems.

However, the development process also demonstrated that generated code cannot be assumed correct merely because an AI agent reports successful implementation.

The keyboard accessibility issue was discovered through manual interaction, despite the presence of keyboard event-handling code and existing automated tests.

By providing detailed reproduction steps and expected behavior, I was able to direct the AI toward a specific correction and request regression tests.

The project reinforced several important practices:

- Define requirements before implementation.
- Develop complex systems incrementally.
- Use clear, specific prompts.
- Review AI-generated changes.
- Independently verify application behavior.
- Document genuine bugs and fixes.
- Use meaningful Git commits.
- Distinguish automated checks from manual verification.

Overall, the development process provided practical experience in managing AI agents throughout software implementation, testing, debugging, and release preparation.

---

## 11. Final Submission Checklist

- [x] React and TypeScript application implemented.
- [x] All 22 development phases have implementation commits.
- [x] Interactive arithmetic practice implemented.
- [x] Practice sessions and summaries implemented.
- [x] Mistake tracking and similar-question generation implemented.
- [x] Statistics and local persistence implemented.
- [x] AI conversation evidence collected.
- [x] Keyboard accessibility debugging documented.
- [x] Automated test suite executed successfully.
- [x] Production build generated successfully.
- [x] GitHub repository created and development commits pushed.
- [x] README and `.gitignore` reviewed.
- [ ] Commit and push the latest development-history documentation.
- [ ] Deploy application to Netlify.
- [ ] Verify the live public website.
- [ ] Add Netlify URL to README and development documentation.
- [ ] Capture deployment screenshots.
- [ ] Complete the final 2–3-page development report.
- [ ] Assemble the AI Conversation Evidence PDF.
- [ ] Submit all four deliverables through HuskyCT.

---

## 12. Submission Deliverables

**Deliverable 1 — GitHub Repository**

https://github.com/jgb23002/math-practice-app

**Deliverable 2 — Public Application**

Pending Netlify deployment.

**Deliverable 3 — Development Report**

A separate 2–3-page report describing the development approach, prompting strategy, debugging experience, testing, and reflection.

**Deliverable 4 — AI Conversation Evidence**

A separate document containing selected AI prompts, responses, screenshots, and verification results.

---
