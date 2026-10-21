import { expect, test } from 'vitest'
import { createStatisticsAttempt } from '../test/statisticsFixtures'
import { seededRandom } from '../test/seededRandom'
import {
  addAttemptsToStatistics,
  calculateStatistics,
  createEmptyStatistics,
  formatAccuracy,
} from './statistics'

test.each(['all correct', 'all incorrect', 'alternating'] as const)(
  'all operation/level groups retain accurate %s totals through reorder, serialization and chunking',
  (result) => {
    const attempts = (
      ['addition', 'subtraction', 'multiplication', 'division'] as const
    ).flatMap((operation, op) =>
      ([1, 2, 3, 4] as const).flatMap((difficulty, level) =>
        Array.from({ length: 20 }, (_, index) =>
          createStatisticsAttempt(
            operation,
            difficulty,
            op * 80 + level * 20 + index,
            result === 'all correct' ||
              (result === 'alternating' && index % 2 === 0),
          ),
        ),
      ),
    )
    const correct =
      result === 'all correct' ? 320 : result === 'all incorrect' ? 0 : 160
    const expected = { attempted: 320, correct, incorrect: 320 - correct }
    const shuffled = [...attempts]
    const random = seededRandom(20020)
    for (let index = shuffled.length - 1; index > 0; index--) {
      const target = Math.floor(random() * (index + 1))
      ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
    }
    const statistics = calculateStatistics(Object.freeze(shuffled))
    expect(statistics).toMatchObject(expected)
    const group = {
      attempted: 80,
      correct: correct / 4,
      incorrect: (320 - correct) / 4,
    }
    for (const totals of [
      ...Object.values(statistics.byOperation),
      ...Object.values(statistics.byDifficulty),
    ])
      expect(totals).toEqual(group)
    expect(formatAccuracy(statistics)).toBe(`${(correct / 320) * 100}%`)
    let chunked = createEmptyStatistics()
    for (let index = 0; index < shuffled.length; index += 7)
      chunked = addAttemptsToStatistics(
        chunked,
        JSON.parse(JSON.stringify(shuffled.slice(index, index + 7))),
      )
    expect(chunked).toEqual(statistics)
    expect(calculateStatistics(attempts)).toEqual(statistics)
  },
)
