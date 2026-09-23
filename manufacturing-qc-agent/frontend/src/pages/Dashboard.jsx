/**
 * Dashboard.jsx — Main overview page.
 * Shows KPI cards, recent alerts, and process parameter charts.
 */
import React, { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Activity, AlertTriangle, CheckCircle, TrendingUp, Zap, Thermometer } from 'lucide-react'
import { api } from '../api/api'

/* ---- helpers ---- */
const fmt = (n, d = 0) => (typeof n === 'number' ? n.toFixed(d) : '—')

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="label">{label}</span>
        {Icon && <Icon size={18} color={color || 'var(--muted)'} />}
      </div>
      <div className="value" style={{ color: color || 'var(--text)' }}>{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

function AlertItem({ alert }) {
  return (
    <div className={`alert-item ${alert.severity}`}>
      <div>
        <div className="param" style={{
          color: alert.severity === 'critical' ? 'var(--danger)'
               : alert.severity === 'warning'  ? 'var(--warning)' : 'var(--success)'
        }}>
          {alert.severity.toUpperCase()} · {alert.parameter}
        </div>
        <div className="msg">{alert.message}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [charts, setCharts] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.getSummary(),
      api.getChartData(),
      api.getAlerts(),
    ])
      .then(([s, c, a]) => {
        setSummary(s.data)
        setCharts(c.data)
        setAlerts(a.data.alerts || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (error)   return <div style={{ color: 'var(--danger)', padding: '2rem' }}>Error: {error}</div>

  // Prepare chart data
  const chartData = charts
    ? (charts.record_ids || []).map((id, i) => ({
        id,
        temperature: charts.temperature?.[i],
        pressure:    charts.pressure?.[i],
        speed:       charts.speed?.[i],
        vibration:   charts.vibration?.[i],
      }))
    : []

  // Sample at most 50 points for readability
  const step = Math.max(1, Math.floor(chartData.length / 50))
  const chartSampled = chartData.filter((_, i) => i % step === 0)

  const critAlerts = alerts.filter(a => a.severity === 'critical').slice(0, 5)
  const warnAlerts = alerts.filter(a => a.severity === 'warning').slice(0, 5)
  const recentAlerts = [...critAlerts, ...warnAlerts].slice(0, 8)

  return (
    <div>
      <div className="page-header">
        <h1>Manufacturing Dashboard</h1>
        <p>Real-time overview of production quality, process health, and AI agent status.</p>
      </div>

      {/* KPI cards */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <StatCard label="Total Records"    value={summary?.total_records ?? '—'} icon={Activity}      sub="in current dataset" />
        <StatCard label="Normal"           value={summary?.normal_count  ?? '—'} icon={CheckCircle}   color="var(--success)" sub="within operating range" />
        <StatCard label="Abnormal"         value={summary?.abnormal_count ?? '—'} icon={AlertTriangle} color="var(--warning)" sub="flagged by QA agent" />
        <StatCard label="Predicted Defects" value={summary?.defect_count  ?? '—'} icon={Zap}           color="var(--danger)"  sub="from prediction model" />
      </div>
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <StatCard label="Critical Alerts" value={summary?.critical_alerts ?? '—'} icon={AlertTriangle} color="var(--danger)"  sub="require immediate action" />
        <StatCard label="Warning Alerts"  value={summary?.warning_alerts  ?? '—'} icon={TrendingUp}    color="var(--warning)" sub="monitor closely" />
        <StatCard label="Avg Temperature" value={fmt(summary?.process_stats?.temperature?.mean, 1) + ' °C'} icon={Thermometer} sub="mean across dataset" />
        <StatCard label="Avg Pressure"    value={fmt(summary?.process_stats?.pressure?.mean,    2) + ' bar'} sub="mean across dataset" />
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Temperature & Pressure Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartSampled} margin={{ top: 0, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="id" stroke="var(--muted)" tick={{ fontSize: 10 }} />
              <YAxis stroke="var(--muted)" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="temperature" stroke="#ef4444" dot={false} strokeWidth={1.5} name="Temp (°C)" />
              <Line type="monotone" dataKey="pressure"    stroke="#3b82f6" dot={false} strokeWidth={1.5} name="Pressure (bar)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Machine Speed & Vibration Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartSampled} margin={{ top: 0, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="id" stroke="var(--muted)" tick={{ fontSize: 10 }} />
              <YAxis stroke="var(--muted)" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="speed"     stroke="#22c55e" dot={false} strokeWidth={1.5} name="Speed (RPM)" />
              <Line type="monotone" dataKey="vibration" stroke="#f59e0b" dot={false} strokeWidth={1.5} name="Vibration (mm/s)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Process stats + Recent alerts */}
      <div className="grid-2">
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Process Parameter Statistics</div>
          {summary?.process_stats && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Parameter</th><th>Mean</th><th>Min</th><th>Max</th><th>Std Dev</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary.process_stats).map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{k.replace('_', ' ')}</td>
                      <td>{fmt(v.mean, 2)}</td>
                      <td>{fmt(v.min, 2)}</td>
                      <td>{fmt(v.max, 2)}</td>
                      <td>{fmt(v.std, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '1rem' }}>
            Recent Alerts
            <span style={{ marginLeft: 8, fontSize: '.75rem', color: 'var(--muted)', fontWeight: 400 }}>
              (latest {recentAlerts.length})
            </span>
          </div>
          {recentAlerts.length === 0
            ? <div className="empty-state"><CheckCircle size={32} /><span>No alerts — all parameters normal</span></div>
            : recentAlerts.map((a, i) => <AlertItem key={i} alert={a} />)
          }
        </div>
      </div>

      {/* Top issues */}
      {summary?.top_issues?.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '.75rem' }}>Top Quality Issues</div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            {summary.top_issues.map((issue, i) => (
              <span key={i} style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '4px 10px', fontSize: '.78rem', color: 'var(--warning)'
              }}>{issue}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
