import { getPhoto } from '../storage_photos.js'

export async function loadPlantPhoto(plant) {
  if (!plant || !plant.photo) {
    return null
  }
  
  if (plant.photo.startsWith('indexeddb:')) {
    const plantId = plant.photo.replace('indexeddb:', '')
    return await getPhoto(plantId)
  }
  
  return plant.photo
}
