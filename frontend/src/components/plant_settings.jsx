import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlantById, updatePlant, deletePlant, getDefaultThresholds } from '../storage.js'

function PlantSettings({ plantId, onClose }) {
    const navigate = useNavigate()
    const [plant, setPlant] = useState(null)
    const [thresholds, setThresholds] = useState(null)
    const [errors, setErrors] = useState({})

    useEffect(() => {
        const foundPlant = getPlantById(plantId)
        if (!foundPlant) {
            onClose()
            return
        }
        setPlant(foundPlant)
        setThresholds({ ...foundPlant.thresholds })
    }, [plantId, onClose])

    const validateThreshold = (key, min, max) => {
        const ranges = {
            soil_moisture: { min: 0, max: 100 },
            air_temp_c: { min: 0, max: 50 },
            air_humidity: { min: 0, max: 100 },
            light_lux: { min: 0, max: 200000 }
        }
        const range = ranges[key] || { min: 0, max: 1000 }

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
        const numValue = parseFloat(value) || 0
        const newThresholds = { ...thresholds }
        newThresholds[`${key}_${type}`] = numValue
        setThresholds(newThresholds)

        const min = type === 'min' ? numValue : newThresholds[`${key}_min`]
        const max = type === 'max' ? numValue : newThresholds[`${key}_max`]
        const error = validateThreshold(key, min, max)

        if (error) {
            setErrors({ ...errors, [key]: error })
        } else {
            const newErrors = { ...errors }
            delete newErrors[key]
            setErrors(newErrors)
        }
    }

    const handleSave = () => {
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

        updatePlant(plantId, { thresholds })
        onClose()
    }

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this plant? This will also clear all cached measurements.')) {
            deletePlant(plantId)
            const cache = JSON.parse(localStorage.getItem('last_measurements') || '{}')
            delete cache[plantId]
            if (cache.history) {
                delete cache.history[plantId]
            }
            localStorage.setItem('last_measurements', JSON.stringify(cache))
            navigate('/')
        }
    }

    if (!plant || !thresholds) return null

    const renderThreshold = (key, label, unit = '') => {
        const minKey = `${key}_min`
        const maxKey = `${key}_max`
        const min = thresholds[minKey] || 0
        const max = thresholds[maxKey] || 100

        return (
            <div className="threshold_group" key={key}>
                <label className="threshold_label">{label}</label>
                <div className="threshold_inputs">
                    <div className="threshold_input">
                        <label>Min</label>
                        <input
                            type="number"
                            value={min}
                            onChange={(e) => handleChange(key, 'min', e.target.value)}
                            className={errors[key] ? 'input_error' : ''}
                        />
                        <span>{unit}</span>
                    </div>
                    <div className="threshold_input">
                        <label>Max</label>
                        <input
                            type="number"
                            value={max}
                            onChange={(e) => handleChange(key, 'max', e.target.value)}
                            className={errors[key] ? 'input_error' : ''}
                        />
                        <span>{unit}</span>
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
                <h3>Thresholds</h3>
                {renderThreshold('soil_moisture', 'Soil Moisture', '%')}
                {renderThreshold('air_temp_c', 'Air Temperature', '°C')}
                {renderThreshold('air_humidity', 'Air Humidity', '%')}
                {renderThreshold('light_lux', 'Light', 'lux')}
            </div>
            <div className="plant_settings_actions">
                <button className="btn_danger" onClick={handleDelete}>Delete Plant</button>
                <button className="btn_primary" onClick={handleSave}>Save</button>
            </div>
        </div>
    )
}

export default PlantSettings
