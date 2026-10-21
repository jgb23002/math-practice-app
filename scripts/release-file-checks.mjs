import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
function git(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
  } catch {
    // Do not expose a staged file's contents through a child-process error.
    throw new Error(
      'Git state could not be read for the release review. Check the repository locally.',
    )
  }
}
const list = (value) => value.split('\0').filter(Boolean)
const unwanted =
  /(?:^|\/)(?:node_modules|dist|dist-ssr|coverage|\.vitest|\.netlify|\.aws)(?:\/|$)|(?:\.log|\.tsbuildinfo|\.pem|\.key|\.p12|\.pfx)$|(?:^|\/)\.DS_Store$/i
const environment = /(?:^|\/)\.env(?:\..*)?$/
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{60,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\bsk_live_[A-Za-z0-9]{20,}\b/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /\b(?:sk-proj-|sk-ant-)[A-Za-z0-9_-]{40,}\b/,
]

function scanContents(label, content) {
  for (const [index, line] of content.split('\n').entries()) {
    assert.ok(
      !secretPatterns.some((pattern) => pattern.test(line)),
      `Possible credential in ${label}:${index + 1}; inspect locally. The matched value is intentionally not printed.`,
    )
  }
}

async function filesUnder(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await filesUnder(path)))
    else files.push(path)
  }
  return files
}

/** Read-only precommit/build review; known patterns are not a complete secret scan. */
export async function checkReleaseFiles() {
  const candidates = list(
    git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']),
  )
  for (const file of candidates) {
    assert.ok(
      !unwanted.test(file),
      `Generated/private file is a commit candidate: ${file}`,
    )
    assert.ok(
      !environment.test(file) || file.endsWith('.example'),
      `Environment file is a commit candidate: ${file}`,
    )
    let content
    try {
      content = await readFile(join(root, file), 'utf8')
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
    scanContents(file, content)
  }
  // Also inspect staged versions, which can differ from the working files.
  for (const file of list(
    git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']),
  ))
    scanContents(`staged ${file}`, git(['show', `:${file}`]))
  const ignored = [
    'dist/index.html',
    'node_modules/example/index.js',
    'coverage/report.html',
    '.env',
    '.env.production',
    '.netlify/state.json',
    '.aws/credentials',
    'private.pem',
    'app.tsbuildinfo',
  ]
  const checked = list(
    execFileSync('git', ['check-ignore', '-z', '--stdin'], {
      cwd: root,
      input: ignored.join('\0') + '\0',
      encoding: 'utf8',
    }),
  )
  assert.deepEqual(
    checked,
    ignored,
    'Private/generated example paths must be ignored',
  )

  const config = await readFile(join(root, 'netlify.toml'), 'utf8')
  assert.match(
    config,
    /\[build\]\s+command\s*=\s*"npm run build"\s+publish\s*=\s*"dist"/,
  )
  assert.equal((config.match(/\[\[redirects\]\]/g) ?? []).length, 1)
  assert.match(
    config,
    /\[\[redirects\]\]\s+from\s*=\s*"\/\*"\s+to\s*=\s*"\/index\.html"\s+status\s*=\s*200\s+force\s*=\s*false/,
  )
  const manifest = JSON.parse(
    await readFile(join(root, 'dist/.vite/manifest.json'), 'utf8'),
  )
  assert.ok(
    manifest['index.html']?.isEntry,
    'Run npm run build before the release check',
  )
  const artifacts = await filesUnder(join(root, 'dist'))
  for (const file of artifacts) {
    const name = relative(join(root, 'dist'), file)
    assert.ok(
      name === 'index.html' ||
        name === '.vite/manifest.json' ||
        /^assets\/[\w-]+\.(?:js|css)$/.test(name),
      `Unexpected published file: ${name}`,
    )
    scanContents(`dist/${name}`, await readFile(file, 'utf8'))
  }
  console.log(
    `✓ Reviewed ${new Set(candidates).size} commit candidates, staged changes, ignore rules, ${artifacts.length} production files, and the Netlify SPA configuration. No known credential patterns found. This is not a full Git-history or Netlify-edge audit.`,
  )
}
