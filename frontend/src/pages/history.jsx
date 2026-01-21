import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { fetchMeasurements } from '../api.js'
import { getLastMeasurements, getSelectedPlantId, getPlants } from '../storage.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

function History() {
  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [plants, setPlants] = useState([])

  useEffect(() => {
    const allPlants = getPlants()
    setPlants(allPlants)

    if (allPlants.length === 0) {
      setLoading(false)
      return
    }

    const selectedId = getSelectedPlantId()
    const cached = getLastMeasurements()
    if (cached.history) {
      setMeasurements(cached.history)
      setLoading(false)
    }

    fetchMeasurements(selectedId, 50)
      .then(data => {
        setMeasurements(data || [])
        if (data && data.length > 0) {
          const cached = getLastMeasurements()
          cached.history = data
          localStorage.setItem('last_measurements', JSON.stringify(cached))
        }
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
        const cached = getLastMeasurements()
        if (cached.history) {
          setMeasurements(cached.history)
          setError(null)
        }
      })
  }, [])

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

  if (plants.length === 0) {
    return (
      <div className="card">
        <div className="empty_state">
          <p>No plants added yet.</p>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Add one in Settings.</p>
        </div>
      </div>
    )
  }

  if (error && measurements.length === 0) {
    return (
      <div className="card">
        <div className="empty_state">
          <p>Error: {error}</p>
        </div>
      </div>
    )
  }

  if (measurements.length === 0) {
    return (
      <div className="card">
        <div className="empty_state">
          <p>No measurement history available.</p>
        </div>
      </div>
    )
  }

  const validMeasurements = measurements.filter(m => {
    if (!m.measured_at) return false
    const date = new Date(m.measured_at)
    return !isNaN(date.getTime())
  })

  if (validMeasurements.length === 0) {
    return (
      <div className="card">
        <div className="empty_state">
          <p>No valid measurement data available.</p>
        </div>
      </div>
    )
  }

  const sortedMeasurements = [...validMeasurements].sort((a, b) => {
    return new Date(a.measured_at) - new Date(b.measured_at)
  })

  const labels = sortedMeasurements.map(m => {
    const date = new Date(m.measured_at)
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  })
  const soilData = sortedMeasurements.map(m => m.soil_moisture)
  const tempData = sortedMeasurements.map(m => m.air_temp_c)
  const humidityData = sortedMeasurements.map(m => m.air_humidity)
  const lightData = sortedMeasurements.map(m => m.light_lux)

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Soil Moisture (%)',
        data: soilData,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Temperature (°C)',
        data: tempData,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Humidity (%)',
        data: humidityData,
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Light (lux)',
        data: lightData,
        borderColor: 'rgb(255, 206, 86)',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        tension: 0.4,
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: {
            size: 11
          },
          padding: 8,
          usePointStyle: true,
        }
      },
      title: {
        display: false
      }
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 10
          },
          maxTicksLimit: 8,
          autoSkip: true
        },
        grid: {
          color: '#2a2a2a'
        }
      },
      y: {
        ticks: {
          font: {
            size: 10
          }
        },
        grid: {
          color: '#2a2a2a'
        }
      }
    }
  }

  return (
    <>
      <div className="card">
        {error && (
          <div className="badge badge_offline" style={{ marginBottom: '1rem' }}>
            Using cached data
          </div>
        )}
        <div className="card_title">Measurement History</div>
        <div className="chart_container">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
      <div className="card">
        <div className="card_title">Recent Measurements</div>
        <ul className="measurement_list">
          {measurements.slice(0, 10).map(m => (
            <li key={m.id} className="measurement_item">
              <span className="measurement_timestamp">{formatDate(m.measured_at)}</span>
              <span className="measurement_values">
                Soil: {m.soil_moisture}% | Temp: {m.air_temp_c}°C
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

export default History
