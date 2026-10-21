import assert from 'node:assert/strict'

/** Reopen the same disposable profile using genuinely new Chrome processes. */
export async function checkBrowserPersistence({
  send,
  evaluate,
  until,
  click,
  inspect,
  socket,
  origin,
  restartBrowser,
}) {
  let currentSocket = socket
  const dialogErrors = []
  const handleDialog = (event) => {
    if (JSON.parse(event.data).method === 'Page.javascriptDialogOpening')
      void send('Page.handleJavaScriptDialog', { accept: true }).catch(
        (error) => dialogErrors.push(error.message),
      )
  }
  currentSocket.addEventListener('message', handleDialog)
  const stored = () =>
    evaluate(
      `Object.fromEntries(Object.keys(localStorage).sort().map(key => [key,JSON.parse(localStorage.getItem(key))]))`,
    )
  async function restart(path) {
    currentSocket = await restartBrowser()
    currentSocket.addEventListener('message', handleDialog)
    await send('Page.navigate', { url: `${origin}${path}` })
    await until(
      () => evaluate(`!!document.querySelector('main h1:not([data-loading])')`),
      'reopened browser app',
    )
  }
  try {
    await evaluate(
      `localStorage.setItem('unrelated.application', JSON.stringify('keep'))`,
    )
    await click('main a[href="/practice/setup"]')
    await until(
      () => evaluate(`!!document.querySelector('.setup-start')`),
      'practice setup',
    )
    await click('input[name="operations"][value="addition"]')
    await click('input[name="sessionLength"][value="5"]')
    await click('.setup-start')
    await until(
      () => evaluate(`!!document.querySelector('.question-card')`),
      'first card',
    )
    await click('.answer-choice')
    await click('.question-card__flip')
    await click('.question-card__report--wrong')
    await until(
      () =>
        evaluate(
          `JSON.parse(localStorage.getItem('mathPractice.attempts')).length === 1`,
        ),
      'first persisted self-report',
    )
    await click('.answer-choice')
    await click('.question-card__flip')
    const selected = await stored()
    assert.equal(
      selected['mathPractice.activeSession'].session.isAnswerRevealed,
      true,
    )
    await restart('/practice/session')
    assert.deepEqual(
      await stored(),
      selected,
      'Closing and reopening Chrome must preserve all categories and the exact revealed card',
    )
    assert.equal(
      await evaluate(
        `document.querySelector('.question-card').dataset.flipped`,
      ),
      'true',
    )
    await inspect('browser-reopened-revealed-card')
    await evaluate(
      `(() => { const right=document.querySelector('.question-card__report--right'), wrong=document.querySelector('.question-card__report--wrong'); right.click(); wrong.click(); right.click(); })()`,
    )
    await until(
      () =>
        evaluate(
          `JSON.parse(localStorage.getItem('mathPractice.attempts')).length === 2`,
        ),
      'single restored self-report',
    )
    await click('nav a[href="/"]')
    await until(
      () => evaluate(`!!document.querySelector('dialog[open]')`),
      'end-and-leave dialog',
    )
    await evaluate(
      `Array.from(document.querySelectorAll('dialog button')).find(el => el.textContent.trim()==='End Session and Leave').click()`,
    )
    await until(
      () =>
        evaluate(
          `location.pathname==='/' && !localStorage.getItem('mathPractice.activeSession')`,
        ),
      'completion saved',
    )
    await click('main a[href="/practice/setup"]')
    await until(
      () => evaluate(`!!document.querySelector('.setup-start')`),
      'review setup',
    )
    await click('input[name="operations"][value="addition"]')
    await click('input[value="mistake-review"]')
    await click('.setup-start')
    await until(
      () => evaluate(`!!document.querySelector('.question-card')`),
      'real mistake review',
    )
    for (let index = 1; index <= 3; index++) {
      await click('.answer-choice')
      await click('.question-card__flip')
      await click('.question-card__report--right')
      await until(
        () =>
          evaluate(
            `JSON.parse(localStorage.getItem('mathPractice.mistakePatterns'))[0].similarCorrectCount === ${index}`,
          ),
        'review mastery update',
      )
    }
    await until(
      () => evaluate(`!!document.querySelector('.session-summary__accuracy')`),
      'mastered review summary',
    )
    const completed = await stored()
    assert.equal(completed['mathPractice.attempts'].length, 5)
    assert.equal(completed['mathPractice.mistakePatterns'][0].incorrectCount, 1)
    assert.equal(completed['mathPractice.mistakePatterns'][0].mastered, true)
    assert.equal(
      completed['mathPractice.mistakePatterns'][0].similarCorrectCount,
      3,
    )
    assert.ok(
      completed['mathPractice.attempts']
        .slice(-3)
        .every(
          (attempt) =>
            attempt.source === 'mistake-review' &&
            attempt.selfReportedCorrect &&
            attempt.mistakePatternId ===
              completed['mathPractice.mistakePatterns'][0].id,
        ),
    )
    assert.ok(completed['mathPractice.sessions'][0].completedAt)
    await restart('/statistics')
    assert.deepEqual(
      await stored(),
      completed,
      'Completed history must survive another clean browser process restart',
    )
    assert.deepEqual(
      {
        attempted: completed['mathPractice.statistics'].attempted,
        correct: completed['mathPractice.statistics'].correct,
        incorrect: completed['mathPractice.statistics'].incorrect,
      },
      { attempted: 5, correct: 4, incorrect: 1 },
    )
    assert.equal(
      await evaluate(`!!document.querySelector('.session-recovery-notice')`),
      false,
    )
    await inspect('browser-reopened-completed-statistics')
    await click('.statistics-reset__button')
    await until(
      () =>
        evaluate(
          `JSON.parse(localStorage.getItem('mathPractice.attempts')).length===0`,
        ),
      'confirmed reset saved',
    )
    const cleared = await stored()
    await restart('/statistics')
    assert.deepEqual(
      await stored(),
      cleared,
      'Reset must survive a third browser process restart',
    )
    assert.equal(cleared['mathPractice.statistics'].attempted, 0)
    assert.equal(cleared['mathPractice.mistakePatterns'][0].incorrectCount, 1)
    assert.equal(cleared['mathPractice.mistakePatterns'][0].mastered, true)
    assert.equal(cleared['unrelated.application'], 'keep')
    await inspect('browser-reopened-reset-statistics')
    assert.deepEqual(dialogErrors, [])
    console.log(
      '✓ Three clean Chrome process restarts preserve selected/revealed state, self-reports exactly once, completed history, mastery data, reset statistics, preferences, and unrelated keys',
    )
  } finally {
    currentSocket.removeEventListener('message', handleDialog)
  }
}
