import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDefaultThresholds } from '../storage.js'
import { createPlant, searchTreflePlants, getTrefleRecommendations } from '../api.js'
import { savePhoto, deletePhoto, compressImage } from '../storage_photos.js'

function AddPlant() {
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [name, setName] = useState('')
    const [photo, setPhoto] = useState(null)
    const [photoFile, setPhotoFile] = useState(null)
    const [photoFileName, setPhotoFileName] = useState(null)
    const [searchResults, setSearchResults] = useState([])
    const [selectedTrefle, setSelectedTrefle] = useState(null)
    const [thresholds, setThresholds] = useState(getDefaultThresholds())
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchError, setSearchError] = useState(null)
    const [submitError, setSubmitError] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const fileInputRef = useRef(null)
    const searchTimeoutRef = useRef(null)

    const debounceSearch = useCallback((searchQuery) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }
        searchTimeoutRef.current = setTimeout(() => {
            if (searchQuery.length >= 3 && selectedTrefle === null) {
                setSearchLoading(true)
                setSearchError(null)
                searchTreflePlants(searchQuery)
                    .then(result => {
                        const data = result.data || result.plants || []
                        setSearchResults(data.slice(0, 20))
                        setSearchLoading(false)
                    })
                    .catch((err) => {
                        console.error('Trefle search error:', err)
                        let errorMessage = 'Search failed'
                        if (err.message) {
                            errorMessage = err.message
                        } else if (err.status) {
                            errorMessage = `HTTP ${err.status}: ${err.statusText || 'Unknown error'}`
                        }
                        setSearchError(errorMessage)
                        setSearchResults([])
                        setSearchLoading(false)
                    })
            } else {
                setSearchResults([])
                setSearchLoading(false)
                setSearchError(null)
            }
        }, 400)
    }, [selectedTrefle])

    useEffect(() => {
        if (selectedTrefle === null) {
            debounceSearch(query)
        }
    }, [query, selectedTrefle, debounceSearch])

    const handleSelectTrefle = (plant) => {
        const plantName = plant.common_name || plant.scientific_name
        setSelectedTrefle(plant)
        setQuery(plantName)
        setName(plantName)
        setSearchResults([])
        setSearchLoading(false)
        setSearchError(null)

        getTrefleRecommendations(plant.id)
            .then(result => {
                if (result && result.recommendations) {
                    setThresholds(result.recommendations)
                } else {
                    setThresholds(getDefaultThresholds())
                }
            })
            .catch(() => {
                setThresholds(getDefaultThresholds())
            })
    }

    const handleQueryChange = (value) => {
        setQuery(value)
        setName(value)
        if (selectedTrefle !== null) {
            setSelectedTrefle(null)
        }
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

    const handleThresholdChange = (key, type, value) => {
        const numValue = parseFloat(value)
        if (isNaN(numValue)) return

        setThresholds(prevThresholds => {
            const defaults = getDefaultThresholds()
            const baseThresholds = prevThresholds || defaults
            const newThresholds = { ...baseThresholds }
            const minKey = `${key}_min`
            const maxKey = `${key}_max`
            const currentMin = baseThresholds[minKey] ?? defaults[minKey]
            const currentMax = baseThresholds[maxKey] ?? defaults[maxKey]
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
    }

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0]
        if (file) {
            const maxSize = 5 * 1024 * 1024
            if (file.size > maxSize) {
                setSubmitError('Photo is too large. Maximum size is 5 MB.')
                setPhoto(null)
                setPhotoFile(null)
                setPhotoFileName(null)
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                }
                return
            }

            setPhotoFileName(file.name)
            setPhotoFile(file)
            setSubmitError(null)

            try {
                const compressed = await compressImage(file)
                setPhoto(compressed)
            } catch (err) {
                setSubmitError(err.message || 'Failed to process photo')
                setPhoto(null)
                setPhotoFile(null)
                setPhotoFileName(null)
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                }
            }
        }
    }

    const handleRemovePhoto = () => {
        setPhoto(null)
        setPhotoFile(null)
        setPhotoFileName(null)
        setSubmitError(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleCameraClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.setAttribute('capture', 'environment')
            fileInputRef.current.setAttribute('accept', 'image/*')
            fileInputRef.current.click()
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        e.stopPropagation()

        const plantName = (name || query || '').trim()
        if (!plantName) {
            setSubmitError('Plant name is required')
            return
        }

        if (isSubmitting) {
            return
        }

        setIsSubmitting(true)
        setSubmitError(null)

        try {
            const plant = await createPlant({
                name: plantName,
                scientific_name: selectedTrefle ? selectedTrefle.scientific_name : null,
                trefle_id: selectedTrefle ? selectedTrefle.id : null,
                image_url: selectedTrefle ? selectedTrefle.image_url : null,
                ...thresholds
            })
            await deletePhoto(plant.id)
            if (photo) {
                await savePhoto(plant.id, photo)
            }
            navigate('/')
        } catch (err) {
            setSubmitError(err.message || 'Failed to add plant')
            setIsSubmitting(false)
        }
    }

    const renderThreshold = (key, label, unit = '') => {
        const minKey = `${key}_min`
        const maxKey = `${key}_max`
        const defaults = getDefaultThresholds()
        const min = thresholds?.[minKey] ?? defaults[minKey]
        const max = thresholds?.[maxKey] ?? defaults[maxKey]
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
                            onChange={(e) => handleThresholdChange(key, 'min', e.target.value)}
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
                            onChange={(e) => handleThresholdChange(key, 'max', e.target.value)}
                            className="threshold_slider"
                        />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="card">
            <h2 className="card_title">Add Plant</h2>
            <form onSubmit={handleSubmit}>
                <div className="form_group" style={{ position: 'relative' }}>
                    <label htmlFor="plant-name" className="label">Plant name</label>
                    <input
                        id="plant-name"
                        type="text"
                        className="input"
                        placeholder="Enter plant name or search Trefle"
                        value={query}
                        onChange={(e) => handleQueryChange(e.target.value)}
                        onBlur={(e) => {
                            setTimeout(() => {
                                if (!e.relatedTarget || !e.relatedTarget.closest('.search_results_dropdown')) {
                                    if (selectedTrefle === null) {
                                        setSearchResults([])
                                    }
                                }
                            }, 200)
                        }}
                        required
                    />
                    {selectedTrefle === null && (searchLoading || searchError || searchResults.length > 0 || (query.length >= 3 && searchResults.length === 0 && !searchLoading && !searchError)) && (
                        <div className="search_results_dropdown">
                            {searchLoading && (
                                <div className="search_result_item" style={{ color: '#aaa', fontStyle: 'italic' }}>
                                    Loading...
                                </div>
                            )}
                            {searchError && (
                                <div className="search_result_item" style={{ color: '#ff6b6b' }}>
                                    Error: {searchError}
                                </div>
                            )}
                            {!searchLoading && !searchError && searchResults.length > 0 && (
                                searchResults.map(plant => (
                                    <div
                                        key={plant.id}
                                        className="search_result_item"
                                        onClick={() => handleSelectTrefle(plant)}
                                        onMouseDown={(e) => e.preventDefault()}
                                    >
                                        <div>
                                            <strong>{plant.common_name || plant.scientific_name}</strong>
                                            {plant.scientific_name && plant.common_name && (
                                                <div className="search_result_scientific">{plant.scientific_name}</div>
                                            )}
                                            {plant.family && (
                                                <div className="search_result_scientific">{plant.family}</div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                            {!searchLoading && !searchError && query.length >= 3 && searchResults.length === 0 && (
                                <div className="search_result_item" style={{ color: '#aaa', fontStyle: 'italic' }}>
                                    No matches - try the full name, e.g. monstera
                                </div>
                            )}
                        </div>
                    )}
                    {selectedTrefle && (
                        <div className="recommended_badge" style={{ marginTop: '0.5rem' }}>
                            Recommended values loaded
                        </div>
                    )}
                </div>

                {name.length > 0 && (
                    <div className="form_group">
                        <h3 className="card_subtitle" style={{ marginBottom: '1rem' }}>Plant thresholds</h3>
                        {renderThreshold('soil', 'Soil Moisture', '%')}
                        {renderThreshold('temp', 'Air Temperature', '°C')}
                        {renderThreshold('hum', 'Air Humidity', '%')}
                        {renderThreshold('light', 'Light', 'lux')}
                    </div>
                )}

                <div className="form_group">
                    <label className="label">Photo (optional)</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handlePhotoChange}
                    />
                    {!photo ? (
                        <button type="button" className="btn_secondary" onClick={handleCameraClick}>
                            Take Photo
                        </button>
                    ) : (
                        <>
                            <div className="photo_attachment_row">
                                <span className="photo_attachment_icon">🖼️</span>
                                <div className="photo_attachment_info">
                                    <div className="photo_attachment_label">Photo attached</div>
                                    {photoFileName && (
                                        <div className="photo_attachment_filename">{photoFileName}</div>
                                    )}
                                </div>
                            </div>
                            <div className="photo_buttons_row">
                                <button type="button" className="btn_secondary" onClick={handleCameraClick}>
                                    Change Photo
                                </button>
                                <button type="button" className="btn_text" onClick={handleRemovePhoto}>
                                    Remove
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {submitError && (
                    <div className="form_group" style={{ marginTop: '1rem' }}>
                        <div style={{ color: '#ff6b6b', fontSize: '0.9rem', padding: '0.75rem', background: '#5a2d2d', borderRadius: '6px', border: '1px solid #7a3a3a' }}>
                            {submitError}
                        </div>
                    </div>
                )}

                <div className="form_actions">
                    <button type="button" className="btn_secondary" onClick={() => navigate('/')} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn_primary"
                        disabled={!(name || query || '').trim() || isSubmitting}
                    >
                        {isSubmitting ? 'Adding...' : 'Add Plant'}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default AddPlant
