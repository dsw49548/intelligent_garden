import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getPlants, getCachedLatest, calculateStatus, saveCachedLatest } from '../storage.js'
import { fetchLatestMeasurement } from '../api.js'
import { loadPlantPhoto } from '../utils/photo_loader.js'

function Plants() {
    const [plants, setPlants] = useState([])

    useEffect(() => {
        const loadPlants = () => {
            setPlants(getPlants())
        }
        loadPlants()
        const interval = setInterval(loadPlants, 2000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const refreshMeasurements = () => {
            const currentPlants = getPlants()
            currentPlants.forEach(plant => {
                const cached = getCachedLatest(plant.id)
                fetchLatestMeasurement(plant.id)
                    .then(data => {
                        if (data) {
                            const cachedTimestamp = cached ? new Date(cached.measured_at).getTime() : 0
                            const newTimestamp = new Date(data.measured_at).getTime()
                            if (newTimestamp > cachedTimestamp) {
                                saveCachedLatest(plant.id, data)
                                setPlants(getPlants())
                            }
                        }
                    })
                    .catch(() => {
                        // Silently fail, use cached data
                    })
            })
        }

        refreshMeasurements()
        const interval = setInterval(refreshMeasurements, 5000)
        return () => clearInterval(interval)
    }, [])

    const getPlantStatus = (plant) => {
        const latest = getCachedLatest(plant.id)
        if (!latest) {
            return { status: 'NO DATA', emoji: '⚪', description: 'Waiting for first measurement' }
        }
        const status = calculateStatus(latest, plant.thresholds)
        const emojiMap = {
            'OK': '🟢',
            'WARN': '🟡',
            'BAD': '🔴',
            'NO DATA': '⚪'
        }
        return {
            status,
            emoji: emojiMap[status] || '⚪',
            description: status === 'NO DATA' ? 'Waiting for first measurement' : null
        }
    }

    const [plantPhotos, setPlantPhotos] = useState({})

    useEffect(() => {
        const loadPhotos = async () => {
            const photos = {}
            for (const plant of plants) {
                const photo = await loadPlantPhoto(plant)
                photos[plant.id] = photo
            }
            setPlantPhotos(photos)
        }
        if (plants.length > 0) {
            loadPhotos()
        }
    }, [plants])

    return (
        <div className="plants_list_container">
            {plants.map(plant => {
                const statusInfo = getPlantStatus(plant)
                const statusClass = statusInfo.status === 'NO DATA' ? 'status_nodata' : `status_${statusInfo.status.toLowerCase()}`
                const latest = getCachedLatest(plant.id)
                const photoUrl = plantPhotos[plant.id] || (plant.trefle && plant.trefle.image_url) || null
                return (
                    <Link key={plant.id} to={`/plant/${plant.id}`} className="plant_tile">
                        <div className="plant_tile_header">
                            {photoUrl ? (
                                <img
                                    src={photoUrl}
                                    alt={plant.displayName && plant.displayName.trim().length > 0 ? plant.displayName.trim() : plant.name}
                                    className="plant_tile_photo"
                                />
                            ) : (
                                <div className="plant_tile_photo plant_tile_photo_placeholder">🌱</div>
                            )}
                            <div className="plant_tile_title_row">
                                <h3>{plant.displayName && plant.displayName.trim().length > 0 ? plant.displayName.trim() : plant.name}</h3>
                                <span className={`status_badge ${statusClass}`}>
                                    {statusInfo.emoji} {statusInfo.status}
                                </span>
                            </div>
                        </div>
                        <div className="plant_tile_metrics">
                            <div className="plant_metric">
                                <span className="plant_metric_label">Soil</span>
                                <span className="plant_metric_value">
                                    {latest ? `${latest.soil_moisture}%` : '—'}
                                </span>
                            </div>
                            <div className="plant_metric">
                                <span className="plant_metric_label">Temp</span>
                                <span className="plant_metric_value">
                                    {latest ? `${latest.air_temp_c.toFixed(1)}°C` : '—'}
                                </span>
                            </div>
                            <div className="plant_metric">
                                <span className="plant_metric_label">Hum</span>
                                <span className="plant_metric_value">
                                    {latest ? `${latest.air_humidity.toFixed(0)}%` : '—'}
                                </span>
                            </div>
                            <div className="plant_metric">
                                <span className="plant_metric_label">Light</span>
                                <span className="plant_metric_value">
                                    {latest ? `${latest.light_lux} lux` : '—'}
                                </span>
                            </div>
                        </div>
                    </Link>
                )
            })}
            <Link to="/add" className="plant_tile plant_tile_add">
                <div className="plant_tile_add_icon">+</div>
            </Link>
        </div>
    )
}

export default Plants
