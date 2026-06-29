import { useCallback, useEffect, useState } from 'react'
import {
  fetchBatchesByStatus,
  fetchFarmsByRegion,
  fetchRecallsByMonth,
  fetchSummary,
} from '../api/analytics'
import KpiCard from '../components/KpiCard'
import BatchesByStatusBar from '../components/charts/BatchesByStatusBar'
import RecallsByMonthLine from '../components/charts/RecallsByMonthLine'
import FarmsByRegionPie from '../components/charts/FarmsByRegionPie'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [byStatus, setByStatus] = useState([])
  const [byMonth, setByMonth] = useState([])
  const [byRegion, setByRegion] = useState([])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetchSummary(),
      fetchBatchesByStatus(),
      fetchRecallsByMonth(),
      fetchFarmsByRegion(),
    ])
      .then(([s, status, month, region]) => {
        setSummary(s)
        setByStatus(status)
        setByMonth(month)
        setByRegion(region)
      })
      .catch((e) => setError(e.response?.data?.message || e.message || 'Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return <div className="panel muted">Loading analytics…</div>
  }

  if (error) {
    return (
      <div className="panel">
        <p className="form-error">Could not load analytics: {error}</p>
        <p className="muted">Is the backend running at the configured API URL?</p>
        <button type="button" className="btn-ghost" onClick={load}>Retry</button>
      </div>
    )
  }

  return (
    <section>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">National food-safety overview</p>

      <div className="kpi-grid">
        <KpiCard label="Total batches" value={summary.totalBatches} accent="#137547" />
        <KpiCard label="Active recalls" value={summary.activeRecalls} accent="#c1121f" />
        <KpiCard label="Registered farms" value={summary.totalFarms} accent="#f2b705" />
        <KpiCard label="Compliance flags" value={summary.complianceFlags} accent="#e08e0b" />
      </div>

      <div className="chart-grid">
        <div className="panel">
          <h2 className="panel-title">Batches by status</h2>
          <BatchesByStatusBar data={byStatus} />
        </div>
        <div className="panel">
          <h2 className="panel-title">Recalls by month</h2>
          <RecallsByMonthLine data={byMonth} />
        </div>
        <div className="panel">
          <h2 className="panel-title">Farms by region</h2>
          <FarmsByRegionPie data={byRegion} />
        </div>
      </div>
    </section>
  )
}
