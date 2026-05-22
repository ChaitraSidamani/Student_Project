import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  FileText,
  User,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

const Sidebar = ({ collapsed, onToggle, isOpen, onClose }) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [expandedItems, setExpandedItems] = React.useState({})

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'ADMIN': return 'Administrator'
      case 'FACULTY': return 'Faculty Member'
      case 'STUDENT': return 'Student'
      default: return role
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN': return 'var(--error)'
      case 'FACULTY': return 'var(--warning)'
      case 'STUDENT': return 'var(--info)'
      default: return 'var(--text-muted)'
    }
  }

  const menuItems = [
    {
      section: 'Overview',
      items: [
        {
          path: '/',
          icon: LayoutDashboard,
          label: 'Dashboard',
          roles: ['ADMIN', 'FACULTY', 'STUDENT']
        },
      ]
    },
    {
      section: 'Academic Management',
      items: [
        {
          path: '/students',
          icon: Users,
          label: 'Students',
          roles: ['ADMIN', 'FACULTY']
        },
        {
          path: '/faculty',
          icon: GraduationCap,
          label: 'Faculty',
          roles: ['ADMIN']
        },
        {
          path: '/courses',
          icon: BookOpen,
          label: 'Courses',
          roles: ['ADMIN']
        },
        {
          path: '/attendance',
          icon: Calendar,
          label: 'Attendance',
          roles: ['ADMIN', 'FACULTY']
        },
        {
          path: '/results/internal',
          icon: FileText,
          label: 'Results',
          roles: ['ADMIN', 'FACULTY'],
          children: [
            { path: '/results/internal', label: 'Internal Results' },
            ...(user?.role === 'ADMIN' ? [{ path: '/results/see', label: 'SEE Results' }] : []),
          ]
        },
        {
          path: '/my-results',
          icon: FileText,
          label: 'My Results',
          roles: ['STUDENT']
        },
        {
          path: '/my-attendance',
          icon: Calendar,
          label: 'View Attendance',
          roles: ['STUDENT']
        },
        {
          path: '/subject-registration',
          icon: BookOpen,
          label: 'Subject Registration',
          roles: ['STUDENT']
        },
      ]
    },
    {
      section: 'Account',
      items: [
        {
          path: user?.role === 'FACULTY' ? '/faculty-profile' : '/profile',
          icon: User,
          label: 'Profile',
          roles: ['FACULTY', 'STUDENT']
        }
      ]
    }
  ]

  const filteredMenuItems = menuItems.map(section => ({
    ...section,
    items: section.items.filter(item => item.roles.includes(user?.role))
  })).filter(section => section.items.length > 0)

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''} ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <GraduationCap size={24} />
        </div>
        {!collapsed && (
          <div className="sidebar-title">
            EduTrack ERP
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {filteredMenuItems.map((section, sectionIndex) => (
          <div key={sectionIndex} className="nav-section">
            {section.items.map((item, itemIndex) => {
              const Icon = item.icon
              const hasChildren = item.children?.length
              const isResultsOpen = expandedItems[item.label] ?? location.pathname.startsWith('/results')
              const showChildren = hasChildren && isResultsOpen && !collapsed
              const active = isActive(item.path) || (hasChildren && location.pathname.startsWith('/results'))
              const toggleChildren = () => {
                setExpandedItems(prev => ({ ...prev, [item.label]: !isResultsOpen }))
                if (!location.pathname.startsWith(item.path)) {
                  navigate(item.path)
                  onClose?.()
                }
              }

              if (hasChildren) {
                return (
                  <React.Fragment key={itemIndex}>
                    <button
                      type="button"
                      className={`nav-item nav-button ${active ? 'active' : ''}`}
                      title={collapsed ? item.label : ''}
                      onClick={toggleChildren}
                    >
                      <div className="nav-icon">
                        <Icon size={18} />
                      </div>
                      {!collapsed && (
                        <>
                          <span className="nav-text">{item.label}</span>
                          <span className={`nav-caret ${isResultsOpen ? 'open' : ''}`}>›</span>
                        </>
                      )}
                    </button>
                    {showChildren && (
                      <div className="nav-subitems">
                        {item.children.map(child => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={`nav-subitem ${location.pathname === child.path ? 'active' : ''}`}
                            onClick={onClose}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                )
              }

              return (
                <React.Fragment key={itemIndex}>
                  <Link
                    to={item.path}
                    className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                    title={collapsed ? item.label : ''}
                    onClick={onClose}
                  >
                    <div className="nav-icon">
                      <Icon size={18} />
                    </div>
                    {!collapsed && (
                      <span className="nav-text">{item.label}</span>
                    )}
                  </Link>
                </React.Fragment>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-session">
          <div className="sidebar-user-row">
            <div className="user-avatar">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="user-details">
                <div className="sidebar-user-name">{user?.fullName}</div>
                <div
                  className="sidebar-user-role"
                  style={{ color: getRoleColor(user?.role) }}
                >
                  {getRoleDisplayName(user?.role)}
                </div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button className="sidebar-signout-btn" onClick={logout}>
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          )}
          {collapsed && (
            <button className="sidebar-signout-icon" onClick={logout} title="Sign Out">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sidebar
