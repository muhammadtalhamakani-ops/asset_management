import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { assetAPI } from './api/client'
import type { DashboardGroup, DashboardSummary } from './api/client'
import { PortalMetric } from './PortalMetric'
import './Dashboard.css'

const preferenceKey = 'fieldstock-dashboard-extra-statuses'
const defaultStatuses = [
  ['asset:available', 'Available'], ['asset:inUse', 'In use'],
  ['asset:inTransit', 'In transit'], ['asset:lowStock', 'Low stock'],
] as const
const palette = ['#1675c1', '#168675', '#b56811', '#be465b', '#7956b0', '#167f9c', '#477b34', '#a6518d', '#645dbe', '#af562b', '#35778a', '#7c7235']
function color(group: DashboardGroup) {
  const hash = [...(group._id || 'unassigned')].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0)
  return palette[hash % palette.length]
}
const percent = (count: number, total: number) => total ? `${(count / total * 100).toFixed(1)}%` : '0.0%'

function ChartData({ rows, label }: { rows: DashboardGroup[]; label: string }) {
  return <details className="dashboard-chart-data"><summary>View {label.toLowerCase()} data</summary><table><thead><tr><th>{label}</th><th>Assets</th></tr></thead><tbody>{rows.map((row) => <tr key={row._id || 'unassigned'}><td>{row.name}</td><td>{row.count.toLocaleString()}</td></tr>)}</tbody></table></details>
}

function DonutChart({ title, rows, total }: { title: string; rows: DashboardGroup[]; total: number }) {
  const [active, setActive] = useState<DashboardGroup | null>(null)
  const highlighted = active ? rows.find((row) => row._id === active._id) : undefined
  const segments = rows.filter((row) => row.count > 0)
  return <section className="portal-panel dashboard-chart" aria-label={title}>
    <h2>{title}</h2>
    {!total ? <p className="dashboard-empty">No active assets to display.</p> : <div className="dashboard-donut-layout">
      <svg viewBox="0 0 220 220" role="group" aria-label={`${title}: ${total} assets`} className="dashboard-donut">
        <circle cx="110" cy="110" r="78" fill="none" stroke="#edf2f6" strokeWidth="30" />
        {segments.map((row, index) => {
          const share = row.count / total * 100
          const start = segments.slice(0, index).reduce((sum, item) => sum + item.count, 0) / total * 100
          return <circle key={row._id || 'unassigned'} cx="110" cy="110" r="78" fill="none" stroke={color(row)} strokeWidth="30" pathLength="100" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} transform="rotate(-90 110 110)" tabIndex={0} aria-label={`${row.name}: ${row.count} assets, ${percent(row.count, total)}`} onMouseEnter={() => setActive(row)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(row)} onBlur={() => setActive(null)}><title>{row.name}: {row.count} assets ({percent(row.count, total)})</title></circle>
        })}
        <text x="110" y="108" textAnchor="middle" className="dashboard-donut-total">{total.toLocaleString()}</text><text x="110" y="131" textAnchor="middle" className="dashboard-donut-label">ASSETS</text>
      </svg>
      <ul className="dashboard-legend">{rows.map((row) => <li key={row._id || 'unassigned'}><button type="button" onMouseEnter={() => setActive(row)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(row)} onBlur={() => setActive(null)} onClick={() => setActive(row)}><i style={{ background: color(row) }} /><span>{row.name}{!row.isActive && row._id && <small>Inactive</small>}</span><strong>{row.count.toLocaleString()}</strong><small>{percent(row.count, total)}</small></button></li>)}</ul>
    </div>}
    <p className="dashboard-chart-tooltip" role="status">{highlighted ? `${highlighted.name}: ${highlighted.count.toLocaleString()} assets (${percent(highlighted.count, total)})` : 'Hover, focus or tap a segment to see its count.'}</p>
    <ChartData rows={rows} label={title} />
  </section>
}

function ProjectChart({ rows }: { rows: DashboardGroup[] }) {
  const [active, setActive] = useState<DashboardGroup | null>(null)
  const highlighted = active ? rows.find((row) => row._id === active._id) : undefined
  const width = Math.max(700, rows.length * 120 + 100)
  const max = Math.max(1, ...rows.map((row) => row.count))
  const ceiling = Math.max(4, Math.ceil(max / 4) * 4)
  const plotHeight = 220
  const x = (index: number) => 64 + (width - 104) * (index + 0.5) / Math.max(rows.length, 1)
  const y = (count: number) => 24 + plotHeight * (1 - count / ceiling)
  return <section className="portal-panel dashboard-chart dashboard-project-chart" aria-label="Assets by Project"><h2>Assets by Project</h2><p className="dashboard-chart-description">Active asset records across all projects</p>
    {!rows.length ? <p className="dashboard-empty">No project data to display.</p> : <div className="dashboard-line-scroll" tabIndex={0} aria-label="Project comparison chart; scroll horizontally for more projects">
      <svg width={width} height="350" role="group" aria-label="Bar chart: project names on X-axis; asset count on Y-axis">
        {[0, 1, 2, 3, 4].map((tick) => {
          const count = ceiling * tick / 4
          return <g key={tick}><line x1="64" x2={width - 40} y1={y(count)} y2={y(count)} stroke="#e6edf2" /><text x="52" y={y(count) + 4} textAnchor="end" className="dashboard-axis-label">{count}</text></g>
        })}
        {rows.map((row, index) => <g key={row._id || 'unassigned'}>
          <rect x={x(index) - 24} y={y(row.count)} width="48" height={Math.max(2, y(0) - y(row.count))} rx="3" fill="#1675c1" tabIndex={0} aria-label={`${row.name}: ${row.count} assets`} onFocus={() => setActive(row)} onBlur={() => setActive(null)} onMouseEnter={() => setActive(row)} onMouseLeave={() => setActive(null)} onClick={() => setActive(row)}><title>{row.name}: {row.count} assets</title></rect>
          <text x={x(index)} y="267" textAnchor="middle" className="dashboard-axis-label">{row.name.match(/.{1,18}(?:\s|$)|.{1,18}/g)?.slice(0, 3).map((part, line) => <tspan key={line} x={x(index)} dy={line ? 15 : 0}>{part.trim()}</tspan>)}<title>{row.name}</title></text>
        </g>)}
        <text x="16" y="140" transform="rotate(-90 16 140)" textAnchor="middle" className="dashboard-axis-label">Asset count</text>
      </svg>
    </div>}
    <p className="dashboard-chart-tooltip" role="status">{highlighted ? `${highlighted.name}: ${highlighted.count.toLocaleString()} assets` : 'Hover, focus or tap a bar to see its project and asset count.'}</p>
    <ChartData rows={rows} label="Projects" />
  </section>
}

function savedSelection(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(preferenceKey) || '[]')
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : []
  } catch { return [] }
}

export function Dashboard({ refreshKey }: { refreshKey: object }) {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState(savedSelection)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [completedRefresh, setCompletedRefresh] = useState<object | null>(null)
  const updateSelection = (ids: string[]) => {
    setSelected(ids)
    try { localStorage.setItem(preferenceKey, JSON.stringify(ids)) } catch { /* Preferences are optional when storage is unavailable. */ }
  }

  useEffect(() => {
    const controller = new AbortController()
    assetAPI.getStatistics(controller.signal).then((response) => {
      if (controller.signal.aborted) return
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load dashboard.')
      setData(response.data)
      setError('')
      const extraOptions = response.data.byStatus.filter((row) => row.isActive && row._id && !defaultStatuses.some(([key]) => key === row.systemKey))
      const ids = savedSelection().filter((id) => extraOptions.some((row) => row._id === id))
      updateSelection(ids)
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to reach the server.')
    }).finally(() => { if (!controller.signal.aborted) { setCompletedRefresh(refreshKey); setLoading(false) } })
    return () => controller.abort()
  }, [refreshKey, retry])

  const optional = data?.byStatus.filter((row) => row.isActive && row._id && !defaultStatuses.some(([key]) => key === row.systemKey)) || []
  const extras = optional.filter((row) => selected.includes(row._id!))
  return <div className="dashboard">
    <div className="portal-intro"><div><p>ASSET OVERVIEW</p><h2>All projects</h2><span>Active asset records across every project. Counts represent registered assets, not stock quantities.</span></div><div className="dashboard-selector">
      <button type="button" className="outline-action" aria-expanded={selectorOpen} aria-controls="dashboard-status-selector" disabled={!data || !!error} onClick={() => setSelectorOpen((open) => !open)}>Add status cards</button>
      {selectorOpen && <div id="dashboard-status-selector" className="dashboard-status-selector" onKeyDown={(event) => { if (event.key === 'Escape') setSelectorOpen(false) }}><fieldset><legend>Extra status cards</legend>{!optional.length ? <p>No additional active statuses.</p> : optional.map((row) => <label key={row._id}><input type="checkbox" checked={selected.includes(row._id!)} onChange={(event) => updateSelection(event.target.checked ? [...selected, row._id!] : selected.filter((id) => id !== row._id))} />{row.name}</label>)}</fieldset><button className="outline-action" type="button" onClick={() => setSelectorOpen(false)}>Done</button></div>}
    </div></div>
    {(loading || completedRefresh !== refreshKey) && <p role="status">Loading dashboard...</p>}
    {error && <div className="dashboard-error" role="alert"><p>{error}</p><button type="button" className="outline-action" onClick={() => { setLoading(true); setError(''); setRetry((value) => value + 1) }}>Retry dashboard</button></div>}
    {data && !error && <>
      <section className="portal-metrics dashboard-default-cards" aria-label="Default asset cards"><PortalMetric label="Total Assets" value={data.totalAssets.toLocaleString()} detail="All active asset records" />{defaultStatuses.map(([key, fallback]) => {
        const status = data.byStatus.find((row) => row.systemKey === key)
        return <PortalMetric key={key} label={status?.name || fallback} value={(status?.count || 0).toLocaleString()} detail="Active asset records" tone="blue" />
      })}</section>
      {extras.length > 0 && <section className="portal-metrics dashboard-extra-cards" aria-label="Extra status cards">{extras.map((row) => <div className="dashboard-extra-card" key={row._id}><PortalMetric label={row.name} value={row.count.toLocaleString()} detail="Active asset records" tone="blue" /><button type="button" className="dashboard-remove-card" aria-label={`Remove ${row.name} card`} onClick={() => updateSelection(selected.filter((id) => id !== row._id))}><X size={14} /></button></div>)}</section>}
      <div className="dashboard-donuts"><DonutChart title="Assets by Category" rows={data.byCategory} total={data.totalAssets} /><DonutChart title="Assets by Status" rows={data.byStatus} total={data.totalAssets} /></div>
      <ProjectChart rows={data.byProject} />
    </>}
  </div>
}
