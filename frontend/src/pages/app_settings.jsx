import { useState, useEffect } from 'react'
import { getPlants, getLastMeasurements, resetAllData } from '../storage.js'
import { clearAllMeasurements } from '../api.js'
import { useApp } from '../contexts/app_context.jsx'

function AppSettings() {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
    const [cacheInfo, setCacheInfo] = useState(null)

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    useEffect(() => {
        const updateCacheInfo = () => {
            const cache = getLastMeasurements()
            const plants = getPlants()
            const info = {
                lastFetchOk: cache.lastFetchOk || false,
                lastFetchTime: cache.lastFetchTime || null,
                plants: plants.map(plant => ({
                    id: plant.id,
                    name: plant.name,
                    latest: cache[plant.id] ? 1 : 0,
                    history: cache.history?.[plant.id]?.length || 0
                }))
            }
            setCacheInfo(info)
        }
        updateCacheInfo()
        const interval = setInterval(updateCacheInfo, 1000)
        return () => clearInterval(interval)
    }, [])

    const { showConfirm, showToast } = useApp()

    const handleReset = () => {
        showConfirm(
            'Reset all local data?',
            'This action cannot be undone. This will delete all plants, measurements, and cached data.',
            async () => {
                try {
                    await clearAllMeasurements()
                    await resetAllData()
                    showToast('All data reset', 'success')
                    setTimeout(() => {
                        window.location.reload()
                    }, 500)
                } catch (err) {
                    await resetAllData()
                    showToast('Local data reset (measurements may remain)', 'info')
                    setTimeout(() => {
                        window.location.reload()
                    }, 500)
                }
            },
            'Reset'
        )
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
                <label className="settings_label">Reset Data</label>
                <button className="btn_secondary btn_reset" onClick={handleReset}>
                    Reset All Local Data
                </button>
            </div>

            {cacheInfo && (
                <div className="settings_debug">
                    <h3 className="settings_debug_title">Debug</h3>
                    <div className="debug_info">
                        <div className="kv">
                            <span className="kv_label">Last Fetch</span>
                            <span className="kv_value">{cacheInfo.lastFetchOk ? 'OK' : 'FAIL'}</span>
                        </div>
                        {cacheInfo.lastFetchTime && (
                            <div className="kv">
                                <span className="kv_label">Last Fetch Time</span>
                                <span className="kv_value">{new Date(cacheInfo.lastFetchTime).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="kv">
                            <span className="kv_label">Cached Plants</span>
                            <span className="kv_value">{cacheInfo.plants.length}</span>
                        </div>
                        {cacheInfo.plants.length > 0 && (
                            <div className="cache_plants">
                                <h4 className="cache_plants_title">Cache per Plant</h4>
                                {cacheInfo.plants.map(plant => (
                                    <div key={plant.id} className="cache_plant_item">
                                        <span>{plant.name}</span>
                                        <span>Latest: {plant.latest} • History: {plant.history}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default AppSettings
