export function getPlants() {
  const data = localStorage.getItem('plants')
  return data ? JSON.parse(data) : []
}

export function savePlants(plants) {
  localStorage.setItem('plants', JSON.stringify(plants))
}

export function addPlant(plant) {
  const plants = getPlants()
  const newPlant = {
    id: Date.now(),
    ...plant
  }
  plants.push(newPlant)
  savePlants(plants)
  return newPlant
}

export function getSelectedPlantId() {
  return localStorage.getItem('selected_plant_id') || '1'
}

export function setSelectedPlantId(id) {
  localStorage.setItem('selected_plant_id', id)
}

export function getLastMeasurements() {
  const data = localStorage.getItem('last_measurements')
  return data ? JSON.parse(data) : {}
}

export function saveLastMeasurements(measurements) {
  localStorage.setItem('last_measurements', JSON.stringify(measurements))
}
