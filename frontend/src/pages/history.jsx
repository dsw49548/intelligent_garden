import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { fetchMeasurements } from '../api.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

function History() {
  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchMeasurements(1, 50)
      .then(data => {
        setMeasurements(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  if (measurements.length === 0) {
    return <div>No measurements</div>
  }

  const labels = measurements.map(m => new Date(m.measured_at).toLocaleString())
  const soilData = measurements.map(m => m.soil_moisture)
  const tempData = measurements.map(m => m.air_temp_c)
  const humidityData = measurements.map(m => m.air_humidity)
  const lightData = measurements.map(m => m.light_lux)

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Soil Moisture (%)',
        data: soilData,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      },
      {
        label: 'Temperature (°C)',
        data: tempData,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
      },
      {
        label: 'Humidity (%)',
        data: humidityData,
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
      },
      {
        label: 'Light (lux)',
        data: lightData,
        borderColor: 'rgb(255, 206, 86)',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
      }
    ]
  }

  return (
    <div>
      <h1>History</h1>
      <div style={{ height: '400px', marginTop: '2rem' }}>
        <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
      </div>
      <div style={{ marginTop: '2rem' }}>
        <h2>Recent Measurements</h2>
        <ul>
          {measurements.slice(0, 10).map(m => (
            <li key={m.id}>
              {new Date(m.measured_at).toLocaleString()} - 
              Soil: {m.soil_moisture}%, 
              Temp: {m.air_temp_c}°C, 
              Humidity: {m.air_humidity}%, 
              Light: {m.light_lux} lux
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default History
