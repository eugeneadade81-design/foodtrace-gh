/** A single headline metric tile. `accent` recolors the left border. */
export default function KpiCard({ label, value, accent }) {
  return (
    <div className="kpi-card" style={accent ? { borderLeftColor: accent } : undefined}>
      <span className="kpi-value">{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  )
}
