import { Link } from 'react-router-dom'
import OfflineBadge from './offline_badge.jsx'

function Layout({ children }) {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/history">History</Link>
        <Link to="/settings">Settings</Link>
      </nav>
      <OfflineBadge />
      <main>
        {children}
      </main>
    </div>
  )
}

export default Layout
