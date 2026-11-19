import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Chart } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarController, BarElement, LineController, LineElement, PointElement, Tooltip, Legend } from 'chart.js'
import { getPlant, getPlantStats } from '../api.js'

ChartJS.register(CategoryScale, LinearScale, BarController, BarElement, LineController, LineElement, PointElement, Tooltip, Legend)

const PERIODS = [[1, '24h'], [7, '7 days'], [30, '30 days']]
const PARAMS = [['soil', 'Soil moisture', '%'], ['temp', 'Air temp', '°C'], ['hum', 'Air humidity', '%'], ['light', 'Light', ' lux']]

function shortDate(date) {
    return `${date.slice(8, 10)}.${date.slice(5, 7)}`
}

function PlantStats() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [days, setDays] = useState(7)
    const [plant, setPlant] = useState(null)
    const [stats, setStats] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        getPlant(id).then(setPlant).catch(() => {})
    }, [id])

    useEffect(() => {
        setStats(null)
        setError(null)
        getPlantStats(id, days).then(setStats).catch(err => setError(err.message))
    }, [id, days])

    const renderContent = () => {
        if (error) return <div className="card empty_state"><p>Error: {error}</p></div>
        if (!stats) return <div className="card empty_state"><p>Loading...</p></div>
        if (stats.summary.count === 0) {
            return <div className="card empty_state"><p>No measurements in this period</p></div>
        }

        const { summary, in_range_pct: inRange, waterings, daily } = stats
        const hasChart = daily.some(d => d.drying_rate !== null)
        const chartData = {
            labels: daily.map(d => shortDate(d.date)),
            datasets: [
                { type: 'bar', label: 'Drying rate (%/h)', data: daily.map(d => d.drying_rate), backgroundColor: 'rgba(75, 192, 192, 0.6)', yAxisID: 'y' },
                { type: 'line', label: 'Avg light (lux)', data: daily.map(d => d.avg_light), borderColor: 'rgb(255, 206, 86)', backgroundColor: 'rgb(255, 206, 86)', yAxisID: 'y1' }
            ]
        }
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true } } },
            scales: {
                x: { ticks: { font: { size: 10 } }, grid: { color: '#2a2a2a' } },
                y: { position: 'left', beginAtZero: true, title: { display: true, text: '%/h' }, ticks: { font: { size: 10 } }, grid: { color: '#2a2a2a' } },
                y1: { position: 'right', beginAtZero: true, title: { display: true, text: 'lux' }, ticks: { font: { size: 10 } }, grid: { drawOnChartArea: false } }
            }
        }

        return (
            <>
                <p className="stats_period_info">
                    {summary.count} measurements, {new Date(summary.from).toLocaleString()} – {new Date(summary.to).toLocaleString()}
                </p>

                <div className="plant_tile_metrics stats_tiles">
                    {PARAMS.map(([key, label, unit]) => (
                        <div className="plant_metric" key={key}>
                            <span className="plant_metric_label">{label}</span>
                            <span className="plant_metric_value">{summary[key].avg}{unit}</span>
                            <span className="stats_tile_detail">{summary[key].min} – {summary[key].max}{unit}</span>
                            <span className="stats_tile_detail">{inRange[key]}% time in range</span>
                        </div>
                    ))}
                    <div className="plant_metric">
                        <span className="plant_metric_label">Drying rate</span>
                        <span className="plant_metric_value">{stats.drying_rate === null ? '—' : `${stats.drying_rate} %/h`}</span>
                    </div>
                    <div className="plant_metric">
                        <span className="plant_metric_label">Waterings</span>
                        <span className="plant_metric_value">{waterings.count}</span>
                        <span className="stats_tile_detail">{waterings.ok} ok / {waterings.no_effect} no effect</span>
                        <span className="stats_tile_detail">{waterings.total_ml} ml total</span>
                    </div>
                </div>

                <div className="card">
                    <h3 className="card_title">Drying rate vs light</h3>
                    {hasChart ? (
                        <div className="chart_container">
                            <Chart type="bar" data={chartData} options={chartOptions} />
                        </div>
                    ) : (
                        <div className="empty_state"><p>Not enough data to calculate drying rate</p></div>
                    )}
                </div>

                <div className="card">
                    <h3 className="card_title">Daily summary</h3>
                    <table className="stats_table">
                        <thead>
                            <tr>
                                <th>Day</th>
                                <th>Avg temp</th>
                                <th>Avg light</th>
                                <th>Drying %/h</th>
                                <th>Water&shy;ings</th>
                                <th>Water ml</th>
                            </tr>
                        </thead>
                        <tbody>
                            {daily.map(d => (
                                <tr key={d.date}>
                                    <td>{shortDate(d.date)}</td>
                                    <td>{d.avg_temp}°C</td>
                                    <td>{d.avg_light}</td>
                                    <td>{d.drying_rate ?? '—'}</td>
                                    <td>{d.waterings}</td>
                                    <td>{d.water_ml}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="stats_period_info">Days in UTC</p>
                </div>
            </>
        )
    }

    return (
        <div className="plant_details_page">
            <div className="plant_details_content">
                <button className="btn_text stats_back" onClick={() => navigate(`/plant/${id}`)}>← Back</button>
                <h1 className="plant_common_name">Statistics</h1>
                {plant && <p className="plant_scientific_name">{plant.name}</p>}

                <div className="stats_periods">
                    {PERIODS.map(([value, label]) => (
                        <button
                            key={value}
                            className={`btn_secondary ${days === value ? 'theme_toggle_active' : ''}`}
                            onClick={() => setDays(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {renderContent()}
            </div>
        </div>
    )
}

export default PlantStats
