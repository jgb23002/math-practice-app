// Reuse the isolated Chrome/Vite runner and cleanup from the responsive check.
process.env.SESSION_RECOVERY_ONLY = '1'
await import('./check-responsive.mjs')
