import { useState, type PropsWithChildren } from 'react'
import {
  createMemoryRouter,
  RouterProvider,
  type InitialEntry,
} from 'react-router'

/** Exercises the same data-router navigation blocking used in production. */
function TestRouter({
  children,
  initialEntries = ['/'],
}: PropsWithChildren<{ initialEntries?: InitialEntry[] }>) {
  const [router] = useState(() =>
    createMemoryRouter([{ path: '*', element: children }], { initialEntries }),
  )
  return <RouterProvider router={router} />
}

export default TestRouter
