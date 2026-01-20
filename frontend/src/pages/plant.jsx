import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { fetchLatestMeasurement } from '../api.js'
import { getPlants, getActivePlantId } from '../storage.js'

function Plant() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [measurement, setMeasurement] = useState(null)
  const [plant, setPlant] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const plants = getPlants()
    const foundPlant = plants.find(p => p.id.toString() === id)

    if (!foundPlant) {
      const activeId = getActivePlantId()
      if (activeId) {
        navigate(`/plant/${activeId}`, { replace: true })
      } else {
        navigate('/', { replace: true })
      }
      return
    }

    setPlant(foundPlant)

    fetchLatestMeasurement(id)
      .then(data => {
        setMeasurement(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [id, navigate])

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="card">
        <div className="empty_state">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      {plant && plant.photo && (
        <img src={plant.photo} alt={plant.name} className="plant_image" />
      )}
      <div className="card_title">{plant ? plant.name : `Plant ${id}`}</div>
      {plant && plant.species && (
        <div className="card_subtitle">{plant.species}</div>
      )}
      {measurement ? (
        <>
          <div className="row">
            <div className="kv">
              <span className="kv_label">Soil Moisture</span>
              <span className="kv_value">{measurement.soil_moisture}%</span>
            </div>
          </div>
          <div className="row">
            <div className="kv">
              <span className="kv_label">Temperature</span>
              <span className="kv_value">{measurement.air_temp_c}°C</span>
            </div>
          </div>
          <div className="row">
            <div className="kv">
              <span className="kv_label">Humidity</span>
              <span className="kv_value">{measurement.air_humidity}%</span>
            </div>
          </div>
          <div className="row">
            <div className="kv">
              <span className="kv_label">Light</span>
              <span className="kv_value">{measurement.light_lux} lux</span>
            </div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #2a2a2a', color: '#aaa', fontSize: '0.85rem' }}>
            Measured At: {formatDate(measurement.measured_at)}
          </div>
        </>
      ) : (
        <div className="empty_state" style={{ padding: '1rem' }}>
          <p>No measurement data available</p>
        </div>
      )}
    </div>
  )
}

export default Plant
