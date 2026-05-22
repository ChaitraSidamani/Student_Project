import React from 'react'
import {
  Menu
} from 'lucide-react'
import './Header.css'

const Header = ({ onMenuClick, sidebarCollapsed }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="menu-toggle"
          onClick={onMenuClick}
          title="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="header-info">
          <h1 className="header-title">EduTrack ERP</h1>
        </div>
      </div>

      <div className="header-center" />

      <div className="header-right" />
    </header>
  )
}

export default Header
