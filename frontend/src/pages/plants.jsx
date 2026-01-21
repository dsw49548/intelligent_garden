import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getPlants } from '../storage.js'

function Plants() {
  const [plants, setPlants] = useState([])

  useEffect(() => {
    setPlants(getPlants())
  }, [])

  return (
    <div className="plants_list_container">
      {plants.map(plant => (
        <Link key={plant.id} to={`/plant/${plant.id}`} className="plant_tile">
          {plant.photo && (
            <img src={plant.photo} alt={plant.name} className="plant_tile_photo" />
          )}
          <div className="plant_tile_info">
            <h3>{plant.name}</h3>
            <span className="status_badge status_nodata">NO DATA</span>
          </div>
        </Link>
      ))}
      <Link to="/add" className="plant_tile plant_tile_add">
        <div className="plant_tile_add_icon">+</div>
        <div className="plant_tile_info">
          <h3>Add plant</h3>
        </div>
      </Link>
    </div>
  )
}

export default Plants
