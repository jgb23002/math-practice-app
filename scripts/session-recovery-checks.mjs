import assert from 'node:assert/strict'

/** Exercise real browser history, native refresh prompts, and recovered cards. */
export async function checkSessionRecovery({
  send,
  evaluate,
  until,
  click,
  inspect,
  socket,
  origin,
}) {
  const dialogs = [],
    dialogErrors = []
  let acceptDialog = false
  const handleDialog = (event) => {
    const message = JSON.parse(event.data)
    if (message.method !== 'Page.javascriptDialogOpening') return
    dialogs.push(message.params)
    void send('Page.handleJavaScriptDialog', { accept: acceptDialog }).catch(
      (error) => dialogErrors.push(error.message),
    )
  }
  socket.addEventListener('message', handleDialog)
  const path = async (expected) =>
    until(
      () =>
        evaluate(
          `location.pathname === ${JSON.stringify(expected)} && !!document.querySelector('main h1')`,
        ),
      expected,
    )
  const button = async (label) =>
    evaluate(
      `Array.from(document.querySelectorAll('button')).find(el => el.textContent.trim() === ${JSON.stringify(label)}).click()`,
    )
  const nav = async (href) => click(`nav a[href="${href}"]`)
  const snapshot = () =>
    evaluate(`JSON.parse(localStorage.getItem('mathPractice.activeSession'))`)
  const totals = () =>
    evaluate(`JSON.parse(localStorage.getItem('mathPractice.statistics'))`)
  async function waitDialog() {
    await until(
      () => evaluate(`!!document.querySelector('dialog[open]')`),
      'leave confirmation',
    )
  }
  async function reload(accept, expectPrompt = true) {
    acceptDialog = accept
    const previous = dialogs.length
    await evaluate(`window.__oldRecoveryDocument = true`)
    await send('Page.reload')
    if (expectPrompt) {
      await until(
        () => dialogs.length === previous + 1,
        'native beforeunload prompt',
      )
      assert.equal(dialogs.at(-1).type, 'beforeunload')
    }
    if (!expectPrompt || accept)
      await until(
        () =>
          evaluate(
            `!window.__oldRecoveryDocument && !!document.querySelector('main h1')`,
          ),
        'refreshed application',
      )
    else assert.equal(await evaluate('window.__oldRecoveryDocument'), true)
    if (!expectPrompt)
      assert.equal(
        dialogs.length,
        previous,
        'Completed sessions should not warn on refresh',
      )
  }
  async function start() {
    await click('a[href="/practice/setup"]')
    await path('/practice/setup')
    await click('input[value="addition"]')
    await click('input[name="difficulty"][value="1"]')
    await click('input[name="sessionLength"][value="5"]')
    await click('.setup-start')
    await path('/practice/session')
  }
  async function report() {
    await click('.answer-choice')
    await click('.question-card__flip')
    await click('.question-card__report--right')
  }
  try {
    await start()
    const initial = await snapshot()
    await click('.answer-choice')
    const selected = await snapshot()
    assert.equal(
      selected.session.currentQuestion.id,
      initial.session.currentQuestion.id,
    )
    await reload(false)
    assert.deepEqual(
      (await snapshot()).session,
      selected.session,
      'Cancel refresh preserves the selected card',
    )
    await reload(true)
    assert.deepEqual(
      (await snapshot()).session,
      selected.session,
      'Refresh preserves the card, option order and selected answer',
    )
    assert.equal(
      await evaluate(
        `document.querySelectorAll('.answer-choice[aria-pressed="true"]').length`,
      ),
      1,
    )
    await click('.question-card__flip')
    const revealed = await snapshot()
    await reload(true)
    assert.equal(
      await evaluate(
        `document.querySelector('.question-card').dataset.flipped`,
      ),
      'true',
    )
    assert.deepEqual((await snapshot()).session, revealed.session)
    assert.equal(
      (await totals()).attempted,
      0,
      'Selecting and revealing must not record results',
    )
    await click('.question-card__report--wrong')
    const next = await snapshot()
    assert.equal(next.session.attempted, 1)
    await reload(true)
    assert.deepEqual((await snapshot()).session, next.session)
    assert.equal(
      (await totals()).attempted,
      1,
      'Recorded result must not be replayed on refresh',
    )
    assert.equal(
      await evaluate(
        `JSON.parse(localStorage.getItem('mathPractice.mistakePatterns'))[0].incorrectCount`,
      ),
      1,
    )

    await nav('/settings')
    await waitDialog()
    for (const [width, height] of [
      [1440, 900],
      [768, 1024],
      [320, 568],
      [640, 360],
    ]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 600,
      })
      await inspect(`${width}x${height}-leave-dialog`)
    }
    assert.equal(
      await evaluate(`document.activeElement.textContent.trim()`),
      'Keep Practicing',
    )
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
    })
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
    })
    await until(
      () => evaluate(`!document.querySelector('dialog[open]')`),
      'Escape stays on card',
    )
    assert.equal(await evaluate('location.pathname'), '/practice/session')
    // CDP clicks above do not focus links; real keyboard activation does.
    await evaluate(`document.querySelector('nav a[href="/settings"]').focus()`)
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      text: '\r',
    })
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
    })
    await waitDialog()
    await button('Keep Practicing')
    await until(
      () => evaluate(`!document.querySelector('dialog[open]')`),
      'stay restores focus',
    )
    assert.equal(
      await evaluate(`document.activeElement.getAttribute('href')`),
      '/settings',
    )
    await nav('/settings')
    await waitDialog()
    await button('Leave for Now')
    await path('/settings')
    assert.equal(
      await evaluate(
        `!!Array.from(document.querySelectorAll('a')).find(el => el.textContent.trim() === 'Resume Session')`,
      ),
      true,
    )
    await reload(true)
    await click('.session-recovery-notice a')
    await path('/practice/session')
    assert.deepEqual((await snapshot()).session, next.session)

    await evaluate('history.back()')
    await waitDialog()
    await button('Keep Practicing')
    assert.equal(await evaluate('location.pathname'), '/practice/session')
    await evaluate('history.back()')
    await waitDialog()
    await button('Leave for Now')
    await path('/settings')
    await evaluate('history.forward()')
    await path('/practice/session')
    assert.deepEqual((await snapshot()).session, next.session)
    for (let count = 0; count < 4; count++) await report()
    await path('/practice/summary')
    assert.equal(await snapshot(), null)
    assert.equal((await totals()).attempted, 5)
    assert.equal((await totals()).correct, 4)
    await nav('/')
    await path('/')
    assert.equal(
      await evaluate(`!!document.querySelector('dialog[open]')`),
      false,
    )
    await reload(true, false)

    await start()
    await report()
    await nav('/statistics')
    await waitDialog()
    await button('End Session and Leave')
    await path('/statistics')
    assert.equal(await snapshot(), null)
    assert.equal((await totals()).attempted, 6)
    await reload(true, false)
    await send('Page.navigate', { url: `${origin}/practice/session` })
    await path('/practice/setup')
    assert.equal(
      await evaluate(`!!document.querySelector('dialog[open]')`),
      false,
    )
    assert.deepEqual(dialogErrors, [])
    console.log(
      '✓ Native refresh cancel/accept, selected/revealed recovery, exact-once results, Back/Forward, keyboard leave dialog, pause/resume, completion, end-and-leave, and direct-route recovery',
    )
  } finally {
    socket.removeEventListener('message', handleDialog)
  }
}
