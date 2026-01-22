// API Base URL: prefer env, fallback to relative path for PWA compatibility
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4567'

function handleApiResponse(res, url) {
    const contentType = res.headers.get('content-type')
    const isJson = contentType && contentType.includes('application/json')
    
    if (!isJson && res.ok) {
        console.warn(`[API] Non-JSON response from ${url}:`, contentType)
    }
    
    return res.text().then(text => {
        if (!res.ok) {
            const error = new Error(`HTTP ${res.status}: ${res.statusText}`)
            error.status = res.status
            error.url = url
            error.responseText = text
            console.error(`[API] Error ${res.status} from ${url}:`, {
                status: res.status,
                statusText: res.statusText,
                headers: Object.fromEntries(res.headers.entries()),
                body: text.substring(0, 200)
            })
            throw error
        }
        
        if (!isJson) {
            const error = new Error(`Expected JSON but got ${contentType}`)
            error.status = res.status
            error.url = url
            error.responseText = text
            console.error(`[API] Non-JSON response from ${url}:`, text.substring(0, 200))
            throw error
        }
        
        try {
            return JSON.parse(text)
        } catch (parseError) {
            const error = new Error(`JSON parse error: ${parseError.message}`)
            error.status = res.status
            error.url = url
            error.responseText = text
            console.error(`[API] JSON parse error for ${url}:`, {
                parseError: parseError.message,
                responseText: text.substring(0, 200)
            })
            throw error
        }
    })
}

export function fetchLatestMeasurement(plantId) {
    const url = `${API_BASE}/api/measurements/latest?plant_id=${plantId}`
    console.log(`[API] GET ${url}`)
    return fetch(url)
        .then(res => {
            if (res.status === 404) {
                return null
            }
            return handleApiResponse(res, url)
        })
        .catch(err => {
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                const networkError = new Error(`Network error: ${err.message}`)
                networkError.url = url
                networkError.originalError = err
                console.error(`[API] Network error for ${url}:`, err)
                throw networkError
            }
            throw err
        })
}

export function fetchMeasurements(plantId, limit = 100) {
    const url = `${API_BASE}/api/measurements?plant_id=${plantId}&limit=${limit}`
    return fetch(url)
        .then(res => {
            if (res.status === 404) {
                return []
            }
            return handleApiResponse(res, url)
        })
        .catch(err => {
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                const networkError = new Error(`Network error: ${err.message}`)
                networkError.url = url
                networkError.originalError = err
                console.error(`[API] Network error for ${url}:`, err)
                throw networkError
            }
            throw err
        })
}

export function postMeasurement(data) {
    const url = `${API_BASE}/api/measurements`
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(res => handleApiResponse(res, url))
        .catch(err => {
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                const networkError = new Error(`Network error: ${err.message}`)
                networkError.url = url
                networkError.originalError = err
                console.error(`[API] Network error for ${url}:`, err)
                throw networkError
            }
            throw err
        })
}

export function searchTreflePlants(query) {
    const url = `${API_BASE}/api/plants/search?q=${encodeURIComponent(query)}`
    console.log(`[API] GET ${url}`)
    return fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        },
        cache: 'no-cache'
    })
        .then(res => {
            console.log(`[API] Response from ${url}:`, {
                status: res.status,
                statusText: res.statusText,
                headers: Object.fromEntries(res.headers.entries()),
                ok: res.ok
            })
            
            if (res.status === 404) {
                return { data: [] }
            }
            return handleApiResponse(res, url)
        })
        .catch(err => {
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                const networkError = new Error(`Network error: ${err.message}. Check if backend is running and CORS is configured.`)
                networkError.url = url
                networkError.originalError = err
                console.error(`[API] Network error for ${url}:`, err)
                throw networkError
            }
            console.error(`[API] Error in searchTreflePlants for ${url}:`, err)
            throw err
        })
}

export function getTrefleRecommendations(trefleId) {
    const url = `${API_BASE}/api/plants/${trefleId}/recommendations`
    return fetch(url)
        .then(res => {
            if (res.status === 404) {
                return null
            }
            return handleApiResponse(res, url)
        })
        .catch(err => {
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                const networkError = new Error(`Network error: ${err.message}`)
                networkError.url = url
                networkError.originalError = err
                console.error(`[API] Network error for ${url}:`, err)
                throw networkError
            }
            throw err
        })
}

export function fetchTreflePlantDetails(trefleId) {
    const url = `${API_BASE}/api/plants/${trefleId}`
    return fetch(url)
        .then(res => {
            if (res.status === 404 || res.status === 500) {
                return null
            }
            return handleApiResponse(res, url)
        })
        .catch(err => {
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                const networkError = new Error(`Network error: ${err.message}`)
                networkError.url = url
                networkError.originalError = err
                console.error(`[API] Network error for ${url}:`, err)
                throw networkError
            }
            throw err
        })
}

export function clearAllMeasurements() {
    const url = `${API_BASE}/api/measurements`
    return fetch(url, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(res => handleApiResponse(res, url))
        .catch(err => {
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                const networkError = new Error(`Network error: ${err.message}`)
                networkError.url = url
                networkError.originalError = err
                console.error(`[API] Network error for ${url}:`, err)
                throw networkError
            }
            throw err
        })
}
