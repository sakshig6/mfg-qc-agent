import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import {
  LayoutDashboard, Upload, Activity, BarChart2,
  AlertTriangle, Wrench, MessageSquare, FileText,
  Factory, ChevronRight, Wifi, WifiOff
} from 'lucide-react'

import Dashboard from './pages/Dashboard'
import DataUpload from './pages/DataUpload'
import ProcessMonitoring from './pages/ProcessMonitoring'
import QualityAnalysis from './pages/QualityAnalysis'
import DefectPrediction from './pages/DefectPrediction'
import Optimization from './pages/Optimization'
import AIAssistant from './pages/AIAssistant'
import Reports from './pages/Reports'

const NAV_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload',      icon: Upload,           label: 'Data Upload' },
  { to: '/monitoring',  icon: Activity,         label: 'Process Monitoring' },
  { to: '/quality',     icon: BarChart2,        label: 'Quality Analysis' },
  { to: '/defects',     icon: AlertTriangle,    label: 'Defect Prediction' },
  { to: '/optimization',icon: Wrench,           label: 'Optimization' },
  { to: '/assistant',   icon: MessageSquare,    label: 'AI Assistant' },
  { to: '/reports',     icon: FileText,         label: 'Reports' },
]

/** Sidebar navigation */
function Sidebar() {
  return (
    <aside style={{
      width: 'var(--sidebar-w)', minHeight: '100vh',
      background: 'var(--surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0,
      zIndex: 100,
    }}>
      {/* Brand */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: '.75rem' }}>
        <div style={{ width: 36, height: 36, background: 'var(--accent)',
                      borderRadius: 8, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0 }}>
          <Factory size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '.9rem', lineHeight: 1.2 }}>MFG QC Agent</div>
          <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>AI Quality Control</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '.75rem 0', overflowY: 'auto' }}>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '.75rem',
              padding: '.6rem 1.25rem', color: isActive ? '#fff' : 'var(--muted)',
              background: isActive ? 'rgba(59,130,246,.15)' : 'transparent',
              borderLeft: `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              fontSize: '.85rem', fontWeight: isActive ? 600 : 400,
              transition: 'all .15s',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* IBM branding footer */}
      <div style={{ padding: '.75rem 1.25rem', borderTop: '1px solid var(--border)',
                    fontSize: '.7rem', color: 'var(--muted)', lineHeight: 1.5 }}>
        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>IBM watsonx.ai</div>
        <div>Granite Model Integration</div>
        <div style={{ marginTop: 4, color: '#f59e0b' }}>⚡ Connect credentials in .env</div>
      </div>
    </aside>
  )
}

/** Top header bar */
function Header({ watsonxOk }) {
  return (
    <header style={{
      height: 'var(--header-h)', position: 'fixed',
      left: 'var(--sidebar-w)', right: 0, top: 0,
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.5rem', zIndex: 99,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem',
                    color: 'var(--muted)', fontSize: '.8rem' }}>
        <span>Manufacturing Process</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--text)' }}>Quality Control Agent</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem',
                    fontSize: '.75rem' }}>
        {watsonxOk
          ? <><Wifi size={14} color="var(--success)" /><span style={{ color: 'var(--success)' }}>IBM Granite Connected</span></>
          : <><WifiOff size={14} color="var(--warning)" /><span style={{ color: 'var(--warning)' }}>Granite: Demo Mode</span></>
        }
      </div>
    </header>
  )
}

/** Root application */
export default function App() {
  const [watsonxOk, setWatsonxOk] = useState(false)

  React.useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => setWatsonxOk(d.watsonx_configured))
      .catch(() => {})
  }, [])

  return (
    <BrowserRouter>
      <Sidebar />
      <Header watsonxOk={watsonxOk} />
      <main style={{
        marginLeft: 'var(--sidebar-w)',
        marginTop: 'var(--header-h)',
        padding: '1.75rem',
        minHeight: 'calc(100vh - var(--header-h))',
      }}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/upload"       element={<DataUpload />} />
          <Route path="/monitoring"   element={<ProcessMonitoring />} />
          <Route path="/quality"      element={<QualityAnalysis />} />
          <Route path="/defects"      element={<DefectPrediction />} />
          <Route path="/optimization" element={<Optimization />} />
          <Route path="/assistant"    element={<AIAssistant />} />
          <Route path="/reports"      element={<Reports />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
