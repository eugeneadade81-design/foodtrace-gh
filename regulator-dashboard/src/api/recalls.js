import client from './client'

// Recall management endpoints (Day 5 backend).

/** List recalls, optionally filtered by status and/or region. */
export const listRecalls = (params = {}) => {
  // Drop empty filters so we don't send ?status=&region=
  const query = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null && v !== ''),
  )
  return client.get('/api/recalls', { params: query }).then((r) => r.data)
}

export const getRecall = (id) =>
  client.get(`/api/recalls/${id}`).then((r) => r.data)

export const createRecall = (body) =>
  client.post('/api/recalls', body).then((r) => r.data)

export const updateRecallStatus = (id, status) =>
  client.patch(`/api/recalls/${id}/status`, { status }).then((r) => r.data)

/** Multipart upload of a recall evidence file; returns the stored object URL. */
export const uploadEvidence = (id, file) => {
  const form = new FormData()
  form.append('file', file)
  return client
    .post(`/api/recalls/${id}/evidence`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}
