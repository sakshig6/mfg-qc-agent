/**
 * Reports.jsx — Generates and displays the full manufacturing quality report.
 */
import React, { useEffect, useState } from 'react'
import { FileText, Download, CheckCircle, AlertTriangle, TrendingUp, Wrench } from 'lucide-react'
import { api } from '../api/api'

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem',
                    fontWeight: 700, marginBottom: '.9rem', fontSize: '.95rem' }}>
        <Icon size={16} color="var(--accent)" />
        {title}
      </div>
      {children}
    </div>
  )
}

function StatRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0',
                  borderBottom: '1px solid var(--border)', fontSize: '.85rem' }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || 'var(--text)' }}>{value}</span>
    </div>
  )
}

export default function Reports() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.getReport()
      .then(r => setReport(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `quality-report-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (error)   return <div style={{ color: 'var(--danger)', padding: '2rem' }}>Error: {error}</div>
  if (!report) return null

  const s = report.summary
  const stats = report.process_stats || {}

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{report.title}</h1>
          <p>
            Source: {report.source === 'sample' ? 'Sample dataset (demo)' : `Uploaded file: ${report.filename}`}
            {' · '}
            Generated: {new Date().toLocaleString()}
            {' · '}
            <span style={{ color: report.watsonx_configured ? 'var(--success)' : 'var(--warning)' }}>
              IBM Granite: {report.watsonx_configured ? 'Connected' : 'Demo Mode'}
            </span>
          </p>
        </div>
        <button className="btn btn-primary" onClick={downloadJSON}>
          <Download size={14} /> Export JSON
        </button>
      </div>

      {/* Production Summary */}
      <Section title="Production Summary" icon={TrendingUp}>
        <div className="grid-3">
          {[
            { label: 'Total Records',      value: s.total_records,      color: 'var(--text)' },
            { label: 'Normal',             value: s.normal_count,       color: 'var(--success)' },
            { label: 'Abnormal',           value: s.abnormal_count,     color: 'var(--warning)' },
            { label: 'Predicted Defects',  value: s.defect_count,       color: 'var(--danger)' },
            { label: 'Critical Alerts',    value: s.critical_alerts,    color: 'var(--danger)' },
            { label: 'Warning Alerts',     value: s.warning_alerts,     color: 'var(--warning)' },
          ].map(item => (
            <div key={item.label} className="stat-card" style={{ padding: '.85rem 1rem' }}>
              <span className="label">{item.label}</span>
              <span className="value" style={{ fontSize: '1.5rem', color: item.color }}>{item.value}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '.75rem' }}>
          <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: '.3rem', fontWeight: 600 }}>
            DEFECT RATE
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <div style={{ flex: 1, height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                width: `${s.total_records > 0 ? (s.defect_count / s.total_records * 100) : 0}%`,
                height: '100%', background: 'var(--danger)', transition: 'width .4s',
              }} />
            </div>
            <span style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--danger)' }}>
              {s.total_records > 0 ? ((s.defect_count / s.total_records) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </Section>

      {/* Process Parameter Statistics */}
      <Section title="Process Parameter Statistics" icon={CheckCircle}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Parameter</th><th>Mean</th><th>Std Dev</th><th>Min</th><th>Max</th><th>P25</th><th>P75</th></tr>
            </thead>
            <tbody>
              {Object.entries(stats).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</td>
                  <td>{v.mean?.toFixed(3)}</td>
                  <td>{v.std?.toFixed(3)}</td>
                  <td>{v.min?.toFixed(3)}</td>
                  <td>{v.max?.toFixed(3)}</td>
                  <td>{v.p25?.toFixed(3)}</td>
                  <td>{v.p75?.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Top Issues */}
      {s.top_issues?.length > 0 && (
        <Section title="Detected Anomalies" icon={AlertTriangle}>
          {s.top_issues.map((issue, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.5rem',
                                  padding: '.4rem 0', borderBottom: '1px solid var(--border)',
                                  fontSize: '.85rem', color: 'var(--warning)' }}>
              <AlertTriangle size={12} />
              {issue}
            </div>
          ))}
        </Section>
      )}

      {/* Model accuracy */}
      <Section title="Prediction Model" icon={TrendingUp}>
        <StatRow label="Algorithm"         value="Random Forest Classifier" />
        <StatRow label="OOB Accuracy"      value={`${(report.model_accuracy * 100).toFixed(1)}%`} color="var(--accent)" />
        <StatRow label="IBM Granite Status" value={report.watsonx_configured ? 'Connected' : 'Demo Mode — connect credentials for LLM explanations'}
                  color={report.watsonx_configured ? 'var(--success)' : 'var(--warning)'} />
      </Section>

      {/* Corrective actions */}
      {report.recommendations?.length > 0 && (
        <Section title="Corrective Action Recommendations" icon={Wrench}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Parameter</th><th>Priority</th><th>Current Value</th><th>Recommended Action</th></tr>
              </thead>
              <tbody>
                {report.recommendations.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{r.parameter.replace('_', ' ')}</td>
                    <td>
                      <span className={`badge badge-${r.priority === 'warning' ? 'warning' : r.priority === 'critical' ? 'critical' : 'normal'}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td>{r.current_value}</td>
                    <td style={{ fontSize: '.78rem' }}>{r.recommended_action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  )
}
