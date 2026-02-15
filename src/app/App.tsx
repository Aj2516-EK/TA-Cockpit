import { useEffect, useState } from 'react'
import { CockpitPage } from '../features/cockpit/CockpitPage'
import { HomePage } from '../features/home/HomePage'
import { UploadPage } from '../features/upload/UploadPage'
import type { ClusterId } from '../features/cockpit/model'
import type { Dataset } from '../features/cockpit/runtime-data/types'

export function App() {
  const [page, setPage] = useState<'home' | 'upload' | 'cockpit'>('home')
  const [activeCluster, setActiveCluster] = useState<ClusterId>('readiness')
  const [darkMode, setDarkMode] = useState(true)
  const [dataset, setDataset] = useState<Dataset | null>(null)

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
          setPage('upload')
        }}
      />
    )
  }

  if (page === 'upload') {
    return (
      <UploadPage
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((v) => !v)}
        onDataReady={(ds) => {
          setDataset(ds)
          setPage('cockpit')
        }}
        onBack={() => setPage('home')}
      />
    )
  }

  return (
    <CockpitPage
      initialCluster={activeCluster}
      onNavigateHome={() => {
        setDataset(null)
        setPage('home')
      }}
      darkMode={darkMode}
      onToggleDarkMode={() => setDarkMode((v) => !v)}
      dataset={dataset!}
    />
  )
}
