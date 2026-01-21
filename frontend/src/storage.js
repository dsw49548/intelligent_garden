export function getPlants() {
  const data = localStorage.getItem('plants')
  return data ? JSON.parse(data) : []
}

export function savePlants(plants) {
  localStorage.setItem('plants', JSON.stringify(plants))
}

export function getPlantById(id) {
  const plants = getPlants()
  return plants.find(p => p.id === id) || null
}

export function addPlant(plantData) {
  const plants = getPlants()
  const newPlant = {
    id: Date.now().toString(),
    name: plantData.name || 'Unnamed Plant',
    photo: plantData.photo || null,
    trefle: plantData.trefle || null,
    thresholds: plantData.thresholds || getDefaultThresholds(),
    created_at: new Date().toISOString()
  }
  plants.push(newPlant)
  savePlants(plants)
  return newPlant
}

export function updatePlant(id, updates) {
  const plants = getPlants()
  const index = plants.findIndex(p => p.id === id)
  if (index === -1) return null
  plants[index] = { ...plants[index], ...updates }
  savePlants(plants)
  return plants[index]
}

export function getDefaultThresholds() {
  return {
    soil_moisture_min: 30,
    soil_moisture_max: 70,
    air_temp_c_min: 18,
    air_temp_c_max: 28,
    air_humidity_min: 40,
    air_humidity_max: 70,
    light_lux_min: 500,
    light_lux_max: 5000
  }
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

export function getCachedLatest(plantId) {
  const cache = getLastMeasurements()
  return cache[plantId] || null
}

export function saveCachedLatest(plantId, measurement) {
  const cache = getLastMeasurements()
  cache[plantId] = measurement
  saveLastMeasurements(cache)
}

export function calculateStatus(measurement, thresholds) {
  if (!measurement) return 'NO DATA'
  
  const th = thresholds || getDefaultThresholds()
  let outOfRange = 0
  
  if (measurement.soil_moisture < th.soil_moisture_min || measurement.soil_moisture > th.soil_moisture_max) {
    outOfRange++
  }
  if (measurement.air_temp_c < th.air_temp_c_min || measurement.air_temp_c > th.air_temp_c_max) {
    outOfRange++
  }
  if (measurement.air_humidity < th.air_humidity_min || measurement.air_humidity > th.air_humidity_max) {
    outOfRange++
  }
  if (measurement.light_lux < th.light_lux_min || measurement.light_lux > th.light_lux_max) {
    outOfRange++
  }
  
  if (outOfRange === 0) return 'OK'
  if (outOfRange === 1) return 'WARN'
  return 'BAD'
}
