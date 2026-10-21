import assert from 'node:assert/strict'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { largeHistoryFixture } from '../src/test/largeHistoryFixture.ts'

export async function checkPerformance({
  send,
  evaluate,
  until,
  click,
  origin,
  socket,
}) {
  socket.addEventListener('message', (event) => {
    if (JSON.parse(event.data).method === 'Page.javascriptDialogOpening')
      void send('Page.handleJavaScriptDialog', { accept: true })
  })
  const { attempts, sessions } = largeHistoryFixture()
  const totals = () => ({ attempted: 0, correct: 0, incorrect: 0 })
  const statistics = { ...totals(), byOperation: {}, byDifficulty: {} }
  for (const operation of [
    'addition',
    'subtraction',
    'multiplication',
    'division',
  ])
    statistics.byOperation[operation] = totals()
  for (const level of [1, 2, 3, 4]) statistics.byDifficulty[level] = totals()
  for (const attempt of attempts)
    for (const group of [
      statistics,
      statistics.byOperation[attempt.operation],
      statistics.byDifficulty[attempt.difficulty],
    ]) {
      group.attempted++
      group[attempt.selfReportedCorrect ? 'correct' : 'incorrect']++
    }
  const progress = {
    settings: {
      soundEnabled: false,
      animationsEnabled: false,
      showExplanations: true,
      feedbackEnabled: true,
      defaultSessionLength: 5,
      defaultDifficulty: 1,
      defaultOperations: ['addition'],
      masteryThreshold: 3,
    },
    attempts,
    sessions,
    statistics,
    mistakePatterns: [],
    version: { version: 1 },
  }
  const bytes = await evaluate(`(() => {
    localStorage.clear();
    for (const [key, value] of Object.entries(${JSON.stringify(progress)})) localStorage.setItem('mathPractice.' + key, JSON.stringify(value));
    return Object.keys(localStorage).reduce((sum, key) => sum + 2 * (key.length + localStorage.getItem(key).length), 0);
  })()`)
  await send('Network.enable')
  await send('Network.setCacheDisabled', { cacheDisabled: true })
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `new MutationObserver((_, observer) => { if (document.querySelector('main h1:not([data-loading])')) { window.__readyAt = performance.now(); observer.disconnect(); } }).observe(document, { childList: true, subtree: true });`,
  })
  const loads = []
  let initialResources
  for (const path of ['/', '/statistics']) {
    for (const rate of [1, 4]) {
      await send('Emulation.setCPUThrottlingRate', { rate })
      const samples = []
      for (let run = 0; run < 5; run++) {
        const previousTimeOrigin = await evaluate('performance.timeOrigin')
        await send('Page.navigate', { url: origin + path })
        try {
          await until(
            () =>
              evaluate(
                `performance.timeOrigin !== ${previousTimeOrigin} && !!window.__readyAt && ${path === '/statistics' ? '!!document.querySelector(".session-history")' : '!!document.querySelector(".home-hero")'}`,
              ),
            'large statistics',
          )
        } catch (error) {
          console.log(
            await evaluate(
              '({url:location.href, ready:window.__readyAt, text:document.body.innerText})',
            ),
          )
          throw error
        }
        samples.push(
          await evaluate(
            '({ readyMs: window.__readyAt, sessionCards: document.querySelectorAll(".session-history > li").length, attempted: JSON.parse(localStorage.getItem("mathPractice.statistics")).attempted })',
          ),
        )
      }
      loads.push({ path, cpuRate: rate, samples })
      if (path === '/')
        initialResources = await evaluate(
          'performance.getEntriesByType("resource").map(entry => ({ name: new URL(entry.name).pathname, bytes: entry.encodedBodySize }))',
        )
    }
  }
  await send('Page.navigate', { url: origin + '/practice/setup' })
  await until(
    () => evaluate('!!document.querySelector(".setup-start")'),
    'setup',
  )
  await click('.setup-start')
  await until(
    () => evaluate('!!document.querySelector(".question-card")'),
    'session',
  )
  await evaluate(`(() => {
    window.__writes = [];
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) { const start = performance.now(); const result = original.call(this, key, value); window.__writes.push({ key, chars: value.length, ms: performance.now() - start }); return result; };
  })()`)
  const measurements = { samples: [] }
  for (let index = 0; index < 5; index++) {
    const sample = {}
    sample.selectMs = await evaluate(
      `(() => { const start = performance.now(); document.querySelector('.answer-choice').click(); return performance.now() - start; })()`,
    )
    await until(
      () =>
        evaluate('!document.querySelector(".question-card__flip").disabled'),
      'selected answer',
    )
    sample.revealMs = await evaluate(
      `(() => { const start = performance.now(); document.querySelector('.question-card__flip').click(); return performance.now() - start; })()`,
    )
    measurements.samples.push(sample)
    if (index < 4) {
      const before = await evaluate(
        'JSON.parse(localStorage.getItem("mathPractice.attempts")).length',
      )
      sample.reportMs = await evaluate(
        `(() => { const start = performance.now(); document.querySelector('.question-card__report--right').click(); return performance.now() - start; })()`,
      )
      await until(
        () =>
          evaluate(
            `JSON.parse(localStorage.getItem('mathPractice.attempts')).length === ${before + 1} && document.querySelector('.question-card').dataset.flipped === 'false'`,
          ),
        'accepted mark and next card',
      )
    }
  }
  await until(
    () =>
      evaluate(
        'document.querySelector(".question-card").dataset.flipped === "true"',
      ),
    'revealed',
  )
  measurements.warning = await evaluate(
    'document.querySelector(".storage-warning")?.textContent ?? null',
  )
  measurements.writes = await evaluate('window.__writes')
  measurements.activeBytes = await evaluate(
    'Object.keys(localStorage).reduce((sum, key) => sum + 2 * (key.length + localStorage.getItem(key).length), 0)',
  )
  measurements.categoryBytesUTF16 = await evaluate(
    'Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, 2 * (key.length + localStorage.getItem(key).length)]))',
  )
  // A refreshed selected/revealed card must still have all 5,000 earlier marks.
  const previousTimeOrigin = await evaluate('performance.timeOrigin')
  await send('Page.reload')
  await until(
    () =>
      evaluate(
        `performance.timeOrigin !== ${previousTimeOrigin} && !!document.querySelector('main h1:not([data-loading])')`,
      ),
    'refreshed application',
  )
  measurements.recoveredRevealed = await evaluate(
    'document.querySelector(".question-card")?.dataset.flipped === "true"',
  )
  measurements.retainedAttempts = await evaluate(
    'JSON.parse(localStorage.getItem("mathPractice.attempts")).length',
  )
  assert.equal(measurements.retainedAttempts, 5004)
  const bundle = []
  for (const name of (
    await readdir(new URL('../dist/assets/', import.meta.url))
  ).sort()) {
    const data = await readFile(
      new URL('../dist/assets/' + name, import.meta.url),
    )
    bundle.push({ name, bytes: data.length, gzipBytes: gzipSync(data).length })
  }
  const report = {
    browser: (await send('Browser.getVersion')).product,
    history: { attempts: 5000, sessions: sessions.length, bytesUTF16: bytes },
    loads,
    initialResources,
    interactionsAt4xCPU: measurements,
    bundle,
  }
  console.log(JSON.stringify(report, null, 2))
  if (process.env.PERFORMANCE_REPORT)
    await writeFile(
      process.env.PERFORMANCE_REPORT,
      JSON.stringify(report, null, 2) + '\n',
    )
  assert.equal(measurements.warning, null, '5,000-attempt progress must save')
  assert.equal(
    measurements.recoveredRevealed,
    true,
    '5,000-attempt revealed card must recover',
  )
  for (const result of loads)
    for (const sample of result.samples) {
      assert.equal(sample.attempted, 5000)
      if (result.path === '/statistics') assert.equal(sample.sessionCards, 20)
    }
  assert.ok(
    !initialResources.some((resource) =>
      /SettingsPage|StatisticsPage/.test(resource.name),
    ),
    'home must not download deferred pages',
  )
  assert.ok(
    !initialResources.some((resource) =>
      /\.(woff2?|ttf|png|jpg|webp|svg)(\?|$)/i.test(resource.name),
    ),
    'home needs no font or image downloads',
  )
  const manifest = JSON.parse(
    await readFile(
      new URL('../dist/.vite/manifest.json', import.meta.url),
      'utf8',
    ),
  )
  for (const page of ['Settings', 'Statistics'])
    assert.equal(manifest[`src/pages/${page}Page.tsx`].isDynamicEntry, true)
}
