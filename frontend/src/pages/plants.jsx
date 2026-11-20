import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { calculateStatus, STATUS_EMOJI } from '../storage.js'
import { getPlants, fetchLatestMeasurement } from '../api.js'
import { loadPlantPhoto } from '../storage_photos.js'

function Plants() {
    const [plants, setPlants] = useState([])
    const [latestById, setLatestById] = useState({})
    const [plantPhotos, setPlantPhotos] = useState({})

    useEffect(() => {
        getPlants().then(setPlants).catch(() => {})
    }, [])

    useEffect(() => {
        const refreshMeasurements = () => {
            plants.forEach(plant => {
                fetchLatestMeasurement(plant.id)
                    .then(data => setLatestById(prev => ({ ...prev, [plant.id]: data })))
                    .catch(() => {})
            })
        }

        refreshMeasurements()
        const interval = setInterval(refreshMeasurements, 5000)
        return () => clearInterval(interval)
    }, [plants])

    useEffect(() => {
        const loadPhotos = async () => {
            const photos = {}
            for (const plant of plants) {
                photos[plant.id] = await loadPlantPhoto(plant)
            }
            setPlantPhotos(photos)
        }
        loadPhotos()
    }, [plants])

    return (
        <div className="plants_list_container">
            {plants.map(plant => {
                const status = calculateStatus(latestById[plant.id], plant)
                const statusClass = status === 'NO DATA' ? 'status_nodata' : `status_${status.toLowerCase()}`
                const latest = latestById[plant.id]
                const photoUrl = plantPhotos[plant.id]
                return (
                    <Link key={plant.id} to={`/plant/${plant.id}`} className="plant_tile">
                        <div className="plant_tile_header">
                            {photoUrl ? (
                                <img
                                    src={photoUrl}
                                    alt={plant.name}
                                    className="plant_tile_photo"
                                />
                            ) : (
                                <div className="plant_tile_photo plant_tile_photo_placeholder">🌱</div>
                            )}
                            <div className="plant_tile_title_row">
                                <h3>{plant.name}</h3>
                                <span className={`status_badge ${statusClass}`}>
                                    {STATUS_EMOJI[status]} {status}
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
