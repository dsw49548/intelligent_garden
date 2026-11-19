import { useState } from 'react'
import { updatePlant, clearPlantMeasurements } from '../api.js'
import { useApp } from '../contexts/app_context.jsx'

const THRESHOLD_KEYS = ['soil_min', 'soil_max', 'temp_min', 'temp_max', 'hum_min', 'hum_max', 'light_min', 'light_max']

function PlantSettings({ plant, onSave, onDelete, onCleared, onClose }) {
    const { showConfirm, showToast } = useApp()
    const [thresholds, setThresholds] = useState(() => Object.fromEntries(THRESHOLD_KEYS.map(k => [k, plant[k]])))
    const [name, setName] = useState(plant.name)
    const [errors, setErrors] = useState({})

    const validateThreshold = (key, min, max) => {
        const range = getRange(key)

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
            const range = getRange(key)

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
            const updated = await updatePlant(plant.id, { name: name.trim(), ...thresholds })
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

    const getRange = (key) => {
        const ranges = {
            soil: { min: 0, max: 100 },
            temp: { min: -10, max: 50 },
            hum: { min: 0, max: 100 },
            light: { min: 0, max: 20000 }
        }
        return ranges[key] || { min: 0, max: 100 }
    }

    const renderThreshold = (key, label, unit = '') => {
        const minKey = `${key}_min`
        const maxKey = `${key}_max`
        const min = thresholds[minKey]
        const max = thresholds[maxKey]
        const range = getRange(key)

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
