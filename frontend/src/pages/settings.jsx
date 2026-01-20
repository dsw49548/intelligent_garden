import { useState, useEffect, useRef } from 'react'
import { getPlants, addPlant, setSelectedPlantId, deletePlant } from '../storage.js'

function Settings() {
  const [plants, setPlants] = useState([])
  const [name, setName] = useState('')
  const [photo, setPhoto] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setPlants(getPlants())
  }, [])

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

  const handleAddPlant = () => {
    if (name.trim()) {
      const newPlant = addPlant({
        name: name.trim(),
        photo: photo
      })
      setPlants(getPlants())
      setName('')
      setPhoto(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSelectPlant = (id) => {
    setSelectedPlantId(id.toString())
    alert('Plant selected')
  }

  const handleDeletePlant = (id) => {
    if (confirm('Are you sure you want to delete this plant?')) {
      deletePlant(id)
      setPlants(getPlants())
    }
  }

  return (
    <>
      <div className="card">
        <div className="card_title">Add Plant</div>
        <label className="label">Plant Name</label>
        <input
          type="text"
          className="input"
          placeholder="Enter plant name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handlePhotoChange}
        />
        <button className="btn_primary" onClick={handleCameraClick} style={{ marginTop: 0 }}>
          Take Photo
        </button>
        {photo && (
          <img src={photo} alt="Preview" className="plant_image" style={{ marginTop: '1rem' }} />
        )}
        <button className="btn_primary" onClick={handleAddPlant} disabled={!name.trim()}>
          Add Plant
        </button>
      </div>
      <div className="card">
        <div className="card_title">My Plants</div>
        {plants.length === 0 ? (
          <div className="empty_state" style={{ padding: '1rem' }}>
            <p>No plants added yet</p>
          </div>
        ) : (
          <div>
            {plants.map(plant => (
              <div key={plant.id} className="plant_mini">
                {plant.photo ? (
                  <img src={plant.photo} alt={plant.name} className="plant_mini_img" />
                ) : (
                  <div className="plant_mini_img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                    📷
                  </div>
                )}
                <div className="plant_mini_info">
                  <div className="plant_mini_name">{plant.name}</div>
                </div>
                <div className="plant_mini_actions">
                  <button className="btn_small btn_secondary" onClick={() => handleSelectPlant(plant.id)}>
                    Select
                  </button>
                  <button className="btn_small btn_danger" onClick={() => handleDeletePlant(plant.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default Settings
