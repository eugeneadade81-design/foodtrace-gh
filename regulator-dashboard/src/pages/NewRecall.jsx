import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createRecall } from '../api/recalls'

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

const EMPTY = {
  batchId: '',
  severity: 'MEDIUM',
  region: '',
  initiatedBy: '',
  reason: '',
}

export default function NewRecall() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  // Client-side guard mirrors the backend @NotNull/@NotBlank contract so we
  // give immediate feedback instead of round-tripping to a 400.
  const missing =
    !form.batchId || !form.region.trim() || !form.initiatedBy.trim() || !form.reason.trim()

  const onSubmit = async (e) => {
    e.preventDefault()
    if (missing || saving) return
    setSaving(true)
    setError('')
    try {
      const created = await createRecall({
        batchId: Number(form.batchId),
        reason: form.reason.trim(),
        severity: form.severity,
        region: form.region.trim(),
        initiatedBy: form.initiatedBy.trim(),
      })
      // Land on the new recall's detail page (opens as DRAFT).
      navigate(`/recalls/${created.id}`)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not create recall')
      setSaving(false)
    }
  }

  return (
    <section>
      <Link to="/recalls" className="back-link">← Recalls</Link>
      <h1 className="page-title">New recall</h1>
      <p className="page-sub">Open a recall as a draft — activate it later to alert the affected farmer.</p>

      <form className="panel form-panel" onSubmit={onSubmit}>
        <div className="form-row">
          <label className="field">
            <span>Batch ID</span>
            <input
              type="number"
              min="1"
              value={form.batchId}
              onChange={set('batchId')}
              placeholder="e.g. 7"
              autoFocus
            />
          </label>
          <label className="field">
            <span>Severity</span>
            <select value={form.severity} onChange={set('severity')}>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label className="field">
            <span>Region</span>
            <input value={form.region} onChange={set('region')} placeholder="e.g. Volta" />
          </label>
          <label className="field">
            <span>Initiated by</span>
            <input value={form.initiatedBy} onChange={set('initiatedBy')} placeholder="e.g. FDA Inspector — A. Mensah" />
          </label>
        </div>

        <label className="field">
          <span>Reason</span>
          <textarea
            rows={4}
            value={form.reason}
            onChange={set('reason')}
            placeholder="Why is this batch being recalled?"
          />
        </label>

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          <Link to="/recalls" className="btn-ghost">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={missing || saving}>
            {saving ? 'Creating…' : 'Create recall'}
          </button>
        </div>
      </form>
    </section>
  )
}
