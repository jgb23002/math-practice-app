import { useEffect, useState, type ComponentType } from 'react'

type PageModule = { default: ComponentType }
type PageLoader = () => Promise<PageModule>
const pages = new WeakMap<PageLoader, PageModule>()

/** Load outside rendering, retaining successful downloads across navigation. */
function LazyPage({ load }: { load: PageLoader }) {
  const [page, setPage] = useState(() => pages.get(load))
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    if (pages.has(load)) return
    let mounted = true
    void load().then(
      (module) => {
        pages.set(load, module)
        if (mounted) setPage(module)
      },
      (cause: unknown) => {
        if (mounted)
          setError(
            cause instanceof Error ? cause : new Error('Page download failed'),
          )
      },
    )
    return () => {
      mounted = false
    }
  }, [load])
  if (error) throw error
  if (page) {
    const Page = page.default
    return <Page />
  }
  return (
    <section>
      <h1 id="page-heading" data-loading>
        Getting your page ready
      </h1>
      <p role="status" aria-live="polite">
        Just a moment…
      </p>
    </section>
  )
}

export default LazyPage
