import { expect, test } from 'vitest'
import { seededRandom } from '../test/seededRandom'
import { generateAnswerChoices } from './answerChoices'
import { generateQuestion } from './questionGenerator'

for (const operation of [
  'addition',
  'subtraction',
  'multiplication',
  'division',
] as const)
  for (const difficulty of [1, 2, 3, 4] as const)
    test(`fixed ${operation} level ${difficulty} fact reaches all answer positions without duplicate distractors`, () => {
      for (const seed of [42, 5093]) {
        const { choices: originalChoices, ...core } = generateQuestion(
          operation,
          difficulty,
          {
            random: seededRandom(seed),
            createId: () => `fixed-${operation}-${difficulty}`,
          },
        )
        const before = structuredClone(core)
        const random = seededRandom(seed)
        const positions = new Set<number>(),
          orders = new Set<string>()
        for (let sample = 0; sample < 128; sample++) {
          const choices = generateAnswerChoices(Object.freeze(core), { random })
          const context = JSON.stringify({
            operation,
            difficulty,
            seed,
            sample,
            core,
            choices,
          })
          expect(choices, context).toHaveLength(4)
          expect(new Set(choices).size, context).toBe(4)
          expect(
            choices.filter((choice) => choice === core.correctAnswer),
            context,
          ).toHaveLength(1)
          expect(
            choices.every(
              (choice) => Number.isSafeInteger(choice) && choice >= 0,
            ),
            context,
          ).toBe(true)
          positions.add(choices.indexOf(core.correctAnswer))
          orders.add(choices.join(','))
        }
        expect(
          [...positions].sort(),
          `operation=${operation}, level=${difficulty}, seed=${seed}`,
        ).toEqual([0, 1, 2, 3])
        expect(orders.size).toBeGreaterThan(4)
        expect(core).toEqual(before)
        expect(originalChoices).toHaveLength(4)
      }
    })
