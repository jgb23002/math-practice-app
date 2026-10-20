import { useEffect } from 'react'

function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Math Practice`
  }, [title])
}

export default usePageTitle
