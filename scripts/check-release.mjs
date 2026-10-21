import { checkReleaseFiles } from './release-file-checks.mjs'

await checkReleaseFiles()
process.env.RELEASE_ONLY = '1'
await import('./check-responsive.mjs')
