import { useEffect, useState } from 'react'
import { CockpitPage } from '../features/cockpit/CockpitPage'
import { HomePage } from '../features/home/HomePage'
import type { ClusterId } from '../features/cockpit/model'

export function App() {
  const [page, setPage] = useState<'home' | 'cockpit'>('home')
  const [activeCluster, setActiveCluster] = useState<ClusterId>('readiness')
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  if (page === 'home') {
    return (
      <HomePage
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((v) => !v)}
        onOpenJourney={(clusterId) => {
          setActiveCluster(clusterId)
          setPage('cockpit')
        }}
      />
    )
  }

  return (
    <CockpitPage
      initialCluster={activeCluster}
      onNavigateHome={() => setPage('home')}
      darkMode={darkMode}
      onToggleDarkMode={() => setDarkMode((v) => !v)}
    />
  )
}

