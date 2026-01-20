import { Link, useLocation } from 'react-router-dom'
import OfflineBadge from './offline_badge.jsx'

function Layout({ children }) {
  const location = useLocation()

  return (
    <div className="app_shell">
      <header className="top_bar">
        <h1>Intelligent Garden</h1>
        <OfflineBadge />
      </header>
      <main className="content">
        {children}
      </main>
      <nav className="bottom_nav">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          Dashboard
        </Link>
        <Link to="/history" className={location.pathname === '/history' ? 'active' : ''}>
          History
        </Link>
        <Link to="/settings" className={location.pathname === '/settings' ? 'active' : ''}>
          Settings
        </Link>
      </nav>
    </div>
  )
}

export default Layout
