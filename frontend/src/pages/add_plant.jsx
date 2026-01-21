import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { addPlant } from '../storage.js'
import { searchTreflePlants, getTrefleRecommendations } from '../api.js'

function AddPlant() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [photo, setPhoto] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedTrefle, setSelectedTrefle] = useState(null)
  const [recommendedThresholds, setRecommendedThresholds] = useState(null)
  const [showRecommended, setShowRecommended] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timeout = setTimeout(() => {
        searchTreflePlants(searchQuery)
          .then(result => {
            setSearchResults(result.data || [])
          })
          .catch(() => {
            setSearchResults([])
          })
      }, 400)
      return () => clearTimeout(timeout)
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const handleSelectTrefle = (plant) => {
    setSelectedTrefle(plant)
    setName(plant.common_name || plant.scientific_name)
    setSearchQuery('')
    setSearchResults([])
    
    getTrefleRecommendations(plant.id)
      .then(result => {
        if (result && result.recommendations) {
          setRecommendedThresholds(result.recommendations)
          setShowRecommended(true)
        }
      })
      .catch(() => {
        setRecommendedThresholds(null)
        setShowRecommended(false)
      })
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
        thresholds: recommendedThresholds
      })
      navigate('/')
    }
  }

  return (
    <div className="card">
      <h2 className="card_title">Add Plant</h2>
      <form onSubmit={handleSubmit}>
        <div className="form_group">
          <label htmlFor="plant-search" className="label">Search Plant (optional)</label>
          <input
            id="plant-search"
            type="text"
            className="input"
            placeholder="Search for plant name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
        </div>
        <div className="form_group">
          <label htmlFor="plant-name" className="label">Plant Name</label>
          <input
            id="plant-name"
            type="text"
            className="input"
            placeholder="Enter plant name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          {showRecommended && recommendedThresholds && (
            <div className="recommended_badge">
              Recommended values loaded
            </div>
          )}
        </div>
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
          <button type="button" className="btn_secondary" onClick={() => navigate('/')}>
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
