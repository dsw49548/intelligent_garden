import { getPhoto } from '../storage_photos.js'

export async function loadPlantPhoto(plant) {
  if (!plant) return null
  return (await getPhoto(plant.id)) || plant.image_url || null
}
