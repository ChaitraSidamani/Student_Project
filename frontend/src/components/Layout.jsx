import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import './Layout.css'

export default function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="layout-container">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(value => !value)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header onMenuClick={() => setSidebarOpen(value => !value)} />

        <main className="page-content">
          <div className="page-container page-enter">
            {children}
          </div>
        </main>
      </div>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
