const STYLES = {
  DRAFT: { bg: '#eef2f7', fg: '#475569' },
  ACTIVE: { bg: '#fdecec', fg: '#c1121f' },
  RESOLVED: { bg: '#e7f6ee', fg: '#137547' },
  CANCELLED: { bg: '#f3f4f6', fg: '#6b7280' },
}

/** Colored pill for a recall status. */
export default function RecallStatusBadge({ status }) {
  const s = STYLES[status] || STYLES.DRAFT
  return (
    <span className="badge" style={{ background: s.bg, color: s.fg }}>
      {status}
    </span>
  )
}
