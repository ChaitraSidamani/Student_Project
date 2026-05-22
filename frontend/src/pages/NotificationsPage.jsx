import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    notificationAPI.getMy()
      .then(res => setNotifications(res.data.data || []))
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Loading notifications...</div>

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Recent Notifications</h1>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="card"><div className="empty-state">No notifications available.</div></div>
      ) : (
        <div className="grid-2" style={{ gap: 20 }}>
          {notifications.map((item, index) => {
            return (
              <div
                key={`${item.type}-${index}`}
                className="card"
                style={{ cursor: item.link ? 'pointer' : 'default' }}
                onClick={() => item.link && navigate(item.link)}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <h3 style={{ margin:0, fontSize:18 }}>{item.title}</h3>
                  <div style={{ display:'flex', gap: 8, alignItems:'center' }}>
                    {item.meta?.resultCount != null && (
                      <span className="badge badge-blue">{item.meta.resultCount} new</span>
                    )}
                    {!item.read && (
                      <span className="badge badge-blue">New</span>
                    )}
                  </div>
                </div>
                <p style={{ color:'var(--text-muted)', marginBottom:16 }}>{item.message}</p>
                {item.link && (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:13, color:'var(--accent)' }}>Open</span>
                    <span style={{ fontSize:13, color:'var(--text-muted)' }}>{formatDate(item.createdAt)}</span>
                  </div>
                )}
                {!item.link && item.createdAt && (
                  <div style={{ fontSize:13, color:'var(--text-muted)' }}>{formatDate(item.createdAt)}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}
