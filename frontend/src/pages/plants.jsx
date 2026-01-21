import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getPlants, getCachedLatest, calculateStatus } from '../storage.js'

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

    return (
        <div className="plants_list_container">
            {plants.map(plant => {
                const statusInfo = getPlantStatus(plant)
                const statusClass = statusInfo.status === 'NO DATA' ? 'status_nodata' : `status_${statusInfo.status.toLowerCase()}`
                return (
                    <Link key={plant.id} to={`/plant/${plant.id}`} className="plant_tile">
                        {plant.photo && (
                            <img src={plant.photo} alt={plant.name} className="plant_tile_photo" />
                        )}
                        <div className="plant_tile_info">
                            <h3>{plant.name}</h3>
                            <div className="plant_tile_status">
                                <span className={`status_badge ${statusClass}`}>
                                    {statusInfo.emoji} {statusInfo.status}
                                </span>
                                {statusInfo.description && (
                                    <span className="plant_tile_description">{statusInfo.description}</span>
                                )}
                            </div>
                        </div>
                    </Link>
                )
            })}
            <Link to="/add" className="plant_tile plant_tile_add">
                <div className="plant_tile_add_icon">+</div>
                <div className="plant_tile_info">
                    <h3>Add plant</h3>
                </div>
            </Link>
        </div>
    )
}

export default Plants
