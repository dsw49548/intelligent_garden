import { Link } from 'react-router-dom'

function Layout({ children }) {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/history">History</Link>
        <Link to="/settings">Settings</Link>
      </nav>
      <main>
        {children}
      </main>
    </div>
  )
}

export default Layout
