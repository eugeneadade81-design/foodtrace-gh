import { useState } from 'react'
import { uploadEvidence } from '../api/recalls'

/** File picker + multipart upload of recall evidence (lab report, photo). */
export default function EvidenceUpload({ recallId }) {
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const onUpload = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const data = await uploadEvidence(recallId, file)
      setResult(data)
      setFile(null)
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="evidence">
      <div className="evidence-row">
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="button" className="btn-ghost" onClick={onUpload} disabled={!file || busy}>
          {busy ? 'Uploading…' : 'Upload evidence'}
        </button>
      </div>
      {result && (
        <p className="muted">
          Uploaded: <code>{result.key}</code> → <code>{result.url}</code>
        </p>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
