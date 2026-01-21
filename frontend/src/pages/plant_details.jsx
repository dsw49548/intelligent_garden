import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { getPlantById, getCachedLatest, saveCachedLatest, calculateStatus, getCachedHistory, saveCachedHistory, getLastMeasurements, saveLastMeasurements } from '../storage.js'
import { fetchLatestMeasurement, fetchMeasurements } from '../api.js'
import BottomSheet from '../components/bottom_sheet.jsx'
import PlantSettings from '../components/plant_settings.jsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

function PlantDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [plant, setPlant] = useState(null)
  const [measurement, setMeasurement] = useState(null)
  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [status, setStatus] = useState('NO DATA')
  const [limit, setLimit] = useState(50)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const observerRef = useRef(null)
  const loadMoreRef = useRef(null)

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
        const cache = getLastMeasurements()
        cache.lastFetchOk = false
        saveLastMeasurements(cache)
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

  const loadHistory = () => {
    const cached = getCachedHistory(id)
    if (cached && cached.length > 0) {
      setMeasurements(cached)
    }

    fetchMeasurements(id, limit)
      .then(data => {
        if (data && data.length > 0) {
          const sorted = [...data].sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))
          const unique = sorted.filter((m, idx, arr) => arr.findIndex(x => x.id === m.id) === idx)
          setMeasurements(unique)
          saveCachedHistory(id, unique)
        } else {
          setMeasurements([])
        }
      })
      .catch(() => {
        if (!cached || cached.length === 0) {
          setMeasurements([])
        }
      })
  }

  const loadMore = () => {
    if (loadingMore) return
    setLoadingMore(true)
    const newLimit = limit + 50
    setLimit(newLimit)
    
    fetchMeasurements(id, newLimit)
      .then(data => {
        if (data && data.length > 0) {
          const sorted = [...data].sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))
          const unique = sorted.filter((m, idx, arr) => arr.findIndex(x => x.id === m.id) === idx)
          setMeasurements(unique)
          saveCachedHistory(id, unique)
        }
        setLoadingMore(false)
      })
      .catch(() => {
        setLoadingMore(false)
      })
  }

  useEffect(() => {
    if (!plant) return
    
    loadMeasurement()
    loadHistory()
    
    const interval = setInterval(() => {
      loadMeasurement()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [plant, id])

  useEffect(() => {
    if (!loadMoreRef.current || !id) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(loadMoreRef.current)

    return () => {
      observer.disconnect()
    }
  }, [loadingMore, measurements.length, id])

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

  const sortedForCharts = [...measurements].sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at))
  
  const chartLabels = sortedForCharts.map(m => {
    const date = new Date(m.measured_at)
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  })

  const chartData1 = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Soil Moisture (%)',
        data: sortedForCharts.map(m => m.soil_moisture),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Temperature (°C)',
        data: sortedForCharts.map(m => m.air_temp_c),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Humidity (%)',
        data: sortedForCharts.map(m => m.air_humidity),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4,
      }
    ]
  }

  const chartData2 = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Light (lux)',
        data: sortedForCharts.map(m => m.light_lux),
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
          font: { size: 11 },
          padding: 8,
          usePointStyle: true,
        }
      }
    },
    scales: {
      x: {
        ticks: {
          font: { size: 10 },
          maxTicksLimit: 8,
          autoSkip: true
        },
        grid: { color: '#2a2a2a' }
      },
      y: {
        ticks: {
          font: { size: 10 }
        },
        grid: { color: '#2a2a2a' }
      }
    }
  }

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
        <button className="btn_secondary" onClick={() => setSettingsOpen(true)} style={{ marginTop: '1rem' }}>
          Plant Settings
        </button>
      </div>

      {measurements.length > 0 && (
        <>
          <div className="card">
            <h3 className="card_title">Soil, Temperature & Humidity</h3>
            <div className="chart_container">
              <Line data={chartData1} options={chartOptions} />
            </div>
          </div>
          <div className="card">
            <h3 className="card_title">Light</h3>
            <div className="chart_container">
              <Line data={chartData2} options={chartOptions} />
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h3 className="card_title">Measurement History</h3>
        {measurements.length > 0 ? (
          <ul className="measurement_list">
            {measurements.map(m => (
              <li key={m.id} className="measurement_item">
                <span className="measurement_timestamp">
                  {new Date(m.measured_at).toLocaleString()}
                </span>
                <span className="measurement_values">
                  Soil: {m.soil_moisture}% | Temp: {m.air_temp_c.toFixed(1)}°C
                </span>
              </li>
            ))}
            <li ref={loadMoreRef} className="measurement_item" style={{ textAlign: 'center', padding: '1rem' }}>
              {loadingMore ? 'Loading...' : 'Scroll for more'}
            </li>
          </ul>
        ) : (
          <div className="empty_state">
            <p>No measurement history available.</p>
          </div>
        )}
      </div>

      <BottomSheet isOpen={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <PlantSettings plantId={id} onClose={() => setSettingsOpen(false)} />
      </BottomSheet>
    </div>
  )
}

export default PlantDetails
