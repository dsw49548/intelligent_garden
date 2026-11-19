import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { calculateStatus } from '../storage.js'
import { getPlant, deletePlant, fetchLatestMeasurement, fetchMeasurements, fetchTreflePlantDetails, waterPlant, unblockPlant, getWaterings } from '../api.js'
import { deletePhoto } from '../storage_photos.js'
import { loadPlantPhoto } from '../utils/photo_loader.js'
import { useApp } from '../contexts/app_context.jsx'
import BottomSheet from '../components/bottom_sheet.jsx'
import PlantSettings from '../components/plant_settings.jsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const WATER_ML_PER_SEC = 6

function PlantDetails() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [plant, setPlant] = useState(null)
    const [trefleData, setTrefleData] = useState(null)
    const [measurement, setMeasurement] = useState(null)
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [limit, setLimit] = useState(50)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [lastUpdated, setLastUpdated] = useState(null)
    const [coverImage, setCoverImage] = useState(null)
    const [waterings, setWaterings] = useState([])
    const [waterLeft, setWaterLeft] = useState(null)
    const [waitingFor, setWaitingFor] = useState(null)
    const loadMoreRef = useRef(null)

    useEffect(() => {
        getPlant(id)
            .then(async (foundPlant) => {
                setPlant(foundPlant)
                setLoading(false)
                if (!foundPlant) return
                setCoverImage(await loadPlantPhoto(foundPlant))
                if (foundPlant.trefle_id) {
                    fetchTreflePlantDetails(foundPlant.trefle_id).then(setTrefleData)
                }
            })
            .catch(() => setLoading(false))
    }, [id])

    const loadMeasurements = () => {
        fetchLatestMeasurement(id)
            .then(data => {
                setMeasurement(data)
                setLastUpdated(new Date())
            })
            .catch(() => {})
        fetchMeasurements(id, limit)
            .then(setHistory)
            .catch(() => {})
        getWaterings(id)
            .then(data => {
                setWaterings(data.waterings)
                setWaterLeft(data.water_left_ml)
            })
            .catch(() => {})
        getPlant(id)
            .then(p => p && setPlant(p))
            .catch(() => {})
    }

    useEffect(() => {
        if (!plant) return
        loadMeasurements()
        const interval = setInterval(loadMeasurements, 5000)
        return () => clearInterval(interval)
    }, [plant?.id, limit])

    useEffect(() => {
        if (!loadMoreRef.current) return
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && history.length >= limit && limit < 500) {
                    setLimit(limit + 50)
                }
            },
            { threshold: 1.0 }
        )
        observer.observe(loadMoreRef.current)
        return () => observer.disconnect()
    }, [history.length, limit])

    useEffect(() => {
        if (!waitingFor) return
        const lastId = waterings.length ? waterings[0].id : null
        if (lastId !== waitingFor.lastId || Date.now() > waitingFor.until) {
            setWaitingFor(null)
        }
    }, [waterings])

    const handlePlantUpdate = (updatedPlant) => {
        setPlant(updatedPlant)
        setIsSettingsOpen(false)
    }

    const handlePhotoChange = async () => {
        setCoverImage(await loadPlantPhoto(plant))
    }

    const handleMeasurementsCleared = () => {
        setIsSettingsOpen(false)
        setMeasurement(null)
        setHistory([])
    }

    const { showConfirm, showToast } = useApp()

    const handleWaterNow = async () => {
        try {
            await waterPlant(plant.id)
            setWaitingFor({ lastId: waterings.length ? waterings[0].id : null, until: Date.now() + 60000 })
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error')
        }
    }

    const handleUnblock = async () => {
        try {
            setPlant(await unblockPlant(plant.id))
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error')
        }
    }

    const handlePlantDelete = () => {
        showConfirm(
            'Delete this plant?',
            'This action cannot be undone. All measurements of this plant will be deleted too.',
            async () => {
                try {
                    await deletePlant(id)
                    await deletePhoto(id)
                    showToast('Plant deleted', 'success')
                    navigate('/')
                } catch (err) {
                    showToast(`Error: ${err.message}`, 'error')
                }
            }
        )
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

    const status = calculateStatus(measurement, plant)
    const statusClass = status === 'NO DATA' ? 'status_nodata' : `status_${status.toLowerCase()}`
    const commonName = plant.name
    const scientificName = plant.scientific_name || (trefleData && trefleData.scientific_name) || null
    const family = trefleData && trefleData.family
    const familyCommonName = trefleData && trefleData.family_common_name
    const genus = trefleData && trefleData.genus
    const nativeTo = trefleData && trefleData.native_to

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

    const hasCover = Boolean(coverImage)

    return (
        <div className="plant_details_page">
            {hasCover && (
                <div className="plant_cover_container">
                    <img src={coverImage} alt={commonName} className="plant_cover_image" />
                    <div className="plant_cover_gradient"></div>
                </div>
            )}

            <div className="plant_details_content">
                <div className="plant_names">
                    <h1 className="plant_common_name">{commonName}</h1>
                    {scientificName && (
                        <p className="plant_scientific_name">{scientificName}</p>
                    )}
                </div>

                <div className="plant_info">
                    <div className="plant_info_item">
                        {plant.device_id ? (
                            <>
                                <span className="plant_info_label">Sensor:</span>
                                <span className="plant_info_value">{plant.device_id}</span>
                            </>
                        ) : (
                            <span className="plant_info_label">No sensor</span>
                        )}
                    </div>
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

                <button className="btn_secondary stats_button" onClick={() => navigate(`/plant/${id}/stats`)}>
                    Statistics
                </button>

                <div className="card">
                    <div className="latest_header_row">
                        <h3 className="card_title" style={{ margin: 0 }}>Latest measurement</h3>
                        <span className={`status_badge ${statusClass}`}>
                            {statusEmoji[status]} {status}
                        </span>
                    </div>
                    {lastUpdated && (
                        <div className="last_updated_text">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </div>
                    )}
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

                <div className="card">
                    <h3 className="card_title">Watering</h3>
                    {plant.blocked && (
                        <div className="watering_blocked">
                            <span>{plant.block_reason || 'Watering is blocked'}</span>
                            <button className="btn_secondary" onClick={handleUnblock}>Unblock</button>
                        </div>
                    )}
                    <p className="watering_left">Water left today: {waterLeft ?? '-'} ml</p>
                    <button
                        className="btn_primary"
                        onClick={handleWaterNow}
                        disabled={!plant.device_id || plant.blocked || waterLeft === null || waterLeft < 10 || waitingFor !== null}
                    >
                        {waitingFor ? 'Waiting for device...' : 'Water now'}
                    </button>
                    {waterings.length > 0 && (
                        <ul className="measurement_list" style={{ marginTop: '1rem' }}>
                            {waterings.map(w => (
                                <li key={w.id} className="measurement_item">
                                    <span className="measurement_timestamp">{new Date(w.started_at).toLocaleString()}</span>
                                    <span className="measurement_values">
                                        {w.trigger} | {Math.round(w.duration_ms * WATER_ML_PER_SEC / 1000)} ml | {w.soil_before}% → {w.soil_after}% | <span className={`watering_${w.result}`}>{w.result}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
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
                                    {history.length >= limit && limit < 500 ? 'Loading more...' : 'No more measurements'}
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
                    plant={plant}
                    onSave={handlePlantUpdate}
                    onDelete={handlePlantDelete}
                    onCleared={handleMeasurementsCleared}
                    onPhotoChange={handlePhotoChange}
                    onClose={() => setIsSettingsOpen(false)}
                />
            </BottomSheet>
        </div>
    )
}

export default PlantDetails
