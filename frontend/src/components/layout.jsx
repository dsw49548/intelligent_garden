import Topbar from './topbar.jsx'

function Layout({ children }) {
  return (
    <div className="app_shell">
      <Topbar />
      <main className="content">
        {children}
      </main>
    </div>
  )
}

export default Layout
