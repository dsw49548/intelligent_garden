import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsername, clearAuth } from '../storage.js'
import { logout } from '../api.js'

function AppSettings() {
    const navigate = useNavigate()
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    const handleLogout = async () => {
        await logout().catch(() => {})
        clearAuth()
        navigate('/login')
    }

    return (
        <div className="card">
            <h2 className="card_title">App Settings</h2>

            <div className="settings_section">
                <label className="settings_label">Theme</label>
                <button
                    className={`btn_secondary theme_toggle ${theme === 'light' ? 'theme_toggle_active' : ''}`}
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                    {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </button>
            </div>

            <div className="settings_section">
                <label className="settings_label">Account</label>
                <div className="kv">
                    <span className="kv_label">Logged in as</span>
                    <span className="kv_value">{getUsername()}</span>
                </div>
                <button className="btn_secondary btn_reset" onClick={handleLogout}>
                    Log out
                </button>
            </div>

            <p className="settings_hint">
                To clear the measurements of a plant, open the plant and use Plant settings.
            </p>
        </div>
    )
}

export default AppSettings
