import assert from 'node:assert/strict'

/** Inject browser failures only into this runner's disposable profile. */
export async function checkErrorRecovery({
  send,
  evaluate,
  until,
  click,
  inspect,
  socket,
  origin,
}) {
  const dialogErrors = []
  const dismissUnload = (event) => {
    if (JSON.parse(event.data).method === 'Page.javascriptDialogOpening')
      void send('Page.handleJavaScriptDialog', { accept: true }).catch(
        (error) => dialogErrors.push(error.message),
      )
  }
  socket.addEventListener('message', dismissUnload)
  async function navigate(path) {
    await evaluate('window.__previousErrorDocument = true')
    await send('Page.navigate', { url: `${origin}${path}` })
    await until(
      () =>
        evaluate(
          `!window.__previousErrorDocument && !!document.querySelector('main h1')`,
        ),
      path,
    )
  }
  async function seed() {
    await evaluate(`(async () => {
      localStorage.clear();
      const { createStatisticsProgress } = await import('/src/test/statisticsFixtures.ts');
      const { createMistakePattern } = await import('/src/test/mistakeFixtures.ts');
      const { saveStoredProgress } = await import('/src/services/progressPersistence.ts');
      const { createJsonStorage } = await import('/src/services/storage.ts');
      const progress = createStatisticsProgress();
      progress.sessions.sort((a,b) => b.startedAt.localeCompare(a.startedAt));
      progress.settings.soundEnabled = false;
      progress.mistakePatterns = [createMistakePattern()];
      if (!saveStoredProgress(createJsonStorage(), progress)) throw new Error('Invalid error-check fixtures');
      localStorage.setItem('unrelated.application', 'keep');
    })()`)
  }
  async function startAndReport() {
    await click('input[value="addition"]')
    await click('input[name="difficulty"][value="1"]')
    await click('.setup-start')
    await until(
      () => evaluate(`!!document.querySelector('.question-card')`),
      'usable question card',
    )
    const choices = await evaluate(
      `Array.from(document.querySelectorAll('.answer-choice'), el => el.getAttribute('aria-label'))`,
    )
    assert.equal(new Set(choices).size, 4)
    await click('.answer-choice')
    await click('.question-card__flip')
    await click('.question-card__report--right')
    try {
      await until(
        () =>
          evaluate(
            `Array.from(document.querySelectorAll('[aria-label="Session totals"] dt')).find(el => el.textContent === 'Attempted')?.nextElementSibling?.textContent.trim() === '1'`,
          ),
        'one accepted self-report',
      )
    } catch (error) {
      throw new Error(
        `${error.message}\nBrowser state: ${JSON.stringify(await evaluate(`({ page: document.querySelector('main')?.innerText, active: localStorage.getItem('mathPractice.activeSession') })`))}`,
        { cause: error },
      )
    }
  }
  try {
    await send('Emulation.setDeviceMetricsOverride', {
      width: 320,
      height: 568,
      deviceScaleFactor: 1,
      mobile: true,
    })
    for (const category of [
      'settings',
      'attempts',
      'sessions',
      'mistakePatterns',
      'statistics',
    ]) {
      await seed()
      const before = await evaluate(`JSON.parse(JSON.stringify(localStorage))`)
      await evaluate(
        `localStorage.setItem('mathPractice.${category}', '{bad JSON with private internals')`,
      )
      await navigate('/statistics')
      assert.equal(
        await evaluate(`!!document.querySelector('.storage-warning')`),
        true,
      )
      assert.equal(
        await evaluate(
          `document.body.textContent.includes('private internals')`,
        ),
        false,
      )
      for (const [key, value] of Object.entries(before))
        if (
          key !== `mathPractice.${category}` &&
          key !== 'mathPractice.statistics'
        )
          assert.equal(
            await evaluate(`localStorage.getItem(${JSON.stringify(key)})`),
            value,
            `${category} corruption changed ${key}`,
          )
      await inspect(`320x568-corrupt-${category}`)
    }
    await evaluate('localStorage.clear()')
    await navigate('/practice/session')
    await until(
      () =>
        evaluate(
          `location.pathname === '/practice/setup' && !!document.querySelector('.error-message')`,
        ),
      'missing-session explanation',
    )
    await inspect('320x568-missing-session')
    await click('.error-message a[href="/"]')
    await until(
      () => evaluate(`location.pathname === '/'`),
      'safe home navigation',
    )

    // Install controlled failures before application code runs on each new document.
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => {
      const scenario = sessionStorage.getItem('mathPractice.failureScenario');
      if (scenario === 'random') Math.random = () => NaN;
      const target = localStorage, get = Storage.prototype.getItem, set = Storage.prototype.setItem;
      if (scenario === 'denied') Storage.prototype.getItem = function(key) { if (this === target) throw new DOMException('Private storage internals', 'SecurityError'); return get.call(this,key); };
      if (scenario === 'full') Storage.prototype.setItem = function(key,value) { if (this === target) throw new DOMException('Private quota internals', 'QuotaExceededError'); return set.call(this,key,value); };
    })()`,
    })
    for (const scenario of ['random', 'denied', 'full']) {
      await evaluate(
        `sessionStorage.setItem('mathPractice.failureScenario', ${JSON.stringify(scenario)})`,
      )
      await navigate('/practice/setup')
      await startAndReport()
      assert.equal(
        await evaluate(`document.body.textContent.includes('Private')`),
        false,
      )
      if (scenario !== 'random')
        assert.equal(
          await evaluate(`!!document.querySelector('.storage-warning')`),
          true,
        )
      await inspect(`320x568-${scenario}-recovery`)
      await evaluate(
        `sessionStorage.removeItem('mathPractice.failureScenario')`,
      )
      await navigate('/')
      // The successful random-fallback run saved a live card. Finish it before
      // the next scenario; blocked/full scenarios have only in-memory practice.
      if (scenario === 'random') {
        await click('.session-recovery-notice a')
        await until(
          () => evaluate(`location.pathname === '/practice/session'`),
          'recovered fallback session',
        )
        await click('nav a[href="/"]')
        await until(
          () => evaluate(`!!document.querySelector('dialog[open]')`),
          'leave prompt',
        )
        await evaluate(
          `Array.from(document.querySelectorAll('dialog button')).find(el => el.textContent.trim() === 'End Session and Leave').click()`,
        )
        await until(
          () => evaluate(`location.pathname === '/'`),
          'finished fallback practice',
        )
      }
    }
    assert.deepEqual(dialogErrors, [])
    console.log(
      '✓ Corrupted categories, preserved unrelated data, missing sessions, safe home navigation, invalid randomness, validated fallback cards, denied storage, quota failures, and mobile error layouts',
    )
  } finally {
    socket.removeEventListener('message', dismissUnload)
  }
}
