import { useParams } from 'react-router-dom'

function PlantDetails() {
  const { id } = useParams()

  return (
    <div className="card">
      <h2 className="card_title">Plant Details</h2>
      <p>Plant ID: {id}</p>
      <p>Plant details will be implemented in next stages.</p>
    </div>
  )
}

export default PlantDetails
