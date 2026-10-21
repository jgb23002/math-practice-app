import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function checkAccessibility({
  send,
  evaluate,
  until,
  click,
  inspect,
  socket,
  origin,
}) {
  const reportPath = resolve(
    process.env.ACCESSIBILITY_REPORT_PATH ??
      '/tmp/math-practice-accessibility.json',
  )
  const axeSource = await readFile(
    fileURLToPath(
      new URL('../node_modules/axe-core/axe.min.js', import.meta.url),
    ),
    'utf8',
  )
  const report = {
    startedAt: new Date().toISOString(),
    browser: await send('Browser.getVersion'),
    axeVersion: null,
    scans: [],
    checks: [],
    nativeDialogs: [],
    failures: [],
    unexecuted: [
      'Human screen-reader speech (VoiceOver/NVDA)',
      'Human usability and visual review',
      'Operating-system font/display scaling',
      'Safari, Firefox, Edge and physical devices',
    ],
  }
  const confirmAnswers = []
  const onMessage = (event) => {
    const message = JSON.parse(event.data)
    if (message.method !== 'Page.javascriptDialogOpening') return
    const type = message.params.type
    const accept = type === 'beforeunload' ? true : confirmAnswers.shift()
    report.nativeDialogs.push({ type, accept: accept ?? false })
    if (accept === undefined)
      report.failures.push(`Unexpected native ${type} dialog`)
    void send('Page.handleJavaScriptDialog', { accept: accept ?? false }).catch(
      (error) => report.failures.push(error.message),
    )
  }
  socket.addEventListener('message', onMessage)
  async function press(key, shift = false) {
    const special = {
      Tab: ['Tab', 9],
      Enter: ['Enter', 13],
      ' ': ['Space', 32],
      ArrowLeft: ['ArrowLeft', 37],
      ArrowRight: ['ArrowRight', 39],
      Escape: ['Escape', 27],
    }
    const [code, windowsVirtualKeyCode] = special[key] ?? [
      `Digit${key}`,
      key.charCodeAt(0),
    ]
    const text =
      key === 'Enter' ? '\r' : key === ' ' || /^\d$/.test(key) ? key : undefined
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key,
      code,
      windowsVirtualKeyCode,
      modifiers: shift ? 8 : 0,
      ...(text ? { text } : {}),
    })
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key,
      code,
      windowsVirtualKeyCode,
      modifiers: shift ? 8 : 0,
    })
  }
  async function tabTo(selector, shift = false) {
    for (let count = 0; count < 100; count++) {
      if (
        await evaluate(
          `document.activeElement?.matches(${JSON.stringify(selector)})`,
        )
      )
        return
      await press('Tab', shift)
    }
    throw new Error(
      `Keyboard could not reach ${selector}; focused=${await evaluate('document.activeElement?.outerHTML')}`,
    )
  }
  async function navigate(url) {
    await evaluate('window.__previousA11yDocument = true')
    await send('Page.navigate', { url })
    await until(
      () =>
        evaluate(
          `!window.__previousA11yDocument && document.readyState === 'complete'`,
        ),
      url,
    )
    if (url.startsWith(origin))
      await until(
        () =>
          evaluate(`!!document.querySelector('main h1:not([data-loading])')`),
        'application rendered',
      )
  }
  async function page(path) {
    await navigate(`${origin}${path}`)
  }
  async function settled() {
    await until(
      () =>
        evaluate(
          `document.getAnimations().every(animation => animation.playState !== 'running')`,
        ),
      'visual transitions settled',
    )
  }
  async function scan(label) {
    await settled()
    await inspect(label)
    if (!(await evaluate(`typeof window.axe?.run === 'function'`)))
      await evaluate(axeSource)
    const result = await evaluate(`(async () => {
      const result = await axe.run(document, {runOnly: {type:'tag', values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}});
      const compact = items => items.map(item => ({id:item.id, impact:item.impact, help:item.help, helpUrl:item.helpUrl, nodes:item.nodes.map(node => ({target:node.target, html:node.html, summary:node.failureSummary, checks:[...node.any,...node.all,...node.none].map(check => ({id:check.id, message:check.message, data:check.data}))}))}));
      return {version:axe.version, width:innerWidth, ratio:devicePixelRatio, violations:compact(result.violations), incomplete:compact(result.incomplete), passedRules:result.passes.length};
    })()`)
    report.axeVersion = result.version
    report.scans.push({ label, ...result })
    console.log(
      `✓ axe ${label}: ${result.violations.length} violations, ${result.incomplete.length} incomplete rules`,
    )
    assert.deepEqual(
      result.violations,
      [],
      `${label}: accessibility violations\n${JSON.stringify(result.violations, null, 2)}\nFull report: ${reportPath}`,
    )
  }
  async function accessibleButtons() {
    const { nodes } = await send('Accessibility.getFullAXTree')
    return nodes
      .filter((node) => !node.ignored && node.role?.value === 'button')
      .map((node) => node.name?.value)
  }
  async function setZoom(factor) {
    await navigate('chrome://settings/appearance')
    await until(
      () =>
        evaluate(
          `typeof chrome.settingsPrivate?.setDefaultZoom === 'function'`,
        ),
      'Chrome native zoom preference',
    )
    const error = await evaluate(
      `new Promise(resolve => chrome.settingsPrivate.setDefaultZoom(${factor}, () => resolve(chrome.runtime.lastError?.message ?? null)))`,
    )
    assert.equal(error, null, 'Native browser zoom preference failed')
  }
  try {
    await send('Accessibility.enable')
    const baseline = await evaluate(
      `({width:innerWidth, ratio:devicePixelRatio})`,
    )
    await scan('desktop-home')
    // This entire five-card journey uses native Tab, arrows, digits, Space and
    // Enter. No click(), focus(), injected dispatchEvent, or forced form values.
    await tabTo('main a[href="/practice/setup"]')
    await press('Enter')
    await until(
      () => evaluate(`location.pathname === '/practice/setup'`),
      'keyboard setup navigation',
    )
    await tabTo('input[name="operations"][value="addition"]')
    await press(' ')
    await tabTo('input[name="difficulty"][value="1"]')
    await press('ArrowRight')
    assert.equal(
      await evaluate(
        `document.querySelector('input[name="difficulty"]:checked').value`,
      ),
      '2',
    )
    await press('ArrowLeft')
    await tabTo('input[name="sessionLength"][value="10"]')
    await press('ArrowLeft')
    assert.equal(
      await evaluate(
        `document.querySelector('input[name="sessionLength"]:checked').value`,
      ),
      '5',
    )
    await scan('keyboard-configured-setup')
    await tabTo('.setup-start')
    await press('Enter')
    await until(
      () => evaluate(`!!document.querySelector('.question-card')`),
      'keyboard session start',
    )
    const motion = [
      [true, false],
      [false, false],
      [true, true],
      [false, true],
      [true, false],
    ]
    for (const [index, [animation, reduced]] of motion.entries()) {
      await send('Emulation.setEmulatedMedia', {
        features: [
          {
            name: 'prefers-reduced-motion',
            value: reduced ? 'reduce' : 'no-preference',
          },
        ],
      })
      if (
        await evaluate(
          `document.querySelector('.practice-page__animation-setting input').checked !== ${animation}`,
        )
      ) {
        await tabTo('.practice-page__animation-setting input')
        await press(' ')
      }
      await until(
        () =>
          evaluate(
            `document.querySelector('.question-card').classList.contains('question-card--static') === ${!animation || reduced}`,
          ),
        'motion policy applied',
      )
      assert.equal(
        await evaluate(
          `getComputedStyle(document.querySelector('.question-card__turner')).transitionDuration`,
        ),
        animation && !reduced ? '0.56s' : '0s',
      )
      const names = await accessibleButtons()
      assert.equal(names.filter((name) => /^Answer \d+$/.test(name)).length, 4)
      assert.equal(
        names.includes('I Got It Right'),
        false,
        'Unrevealed controls must not be exposed',
      )
      await scan(
        `keyboard-card-${index + 1}-front-animation-${animation}-reduced-${reduced}`,
      )
      await tabTo('.answer-choice:not(:disabled)')
      const digit = String((index % 4) + 1)
      await press(digit)
      assert.equal(
        await evaluate(
          `document.querySelectorAll('.answer-choice')[${Number(digit) - 1}].getAttribute('aria-pressed')`,
        ),
        'true',
      )
      assert.equal(
        await evaluate(
          `JSON.parse(localStorage.getItem('mathPractice.attempts')).length`,
        ),
        index,
        'Selection cannot record a result',
      )
      await tabTo('.question-card__flip')
      await press('Enter')
      await until(
        () =>
          evaluate(
            `document.querySelector('.question-card').dataset.flipped === 'true'`,
          ),
        'keyboard card reveal',
      )
      assert.equal(
        await evaluate(
          `JSON.parse(localStorage.getItem('mathPractice.attempts')).length`,
        ),
        index,
        'Reveal cannot record a result',
      )
      const revealed = await accessibleButtons()
      assert.equal(
        revealed.some((name) => /^Answer \d+$/.test(name)),
        false,
      )
      assert.equal(
        revealed.includes('I Got It Right') &&
          revealed.includes('I Got It Wrong'),
        true,
      )
      await scan(
        `keyboard-card-${index + 1}-back-animation-${animation}-reduced-${reduced}`,
      )
      await tabTo(
        index % 2 === 0
          ? '.question-card__report--right'
          : '.question-card__report--wrong',
      )
      await press(' ')
      await until(
        () =>
          evaluate(
            `JSON.parse(localStorage.getItem('mathPractice.attempts')).length === ${index + 1}`,
          ),
        'keyboard self-report accepted',
      )
    }
    await until(
      () =>
        evaluate(
          `location.pathname === '/practice/summary' && !!document.querySelector('.session-summary__accuracy strong')`,
        ),
      'keyboard session complete',
    )
    assert.equal(
      await evaluate(
        `document.querySelector('.session-summary__accuracy strong').textContent`,
      ),
      '60%',
    )
    await scan('keyboard-complete-summary')
    report.checks.push(
      {
        name: 'Complete five-question session using native keyboard input only',
        status: 'passed',
        attempted: 5,
        correct: 3,
        incorrect: 2,
      },
      {
        name: 'All four app-animation / reduced-motion combinations; hidden-face AX controls',
        status: 'passed',
      },
    )
    await tabTo('main a[href="/statistics"]')
    await press('Enter')
    await until(
      () =>
        evaluate(
          `location.pathname === '/statistics' && !!document.querySelector('.statistics-page')`,
        ),
      'keyboard statistics navigation',
    )
    await scan('keyboard-populated-statistics')
    await tabTo('.statistics-reset__button')
    const saved = await evaluate('JSON.stringify(localStorage)')
    confirmAnswers.push(false)
    await press('Enter')
    await until(
      () =>
        report.nativeDialogs.some(
          (item) => item.type === 'confirm' && item.accept === false,
        ),
      'native reset cancellation',
    )
    assert.equal(await evaluate('JSON.stringify(localStorage)'), saved)
    confirmAnswers.push(true)
    await press('Enter')
    await until(
      () =>
        evaluate(
          `JSON.parse(localStorage.getItem('mathPractice.attempts')).length === 0`,
        ),
      'native reset confirmation',
    )
    await scan('keyboard-reset-statistics')
    report.checks.push({
      name: 'Native keyboard reset cancellation/confirmation',
      status: 'passed',
    })

    await evaluate(`(async () => {
      const {createStatisticsProgress} = await import('/src/test/statisticsFixtures.ts');
      const {createMistakePattern} = await import('/src/test/mistakeFixtures.ts');
      const {saveStoredProgress} = await import('/src/services/progressPersistence.ts');
      const {createJsonStorage} = await import('/src/services/storage.ts');
      const progress = createStatisticsProgress();
      progress.settings.soundEnabled = false; progress.settings.animationsEnabled = true;
      progress.settings.defaultOperations = ['addition','subtraction','multiplication','division'];
      progress.settings.defaultSessionLength = 5;
      progress.mistakePatterns = [createMistakePattern({incorrectCount:7, similarCorrectCount:1}), createMistakePattern({id:'mastered',firstOperand:2,correctAnswer:6,mastered:true,similarCorrectCount:3})];
      if (!saveStoredProgress(createJsonStorage(), progress)) throw new Error('Invalid accessibility fixtures');
    })()`)
    await page('/statistics')
    await scan('desktop-all-operation-difficulty-history-active-patterns')
    await click('.mistake-statistics__filters button:nth-child(2)')
    await scan('desktop-mastered-patterns')
    await setZoom(2)
    await page('/')
    const zoomed = await evaluate(`({width:innerWidth,ratio:devicePixelRatio})`)
    assert.equal(
      zoomed.ratio,
      baseline.ratio * 2,
      'Native 200% browser zoom doubles the pixel ratio',
    )
    assert.ok(
      Math.abs(zoomed.width * 2 - baseline.width) <= 2,
      'Native zoom halves the CSS viewport',
    )
    for (const path of [
      '/',
      '/practice/setup',
      '/settings',
      '/statistics',
      '/unknown',
    ]) {
      await page(path)
      await scan(`native-200-percent-${path}`)
    }
    await page('/practice/setup')
    await click('.setup-start')
    await until(
      () => evaluate(`!!document.querySelector('.question-card')`),
      'zoomed card',
    )
    await scan('native-200-percent-card-front')
    for (let index = 0; index < 5; index++) {
      await click('.answer-choice')
      await click('.question-card__flip')
      if (index === 0) await scan('native-200-percent-card-back')
      await click('.question-card__report--right')
    }
    await until(
      () =>
        evaluate(
          `location.pathname === '/practice/summary' && !!document.querySelector('.session-summary__accuracy strong')`,
        ),
      'zoomed completion',
    )
    await scan('native-200-percent-summary')
    report.checks.push({
      name: 'Genuine Chrome 200% browser zoom, not pinch/CSS scaling',
      status: 'passed',
      baseline,
      zoomed,
    })
    await setZoom(1)
    await page('/')
    assert.equal(await evaluate('devicePixelRatio'), baseline.ratio)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 320,
      height: 568,
      deviceScaleFactor: 1,
      mobile: true,
    })
    for (const path of [
      '/',
      '/practice/setup',
      '/settings',
      '/statistics',
      '/unknown',
      '/practice/session',
    ]) {
      await page(path)
      await scan(`mobile-320-${path}`)
    }
    await page('/practice/setup')
    await click('.setup-start')
    await until(
      () => evaluate(`!!document.querySelector('.question-card')`),
      'mobile card',
    )
    await scan('mobile-320-card-front')
    await click('.answer-choice')
    await click('.question-card__flip')
    await scan('mobile-320-card-back')
    await click('nav a[href="/settings"]')
    await until(
      () => evaluate(`!!document.querySelector('dialog[open]')`),
      'mobile leave confirmation',
    )
    await scan('mobile-320-leave-dialog')
    await click('dialog button:nth-of-type(2)')
    await until(
      () => evaluate(`location.pathname === '/settings'`),
      'paused practice settings',
    )
    await scan('mobile-320-paused-practice-settings')
    // Inject after the old document's beforeunload checkpoint, before the new
    // provider reads storage; otherwise the legitimate exit save repairs it.
    const injection = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => { const snapshot = JSON.parse(localStorage.getItem('mathPractice.activeSession')); Object.assign(snapshot.session,{currentQuestion:null,selectedAnswer:null,isAnswerRevealed:false,questionError:'Technical stack must not appear'}); localStorage.setItem('mathPractice.activeSession',JSON.stringify(snapshot)); })()`,
    })
    await page('/practice/session')
    await send('Page.removeScriptToEvaluateOnNewDocument', {
      identifier: injection.identifier,
    })
    assert.equal(
      await evaluate(`!!document.querySelector('.error-message button')`),
      true,
      'Generation error UI must actually be present',
    )
    await scan('mobile-320-friendly-question-error')
    assert.equal(
      await evaluate(`document.body.textContent.includes('Technical stack')`),
      false,
    )
    await click('.error-message button')
    await until(
      () => evaluate(`!!document.querySelector('.question-card')`),
      'retry after generation error',
    )
    await scan('mobile-320-recovered-card')
    assert.deepEqual(report.failures, [])
    const incomplete = report.scans.filter((item) => item.incomplete.length > 0)
    console.log(
      `Passed ${report.scans.length} axe scans; ${incomplete.length} scans have incomplete results requiring human review. Report: ${reportPath}`,
    )
  } catch (error) {
    report.failures.push(error.message)
    throw error
  } finally {
    report.finishedAt = new Date().toISOString()
    await mkdir(dirname(reportPath), { recursive: true })
    await writeFile(reportPath, JSON.stringify(report, null, 2))
    socket.removeEventListener('message', onMessage)
  }
}
