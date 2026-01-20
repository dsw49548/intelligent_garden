import { useState, useEffect } from 'react'

function OfflineBadge() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) {
    return null
  }

  return (
    <span className="badge badge_offline" style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
      Offline
    </span>
  )
}

export default OfflineBadge
