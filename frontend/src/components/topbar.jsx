import { useState } from 'react'
import Drawer from './drawer.jsx'

function Topbar({ onMenuClick }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleMenuClick = () => {
    setDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
  }

  return (
    <>
      <header className="top_bar">
        <button className="menu_button" onClick={handleMenuClick} aria-label="Open menu">
          ☰
        </button>
        <h1>Intelligent Garden</h1>
      </header>
      <Drawer isOpen={drawerOpen} onClose={handleDrawerClose} />
    </>
  )
}

export default Topbar
