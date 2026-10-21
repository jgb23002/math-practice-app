import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { constants } from 'node:fs'
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkSessionRecovery } from './session-recovery-checks.mjs'
import { checkErrorRecovery } from './error-recovery-checks.mjs'
import { checkAccessibility } from './accessibility-checks.mjs'
import { checkBrowserPersistence } from './browser-persistence-checks.mjs'
import { checkPerformance } from './performance-checks.mjs'
import { checkRelease } from './release-checks.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const recoveryOnly = process.env.SESSION_RECOVERY_ONLY === '1'
const errorsOnly = process.env.ERROR_RECOVERY_ONLY === '1'
const accessibilityOnly = process.env.ACCESSIBILITY_ONLY === '1'
const persistenceOnly = process.env.BROWSER_PERSISTENCE_ONLY === '1'
const performanceOnly = process.env.PERFORMANCE_ONLY === '1'
const releaseOnly = process.env.RELEASE_ONLY === '1'
const screenshotDir = process.env.RESPONSIVE_SCREENSHOT_DIR
const sizes = [
  [1440, 900],
  [1280, 800],
  [1024, 768],
  [768, 1024],
  [820, 1180],
  [1180, 820],
  [320, 568],
  [360, 800],
  [375, 812],
  [390, 844],
  [430, 932],
  [844, 390],
]
let browser,
  server,
  socket,
  profile,
  currentCase = 'starting'
let logs = '',
  checks = 0,
  nextId = 0
const pending = new Map()
const browserErrors = []
const productionRequests = []
const productionConsoleErrors = []
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function until(read, label) {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    try {
      const value = await read()
      if (value) return value
    } catch {
      /* Still starting/rendering. */
    }
    await pause(50)
  }
  throw new Error(`Timed out: ${label}`)
}

async function chromeBinary() {
  for (const path of [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean)) {
    try {
      await access(path, constants.X_OK)
      return path
    } catch {
      /* Try the next installation. */
    }
  }
  throw new Error(
    'Install Chrome/Chromium or set CHROME_BIN to its executable. No browser is downloaded by this check.',
  )
}

function launch(binary, args) {
  const child = spawn(binary, args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const append = (data) => {
    logs = (logs + data.toString()).slice(-6000)
  }
  child.stdout.on('data', append)
  child.stderr.on('data', append)
  child.on('error', (error) => append(error.message))
  return child
}

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId
    const timeout = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`Browser command timed out: ${method}`))
    }, 15000)
    pending.set(id, { resolve, reject, timeout })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  })
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text,
    )
  return result.result.value
}

async function route(path) {
  await evaluate(
    `history.pushState({}, '', ${JSON.stringify(path)}); dispatchEvent(new PopStateEvent('popstate'))`,
  )
  await until(
    () =>
      evaluate(
        `location.pathname === ${JSON.stringify(path)} && !!document.querySelector('main h1:not([data-loading])')`,
      ),
    path,
  )
  await evaluate(
    'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
  )
}

async function click(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
}

async function inspect(label) {
  currentCase = label
  const result = await evaluate(`(() => {
    const visible = el => !el.closest('[inert], .visually-hidden, .math-friends, .skip-link') && el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden';
    const describe = el => ({ tag: el.tagName, class: el.getAttribute('class'), text: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 90) });
    const overflow = Array.from(document.querySelectorAll('main *, header *, footer *, dialog, dialog *, .session-recovery-notice, .session-recovery-notice *')).filter(el => visible(el) && getComputedStyle(el).display !== 'inline' && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2).map(describe);
    const smallTargets = Array.from(document.querySelectorAll('button, a[href], input, select')).filter(el => visible(el) && !el.disabled).filter(el => {
      const rect = (el.closest('label') ?? el).getBoundingClientRect();
      return rect.width < 48 || rect.height < 48;
    }).map(describe);
    const overlappingMetrics = Array.from(document.querySelectorAll('dl > div')).filter(el => {
      const label = el.querySelector('dt'), value = el.querySelector('dd');
      if (!label || !value || !visible(label) || !visible(value)) return false;
      const a = label.getBoundingClientRect(), b = value.getBoundingClientRect();
      return a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    }).map(describe);
    const card = document.querySelector('.question-card');
    const rect = card?.getBoundingClientRect();
    const equation = document.querySelector('.question-card__equation');
    return { width: innerWidth, pageWidth: document.documentElement.scrollWidth, overflow, smallTargets, overlappingMetrics,
      question: equation?.textContent, choices: Array.from(document.querySelectorAll('.answer-choice'), el => el.getAttribute('aria-label')),
      cardOffset: rect ? Math.abs(rect.left + rect.width / 2 - innerWidth / 2) : 0,
      questionFont: equation ? parseFloat(getComputedStyle(equation).fontSize) : 0 };
  })()`)
  assert.ok(
    result.pageWidth <= result.width + 1,
    `${label}: horizontal scrolling\n${JSON.stringify(result, null, 2)}`,
  )
  assert.deepEqual(
    result.overflow,
    [],
    `${label}: clipped/overflowing content\n${JSON.stringify(result, null, 2)}`,
  )
  assert.deepEqual(
    result.smallTargets,
    [],
    `${label}: touch targets smaller than 48px`,
  )
  assert.deepEqual(
    result.overlappingMetrics,
    [],
    `${label}: labels overlap their values`,
  )
  if (result.question) {
    assert.ok(result.cardOffset < 1, `${label}: card is not centered`)
    assert.ok(result.questionFont >= 32, `${label}: arithmetic is too small`)
  }
  checks++
  if (
    screenshotDir &&
    /home|card-front|card-back|statistics-active|summary|leave-dialog/.test(
      label,
    )
  ) {
    await mkdir(resolve(screenshotDir), { recursive: true })
    const { cssContentSize } = await send('Page.getLayoutMetrics')
    const { data } = await send('Page.captureScreenshot', {
      captureBeyondViewport: true,
      clip: {
        x: 0,
        y: 0,
        width: cssContentSize.width,
        height: cssContentSize.height,
        scale: 1,
      },
    })
    await writeFile(
      join(resolve(screenshotDir), `${label}.png`),
      Buffer.from(data, 'base64'),
    )
  }
}

async function stop(child) {
  if (!child || child.exitCode !== null) return
  const closed = new Promise((resolve) => child.once('close', resolve))
  child.kill('SIGTERM')
  await Promise.race([closed, pause(3000)])
  if (child.exitCode === null) {
    child.kill('SIGKILL')
    await closed
  }
}

async function startBrowser(binary) {
  await rm(join(profile, 'DevToolsActivePort'), { force: true })
  browser = launch(binary, [
    '--headless',
    ...(accessibilityOnly ? ['--window-size=1280,900'] : []),
    '--mute-audio',
    '--disable-background-networking',
    '--disable-sync',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ])
  const debugPort = await until(
    async () =>
      (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split(
        '\n',
      )[0],
    'Chrome debugging port',
  )
  const targets = await (
    await fetch(`http://127.0.0.1:${debugPort}/json/list`)
  ).json()
  socket = new WebSocket(
    targets.find((target) => target.type === 'page').webSocketDebuggerUrl,
  )
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (releaseOnly && message.method === 'Network.requestWillBeSent')
      productionRequests.push({
        url: message.params.request.url,
        method: message.params.request.method,
        type: message.params.type,
      })
    if (
      releaseOnly &&
      message.method === 'Runtime.consoleAPICalled' &&
      message.params.type === 'error'
    )
      productionConsoleErrors.push('console.error')
    if (
      releaseOnly &&
      message.method === 'Log.entryAdded' &&
      message.params.entry.level === 'error'
    )
      productionConsoleErrors.push({
        text: message.params.entry.text,
        url: message.params.entry.url,
      })
    if (message.method === 'Runtime.exceptionThrown')
      browserErrors.push(message.params.exceptionDetails.text)
    const request = pending.get(message.id)
    if (!request) return
    clearTimeout(request.timeout)
    pending.delete(message.id)
    if (message.error) request.reject(new Error(JSON.stringify(message.error)))
    else request.resolve(message.result)
  })
  await send('Page.enable')
  await send('Runtime.enable')
  if (releaseOnly) {
    await send('Network.enable')
    await send('Log.enable')
  }
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `let feedbackSeed = 17017; Math.random = () => ((feedbackSeed = (Math.imul(1664525, feedbackSeed) + 1013904223) >>> 0) / 4294967296)`,
  })
}

try {
  const binary = await chromeBinary()
  profile = await mkdtemp(join(tmpdir(), 'math-practice-responsive-'))
  const listener = createServer()
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve))
  const port = listener.address().port
  await new Promise((resolve) => listener.close(resolve))
  const origin = `http://127.0.0.1:${port}`
  server = launch(process.execPath, [
    join(root, 'node_modules/vite/bin/vite.js'),
    ...(performanceOnly || releaseOnly ? ['preview'] : []),
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ])
  await until(async () => (await fetch(origin)).ok, 'local Vite server')
  await startBrowser(binary)
  async function restartBrowser() {
    const previous = browser,
      previousSocket = socket
    await send('Browser.close')
    await until(
      () => previous.exitCode !== null || previous.signalCode !== null,
      'clean Chrome process exit',
    )
    previousSocket.close()
    await startBrowser(binary)
    return socket
  }
  await send('Page.navigate', { url: origin })
  await until(
    () => evaluate(`!!document.querySelector('main h1:not([data-loading])')`),
    'application',
  )
  if (releaseOnly) {
    await checkRelease({
      send,
      evaluate,
      until,
      click,
      inspect,
      socket,
      origin,
    })
    await checkBrowserPersistence({
      send,
      evaluate,
      until,
      click,
      inspect,
      socket,
      origin,
      restartBrowser,
    })
    assert.ok(productionRequests.length > 0)
    assert.deepEqual(
      productionRequests.filter(
        (request) =>
          (new URL(request.url).protocol !== 'data:' &&
            new URL(request.url).origin !== origin) ||
          !['GET', 'HEAD'].includes(request.method) ||
          ['XHR', 'Fetch', 'WebSocket', 'EventSource', 'Ping'].includes(
            request.type,
          ),
      ),
      [],
      'Production flows must request only same-origin static content, without uploads or telemetry',
    )
    assert.deepEqual(
      productionConsoleErrors,
      [],
      'No production console errors',
    )
    console.log(
      `✓ ${productionRequests.length} same-origin/embedded static requests; no observed API uploads, third-party requests, cookies, or console errors`,
    )
  } else if (performanceOnly) {
    await checkPerformance({ send, evaluate, until, click, origin, socket })
  } else if (persistenceOnly) {
    await checkBrowserPersistence({
      send,
      evaluate,
      until,
      click,
      inspect,
      socket,
      origin,
      restartBrowser,
    })
  } else if (accessibilityOnly) {
    await checkAccessibility({
      send,
      evaluate,
      until,
      click,
      inspect,
      socket,
      origin,
    })
  } else if (errorsOnly) {
    await checkErrorRecovery({
      send,
      evaluate,
      until,
      click,
      inspect,
      socket,
      origin,
    })
  } else if (recoveryOnly) {
    await checkSessionRecovery({
      send,
      evaluate,
      until,
      click,
      inspect,
      socket,
      origin,
    })
  } else {
    await route('/statistics')
    await inspect('empty-statistics')
    await evaluate(`(async () => {
    const { createStatisticsProgress } = await import('/src/test/statisticsFixtures.ts');
    const { createMistakePattern } = await import('/src/test/mistakeFixtures.ts');
    const { saveStoredProgress } = await import('/src/services/progressPersistence.ts');
    const { createJsonStorage } = await import('/src/services/storage.ts');
    const progress = createStatisticsProgress();
    progress.settings.soundEnabled = false;
    progress.settings.defaultOperations = ['addition','subtraction','multiplication','division'];
    progress.settings.defaultSessionLength = 5;
    progress.mistakePatterns = [createMistakePattern({incorrectCount: 9, similarCorrectCount: 2}), createMistakePattern({id:'mastered', firstOperand:4, secondOperand:3, mastered:true, similarCorrectCount:3})];
    if (!saveStoredProgress(createJsonStorage(), progress)) throw new Error('Invalid responsive fixtures');
  })()`)
    await send('Page.reload')
    await until(
      () =>
        evaluate(`document.querySelectorAll('.mistake-pattern').length === 1`),
      'populated statistics',
    )

    for (const [width, height] of sizes) {
      const size = `${width}x${height}`
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 600,
        screenOrientation: {
          type: width > height ? 'landscapePrimary' : 'portraitPrimary',
          angle: width > height ? 90 : 0,
        },
      })
      await send('Emulation.setTouchEmulationEnabled', {
        enabled: width < 1200,
        maxTouchPoints: 5,
      })
      for (const [path, label] of [
        ['/', 'home'],
        ['/practice/setup', 'setup'],
        ['/settings', 'settings'],
        ['/statistics', 'statistics-active'],
        ['/not-a-page', 'fallback'],
      ]) {
        await route(path)
        await inspect(`${size}-${label}`)
      }
      await route('/statistics')
      await click('.mistake-statistics__filters button:nth-child(2)')
      await inspect(`${size}-statistics-mastered`)
      await route('/practice/setup')
      await click('.setup-start')
      await until(
        () =>
          evaluate(
            `location.pathname === '/practice/session' && !!document.querySelector('.question-card')`,
          ),
        'new session',
      )
      await inspect(`${size}-card-front`)
      if (width <= 420)
        assert.equal(
          await evaluate(
            `new Set(Array.from(document.querySelectorAll('.answer-choice'), el => Math.round(el.getBoundingClientRect().left))).size`,
          ),
          1,
          `${size}: answer choices should stack`,
        )
      const before = await evaluate(
        `JSON.parse(localStorage.getItem('mathPractice.attempts')).length`,
      )
      await click('.answer-choice')
      await inspect(`${size}-selected-answer`)
      await click('.question-card__flip')
      await inspect(`${size}-card-back`)
      assert.equal(
        await evaluate(
          `JSON.parse(localStorage.getItem('mathPractice.attempts')).length`,
        ),
        before,
        'Selecting/revealing must not record results',
      )
      // Rotate a revealed card: CSS changes must not reset it or write progress.
      const selected = await evaluate(
        `document.querySelector('.question-card__answers > div:last-child dd').textContent`,
      )
      const stored = await evaluate('JSON.stringify(localStorage)')
      await send('Emulation.setDeviceMetricsOverride', {
        width: height,
        height: width,
        deviceScaleFactor: 1,
        mobile: width < 600,
      })
      assert.equal(
        await evaluate(
          `document.querySelector('.question-card').dataset.flipped`,
        ),
        'true',
      )
      assert.equal(
        await evaluate(
          `document.querySelector('.question-card__answers > div:last-child dd').textContent`,
        ),
        selected,
      )
      assert.equal(
        await evaluate('JSON.stringify(localStorage)'),
        stored,
        'Rotation must not write progress',
      )
      await inspect(`${size}-rotated-card`)
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 600,
      })
      for (let index = 0; index < 5; index++) {
        if (index > 0) {
          await click('.answer-choice')
          await click('.question-card__flip')
        }
        await click(
          index % 2
            ? '.question-card__report--wrong'
            : '.question-card__report--right',
        )
      }
      await until(
        () => evaluate(`location.pathname === '/practice/summary'`),
        'session summary',
      )
      await inspect(`${size}-summary`)
      assert.equal(
        await evaluate(
          `JSON.parse(localStorage.getItem('mathPractice.attempts')).length`,
        ),
        before + 5,
      )
      assert.equal(
        await evaluate(
          `document.querySelector('.session-summary__accuracy strong').textContent`,
        ),
        '60%',
      )
      console.log(
        `✓ ${size}: layout, touch targets, rotation, and complete session`,
      )
    }
  }
  assert.deepEqual(browserErrors, [])
  if (releaseOnly)
    console.log(
      `Passed production release checks and ${checks} layouts. Netlify edge behavior and other browser engines require separate verification.`,
    )
  else if (performanceOnly)
    console.log(
      'Passed production performance, large-history recovery, and lazy-loading checks. An isolated browser profile was used.',
    )
  else
    console.log(
      `Passed ${checks} ${persistenceOnly ? 'browser persistence layouts and clean process restart checks' : accessibilityOnly ? 'accessibility layouts and automated Chrome checks' : errorsOnly ? 'error recovery layouts and injected browser failures' : recoveryOnly ? 'recovery dialog layouts and native browser checks' : 'responsive states'}. Tests used an isolated browser profile; existing application data was not accessed.`,
    )
} catch (error) {
  console.error(
    `${releaseOnly ? 'Release' : performanceOnly ? 'Performance' : persistenceOnly ? 'Browser persistence' : accessibilityOnly ? 'Accessibility' : errorsOnly ? 'Error recovery' : recoveryOnly ? 'Session recovery' : 'Responsive'} check failed (${currentCase}): ${error.stack ?? error}\n${logs.slice(-1500)}`,
  )
  process.exitCode = 1
} finally {
  socket?.close()
  for (const request of pending.values()) clearTimeout(request.timeout)
  await stop(browser)
  await stop(server)
  if (profile)
    await rm(profile, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    })
}
