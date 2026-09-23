/**
 * QualityAnalysis.jsx — Quality Analysis Agent results.
 * Shows per-record quality classification, contributing factors, and distribution charts.
 */
import React, { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { api } from '../api/api'

const STATUS_COLOR = {
  normal:   'var(--success)',
  abnormal: 'var(--warning)',
  defective:'var(--danger)',
}

export default function QualityAnalysis() {
  const [data, setData]       = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const pageSize = 30

  useEffect(() => {
    setLoading(true)
    api.getQuality(page, pageSize)
      .then(r => { setData(r.data.data || []); setTotal(r.data.total || 0) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [page])

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (error)   return <div style={{ color: 'var(--danger)', padding: '2rem' }}>Error: {error}</div>

  // Pie chart data
  const statusCounts = data.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1; return acc
  }, {})
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  // Confidence distribution
  const confBuckets = { '0-25%': 0, '25-50%': 0, '50-75%': 0, '75-100%': 0 }
  data.forEach(r => {
    const p = r.confidence * 100
    if (p < 25) confBuckets['0-25%']++
    else if (p < 50) confBuckets['25-50%']++
    else if (p < 75) confBuckets['50-75%']++
    else confBuckets['75-100%']++
  })
  const barData = Object.entries(confBuckets).map(([name, count]) => ({ name, count }))

  return (
    <div>
      <div className="page-header">
        <h1>Quality Analysis Agent</h1>
        <p>Isolation Forest anomaly detection with per-record explanations.</p>
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '.5rem' }}>Quality Status Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLOR[entry.name] || '#8b5cf6'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '.5rem' }}>Anomaly Confidence Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 0, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--muted)" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12 }} />
              <Bar dataKey="count" fill="var(--accent)" name="Records" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Records table */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: '.75rem' }}>
          Quality Analysis Results
          <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '.8rem', marginLeft: 8 }}>
            ({total} total records)
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Record ID</th><th>Status</th><th>Confidence</th><th>Contributing Factors</th><th>Explanation</th>
              </tr>
            </thead>
            <tbody>
              {data.map(r => (
                <tr key={r.record_id}>
                  <td>#{r.record_id}</td>
                  <td>
                    <span className={`badge badge-${r.status === 'normal' ? 'normal' : 'abnormal'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 60, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          width: `${r.confidence * 100}%`, height: '100%',
                          background: r.confidence > 0.6 ? 'var(--danger)' : r.confidence > 0.3 ? 'var(--warning)' : 'var(--success)',
                        }} />
                      </div>
                      <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{(r.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '.75rem' }}>
                    {r.contributing_factors?.length > 0
                      ? r.contributing_factors.map((f, i) => (
                          <div key={i} style={{ color: 'var(--warning)', marginBottom: 2 }}>• {f}</div>
                        ))
                      : <span style={{ color: 'var(--muted)' }}>None significant</span>
                    }
                  </td>
                  <td style={{ fontSize: '.75rem', color: 'var(--muted)', maxWidth: 280 }}>{r.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
