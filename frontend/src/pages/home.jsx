import { useState, useEffect } from 'react'
import { fetchLatestMeasurement } from '../api.js'
import { getLastMeasurements, saveLastMeasurements } from '../storage.js'

function Home() {
  const [measurement, setMeasurement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const cached = getLastMeasurements()
    if (cached['1']) {
      setMeasurement(cached['1'])
      setLoading(false)
    }

    fetchLatestMeasurement(1)
      .then(data => {
        setMeasurement(data)
        const cached = getLastMeasurements()
        cached['1'] = data
        saveLastMeasurements(cached)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
        const cached = getLastMeasurements()
        if (cached['1']) {
          setMeasurement(cached['1'])
          setError(null)
        }
      })
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  if (error && !measurement) {
    return <div>Error: {error}</div>
  }

  if (!measurement) {
    return <div>No data</div>
  }

  return (
    <div>
      <h1>Dashboard</h1>
      {error && <div style={{ color: 'orange' }}>Using cached data</div>}
      <div>
        <h2>Latest Measurement</h2>
        <p>Plant ID: {measurement.plant_id}</p>
        <p>Soil Moisture: {measurement.soil_moisture}%</p>
        <p>Air Temperature: {measurement.air_temp_c}°C</p>
        <p>Air Humidity: {measurement.air_humidity}%</p>
        <p>Light: {measurement.light_lux} lux</p>
        <p>Measured At: {measurement.measured_at}</p>
      </div>
    </div>
  )
}

export default Home
