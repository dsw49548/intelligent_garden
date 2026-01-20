import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { fetchLatestMeasurement } from '../api.js'
import { getPlants } from '../storage.js'

function Plant() {
  const { id } = useParams()
  const [measurement, setMeasurement] = useState(null)
  const [plant, setPlant] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const plants = getPlants()
    const foundPlant = plants.find(p => p.id.toString() === id)
    if (foundPlant) {
      setPlant(foundPlant)
    }

    fetchLatestMeasurement(id)
      .then(data => {
        setMeasurement(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>{plant ? plant.name : `Plant ${id}`}</h1>
      {plant && plant.photo && (
        <img src={plant.photo} alt={plant.name} style={{ maxWidth: '300px', marginBottom: '1rem' }} />
      )}
      {measurement && (
        <div>
          <h2>Latest Measurement</h2>
          <p>Soil Moisture: {measurement.soil_moisture}%</p>
          <p>Temperature: {measurement.air_temp_c}°C</p>
          <p>Humidity: {measurement.air_humidity}%</p>
          <p>Light: {measurement.light_lux} lux</p>
          <p>Measured At: {new Date(measurement.measured_at).toLocaleString()}</p>
        </div>
      )}
    </div>
  )
}

export default Plant
