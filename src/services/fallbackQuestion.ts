import { QUESTION_SYMBOLS } from '../config/difficulty'
import type {
  ArithmeticQuestion,
  DifficultyLevel,
  MathOperation,
  Question,
} from '../types/question'
import type { PracticeSessionState } from '../types/session'
import { createUniqueId } from '../utils/ids'
import { isValidQuestion } from '../utils/validation'

// Each seed fits its original Section 7 level. Offset 0/1 also fits, allowing
// consecutive fallback cards to vary without depending on randomness.
const facts: Record<
  MathOperation,
  Record<DifficultyLevel, readonly [number, number]>
> = {
  addition: { 1: [2, 3], 2: [12, 8], 3: [27, 15], 4: [125, 250] },
  subtraction: { 1: [5, 2], 2: [20, 8], 3: [73, 28], 4: [325, 140] },
  multiplication: { 1: [2, 3], 2: [6, 7], 3: [8, 12], 4: [24, 15] },
  division: { 1: [6, 2], 2: [42, 6], 3: [96, 8], 4: [360, 12] },
}

/** A deterministic choice builder independent of the random distractor service. */
export function completeFallbackQuestion(core: ArithmeticQuestion): Question {
  const answer = core.correctAnswer
  const nearby = answer === 0 ? [1, 2, 3] : [answer - 1, answer + 1, answer + 2]
  const choices = [answer, ...nearby]
  // Derive order from the fresh UUID's entropy; do not reuse a failing math RNG.
  let seed = 2166136261
  for (const character of core.id)
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0
  for (let index = choices.length - 1; index > 0; index--) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    const target = seed % (index + 1)
    ;[choices[index], choices[target]] = [choices[target], choices[index]]
  }
  const question = { ...core, choices }
  if (!isValidQuestion(question))
    throw new Error('Fallback question failed validation.')
  return question
}

export function generateFallbackQuestion(
  session: Pick<
    PracticeSessionState,
    'operations' | 'difficulty' | 'attempted'
  >,
  createId = createUniqueId,
): Question {
  const operation =
    session.operations[session.attempted % session.operations.length]
  const [first, second] = facts[operation][session.difficulty]
  const offset = Math.floor(session.attempted / session.operations.length) % 2
  const firstOperand =
    first + (operation === 'division' ? offset * second : offset)
  const correctAnswer =
    operation === 'addition'
      ? firstOperand + second
      : operation === 'subtraction'
        ? firstOperand - second
        : operation === 'multiplication'
          ? firstOperand * second
          : firstOperand / second
  return completeFallbackQuestion({
    id: createId(),
    operation,
    firstOperand,
    secondOperand: second,
    correctAnswer,
    difficulty: session.difficulty,
    displayText: `${firstOperand} ${QUESTION_SYMBOLS[operation]} ${second} = ?`,
    source: 'regular',
  })
}
