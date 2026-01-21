const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4567'

export function fetchLatestMeasurement(plantId) {
    return fetch(`${API_BASE}/api/measurements/latest?plant_id=${plantId}`)
        .then(res => {
            if (res.status === 404) {
                return null
            }
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`)
            }
            return res.json()
        })
}

export function fetchMeasurements(plantId, limit = 100) {
    return fetch(`${API_BASE}/api/measurements?plant_id=${plantId}&limit=${limit}`)
        .then(res => {
            if (res.status === 404) {
                return []
            }
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`)
            }
            return res.json()
        })
}

export function postMeasurement(data) {
    return fetch(`${API_BASE}/api/measurements`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`)
            }
            return res.json()
        })
}

export function searchTreflePlants(query) {
    return fetch(`${API_BASE}/api/plants/search?q=${encodeURIComponent(query)}`)
        .then(res => {
            if (res.status === 404) {
                return { data: [] }
            }
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`)
            }
            return res.json()
        })
}

export function getTrefleRecommendations(trefleId) {
    return fetch(`${API_BASE}/api/plants/${trefleId}/recommendations`)
        .then(res => {
            if (res.status === 404) {
                return null
            }
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`)
            }
            return res.json()
        })
}
