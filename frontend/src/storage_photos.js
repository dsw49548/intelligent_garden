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

export function compressImage(file, maxWidth = 1280, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let width = img.width
                let height = img.height

                if (width > maxWidth) {
                    height = (height * maxWidth) / width
                    width = maxWidth
                }

                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, width, height)

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Compression failed'))
                        return
                    }
                    const maxSize = 5 * 1024 * 1024
                    if (blob.size > maxSize) {
                        reject(new Error('Photo is too large after compression. Maximum size is 5 MB.'))
                        return
                    }
                    const reader2 = new FileReader()
                    reader2.onload = () => resolve(reader2.result)
                    reader2.onerror = () => reject(new Error('Failed to read compressed photo'))
                    reader2.readAsDataURL(blob)
                }, 'image/jpeg', quality)
            }
            img.onerror = () => reject(new Error('Failed to load image'))
            img.src = e.target.result
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
    })
}
