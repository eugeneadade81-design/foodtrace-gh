import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listRecalls } from '../api/recalls'
import RecallStatusBadge from '../components/RecallStatusBadge'

const STATUSES = ['', 'DRAFT', 'ACTIVE', 'RESOLVED', 'CANCELLED']

export default function Recalls() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [region, setRegion] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    listRecalls({ status, region })
      .then(setRows)
      .catch((e) => setError(e.response?.data?.message || e.message || 'Failed to load recalls'))
      .finally(() => setLoading(false))
  }, [status, region])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title">Recalls</h1>
          <p className="page-sub">View, filter, and action food-safety recalls</p>
        </div>
        <Link to="/recalls/new" className="btn-primary">+ New recall</Link>
      </div>

      <div className="filters">
        <label className="field-inline">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s || 'ALL'} value={s}>{s || 'All'}</option>
            ))}
          </select>
        </label>
        <label className="field-inline">
          <span>Region</span>
          <input
            value={region}
            placeholder="e.g. Volta"
            onChange={(e) => setRegion(e.target.value)}
          />
        </label>
        <span className="muted">{rows.length} result{rows.length === 1 ? '' : 's'}</span>
      </div>

      <div className="panel table-panel">
        {loading && <p className="muted">Loading recalls…</p>}
        {error && <p className="form-error">{error}</p>}
        {!loading && !error && (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Batch</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Region</th>
                <th>Raised</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="muted">No recalls match these filters.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="row-link" onClick={() => navigate(`/recalls/${r.id}`)}>
                  <td>{r.recallCode}</td>
                  <td>#{r.batchId}</td>
                  <td>{r.severity}</td>
                  <td><RecallStatusBadge status={r.status} /></td>
                  <td>{r.region}</td>
                  <td>{r.createdAt?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
