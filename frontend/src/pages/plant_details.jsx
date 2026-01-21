import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { getPlantById, getCachedLatest, saveCachedLatest, calculateStatus, getCachedHistory, saveCachedHistory, updatePlant, deletePlant } from '../storage.js'
import { fetchLatestMeasurement, fetchMeasurements, fetchTreflePlantDetails } from '../api.js'
import BottomSheet from '../components/bottom_sheet.jsx'
import PlantSettings from '../components/plant_settings.jsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

function PlantDetails() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [plant, setPlant] = useState(null)
    const [trefleData, setTrefleData] = useState(null)
    const [measurement, setMeasurement] = useState(null)
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState('NO DATA')
    const [limit, setLimit] = useState(50)
    const [loadingMore, setLoadingMore] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [lastUpdated, setLastUpdated] = useState(null)
    const loadMoreRef = useRef(null)
    const observerRef = useRef(null)

    const loadPlant = () => {
        const foundPlant = getPlantById(id)
        if (!foundPlant) {
            setLoading(false)
            return
        }
        setPlant(foundPlant)

        if (foundPlant.trefle && foundPlant.trefle.id) {
            fetchTreflePlantDetails(foundPlant.trefle.id)
                .then(data => {
                    if (data) {
                        setTrefleData(data)
                        const mergedTrefle = { ...foundPlant.trefle, ...data }
                        updatePlant(id, { trefle: mergedTrefle })
                        setPlant({ ...foundPlant, trefle: mergedTrefle })
                    }
                })
                .catch(() => { })
        }
    }

    const loadMeasurement = () => {
        fetchLatestMeasurement(id)
            .then(data => {
                if (data) {
                    setMeasurement(data)
                    saveCachedLatest(id, data)
                    setStatus(calculateStatus(data, plant?.thresholds))
                    setLastUpdated(new Date())
                } else {
                    const cached = getCachedLatest(id)
                    if (cached) {
                        setMeasurement(cached)
                        setStatus(calculateStatus(cached, plant?.thresholds))
                    } else {
                        setMeasurement(null)
                        setStatus('NO DATA')
                    }
                    setLastUpdated(new Date())
                }
                setLoading(false)
            })
            .catch(() => {
                const cached = getCachedLatest(id)
                if (cached) {
                    setMeasurement(cached)
                    setStatus(calculateStatus(cached, plant?.thresholds))
                } else {
                    setMeasurement(null)
                    setStatus('NO DATA')
                }
                setLoading(false)
            })
    }

    const loadHistory = (currentLimit = limit) => {
        const cached = getCachedHistory(id)
        if (cached && cached.length > 0) {
            setHistory(cached)
        }

        fetchMeasurements(id, currentLimit)
            .then(data => {
                if (data && data.length > 0) {
                    const sorted = [...data].sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))
                    const unique = sorted.filter((m, idx, arr) => arr.findIndex(x => x.id === m.id) === idx)
                    setHistory(unique)
                    saveCachedHistory(id, unique)
                } else {
                    setHistory([])
                }
            })
            .catch(() => {
                if (!cached || cached.length === 0) {
                    setHistory([])
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
                    setHistory(unique)
                    saveCachedHistory(id, unique)
                }
                setLoadingMore(false)
            })
            .catch(() => {
                setLoadingMore(false)
            })
    }

    useEffect(() => {
        loadPlant()
    }, [id])

    useEffect(() => {
        if (!plant) return

        loadMeasurement()
        loadHistory()

        const interval = setInterval(() => {
            loadMeasurement()
        }, 10000)

        return () => clearInterval(interval)
    }, [plant?.id, id])

    useEffect(() => {
        if (!loadMoreRef.current) return

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loadingMore) {
                    loadMore()
                }
            },
            { threshold: 1.0 }
        )

        observerRef.current.observe(loadMoreRef.current)

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect()
            }
        }
    }, [loadingMore])

    const handlePlantUpdate = (updatedPlant) => {
        setPlant(updatedPlant)
        setIsSettingsOpen(false)
        loadMeasurement()
    }

    const handlePlantDelete = () => {
        if (window.confirm('Are you sure you want to delete this plant?')) {
            deletePlant(id)
            navigate('/')
        }
    }

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
        return (
            <div className="card">
                <div className="empty_state">
                    <p>Plant not found</p>
                </div>
            </div>
        )
    }

    const statusEmoji = {
        'OK': '🟢',
        'WARN': '🟡',
        'BAD': '🔴',
        'NO DATA': '⚪'
    }

    const statusClass = status === 'NO DATA' ? 'status_nodata' : `status_${status.toLowerCase()}`

    const coverImage = plant.photo || (trefleData && trefleData.image_url) || (plant.trefle && plant.trefle.image_url) || null
    const commonName = (trefleData && trefleData.common_name) || (plant.trefle && plant.trefle.common_name) || plant.name
    const scientificName = (trefleData && trefleData.scientific_name) || (plant.trefle && plant.trefle.scientific_name) || null
    const family = (trefleData && trefleData.family) || (plant.trefle && plant.trefle.family) || null
    const familyCommonName = (trefleData && trefleData.family_common_name) || (plant.trefle && plant.trefle.family_common_name) || null
    const genus = (trefleData && trefleData.genus) || (plant.trefle && plant.trefle.genus) || null
    const nativeTo = (trefleData && trefleData.native_to) || (plant.trefle && plant.trefle.native_to) || null

    const validHistory = history.filter(m => m.measured_at && !isNaN(new Date(m.measured_at).getTime()))
    const sortedHistory = [...validHistory].sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at))

    const chartLabels = sortedHistory.map(m => new Date(m.measured_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }))
    const soilData = sortedHistory.map(m => m.soil_moisture)
    const tempData = sortedHistory.map(m => m.air_temp_c)
    const humidityData = sortedHistory.map(m => m.air_humidity)
    const lightData = sortedHistory.map(m => m.light_lux)

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
            },
            title: { display: false }
        },
        scales: {
            x: {
                ticks: { font: { size: 10 }, maxTicksLimit: 6 },
                grid: { color: '#2a2a2a' }
            },
            y: {
                ticks: { font: { size: 10 } },
                grid: { color: '#2a2a2a' }
            }
        }
    }

    const chartData1 = {
        labels: chartLabels,
        datasets: [
            { label: 'Soil Moisture (%)', data: soilData, borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.2)', tension: 0.4 },
            { label: 'Temperature (°C)', data: tempData, borderColor: 'rgb(255, 99, 132)', backgroundColor: 'rgba(255, 99, 132, 0.2)', tension: 0.4 },
            { label: 'Humidity (%)', data: humidityData, borderColor: 'rgb(54, 162, 235)', backgroundColor: 'rgba(54, 162, 235, 0.2)', tension: 0.4 }
        ]
    }

    const chartData2 = {
        labels: chartLabels,
        datasets: [
            { label: 'Light (lux)', data: lightData, borderColor: 'rgb(255, 206, 86)', backgroundColor: 'rgba(255, 206, 86, 0.2)', tension: 0.4 }
        ]
    }

    return (
        <div className="plant_details_page">
            {coverImage ? (
                <div className="plant_cover_container">
                    <img src={coverImage} alt={commonName} className="plant_cover_image" />
                    <div className="plant_cover_gradient"></div>
                </div>
            ) : (
                <div className="plant_cover_placeholder">
                    <div className="plant_cover_placeholder_content">
                        <span className="plant_cover_placeholder_icon">🌱</span>
                        <span className="plant_cover_placeholder_text">No photo yet</span>
                    </div>
                </div>
            )}

            <div className="plant_details_content">
                <div className="plant_names">
                    <h1 className="plant_common_name">{commonName}</h1>
                    {scientificName && (
                        <p className="plant_scientific_name">{scientificName}</p>
                    )}
                </div>

                {(family || genus || nativeTo) && (
                    <div className="plant_info">
                        {family && (
                            <div className="plant_info_item">
                                <span className="plant_info_label">Family:</span>
                                <span className="plant_info_value">
                                    {family}
                                    {familyCommonName && ` (${familyCommonName})`}
                                </span>
                            </div>
                        )}
                        {genus && (
                            <div className="plant_info_item">
                                <span className="plant_info_label">Genus:</span>
                                <span className="plant_info_value">{genus}</span>
                            </div>
                        )}
                        {nativeTo && (
                            <div className="plant_info_item">
                                <span className="plant_info_label">Native to:</span>
                                <span className="plant_info_value">{nativeTo}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="plant_status_section">
                    <span className={`status_badge ${statusClass}`}>
                        Status: {statusEmoji[status]} {status}
                    </span>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h3 className="card_title" style={{ margin: 0 }}>Latest measurement</h3>
                        {lastUpdated && (
                            <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                                Last updated: {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                    {measurement ? (
                        <div className="measurement_info">
                            <div className="kv">
                                <span className="kv_label">Soil moisture</span>
                                <span className="kv_value">{measurement.soil_moisture}%</span>
                            </div>
                            <div className="kv">
                                <span className="kv_label">Air temp</span>
                                <span className="kv_value">{measurement.air_temp_c.toFixed(1)}°C</span>
                            </div>
                            <div className="kv">
                                <span className="kv_label">Air humidity</span>
                                <span className="kv_value">{measurement.air_humidity.toFixed(1)}%</span>
                            </div>
                            <div className="kv">
                                <span className="kv_label">Light</span>
                                <span className="kv_value">{measurement.light_lux} lux</span>
                            </div>
                        </div>
                    ) : (
                        <div className="empty_state">
                            <p>No measurements yet</p>
                        </div>
                    )}
                </div>

                {validHistory.length > 0 ? (
                    <>
                        <div className="card chart_card">
                            <h3 className="card_title">Charts</h3>
                            <div className="chart_section">
                                <h4 className="chart_subtitle">Soil, Temp, Humidity</h4>
                                <div className="chart_container">
                                    <Line data={chartData1} options={chartOptions} />
                                </div>
                            </div>
                            <div className="chart_section">
                                <h4 className="chart_subtitle">Light</h4>
                                <div className="chart_container">
                                    <Line data={chartData2} options={chartOptions} />
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="card_title">Measurements</h3>
                            <ul className="measurement_list">
                                {history.map(m => (
                                    <li key={m.id} className="measurement_item">
                                        <span className="measurement_timestamp">{new Date(m.measured_at).toLocaleString()}</span>
                                        <span className="measurement_values">
                                            Soil: {m.soil_moisture}% | Temp: {m.air_temp_c.toFixed(1)}°C | Light: {m.light_lux} lux
                                        </span>
                                    </li>
                                ))}
                                <li ref={loadMoreRef} className="load_more_trigger">
                                    {loadingMore ? 'Loading more...' : 'No more measurements'}
                                </li>
                            </ul>
                        </div>
                    </>
                ) : (
                    <div className="card">
                        <div className="empty_state">
                            <p>No measurements yet</p>
                        </div>
                    </div>
                )}

                <div className="plant_details_spacer"></div>
            </div>

            <button className="floating_settings_button" onClick={() => setIsSettingsOpen(true)}>
                ⚙ Plant settings
            </button>

            <BottomSheet isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}>
                <PlantSettings
                    plantId={id}
                    onSave={handlePlantUpdate}
                    onDelete={handlePlantDelete}
                    onClose={() => setIsSettingsOpen(false)}
                />
            </BottomSheet>
        </div>
    )
}

export default PlantDetails
