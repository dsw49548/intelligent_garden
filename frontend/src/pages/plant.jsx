import { useParams } from 'react-router-dom'

function Plant() {
  const { id } = useParams()
  return (
    <div>
      <h1>Plant {id}</h1>
    </div>
  )
}

export default Plant
