export function getPlants() {
  const data = localStorage.getItem('plants')
  return data ? JSON.parse(data) : []
}

export function savePlants(plants) {
  localStorage.setItem('plants', JSON.stringify(plants))
}

export function addPlant(plant) {
  const plants = getPlants()
  const maxId = plants.length > 0 ? Math.max(...plants.map(p => Number(p.id))) : 0
  const newId = maxId + 1
  const newPlant = {
    id: newId,
    ...plant
  }
  plants.push(newPlant)
  savePlants(plants)
  setActivePlantId(newId)
  return newPlant
}

export function deletePlant(plantId) {
  const plants = getPlants()
  const activeId = getActivePlantId()
  const filtered = plants.filter(p => Number(p.id) !== Number(plantId))
  savePlants(filtered)

  if (Number(activeId) === Number(plantId)) {
    if (filtered.length > 0) {
      setActivePlantId(filtered[0].id)
    } else {
      setActivePlantId(null)
    }
  }
}

export function getActivePlantId() {
  const id = localStorage.getItem('active_plant_id')
  if (id === null || id === 'null') return null
  return Number(id)
}

export function setActivePlantId(id) {
  if (id === null) {
    localStorage.removeItem('active_plant_id')
  } else {
    localStorage.setItem('active_plant_id', String(id))
  }
}

export function getSelectedPlantId() {
  const activeId = getActivePlantId()
  if (activeId !== null) {
    return String(activeId)
  }
  const plants = getPlants()
  if (plants.length > 0) {
    const firstId = plants[0].id
    setActivePlantId(firstId)
    return String(firstId)
  }
  return '1'
}

export function setSelectedPlantId(id) {
  setActivePlantId(Number(id))
}

export function getLastMeasurements() {
  const data = localStorage.getItem('last_measurements')
  return data ? JSON.parse(data) : {}
}

export function saveLastMeasurements(measurements) {
  localStorage.setItem('last_measurements', JSON.stringify(measurements))
}
