# Debugging Case Study: Keyboard Accessibility

## 1. Bug Discovery

During manual testing of the Math Practice application, I discovered that the keyboard shortcuts were not working as instructed.

The question card displayed the message:

"Keyboard tip: Tab to this card, then press 1–4 to pick an answer."

However, pressing Tab did not allow me to focus the question card as expected, and pressing the number keys did not select the corresponding answers.

**Expected behavior:**

- Tab should move focus to the question card.
- Keys 1–4 should select the corresponding multiple-choice answers.
- The selected answer should be highlighted.
- The Flip Card button should become enabled.
- Keyboard selection should not modify an answer after the card is flipped.

**Actual behavior:** The number keys did not select answers through the instructed keyboard interaction.

**Evidence:** Figure 1 — Original Bug Report.

## 2. AI-Assisted Investigation

I submitted a structured debugging prompt to my AI coding assistant describing the problem, expected behavior, reproduction steps, and requirements for the fix.

I asked the agent to inspect the relevant question-card components and determine whether the issue involved event handling, keyboard focus, or another cause.

The AI identified a focus-management issue rather than a missing keyboard event listener.

The question card already included an `onKeyDown` handler, but the containing `<article>` element was not keyboard-focusable through Tab.

**Evidence:** Figure 2 — AI Root-Cause Analysis.

## 3. Code Correction

The AI updated `QuestionCard.tsx` to include:

```tsx
aria-describedby={questionDescriptionId}
tabIndex={isCardFlipped ? -1 : 0}
```

This modification allowed the question card to receive keyboard focus before flipping and removed it from the normal Tab sequence after flipping.

The existing keyboard handler, mouse and touch interaction, and answer-locking behavior were preserved.

**Evidence:** Figure 3 — Code Changes.

## 4. Regression Testing

The AI added regression tests to verify:

- Tab reaches the question card.
- Number keys 1–4 select the corresponding answers.
- The selected answer becomes highlighted.
- Flip Card becomes enabled after selection.
- Keyboard selection does not automatically record an attempt.
- Answer changes are prevented after the card flips.
- Keyboard shortcuts do not interfere with input fields.
- Mouse and simulated touch interactions remain functional.

**Evidence:** Figure 4 — Regression Test Implementation.

## 5. Automated Test Results

I ran the relevant tests using Vitest.

**Targeted accessibility tests:**

- Test files: 1 passed
- Tests: 13 passed
- Failures: 0

**Complete automated test suite:**

- Test files: 65 passed
- Tests: 1,311 passed
- Failures: 0

These results demonstrate that the automated tests passed after the accessibility correction.

**Evidence:** Figures 5a and 5b — Terminal Test Results.

## 6. Manual Browser Verification

I opened the application in my local browser and tested the corrected keyboard interaction.

The captured screenshots show the question card with a visible keyboard-focus outline before selection, followed by the first answer highlighted and the Flip Card button enabled.

**Evidence:**

- Figure 6a — Card Focus
- Figure 6b — Answer Selection

The screenshots document the visible states. The precise keyboard actions used and any additional browser checks should be recorded based on my actual manual test results.

## 7. Reflection

This debugging experience demonstrated that implementing an event handler does not automatically make an interface accessible.

The original implementation contained keyboard-selection logic, but the question card could not receive focus through the intended Tab navigation.

Using an AI coding assistant helped identify the root cause, implement a targeted correction, and add regression tests. However, manual browser testing remained essential because the original problem was discovered through real user interaction.

I learned to communicate debugging issues using expected behavior, actual behavior, reproduction steps, and verification requirements rather than asking an AI assistant to fix a vaguely described problem.
