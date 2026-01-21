import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { addPlant } from '../storage.js'

function AddPlant() {
    const navigate = useNavigate()
    const [name, setName] = useState('')
    const [photo, setPhoto] = useState(null)
    const fileInputRef = useRef(null)

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
                photo: photo
            })
            navigate('/')
        }
    }

    return (
        <div className="card">
            <h2 className="card_title">Add Plant</h2>
            <form onSubmit={handleSubmit}>
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
