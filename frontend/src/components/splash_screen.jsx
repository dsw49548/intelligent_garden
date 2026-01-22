import { useState, useEffect } from 'react'

function SplashScreen({ onComplete }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        if (onComplete) onComplete()
      }, 300)
    }, 3000)

    return () => clearTimeout(timer)
  }, [onComplete])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease-out',
        overflow: 'hidden'
      }}
    >
      <img
        src="/splash.png"
        alt="Splash"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          transform: 'scale(1.05)',
          transformOrigin: 'center'
        }}
        onError={(e) => {
          e.target.style.display = 'none'
        }}
      />
    </div>
  )
}

export default SplashScreen
