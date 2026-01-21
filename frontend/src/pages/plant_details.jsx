import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPlantById, getCachedLatest, saveCachedLatest, calculateStatus } from '../storage.js'
import { fetchLatestMeasurement } from '../api.js'

function PlantDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [plant, setPlant] = useState(null)
  const [measurement, setMeasurement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('NO DATA')

  const loadPlant = () => {
    const foundPlant = getPlantById(id)
    if (!foundPlant) {
      navigate('/')
      return
    }
    setPlant(foundPlant)
  }

  const loadMeasurement = () => {
    const cached = getCachedLatest(id)
    if (cached) {
      setMeasurement(cached)
      setStatus(calculateStatus(cached, plant?.thresholds))
      setLoading(false)
    }

    fetchLatestMeasurement(id)
      .then(data => {
        if (data) {
          setMeasurement(data)
          saveCachedLatest(id, data)
          setStatus(calculateStatus(data, plant?.thresholds))
        } else {
          setMeasurement(null)
          setStatus('NO DATA')
        }
        setLoading(false)
      })
      .catch(() => {
        if (!cached) {
          setMeasurement(null)
          setStatus('NO DATA')
          setLoading(false)
        }
      })
  }

  useEffect(() => {
    loadPlant()
  }, [id])

  useEffect(() => {
    if (!plant) return
    
    loadMeasurement()
    const interval = setInterval(() => {
      loadMeasurement()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [plant, id])

  if (loading && !plant) {
    return (
      <div className="card">
        <div className="empty_state">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!plant) {
    return null
  }

  const statusClass = status === 'NO DATA' ? 'status_nodata' : `status_${status.toLowerCase()}`

  return (
    <div>
      <div className="card">
        <div className="plant_header">
          {plant.photo && (
            <img src={plant.photo} alt={plant.name} className="plant_thumbnail" />
          )}
          <div>
            <h2 className="card_title">{plant.name}</h2>
            {plant.trefle && plant.trefle.scientific_name && (
              <p className="card_subtitle">{plant.trefle.scientific_name}</p>
            )}
          </div>
        </div>
        <span className={`status_badge ${statusClass}`}>{status}</span>
        
        {measurement ? (
          <div className="measurement_info">
            <div className="kv">
              <span className="kv_label">Soil Moisture</span>
              <span className="kv_value">{measurement.soil_moisture}%</span>
            </div>
            <div className="kv">
              <span className="kv_label">Air Temperature</span>
              <span className="kv_value">{measurement.air_temp_c.toFixed(1)}°C</span>
            </div>
            <div className="kv">
              <span className="kv_label">Air Humidity</span>
              <span className="kv_value">{measurement.air_humidity.toFixed(1)}%</span>
            </div>
            <div className="kv">
              <span className="kv_label">Light</span>
              <span className="kv_value">{measurement.light_lux} lux</span>
            </div>
            <div className="kv">
              <span className="kv_label">Last Update</span>
              <span className="kv_value">{new Date(measurement.measured_at).toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <div className="empty_state">
            <p>No measurement data available.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PlantDetails
