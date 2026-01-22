const DB_NAME = 'intelligent_garden_photos'
const STORE_NAME = 'photos'
const DB_VERSION = 1

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
  
  return dbPromise
}

export async function savePhoto(plantId, dataUrl) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(dataUrl, `plant_${plantId}`)
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    return false
  }
}

export async function getPhoto(plantId) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(`plant_${plantId}`)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    return null
  }
}

export async function deletePhoto(plantId) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(`plant_${plantId}`)
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    return false
  }
}

export async function clearAllPhotos() {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.clear()
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    return false
  }
}
