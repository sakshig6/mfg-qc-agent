/**
 * Optimization.jsx — Process Optimization Agent recommendations.
 */
import React, { useEffect, useState } from 'react'
import { Wrench, AlertTriangle, ArrowRight } from 'lucide-react'
import { api } from '../api/api'

const PRIORITY_COLOR = {
  critical: 'var(--danger)',
  warning:  'var(--warning)',
  normal:   'var(--success)',
}

function RecCard({ rec }) {
  return (
    <div style={{
      background: 'var(--surface2)', border: `1px solid var(--border)`,
      borderLeft: `4px solid ${PRIORITY_COLOR[rec.priority] || 'var(--accent)'}`,
      borderRadius: 6, padding: '.9rem 1rem', marginBottom: '.6rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.4rem' }}>
        <div style={{ fontWeight: 600, fontSize: '.85rem', textTransform: 'uppercase',
                      color: PRIORITY_COLOR[rec.priority], letterSpacing: '.04em' }}>
          {rec.parameter.replace('_', ' ')}
        </div>
        <span className={`badge badge-${rec.priority === 'warning' ? 'warning' : rec.priority === 'critical' ? 'critical' : 'normal'}`}>
          {rec.priority}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem', fontSize: '.85rem' }}>
        <span style={{ color: 'var(--muted)' }}>Current:</span>
        <span style={{ fontWeight: 600, color: PRIORITY_COLOR[rec.priority] }}>{rec.current_value}</span>
        {rec.recommended_value != null && (
          <>
            <ArrowRight size={12} color="var(--muted)" />
            <span style={{ color: 'var(--muted)' }}>Target:</span>
            <span style={{ fontWeight: 600, color: 'var(--success)' }}>{rec.recommended_value}</span>
          </>
        )}
      </div>

      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '.3rem', fontSize: '.85rem' }}>
        <Wrench size={12} style={{ marginRight: 4 }} />
        {rec.recommended_action}
      </div>

      <div style={{ fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>
        {rec.reason}
      </div>
    </div>
  )
}

export default function Optimization() {
  const [data, setData]       = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const pageSize = 20

  useEffect(() => {
    setLoading(true)
    api.getOptimizations(page, pageSize)
      .then(r => { setData(r.data.data || []); setTotal(r.data.total || 0) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [page])

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (error)   return <div style={{ color: 'var(--danger)', padding: '2rem' }}>Error: {error}</div>

  const allRecs = data.flatMap(d => d.recommendations || [])
  const critCount = allRecs.filter(r => r.priority === 'critical').length
  const warnCount = allRecs.filter(r => r.priority === 'warning').length

  return (
    <div>
      <div className="page-header">
        <h1>Process Optimization Agent</h1>
        <p>Corrective action recommendations based on detected parameter deviations.</p>
      </div>

      {/* Summary */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <span className="label">Records Needing Action</span>
          <span className="value">{total}</span>
        </div>
        <div className="stat-card">
          <span className="label">Critical Actions</span>
          <span className="value" style={{ color: 'var(--danger)' }}>{critCount}</span>
          <span className="sub">immediate intervention required</span>
        </div>
        <div className="stat-card">
          <span className="label">Warning Actions</span>
          <span className="value" style={{ color: 'var(--warning)' }}>{warnCount}</span>
        </div>
      </div>

      {/* Recommendations */}
      {data.length === 0 ? (
        <div className="card empty-state" style={{ minHeight: 200 }}>
          <Wrench size={32} />
          <span>No corrective actions needed — all monitored records are within normal range.</span>
        </div>
      ) : (
        data.map(opt => (
          <div key={opt.record_id} className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
              <div style={{ fontWeight: 700 }}>Record #{opt.record_id}</div>
              <span style={{ fontSize: '.75rem', color: 'var(--muted)', background: 'var(--surface2)',
                             padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
                {opt.recommendations?.length} action{opt.recommendations?.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: '.75rem' }}>
              {opt.overall_summary}
            </div>
            {opt.recommendations?.map((rec, i) => <RecCard key={i} rec={rec} />)}
          </div>
        ))
      )}

      <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span style={{ padding: '.45rem .5rem', fontSize: '.85rem', color: 'var(--muted)' }}>
          {page} / {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <button className="btn btn-ghost" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
    </div>
  )
}
