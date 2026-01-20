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
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#ff9800',
      color: 'white',
      padding: '0.5rem 1rem',
      borderRadius: '4px',
      zIndex: 1000
    }}>
      Offline
    </div>
  )
}

export default OfflineBadge
