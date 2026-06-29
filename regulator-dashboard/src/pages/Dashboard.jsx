/**
 * Dashboard landing. KPI cards and Recharts visualizations get wired to the
 * /api/analytics endpoints on Day 9; for now this is the placeholder shell so
 * routing and the protected layout are demoable.
 */
export default function Dashboard() {
  const placeholders = ['Total batches', 'Active recalls', 'Registered farms', 'Citizen reports']

  return (
    <section>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">National food-safety overview</p>

      <div className="kpi-grid">
        {placeholders.map((label) => (
          <div className="kpi-card" key={label}>
            <span className="kpi-value">—</span>
            <span className="kpi-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="panel">
        <p className="muted">Charts arrive on Day 9 (Recharts wired to the analytics API).</p>
      </div>
    </section>
  )
}
