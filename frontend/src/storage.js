export function getPlants() {
  const data = localStorage.getItem('plants')
  return data ? JSON.parse(data) : []
}

export function savePlants(plants) {
  localStorage.setItem('plants', JSON.stringify(plants))
}

export function getPlantById(id) {
  const plants = getPlants()
  const normalizedId = String(id)
  return plants.find(p => String(p.id) === normalizedId) || null
}

export async function addPlant(plantData) {
  const plants = getPlants()
  const maxId = plants.length > 0 ? Math.max(...plants.map(p => {
    const numId = parseInt(p.id, 10)
    return isNaN(numId) ? 0 : numId
  })) : 0
  const newId = String(maxId + 1)

  let photoUrl = null
  if (plantData.photo && plantData.photo.startsWith('data:image')) {
    const { savePhoto } = await import('./storage_photos.js')
    await savePhoto(newId, plantData.photo)
    photoUrl = `indexeddb:${newId}`
  } else {
    photoUrl = plantData.photo || (plantData.trefle && plantData.trefle.image_url) || null
  }

  const newPlant = {
    id: newId,
    name: plantData.name || 'Unnamed Plant',
    photo: photoUrl,
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
  const normalizedId = String(id)
  const index = plants.findIndex(p => String(p.id) === normalizedId)
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

export async function deletePlant(plantId) {
  const plants = getPlants()
  const filtered = plants.filter(p => p.id !== plantId)
  savePlants(filtered)

  const plant = plants.find(p => p.id === plantId)
  if (plant && plant.photo && plant.photo.startsWith('indexeddb:')) {
    const { deletePhoto } = await import('./storage_photos.js')
    await deletePhoto(plantId)
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


export function getLastMeasurements() {
  const data = localStorage.getItem('last_measurements')
  return data ? JSON.parse(data) : {}
}


export function getCachedLatest(plantId) {
  const cache = getLastMeasurements()
  return cache[plantId] || null
}

export function saveCachedLatest(plantId, measurement) {
  const cache = getLastMeasurements()
  cache[plantId] = measurement
  cache.lastFetchOk = true
  cache.lastFetchTime = new Date().toISOString()
  localStorage.setItem('last_measurements', JSON.stringify(cache))
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

export function getCachedHistory(plantId) {
  const cache = getLastMeasurements()
  return cache.history?.[plantId] || []
}

export function saveCachedHistory(plantId, measurements) {
  const cache = getLastMeasurements()
  if (!cache.history) cache.history = {}
  cache.history[plantId] = measurements
  localStorage.setItem('last_measurements', JSON.stringify(cache))
}

export async function resetAllData() {
  const theme = localStorage.getItem('theme')
  localStorage.clear()
  if (theme) {
    localStorage.setItem('theme', theme)
  }

  const { clearAllPhotos } = await import('./storage_photos.js')
  await clearAllPhotos()
}
