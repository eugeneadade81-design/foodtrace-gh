import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

// Distinct slice colors (Ghana-inspired greens/golds + supporting hues).
const PALETTE = ['#137547', '#f2b705', '#1d9a6c', '#c1121f', '#0e5836', '#e08e0b', '#2bb673', '#7a4f01']

/** Pie chart of farm counts per region. data: [{region, count}]. */
export default function FarmsByRegionPie({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="region"
          cx="50%"
          cy="50%"
          outerRadius={95}
          label={(entry) => entry.region}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
