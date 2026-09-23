/**
 * DefectPrediction.jsx — Defect Prediction Agent results.
 * Shows per-record defect prediction, probability, and contributing parameters.
 */
import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis
} from 'recharts'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { api } from '../api/api'

export default function DefectPrediction() {
  const [data, setData]         = useState([])
  const [total, setTotal]       = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const pageSize = 30

  useEffect(() => {
    setLoading(true)
    api.getDefects(page, pageSize)
      .then(r => {
        setData(r.data.data || [])
        setTotal(r.data.total || 0)
        setAccuracy(r.data.model_accuracy || 0)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [page])

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (error)   return <div style={{ color: 'var(--danger)', padding: '2rem' }}>Error: {error}</div>

  const defectCount  = data.filter(r => r.defect_predicted).length
  const normalCount  = data.length - defectCount

  // Probability histogram
  const buckets = Array(10).fill(0)
  data.forEach(r => {
    const b = Math.min(9, Math.floor(r.probability * 10))
    buckets[b]++
  })
  const histData = buckets.map((count, i) => ({
    range: `${i * 10}–${(i + 1) * 10}%`, count
  }))

  // Feature importance (average across defective records)
  const importanceMap = {}
  data.filter(r => r.defect_predicted).forEach(r => {
    r.contributing_parameters?.forEach(p => {
      if (!importanceMap[p.parameter]) importanceMap[p.parameter] = []
      importanceMap[p.parameter].push(p.importance)
    })
  })
  const importanceData = Object.entries(importanceMap)
    .map(([name, vals]) => ({ name: name.replace('_', ' '), importance: vals.reduce((a, b) => a + b, 0) / vals.length }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 7)

  return (
    <div>
      <div className="page-header">
        <h1>Defect Prediction Agent</h1>
        <p>Random Forest classifier trained on the dataset. Predicts defect probability per record.</p>
      </div>

      {/* Summary cards */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <span className="label">Model Accuracy (OOB)</span>
          <span className="value" style={{ color: 'var(--accent)' }}>{(accuracy * 100).toFixed(1)}%</span>
          <span className="sub">out-of-bag estimate</span>
        </div>
        <div className="stat-card">
          <span className="label">Defect Predicted</span>
          <span className="value" style={{ color: 'var(--danger)' }}>{defectCount}</span>
          <span className="sub">probability ≥ 50%</span>
        </div>
        <div className="stat-card">
          <span className="label">Normal Predicted</span>
          <span className="value" style={{ color: 'var(--success)' }}>{normalCount}</span>
        </div>
        <div className="stat-card">
          <span className="label">Total Analysed</span>
          <span className="value">{total}</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '.5rem' }}>Defect Probability Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={histData} margin={{ top: 0, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="range" stroke="var(--muted)" tick={{ fontSize: 10 }} />
              <YAxis stroke="var(--muted)" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12 }} />
              <Bar dataKey="count" fill="var(--accent)" name="Records" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '.5rem' }}>Top Contributing Parameters (Defective Records)</div>
          {importanceData.length > 0
            ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={importanceData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted)" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" stroke="var(--muted)" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12 }} />
                  <Bar dataKey="importance" fill="var(--danger)" name="Avg Importance" />
                </BarChart>
              </ResponsiveContainer>
            )
            : <div className="empty-state"><CheckCircle size={28} /><span>No defects predicted in this page</span></div>
          }
        </div>
      </div>

      {/* Records table */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: '.75rem' }}>Prediction Results</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Record ID</th><th>Prediction</th><th>Probability</th>
                <th>Top Contributing Parameter</th><th>Explanation</th>
              </tr>
            </thead>
            <tbody>
              {data.map(r => (
                <tr key={r.record_id}>
                  <td>#{r.record_id}</td>
                  <td>
                    {r.defect_predicted
                      ? <span className="badge badge-critical"><AlertTriangle size={10} /> Defect</span>
                      : <span className="badge badge-normal"><CheckCircle size={10} /> Normal</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 70, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          width: `${r.probability * 100}%`, height: '100%',
                          background: r.probability > 0.7 ? 'var(--danger)' : r.probability > 0.4 ? 'var(--warning)' : 'var(--success)',
                        }} />
                      </div>
                      <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{(r.probability * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '.78rem' }}>
                    {r.contributing_parameters?.[0]
                      ? <span style={{ color: 'var(--accent)' }}>
                          {r.contributing_parameters[0].parameter} = {r.contributing_parameters[0].value}
                        </span>
                      : '—'
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
