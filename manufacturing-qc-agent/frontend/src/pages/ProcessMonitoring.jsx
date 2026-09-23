/**
 * ProcessMonitoring.jsx — Shows per-record process monitoring results and alerts.
 */
import React, { useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle } from 'lucide-react'
import { api } from '../api/api'

const SEV_COLOR = { critical: 'var(--danger)', warning: 'var(--warning)', normal: 'var(--success)' }

function SeverityBadge({ severity }) {
  return (
    <span className={`badge badge-${severity}`}>{severity}</span>
  )
}

export default function ProcessMonitoring() {
  const [data, setData]         = useState([])
  const [alerts, setAlerts]     = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [filter, setFilter]     = useState('all') // all | abnormal | critical

  const pageSize = 30

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getMonitoring(page, pageSize),
      api.getAlerts(),
    ])
      .then(([m, a]) => {
        setData(m.data.data || [])
        setTotal(m.data.total || 0)
        setAlerts(a.data.alerts || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [page])

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (error)   return <div style={{ color: 'var(--danger)', padding: '2rem' }}>Error: {error}</div>

  const critCount = alerts.filter(a => a.severity === 'critical').length
  const warnCount = alerts.filter(a => a.severity === 'warning').length
  const normalCount = total - (data.filter(r => r.status !== 'normal').length)

  const filtered = data.filter(r => {
    if (filter === 'abnormal') return r.status !== 'normal'
    if (filter === 'critical') return r.alerts?.some(a => a.severity === 'critical')
    return true
  })

  return (
    <div>
      <div className="page-header">
        <h1>Process Monitoring Agent</h1>
        <p>Real-time analysis of machine and process parameters against operating thresholds.</p>
      </div>

      {/* Summary cards */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <span className="label">Critical Alerts</span>
          <span className="value" style={{ color: 'var(--danger)' }}>{critCount}</span>
          <span className="sub">require immediate action</span>
        </div>
        <div className="stat-card">
          <span className="label">Warning Alerts</span>
          <span className="value" style={{ color: 'var(--warning)' }}>{warnCount}</span>
          <span className="sub">monitor and investigate</span>
        </div>
        <div className="stat-card">
          <span className="label">Normal Records</span>
          <span className="value" style={{ color: 'var(--success)' }}>{normalCount}</span>
          <span className="sub">all parameters in range</span>
        </div>
      </div>

      {/* Alert panel */}
      {alerts.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '.75rem' }}>
            Active Alerts
            <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--muted)', fontSize: '.8rem' }}>
              ({alerts.length} total)
            </span>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {[...alerts.filter(a => a.severity === 'critical'), ...alerts.filter(a => a.severity === 'warning')]
              .slice(0, 15)
              .map((a, i) => (
                <div key={i} className={`alert-item ${a.severity}`}>
                  <AlertTriangle size={14} color={SEV_COLOR[a.severity]} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div className="param" style={{ color: SEV_COLOR[a.severity] }}>
                      Record #{a.record_id} · {a.parameter.toUpperCase()} · {a.value}
                    </div>
                    <div className="msg">{a.message}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
        {['all', 'abnormal', 'critical'].map(f => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
            style={{ textTransform: 'capitalize' }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Records table */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: '.75rem' }}>
          Monitoring Results
          <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '.8rem', marginLeft: 8 }}>
            (page {page} of {Math.ceil(total / pageSize)})
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Record ID</th><th>Status</th><th>Anomaly Score</th><th>Alerts</th><th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.record_id}>
                  <td>#{r.record_id}</td>
                  <td><SeverityBadge severity={r.status === 'normal' ? 'normal' : r.status === 'defective' ? 'critical' : 'warning'} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 60, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${r.anomaly_score * 100}%`, height: '100%',
                          background: r.anomaly_score > 0.6 ? 'var(--danger)'
                                    : r.anomaly_score > 0.2 ? 'var(--warning)' : 'var(--success)',
                        }} />
                      </div>
                      <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                        {(r.anomaly_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td>
                    {r.alerts?.length > 0
                      ? r.alerts.map((a, i) => (
                          <span key={i} style={{ marginRight: 4 }}>
                            <SeverityBadge severity={a.severity} />
                          </span>
                        ))
                      : <span style={{ color: 'var(--muted)' }}>—</span>
                    }
                  </td>
                  <td style={{ fontSize: '.78rem', color: 'var(--muted)', maxWidth: 320 }}>{r.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span style={{ padding: '.45rem .5rem', fontSize: '.85rem', color: 'var(--muted)' }}>
            {page} / {Math.max(1, Math.ceil(total / pageSize))}
          </span>
          <button className="btn btn-ghost" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  )
}
