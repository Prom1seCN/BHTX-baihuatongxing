const STORAGE_KEY = 'bhtx_trips'
const { normalizeLocationName } = require('./locations')

const defaultTrips = [
  {
    id: 't_1001',
    exact_date: '2026-04-25',
    departure_time: '14:30',
    departure: '北化北区',
    destination: '乐多港万达',
    status: 'active',
    driver_name: '北化小陈',
    contact: 'bhtx_chen01'
  },
  {
    id: 't_1002',
    exact_date: '2026-04-26',
    departure_time: '08:30',
    departure: '北化东区',
    destination: '首都机场',
    status: 'active',
    driver_name: '北化小林',
    contact: 'bhtx_lin88'
  },
  {
    id: 't_1003',
    exact_date: '2026-04-27',
    departure_time: '17:00',
    departure: '昌平西山口',
    destination: '北化西区',
    status: 'active',
    driver_name: '北化小王',
    contact: 'bhtx_wang66'
  },
  {
    id: 't_1004',
    exact_date: '2026-04-28',
    departure_time: '13:00',
    departure: '乐多港万达',
    destination: '昌平西山口',
    status: 'inactive',
    driver_name: '北化小赵',
    contact: 'bhtx_zhao09'
  }
]

function cloneData(data) {
  return JSON.parse(JSON.stringify(data))
}

function normalizeTrip(trip) {
  return {
    id: trip.id || `t_${Date.now()}`,
    exact_date: trip.exact_date || '',
    departure_time: trip.departure_time || '',
    departure: normalizeLocationName(trip.departure || ''),
    destination: normalizeLocationName(trip.destination || ''),
    status: trip.status === 'inactive' ? 'inactive' : 'active',
    driver_name: trip.driver_name || '同行用户',
    contact: trip.contact || trip.wechat_id || ''
  }
}

function canUseStorage() {
  return typeof wx !== 'undefined' && typeof wx.getStorageSync === 'function'
}

function saveTrips(trips) {
  if (!canUseStorage()) return cloneData(trips)
  const normalizedTrips = trips.map((trip) => normalizeTrip(trip))
  wx.setStorageSync(STORAGE_KEY, normalizedTrips)
  return cloneData(normalizedTrips)
}

function loadTrips() {
  const seededTrips = defaultTrips.map((trip) => normalizeTrip(trip))
  if (!canUseStorage()) return cloneData(seededTrips)

  const storedTrips = wx.getStorageSync(STORAGE_KEY)
  if (!Array.isArray(storedTrips) || !storedTrips.length) {
    return saveTrips(seededTrips)
  }

  const normalizedTrips = storedTrips.map((trip) => normalizeTrip(trip))
  return saveTrips(normalizedTrips)
}

function getTrips() {
  return loadTrips()
}

function getHallTrips() {
  return getTrips().filter((trip) => trip.status === 'active')
}

function getMyTrips() {
  return getTrips()
}

function getTripById(id) {
  const trip = loadTrips().find((item) => item.id === id)
  return trip ? cloneData(trip) : null
}

function addTrip(tripInput) {
  const trips = loadTrips()
  const nextTrip = normalizeTrip({
    ...tripInput,
    id: `t_${Date.now()}`,
    status: 'active',
    driver_name: tripInput.driver_name || '同行用户'
  })
  trips.unshift(nextTrip)
  saveTrips(trips)
  return cloneData(nextTrip)
}

function updateTripStatus(id, status) {
  const trips = loadTrips()
  const targetIndex = trips.findIndex((item) => item.id === id)
  if (targetIndex === -1) return null
  trips[targetIndex].status = status === 'inactive' ? 'inactive' : 'active'
  saveTrips(trips)
  return cloneData(trips[targetIndex])
}

module.exports = {
  addTrip,
  getHallTrips,
  getMyTrips,
  getTripById,
  updateTripStatus
}
