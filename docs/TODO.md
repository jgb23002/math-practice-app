# Math Practice App — Implementation Todo List

## Phase 1: Project Setup

### 1. Create the React Project

- [x] Create a new React project using Vite.
- [x] Configure TypeScript.
- [x] Install project dependencies.
- [x] Confirm that the development server runs.
- [x] Remove the default Vite demonstration content.
- [x] Create the initial application folder structure.

Suggested command:

```bash
npm create vite@latest math-practice-app -- --template react-ts
cd math-practice-app
npm install
npm run dev
```

### 2. Configure Development Tools

- [x] Configure ESLint.
- [x] Configure Prettier.
- [x] Add scripts for linting and formatting.
- [x] Install Vitest.
- [x] Install React Testing Library.
- [x] Create one basic component test.
- [x] Confirm that tests run successfully.

### 3. Define Shared TypeScript Types

- [x] Create the `MathOperation` type.
- [x] Create the `DifficultyLevel` type.
- [x] Create the `Question` interface.
- [x] Create the `PracticeAttempt` interface.
- [x] Create the `PracticeSession` interface.
- [x] Create the `MistakePattern` interface.
- [x] Create the statistics interfaces.
- [x] Create the application settings interface.

Suggested files:

```text
src/types/
├── question.ts
├── session.ts
├── statistics.ts
├── mistake.ts
└── settings.ts
```

---

## Phase 2: Basic Interface

### 4. Create the Shared Page Layout

- [x] Create a reusable page container.
- [x] Create the application header.
- [x] Add the application title.
- [x] Create a basic navigation component.
- [x] Add responsive page spacing.
- [x] Add child-friendly font sizes.
- [x] Add a consistent button style.

### 5. Create the Home Page

- [x] Add a welcome message.
- [x] Add a **Start Practice** button.
- [x] Add a **View Statistics** button.
- [x] Add a **Settings** button.
- [x] Make all buttons keyboard accessible.
- [x] Add responsive styling for small screens.

### 6. Add Application Routing

- [x] Install React Router.
- [x] Create the application routes.
- [x] Connect the home-page buttons to their routes.
- [x] Add a fallback page for unknown routes.

Initial routes:

```text
/
 /practice/setup
 /practice/session
 /practice/summary
 /statistics
 /settings
```

---

## Phase 3: Practice Configuration

### 7. Create the Operation Selector

- [x] Create an operation-selection component.
- [x] Add an option for addition.
- [x] Add an option for subtraction.
- [x] Add an option for multiplication.
- [x] Add an option for division.
- [x] Allow more than one operation to be selected.
- [x] Add a shortcut for selecting all operations.
- [x] Visually indicate selected operations.
- [x] Make operation controls keyboard accessible.

### 8. Create the Difficulty Selector

- [x] Create four difficulty options.
- [x] Label them Beginner, Easy, Intermediate, and Advanced.
- [x] Allow one difficulty level to be selected.
- [x] Visually indicate the selected level.
- [x] Add a short description for each level.

### 9. Create the Session-Length Selector

- [x] Add a 5-question option.
- [x] Add a 10-question option.
- [x] Add a 20-question option.
- [x] Add a continuous-practice option.
- [x] Set a sensible default session length.

### 10. Build the Practice Setup Page

- [x] Add the operation selector.
- [x] Add the difficulty selector.
- [x] Add the session-length selector.
- [x] Add a **Start Session** button.
- [x] Disable the button when no operation is selected.
- [x] Display a validation message when necessary.
- [x] Pass the selected configuration to the practice session.

---

## Phase 4: Basic Math Question Generation

Implementation note: Phase 4 returns a validated `ArithmeticQuestion` core. The
`Question` objects referenced below receive their answer choices in Phase 5.

### 11. Create General Question Utilities

- [x] Create a random integer utility.
- [x] Create an array-shuffling utility.
- [x] Create a unique-ID utility.
- [x] Add unit tests for each utility.

### 12. Implement Addition Questions

- [x] Generate two operands.
- [x] Apply the selected difficulty rules.
- [x] Calculate the correct answer.
- [x] Generate the display text.
- [x] Return a valid `Question` object.
- [x] Test minimum and maximum operand ranges.
- [x] Test maximum-result restrictions.

### 13. Implement Subtraction Questions

- [x] Generate two operands.
- [x] Prevent negative answers for the initial version.
- [x] Apply the selected difficulty rules.
- [x] Calculate the correct answer.
- [x] Generate the display text.
- [x] Return a valid `Question` object.
- [x] Test that the first operand is not smaller than the second.

### 14. Implement Multiplication Questions

- [x] Generate two factors.
- [x] Apply the selected difficulty rules.
- [x] Calculate the correct product.
- [x] Generate the display text.
- [x] Return a valid `Question` object.
- [x] Test factor ranges for every difficulty level.

### 15. Implement Division Questions

- [x] Generate a nonzero divisor.
- [x] Generate a whole-number quotient.
- [x] Calculate the dividend from the divisor and quotient.
- [x] Apply the selected difficulty rules.
- [x] Generate the display text.
- [x] Return a valid `Question` object.
- [x] Test that division by zero is impossible.
- [x] Test that all answers are whole numbers.

### 16. Create the Main Question Generator

- [x] Accept an operation and difficulty level.
- [x] Call the correct operation-specific generator.
- [x] Randomly select an operation when multiple operations are enabled.
- [x] Validate the generated question.
- [x] Handle unexpected generation failures.
- [x] Add unit tests for all operations and difficulty levels.

---

## Phase 5: Multiple-Choice Answers

### 17. Generate Incorrect Answer Choices

- [x] Generate three incorrect answers.
- [x] Ensure incorrect answers differ from the correct answer.
- [x] Ensure all choices are unique.
- [x] Keep incorrect answers plausible.
- [x] Avoid negative choices when negative values are not allowed.
- [x] Prevent fractional choices in whole-number questions.
- [x] Add a retry limit to prevent infinite loops.

### 18. Add Operation-Specific Distractors

- [x] Generate nearby-number distractors.
- [x] Generate addition mistake distractors.
- [x] Generate subtraction mistake distractors.
- [x] Generate multiplication-table distractors.
- [x] Generate division fact-family distractors.
- [x] Test common edge cases such as answers near zero.

### 19. Shuffle the Answer Choices

- [x] Combine the correct answer with the distractors.
- [x] Shuffle all four choices.
- [x] Confirm that the correct answer appears exactly once.
- [x] Confirm that the correct answer does not remain in a predictable position.
- [x] Add automated tests.

---

## Phase 6: Question Card

### 20. Create the Answer Choice Component

- [x] Display a single answer choice as a button.
- [x] Support selected and unselected states.
- [x] Add hover and focus states.
- [x] Add a sufficiently large touch target.
- [x] Add an accessible label.
- [x] Prevent changes after the card has been flipped.

### 21. Create the Front of the Question Card

- [x] Display the arithmetic question.
- [x] Display four answer choices.
- [x] Display the current question number.
- [x] Display the total number of questions.
- [x] Add a **Flip Card** button.
- [x] Disable the flip button until an answer is selected.
- [x] Use large, readable math text.

### 22. Add Answer Selection

- [x] Store the selected answer in component state.
- [x] Highlight the selected answer.
- [x] Allow the selected answer to be changed before flipping.
- [x] Enable the flip button after selection.
- [x] Reset the selected answer for each new question.

### 23. Create the Back of the Question Card

- [x] Display the original question.
- [x] Display the correct answer.
- [x] Display the student's selected answer.
- [x] Add an **I Got It Right** button.
- [x] Add an **I Got It Wrong** button.
- [x] Prevent both buttons from being selected for the same attempt.

### 24. Add Basic Card-Flipping Behavior

- [x] Add an `isCardFlipped` state.
- [x] Show the front before flipping.
- [x] Show the back after flipping.
- [x] Prevent answer changes after flipping.
- [x] Reset the flip state for the next question.
- [x] Ensure the card works without animation.

### 25. Add the Card-Flip Animation

- [x] Add a CSS flip animation.
- [x] Keep the front and back aligned.
- [x] Prevent mirrored or unreadable card content.
- [x] Support reduced-motion preferences.
- [x] Add a setting for disabling animations.

---

## Phase 7: Practice Session

### 26. Create the Practice Session State

- [x] Store the session ID.
- [x] Store the selected operations.
- [x] Store the selected difficulty.
- [x] Store the selected session length.
- [x] Store the current question index.
- [x] Store session correct and incorrect totals.
- [x] Store whether the session is active.

### 27. Build the Practice Session Page

- [x] Read the setup configuration.
- [x] Generate the first question.
- [x] Display the question card.
- [x] Handle missing or invalid setup data.
- [x] Redirect to the setup page when no valid session exists.

### 28. Record Self-Reported Results

- [x] Handle the **I Got It Right** button.
- [x] Handle the **I Got It Wrong** button.
- [x] Increment the session-attempt total.
- [x] Increment the correct or incorrect total.
- [x] Prevent duplicate result recording.
- [x] Store the completed attempt.

### 29. Advance to the Next Question

- [x] Generate a new question after recording a result.
- [x] Increment the question number.
- [x] Reset the selected answer.
- [x] Reset the card-flip state.
- [x] Avoid immediately repeating the same question.
- [x] Add an optional short transition.

### 30. Add Session Progress

- [x] Display “Question X of Y.”
- [x] Add a visual progress bar.
- [x] Update progress after every attempt.
- [x] Hide fixed progress for continuous practice.
- [x] Ensure progress is accessible to screen readers.

### 31. Support Continuous Practice

- [x] Generate questions without a fixed endpoint.
- [x] Add an **End Session** button.
- [x] Confirm before ending when appropriate.
- [x] Generate a summary after the session ends.

---

## Phase 8: Session Summary

### 32. Detect Session Completion

- [x] Compare attempted questions with the selected session length.
- [x] Stop generating questions when the session is complete.
- [x] Save the completion timestamp.
- [x] Navigate to the summary page.

### 33. Create the Session Summary Page

- [x] Display total questions attempted.
- [x] Display correct answers.
- [x] Display incorrect answers.
- [x] Calculate and display accuracy.
- [x] Display practiced operations.
- [x] Display the difficulty level.
- [x] Display mistake-review question count.

### 34. Add Summary Actions

- [x] Add a **Practice Again** button.
- [x] Add a **Practice Mistakes** button.
- [x] Add a **Change Settings** button.
- [x] Add a **View Statistics** button.
- [x] Add a **Return Home** button.

---

## Phase 9: Local Data Storage

### 35. Create the Storage Service

- [x] Create a wrapper around `localStorage`.
- [x] Add functions for reading data.
- [x] Add functions for writing data.
- [x] Add JSON parsing error handling.
- [x] Add validation for loaded data.
- [x] Handle unavailable browser storage.
- [x] Handle storage-capacity errors.

### 36. Add Data Schema Versioning

- [x] Store a data-schema version.
- [x] Detect missing or older versions.
- [x] Create an initial migration structure.
- [x] Avoid deleting unrelated stored data.

### 37. Persist Application Settings

- [x] Save selected settings.
- [x] Load settings when the application starts.
- [x] Use defaults when no settings exist.
- [x] Recover from invalid stored settings.

### 38. Persist Practice Sessions

- [x] Save session information.
- [x] Save session completion details.
- [x] Load recent sessions.
- [x] Limit or summarize old session records when necessary.

### 39. Persist Practice Attempts

- [x] Save every completed attempt.
- [x] Include the selected answer.
- [x] Include the self-reported result.
- [x] Include the operation and difficulty.
- [x] Include the session ID and timestamp.
- [x] Confirm that attempts persist after a browser restart.

---

## Phase 10: Statistics

### 40. Implement Statistics Calculations

- [x] Calculate total attempted questions.
- [x] Calculate total correct answers.
- [x] Calculate total incorrect answers.
- [x] Calculate overall accuracy.
- [x] Handle zero attempts without dividing by zero.
- [x] Add unit tests for calculations.

### 41. Track Statistics by Operation

- [x] Track addition attempts.
- [x] Track subtraction attempts.
- [x] Track multiplication attempts.
- [x] Track division attempts.
- [x] Calculate accuracy for each operation.

### 42. Track Statistics by Difficulty

- [x] Track Level 1 performance.
- [x] Track Level 2 performance.
- [x] Track Level 3 performance.
- [x] Track Level 4 performance.
- [x] Calculate accuracy for each level.

### 43. Create the Statistics Overview

- [x] Display total attempted questions.
- [x] Display total correct answers.
- [x] Display total incorrect answers.
- [x] Display overall accuracy.
- [x] Add an empty state for new users.

### 44. Display Statistics by Operation

- [x] Create one statistics card per operation.
- [x] Display attempted, correct, and incorrect totals.
- [x] Display accuracy.
- [x] Make the layout responsive.

### 45. Display Statistics by Difficulty

- [x] Create one statistics card per difficulty level.
- [x] Display attempted, correct, and incorrect totals.
- [x] Display accuracy.
- [x] Clearly label each level.

### 46. Display Recent Sessions

- [x] List recent session dates.
- [x] Display operations practiced.
- [x] Display difficulty.
- [x] Display attempted, correct, and incorrect totals.
- [x] Display session accuracy.
- [x] Sort sessions from newest to oldest.
- [x] Add an empty state when no sessions exist.

### 47. Add Statistics Reset

- [x] Add a **Reset Statistics** button.
- [x] Create a confirmation dialog.
- [x] Require explicit confirmation.
- [x] Clear attempts.
- [x] Clear sessions.
- [x] Clear aggregate statistics.
- [x] Decide whether settings should remain unchanged.
- [x] Refresh the statistics page after deletion.

---

## Phase 11: Settings

### 48. Create the Settings Page

- [x] Add a sound-effects setting.
- [x] Add a card-animation setting.
- [x] Add a show-explanations setting.
- [x] Add a default session-length setting.
- [x] Add a default difficulty setting.
- [x] Add default operation settings.
- [x] Save settings automatically or through a save button.

### 49. Apply Default Practice Settings

- [x] Load default operations on the setup page.
- [x] Load the default difficulty.
- [x] Load the default session length.
- [x] Allow defaults to be changed for an individual session.

### 50. Add Clear-All-Data Functionality

- [x] Add a **Clear All Application Data** button.
- [x] Show a strong confirmation warning.
- [x] Clear settings, sessions, attempts, and mistake patterns.
- [x] Restore application defaults.
- [x] Return the user to the home page.

---

## Phase 12: Mistake Tracking

### 51. Create Mistake Patterns

- [x] Create a mistake pattern after an incorrect answer.
- [x] Store the operation.
- [x] Store both operands.
- [x] Store the correct answer.
- [x] Store the difficulty level.
- [x] Store the last incorrect date.
- [x] Initialize the incorrect count.
- [x] Initialize the similar-correct count.

### 52. Update Existing Mistake Patterns

- [x] Detect when the same pattern already exists.
- [x] Increment its incorrect count.
- [x] Update its last-incorrect timestamp.
- [x] Reset or reduce mastery progress when appropriate.
- [x] Avoid creating duplicate pattern records.

### 53. Store Mistake Patterns Locally

- [x] Save mistake patterns to local storage.
- [x] Load mistake patterns at application startup.
- [x] Validate stored mistake-pattern data.
- [x] Recover gracefully from invalid records.

---

## Phase 13: Similar Question Generation

### 54. Generate Nearby-Number Questions

- [x] Create similar questions using nearby operands.
- [x] Keep questions within the same difficulty range.
- [x] Avoid invalid subtraction questions.
- [x] Avoid invalid division questions.
- [x] Avoid generating the exact same question too frequently.

### 55. Generate Reversed-Operand Questions

- [x] Reverse addition operands.
- [x] Reverse multiplication operands.
- [x] Avoid treating reversed subtraction as equivalent.
- [x] Avoid treating reversed division as equivalent.

### 56. Generate Fact-Family Questions

- [x] Generate multiplication questions from division mistakes.
- [x] Generate division questions from multiplication mistakes.
- [x] Generate subtraction questions from addition mistakes.
- [x] Generate addition questions from subtraction mistakes.
- [x] Ensure generated questions match the selected difficulty.

### 57. Create the Similar Question Generator Service

- [x] Accept a mistake pattern.
- [x] Select an appropriate similarity strategy.
- [x] Generate a valid related question.
- [x] Label the question as `mistake-review`.
- [x] Attach the related mistake-pattern ID.
- [x] Add unit tests for every operation.

---

## Phase 14: Mistake Review Mode

### 58. Add Review Mode to Practice Setup

- [x] Add a regular-practice option.
- [x] Add a mistake-review option.
- [x] Disable mistake review when no active mistakes exist.
- [x] Explain why the option is disabled.
- [x] Display the number of active mistake patterns.

### 59. Prioritize Mistake Patterns

- [x] Give higher priority to frequently missed patterns.
- [x] Give higher priority to recently missed patterns.
- [x] Give higher priority to patterns with little successful review.
- [x] Randomize patterns with similar priority.
- [x] Test the prioritization logic.

### 60. Build Mistake Review Sessions

- [x] Select active mistake patterns.
- [x] Generate similar questions from those patterns.
- [x] Mix multiple mistake patterns in one session.
- [x] Record which pattern produced each question.
- [x] Display mistake-review counts in the session summary.

### 61. Track Similar-Question Success

- [x] Increment similar-correct count after a correct review answer.
- [x] Handle incorrect review answers.
- [x] Update the original mistake pattern.
- [x] Store the updated pattern locally.

### 62. Implement Mastery Rules

- [x] Mark a pattern as mastered after three correct similar questions.
- [x] Make the mastery threshold configurable.
- [x] Exclude mastered patterns from normal review.
- [x] Allow mastered patterns to return after a future mistake.
- [x] Add tests for mastery transitions.

---

## Phase 15: Advanced Statistics

### 63. Add Mistake Statistics

- [x] Display the number of active mistake patterns.
- [x] Display the number of mastered patterns.
- [x] Display the number of similar questions practiced.
- [x] Display the number of review questions answered correctly.

### 64. Identify Frequently Missed Areas

- [x] Identify the most frequently missed operation.
- [x] Identify frequently missed number facts.
- [x] Sort mistake patterns by incorrect count.
- [x] Handle ties.
- [x] Add an empty state when there are no mistakes.

### 65. Add Mistake Details

- [x] Display active mistake patterns.
- [x] Show incorrect counts.
- [x] Show mastery progress.
- [x] Show the most recent incorrect date.
- [x] Allow mastered patterns to be viewed separately.

---

## Phase 16: Accessibility

### 66. Improve Keyboard Navigation

- [x] Ensure every control is reachable with Tab.
- [x] Add visible focus indicators.
- [x] Support Enter and Space on buttons.
- [x] Support number keys 1–4 for answer selection.
- [x] Prevent keyboard shortcuts from interfering with form inputs.

### 67. Improve Screen-Reader Support

- [x] Use semantic HTML.
- [x] Add accessible labels to answer choices.
- [x] Announce question changes.
- [x] Announce the revealed correct answer.
- [x] Announce session progress.
- [x] Add accessible names to icon buttons.

### 68. Support Reduced Motion

- [x] Detect `prefers-reduced-motion`.
- [x] Disable card animations when reduced motion is requested.
- [x] Ensure card content still changes clearly.
- [x] Respect the application's animation setting.

### 69. Check Visual Accessibility

- [x] Verify sufficient color contrast.
- [x] Avoid communicating results by color alone.
- [x] Add text or icons to selected states.
- [x] Test at 200% browser zoom.
- [ ] Test with larger system font sizes.

Verification: see [accessibility-audit.md](accessibility-audit.md). Browser zoom and enlarged browser fonts were checked; native operating-system font scaling remains a manual check.

---

## Phase 17: Responsive Design and Polish

### 70. Optimize for Tablets

- [x] Use large touch targets.
- [x] Center the practice card.
- [x] Keep answer choices easy to reach.
- [x] Test portrait and landscape orientations.

### 71. Optimize for Mobile Devices

- [x] Stack answer choices when necessary.
- [x] Adjust card width.
- [x] Prevent horizontal scrolling.
- [x] Simplify navigation.
- [x] Test on common small-screen sizes.

### 72. Optimize the Statistics Layout

- [x] Convert wide tables to cards on small screens.
- [x] Prevent labels and values from overlapping.
- [x] Keep recent sessions readable.
- [x] Support horizontal scrolling only when necessary.

### 73. Add Child-Friendly Feedback

- [x] Add positive feedback messages.
- [x] Add supportive messages after mistakes.
- [x] Avoid shaming language.
- [x] Randomize feedback without becoming distracting.
- [x] Add an option to disable feedback effects.

Verification: see [responsive-checks.md](responsive-checks.md) for viewport coverage, repeatable checks, feedback preferences, and manual device checks.

---

## Phase 18: Session Recovery and Navigation Safety

### 74. Persist an Active Session

- [x] Save the active session.
- [x] Save the current question.
- [x] Save the selected answer when appropriate.
- [x] Restore the session after a page refresh.
- [x] Clear restored state when the session ends.

### 75. Protect Against Accidental Navigation

- [x] Detect attempts to leave an active session.
- [x] Display a confirmation prompt.
- [x] Allow the user to continue the session.
- [x] Allow the user to end and leave the session.
- [x] Avoid showing warnings after session completion.

Verification: see [session-recovery.md](session-recovery.md) for saved-state validation, duplicate prevention, navigation behavior, browser checks, and manual browser limitations.

---

## Phase 19: Error Handling

### 76. Handle Invalid Stored Data

- [ ] Detect invalid settings.
- [ ] Detect invalid attempts.
- [ ] Detect invalid sessions.
- [ ] Detect invalid mistake patterns.
- [ ] Reset only the affected data category.
- [ ] Avoid crashing the application.

### 77. Handle Question-Generation Failures

- [ ] Validate every generated question.
- [ ] Retry generation after an invalid result.
- [ ] Set a maximum retry count.
- [ ] Provide a fallback question.
- [ ] Log useful development errors.

### 78. Add User-Friendly Error Messages

- [ ] Add a general error component.
- [ ] Explain storage errors in simple language.
- [ ] Explain missing-session errors.
- [ ] Provide a safe way to return home.
- [ ] Avoid exposing technical stack traces.

---

## Phase 20: Testing

### 79. Complete Unit Tests

- [ ] Test all arithmetic generators.
- [ ] Test difficulty boundaries.
- [ ] Test distractor generation.
- [ ] Test answer-choice uniqueness.
- [ ] Test statistics calculations.
- [ ] Test mistake-pattern updates.
- [ ] Test similar-question generation.
- [ ] Test mastery rules.
- [ ] Test storage serialization and validation.

### 80. Complete Component Tests

- [ ] Test operation selection.
- [ ] Test difficulty selection.
- [ ] Test answer selection.
- [ ] Test card flipping.
- [ ] Test right and wrong buttons.
- [ ] Test progress updates.
- [ ] Test session completion.
- [ ] Test statistics display.
- [ ] Test confirmation dialogs.

### 81. Complete Integration Tests

- [ ] Test a full addition session.
- [ ] Test a mixed-operation session.
- [ ] Test continuous practice.
- [ ] Test an incorrect answer creating a mistake pattern.
- [ ] Test mistake-review generation.
- [ ] Test mastery completion.
- [ ] Test persistence after a browser refresh.
- [ ] Test resetting statistics.

### 82. Complete Accessibility Testing

- [ ] Complete a session using only the keyboard.
- [ ] Test with a screen reader.
- [ ] Test reduced-motion mode.
- [ ] Test browser zoom.
- [ ] Run an automated accessibility checker.
- [ ] Manually review reported issues.

---

## Phase 21: Performance and Data Management

### 83. Optimize React Rendering

- [ ] Identify unnecessary component re-renders.
- [ ] Memoize expensive statistics calculations.
- [ ] Keep question generation outside render logic.
- [ ] Avoid unnecessary global state updates.

### 84. Manage Large Practice Histories

- [ ] Test with several thousand attempts.
- [ ] Measure local-storage usage.
- [ ] Limit the number of detailed recent sessions.
- [ ] Summarize older attempt records if necessary.
- [ ] Preserve aggregate statistics when archiving details.

### 85. Improve Loading Performance

- [ ] Measure the initial bundle size.
- [ ] Lazy-load statistics and settings pages.
- [ ] Remove unused dependencies.
- [ ] Optimize fonts and images.
- [ ] Test on slower devices.

---

## Phase 22: Release Preparation

### 86. Complete Privacy Review

- [ ] Confirm that no personal information is collected.
- [ ] Confirm that practice data remains in the browser.
- [ ] Remove unnecessary tracking services.
- [ ] Avoid child-facing advertisements.
- [ ] Explain that clearing browser data removes progress.

### 87. Complete Browser Testing

- [ ] Test in Chrome.
- [ ] Test in Safari.
- [ ] Test in Firefox.
- [ ] Test in Microsoft Edge.
- [ ] Test on an iPad or tablet emulator.
- [ ] Test on a mobile device or emulator.

### 88. Prepare the Production Build

- [ ] Run all tests.
- [ ] Resolve linting errors.
- [ ] Resolve TypeScript errors.
- [ ] Create the production build.
- [ ] Test the production build locally.
- [ ] Configure deployment routing for React Router.

### 89. Deploy the Application

- [ ] Select a hosting service.
- [ ] Deploy the production build.
- [ ] Verify every route.
- [ ] Verify local-storage persistence.
- [ ] Verify responsive behavior.
- [ ] Verify that no development errors appear in the console.

---

# Recommended Development Milestones

## Milestone 1: Basic Prototype

Complete Tasks 1–25.

Deliverable:

- The app displays generated math questions.
- Questions have four multiple-choice answers.
- The user can select an answer and flip the card.
- The correct answer is revealed.

## Milestone 2: Functional Practice App

Complete Tasks 26–34.

Deliverable:

- Users can configure and complete practice sessions.
- The app tracks correct and incorrect answers during a session.
- A summary appears after each session.

## Milestone 3: Persistent Statistics

Complete Tasks 35–50.

Deliverable:

- Practice history survives browser restarts.
- Users can view overall, operation, difficulty, and recent-session statistics.
- Users can configure application settings.

## Milestone 4: Personalized Mistake Practice

Complete Tasks 51–65.

Deliverable:

- The app remembers missed questions.
- It generates related questions.
- It prioritizes recurring mistakes.
- It tracks mastery.

## Milestone 5: Production-Ready Application

Complete Tasks 66–89.

Deliverable:

- The app is accessible, responsive, tested, optimized, and deployed.

---

# Suggested First Implementation Sequence

For the fastest path to a working demonstration, implement these tasks first:

1. [ ] Create the React and TypeScript project.
2. [ ] Define the question types.
3. [ ] Implement addition question generation.
4. [ ] Generate four multiple-choice answers.
5. [ ] Create the question card front.
6. [ ] Add answer selection.
7. [ ] Create the card back.
8. [ ] Add the flip-card behavior.
9. [ ] Add the right and wrong buttons.
10. [ ] Generate the next question.
11. [ ] Add subtraction.
12. [ ] Add multiplication.
13. [ ] Add division.
14. [ ] Add practice-session totals.
15. [ ] Add the session summary.

This produces a usable prototype before adding routing, persistence, advanced statistics, and personalized mistake review.