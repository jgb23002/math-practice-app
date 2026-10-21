/** Local diagnostics only; never render exception details or send them away. */
export function reportDevelopmentError(context: string, error: unknown) {
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test')
    console.error(`[Math Practice] ${context}`, error)
}
