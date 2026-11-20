export function getToken() {
  return localStorage.getItem('token')
}

export function getUsername() {
  return localStorage.getItem('username')
}

export function saveAuth(token, username) {
  localStorage.setItem('token', token)
  localStorage.setItem('username', username)
}

export function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  if ('caches' in window) {
    caches.delete('api-cache')
  }
}

export const THRESHOLD_RANGES = {
  soil: { min: 0, max: 100 },
  temp: { min: -10, max: 50 },
  hum: { min: 0, max: 100 },
  light: { min: 0, max: 20000 }
}

export function getDefaultThresholds() {
  return {
    soil_min: 30,
    soil_max: 70,
    temp_min: 18,
    temp_max: 28,
    hum_min: 40,
    hum_max: 70,
    light_min: 500,
    light_max: 5000
  }
}

export const STATUS_EMOJI = { 'OK': '🟢', 'WARN': '🟡', 'BAD': '🔴', 'NO DATA': '⚪' }

export function calculateStatus(measurement, th) {
  if (!measurement) return 'NO DATA'

  let outOfRange = 0

  if (measurement.soil_moisture < th.soil_min || measurement.soil_moisture > th.soil_max) {
    outOfRange++
  }
  if (measurement.air_temp_c < th.temp_min || measurement.air_temp_c > th.temp_max) {
    outOfRange++
  }
  if (measurement.air_humidity < th.hum_min || measurement.air_humidity > th.hum_max) {
    outOfRange++
  }
  if (measurement.light_lux < th.light_min || measurement.light_lux > th.light_max) {
    outOfRange++
  }

  if (outOfRange === 0) return 'OK'
  if (outOfRange === 1) return 'WARN'
  return 'BAD'
}
