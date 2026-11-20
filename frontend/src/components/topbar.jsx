import { useState } from 'react'
import { Link } from 'react-router-dom'
import Drawer from './drawer.jsx'
import { getToken } from '../storage.js'

function Topbar() {
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
                {getToken() && (
                    <button className="menu_button" onClick={handleMenuClick} aria-label="Open menu">
                        ☰
                    </button>
                )}
                <Link to="/" className="top_bar_title_link">
                    <h1>Intelligent Garden</h1>
                </Link>
            </header>
            {getToken() && <Drawer isOpen={drawerOpen} onClose={handleDrawerClose} onOpen={handleMenuClick} />}
        </>
    )
}

export default Topbar
