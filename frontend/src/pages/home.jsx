import { useState, useEffect } from 'react'
import { fetchLatestMeasurement } from '../api.js'
import { getLastMeasurements, saveLastMeasurements, getPlants, getSelectedPlantId } from '../storage.js'

function Home() {
  const [measurement, setMeasurement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [plant, setPlant] = useState(null)

  useEffect(() => {
    const selectedId = getSelectedPlantId()
    const plants = getPlants()
    const foundPlant = plants.find(p => p.id.toString() === selectedId)
    if (foundPlant) {
      setPlant(foundPlant)
    }

    const cached = getLastMeasurements()
    if (cached[selectedId]) {
      setMeasurement(cached[selectedId])
      setLoading(false)
    }

    fetchLatestMeasurement(selectedId)
      .then(data => {
        setMeasurement(data)
        const cached = getLastMeasurements()
        cached[selectedId] = data
        saveLastMeasurements(cached)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
        const cached = getLastMeasurements()
        if (cached[selectedId]) {
          setMeasurement(cached[selectedId])
          setError(null)
        }
      })
  }, [])

  const getStatusBadge = () => {
    if (!measurement) return null
    const soil = measurement.soil_moisture
    const isDry = soil < 30
    return (
      <span className={`badge ${isDry ? 'badge_dry' : 'badge_ok'}`}>
        Status: {isDry ? 'DRY' : 'OK'}
      </span>
    )
  }

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

  if (error && !measurement) {
    return (
      <div className="card">
        <div className="empty_state">
          <p>Error: {error}</p>
          <button className="btn_primary" onClick={() => window.location.reload()}>
            Refresh
          </button>
        </div>
      </div>
    )
  }

  if (!measurement) {
    return (
      <div className="card">
        <div className="empty_state">
          <p>No data available</p>
          <button className="btn_primary" onClick={() => window.location.reload()}>
            Load Data
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      {error && (
        <div className="badge badge_offline" style={{ marginBottom: '1rem' }}>
          Using cached data
        </div>
      )}
      {plant && plant.photo && (
        <img src={plant.photo} alt={plant.name} className="plant_image" />
      )}
      <div className="card_title">{plant ? plant.name : `Plant ${measurement.plant_id}`}</div>
      {plant && plant.species && (
        <div className="card_subtitle">{plant.species}</div>
      )}
      <div style={{ marginBottom: '1rem' }}>
        {getStatusBadge()}
      </div>
      <div className="row">
        <div className="kv">
          <span className="kv_label">Soil Moisture</span>
          <span className="kv_value">{measurement.soil_moisture}%</span>
        </div>
      </div>
      <div className="row">
        <div className="kv">
          <span className="kv_label">Air Temperature</span>
          <span className="kv_value">{measurement.air_temp_c}°C</span>
        </div>
      </div>
      <div className="row">
        <div className="kv">
          <span className="kv_label">Air Humidity</span>
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
        Last Update: {formatDate(measurement.measured_at)}
      </div>
    </div>
  )
}

export default Home
