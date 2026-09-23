/**
 * DataUpload.jsx — CSV upload, validation, and dataset preview.
 */
import React, { useCallback, useRef, useState } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react'
import { api } from '../api/api'

export default function DataUpload() {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef()

  const handleFile = useCallback(async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Only CSV files are supported.')
      return
    }
    setError('')
    setResult(null)
    setUploading(true)
    try {
      const res = await api.uploadCsv(file)
      setResult(res.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }, [handleFile])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  return (
    <div>
      <div className="page-header">
        <h1>Data Upload</h1>
        <p>Upload a CSV manufacturing dataset to run AI quality analysis.</p>
      </div>

      {/* Drop zone */}
      <div
        className="card"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          background: dragging ? 'rgba(59,130,246,.05)' : 'var(--surface)',
          textAlign: 'center', padding: '3rem 2rem', cursor: 'pointer',
          transition: 'all .2s', marginBottom: '1.25rem',
        }}
      >
        <input
          type="file" accept=".csv" ref={inputRef} style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files?.[0])}
        />
        <Upload size={40} color="var(--accent)" style={{ margin: '0 auto .75rem' }} />
        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '.25rem' }}>
          Drag &amp; drop a CSV file here
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '.85rem' }}>
          or click to browse — max 50 MB
        </div>
        {uploading && (
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '.5rem', alignItems: 'center' }}>
            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Uploading &amp; analysing…</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid var(--danger)',
                      borderRadius: 6, padding: '.75rem 1rem', marginBottom: '1.25rem',
                      display: 'flex', alignItems: 'flex-start', gap: '.5rem', color: 'var(--danger)' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Success result */}
      {result && (
        <div>
          <div style={{ background: 'rgba(34,197,94,.1)', border: '1px solid var(--success)',
                        borderRadius: 6, padding: '.75rem 1rem', marginBottom: '1.25rem',
                        display: 'flex', alignItems: 'flex-start', gap: '.5rem', color: 'var(--success)' }}>
            <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{result.message}</span>
          </div>

          {result.warnings?.length > 0 && (
            <div style={{ background: 'rgba(245,158,11,.1)', border: '1px solid var(--warning)',
                          borderRadius: 6, padding: '.75rem 1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: '.25rem' }}>Validation Warnings</div>
              {result.warnings.map((w, i) => (
                <div key={i} style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 2 }}>• {w}</div>
              ))}
            </div>
          )}

          {/* Dataset info */}
          <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card">
              <span className="label">Total Records</span>
              <span className="value">{result.info?.total_records}</span>
            </div>
            <div className="stat-card">
              <span className="label">Columns Detected</span>
              <span className="value">{result.info?.columns?.length}</span>
            </div>
            <div className="stat-card">
              <span className="label">Missing Values</span>
              <span className="value">{Object.keys(result.info?.missing_values || {}).length}</span>
              <span className="sub">columns with gaps (auto-imputed)</span>
            </div>
          </div>

          {/* Columns detected */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '.75rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <FileText size={16} /> Detected Columns
            </div>
            <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
              {result.info?.columns?.map(c => (
                <span key={c} style={{ background: 'var(--surface2)', border: '1px solid var(--border)',
                                       borderRadius: 4, padding: '3px 10px', fontSize: '.78rem' }}>
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Sample rows */}
          {result.info?.sample_rows?.length > 0 && (
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: '.75rem' }}>Sample Records (first 10)</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {Object.keys(result.info.sample_rows[0]).map(k => <th key={k}>{k}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {result.info.sample_rows.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((v, j) => (
                          <td key={j}>{v == null ? <span style={{ color: 'var(--muted)' }}>—</span> : String(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ marginTop: '1rem', color: 'var(--success)', fontSize: '.85rem' }}>
            ✓ All four AI agents have run analysis. Navigate to any section to explore results.
          </div>
        </div>
      )}

      {/* Column mapping guide */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '.75rem' }}>Supported Column Names</div>
        <p style={{ color: 'var(--muted)', fontSize: '.82rem', marginBottom: '.75rem' }}>
          The system automatically maps common column name variants. Your CSV does not need exact names.
        </p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Feature</th><th>Accepted Column Names</th></tr></thead>
            <tbody>
              {[
                ['Temperature', 'temperature, temp, process_temp, air_temperature, machine_temperature'],
                ['Pressure',    'pressure, process_pressure, hydraulic_pressure'],
                ['Speed (RPM)', 'speed, rotational_speed, machine_speed, rpm'],
                ['Torque',      'torque, process_torque'],
                ['Vibration',   'vibration, tool_wear'],
                ['Quality Label', 'quality, quality_label, defect, failure, machine_failure, label'],
              ].map(([feat, names]) => (
                <tr key={feat}><td style={{ fontWeight: 600 }}>{feat}</td><td style={{ color: 'var(--muted)', fontSize: '.78rem' }}>{names}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
