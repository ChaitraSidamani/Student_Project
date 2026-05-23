import { useEffect, useState } from 'react'
import { Bell, BookOpen, CheckCircle, FileText, GraduationCap, User } from 'lucide-react'
import { attendanceAPI, notificationAPI, resultAPI, studentAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function StudentDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [resultNotifications, setResultNotifications] = useState([])
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('sms_dismissed_notifs') || '[]')) }
    catch { return new Set() }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      studentAPI.getProfile(),
      attendanceAPI.getMySummary(),
      notificationAPI.getMy(),
    ])
      .then(([profileRes, attendanceRes, notifRes]) => {
        if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data.data)
        else toast.error('Failed to load student profile')
        if (attendanceRes.status === 'fulfilled') setAttendance(attendanceRes.value.data.data || null)
        if (notifRes.status === 'fulfilled') {
          const all = notifRes.value.data.data || []
          // Show only RESULT type notifications that haven't been dismissed
          setResultNotifications(all.filter(n =>
            String(n.type || '').toUpperCase() === 'RESULT' ||
            String(n.title || '').toLowerCase().includes('result') ||
            String(n.message || '').toLowerCase().includes('result')
          ))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const visibleNotifications = resultNotifications.filter(n => !dismissedIds.has(n.id))

  const dismissNotification = (id) => {
    const updated = new Set([...dismissedIds, id])
    setDismissedIds(updated)
    localStorage.setItem('sms_dismissed_notifs', JSON.stringify([...updated]))
  }

  if (loading) {
    return <div className="card"><div className="empty-state compact">Loading your dashboard...</div></div>
  }

  return (
    <div>
      <div className="dashboard-hero">
        <div>
          <div className="eyebrow">Student dashboard</div>
          <h1>Welcome back, {profile?.firstName || user?.fullName?.split(' ')[0] || 'Student'}</h1>
        </div>
        <div className="role-card">
          <GraduationCap size={22} />
          <div>
            <span>Roll number</span>
            <strong>{profile?.rollNumber || user?.username}</strong>
          </div>
        </div>
      </div>

      {/* Result notifications banner */}
      {visibleNotifications.length > 0 && (
        <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
          {visibleNotifications.map(n => (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14,
              background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
              border: '1px solid #3b5bdb',
              borderRadius: 10, padding: '14px 18px', color: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Bell size={20} style={{ marginTop: 1, flexShrink: 0, color: '#93c5fd' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{n.title || 'Result Published'}</div>
                  <div style={{ fontSize: 13, opacity: 0.85, marginTop: 3 }}>{n.message}</div>
                  <button
                    onClick={() => navigate('/my-results')}
                    style={{
                      marginTop: 10, padding: '5px 14px', borderRadius: 6,
                      background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                      color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    View Results →
                  </button>
                </div>
              </div>
              <button
                onClick={() => dismissNotification(n.id)}
                title="Dismiss"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 18, lineHeight: 1, flexShrink: 0 }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      <div className="grid-3 dashboard-grid">
        <SummaryCard icon={User} label="Course" value={profile?.courseName || 'Not assigned'} />
        <SummaryCard icon={BookOpen} label="Semester" value={profile?.semester ? `Semester ${profile.semester}` : 'Not set'} />
        <SummaryCard icon={FileText} label="Attendance" value={`${attendance?.overallPercentage || 0}%`} />
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="section-title">
          <div><h3>Student Responsibilities</h3></div>
          <BookOpen size={20} />
        </div>
        <div className="grid-3" style={{ gap: 12 }}>
          {[
            'Attend classes regularly',
            'Track internal marks',
            'Keep profile updated',
          ].map(title => (
            <div key={title} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 14 }}>
              <div style={{ fontWeight: 700 }}>{title}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="stat-card" style={{ '--accent-color': '#1e40af', '--accent-bg': 'rgba(30,64,175,0.12)' }}>
      <div className="stat-icon"><Icon size={22} /></div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
