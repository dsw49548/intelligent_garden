import { useState, useEffect, useRef } from 'react'
import { getPlants, addPlant, savePlants } from '../storage.js'

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

  return (
    <div>
      <h1>Settings</h1>
      <div>
        <h2>Add Plant</h2>
        <input
          type="text"
          placeholder="Plant name"
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
        <button onClick={handleCameraClick}>Take Photo</button>
        {photo && <img src={photo} alt="Plant" style={{ maxWidth: '200px', marginTop: '1rem' }} />}
        <button onClick={handleAddPlant} style={{ marginTop: '1rem', display: 'block' }}>Add Plant</button>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <h2>Plants</h2>
        <ul>
          {plants.map(plant => (
            <li key={plant.id}>
              {plant.name}
              {plant.photo && <img src={plant.photo} alt={plant.name} style={{ maxWidth: '100px', marginLeft: '1rem' }} />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default Settings
