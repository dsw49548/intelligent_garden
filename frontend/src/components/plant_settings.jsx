import { useState, useRef } from 'react'
import { updatePlant, clearPlantMeasurements } from '../api.js'
import { savePhoto, deletePhoto, compressImage } from '../storage_photos.js'
import { useApp } from '../contexts/app_context.jsx'
import { THRESHOLD_RANGES } from '../storage.js'

const THRESHOLD_KEYS = ['soil_min', 'soil_max', 'temp_min', 'temp_max', 'hum_min', 'hum_max', 'light_min', 'light_max']
const DEVICE_ID = 'esp32-1'
const WATERING_FIELDS = [
    ['soil_trigger', 'Water when soil below (%)'],
    ['pump_ms', 'Pump time (ms)'],
    ['min_interval_min', 'Min. interval between waterings (min)'],
    ['soak_s', 'Soak time before check (s)'],
    ['min_rise', 'Min. soil rise after watering (%)']
]

function PlantSettings({ plant, onSave, onDelete, onCleared, onClose, onPhotoChange }) {
    const { showConfirm, showToast } = useApp()
    const [thresholds, setThresholds] = useState(() => Object.fromEntries(THRESHOLD_KEYS.map(k => [k, plant[k]])))
    const [name, setName] = useState(plant.name)
    const [errors, setErrors] = useState({})
    const [sensorOn, setSensorOn] = useState(plant.device_id === DEVICE_ID)
    const [autoWatering, setAutoWatering] = useState(Boolean(plant.auto_watering))
    const [watering, setWatering] = useState(() => Object.fromEntries(WATERING_FIELDS.map(([k]) => [k, plant[k]])))
    const fileInputRef = useRef(null)

    const validateThreshold = (key, min, max) => {
        const range = THRESHOLD_RANGES[key]

        if (min >= max) {
            return `${key}: min must be less than max`
        }
        if (min < range.min || min > range.max) {
            return `${key}: min out of range (${range.min}-${range.max})`
        }
        if (max < range.min || max > range.max) {
            return `${key}: max out of range (${range.min}-${range.max})`
        }
        return null
    }

    const handleChange = (key, type, value) => {
        const numValue = parseFloat(value)
        if (isNaN(numValue)) return

        setThresholds(prevThresholds => {
            const newThresholds = { ...prevThresholds }
            const minKey = `${key}_min`
            const maxKey = `${key}_max`
            const currentMin = prevThresholds[minKey]
            const currentMax = prevThresholds[maxKey]
            const range = THRESHOLD_RANGES[key]

            if (type === 'min') {
                const clampedValue = Math.max(range.min, Math.min(numValue, currentMax - 1))
                newThresholds[minKey] = clampedValue
            } else {
                const clampedValue = Math.min(range.max, Math.max(numValue, currentMin + 1))
                newThresholds[maxKey] = clampedValue
            }

            return newThresholds
        })
        const newErrors = { ...errors }
        delete newErrors[key]
        setErrors(newErrors)
    }

    const handleSave = async () => {
        const allErrors = {}
        Object.keys(thresholds).forEach(key => {
            if (key.endsWith('_min')) {
                const paramKey = key.replace('_min', '')
                const min = thresholds[key]
                const max = thresholds[`${paramKey}_max`]
                const error = validateThreshold(paramKey, min, max)
                if (error) {
                    allErrors[paramKey] = error
                }
            }
        })

        if (Object.keys(allErrors).length > 0) {
            setErrors(allErrors)
            return
        }

        if (!name.trim()) {
            showToast('Error: Name is required', 'error')
            return
        }

        try {
            const wateringValues = Object.fromEntries(WATERING_FIELDS.map(([k]) => [k, parseInt(watering[k], 10)]))
            const updated = await updatePlant(plant.id, {
                name: name.trim(),
                ...thresholds,
                ...wateringValues,
                auto_watering: autoWatering,
                device_id: sensorOn ? DEVICE_ID : null
            })
            showToast('Saved', 'success')
            onSave(updated)
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error')
        }
    }

    const handleClearMeasurements = () => {
        showConfirm(
            'Clear measurements?',
            'All measurements of this plant will be deleted. This action cannot be undone.',
            async () => {
                try {
                    const result = await clearPlantMeasurements(plant.id)
                    showToast(`Deleted ${result.deleted} measurements`, 'success')
                    onCleared()
                } catch (err) {
                    showToast(`Error: ${err.message}`, 'error')
                }
            },
            'Clear'
        )
    }

    const handlePhotoFile = async (e) => {
        const file = e.target.files[0]
        e.target.value = ''
        if (!file) return
        if (file.size > 5 * 1024 * 1024) {
            showToast('Error: Photo is too large. Maximum size is 5 MB.', 'error')
            return
        }
        try {
            const compressed = await compressImage(file)
            await savePhoto(plant.id, compressed)
            showToast('Photo changed', 'success')
            onPhotoChange()
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error')
        }
    }

    const handleRemovePhoto = async () => {
        await deletePhoto(plant.id)
        showToast('Photo removed', 'success')
        onPhotoChange()
    }

    const renderThreshold = (key, label, unit = '') => {
        const minKey = `${key}_min`
        const maxKey = `${key}_max`
        const min = thresholds[minKey]
        const max = thresholds[maxKey]
        const range = THRESHOLD_RANGES[key]

        return (
            <div className="threshold_group" key={key}>
                <label className="threshold_label">{label}</label>
                <div className="threshold_slider_container">
                    <div className="threshold_slider_row">
                        <label className="threshold_slider_label">Min: {min}{unit}</label>
                        <input
                            type="range"
                            min={range.min}
                            max={range.max}
                            value={min}
                            onChange={(e) => handleChange(key, 'min', e.target.value)}
                            className="threshold_slider"
                        />
                    </div>
                    <div className="threshold_slider_row">
                        <label className="threshold_slider_label">Max: {max}{unit}</label>
                        <input
                            type="range"
                            min={range.min}
                            max={range.max}
                            value={max}
                            onChange={(e) => handleChange(key, 'max', e.target.value)}
                            className="threshold_slider"
                        />
                    </div>
                </div>
                {errors[key] && (
                    <div className="error_message">{errors[key]}</div>
                )}
            </div>
        )
    }

    return (
        <div className="plant_settings">
            <div className="plant_settings_header">
                <h2>Plant Settings</h2>
                <button className="close_button" onClick={onClose}>×</button>
            </div>
            <div className="plant_settings_content">
                <div className="form_group" style={{ marginBottom: '1.5rem' }}>
                    <label className="label" htmlFor="plant-name">Name</label>
                    <input
                        id="plant-name"
                        type="text"
                        className="input"
                        placeholder="Enter plant name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={50}
                    />
                    <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '0.25rem' }}>
                        {name.length}/50 characters
                    </div>
                </div>
                <h3>Sensor</h3>
                <label className="checkbox_row">
                    <input type="checkbox" checked={sensorOn} onChange={(e) => setSensorOn(e.target.checked)} />
                    Measured by ESP32 ({DEVICE_ID})
                </label>
                <h3>Watering</h3>
                <label className="checkbox_row">
                    <input type="checkbox" checked={autoWatering} onChange={(e) => setAutoWatering(e.target.checked)} />
                    Auto watering
                </label>
                {WATERING_FIELDS.map(([key, label]) => (
                    <div className="form_group" key={key}>
                        <label className="label" htmlFor={key}>{label}</label>
                        <input
                            id={key}
                            type="number"
                            className="input"
                            value={watering[key]}
                            onChange={(e) => setWatering({ ...watering, [key]: e.target.value })}
                        />
                    </div>
                ))}
                <h3>Photo</h3>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoFile}
                />
                <div className="photo_buttons_row" style={{ marginBottom: '1.5rem' }}>
                    <button className="btn_secondary" onClick={() => fileInputRef.current.click()}>
                        Change photo
                    </button>
                    <button className="btn_text" onClick={handleRemovePhoto}>
                        Remove photo
                    </button>
                </div>
                <h3>Thresholds</h3>
                {renderThreshold('soil', 'Soil Moisture', '%')}
                {renderThreshold('temp', 'Air Temperature', '°C')}
                {renderThreshold('hum', 'Air Humidity', '%')}
                {renderThreshold('light', 'Light', 'lux')}
                <button className="btn_secondary btn_reset" onClick={handleClearMeasurements}>
                    Clear measurements
                </button>
            </div>
            <div className="plant_settings_actions">
                <button className="btn_danger" onClick={onDelete}>Delete</button>
                <button className="btn_primary" onClick={handleSave}>Save</button>
            </div>
        </div>
    )
}

export default PlantSettings
