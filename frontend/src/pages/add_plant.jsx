import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { addPlant, getDefaultThresholds } from '../storage.js'
import { searchTreflePlants, getTrefleRecommendations } from '../api.js'

function AddPlant() {
    const navigate = useNavigate()
    const [name, setName] = useState('')
    const [photo, setPhoto] = useState(null)
    const [searchResults, setSearchResults] = useState([])
    const [selectedTrefle, setSelectedTrefle] = useState(null)
    const [thresholds, setThresholds] = useState(getDefaultThresholds())
    const [showThresholds, setShowThresholds] = useState(false)
    const fileInputRef = useRef(null)
    const searchTimeoutRef = useRef(null)

    const debounceSearch = useCallback((query) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }
        searchTimeoutRef.current = setTimeout(() => {
            if (query.length >= 2) {
                searchTreflePlants(query)
                    .then(result => {
                        const filtered = (result.data || []).filter(plant => {
                            const queryLower = query.toLowerCase()
                            const commonName = (plant.common_name || '').toLowerCase()
                            const scientificName = (plant.scientific_name || '').toLowerCase()
                            return commonName.startsWith(queryLower) || scientificName.startsWith(queryLower)
                        })
                        setSearchResults(filtered)
                    })
                    .catch(() => {
                        setSearchResults([])
                    })
            } else {
                setSearchResults([])
            }
        }, 350)
    }, [])

    useEffect(() => {
        setName(name)
        debounceSearch(name)
    }, [name, debounceSearch])

    const handleSelectTrefle = (plant) => {
        setSelectedTrefle(plant)
        setName(plant.common_name || plant.scientific_name)
        setSearchResults([])

        getTrefleRecommendations(plant.id)
            .then(result => {
                if (result && result.recommendations) {
                    setThresholds(result.recommendations)
                    setShowThresholds(true)
                } else {
                    setThresholds(getDefaultThresholds())
                    setShowThresholds(true)
                }
            })
            .catch(() => {
                setThresholds(getDefaultThresholds())
                setShowThresholds(true)
            })
    }

    const handleThresholdChange = (key, type, value) => {
        const numValue = parseFloat(value) || 0
        setThresholds(prev => ({
            ...prev,
            [`${key}_${type}`]: numValue
        }))
    }

    const handlePhotoChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (event) => {
                setPhoto(event.target.result)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleCameraClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.setAttribute('capture', 'environment')
            fileInputRef.current.setAttribute('accept', 'image/*')
            fileInputRef.current.click()
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (name.trim()) {
            addPlant({
                name: name.trim(),
                photo: photo,
                trefle: selectedTrefle,
                thresholds: thresholds
            })
            navigate('/')
        }
    }

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
                            onChange={(e) => handleThresholdChange(key, 'min', e.target.value)}
                        />
                        <span>{unit}</span>
                    </div>
                    <div className="threshold_input">
                        <label>Max</label>
                        <input
                            type="number"
                            value={max}
                            onChange={(e) => handleThresholdChange(key, 'max', e.target.value)}
                        />
                        <span>{unit}</span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="card">
            <h2 className="card_title">Add Plant</h2>
            <form onSubmit={handleSubmit}>
                <div className="form_group">
                    <label htmlFor="plant-name" className="label">Plant name</label>
                    <input
                        id="plant-name"
                        type="text"
                        className="input"
                        placeholder="Enter plant name or search Trefle"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    {searchResults.length > 0 && (
                        <div className="search_results">
                            {searchResults.map(plant => (
                                <div
                                    key={plant.id}
                                    className="search_result_item"
                                    onClick={() => handleSelectTrefle(plant)}
                                >
                                    <div>
                                        <strong>{plant.common_name || plant.scientific_name}</strong>
                                        {plant.scientific_name && plant.common_name && (
                                            <div className="search_result_scientific">{plant.scientific_name}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {selectedTrefle && (
                        <div className="recommended_badge" style={{ marginTop: '0.5rem' }}>
                            Recommended values loaded
                        </div>
                    )}
                </div>

                {showThresholds && (
                    <div className="form_group">
                        <h3 className="card_subtitle" style={{ marginBottom: '1rem' }}>Thresholds</h3>
                        {renderThreshold('soil_moisture', 'Soil Moisture', '%')}
                        {renderThreshold('air_temp_c', 'Air Temperature', '°C')}
                        {renderThreshold('air_humidity', 'Air Humidity', '%')}
                        {renderThreshold('light_lux', 'Light', 'lux')}
                    </div>
                )}

                <div className="form_group">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handlePhotoChange}
                    />
                    <button type="button" className="btn_secondary" onClick={handleCameraClick}>
                        {photo ? 'Change Photo' : 'Take Photo'}
                    </button>
                    {photo && (
                        <img src={photo} alt="Plant preview" className="photo_preview" />
                    )}
                </div>

                <div className="form_actions">
                    <button type="button" className="btn_text" onClick={() => navigate('/')}>
                        Cancel
                    </button>
                    <button type="submit" className="btn_primary" disabled={!name.trim()}>
                        Add Plant
                    </button>
                </div>
            </form>
        </div>
    )
}

export default AddPlant
