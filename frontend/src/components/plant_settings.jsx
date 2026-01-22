import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlantById, updatePlant, deletePlant, getDefaultThresholds } from '../storage.js'
import { useApp } from '../contexts/app_context.jsx'

function PlantSettings({ plantId, onSave, onDelete, onClose }) {
    const navigate = useNavigate()
    const { showConfirm, showToast } = useApp()
    const [plant, setPlant] = useState(null)
    const [thresholds, setThresholds] = useState(null)
    const [displayName, setDisplayName] = useState('')
    const [errors, setErrors] = useState({})
    const initializedRef = useRef(false)
    const plantIdRef = useRef(plantId)

    useEffect(() => {
        if (plantIdRef.current !== plantId) {
            initializedRef.current = false
            plantIdRef.current = plantId
        }

        const foundPlant = getPlantById(plantId)
        if (!foundPlant) {
            onClose()
            return
        }
        setPlant(foundPlant)

        if (!initializedRef.current) {
            const defaults = getDefaultThresholds()
            const plantThresholds = foundPlant.thresholds || {}
            const mergedThresholds = {
                ...defaults,
                ...plantThresholds
            }
            setThresholds(mergedThresholds)
            setDisplayName(foundPlant.displayName || '')
            initializedRef.current = true
        }
    }, [plantId])

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
            const defaults = getDefaultThresholds()
            const baseThresholds = prevThresholds || defaults
            const newThresholds = { ...baseThresholds }
            const minKey = `${key}_min`
            const maxKey = `${key}_max`
            const currentMin = baseThresholds[minKey] !== undefined ? baseThresholds[minKey] : defaults[minKey]
            const currentMax = baseThresholds[maxKey] !== undefined ? baseThresholds[maxKey] : defaults[maxKey]
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

    const handleSave = () => {
        if (!thresholds) {
            return
        }

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

        const thresholdsToSave = { ...thresholds }
        const trimmedDisplayName = displayName.trim()
        const displayNameToSave = trimmedDisplayName.length > 0 ? trimmedDisplayName : null

        const updates = {
            thresholds: thresholdsToSave,
            displayName: displayNameToSave
        }
        const updated = updatePlant(plantId, updates)
        if (updated) {
            showToast('Saved', 'success')
            if (onSave) {
                onSave(updated)
            } else {
                onClose()
            }
        } else {
            showToast('Error: Failed to save', 'error')
            console.error('Failed to update plant:', plantId)
        }
    }

    const handleDelete = () => {
        if (onDelete) {
            onDelete()
        } else {
            showConfirm(
                'Delete this plant?',
                'This action cannot be undone. This will also clear all cached measurements.',
                async () => {
                    await deletePlant(plantId)
                    const cache = JSON.parse(localStorage.getItem('last_measurements') || '{}')
                    delete cache[plantId]
                    if (cache.history) {
                        delete cache.history[plantId]
                    }
                    localStorage.setItem('last_measurements', JSON.stringify(cache))
                    showToast('Plant deleted', 'success')
                    navigate('/')
                }
            )
        }
    }

    if (!plant || !thresholds) return null

    const getRange = (key) => {
        const ranges = {
            soil_moisture: { min: 0, max: 100 },
            air_temp_c: { min: -10, max: 50 },
            air_humidity: { min: 0, max: 100 },
            light_lux: { min: 0, max: 20000 }
        }
        return ranges[key] || { min: 0, max: 100 }
    }

    const renderThreshold = (key, label, unit = '') => {
        const minKey = `${key}_min`
        const maxKey = `${key}_max`
        const defaults = getDefaultThresholds()
        const min = (thresholds && thresholds[minKey] !== undefined) ? thresholds[minKey] : defaults[minKey]
        const max = (thresholds && thresholds[maxKey] !== undefined) ? thresholds[maxKey] : defaults[maxKey]
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
                    <label className="label" htmlFor="display-name">Display name</label>
                    <input
                        id="display-name"
                        type="text"
                        className="input"
                        placeholder="Enter display name"
                        value={displayName}
                        onChange={(e) => {
                            const value = e.target.value
                            if (value.length <= 50) {
                                setDisplayName(value)
                            }
                        }}
                        maxLength={50}
                    />
                    <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '0.25rem' }}>
                        {displayName.length}/50 characters
                    </div>
                </div>
                <h3>Thresholds</h3>
                {renderThreshold('soil_moisture', 'Soil Moisture', '%')}
                {renderThreshold('air_temp_c', 'Air Temperature', '°C')}
                {renderThreshold('air_humidity', 'Air Humidity', '%')}
                {renderThreshold('light_lux', 'Light', 'lux')}
            </div>
            <div className="plant_settings_actions">
                <button className="btn_danger" onClick={handleDelete}>Delete</button>
                <button className="btn_primary" onClick={handleSave}>Save</button>
            </div>
        </div>
    )
}

export default PlantSettings
