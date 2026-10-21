import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

/** Production smoke checks; Vite preview is not Netlify's edge runtime. */
export async function checkRelease({
  send,
  evaluate,
  until,
  click,
  inspect,
  socket,
  origin,
}) {
  const routes = [
    ['/', '/', 'A little practice. A big adventure.'],
    ['/practice/setup', '/practice/setup', 'Your next math adventure'],
    ['/practice/session', '/practice/setup', 'Your next math adventure'],
    ['/practice/summary', '/practice/setup', 'Your next math adventure'],
    ['/statistics', '/statistics', 'See how you grow'],
    ['/settings', '/settings', 'Make it feel like you'],
    ['/not-a-real-page', '/not-a-real-page', 'Oops! This page wandered off.'],
  ]
  for (const [path, expected, heading] of routes) {
    const response = await fetch(origin + path)
    assert.equal(response.status, 200, `Production HTTP route: ${path}`)
    assert.match(await response.text(), /id="root"/, `SPA document: ${path}`)
    const previous = await evaluate('performance.timeOrigin')
    await send('Page.navigate', { url: origin + path })
    await until(
      () =>
        evaluate(
          `performance.timeOrigin !== ${previous} && location.pathname === ${JSON.stringify(expected)} && document.querySelector('main h1:not([data-loading])')?.textContent.trim() === ${JSON.stringify(heading)}`,
        ),
      `production direct URL ${path}`,
    )
    assert.equal(
      await evaluate(
        `!!document.querySelector('input:not([type="radio"]):not([type="checkbox"]), textarea, iframe')`,
      ),
      false,
      'No personal-information fields or embedded third-party pages',
    )
    await inspect(`production-direct-${path}`)
  }
  const manifest = JSON.parse(
    await readFile(
      new URL('../dist/.vite/manifest.json', import.meta.url),
      'utf8',
    ),
  )
  for (const asset of Object.values(manifest).flatMap((entry) => [
    entry.file,
    ...(entry.css ?? []),
  ])) {
    const response = await fetch(`${origin}/${asset}`)
    assert.equal(response.status, 200, `Static production asset: ${asset}`)
    assert.ok(
      !response.headers.get('content-type')?.includes('text/html'),
      'Existing assets must not receive the SPA document',
    )
  }

  let confirm = true
  const dialogErrors = []
  const dialog = (event) => {
    const message = JSON.parse(event.data)
    if (message.method === 'Page.javascriptDialogOpening')
      void send('Page.handleJavaScriptDialog', {
        accept: message.params.type === 'beforeunload' || confirm,
      }).catch((error) => dialogErrors.push(error.message))
  }
  socket.addEventListener('message', dialog)
  const attempts = () =>
    evaluate(`JSON.parse(localStorage.getItem('mathPractice.attempts'))`)
  try {
    await send('Page.navigate', { url: origin + '/practice/setup' })
    await until(
      () => evaluate(`!!document.querySelector('.setup-start')`),
      'production setup',
    )
    await click('input[name="operations"][value="addition"]')
    await click('input[name="sessionLength"][value="5"]')
    await click('.setup-start')
    await until(
      () =>
        evaluate(
          `location.pathname === '/practice/session' && !!document.querySelector('.question-card')`,
        ),
      'production session',
    )
    for (let index = 0; index < 5; index++) {
      await click('.answer-choice')
      await click('.question-card__flip')
      await until(
        () =>
          evaluate(
            `document.querySelector('.question-card').dataset.flipped === 'true'`,
          ),
        'revealed production card',
      )
      assert.equal(
        (await attempts()).length,
        index,
        'Selecting/revealing cannot record a mark',
      )
      await evaluate(`(() => {
        const chosen = document.querySelector('.question-card__report--${index === 0 ? 'wrong' : 'right'}');
        const other = document.querySelector('.question-card__report--${index === 0 ? 'right' : 'wrong'}');
        chosen.click(); other.click(); chosen.click();
      })()`)
      await until(
        async () => (await attempts()).length === index + 1,
        'one accepted production self-report',
      )
    }
    await until(
      () =>
        evaluate(
          `location.pathname === '/practice/summary' && !!document.querySelector('.session-summary__accuracy')`,
        ),
      'production summary',
    )
    const history = await attempts()
    assert.equal(new Set(history.map((attempt) => attempt.id)).size, 5)
    assert.equal(
      new Set(
        history.map((attempt) => `${attempt.sessionId}:${attempt.questionId}`),
      ).size,
      5,
    )
    assert.deepEqual(
      history.map((attempt) => attempt.selfReportedCorrect),
      [false, true, true, true, true],
    )
    assert.equal(
      await evaluate(
        `document.querySelector('.session-summary__accuracy strong').textContent`,
      ),
      '80%',
    )
    assert.equal(
      await evaluate(
        `JSON.parse(localStorage.getItem('mathPractice.mistakePatterns'))[0].incorrectCount`,
      ),
      1,
    )
    assert.equal(
      await evaluate(`localStorage.getItem('mathPractice.activeSession')`),
      null,
    )
    await inspect('production-completed-summary')

    await click('nav a[href="/settings"]')
    await until(
      () => evaluate(`!!document.querySelector('.settings-privacy')`),
      'production privacy notice',
    )
    assert.match(
      await evaluate(`document.querySelector('.settings-privacy').textContent`),
      /Clearing your browser data may erase your progress/,
    )
    await evaluate(
      `Array.from(document.querySelectorAll('.preference-toggle')).find(label => label.querySelector('.preference-toggle__copy > span')?.textContent === 'Card animation').querySelector('input').click()`,
    )
    const settings = await evaluate(
      `localStorage.getItem('mathPractice.settings')`,
    )
    const previous = await evaluate('performance.timeOrigin')
    await send('Page.reload')
    await until(
      () =>
        evaluate(
          `performance.timeOrigin !== ${previous} && !!document.querySelector('.settings-page')`,
        ),
      'production settings refresh',
    )
    assert.equal(
      await evaluate(`localStorage.getItem('mathPractice.settings')`),
      settings,
    )
    assert.equal((await attempts()).length, 5)

    // Check the new notice and navigation at desktop, tablet, and 320px widths.
    for (const [width, height] of [
      [1280, 800],
      [768, 1024],
      [320, 568],
    ]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 600,
      })
      await inspect(`production-settings-${width}`)
    }
    await click('nav a[href="/statistics"]')
    await until(
      () => evaluate(`!!document.querySelector('.statistics-reset__button')`),
      'production statistics',
    )
    confirm = false
    await click('.statistics-reset__button')
    assert.equal((await attempts()).length, 5, 'Cancel preserves history')
    confirm = true
    await click('.statistics-reset__button')
    await until(
      async () => (await attempts()).length === 0,
      'production confirmed reset',
    )
    assert.equal(
      await evaluate(`localStorage.getItem('mathPractice.settings')`),
      settings,
    )
    assert.equal(
      await evaluate(
        `JSON.parse(localStorage.getItem('mathPractice.mistakePatterns')).length`,
      ),
      1,
    )
    await inspect('production-confirmed-reset')
    assert.equal(await evaluate('document.cookie'), '')
    assert.deepEqual(dialogErrors, [])
    // A fresh, isolated profile state for the clean-browser-restart suite.
    await evaluate('localStorage.clear()')
    await send('Page.navigate', { url: origin })
    await until(
      () => evaluate(`!!document.querySelector('.home-hero')`),
      'clean production home',
    )
    console.log(
      '✓ Production direct URLs, static assets, session/summary, exactly-once reports, mistakes, refresh, privacy notice, responsive settings, and confirmed statistics reset',
    )
  } finally {
    socket.removeEventListener('message', dialog)
  }
}
