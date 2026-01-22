import { useState } from 'react'
import { Link } from 'react-router-dom'
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
                <Link to="/" className="top_bar_title_link">
                    <h1>Intelligent Garden</h1>
                </Link>
            </header>
            <Drawer isOpen={drawerOpen} onClose={handleDrawerClose} onOpen={handleMenuClick} />
        </>
    )
}

export default Topbar
