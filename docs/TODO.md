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

- [ ] Generate three incorrect answers.
- [ ] Ensure incorrect answers differ from the correct answer.
- [ ] Ensure all choices are unique.
- [ ] Keep incorrect answers plausible.
- [ ] Avoid negative choices when negative values are not allowed.
- [ ] Prevent fractional choices in whole-number questions.
- [ ] Add a retry limit to prevent infinite loops.

### 18. Add Operation-Specific Distractors

- [ ] Generate nearby-number distractors.
- [ ] Generate addition mistake distractors.
- [ ] Generate subtraction mistake distractors.
- [ ] Generate multiplication-table distractors.
- [ ] Generate division fact-family distractors.
- [ ] Test common edge cases such as answers near zero.

### 19. Shuffle the Answer Choices

- [ ] Combine the correct answer with the distractors.
- [ ] Shuffle all four choices.
- [ ] Confirm that the correct answer appears exactly once.
- [ ] Confirm that the correct answer does not remain in a predictable position.
- [ ] Add automated tests.

---

## Phase 6: Question Card

### 20. Create the Answer Choice Component

- [ ] Display a single answer choice as a button.
- [ ] Support selected and unselected states.
- [ ] Add hover and focus states.
- [ ] Add a sufficiently large touch target.
- [ ] Add an accessible label.
- [ ] Prevent changes after the card has been flipped.

### 21. Create the Front of the Question Card

- [ ] Display the arithmetic question.
- [ ] Display four answer choices.
- [ ] Display the current question number.
- [ ] Display the total number of questions.
- [ ] Add a **Flip Card** button.
- [ ] Disable the flip button until an answer is selected.
- [ ] Use large, readable math text.

### 22. Add Answer Selection

- [ ] Store the selected answer in component state.
- [ ] Highlight the selected answer.
- [ ] Allow the selected answer to be changed before flipping.
- [ ] Enable the flip button after selection.
- [ ] Reset the selected answer for each new question.

### 23. Create the Back of the Question Card

- [ ] Display the original question.
- [ ] Display the correct answer.
- [ ] Display the student's selected answer.
- [ ] Add an **I Got It Right** button.
- [ ] Add an **I Got It Wrong** button.
- [ ] Prevent both buttons from being selected for the same attempt.

### 24. Add Basic Card-Flipping Behavior

- [ ] Add an `isCardFlipped` state.
- [ ] Show the front before flipping.
- [ ] Show the back after flipping.
- [ ] Prevent answer changes after flipping.
- [ ] Reset the flip state for the next question.
- [ ] Ensure the card works without animation.

### 25. Add the Card-Flip Animation

- [ ] Add a CSS flip animation.
- [ ] Keep the front and back aligned.
- [ ] Prevent mirrored or unreadable card content.
- [ ] Support reduced-motion preferences.
- [ ] Add a setting for disabling animations.

---

## Phase 7: Practice Session

### 26. Create the Practice Session State

- [ ] Store the session ID.
- [ ] Store the selected operations.
- [ ] Store the selected difficulty.
- [ ] Store the selected session length.
- [ ] Store the current question index.
- [ ] Store session correct and incorrect totals.
- [ ] Store whether the session is active.

### 27. Build the Practice Session Page

- [ ] Read the setup configuration.
- [ ] Generate the first question.
- [ ] Display the question card.
- [ ] Handle missing or invalid setup data.
- [ ] Redirect to the setup page when no valid session exists.

### 28. Record Self-Reported Results

- [ ] Handle the **I Got It Right** button.
- [ ] Handle the **I Got It Wrong** button.
- [ ] Increment the session-attempt total.
- [ ] Increment the correct or incorrect total.
- [ ] Prevent duplicate result recording.
- [ ] Store the completed attempt.

### 29. Advance to the Next Question

- [ ] Generate a new question after recording a result.
- [ ] Increment the question number.
- [ ] Reset the selected answer.
- [ ] Reset the card-flip state.
- [ ] Avoid immediately repeating the same question.
- [ ] Add an optional short transition.

### 30. Add Session Progress

- [ ] Display “Question X of Y.”
- [ ] Add a visual progress bar.
- [ ] Update progress after every attempt.
- [ ] Hide fixed progress for continuous practice.
- [ ] Ensure progress is accessible to screen readers.

### 31. Support Continuous Practice

- [ ] Generate questions without a fixed endpoint.
- [ ] Add an **End Session** button.
- [ ] Confirm before ending when appropriate.
- [ ] Generate a summary after the session ends.

---

## Phase 8: Session Summary

### 32. Detect Session Completion

- [ ] Compare attempted questions with the selected session length.
- [ ] Stop generating questions when the session is complete.
- [ ] Save the completion timestamp.
- [ ] Navigate to the summary page.

### 33. Create the Session Summary Page

- [ ] Display total questions attempted.
- [ ] Display correct answers.
- [ ] Display incorrect answers.
- [ ] Calculate and display accuracy.
- [ ] Display practiced operations.
- [ ] Display the difficulty level.
- [ ] Display mistake-review question count.

### 34. Add Summary Actions

- [ ] Add a **Practice Again** button.
- [ ] Add a **Practice Mistakes** button.
- [ ] Add a **Change Settings** button.
- [ ] Add a **View Statistics** button.
- [ ] Add a **Return Home** button.

---

## Phase 9: Local Data Storage

### 35. Create the Storage Service

- [ ] Create a wrapper around `localStorage`.
- [ ] Add functions for reading data.
- [ ] Add functions for writing data.
- [ ] Add JSON parsing error handling.
- [ ] Add validation for loaded data.
- [ ] Handle unavailable browser storage.
- [ ] Handle storage-capacity errors.

### 36. Add Data Schema Versioning

- [ ] Store a data-schema version.
- [ ] Detect missing or older versions.
- [ ] Create an initial migration structure.
- [ ] Avoid deleting unrelated stored data.

### 37. Persist Application Settings

- [ ] Save selected settings.
- [ ] Load settings when the application starts.
- [ ] Use defaults when no settings exist.
- [ ] Recover from invalid stored settings.

### 38. Persist Practice Sessions

- [ ] Save session information.
- [ ] Save session completion details.
- [ ] Load recent sessions.
- [ ] Limit or summarize old session records when necessary.

### 39. Persist Practice Attempts

- [ ] Save every completed attempt.
- [ ] Include the selected answer.
- [ ] Include the self-reported result.
- [ ] Include the operation and difficulty.
- [ ] Include the session ID and timestamp.
- [ ] Confirm that attempts persist after a browser restart.

---

## Phase 10: Statistics

### 40. Implement Statistics Calculations

- [ ] Calculate total attempted questions.
- [ ] Calculate total correct answers.
- [ ] Calculate total incorrect answers.
- [ ] Calculate overall accuracy.
- [ ] Handle zero attempts without dividing by zero.
- [ ] Add unit tests for calculations.

### 41. Track Statistics by Operation

- [ ] Track addition attempts.
- [ ] Track subtraction attempts.
- [ ] Track multiplication attempts.
- [ ] Track division attempts.
- [ ] Calculate accuracy for each operation.

### 42. Track Statistics by Difficulty

- [ ] Track Level 1 performance.
- [ ] Track Level 2 performance.
- [ ] Track Level 3 performance.
- [ ] Track Level 4 performance.
- [ ] Calculate accuracy for each level.

### 43. Create the Statistics Overview

- [ ] Display total attempted questions.
- [ ] Display total correct answers.
- [ ] Display total incorrect answers.
- [ ] Display overall accuracy.
- [ ] Add an empty state for new users.

### 44. Display Statistics by Operation

- [ ] Create one statistics card per operation.
- [ ] Display attempted, correct, and incorrect totals.
- [ ] Display accuracy.
- [ ] Make the layout responsive.

### 45. Display Statistics by Difficulty

- [ ] Create one statistics card per difficulty level.
- [ ] Display attempted, correct, and incorrect totals.
- [ ] Display accuracy.
- [ ] Clearly label each level.

### 46. Display Recent Sessions

- [ ] List recent session dates.
- [ ] Display operations practiced.
- [ ] Display difficulty.
- [ ] Display attempted, correct, and incorrect totals.
- [ ] Display session accuracy.
- [ ] Sort sessions from newest to oldest.
- [ ] Add an empty state when no sessions exist.

### 47. Add Statistics Reset

- [ ] Add a **Reset Statistics** button.
- [ ] Create a confirmation dialog.
- [ ] Require explicit confirmation.
- [ ] Clear attempts.
- [ ] Clear sessions.
- [ ] Clear aggregate statistics.
- [ ] Decide whether settings should remain unchanged.
- [ ] Refresh the statistics page after deletion.

---

## Phase 11: Settings

### 48. Create the Settings Page

- [ ] Add a sound-effects setting.
- [ ] Add a card-animation setting.
- [ ] Add a show-explanations setting.
- [ ] Add a default session-length setting.
- [ ] Add a default difficulty setting.
- [ ] Add default operation settings.
- [ ] Save settings automatically or through a save button.

### 49. Apply Default Practice Settings

- [ ] Load default operations on the setup page.
- [ ] Load the default difficulty.
- [ ] Load the default session length.
- [ ] Allow defaults to be changed for an individual session.

### 50. Add Clear-All-Data Functionality

- [ ] Add a **Clear All Application Data** button.
- [ ] Show a strong confirmation warning.
- [ ] Clear settings, sessions, attempts, and mistake patterns.
- [ ] Restore application defaults.
- [ ] Return the user to the home page.

---

## Phase 12: Mistake Tracking

### 51. Create Mistake Patterns

- [ ] Create a mistake pattern after an incorrect answer.
- [ ] Store the operation.
- [ ] Store both operands.
- [ ] Store the correct answer.
- [ ] Store the difficulty level.
- [ ] Store the last incorrect date.
- [ ] Initialize the incorrect count.
- [ ] Initialize the similar-correct count.

### 52. Update Existing Mistake Patterns

- [ ] Detect when the same pattern already exists.
- [ ] Increment its incorrect count.
- [ ] Update its last-incorrect timestamp.
- [ ] Reset or reduce mastery progress when appropriate.
- [ ] Avoid creating duplicate pattern records.

### 53. Store Mistake Patterns Locally

- [ ] Save mistake patterns to local storage.
- [ ] Load mistake patterns at application startup.
- [ ] Validate stored mistake-pattern data.
- [ ] Recover gracefully from invalid records.

---

## Phase 13: Similar Question Generation

### 54. Generate Nearby-Number Questions

- [ ] Create similar questions using nearby operands.
- [ ] Keep questions within the same difficulty range.
- [ ] Avoid invalid subtraction questions.
- [ ] Avoid invalid division questions.
- [ ] Avoid generating the exact same question too frequently.

### 55. Generate Reversed-Operand Questions

- [ ] Reverse addition operands.
- [ ] Reverse multiplication operands.
- [ ] Avoid treating reversed subtraction as equivalent.
- [ ] Avoid treating reversed division as equivalent.

### 56. Generate Fact-Family Questions

- [ ] Generate multiplication questions from division mistakes.
- [ ] Generate division questions from multiplication mistakes.
- [ ] Generate subtraction questions from addition mistakes.
- [ ] Generate addition questions from subtraction mistakes.
- [ ] Ensure generated questions match the selected difficulty.

### 57. Create the Similar Question Generator Service

- [ ] Accept a mistake pattern.
- [ ] Select an appropriate similarity strategy.
- [ ] Generate a valid related question.
- [ ] Label the question as `mistake-review`.
- [ ] Attach the related mistake-pattern ID.
- [ ] Add unit tests for every operation.

---

## Phase 14: Mistake Review Mode

### 58. Add Review Mode to Practice Setup

- [ ] Add a regular-practice option.
- [ ] Add a mistake-review option.
- [ ] Disable mistake review when no active mistakes exist.
- [ ] Explain why the option is disabled.
- [ ] Display the number of active mistake patterns.

### 59. Prioritize Mistake Patterns

- [ ] Give higher priority to frequently missed patterns.
- [ ] Give higher priority to recently missed patterns.
- [ ] Give higher priority to patterns with little successful review.
- [ ] Randomize patterns with similar priority.
- [ ] Test the prioritization logic.

### 60. Build Mistake Review Sessions

- [ ] Select active mistake patterns.
- [ ] Generate similar questions from those patterns.
- [ ] Mix multiple mistake patterns in one session.
- [ ] Record which pattern produced each question.
- [ ] Display mistake-review counts in the session summary.

### 61. Track Similar-Question Success

- [ ] Increment similar-correct count after a correct review answer.
- [ ] Handle incorrect review answers.
- [ ] Update the original mistake pattern.
- [ ] Store the updated pattern locally.

### 62. Implement Mastery Rules

- [ ] Mark a pattern as mastered after three correct similar questions.
- [ ] Make the mastery threshold configurable.
- [ ] Exclude mastered patterns from normal review.
- [ ] Allow mastered patterns to return after a future mistake.
- [ ] Add tests for mastery transitions.

---

## Phase 15: Advanced Statistics

### 63. Add Mistake Statistics

- [ ] Display the number of active mistake patterns.
- [ ] Display the number of mastered patterns.
- [ ] Display the number of similar questions practiced.
- [ ] Display the number of review questions answered correctly.

### 64. Identify Frequently Missed Areas

- [ ] Identify the most frequently missed operation.
- [ ] Identify frequently missed number facts.
- [ ] Sort mistake patterns by incorrect count.
- [ ] Handle ties.
- [ ] Add an empty state when there are no mistakes.

### 65. Add Mistake Details

- [ ] Display active mistake patterns.
- [ ] Show incorrect counts.
- [ ] Show mastery progress.
- [ ] Show the most recent incorrect date.
- [ ] Allow mastered patterns to be viewed separately.

---

## Phase 16: Accessibility

### 66. Improve Keyboard Navigation

- [ ] Ensure every control is reachable with Tab.
- [ ] Add visible focus indicators.
- [ ] Support Enter and Space on buttons.
- [ ] Support number keys 1–4 for answer selection.
- [ ] Prevent keyboard shortcuts from interfering with form inputs.

### 67. Improve Screen-Reader Support

- [ ] Use semantic HTML.
- [ ] Add accessible labels to answer choices.
- [ ] Announce question changes.
- [ ] Announce the revealed correct answer.
- [ ] Announce session progress.
- [ ] Add accessible names to icon buttons.

### 68. Support Reduced Motion

- [ ] Detect `prefers-reduced-motion`.
- [ ] Disable card animations when reduced motion is requested.
- [ ] Ensure card content still changes clearly.
- [ ] Respect the application's animation setting.

### 69. Check Visual Accessibility

- [ ] Verify sufficient color contrast.
- [ ] Avoid communicating results by color alone.
- [ ] Add text or icons to selected states.
- [ ] Test at 200% browser zoom.
- [ ] Test with larger system font sizes.

---

## Phase 17: Responsive Design and Polish

### 70. Optimize for Tablets

- [ ] Use large touch targets.
- [ ] Center the practice card.
- [ ] Keep answer choices easy to reach.
- [ ] Test portrait and landscape orientations.

### 71. Optimize for Mobile Devices

- [ ] Stack answer choices when necessary.
- [ ] Adjust card width.
- [ ] Prevent horizontal scrolling.
- [ ] Simplify navigation.
- [ ] Test on common small-screen sizes.

### 72. Optimize the Statistics Layout

- [ ] Convert wide tables to cards on small screens.
- [ ] Prevent labels and values from overlapping.
- [ ] Keep recent sessions readable.
- [ ] Support horizontal scrolling only when necessary.

### 73. Add Child-Friendly Feedback

- [ ] Add positive feedback messages.
- [ ] Add supportive messages after mistakes.
- [ ] Avoid shaming language.
- [ ] Randomize feedback without becoming distracting.
- [ ] Add an option to disable feedback effects.

---

## Phase 18: Session Recovery and Navigation Safety

### 74. Persist an Active Session

- [ ] Save the active session.
- [ ] Save the current question.
- [ ] Save the selected answer when appropriate.
- [ ] Restore the session after a page refresh.
- [ ] Clear restored state when the session ends.

### 75. Protect Against Accidental Navigation

- [ ] Detect attempts to leave an active session.
- [ ] Display a confirmation prompt.
- [ ] Allow the user to continue the session.
- [ ] Allow the user to end and leave the session.
- [ ] Avoid showing warnings after session completion.

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