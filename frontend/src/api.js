import { getToken, clearAuth } from './storage.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4567'

async function request(method, path, body) {
    const token = getToken()
    const headers = {}
    if (body) headers['Content-Type'] = 'application/json'
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(API_BASE + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    })
    const data = await res.json().catch(() => null)

    if (res.status === 401 && token) {
        clearAuth()
        window.location.assign('/login')
    }
    if (!res.ok) {
        const error = new Error((data && data.error) || `HTTP ${res.status}`)
        error.status = res.status
        throw error
    }
    return data
}

function nullOn404(promise, value = null) {
    return promise.catch(err => {
        if (err.status === 404) return value
        throw err
    })
}

export function register(username, password) {
    return request('POST', '/api/register', { username, password })
}

export function login(username, password) {
    return request('POST', '/api/login', { username, password })
}

export function logout() {
    return request('POST', '/api/logout', {})
}

export function getPlants() {
    return request('GET', '/api/plants')
}

export function getPlant(id) {
    return nullOn404(request('GET', `/api/plants/${id}`))
}

export function createPlant(data) {
    return request('POST', '/api/plants', data)
}

export function updatePlant(id, data) {
    return request('PUT', `/api/plants/${id}`, data)
}

export function deletePlant(id) {
    return request('DELETE', `/api/plants/${id}`)
}

export function clearPlantMeasurements(id) {
    return request('DELETE', `/api/plants/${id}/measurements`)
}

export function fetchLatestMeasurement(plantId) {
    return nullOn404(request('GET', `/api/measurements/latest?plant_id=${plantId}`))
}

export function fetchMeasurements(plantId, limit = 100) {
    return nullOn404(request('GET', `/api/measurements?plant_id=${plantId}&limit=${limit}`), [])
}

export function searchTreflePlants(query) {
    return nullOn404(request('GET', `/api/trefle/search?q=${encodeURIComponent(query)}`), { data: [] })
}

export function fetchTreflePlantDetails(trefleId) {
    return request('GET', `/api/trefle/${trefleId}`).catch(() => null)
}

export function getTrefleRecommendations(trefleId) {
    return nullOn404(request('GET', `/api/trefle/${trefleId}/recommendations`))
}

export function waterPlant(id) {
    return request('POST', `/api/plants/${id}/water`)
}

export function unblockPlant(id) {
    return request('POST', `/api/plants/${id}/unblock`)
}

export function getWaterings(id) {
    return request('GET', `/api/plants/${id}/waterings`)
}

export function getPlantStats(id, days) {
    return request('GET', `/api/plants/${id}/stats?days=${days}`)
}
