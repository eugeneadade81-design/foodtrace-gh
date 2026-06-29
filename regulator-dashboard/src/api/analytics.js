import client from './client'

// Thin wrappers over the Day 3 analytics endpoints. Each returns the parsed
// response body so components can consume the DTOs directly.
export const fetchSummary = () =>
  client.get('/api/analytics/summary').then((r) => r.data)

export const fetchBatchesByStatus = () =>
  client.get('/api/analytics/batches-by-status').then((r) => r.data)

export const fetchRecallsByMonth = () =>
  client.get('/api/analytics/recalls-by-month').then((r) => r.data)

export const fetchFarmsByRegion = () =>
  client.get('/api/analytics/farms-by-region').then((r) => r.data)
