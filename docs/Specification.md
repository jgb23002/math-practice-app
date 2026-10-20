# Math Practice App — Software Specification

## 1. Project Overview

The Math Practice App is a browser-based educational application designed for children ages 7–12. It helps students practice fundamental arithmetic skills through interactive multiple-choice flashcards.

The application will support:

- Addition
- Subtraction
- Multiplication
- Division

Students will answer questions, flip cards to reveal the correct answer, and record whether they answered correctly or incorrectly. The application will remember incorrectly answered questions and generate similar questions for additional practice.

The application will be built using React and will not require users to create an account or sign in.

---

## 2. Goals

The primary goals of the application are to:

1. Provide an easy-to-use math practice experience for children ages 7–12.
2. Organize questions into clearly defined difficulty levels.
3. Give students immediate feedback after each question.
4. Track correct and incorrect answers.
5. identify areas where a student needs more practice.
6. Generate similar questions based on previously incorrect answers.
7. Store progress locally without requiring an account.

---

## 3. Target Users

### 3.1 Primary User

Children between 7 and 12 years old who want to practice basic arithmetic.

### 3.2 Secondary User

Parents, guardians, or teachers who may review the student's statistics and progress.

---

## 4. Technology Stack

### 4.1 Frontend

- React
- JavaScript or TypeScript
- HTML5
- CSS3

TypeScript is recommended because it provides stronger type checking and can reduce implementation errors.

### 4.2 State Management

For the initial version, use:

- React Context
- React hooks such as `useState`, `useReducer`, and `useContext`

A third-party state-management library is not required for the first release.

### 4.3 Data Storage

Use browser `localStorage` to store:

- User settings
- Practice history
- Incorrect question patterns
- Statistics
- Current difficulty level

No backend or database is required for the initial version.

### 4.4 Optional Libraries

Possible supporting libraries include:

- React Router for page navigation
- Vitest or Jest for automated testing
- React Testing Library for component testing
- ESLint for code quality
- Prettier for formatting

---

## 5. Application Pages

The application should contain the following pages:

1. Home page
2. Practice setup page
3. Practice page
4. Statistics page
5. Settings page

---

## 6. Functional Requirements

## 6.1 Home Page

The home page should provide a simple introduction and navigation options.

### Required Elements

- Application title
- Short child-friendly welcome message
- Start Practice button
- View Statistics button
- Settings button

### Example Actions

- Selecting **Start Practice** opens the practice setup page.
- Selecting **View Statistics** opens the statistics page.
- Selecting **Settings** opens the settings page.

---

## 6.2 Practice Setup Page

The practice setup page allows the student to configure a practice session.

### Required Settings

#### Operation Selection

The user must be able to select one or more operations:

- Addition
- Subtraction
- Multiplication
- Division
- Mixed operations

#### Difficulty Selection

Questions should be organized into difficulty levels.

Initial levels:

- Level 1: Beginner
- Level 2: Easy
- Level 3: Intermediate
- Level 4: Advanced

#### Session Length

The user should be able to select the number of questions in a session.

Suggested options:

- 5 questions
- 10 questions
- 20 questions
- Continuous practice

#### Review Mode

The user should be able to select:

- Regular practice
- Practice similar questions from previous mistakes

### Start Session

The page must include a **Start Session** button.

The button should remain disabled until at least one operation and one difficulty level are selected.

---

## 6.3 Practice Page

The practice page is the primary interaction screen.

Each question should be displayed as a card.

### Question Card Front

The front of the card should display:

- The arithmetic question
- Four multiple-choice answers
- Current question number
- Total number of questions in the session
- Optional progress bar

Example:

```text
Question 3 of 10

7 × 8 = ?

[48] [54] [56] [64]
```

### Selecting an Answer

The user must select one multiple-choice answer before flipping the card.

After the user selects an answer:

- The selected answer should be visually highlighted.
- The Flip Card button should become enabled.
- The answer should not yet be counted as correct or incorrect.

### Flip Card Function

The card must include a **Flip Card** button.

When selected, the card should animate and display its back side.

The back of the card should show:

- The original question
- The correct answer
- The answer selected by the student
- A brief explanation when appropriate
- An **I Got It Right** button
- An **I Got It Wrong** button

Example:

```text
7 × 8 = 56

Your answer: 56

[ I Got It Right ] [ I Got It Wrong ]
```

### Self-Reported Result

The user will determine whether the question should be recorded as correct or incorrect.

Selecting either button should:

1. Record the result.
2. Update the session statistics.
3. Save the result to local storage.
4. Move to the next question.
5. Prevent the same question from being counted more than once.

### Next Question

After the student records the result, the application should automatically show the next card.

An optional short transition may be used.

---

## 6.4 Similar Question Generation

When a student marks a question as incorrect, the application must remember the question pattern and generate similar questions in future sessions.

### Example

Original incorrect question:

```text
8 × 7
```

Possible similar questions:

```text
7 × 8
8 × 6
9 × 7
56 ÷ 7
56 ÷ 8
```

### Stored Mistake Information

For each incorrect question, store:

- Operation
- First operand
- Second operand
- Correct answer
- Difficulty level
- Date and time
- Number of times answered incorrectly
- Number of similar questions later answered correctly

### Similarity Rules

Similar questions may be generated using:

- The same operation with nearby numbers
- Reversed operands for addition and multiplication
- Related inverse operations
- The same multiplication or division fact family
- The same difficulty level
- The same numeric range

### Review Priority

Questions should receive a higher review priority when:

- They have been answered incorrectly multiple times.
- They were answered incorrectly recently.
- Similar questions have not yet been answered correctly.

Questions should receive a lower review priority after the student correctly answers several similar questions.

### Mastery Rule

A mistake pattern may be considered mastered after the student correctly answers three similar questions.

This number should be configurable in the code.

---

## 6.5 Session Completion

At the end of a fixed-length practice session, show a session summary.

### Summary Information

- Total questions attempted
- Correct answers
- Incorrect answers
- Accuracy percentage
- Operations practiced
- Difficulty level
- Number of mistake-review questions completed

### Summary Actions

- Practice Again
- Practice Mistakes
- Change Settings
- View Statistics
- Return Home

For continuous practice, provide an **End Session** button.

---

## 6.6 Statistics Page

The statistics page should display both overall and recent performance.

### Overall Statistics

Display:

- Total questions attempted
- Total correct answers
- Total incorrect answers
- Overall accuracy percentage

Accuracy should be calculated as:

```text
correct answers / total questions attempted × 100
```

If no questions have been attempted, display an accuracy of `0%` or an appropriate empty-state message.

### Statistics by Operation

Display performance separately for:

- Addition
- Subtraction
- Multiplication
- Division

For each operation, show:

- Questions attempted
- Correct answers
- Incorrect answers
- Accuracy percentage

### Statistics by Difficulty

Display performance for each difficulty level.

For each level, show:

- Questions attempted
- Correct answers
- Incorrect answers
- Accuracy percentage

### Mistake Review Statistics

Display:

- Number of active mistake patterns
- Number of mastered mistake patterns
- Most frequently missed operation
- Most frequently missed number facts
- Number of similar questions practiced

### Recent Activity

Display recent sessions with:

- Date
- Operations
- Difficulty
- Questions attempted
- Correct answers
- Incorrect answers
- Accuracy

### Reset Statistics

The statistics page should include a **Reset Statistics** button.

Before deleting data, display a confirmation dialog:

```text
Are you sure you want to erase all practice history and statistics?
```

The user must explicitly confirm the reset.

---

## 6.7 Settings Page

The settings page should provide application-wide preferences.

### Suggested Settings

- Sound effects on or off
- Card animation on or off
- Show explanations on or off
- Default session length
- Default difficulty level
- Default operations
- Number of correct similar questions required for mastery
- Clear all application data

Settings should be stored in `localStorage`.

---

## 7. Difficulty Levels

The initial difficulty system should use four levels.

## 7.1 Level 1: Beginner

### Addition

- Numbers from 0 to 10
- Results no greater than 20

### Subtraction

- Numbers from 0 to 10
- No negative answers

### Multiplication

- Factors from 0 to 5

### Division

- Divisors from 1 to 5
- Whole-number answers only

---

## 7.2 Level 2: Easy

### Addition

- Numbers from 0 to 50
- Results no greater than 100

### Subtraction

- Numbers from 0 to 50
- No negative answers

### Multiplication

- Factors from 0 to 10

### Division

- Divisors from 1 to 10
- Whole-number answers only

---

## 7.3 Level 3: Intermediate

### Addition

- Numbers from 0 to 100
- May include carrying

### Subtraction

- Numbers from 0 to 100
- May include borrowing
- No negative answers by default

### Multiplication

- One-digit by one-digit multiplication
- One-digit by two-digit multiplication

### Division

- Divisors from 1 to 12
- Dividends up to 144
- Whole-number answers only

---

## 7.4 Level 4: Advanced

### Addition

- Numbers up to 1,000
- Multiple-digit addition

### Subtraction

- Numbers up to 1,000
- Multiple-digit subtraction
- Optional negative answers

### Multiplication

- Two-digit by one-digit multiplication
- Two-digit by two-digit multiplication

### Division

- Larger dividends
- One-digit or two-digit divisors
- Whole-number answers for the initial release

Questions involving remainders may be added in a future version.

---

## 8. Question Generation

## 8.1 Question Data Model

Each generated question should have a structure similar to:

```ts
type MathOperation =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division";

type DifficultyLevel = 1 | 2 | 3 | 4;

interface Question {
  id: string;
  operation: MathOperation;
  firstOperand: number;
  secondOperand: number;
  displayText: string;
  correctAnswer: number;
  choices: number[];
  difficulty: DifficultyLevel;
  source: "regular" | "mistake-review";
  mistakePatternId?: string;
}
```

## 8.2 Multiple-Choice Answers

Each question should contain four answer choices:

- One correct answer
- Three incorrect but plausible answers

### Incorrect Answer Rules

Incorrect choices should:

- Be unique
- Not equal the correct answer
- Be close enough to be believable
- Match the expected answer type
- Avoid negative values when the level does not allow them

### Example Distractors

For:

```text
8 × 7 = 56
```

Possible choices:

```text
48, 54, 56, 64
```

Possible distractor strategies include:

- Add or subtract one operand
- Use a nearby multiplication fact
- Introduce a common arithmetic mistake
- Change the answer by a small amount

### Choice Order

Answer choices should be randomly shuffled.

The correct answer must not consistently appear in the same position.

---

## 9. Division Rules

To avoid fractional answers in the initial release, division questions should be generated by first selecting:

- A divisor
- A whole-number quotient

The dividend should then be calculated as:

```text
dividend = divisor × quotient
```

Example:

```text
divisor = 7
quotient = 8
dividend = 56

Question: 56 ÷ 7
Answer: 8
```

Division by zero must never be generated.

---

## 10. Data Models

## 10.1 Practice Attempt

```ts
interface PracticeAttempt {
  id: string;
  questionId: string;
  operation: MathOperation;
  firstOperand: number;
  secondOperand: number;
  correctAnswer: number;
  selectedAnswer: number;
  selfReportedCorrect: boolean;
  difficulty: DifficultyLevel;
  source: "regular" | "mistake-review";
  attemptedAt: string;
  sessionId: string;
}
```

## 10.2 Practice Session

```ts
interface PracticeSession {
  id: string;
  startedAt: string;
  completedAt?: string;
  operations: MathOperation[];
  difficulty: DifficultyLevel;
  sessionLength: number | "continuous";
  attempted: number;
  correct: number;
  incorrect: number;
}
```

## 10.3 Mistake Pattern

```ts
interface MistakePattern {
  id: string;
  operation: MathOperation;
  firstOperand: number;
  secondOperand: number;
  correctAnswer: number;
  difficulty: DifficultyLevel;
  incorrectCount: number;
  similarCorrectCount: number;
  lastIncorrectAt: string;
  mastered: boolean;
}
```

## 10.4 Aggregate Statistics

```ts
interface OperationStatistics {
  attempted: number;
  correct: number;
  incorrect: number;
}

interface AppStatistics {
  attempted: number;
  correct: number;
  incorrect: number;
  byOperation: Record<MathOperation, OperationStatistics>;
  byDifficulty: Record<DifficultyLevel, OperationStatistics>;
}
```

---

## 11. Local Storage Structure

Suggested local-storage keys:

```text
mathPractice.settings
mathPractice.sessions
mathPractice.attempts
mathPractice.mistakePatterns
mathPractice.statistics
mathPractice.version
```

### Data Versioning

Store a schema version so that data can be migrated if the structure changes.

Example:

```json
{
  "version": 1
}
```

### Storage Failure

If local storage is unavailable or full:

- The current session should continue when possible.
- The application should display a friendly warning.
- The application should not crash.

---

## 12. Application State

Suggested global state:

```ts
interface AppState {
  settings: AppSettings;
  currentSession: PracticeSession | null;
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  selectedAnswer: number | null;
  isCardFlipped: boolean;
  attempts: PracticeAttempt[];
  mistakePatterns: MistakePattern[];
  statistics: AppStatistics;
}
```

---

## 13. User Interface Requirements

## 13.1 General Design

The interface should be:

- Bright and welcoming
- Easy to read
- Appropriate for children
- Free from unnecessary distractions
- Usable on tablets, laptops, and desktop computers

## 13.2 Buttons

Buttons should:

- Be large enough for children to select easily
- Use clear labels
- Provide visible hover, focus, and pressed states
- Avoid relying only on icons

## 13.3 Math Card

The question card should:

- Appear near the center of the page
- Have a clear front and back
- Use large text for the math problem
- Animate when flipped
- Remain usable when animations are disabled

## 13.4 Feedback

The application may use child-friendly feedback such as:

- “Great job!”
- “Nice work!”
- “Keep practicing!”
- “You are improving!”

Feedback should not shame or discourage students.

---

## 14. Accessibility Requirements

The application should follow WCAG accessibility principles.

### Required Accessibility Features

- Keyboard-accessible controls
- Visible keyboard focus
- Semantic HTML elements
- Proper button labels
- Sufficient text contrast
- Screen-reader-friendly question text
- Alternative behavior when animations are disabled
- Support for the `prefers-reduced-motion` setting
- No information communicated by color alone

### Keyboard Interaction

Suggested keyboard controls:

- Number keys `1` through `4` select answer choices.
- Enter activates the focused button.
- Space activates buttons and card controls.
- Tab moves between interactive controls.

### Card Flip Accessibility

The flip animation should not be the only way the answer is revealed.

The card should update appropriate accessibility attributes, such as:

```html
aria-expanded="true"
```

or use a live region to announce the revealed answer.

---

## 15. Responsive Design

The application must support:

- Desktop browsers
- Laptop browsers
- Tablets
- Mobile browsers

The primary design focus should be tablets and larger screens, since children may commonly use tablets for practice.

On small screens:

- Answer choices may appear in a single column.
- Navigation may collapse into a simple menu.
- Statistics tables may become stacked cards.

---

## 16. Navigation

Use React Router with routes similar to:

```text
/
 /practice/setup
 /practice/session
 /practice/summary
 /statistics
 /settings
```

The application should prevent accidental loss of an active session.

If the user tries to leave an active session, display a confirmation message.

---

## 17. Error Handling

The application should handle:

- Invalid locally stored data
- Missing session data
- Question-generation failures
- Duplicate multiple-choice answers
- Unsupported storage
- Corrupted statistics
- Unexpected navigation to the practice page

When local data is invalid, the application may reset only the affected section rather than deleting all user data.

---

## 18. Validation Rules

Before showing a question:

- The operation must be supported.
- The correct answer must be valid.
- Division questions must not divide by zero.
- Division answers must be whole numbers.
- There must be exactly four answer choices.
- All answer choices must be unique.
- One answer choice must equal the correct answer.
- The question must match the selected difficulty level.

Before recording an attempt:

- The user must have selected an answer.
- The card must have been flipped.
- The user must select either correct or incorrect.
- The attempt must not already have been recorded.

---

## 19. Suggested React Component Structure

```text
src/
├── app/
│   ├── App.tsx
│   ├── AppRoutes.tsx
│   └── AppProvider.tsx
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── PageContainer.tsx
│   ├── practice/
│   │   ├── QuestionCard.tsx
│   │   ├── AnswerChoice.tsx
│   │   ├── CardFront.tsx
│   │   ├── CardBack.tsx
│   │   ├── ProgressBar.tsx
│   │   └── SessionSummary.tsx
│   ├── statistics/
│   │   ├── StatisticsOverview.tsx
│   │   ├── OperationStatistics.tsx
│   │   ├── DifficultyStatistics.tsx
│   │   ├── MistakeStatistics.tsx
│   │   └── RecentSessions.tsx
│   └── common/
│       ├── Button.tsx
│       ├── ConfirmDialog.tsx
│       └── EmptyState.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── PracticeSetupPage.tsx
│   ├── PracticePage.tsx
│   ├── SessionSummaryPage.tsx
│   ├── StatisticsPage.tsx
│   └── SettingsPage.tsx
├── services/
│   ├── questionGenerator.ts
│   ├── similarQuestionGenerator.ts
│   ├── statisticsService.ts
│   └── storageService.ts
├── hooks/
│   ├── usePracticeSession.ts
│   ├── useStatistics.ts
│   └── useLocalStorage.ts
├── types/
│   ├── question.ts
│   ├── session.ts
│   ├── statistics.ts
│   └── settings.ts
└── utils/
    ├── math.ts
    ├── shuffle.ts
    ├── ids.ts
    └── validation.ts
```

---

## 20. Core Services

## 20.1 Question Generator

Responsibilities:

- Generate questions for a selected operation.
- Apply difficulty-level rules.
- Calculate the correct answer.
- Generate plausible incorrect choices.
- Shuffle answer choices.
- Validate the completed question.

Suggested function:

```ts
function generateQuestion(
  operation: MathOperation,
  difficulty: DifficultyLevel
): Question;
```

## 20.2 Similar Question Generator

Responsibilities:

- Read active mistake patterns.
- Select a mistake based on review priority.
- Generate a related question.
- Avoid repeating the exact same question too often.
- Update mastery progress.

Suggested function:

```ts
function generateSimilarQuestion(
  pattern: MistakePattern
): Question;
```

## 20.3 Statistics Service

Responsibilities:

- Record an attempt.
- Update overall statistics.
- Update operation statistics.
- Update difficulty statistics.
- Calculate accuracy.
- Produce recent-session summaries.

## 20.4 Storage Service

Responsibilities:

- Read data from local storage.
- Write data to local storage.
- Validate stored data.
- Apply schema migrations.
- Clear selected data.
- Clear all data.

---

## 21. Testing Requirements

## 21.1 Unit Tests

Test:

- Addition question generation
- Subtraction question generation
- Multiplication question generation
- Division question generation
- Difficulty boundaries
- Distractor generation
- Choice uniqueness
- Choice shuffling
- Similar-question generation
- Statistics calculations
- Accuracy calculations
- Mastery rules
- Local-storage serialization

## 21.2 Component Tests

Test:

- Answer selection
- Flip button behavior
- Correct and incorrect buttons
- Card front and back rendering
- Session progress
- Session completion
- Statistics display
- Reset confirmation dialog

## 21.3 Integration Tests

Test complete flows such as:

1. Start a practice session.
2. Select an answer.
3. Flip the card.
4. Mark the answer incorrect.
5. Confirm that statistics update.
6. Confirm that a mistake pattern is stored.
7. Start mistake-review mode.
8. Confirm that a similar question appears.

## 21.4 Edge Cases

Test:

- No stored data
- Corrupted stored data
- Zero attempts
- All answers correct
- All answers incorrect
- Continuous practice
- Browser refresh during a session
- Duplicate distractor generation
- Division by zero prevention
- Very small device widths

---

## 22. Security and Privacy

Because no account is required, all student data will remain in the browser.

The initial version should:

- Avoid collecting personal information.
- Avoid sending practice history to external services.
- Avoid using third-party analytics that track children.
- Clearly state that clearing browser data may erase progress.
- Avoid advertisements and external links in the child-facing practice interface.

If cloud storage or accounts are added later, additional child privacy requirements may apply.

---

## 23. Performance Requirements

The application should:

- Load quickly on typical home and school internet connections.
- Generate questions without noticeable delay.
- Animate cards smoothly.
- Avoid unnecessary re-rendering.
- Work with at least several thousand stored attempts.
- Keep local-storage records compact.

Older attempt records may be summarized or archived if storage grows too large.

---

## 24. Minimum Viable Product

The first release should include:

- Addition, subtraction, multiplication, and division
- Four difficulty levels
- Multiple-choice question cards
- Card-flip functionality
- Self-reported correct and incorrect buttons
- Local tracking of incorrect questions
- Similar-question generation
- Overall statistics
- Statistics by operation
- Statistics by difficulty
- Session summaries
- Local-storage persistence
- Responsive design
- Basic accessibility support

---

## 25. Future Enhancements

Potential future features include:

- Parent or teacher dashboard
- Multiple child profiles
- Optional user accounts
- Cloud synchronization
- Timed practice mode
- Daily goals
- Practice streaks
- Badges and rewards
- Audio reading of questions
- Visual math explanations
- Fraction practice
- Decimal practice
- Division with remainders
- Custom number ranges
- Printable worksheets
- Classroom mode
- Difficulty that adapts automatically
- Progressive web app support
- Offline installation
- Exportable progress reports

---

## 26. Acceptance Criteria

The initial release will be considered complete when:

1. A user can select one or more arithmetic operations.
2. A user can select a difficulty level.
3. A user can start a fixed-length or continuous session.
4. Each question appears on a multiple-choice card.
5. Each question contains four unique answer choices.
6. A user can select an answer and flip the card.
7. The back of the card reveals the correct answer.
8. The user can mark the attempt as correct or incorrect.
9. Each attempt is counted exactly once.
10. Incorrect questions create or update mistake patterns.
11. The application can generate similar questions from mistake patterns.
12. Statistics persist after the browser is closed and reopened.
13. The statistics page displays attempted, correct, and incorrect totals.
14. Statistics can be viewed by operation and difficulty.
15. The user can reset stored statistics after confirming the action.
16. The application works without an account or backend server.
17. The main features work with keyboard navigation.
18. The interface functions on desktop, tablet, and mobile screens.

---

## 27. Assumptions

This specification assumes:

- One child uses a given browser profile.
- Progress is stored only on the current device and browser.
- The child self-reports whether an answer was correct or incorrect.
- Division questions use whole-number answers in the first release.
- Subtraction does not produce negative answers except where explicitly enabled.
- The application is initially delivered as a client-side React application.
- No personally identifiable information is collected.