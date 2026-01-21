import { useState, useEffect } from 'react'
import { getPlants, getLastMeasurements } from '../storage.js'

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

    const handleReset = () => {
        if (confirm('Are you sure you want to reset all local data? This will delete all plants and cached measurements.')) {
            localStorage.removeItem('plants')
            localStorage.removeItem('last_measurements')
            localStorage.removeItem('active_plant_id')
            window.location.href = '/'
        }
    }

    return (
        <div>
            <div className="card">
                <h2 className="card_title">App Settings</h2>
                <div className="setting_group">
                    <label className="setting_label">Theme</label>
                    <div className="setting_control">
                        <button
                            className={`theme_toggle ${theme === 'light' ? 'active' : ''}`}
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        >
                            {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                        </button>
                    </div>
                </div>
                <div className="setting_group">
                    <label className="setting_label">Reset Data</label>
                    <button className="btn_danger" onClick={handleReset}>
                        Reset All Local Data
                    </button>
                </div>
            </div>
            <div className="card">
                <h2 className="card_title">Debug</h2>
                {cacheInfo && (
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
                                <h3>Cache per Plant</h3>
                                {cacheInfo.plants.map(plant => (
                                    <div key={plant.id} className="cache_plant_item">
                                        <span>{plant.name}</span>
                                        <span>Latest: {plant.latest}, History: {plant.history}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default AppSettings
