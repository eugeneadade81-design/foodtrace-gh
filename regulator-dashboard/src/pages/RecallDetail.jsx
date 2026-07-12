import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRecall, updateRecallStatus } from '../api/recalls'
import RecallStatusBadge from '../components/RecallStatusBadge'
import EvidenceUpload from '../components/EvidenceUpload'

const STATUSES = ['DRAFT', 'ACTIVE', 'RESOLVED', 'CANCELLED']

export default function RecallDetail() {
  const { id } = useParams()
  const [recall, setRecall] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [next, setNext] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getRecall(id)
      .then((r) => {
        setRecall(r)
        setNext(r.status)
      })
      .catch((e) => setError(e.response?.status === 404 ? 'Recall not found' : (e.message || 'Failed to load')))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const applyStatus = async () => {
    if (!next || next === recall.status) return
    setSaving(true)
    setNotice('')
    try {
      const updated = await updateRecallStatus(id, next)
      setRecall(updated)
      setNotice(
        next === 'ACTIVE'
          ? 'Status set to ACTIVE — an SMS alert was dispatched to the affected farmer.'
          : `Status updated to ${next}.`,
      )
    } catch (e) {
      setNotice(e.response?.data?.message || e.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="panel muted">Loading recall…</div>
  if (error) {
    return (
      <div className="panel">
        <p className="form-error">{error}</p>
        <Link to="/recalls" className="btn-ghost">Back to recalls</Link>
      </div>
    )
  }

  return (
    <section>
      <Link to="/recalls" className="back-link">← Recalls</Link>
      <h1 className="page-title">
        {recall.recallCode} <RecallStatusBadge status={recall.status} />
      </h1>
      <p className="page-sub">{recall.severity} severity · {recall.region}</p>

      <div className="detail-grid">
        <div className="panel">
          <h2 className="panel-title">Details</h2>
          <dl className="kv">
            <dt>Reason</dt><dd>{recall.reason}</dd>
            <dt>Batch</dt><dd>#{recall.batchId}</dd>
            <dt>Initiated by</dt><dd>{recall.initiatedBy || '—'}</dd>
            <dt>Created</dt><dd>{recall.createdAt?.replace('T', ' ').slice(0, 16)}</dd>
            <dt>Resolved</dt><dd>{recall.resolvedAt ? recall.resolvedAt.replace('T', ' ').slice(0, 16) : '—'}</dd>
          </dl>
        </div>

        <div className="panel">
          <h2 className="panel-title">Change status</h2>
          <div className="status-row">
            <select value={next} onChange={(e) => setNext(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              type="button"
              className="btn-primary status-apply"
              onClick={applyStatus}
              disabled={saving || next === recall.status}
            >
              {saving ? 'Saving…' : 'Apply'}
            </button>
          </div>
          <p className="hint muted">Setting a recall to <strong>ACTIVE</strong> texts the affected farmer automatically.</p>
          {notice && <p className="notice">{notice}</p>}

          <h2 className="panel-title evidence-title">Evidence</h2>
          <EvidenceUpload recallId={recall.id} />
        </div>
      </div>
    </section>
  )
}
